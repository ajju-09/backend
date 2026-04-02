const { rateLimitLogger } = require("../helper/logger");
const { increment, expireKey, getTTL } = require("../redis/redis.client");
const MESSAGES = require("../helper/messages");
require("dotenv").config();

const rateLimit = async (req, res, next) => {
  try {
    // req.ip is more reliable for client IP detection than ip.address()
    const clientIp =
      req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const rateKey = `rate:${clientIp}`;

    const requests = await increment(rateKey);

    // Get current TTL to ensure the key always has an expiration set
    const ttl = await getTTL(rateKey);
    const window = parseInt(process.env.RATE_LIMIT_WINDOW) || 1;
    const limit = parseInt(process.env.RATE_LIMIT) || 100;

    // If no expiration is set (-1), set it now.
    // This fixes the issue where keys could persist forever if the first request failed to set the expiry.
    if (ttl === -1) {
      await expireKey(rateKey, window);
    }

    if (requests > limit) {
      rateLimitLogger.warn({
        message: `IP:${clientIp} - Requests:${requests} - Limit Exceeded`,
      });
      return res.status(429).json({
        message: MESSAGES.ERROR.TOO_MANY_REQUEST,
        success: false,
      });
    }

    next();
  } catch (error) {
    console.error("Error in rate limiter middleware:", error.message);
    next();
  }
};

module.exports = rateLimit;
