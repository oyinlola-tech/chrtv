const jwt = require('jsonwebtoken');
const { getRequiredEnv } = require('./env');

function signUser(user, csrfToken) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      csrf: csrfToken,
    },
    getRequiredEnv('JWT_SECRET'),
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '12h',
    }
  );
}

function verifyToken(token) {
  return jwt.verify(token, getRequiredEnv('JWT_SECRET'));
}

module.exports = {
  signUser,
  verifyToken,
};
