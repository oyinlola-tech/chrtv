const mysql = require('mysql2/promise');
const { loadEnv } = require('./env');

let pool;

loadEnv();

function createPool() {
  return mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 20),
    maxIdle: Number(process.env.DB_MAX_IDLE || 10),
    idleTimeout: Number(process.env.DB_IDLE_TIMEOUT_MS || 60000),
    queueLimit: Number(process.env.DB_QUEUE_LIMIT || 0),
    connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS || 10000),
    timezone: 'Z',
    decimalNumbers: true,
    enableKeepAlive: true,
    keepAliveInitialDelay: Number(process.env.DB_KEEPALIVE_INITIAL_DELAY_MS || 0),
    namedPlaceholders: false,
  });
}

function getPool() {
  if (!pool) {
    pool = createPool();
  }

  return pool;
}

async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

module.exports = {
  getPool,
  query,
};
