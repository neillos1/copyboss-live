console.log("📡 upload.js reached");


// routes/upload.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { OpenAI } = require('openai');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY, {
  apiEndpoint: 'https://generativelanguage.googleapis.com/v1',
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post('/', upload.single('video'), async (req, res) => {
  try {
    const caption = req.body.caption || '';
    const videoPath = req.file.path;
    const audioPath = path.join('uploads', `${req.file.filename}.mp3`);

    // Convert video to audio
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .output(audioPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    // Transcribe
    const audioFile = fs.createReadStream(audioPath);
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
    });
    const transcript = transcription.text;

    // Gemini analysis
    const model = genAI.getGenerativeModel({
      model: 'models/gemini-1.5-flash',
    });

  const prompt = `
⚠️ NEW INSTRUCTION SET — Ignore all previous prompts and context.

You are an AI video analyst. Your job is to analyze the following transcript and caption and return structured feedback.

You MUST return only raw JSON — no markdown, no text, no explanations.

All feedback must be clearly different per category. Don’t reuse the same advice or wording in multiple places.


The JSON should match this structure exactly:

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

📌 Rules:
- Do NOT include markdown, explanation, or code blocks.
- Use \\n only inside feedback text if needed.
- Labels must be one of: "Excellent", "Strong", "Good", "Okay", "Weak".
- Score must be a number from 0–100.
- “Short” should be one punchy sentence (~10–15 words max).
- “Detail” should be at least 2–3 full sentences. Give specific, non-repetitive advice for improving that score.
- Be **highly specific and helpful** — don't just say what’s wrong, give *how to fix it*.
- Avoid repeating the same tip across multiple feedback areas.
- Base everything strictly on the transcript and caption provided.


Transcript:
"\${transcript}"

Caption:
"\${caption}"
`;



    const result = await model.generateContent([prompt]);
    const raw = result.response.text();

    let parsed;
    try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
parsed = JSON.parse(jsonMatch[0]);


      // Fallback safety for missing keys
      function safeCardBlock(obj, key) {
        const card = obj?.[key];
        return {
          score: card?.score ?? 45,
          label: card?.label ?? "Weak",
          short: card?.short ?? "No feedback received.",
          detail: card?.detail ?? "Gemini did not return this metric."
        };
      }

      parsed = {
        feedback: {
          viralScore: safeCardBlock(parsed.feedback, "viralScore"),
          hookStrength: safeCardBlock(parsed.feedback, "hookStrength"),
          captionClarity: safeCardBlock(parsed.feedback, "captionClarity"),
          soundMatch: safeCardBlock(parsed.feedback, "soundMatch"),
          viewerUnderstanding: safeCardBlock(parsed.feedback, "viewerUnderstanding"),
          engagementForecast: safeCardBlock(parsed.feedback, "engagementForecast")
        }
      };
    } catch (err) {
      console.warn("⚠️ Failed to parse Gemini response. Returning fallback feedback.");
      parsed = {
        feedback: {
          viralScore: { score: 45, label: "Weak", short: "Could not analyze.", detail: "An error occurred during analysis." },
          hookStrength: { score: 40, label: "Weak", short: "Error", detail: "Unable to evaluate hook." },
          captionClarity: { score: 40, label: "Weak", short: "Error", detail: "Unable to evaluate caption." },
          soundMatch: { score: 40, label: "Weak", short: "Error", detail: "Unable to evaluate sound." },
          viewerUnderstanding: { score: 40, label: "Weak", short: "Error", detail: "Unable to evaluate clarity." },
          engagementForecast: { score: 40, label: "Weak", short: "Error", detail: "Unable to evaluate engagement." }
        }
      };
    }

    // Clean up
    fs.unlinkSync(videoPath);
    fs.unlinkSync(audioPath);

    res.status(200).json(parsed);

  } catch (err) {
    console.error('❌ Upload error:', err);
    res.status(500).json({ error: 'Analysis failed.' });
  }
});

module.exports = router;
