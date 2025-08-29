# CopyBoss Generator Backend

A Node.js/Express backend API for the CopyBoss Script Generator, providing AI-powered content generation using OpenAI GPT-4.

## 🚀 Features

- **AI Script Generation**: Uses OpenAI GPT-4 to create viral social media scripts
- **Free Usage System**: Tracks and limits free usage per user
- **Platform Optimization**: Generates content optimized for TikTok, Twitter, Instagram, and YouTube Shorts
- **Tone Customization**: Supports multiple content tones (Casual, Hype, Savage, Salesy, Educational, Dark Humor)
- **Stripe Integration Ready**: Placeholder endpoints for future subscription system

## 📋 Prerequisites

- Node.js 16.0.0 or higher
- npm or yarn
- OpenAI API key

## 🛠️ Installation

1. **Clone or navigate to the backend directory:**
   ```bash
   cd generator-backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables:**
   Edit `.env` file and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=3000
   ```

## 🏃‍♂️ Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3000`

## 📡 API Endpoints

### POST `/generate`
Generate a viral script using AI.

**Request Body:**
```json
{
  "niche": "fitness",
  "audience": "women 25-35",
  "hook": "What if I told you...",
  "tone": "Casual",
  "platform": "TikTok",
  "duration": 30,
  "isPro": false
}
```

**Response:**
```json
{
  "script": "Generated script content...",
  "usage": {
    "isPro": false,
    "freeUsed": true
  }
}
```

### POST `/check-subscription`
Check user subscription status (placeholder for Stripe integration).

**Request Body:**
```json
{
  "userId": "user123"
}
```

**Response:**
```json
{
  "pro": false,
  "message": "Subscription check endpoint - implement Stripe verification here"
}
```

### GET `/health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "CopyBoss Generator Backend",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

### GET `/wake`
Wake endpoint for keeping the service alive.

**Response:**
```json
{
  "status": "awake",
  "message": "CopyBoss Generator Backend is running"
}
```

## 🔒 Free Usage System

The backend implements a free usage tracking system:

- Users get **1 free generation** per IP address
- After using the free generation, users must upgrade to Pro
- Free usage is tracked in memory (use database in production)
- Pro users have unlimited access

## 🛡️ Error Handling

The API includes comprehensive error handling:

- **400**: Missing required fields
- **403**: Free usage limit reached
- **500**: Server errors
- **503**: OpenAI quota exceeded

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=3000

# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Stripe Configuration (for future implementation)
# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_PUBLISHABLE_KEY=pk_test_...

# Database Configuration (for future implementation)
# DATABASE_URL=mongodb://localhost:27017/copyboss
# REDIS_URL=redis://localhost:6379

# Security
NODE_ENV=development
```

## 🚀 Deployment

### Local Development
```bash
npm run dev
```

### Production Deployment
1. Set `NODE_ENV=production`
2. Configure your OpenAI API key
3. Run `npm start`

### Docker (Optional)
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔮 Future Enhancements

- [ ] Stripe subscription integration
- [ ] Database storage for usage tracking
- [ ] User authentication system
- [ ] Rate limiting
- [ ] Analytics and usage metrics
- [ ] Multiple AI model support
- [ ] Content moderation
- [ ] A/B testing for prompts

## 📝 License

MIT License - see LICENSE file for details.

## 👥 Support

For support, contact: contact@zerragroup.com
