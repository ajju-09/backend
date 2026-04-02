const { logger } = require("../../helper/logger");
const MESSAGES = require("../../helper/messages");
const { findOneSubscription } = require("../../services/subscriptionService");
const {
  generateShortExplanation: generateGeminiExplanation,
} = require("../../utils/gemini");
const {
  generateShortExplanation: generateOpenAiExplanation,
} = require("../../utils/openai");

const getShortExplanation = async (req, res, next) => {
  try {
    const userId = req.id;
    const { text } = req.body;

    logger.info(`${req.method} ${req.url}`);

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

    let result = "";

    try {
      // Primary: Gemini
      result = await generateGeminiExplanation(text);
    } catch (geminiError) {
      console.error(
        "Gemini failed for short explanation, falling back to OpenAI:",
        geminiError.message,
      );
    }

    // Fallback: OpenAI if Gemini fails or returns empty
    if (!result || result.trim() === "") {
      console.log(
        "No results from Gemini for short explanation. Attempting OpenAI fallback...",
      );
      result = await generateOpenAiExplanation(text);
    }

    return res.status(200).json({
      message: MESSAGES.AI.GENERATE_SHORT_EXPLANATION_SUCCESS,
      success: true,
      text: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getShortExplanation,
};
