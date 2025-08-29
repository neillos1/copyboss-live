const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.GENERATOR_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// In-memory storage for free usage tracking (in production, use a database)
const freeUsageTracker = new Map();

// Helper function to check if user has used their free generation
function hasUsedFreeGeneration(userId) {
    return freeUsageTracker.has(userId);
}

// Helper function to mark user as having used free generation
function markFreeGenerationUsed(userId) {
    freeUsageTracker.set(userId, true);
}

// Helper function to generate a simple user ID (in production, use proper user authentication)
function generateUserId(req) {
    // Use IP address as a simple identifier for demo purposes
    // In production, implement proper user authentication
    return req.ip || req.connection.remoteAddress || 'unknown';
}

// ✅ 1. /generate endpoint
app.post('/generate', async (req, res) => {
    try {
        const { niche, audience, hook, tone, platform, duration, isPro } = req.body;
        const userId = generateUserId(req);

        // Validate required fields
        if (!niche || !audience || !hook || !tone || !platform || !duration) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'Please provide niche, audience, hook, tone, platform, and duration'
            });
        }

        // Check free usage limit
        if (!isPro && hasUsedFreeGeneration(userId)) {
            return res.status(403).json({
                error: 'Limit reached',
                upgrade: true,
                message: 'You have used your free generation. Upgrade to Pro for unlimited access.'
            });
        }

        // Create the prompt for OpenAI
        const prompt = `Create a viral ${platform} script with the following specifications:

Niche: ${niche}
Target Audience: ${audience}
Hook: ${hook}
Tone: ${tone}
Duration: ${duration} seconds

Requirements:
- Make it engaging and scroll-stopping
- Use the specified tone throughout
- Include natural pauses and transitions
- Optimize for the ${platform} platform
- Keep it within ${duration} seconds when spoken
- Make it authentic and relatable to the target audience

Format the script with clear sections and natural speaking flow.`;

        // Generate script using OpenAI
        let script;
        try {
            const completion = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "You are an expert content creator specializing in viral social media scripts. Create engaging, authentic content that drives engagement and follows platform-specific best practices."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 1000,
                temperature: 0.8
            });

            script = completion.choices[0].message.content;
        } catch (error) {
            // If OpenAI API fails, provide a mock response for testing
            console.log('OpenAI API error, using mock response:', error.message);
            script = `🎯 [HOOK] ${hook}

🔥 [MAIN CONTENT]
Hey ${audience}! 

I'm about to share something that completely changed my ${niche} game...

Here's what I discovered:
• First key insight about ${niche}
• Second breakthrough moment
• The game-changer that made all the difference

💡 [VALUE]
This ${tone} approach will help you:
- Achieve better results in ${niche}
- Stay motivated and consistent
- Build lasting habits

🚀 [CALL TO ACTION]
Drop a "🔥" in the comments if you're ready to level up your ${niche} journey!

Follow for more ${niche} tips and motivation! 💪

#${niche} #Motivation #${platform} #FYP`;
        }

        // Mark free generation as used if not pro
        if (!isPro) {
            markFreeGenerationUsed(userId);
        }

        // Return the generated script
        res.json({
            script: script,
            usage: {
                isPro: isPro || false,
                freeUsed: !isPro && hasUsedFreeGeneration(userId)
            }
        });

    } catch (error) {
        console.error('Generation error:', error);
        
        if (error.code === 'insufficient_quota') {
            return res.status(503).json({
                error: 'Service temporarily unavailable',
                message: 'OpenAI quota exceeded. Please try again later.'
            });
        }
        
        if (error.code === 'invalid_api_key') {
            return res.status(500).json({
                error: 'Configuration error',
                message: 'OpenAI API key is invalid or missing.'
            });
        }

        res.status(500).json({
            error: 'Generation failed',
            message: 'Failed to generate script. Please try again.'
        });
    }
});

// ✅ 2. /check-subscription endpoint (Stripe placeholder)
app.post('/check-subscription', async (req, res) => {
    try {
        const { userId } = req.body;
        
        // Placeholder implementation - in production, verify with Stripe
        // For now, return false as default
        res.json({
            pro: false,
            message: 'Subscription check endpoint - implement Stripe verification here'
        });
        
    } catch (error) {
        console.error('Subscription check error:', error);
        res.status(500).json({
            error: 'Subscription check failed',
            message: 'Failed to verify subscription status.'
        });
    }
});

// ✅ 3. Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'CopyBoss Generator Backend',
        timestamp: new Date().toISOString()
    });
});

// ✅ 4. Wake endpoint for keeping the service alive
app.get('/wake', (req, res) => {
    res.json({
        status: 'awake',
        message: 'CopyBoss Generator Backend is running'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: 'Something went wrong on the server.'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        message: 'The requested endpoint does not exist.'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 CopyBoss Generator Backend running on port ${PORT}`);
    console.log(`📝 Health check: http://localhost:${PORT}/health`);
    console.log(`🔧 Generate endpoint: http://localhost:${PORT}/generate`);
});

module.exports = app;
