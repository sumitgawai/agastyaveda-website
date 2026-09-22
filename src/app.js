const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const { optionalAuth, requireAuth, requireAdmin } = require("./auth");
const { config } = require("./config");
const { store } = require("./db");
const { sendMail, sendAdminNotification } = require("./mail");
const { createPaymentOrder, verifyPaymentSignature, verifyWebhookSignature } = require("./payments");
const { putPrivateObject, createPrivateDownloadUrl } = require("./storage");

function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  const requestCounts = new Map();
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: config.clientOrigin, methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] }));
  app.use((req, res, next) => {
    const key = `${req.ip}:${Math.floor(Date.now() / config.rateLimitWindowMs)}`;
    const count = (requestCounts.get(key) || 0) + 1;
    requestCounts.set(key, count);
    if (requestCounts.size > 10000) {
      for (const [entry] of requestCounts) if (!entry.startsWith(`${req.ip}:`)) requestCounts.delete(entry);
    }
    if (count > config.rateLimitMax) return res.status(429).json({ error: "Too many requests. Please try again shortly." });
    next();
  });
  app.post("/api/webhooks/razorpay", express.raw({ type: "application/json" }), async (req, res) => {
    if (!verifyWebhookSignature(req.body, req.headers["x-razorpay-signature"])) return res.status(400).json({ error: "Invalid webhook signature." });
    try {
      const payload = JSON.parse(req.body.toString("utf8"));
      const event = payload.event;
      const entity = payload.payload?.payment?.entity || payload.payload?.order?.entity;
      const paymentOrderId = entity?.order_id || entity?.id;
      if (paymentOrderId && ["payment.captured", "order.paid"].includes(event)) {
        await store("orders").updateOne({ paymentOrderId }, { status: "PAID", paymentId: entity.id, paidAt: new Date().toISOString(), paymentEvent: event });
        await store("appointments").updateOne({ paymentOrderId }, { status: "CONFIRMED", paymentId: entity.id, confirmedAt: new Date().toISOString(), paymentEvent: event });
      }
      if (paymentOrderId && event === "payment.failed") {
        await store("orders").updateOne({ paymentOrderId }, { status: "PAYMENT_FAILED", paymentId: entity.id, paymentEvent: event });
        await store("appointments").updateOne({ paymentOrderId }, { status: "PAYMENT_FAILED", paymentId: entity.id, paymentEvent: event });
      }
      res.json({ received: true });
    } catch (error) {
      console.error("Invalid Razorpay webhook payload:", error);
      res.status(400).json({ error: "Invalid webhook payload." });
    }
  });
  app.use(express.json({ limit: "1mb" }));
  app.use(optionalAuth());
  app.use(express.static(path.join(__dirname, "..")));

  app.get("/api/health", (req, res) => res.json({ ok: true, service: "agastyaveda", database: Boolean(require("./db").collection("products")) }));
  app.get("/api/config", (req, res) => res.json({
    clerkEnabled: config.clerkEnabled && !config.localAuthBypass,
    localAuthBypass: config.localAuthBypass,
    clerkPublishableKey: config.clerkPublishableKey || null,
    googleMapsApiKey: config.googleMapsApiKey || null,
    razorpayEnabled: config.razorpayEnabled,
    notifications: {
      messagesFormspree: Boolean(config.formspree.messagesEndpoint),
      appointmentsFormspree: Boolean(config.formspree.appointmentsEndpoint),
      ordersFormspree: Boolean(config.formspree.ordersEndpoint)
    }
  }));

  app.get("/api/products", async (req, res, next) => {
    try {
      const products = await store("products").findMany({ published: true });
      res.json({ products });
    } catch (error) { next(error); }
  });

  app.get("/api/products/:id", async (req, res, next) => {
    try {
      const products = store("products");
      const product = await products.findOne({ _id: req.params.id }) || await products.findOne({ name: req.params.id });
      if (!product) return res.status(404).json({ error: "Product not found." });
      const recommendations = (await products.findMany({ published: true }))
        .filter((item) => String(item._id) !== String(product._id))
        .sort((a, b) => Number(b.category === product.category) - Number(a.category === product.category))
        .slice(0, 3);
      res.json({ product, recommendations });
    } catch (error) { next(error); }
  });

  app.post("/api/appointments", requireAuth, async (req, res, next) => {
    try {
      const { date, time, email, phone } = req.body;
      if (!date || !time || !email || !phone) return res.status(400).json({ error: "Date, time, email and phone are required." });
      const schedule = await store("availability").findOne({ day: new Date(`${date}T00:00:00`).getDay() });
      if (schedule && (!schedule.enabled || time < schedule.start || time > schedule.end)) return res.status(409).json({ error: "That consultation time is outside clinic availability." });
      const appointments = store("appointments");
      if (await appointments.findOne({ date, time })) return res.status(409).json({ error: "That slot has already been booked." });
      const appointment = await appointments.insert({ date, time, email, phone, userId: req.auth.userId, fee: config.consultationFee, status: "REQUESTED", createdAt: new Date().toISOString() });
      await sendAdminNotification({ form: "appointmentsEndpoint", subject: "New Agastyaveda appointment request", text: `Appointment requested for ${date} at ${time}.\nPatient email: ${email}\nPatient phone: ${phone}\nUser ID: ${req.auth.userId}` });
      await sendMail({ to: email, subject: "Agastyaveda appointment request received", text: `We received your requested appointment for ${date} at ${time}. Our team will contact you personally to confirm the consultation.` });
      res.status(201).json({ appointment, paymentAvailable: false });
    } catch (error) { next(error); }
  });

  app.post("/api/payments/verify", requireAuth, async (req, res, next) => {
    try {
      if (!config.razorpayEnabled) return res.status(503).json({ error: "Online payments are currently under development." });
      const { orderId, paymentId, signature, appointmentId } = req.body;
      if (!orderId || !paymentId || !signature || !appointmentId || !verifyPaymentSignature({ orderId, paymentId, signature })) return res.status(400).json({ error: "Payment verification failed." });
      const appointment = await store("appointments").updateOne({ _id: appointmentId, paymentOrderId: orderId }, { status: "CONFIRMED", paymentId, confirmedAt: new Date().toISOString() });
      if (!appointment) return res.status(404).json({ error: "Appointment not found." });
      res.json({ confirmed: true, appointment });
    } catch (error) { next(error); }
  });

  app.post("/api/orders/verify", requireAuth, async (req, res, next) => {
    try {
      if (!config.razorpayEnabled) return res.status(503).json({ error: "Online payments are currently under development." });
      const { orderId, paymentId, signature } = req.body;
      if (!orderId || !paymentId || !signature || !verifyPaymentSignature({ orderId, paymentId, signature })) return res.status(400).json({ error: "Payment verification failed." });
      const order = await store("orders").updateOne({ paymentOrderId: orderId, userId: req.auth.userId }, { status: "PAID", paymentId, paidAt: new Date().toISOString() });
      if (!order) return res.status(404).json({ error: "Order not found." });
      res.json({ paid: true, order });
    } catch (error) { next(error); }
  });

  app.post("/api/orders", requireAuth, async (req, res, next) => {
    try {
      const { items, email, address } = req.body;
      if (!Array.isArray(items) || !items.length || !email || !address) return res.status(400).json({ error: "Items, email and address are required." });
      if (typeof address !== "object" || !address.name || !address.line1 || !address.city || !address.state || !address.postalCode || !address.phone || !address.latitude || !address.longitude) return res.status(400).json({ error: "Complete delivery details, phone number and map location are required." });
      const products = await store("products").findMany({ published: true });
      const lineItems = items.map((item) => {
        const product = products.find((entry) => String(entry._id) === String(item.productId) || entry.name === item.name);
        if (!product || product.stock < Number(item.quantity || 1)) throw new Error(`Product unavailable: ${item.name}`);
        return { productId: product._id, name: product.name, quantity: Number(item.quantity || 1), price: product.price };
      });
      const subtotal = lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const shipping = subtotal >= 1500 ? 0 : 80;
      const amount = subtotal + shipping;
      const order = await store("orders").insert({ userId: req.auth.userId, email, address, items: lineItems, subtotal, shipping, amount, status: "ORDER_RECEIVED", createdAt: new Date().toISOString() });
      const summary = lineItems.map((item) => `${item.name} x ${item.quantity} — ₹${item.price * item.quantity}`).join("\n");
      const details = `Order ID: ${order._id}\nCustomer email: ${email}\nName: ${address.name}\nPhone: ${address.phone}\nAddress: ${address.line1}, ${address.city}, ${address.state} - ${address.postalCode}\nMap coordinates: ${address.latitude}, ${address.longitude}\n\nItems:\n${summary}\n\nSubtotal: ₹${subtotal}\nDelivery: ${shipping ? `₹${shipping}` : "Free"}\nTotal: ₹${amount}`;
      await sendAdminNotification({ form: "ordersEndpoint", subject: `New Agastyaveda order ${order._id}`, text: details });
      await sendMail({ to: email, subject: "Agastyaveda order received", text: `Thank you. We received order ${order._id}. Our team will contact you personally to confirm availability, delivery, and payment.\n\n${details}` });
      res.status(201).json({ order, paymentAvailable: false });
    } catch (error) { next(error); }
  });

  app.post("/api/contact", async (req, res, next) => {
    try {
      const { name, email, message } = req.body;
      if (!name || !email || !message) return res.status(400).json({ error: "Name, email and message are required." });
      await store("messages").insert({ name, email, message, createdAt: new Date().toISOString(), status: "NEW" });
      await sendAdminNotification({ form: "messagesEndpoint", subject: `New Agastyaveda message from ${name}`, text: `${message}\n\nReply to: ${email}` });
      res.status(201).json({ received: true });
    } catch (error) { next(error); }
  });

  app.get("/api/patient/overview", requireAuth, async (req, res, next) => {
    try {
      const [appointments, orders] = await Promise.all([
        store("appointments").findMany({ userId: req.auth.userId }),
        store("orders").findMany({ userId: req.auth.userId })
      ]);
      res.json({
        profile: { userId: req.auth.userId },
        appointments,
        orders,
        counts: { appointments: appointments.length, orders: orders.length }
      });
    } catch (error) { next(error); }
  });

  app.get("/api/patient/appointments", requireAuth, async (req, res, next) => {
    try {
      res.json({ appointments: await store("appointments").findMany({ userId: req.auth.userId }) });
    } catch (error) { next(error); }
  });

  app.get("/api/patient/orders", requireAuth, async (req, res, next) => {
    try {
      res.json({ orders: await store("orders").findMany({ userId: req.auth.userId }) });
    } catch (error) { next(error); }
  });

  app.get("/api/patient/profile", requireAuth, async (req, res, next) => {
    try {
      const profile = await store("profiles").findOne({ userId: req.auth.userId });
      res.json({ profile: profile || { userId: req.auth.userId, firstName: "", lastName: "", phone: "", dateOfBirth: "" } });
    } catch (error) { next(error); }
  });

  app.put("/api/patient/profile", requireAuth, async (req, res, next) => {
    try {
      const { firstName, lastName, phone, dateOfBirth } = req.body;
      if (!firstName || !lastName || !phone) return res.status(400).json({ error: "First name, last name and phone are required." });
      const profiles = store("profiles");
      const existing = await profiles.findOne({ userId: req.auth.userId });
      const profile = existing
        ? await profiles.updateOne({ userId: req.auth.userId }, { firstName, lastName, phone, dateOfBirth: dateOfBirth || "" })
        : await profiles.insert({ userId: req.auth.userId, firstName, lastName, phone, dateOfBirth: dateOfBirth || "", createdAt: new Date().toISOString() });
      res.json({ profile });
    } catch (error) { next(error); }
  });

  app.get("/api/patient/addresses", requireAuth, async (req, res, next) => {
    try { res.json({ addresses: await store("addresses").findMany({ userId: req.auth.userId }) }); }
    catch (error) { next(error); }
  });

  app.post("/api/patient/addresses", requireAuth, async (req, res, next) => {
    try {
      const { label, name, line1, city, state, postalCode, phone, latitude, longitude } = req.body;
      if (!label || !name || !line1 || !city || !state || !postalCode || !phone || !latitude || !longitude) return res.status(400).json({ error: "Complete address and map location are required." });
      const address = await store("addresses").insert({ userId: req.auth.userId, label, name, line1, city, state, postalCode, phone, latitude, longitude, createdAt: new Date().toISOString() });
      res.status(201).json({ address });
    } catch (error) { next(error); }
  });

  app.get("/api/patient/documents", requireAuth, async (req, res, next) => {
    try {
      const documents = await store("documents").findMany({ userId: req.auth.userId });
      res.json({ documents: documents.map(({ storageKey, ...document }) => document) });
    } catch (error) { next(error); }
  });

  app.get("/api/patient/documents/:id/download", requireAuth, async (req, res, next) => {
    try {
      const document = await store("documents").findOne({ _id: req.params.id, userId: req.auth.userId });
      if (!document || !document.storageKey) return res.status(404).json({ error: "Document not found." });
      res.json({ url: await createPrivateDownloadUrl(document.storageKey) });
    } catch (error) { next(error); }
  });

  app.get("/api/availability", async (req, res, next) => {
    try { res.json({ availability: await store("availability").findMany() }); }
    catch (error) { next(error); }
  });

  app.get("/api/admin/overview", requireAuth, requireAdmin, async (req, res, next) => {
    try {
      const [products, appointments, orders, messages] = await Promise.all(["products", "appointments", "orders", "messages"].map((name) => store(name).findMany()));
      res.json({ counts: { products: products.length, appointments: appointments.length, orders: orders.length, messages: messages.length }, products, appointments, orders, messages });
    } catch (error) { next(error); }
  });

  app.put("/api/admin/products/:id", requireAuth, requireAdmin, async (req, res, next) => {
    try {
      const { name, description, price, category, stock, packageSize, packageUnit, imageUrl, published } = req.body;
      if (!name || !description || !category || !Number.isFinite(Number(price)) || !Number.isInteger(Number(stock)) || !Number.isFinite(Number(packageSize)) || Number(price) < 0 || Number(stock) < 0 || Number(packageSize) <= 0 || !["g", "kg", "ml", "L", "piece"].includes(packageUnit)) return res.status(400).json({ error: "Valid product details, price, stock, package size and unit are required." });
      if (imageUrl && !/^https?:\/\/\S+$/i.test(imageUrl)) return res.status(400).json({ error: "Image URL must start with http:// or https://." });
      const product = await store("products").updateOne({ _id: req.params.id }, { name, description, category, price: Number(price), stock: Number(stock), packageSize: Number(packageSize), packageUnit, imageUrl: imageUrl || "", published: published !== false, updatedAt: new Date().toISOString() });
      if (!product) return res.status(404).json({ error: "Product not found." });
      res.json({ product });
    } catch (error) { next(error); }
  });

  app.post("/api/admin/products", requireAuth, requireAdmin, async (req, res, next) => {
    try {
      const { name, description, price, category, stock, packageSize, packageUnit, imageUrl = "", published = true } = req.body;
      if (!name || !description || !category || !Number.isFinite(Number(price)) || !Number.isInteger(Number(stock)) || !Number.isFinite(Number(packageSize)) || Number(price) < 0 || Number(stock) < 0 || Number(packageSize) <= 0 || !["g", "kg", "ml", "L", "piece"].includes(packageUnit)) return res.status(400).json({ error: "Valid product details, price, stock, package size and unit are required." });
      if (imageUrl && !/^https?:\/\/\S+$/i.test(imageUrl)) return res.status(400).json({ error: "Image URL must start with http:// or https://." });
      const product = await store("products").insert({ name, description, category, price: Number(price), stock: Number(stock), packageSize: Number(packageSize), packageUnit, imageUrl, published: Boolean(published), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      res.status(201).json({ product });
    } catch (error) { next(error); }
  });

  app.patch("/api/admin/orders/:id", requireAuth, requireAdmin, async (req, res, next) => {
    try {
      const allowed = ["ORDER_RECEIVED", "CONFIRMED", "PROCESSING", "SHIPPED", "COMPLETED", "CANCELLED"];
      if (!allowed.includes(req.body.status)) return res.status(400).json({ error: "Invalid order status." });
      const order = await store("orders").updateOne({ _id: req.params.id }, { status: req.body.status, updatedAt: new Date().toISOString() });
      if (!order) return res.status(404).json({ error: "Order not found." });
      res.json({ order });
    } catch (error) { next(error); }
  });

  app.put("/api/admin/availability", requireAuth, requireAdmin, async (req, res, next) => {
    try {
      if (!Array.isArray(req.body.availability) || req.body.availability.some((item) => !Number.isInteger(Number(item.day)) || Number(item.day) < 0 || Number(item.day) > 6 || typeof item.enabled !== "boolean" || !/^\d{2}:\d{2}$/.test(item.start) || !/^\d{2}:\d{2}$/.test(item.end))) return res.status(400).json({ error: "Availability must contain valid days, enabled flags and times." });
      const results = [];
      for (const item of req.body.availability) {
        const existing = await store("availability").findOne({ day: Number(item.day) });
        results.push(existing ? await store("availability").updateOne({ day: Number(item.day) }, { day: Number(item.day), enabled: item.enabled, start: item.start, end: item.end }) : await store("availability").insert({ day: Number(item.day), enabled: item.enabled, start: item.start, end: item.end }));
      }
      res.json({ availability: results });
    } catch (error) { next(error); }
  });

  app.post("/api/admin/documents", requireAuth, requireAdmin, express.raw({ type: "application/octet-stream", limit: "10mb" }), async (req, res, next) => {
    try {
      const { patientId, title, type, contentType } = req.headers;
      if (!patientId || !title || !type || !contentType || !Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: "Patient ID, title, type, content type and file body are required." });
      if (!["application/pdf", "image/jpeg", "image/png"].includes(contentType)) return res.status(400).json({ error: "Only PDF, JPEG and PNG documents are supported." });
      const key = `patients/${patientId}/${Date.now()}-${String(title).replace(/[^a-z0-9_-]/gi, "-")}`;
      await putPrivateObject({ key, body: req.body, contentType });
      const document = await store("documents").insert({ userId: patientId, title, type, contentType, storageKey: key, createdAt: new Date().toISOString(), uploadedBy: req.auth.userId });
      res.status(201).json({ document: { ...document, storageKey: undefined } });
    } catch (error) { next(error); }
  });

  app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  });
  return app;
}

module.exports = { createApp };
