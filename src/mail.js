const nodemailer = require("nodemailer");
const { config } = require("./config");

function createTransport() {
  if (!config.mail.host || !config.mail.user || !config.mail.password) return null;
  return nodemailer.createTransport({
    host: config.mail.host, port: config.mail.port, secure: config.mail.port === 465,
    auth: { user: config.mail.user, pass: config.mail.password }
  });
}

async function sendMail({ to, subject, text, html }) {
  const transport = createTransport();
  if (!transport) {
    console.log(`[mail preview] To: ${to} | Subject: ${subject}\n${text}`);
    return { preview: true };
  }
  return transport.sendMail({ from: config.mail.from, to, subject, text, html });
}

module.exports = { sendMail };
