const { Worker } = require("bullmq");
const { bullMqConnection } = require("../../config/redis");
const {
  generateReplySuggestions: generateGeminiSuggestions,
} = require("../../utils/gemini");
const {
  generateReplySuggestions: generateOpenAiSuggestions,
} = require("../../utils/openai");
const { getIo } = require("../../socket");

const aiWorker = new Worker(
  "ai-suggestions",
  async (job) => {
    const { chatId, messageId, receiverId, text } = job.data;

    try {
      let suggestions = ["Hello", "How are you ?", "👋"];

      // Try Gemini first
      try {
        suggestions = await generateGeminiSuggestions(text);
      } catch (geminiError) {
        console.error(
          "Gemini failed, falling back to OpenAI:",
          geminiError.message,
        );
      }

      // Fallback to OpenAI if Gemini fails or returns empty
      if (!suggestions || suggestions.length === 0) {
        console.log(
          "No suggestions from Gemini. Attempting OpenAI fallback...",
        );
        suggestions = await generateOpenAiSuggestions(text);
      }

      console.table(suggestions);

      if (suggestions && suggestions.length > 0) {
        const io = getIo();
        if (io) {
          io.to(receiverId.toString()).emit("reply_suggestions", {
            chatId,
            messageId,
            suggestions,
          });
        }
      }
    } catch (error) {
      console.error(`AI worker error processing job ${job.id}:`, error.message);
      throw error;
    }
  },
  {
    connection: bullMqConnection,
    concurrency: 5,
  },
);

aiWorker.on("error", (error) => {
  console.error("AI worker error:", error.message);
});

aiWorker.on("failed", (job, error) => {
  console.error(`AI worker failed: job ${job.id}, error: ${error.message}`);
});

aiWorker.on("completed", (job) => {
  console.log(`AI worker completed job ${job.id}`);
});

module.exports = { aiWorker };
