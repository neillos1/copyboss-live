const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();
console.log("🧪 Transcript being sent to Gemini:", videoData.transcript?.slice(0, 200) || "❌ No transcript found");
console.log("🧪 Caption being sent to Gemini:", videoData.caption || "❌ No caption found");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateGeminiFeedback(videoData) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

   const prompt = `
⚠️ NEW INSTRUCTION SET — Forget all previous prompts and context.

You are an AI video analyst. Only return raw JSON. No markdown, no code blocks, no text.

Your response MUST follow *exactly* this structure:

{
  "feedback": {
    "viralScore": {
      "score": number,
      "label": "string",
      "short": "string",
      "detail": "string"
    },
    "hookStrength": {
      "score": number,
      "label": "string",
      "short": "string",
      "detail": "string"
    },
    "captionClarity": {
      "score": number,
      "label": "string",
      "short": "string",
      "detail": "string"
    },
    "soundMatch": {
      "score": number,
      "label": "string",
      "short": "string",
      "detail": "string"
    },
    "viewerUnderstanding": {
      "score": number,
      "label": "string",
      "short": "string",
      "detail": "string"
    },
    "engagementForecast": {
      "score": number,
      "label": "string",
      "short": "string",
      "detail": "string"
    }
  }
}

Rules:
- No markdown, no explanations, no code blocks.
- Use \\n if needed inside detail strings.
- Labels must be like "Strong", "Good", "Okay", "Weak", etc.
- Score = number between 0–100.
- "Short" = 1 punchy sentence.
- "Detail" = specific suggestions based on transcript & caption.

Transcript:
"\${videoData.transcript}"

Caption:
"\${videoData.caption}"
`;

    console.log("📤 Sending this prompt to Gemini:\n", prompt);

    const chat = model.startChat({ history: [] }); // 💥 resets all prior memory
    const result = await chat.sendMessage(prompt);

    const raw = await result.response.text();

    const cleaned = raw
      .replace(/```json|```/g, "") // removes all types of markdown fences
      .trim();

    return JSON.parse(cleaned);

  } catch (err) {
    console.error("Gemini API error:", err.message);
    return {
      feedback: {
        viralScore: {
          score: 40,
          label: "Weak",
          short: "Could not analyze.",
          detail: "An error occurred during analysis."
        },
        viralStrength: {
          score: 40,
          label: "Weak",
          short: "Error",
          detail: "Unable to evaluate visual strength."
        },
        captionClarity: {
          score: 40,
          label: "Weak",
          short: "Error",
          detail: "Unable to evaluate caption."
        },
        soundMatch: {
          score: 40,
          label: "Weak",
          short: "Error",
          detail: "Unable to evaluate sound."
        },
        viewerUnderstanding: {
          score: 40,
          label: "Weak",
          short: "Error",
          detail: "Unable to evaluate clarity."
        },
        engagementForecast: {
          score: 40,
          label: "Weak",
          short: "Error",
          detail: "Unable to evaluate engagement."
        }
      }
    };
  }
}

module.exports = generateGeminiFeedback;
