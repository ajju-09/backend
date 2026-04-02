const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Switch back to 'flash' model as it is significantly faster than 'pro' for simple tasks
const model = genAI.getGenerativeModel({
  model: "gemini-3.1-pro-preview",
});

const generateReplySuggestions = async (msg) => {
  if (!process.env.GEMINI_API_KEY) {
    console.warn(
      "GEMINI_API_KEY is not set. Skipping reply suggestion generation.",
    );
    return [];
  }

  try {
    const prompt = `
          User received this message: "${msg}"

          Suggest exactly 3 reply messages.

          Rules:
          - Keep replies natural and human-like
          - Each reply should be 3-4 words
          - One reply MUST be ONLY a single emoji (no text)
          - The other two replies should be text messages
          - Return ONLY a valid JSON array (no explanation, no extra text)
          `;

    console.log("Generating using gemini");
    const result = await model.generateContent(prompt);

    let responseText = result.response.text();

    // Safely extract the JSON array in case there are conversational wrappers
    const match = responseText.match(/\[[\s\S]*\]/);
    if (match) {
      responseText = match[0];
    }

    const parsedReplies = JSON.parse(responseText.trim());

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

const generateShortExplanation = async (text) => {
  if (!process.env.GEMINI_API_KEY) {
    console.warn(
      "GEMINI_API_KEY is not set. Skipping reply suggestion generation.",
    );
    return "";
  }

  try {
    const prompt = `You are an AI that simplifies text.

                    Task:
                    - Detect the language of the user's input
                    - Reply ONLY in the same language
                    - Make the text shorter and easier to understand

                    Rules:
                    - Keep the original meaning
                    - Use simple words
                    - Limit to 2-3 lines
                    - Output must be in a SINGLE LINE
                    - Do NOT include newline characters (\n)
                    - Do NOT add extra explanation
                    - Do NOT translate to another language

                    Input:
                    ${text}

                    Output:
                    - Return only the simplified text in the same language`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    return responseText;
  } catch (error) {
    console.error(
      "Error generating short explanation via Gemini:",
      error.message,
    );
    return "";
  }
};

module.exports = {
  generateReplySuggestions,
  generateShortExplanation,
};
