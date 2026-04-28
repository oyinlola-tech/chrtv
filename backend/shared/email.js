const nodemailer = require('nodemailer');
const { loadEnv } = require('./env');

loadEnv();

let transporter;

function parseBoolean(value, fallback = false) {
  if (value == null || value === '') {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function getEmailConfig() {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_FROM,
  } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    throw new Error('SMTP is not fully configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM.');
  }

  return {
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: parseBoolean(process.env.SMTP_SECURE, Number(SMTP_PORT) === 465),
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    from: SMTP_FROM,
  };
}

function getTransporter() {
  if (!transporter) {
    const config = getEmailConfig();
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });
  }

  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  const config = getEmailConfig();
  return getTransporter().sendMail({
    from: config.from,
    to,
    subject,
    text,
    html,
  });
}

module.exports = {
  sendMail,
};
