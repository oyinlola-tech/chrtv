#!/usr/bin/env node

/**
 * Seed Script for CH RTV Platform
 * Populates database with test data for localhost development
 * 
 * Usage: node backend/scripts/seed.js
 */

const { query } = require('../shared/db');
const bcrypt = require('bcryptjs');
const { loadEnv } = require('../shared/env');

loadEnv();

const FACILITIES = [
  {
    name: 'Port of Singapore',
    type: 'POTE',
    code: 'SGSIN',
    lat: 1.3521,
    lng: 103.8198,
    radius: 2000,
  },
  {
    name: 'Port of Rotterdam',
    type: 'POTE',
    code: 'NLRTM',
    lat: 51.9544,
    lng: 4.1694,
    radius: 2000,
  },
  {
    name: 'Bangkok Port',
    type: 'POTE',
    code: 'THBKK',
    lat: 13.6345,
    lng: 100.5896,
    radius: 2000,
  },
  {
    name: 'Hong Kong Port',
    type: 'POTE',
    code: 'HKHKG',
    lat: 22.3193,
    lng: 114.1694,
    radius: 1500,
  },
  {
    name: 'Dubai Depot',
    type: 'DEPO',
    code: 'AEDXB',
    lat: 25.2048,
    lng: 55.2708,
    radius: 500,
  },
  {
    name: 'Shanghai Warehouse',
    type: 'CLOC',
    code: 'CNSHA',
    lat: 31.2304,
    lng: 121.4737,
    radius: 500,
  },
  {
    name: 'Kuala Lumpur Ramp',
    type: 'RAMP',
    code: 'MYKUL',
    lat: 3.1390,
    lng: 101.6869,
    radius: 300,
  },
];

const ORDERS = [
  {
    order_number: 'ORD-2024-001',
    carrier_booking_ref: 'CBR-001',
    equipment_reference: 'CONT-123456',
    transportation_phase: 'EXPORT',
    mode_of_transport: 'TRUCK',
    status: 'PLANNED',
    facility_sequence: [1, 2], // Port of Singapore -> Port of Rotterdam
  },
  {
    order_number: 'ORD-2024-002',
    carrier_booking_ref: 'CBR-002',
    equipment_reference: 'CONT-123457',
    transportation_phase: 'IMPORT',
    mode_of_transport: 'TRUCK',
    status: 'IN_PROGRESS',
    facility_sequence: [3, 4], // Bangkok -> Hong Kong
  },
  {
    order_number: 'ORD-2024-003',
    carrier_booking_ref: 'CBR-003',
    equipment_reference: 'CONT-123458',
    transportation_phase: 'EXPORT',
    mode_of_transport: 'RAIL',
    status: 'PLANNED',
    facility_sequence: [5, 6], // Dubai -> Shanghai
  },
];

const ASSIGNMENTS = [
  {
    transport_order_id: 1,
    imei: '123456789012345',
    license_plate: 'SG-100-ABC',
    originator_name: 'Carrier Asia',
    partner_name: 'Local Logistics',
    is_active: true,
  },
  {
    transport_order_id: 2,
    imei: '234567890123456',
    license_plate: 'TH-200-XYZ',
    originator_name: 'Carrier Asia',
    partner_name: 'Bangkok Movers',
    is_active: true,
  },
  {
    transport_order_id: 3,
    imei: '345678901234567',
    license_plate: 'AE-300-DEF',
    originator_name: 'Middle East Freight',
    partner_name: 'Gulf Transport',
    is_active: false,
  },
];

const USERS = [
  {
    username: 'operator1',
    password: 'operator@2024',
    role: 'operator',
  },
  {
    username: 'supervisor',
    password: 'supervisor@2024',
    role: 'admin',
  },
];

