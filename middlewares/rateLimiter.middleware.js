const ip = require("ip");
const client = require("../config/redis");
const { rateLimitLogger } = require("../helper/logger");
require("dotenv").config();

const rateLimit = async (req, res, next) => {
  try {
    const rateKey = `rate:${ip.address()}`;

    const requests = await client.incr(rateKey);

    if (requests === 1) {
      await client.expire(rateKey, process.env.RATE_LIMIT_WINDOW);
    }

    if (requests > process.env.RATE_LIMIT) {
      rateLimitLogger.warn({
        message: `IP:${ip.address()} - Requests:${requests}`,
      });
      return res.status(429).json({
        message: "Too Many Requests. Try again later",
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
