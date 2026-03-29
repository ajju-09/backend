const { Op } = require("sequelize");
const { findOneSubscription } = require("../services/subscriptionService");
const { Plans } = require("../services/planServices");
const { setCacheData, getCacheData } = require("../redis/redis.client");
const MESSAGES = require("../helper/messages");

const premiumFeature = async (req, res, next) => {
  const userId = req.id;

  if (!req.files || req.files.length === 0) {
    return next();
  }

  const cacheData = await getCacheData(`premium:${userId}`);

  if (cacheData) {
    return next();
  }

  const subscription = await findOneSubscription({
    where: {
      user_id: userId,
      status: "Active",
      end_date: { [Op.gt]: new Date() },
    },
    include: [{ model: Plans }],
  });

  if (
    !subscription ||
    !subscription.Plan.file_sharing_enable ||
    subscription === null
  ) {
    return res.status(401).json({
      message: MESSAGES.ERROR.FILE_SHARING_FOR_PREMIUM,
    });
  }

  const now = new Date();
  const endDate = new Date(subscription.end_date);

  const ttl = Math.floor((endDate - now) / 1000);

  if (ttl > 0) {
    await setCacheData(`premium:${userId}`, subscription, ttl);
  }

  next();
};

module.exports = premiumFeature;
