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

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads directory');
}

// Configure multer to accept both "file" and "video" field names
const upload = multer({ 
  dest: uploadsDir,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Lazy initialization of AI clients (only when needed)
let genAI = null;
let openai = null;

function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found in environment');
    }
    genAI = new GoogleGenerativeAI(apiKey, {
      apiEndpoint: 'https://generativelanguage.googleapis.com/v1',
    });
  }
  return genAI;
}

function getOpenAI() {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not found in environment');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

// Fallback feedback generator (safe, deterministic)
function makeFallbackFeedback() {
  return {
    feedback: {
      viralScore: {
        score: 55,
        label: "Good",
        short: "Analysis temporarily unavailable. Please try again.",
        detail: "The AI analysis service is currently experiencing issues. Your video was uploaded successfully, but we couldn't generate detailed feedback at this time. Please try uploading again in a few moments."
      },
      hookStrength: {
        score: 60,
        label: "Good",
        short: "Hook analysis pending. Retry to get insights.",
        detail: "We were unable to analyze your video's hook strength right now. A strong hook typically grabs attention in the first 3 seconds. Try uploading again to receive specific recommendations."
      },
      captionClarity: {
        score: 50,
        label: "Okay",
        short: "Caption analysis unavailable. Please retry.",
        detail: "Caption clarity analysis could not be completed. Clear, engaging captions help viewers understand your content quickly. Upload again to get personalized caption improvement tips."
      },
      soundMatch: {
        score: 55,
        label: "Good",
        short: "Sound analysis pending. Try again soon.",
        detail: "Sound matching analysis is temporarily unavailable. Good audio-visual synchronization enhances viewer engagement. Please retry your upload to receive specific sound recommendations."
      },
      viewerUnderstanding: {
        score: 50,
        label: "Okay",
        short: "Clarity analysis unavailable. Retry for feedback.",
        detail: "We couldn't analyze how well viewers will understand your content at this time. Clear messaging and logical flow help viewers stay engaged. Try uploading again for detailed insights."
      },
      engagementForecast: {
        score: 55,
        label: "Good",
        short: "Engagement forecast pending. Please retry.",
        detail: "Engagement forecasting is temporarily unavailable. Factors like pacing, visual interest, and call-to-actions affect engagement. Upload again to receive specific engagement improvement strategies."
      }
    }
  };
}

router.post('/', upload.fields([{ name: 'file', maxCount: 1 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
  try {
    // Detect which field name was used: "file" or "video"
    let fileObj = req.file; // fallback for single field
    if (req.files) {
      fileObj = req.files.video?.[0] || req.files.file?.[0];
    }
    
    if (!fileObj) {
      console.error("UPLOAD_ERROR: No file received");
      return res.status(400).json({ 
        ok: false, 
        error: 'NO_FILE', 
        message: 'No file provided. Please upload a video file.' 
      });
    }

    const caption = req.body.caption || '';
    const videoPath = fileObj.path;
    const audioPath = path.join(uploadsDir, `${fileObj.filename}.mp3`);

    // Convert video to audio
    try {
      await new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .output(audioPath)
          .on('end', resolve)
          .on('error', reject)
          .run();
      });
    } catch (ffmpegErr) {
      console.error("UPLOAD_ERROR: FFmpeg conversion failed", ffmpegErr);
      // Clean up video file
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }
      return res.status(500).json({ 
        ok: false, 
        error: 'VIDEO_PROCESSING_FAILED', 
        message: 'Failed to process video file. Please try again.' 
      });
    }

    // Transcribe
    let transcript = '';
    try {
      if (!fs.existsSync(audioPath)) {
        throw new Error('Audio file not found after conversion');
      }
      const audioFile = fs.createReadStream(audioPath);
      const openaiClient = getOpenAI();
      const transcription = await openaiClient.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
      });
      transcript = transcription.text || '';
    } catch (transcribeErr) {
      console.error("UPLOAD_ERROR: Transcription failed", transcribeErr);
      // Clean up files
      if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
      if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
      return res.status(500).json({ 
        ok: false, 
        error: 'TRANSCRIPTION_FAILED', 
        message: 'Failed to transcribe audio. Please check your OpenAI API key and try again.' 
      });
    }

    // Gemini analysis with model fallback
    let parsed = null;
    let usedFallback = false;
    
    try {
      // Get model list: use env var if present, otherwise try fallback list
      const envModel = process.env.GEMINI_MODEL?.trim();
      const modelList = envModel 
        ? [envModel.replace(/^models\//, '')] // Remove "models/" prefix if present
        : [
            "gemini-1.5-flash-latest",
            "gemini-1.5-pro-latest",
            "gemini-2.0-flash",
            "gemini-2.5-flash" // Final fallback
          ];
      
      console.log("[GEMINI] keyPresent =", !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY));
      console.log("[GEMINI] trying models:", modelList);
      
      // Initialize Gemini client
      const genAIClient = getGenAI();
      
      // Try each model until one works (errors can come from getGenerativeModel or generateContent)
      let model = null;
      let modelName = null;
      let lastError = null;
      
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
"${transcript}"

Caption:
"${caption}"
`;



      // Try each model until generateContent succeeds
      for (const tryModel of modelList) {
        try {
          console.log("[GEMINI] attempting model =", tryModel);
          model = genAIClient.getGenerativeModel({
            model: tryModel,
          });
          
          // Try to generate content with this model
          const result = await model.generateContent([prompt]);
          const raw = result.response.text();
          modelName = tryModel;
          console.log("[GEMINI] using model =", modelName);

          // Parse JSON (catch parsing errors separately)
          try {
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            parsed = JSON.parse(jsonMatch[0]);
          } catch (parseErr) {
            // JSON parsing error - use fallback feedback
            console.warn("⚠️ Failed to parse Gemini response. Returning fallback feedback.", parseErr);
            parsed = makeFallbackFeedback();
            usedFallback = true;
            break; // Exit model loop, use fallback
          }

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
          
          break; // Success, exit model loop
        } catch (modelErr) {
          console.warn(`[GEMINI] model ${tryModel} failed:`, modelErr.message);
          lastError = modelErr;
          continue; // Try next model
        }
      }
      
      // If no model worked, use fallback
      if (!parsed) {
        throw lastError || new Error('All Gemini models failed');
      }
    } catch (geminiErr) {
      // Catch Gemini API errors (getGenAI, getGenerativeModel, generateContent)
      // Return 200 with fallback feedback instead of 500
      console.error("[GEMINI_FAIL]", geminiErr?.message || geminiErr);
      console.error("[GEMINI_FAIL] stack:", geminiErr?.stack);
      
      // Use fallback feedback
      parsed = makeFallbackFeedback();
      usedFallback = true;
    }

    // Clean up temp files
    try {
      if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
      if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    } catch (cleanupErr) {
      console.error("UPLOAD_ERROR: Cleanup failed", cleanupErr);
      // Non-fatal, continue
    }

    res.status(200).json({
      ok: true,
      fallback: usedFallback,
      feedback: parsed.feedback,
      jobId: `upload-${Date.now()}`
    });

  } catch (err) {
    console.error("UPLOAD_ERROR", err);
    console.error("UPLOAD_ERROR stack:", err.stack);
    
    // Clean up any temp files on error
    try {
      let fileObj = null;
      if (req.files) {
        fileObj = req.files.video?.[0] || req.files.file?.[0];
      } else if (req.file) {
        fileObj = req.file;
      }
      
      if (fileObj && fileObj.path && fs.existsSync(fileObj.path)) {
        fs.unlinkSync(fileObj.path);
      }
      
      // Also clean up audio file if it exists
      if (fileObj && fileObj.filename) {
        const audioPath = path.join(uploadsDir, `${fileObj.filename}.mp3`);
        if (fs.existsSync(audioPath)) {
          fs.unlinkSync(audioPath);
        }
      }
    } catch (cleanupErr) {
      console.error("UPLOAD_ERROR: Cleanup on error failed", cleanupErr);
    }
    
    return res.status(500).json({ 
      ok: false, 
      error: 'UPLOAD_FAILED', 
      message: err.message || 'Video analysis failed. Please try again.' 
    });
  }
});

module.exports = router;
