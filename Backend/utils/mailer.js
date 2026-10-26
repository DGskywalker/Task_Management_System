const nodemailer = require('nodemailer');

function isConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transporter;
function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }
  return transporter;
}

// Sends the reset email. Without SMTP settings, the link is printed to the
// server console in development only, and never in production.
async function sendPasswordResetEmail(to, resetLink) {
  if (!isConfigured()) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[dev] SMTP not configured. Password reset link for ${to}: ${resetLink}`);
    } else {
      console.warn('SMTP is not configured; password reset email was not sent.');
    }
    return false;
  }

  await getTransporter().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: 'Reset your password',
    text: `We received a request to reset your password.\n\nOpen this link within 1 hour to choose a new password:\n${resetLink}\n\nIf you did not request this, you can ignore this email.`
  });
  return true;
}

module.exports = { sendPasswordResetEmail, isConfigured };
