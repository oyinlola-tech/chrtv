require('../shared/env').loadEnv();

const checks = [
  ['DB_CONNECTION_LIMIT', process.env.DB_CONNECTION_LIMIT || '20'],
  ['DB_CONNECT_TIMEOUT_MS', process.env.DB_CONNECT_TIMEOUT_MS || '10000'],
  ['HTTP_TIMEOUT_MS', process.env.HTTP_TIMEOUT_MS || '15000'],
  ['HTTP_MAX_SOCKETS', process.env.HTTP_MAX_SOCKETS || '100'],
  ['DASHBOARD_CACHE_TTL_MS', process.env.DASHBOARD_CACHE_TTL_MS || '3000'],
  ['DASHBOARD_STREAM_INTERVAL_MS', process.env.DASHBOARD_STREAM_INTERVAL_MS || '5000'],
  ['OPTION1_MAX_BATCH_SIZE', process.env.OPTION1_MAX_BATCH_SIZE || '200'],
];

console.log('CH RTV performance profile');
for (const [key, value] of checks) {
  console.log(`- ${key}=${value}`);
}

console.log('\nRecommendations');
console.log('- Keep dashboard stream interval at 3-5 seconds for local testing.');
console.log('- Increase DB connection pool only if MySQL has spare memory and concurrent clients.');
console.log('- Use option2 locally to avoid external API cost while testing.');
