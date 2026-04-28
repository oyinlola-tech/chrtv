#!/usr/bin/env node

const bcrypt = require('bcryptjs');
const { query } = require('../shared/db');
const { formatError } = require('../shared/errorFormatting');
const { loadEnv } = require('../shared/env');

loadEnv();

const FACILITIES = [
  { name: 'Port of Singapore', type: 'POTE', code: 'SGSIN', lat: 1.3521, lng: 103.8198, radius: 2000 },
  { name: 'Port of Rotterdam', type: 'POTE', code: 'NLRTM', lat: 51.9544, lng: 4.1694, radius: 2000 },
  { name: 'Bangkok Port', type: 'POTE', code: 'THBKK', lat: 13.6345, lng: 100.5896, radius: 2000 },
  { name: 'Hong Kong Port', type: 'POTE', code: 'HKHKG', lat: 22.3193, lng: 114.1694, radius: 1500 },
  { name: 'Dubai Depot', type: 'DEPO', code: 'AEDXB', lat: 25.2048, lng: 55.2708, radius: 500 },
  { name: 'Shanghai Warehouse', type: 'CLOC', code: 'CNSHA', lat: 31.2304, lng: 121.4737, radius: 500 },
  { name: 'Kuala Lumpur Ramp', type: 'RAMP', code: 'MYKUL', lat: 3.139, lng: 101.6869, radius: 300 },
];

const ORDERS = [
  {
    order_number: 'ORD-2024-001',
    carrier_booking_ref: 'CBR-001',
    equipment_reference: 'CONT-123456',
    transportation_phase: 'EXPORT',
    mode_of_transport: 'TRUCK',
    status: 'PLANNED',
    facility_codes: ['SGSIN', 'NLRTM'],
  },
  {
    order_number: 'ORD-2024-002',
    carrier_booking_ref: 'CBR-002',
    equipment_reference: 'CONT-123457',
    transportation_phase: 'IMPORT',
    mode_of_transport: 'TRUCK',
    status: 'IN_PROGRESS',
    facility_codes: ['THBKK', 'HKHKG'],
  },
  {
    order_number: 'ORD-2024-003',
    carrier_booking_ref: 'CBR-003',
    equipment_reference: 'CONT-123458',
    transportation_phase: 'EXPORT',
    mode_of_transport: 'RAIL',
    status: 'PLANNED',
    facility_codes: ['AEDXB', 'CNSHA'],
  },
];

const ASSIGNMENTS = [
  {
    order_number: 'ORD-2024-001',
    imei: '123456789012345',
    license_plate: 'SG-100-ABC',
    originator_name: 'Carrier Asia',
    partner_name: 'Local Logistics',
    is_active: true,
  },
  {
    order_number: 'ORD-2024-002',
    imei: '234567890123456',
    license_plate: 'TH-200-XYZ',
    originator_name: 'Carrier Asia',
    partner_name: 'Bangkok Movers',
    is_active: true,
  },
  {
    order_number: 'ORD-2024-003',
    imei: '345678901234567',
    license_plate: 'AE-300-DEF',
    originator_name: 'Middle East Freight',
    partner_name: 'Gulf Transport',
    is_active: false,
  },
];

const USERS = [
  { username: 'operator1', password: 'operator@2024', role: 'operator' },
  { username: 'supervisor', password: 'supervisor@2024', role: 'admin' },
];

const POSITIONS = [
  { imei: '123456789012345', lat: 1.3521, lng: 103.8198 },
  { imei: '234567890123456', lat: 13.6345, lng: 100.5896 },
  { imei: '345678901234567', lat: 25.2048, lng: 55.2708 },
];

function logLine(message = '') {
  console.log(message);
}

