const mysql = require('mysql2/promise');
const { loadEnv } = require('../shared/env');

loadEnv();

const dbName = process.env.DB_NAME || 'rtv_platform';

const schemaStatements = [
  `CREATE DATABASE IF NOT EXISTS \`${dbName}\``,
  `USE \`${dbName}\``,
  `CREATE TABLE IF NOT EXISTS transport_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    carrier_booking_ref VARCHAR(50),
    equipment_reference VARCHAR(30) NOT NULL,
    transportation_phase ENUM('EXPORT','IMPORT') NOT NULL,
    mode_of_transport ENUM('TRUCK','RAIL','BARGE','VESSEL') DEFAULT 'TRUCK',
    status ENUM('PLANNED','IN_PROGRESS','COMPLETED','CANCELLED') DEFAULT 'PLANNED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS facilities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    facility_type_code ENUM('DEPO','CLOC','POTE','RAMP') NOT NULL,
    location_code VARCHAR(20),
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    radius_meters INT DEFAULT 500,
    address_json TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transport_order_id INT NOT NULL,
    imei VARCHAR(20) NOT NULL,
    license_plate VARCHAR(20),
    originator_name VARCHAR(100) NOT NULL,
    partner_name VARCHAR(100) DEFAULT '',
    start_time DATETIME,
    end_time DATETIME,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_assignment_imei_active (imei, is_active),
    FOREIGN KEY (transport_order_id) REFERENCES transport_orders(id)
  )`,
  `CREATE TABLE IF NOT EXISTS order_facility_sequence (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transport_order_id INT NOT NULL,
    facility_id INT NOT NULL,
    sequence_order INT NOT NULL,
    area_name VARCHAR(10),
    FOREIGN KEY (transport_order_id) REFERENCES transport_orders(id),
    FOREIGN KEY (facility_id) REFERENCES facilities(id)
  )`,
  `CREATE TABLE IF NOT EXISTS device_positions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    imei VARCHAR(20) NOT NULL,
    utc_timestamp DATETIME(3) NOT NULL,
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    speed FLOAT,
    heading FLOAT,
    altitude FLOAT,
    acc_state BOOLEAN,
    door_state BOOLEAN,
    fuel1_percent FLOAT,
    fuel2_percent FLOAT,
    temperature FLOAT,
    mileage_km FLOAT,
    gps_valid BOOLEAN,
    raw_message TEXT,
    INDEX idx_imei_time (imei, utc_timestamp),
    INDEX idx_position_time (utc_timestamp)
  )`,
  `CREATE TABLE IF NOT EXISTS integration_config (
    id INT PRIMARY KEY DEFAULT 1,
    active_option ENUM('option1','option2') DEFAULT 'option2',
    option1_coordinates_interval_seconds INT DEFAULT 600,
    option1_api_base_url VARCHAR(255),
    option1_auth_token VARCHAR(255),
    option2_settings_json TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS integration_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    direction ENUM('coordinates','event') NOT NULL,
    request_payload JSON,
    response_http_code INT,
    response_body TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_integration_logs_created (created_at)
  )`,
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin','operator') DEFAULT 'operator',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_users_created (created_at)
  )`,
  `INSERT INTO integration_config (id, active_option, option1_coordinates_interval_seconds, option1_api_base_url, option1_auth_token, option2_settings_json)
   VALUES (1, 'option2', 600, '', '', '{}')
   ON DUPLICATE KEY UPDATE id = id`
];

async function columnExists(connection, tableName, columnName) {
  const [rows] = await connection.execute(
    `SELECT 1
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?
     LIMIT 1`,
    [dbName, tableName, columnName]
  );
  return rows.length > 0;
}

async function indexExists(connection, tableName, indexName) {
  const [rows] = await connection.execute(
    `SELECT 1
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?
     LIMIT 1`,
    [dbName, tableName, indexName]
  );
  return rows.length > 0;
}

async function ensureColumn(connection, tableName, columnName, definition) {
  if (!(await columnExists(connection, tableName, columnName))) {
    await connection.execute(`ALTER TABLE \`${tableName}\` ADD COLUMN ${definition}`);
  }
}

async function ensureIndex(connection, tableName, indexName, definition) {
  if (!(await indexExists(connection, tableName, indexName))) {
    await connection.execute(`ALTER TABLE \`${tableName}\` ADD ${definition}`);
  }
}

async function ensureSchemaCompatibility(connection) {
  await ensureColumn(
    connection,
    'assignments',
    'created_at',
    '`created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
  );
  await ensureColumn(
    connection,
    'assignments',
    'updated_at',
    '`updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
  );
  await ensureIndex(
    connection,
    'assignments',
    'idx_assignment_imei_active',
    'INDEX `idx_assignment_imei_active` (`imei`, `is_active`)'
  );
  await ensureIndex(
    connection,
    'device_positions',
    'idx_position_time',
    'INDEX `idx_position_time` (`utc_timestamp`)'
  );
  await ensureIndex(
    connection,
    'integration_logs',
    'idx_integration_logs_created',
    'INDEX `idx_integration_logs_created` (`created_at`)'
  );
  await ensureIndex(
    connection,
    'users',
    'idx_users_created',
    'INDEX `idx_users_created` (`created_at`)'
  );
}

async function runSchema() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: false,
  });

  try {
    for (const statement of schemaStatements) {
      await connection.execute(statement);
    }
    await ensureSchemaCompatibility(connection);
    console.log('Schema initialized successfully.');
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  runSchema().catch((error) => {
    console.error('Schema initialization failed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  schemaStatements,
  runSchema,
};
