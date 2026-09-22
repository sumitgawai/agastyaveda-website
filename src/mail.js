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

async function sendAdminNotification({ subject, text, form }) {
  const endpoint = config.formspree[form];
  if (!endpoint) {
    return sendMail({ to: config.adminAccessEmail, subject, text });
  }
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ _subject: subject, message: text, recipient: config.adminAccessEmail })
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error(`Formspree notification rejected for ${form || "unknown"}:`, response.status, detail);
    throw new Error(`Formspree notification failed (${response.status}): ${detail.slice(0, 200)}`);
  }
  return { formspree: true };
}

module.exports = { sendMail, sendAdminNotification };
