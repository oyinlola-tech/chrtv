const { query } = require('../../../shared/db');

async function ensureRow() {
  await query(
    `INSERT INTO integration_config (id, active_option, option1_coordinates_interval_seconds, option1_api_base_url, option1_auth_token, option2_settings_json)
     VALUES (1, 'option1', 600, '', '', '{}')
     ON DUPLICATE KEY UPDATE id = id`
  );
  return getConfig();
}

async function getConfig() {
  const rows = await query('SELECT * FROM integration_config WHERE id = 1');
  return rows[0] || null;
}

async function updateConfig(data) {
  await query(
    `UPDATE integration_config
     SET active_option = ?, option1_coordinates_interval_seconds = ?, option1_api_base_url = ?, option1_auth_token = ?, option2_settings_json = ?
     WHERE id = 1`,
    [
      data.active_option,
      data.option1_coordinates_interval_seconds,
      data.option1_api_base_url || '',
      data.option1_auth_token || '',
      JSON.stringify(data.option2_settings_json || {}),
    ]
  );
  return getConfig();
}

module.exports = {
  ensureRow,
  getConfig,
  updateConfig,
};