async function seedFacilities() {
  const facilityIdsByCode = new Map();

  for (const facility of FACILITIES) {
    const result = await query(
      `INSERT INTO facilities (name, facility_type_code, location_code, latitude, longitude, radius_meters)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [facility.name, facility.type, facility.code, facility.lat, facility.lng, facility.radius]
    );
    facilityIdsByCode.set(facility.code, result.insertId);
    logLine(`  Created facility: ${facility.name}`);
  }

  return facilityIdsByCode;
}

async function seedOrders(facilityIdsByCode) {
  const orderIdsByNumber = new Map();

  for (const order of ORDERS) {
    const result = await query(
      `INSERT INTO transport_orders (order_number, carrier_booking_ref, equipment_reference, transportation_phase, mode_of_transport, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [order.order_number, order.carrier_booking_ref, order.equipment_reference, order.transportation_phase, order.mode_of_transport, order.status]
    );

    const orderId = result.insertId;
    orderIdsByNumber.set(order.order_number, orderId);

    for (const [index, code] of order.facility_codes.entries()) {
      const facilityId = facilityIdsByCode.get(code);
      if (!facilityId) {
        throw new Error(`Unable to resolve facility code ${code} for order ${order.order_number}`);
      }

      await query(
        `INSERT INTO order_facility_sequence (transport_order_id, facility_id, sequence_order)
         VALUES (?, ?, ?)`,
        [orderId, facilityId, index + 1]
      );
    }

    logLine(`  Created order: ${order.order_number}`);
  }

  return orderIdsByNumber;
}

async function seedAssignments(orderIdsByNumber) {
  for (const assignment of ASSIGNMENTS) {
    const orderId = orderIdsByNumber.get(assignment.order_number);
    if (!orderId) {
      throw new Error(`Unable to resolve order ${assignment.order_number} for IMEI ${assignment.imei}`);
    }

    await query(
      `INSERT INTO assignments (transport_order_id, imei, license_plate, originator_name, partner_name, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [orderId, assignment.imei, assignment.license_plate, assignment.originator_name, assignment.partner_name, assignment.is_active]
    );

    logLine(`  Created assignment: IMEI ${assignment.imei} -> License ${assignment.license_plate}`);
  }
}

async function seedUsers() {
  for (const user of USERS) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    await query(
      `INSERT INTO users (username, password_hash, role)
       VALUES (?, ?, ?)`,
      [user.username, passwordHash, user.role]
    );
    logLine(`  Created user: ${user.username} (${user.role})`);
  }
}

async function upsertLatestPosition(position) {
  await query(
    `INSERT INTO latest_device_positions
      (imei, utc_timestamp, latitude, longitude, speed, heading, gps_valid, acc_state, door_state, raw_message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      utc_timestamp = VALUES(utc_timestamp),
      latitude = VALUES(latitude),
      longitude = VALUES(longitude),
      speed = VALUES(speed),
      heading = VALUES(heading),
      gps_valid = VALUES(gps_valid),
      acc_state = VALUES(acc_state),
      door_state = VALUES(door_state),
      raw_message = VALUES(raw_message)`,
    [position.imei, position.utcTimestamp, position.lat, position.lng, 0, 0, 1, 1, 0, 'seed-data']
  );
}

async function seedPositions() {
  for (const position of POSITIONS) {
    const utcTimestamp = new Date();
    await query(
      `INSERT INTO device_positions (imei, utc_timestamp, latitude, longitude, speed, heading, gps_valid, acc_state, door_state)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [position.imei, utcTimestamp, position.lat, position.lng, 0, 0, true, true, false]
    );
    await upsertLatestPosition({ ...position, utcTimestamp });
    logLine(`  Created position: IMEI ${position.imei}`);
  }
}

async function seedDatabase() {
  try {
    logLine('Starting CH RTV Platform database seed...\n');

    const [usersCount] = await query('SELECT COUNT(*) AS count FROM users');
    if (usersCount.count > 1) {
      logLine('Database already seeded. Skipping.');
      process.exit(0);
    }

    logLine('Seeding facilities...');
    const facilityIdsByCode = await seedFacilities();

    logLine('\nSeeding transport orders...');
    const orderIdsByNumber = await seedOrders(facilityIdsByCode);

    logLine('\nSeeding device assignments...');
    await seedAssignments(orderIdsByNumber);

    logLine('\nSeeding users...');
    await seedUsers();

    logLine('\nSeeding sample device positions...');
    await seedPositions();

    logLine('\nDatabase seed completed successfully!\n');
    logLine('Test users:');
    logLine('  Username: operator1 | Password: operator@2024 | Role: operator');
    logLine('  Username: supervisor | Password: supervisor@2024 | Role: admin\n');
    logLine('Test devices (IMEIs):');
    logLine('  123456789012345 - Active, SG-100-ABC');
    logLine('  234567890123456 - Active, TH-200-XYZ');
    logLine('  345678901234567 - Inactive, AE-300-DEF\n');
  } catch (error) {
    console.error('\nSeed failed:', formatError(error));
    process.exit(1);
  }
}

seedDatabase();
