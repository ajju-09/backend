const { setCacheData, getCacheData } = require("../../redis/redis.cache");
const { findPlanByKey } = require("../../services/planServices");

// get all plans
// GET /api/v3/plan/getall
// access private
const getAllPlans = async (req, res, next) => {
  try {
    const { planId } = req.body;

    const cacheData = await getCacheData(`plan:${planId}`);

    if (cacheData) {
      return res
        .status(200)
        .json({ message: "Fetched all Plans", success: true, data: cacheData });
    }

    const plan = await findPlanByKey(planId);

    if (!plan) {
      return res
        .status(404)
        .json({ message: "Plan not found", success: false });
    }

    await setCacheData(`plan:${planId}`, plan, 604800);

    return res
      .status(200)
      .json({ message: "Fetched all Plans", success: true, data: plan });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllPlans };
