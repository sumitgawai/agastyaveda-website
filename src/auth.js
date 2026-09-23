const { clerkMiddleware, getAuth, clerkClient } = require("@clerk/express");
const { config } = require("./config");

function optionalAuth() {
  if (config.localAuthBypass) return (req, res, next) => { req.auth = { userId: "local-development-user" }; next(); };
  if (!config.clerkEnabled) return (req, res, next) => { req.auth = { userId: null }; next(); };
  return clerkMiddleware({ publishableKey: config.clerkPublishableKey, secretKey: config.clerkSecretKey });
}

function requireAuth(req, res, next) {
  if (config.localAuthBypass) {
    req.auth = { userId: "local-development-user" };
    return next();
  }
  if (!config.clerkEnabled) return res.status(503).json({ error: "Authentication is not configured." });
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Sign in is required." });
  req.auth = { userId };
  next();
}

async function requireAdmin(req, res, next) {
  const { userId } = req.auth || {};
  if (config.localAuthBypass && userId === "local-development-user") return next();
  if (!userId) return res.status(403).json({ error: "Administrator access is required." });
  try {
    const user = await clerkClient.users.getUser(userId);
    const matchingEmail = (user.emailAddresses || []).find((entry) => entry.emailAddress.toLowerCase() === config.adminAccessEmail);
    if (!matchingEmail || matchingEmail.verification?.status !== "verified") return res.status(403).json({ error: "This admin panel requires the verified authorized administrator email." });
    if (config.adminClerkIds.length && !config.adminClerkIds.includes(userId)) return res.status(403).json({ error: "This administrator account is not allowlisted." });
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { optionalAuth, requireAuth, requireAdmin, clerkClient, getAuth };