async function seedDatabase() {
  try {
    console.log('  Starting CH RTV Platform Database Seed...\n');

    // Check if already seeded
    const [usersCount] = await query('SELECT COUNT(*) as count FROM users');
    if (usersCount.count > 1) {
      console.log('⚠️  Database already seeded. Skipping.');
      process.exit(0);
    }

    // Seed Facilities
    console.log('  Seeding facilities...');
    const facilityIds = [];
    for (const facility of FACILITIES) {
      const result = await query(
        `INSERT INTO facilities (name, facility_type_code, location_code, latitude, longitude, radius_meters)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [facility.name, facility.type, facility.code, facility.lat, facility.lng, facility.radius]
      );
      facilityIds.push(result.insertId || result[0]?.insertId);
      console.log(`  ✓ Created facility: ${facility.name}`);
    }

    // Seed Orders
    console.log('\n  Seeding transport orders...');
    const orderIds = [];
    for (let i = 0; i < ORDERS.length; i++) {
      const order = ORDERS[i];
      const result = await query(
        `INSERT INTO transport_orders (order_number, carrier_booking_ref, equipment_reference, transportation_phase, mode_of_transport, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [order.order_number, order.carrier_booking_ref, order.equipment_reference, order.transportation_phase, order.mode_of_transport, order.status]
      );
      const orderId = result.insertId || result[0]?.insertId;
      orderIds.push(orderId);

      // Add facility sequences
      if (order.facility_sequence) {
        for (let seq = 0; seq < order.facility_sequence.length; seq++) {
          await query(
            `INSERT INTO order_facility_sequence (transport_order_id, facility_id, sequence_order)
             VALUES (?, ?, ?)`,
            [orderId, order.facility_sequence[seq], seq + 1]
          );
        }
      }

      console.log(`  ✓ Created order: ${order.order_number}`);
    }

    // Seed Assignments
    console.log('\n  Seeding device assignments...');
    for (const assignment of ASSIGNMENTS) {
      await query(
        `INSERT INTO assignments (transport_order_id, imei, license_plate, originator_name, partner_name, is_active)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [assignment.transport_order_id, assignment.imei, assignment.license_plate, assignment.originator_name, assignment.partner_name, assignment.is_active]
      );
      console.log(`  ✓ Created assignment: IMEI ${assignment.imei} -> License ${assignment.license_plate}`);
    }

    // Seed Test Users
    console.log('\n  Seeding users...');
    for (const user of USERS) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      await query(
        `INSERT INTO users (username, password_hash, role)
         VALUES (?, ?, ?)`,
        [user.username, passwordHash, user.role]
      );
      console.log(`  ✓ Created user: ${user.username} (${user.role})`);
    }

    // Seed Sample Positions
    console.log('\n  Seeding sample device positions...');
    const positions = [
      { imei: '123456789012345', lat: 1.3521, lng: 103.8198 },
      { imei: '234567890123456', lat: 13.6345, lng: 100.5896 },
      { imei: '345678901234567', lat: 25.2048, lng: 55.2708 },
    ];

    for (const pos of positions) {
      await query(
        `INSERT INTO device_positions (imei, utc_timestamp, latitude, longitude, speed, heading, gps_valid, acc_state, door_state)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [pos.imei, new Date(), pos.lat, pos.lng, 0, 0, true, true, false]
      );
      console.log(`  ✓ Created position: IMEI ${pos.imei}`);
    }

    console.log('\n Database seed completed successfully!\n');
    console.log('   Test Users:');
    console.log('   Username: operator1 | Password: operator@2024 | Role: operator');
    console.log('   Username: supervisor | Password: supervisor@2024 | Role: admin\n');
    console.log('   Test Devices (IMEIs):');
    console.log('   123456789012345 - Active, SG-100-ABC');
    console.log('   234567890123456 - Active, TH-200-XYZ');
    console.log('   345678901234567 - Inactive, AE-300-DEF\n');

  } catch (error) {
    console.error('\n  Seed failed:', error.message);
    process.exit(1);
  }
}

seedDatabase();
