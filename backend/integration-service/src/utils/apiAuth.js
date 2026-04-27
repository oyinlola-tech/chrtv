function buildAuthHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

module.exports = {
  buildAuthHeaders,
};

