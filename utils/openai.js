const { OpenAI } = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const generateReplySuggestions = async (msg) => {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY is not set. Skipping reply generation.");
    return [];
  }

  try {
    const prompt = `User received this message: "${msg}"

                  Suggest exactly 3 reply messages.

                  Rules:
                  - Keep replies natural and human-like
                  - Each reply should be 3-4 words
                  - One reply MUST be ONLY a single emoji (no text)
                  - The other two replies should be text messages
                  - Return ONLY a valid JSON array of strings (no explanation, no extra text, no markdown)
                  `;

    console.log("Using OpenAI");
    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      messages: [
        {
          role: "system",
          content: "You generate only JSON arrays. No explanation.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    const responseText = response.choices[0].message.content;

    const jsonStr = responseText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .replace(/^[^\[]*/, "")
      .replace(/^[^\[]*/, "")
      .replace(/[^\]]*$/, "")
      .trim();

    const parsedReplies = JSON.parse(jsonStr);

    if (Array.isArray(parsedReplies) && parsedReplies.length === 3) {
      return parsedReplies;
    }

    return [];
  } catch (error) {
    console.error(
      "Error generating reply suggestions via OpenAI:",
      error.message,
    );
    return [];
  }
};

const generateShortExplanation = async (text) => {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY is not set. Skipping reply generation.");
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
                    - Do NOT include newline characters (\\n)
                    - Do NOT add extra explanation
                    - Do NOT translate to another language

                    Input:
                    ${text}

                    Output:
                    - Return only the simplified text in the same language`;

    console.log("Using OpenAI");
    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      messages: [
        {
          role: "system",
          content: "You simplify text concisely. No intro, no outro.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.5,
    });

    const responseText = response.choices[0].message.content;
    return responseText.trim();
  } catch (error) {
    console.error(
      "Error generating short explanation via OpenAI:",
      error.message,
    );
    return "";
  }
};

module.exports = { generateReplySuggestions, generateShortExplanation };
