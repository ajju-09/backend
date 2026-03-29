const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const generateReplySuggestions = async (msg) => {
  if (!process.env.GEMINI_API_KEY) {
    console.warn(
      "GEMINI_API_KEY is not set. Skipping reply suggestion generation.",
    );
    return [];
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const prompt = `
        User received this message: "${msg}"

        Suggest exactly 3 reply messages.

        Rules:
        - Keep replies natural and human-like
        - Each reply should be 3-4 words
        - One reply MUST be ONLY a single emoji (no text)
        - The other two replies should be text messages
        - Return ONLY a valid JSON array of strings (no explanation, no extra text, no markdown block)
      `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Clean up potential markdown formatting and parse JSON
    const jsonStr = responseText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const parsedReplies = JSON.parse(jsonStr);

    if (Array.isArray(parsedReplies) && parsedReplies.length === 3) {
      return parsedReplies;
    }

    return [];
  } catch (error) {
    console.error(
      "Error generating reply suggestions via Gemini:",
      error.message,
    );
    return [];
  }
};

module.exports = {
  generateReplySuggestions,
};
