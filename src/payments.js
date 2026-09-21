const crypto = require("crypto");
const Razorpay = require("razorpay");
const { config } = require("./config");

function razorpayClient() {
  if (!config.razorpayEnabled || !config.razorpayKeyId || !config.razorpayKeySecret) return null;
  return new Razorpay({ key_id: config.razorpayKeyId, key_secret: config.razorpayKeySecret });
}

async function createPaymentOrder({ amount, receipt, notes }) {
  const client = razorpayClient();
  if (!client) return { id: `local_order_${Date.now()}`, amount, currency: "INR", local: true };
  return client.orders.create({ amount: Math.round(amount * 100), currency: "INR", receipt, notes });
}

function verifyPaymentSignature({ orderId, paymentId, signature }) {
  if (!config.razorpayEnabled || !config.razorpayKeySecret) return false;
  const digest = crypto.createHmac("sha256", config.razorpayKeySecret).update(`${orderId}|${paymentId}`).digest("hex");
  return typeof signature === "string" && signature.length === digest.length && crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

function verifyWebhookSignature(payload, signature) {
  if (!config.razorpayEnabled || !config.razorpayWebhookSecret) return false;
  const digest = crypto.createHmac("sha256", config.razorpayWebhookSecret).update(payload).digest("hex");
  return typeof signature === "string" && signature.length === digest.length && crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

module.exports = { createPaymentOrder, verifyPaymentSignature, verifyWebhookSignature };
