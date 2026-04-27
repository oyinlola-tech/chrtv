const { query } = require('../../../shared/db');

async function createLog(direction, requestPayload, responseHttpCode, responseBody) {
  await query(
    `INSERT INTO integration_logs (direction, request_payload, response_http_code, response_body)
     VALUES (?, ?, ?, ?)`,
    [
      direction,
      JSON.stringify(requestPayload),
      responseHttpCode,
      typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody),
    ]
  );
}

async function listRecent() {
  return query('SELECT * FROM integration_logs ORDER BY created_at DESC LIMIT 100');
}

module.exports = {
  createLog,
  listRecent,
};

