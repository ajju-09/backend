const { Op } = require("sequelize");
const { findOneSubscription } = require("../services/subscriptionService");
const { Plans } = require("../services/planServices");

const premiumFeature = async (req, res, next) => {
  const userId = req.id;

  if (!req.files || req.files.length === 0) {
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
    return res.status(403).json({
      message: "File sharing is available only for premium user only.",
    });
  }
  next();
};

module.exports = premiumFeature;
