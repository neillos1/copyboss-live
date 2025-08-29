const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateGeminiFeedback(videoData) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `
⚠️ You are being given a NEW instruction set. Forget all previous prompts or context.

You are an AI video analyst. Only return raw JSON. No markdown, no code blocks, no text.

Your response MUST follow *exactly* this structure:

{
  "feedback": {
    "viralScore": {
      "score": 78,
      "label": "Strong",
      "short": "Great pacing and structure.",
      "detail": "Well-paced video with solid intro and flow."
    },
    "hookStrength": {
      "score": 71,
      "label": "Good",
      "short": "Strong visual but intro too long.",
      "detail": "Cut down the opening by 1–2 seconds for better engagement."
    },
    "captionClarity": {
      "score": 64,
      "label": "Okay",
      "short": "Slightly wordy but clear.",
      "detail": "Keep keywords focused and snappy to increase click-through."
    },
    "soundMatch": {
      "score": 69,
      "label": "Fair",
      "short": "Good choice, mildly trending.",
      "detail": "Try aligning sound more closely to visuals."
    },
    "viewerUnderstanding": {
      "score": 82,
      "label": "Strong",
      "short": "Message is clear.",
      "detail": "You communicated the idea clearly within the first 5 seconds."
    },
    "engagementForecast": {
      "score": 75,
      "label": "Promising",
      "short": "CTA needs improvement.",
      "detail": "Adding a strong call-to-action can improve interaction."
    }
  }
}

Rules:
- Return ONLY the JSON above. No text, no code blocks, no markdown.
- Do not change property names.
- Use \\n inside any feedback if needed.
- Use your best judgment if uncertain.

Transcript:
"${videoData.transcript}"

Caption:
"${videoData.caption}"
`;

    console.log("📤 Sending this prompt to Gemini:\n", prompt);

   const chat = model.startChat({
  history: [], // 💥 resets all prior memory
});

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
        viralScore: { score: 40, label: "Weak", short: "Could not analyze.", detail: "An error occurred during analysis." },
        hookStrength: { score: 40, label: "Weak", short: "Error", detail: "Unable to evaluate hook." },
        captionClarity: { score: 40, label: "Weak", short: "Error", detail: "Unable to evaluate caption." },
        soundMatch: { score: 40, label: "Weak", short: "Error", detail: "Unable to evaluate sound." },
        viewerUnderstanding: { score: 40, label: "Weak", short: "Error", detail: "Unable to evaluate clarity." },
        engagementForecast: { score: 40, label: "Weak", short: "Error", detail: "Unable to evaluate engagement." }
      }
    };
  }
}

module.exports = generateGeminiFeedback;

