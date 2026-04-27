const jwt = require('jsonwebtoken');
const { getRequiredEnv } = require('./env');

function signUser(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      role: user.role,
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
