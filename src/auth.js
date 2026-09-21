const { clerkMiddleware, getAuth } = require("@clerk/express");
const { config } = require("./config");

function optionalAuth() {
  if (config.localAuthBypass) return (req, res, next) => { req.auth = { userId: "local-development-user" }; next(); };
  if (!config.clerkEnabled) return (req, res, next) => { req.auth = { userId: null }; next(); };
  return clerkMiddleware({ publishableKey: config.clerkPublishableKey, secretKey: config.clerkSecretKey });
}

function requireAuth(req, res, next) {
  if (config.localAuthBypass || !config.clerkEnabled) {
    if (!config.localAuthBypass && process.env.NODE_ENV === "production") return res.status(503).json({ error: "Authentication is not configured." });
    req.auth = { userId: "local-development-user" };
    return next();
  }
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Sign in is required." });
  req.auth = { userId };
  next();
}

function requireAdmin(req, res, next) {
  const { userId } = req.auth || {};
  if (config.localAuthBypass && userId === "local-development-user") return next();
  if (!userId || (config.adminClerkIds.length && !config.adminClerkIds.includes(userId))) {
    return res.status(403).json({ error: "Administrator access is required." });
  }
  next();
}

module.exports = { optionalAuth, requireAuth, requireAdmin };
