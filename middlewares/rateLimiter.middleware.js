const ip = require("ip");
const { rateLimitLogger } = require("../helper/logger");
const { increment, expireKey } = require("../redis/redis.client");
const MESSAGES = require("../helper/messages");
require("dotenv").config();

const rateLimit = async (req, res, next) => {
  try {
    const rateKey = `rate:${ip.address()}`;

    const requests = await increment(rateKey);

    if (requests === 1) {
      await expireKey(rateKey, process.env.RATE_LIMIT_WINDOW);
    }

    if (requests > process.env.RATE_LIMIT) {
      rateLimitLogger.warn({
        message: `IP:${ip.address()} - Requests:${requests}`,
      });
      return res.status(429).json({
        message: MESSAGES.ERROR.TOO_MANY_REQUEST,
        success: false,
      });
    }

    next();
  } catch (error) {
    console.log("Error in rate limiter", error.message);
    next();
  }
};

module.exports = rateLimit;
