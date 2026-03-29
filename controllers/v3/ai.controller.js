const MESSAGES = require("../../helper/messages");
const { findOneSubscription } = require("../../services/subscriptionService");
const { generateShortExplanation } = require("../../utils/gemini");

// generate short explanation
// GET /api/v3/ai/generate-short-explanation
// private access
const getShortExplanation = async (req, res, next) => {
  try {
    const userId = req.id;
    const { text } = req.body;

    const subscription = await findOneSubscription({
      where: { user_id: userId },
    });

    if (subscription.plan_id === 1) {
      return res
        .status(401)
        .json({ message: MESSAGES.ERROR.ACTIVE_SUBSCRIPTION, success: false });
    }

    if (!text) {
      return res
        .status(400)
        .json({ message: MESSAGES.ERROR.TEXT_REQUIRED, success: false });
    }

    const result = await generateShortExplanation(text);

    return res.status(200).json({
      message: MESSAGES.AI.GENERATE_SHORT_EXPLANATION_SUCCESS,
      success: true,
      text: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getShortExplanation };
