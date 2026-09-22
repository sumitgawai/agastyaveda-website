const envValue = (name) => (process.env[name] || "").trim().replace(/^['"]|['"]$/g, "");

const config = {
  port: Number(process.env.PORT || 3000),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || "",
  mongoUri: envValue("MONGODB_URI"),
  mongoDb: envValue("MONGODB_DB") || "agastyaveda",
  clerkSecretKey: envValue("CLERK_SECRET_KEY").startsWith("sk_") ? envValue("CLERK_SECRET_KEY") : "",
  clerkPublishableKey: envValue("CLERK_PUBLISHABLE_KEY").startsWith("pk_") ? envValue("CLERK_PUBLISHABLE_KEY") : "",
  localAuthBypass: process.env.NODE_ENV !== "production" && process.env.LOCAL_AUTH_BYPASS === "true",
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || "",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || "",
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || "",
  razorpayEnabled: process.env.RAZORPAY_ENABLED === "true",
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 900000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 120),
  aws: {
    region: process.env.AWS_REGION || "",
    bucket: process.env.S3_BUCKET || "",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ""
  },
  consultationFee: Number(process.env.CONSULTATION_FEE || 1200),
  mail: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || "",
    password: process.env.SMTP_PASSWORD || "",
    from: process.env.MAIL_FROM || "hello@agastyaveda.in",
    admin: process.env.ADMIN_EMAIL || "agastyaaveda@gmail.com"
  },
  formspree: {
    messagesEndpoint: envValue("FORMSPREE_MESSAGES_ENDPOINT"),
    appointmentsEndpoint: envValue("FORMSPREE_APPOINTMENTS_ENDPOINT"),
    ordersEndpoint: envValue("FORMSPREE_ORDERS_ENDPOINT")
  },
  adminAccessEmail: envValue("ADMIN_ACCESS_EMAIL").toLowerCase() || "agastyaaveda@gmail.com",
  adminClerkIds: (process.env.ADMIN_CLERK_IDS || "").split(",").map((id) => id.trim()).filter(Boolean)
};

config.clerkEnabled = Boolean(config.clerkSecretKey && config.clerkPublishableKey);

module.exports = { config };
