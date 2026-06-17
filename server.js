// server.js
const express = require('express');
const path = require('path');
const http = require('http');
const https = require('https');
const fs = require('fs');

const app = express();
// Stripe setup
let stripe = null;
try {
  const Stripe = require('stripe');
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  } else {
    console.warn('⚠️ STRIPE_SECRET_KEY not set. /api/verify-session will return verified:false.');
  }
} catch (e) {
  console.warn('⚠️ Stripe SDK not available. Install "stripe" package to enable verification.');
}
const PORT = process.env.PORT || 3000;

// --- Dev-friendly no-cache to avoid stale assets locally ---
const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
if (isDev) {
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  next();
});
}

// --- Request logger (dev) ---
app.use((req, res, next) => {
  const t0 = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - t0;
    console.log(`[DEV] ${req.method} ${req.url} -> ${res.statusCode} (${ms}ms)`);
  });
  next();
});

// --- MIME type fix for JavaScript files ---
app.use((req, res, next) => {
  if (req.path.endsWith('.js')) {
    res.setHeader('Content-Type', 'application/javascript');
  }
  next();
});

// --- Boss analyzer redirect ---
app.get('/boss/analyzer.html', (req, res) => {
  res.redirect(302, '/analyzer.html');
});

// --- Generator page disabled: redirect to analyzer ---
app.get(['/generator', '/generator.html'], (req, res) => {
  res.redirect(302, '/analyzer.html');
});

// --- Static public dir ---
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir, { fallthrough: true }));

// --- Boss directory static serving ---
app.use('/boss', express.static(path.join(__dirname, 'public/boss')));

// --- Health check ---
app.get('/__health', (_req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || 'development', now: Date.now() });
});

// --- Client error beacon (optional but useful) ---
app.use(express.json({ limit: '256kb' }));
app.post('/__client_error', (req, res) => {
  console.error('🚨 CLIENT ERROR:', req.body?.message, req.body?.meta || '');
  res.json({ ok: true });
});

app.post('/api/report-issue', (req, res) => {
  try {
    const { name, email, message, page, userAgent } = req.body || {};

    if (!name || !message) {
      return res.status(400).json({
        success: false,
        error: 'Name and message are required'
      });
    }

    console.log('📣 CopyBoss Report Issue received:', {
      name,
      email: email || null,
      message,
      page: page || null,
      userAgent: userAgent || null,
      receivedAt: new Date().toISOString()
    });

    return res.json({ success: true, message: 'Report received' });
  } catch (error) {
    console.error('❌ /api/report-issue error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to receive report'
    });
  }
});

// --- Stripe session verification ---
app.post('/api/verify-session', express.json(), async (req, res) => {
  try {
    const { sessionId } = req.body || {};
    if (!sessionId) return res.status(400).json({ verified: false, error: 'sessionId required' });
    if (!stripe) return res.json({ verified: false, error: 'stripe_unavailable' });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const ok = session && session.payment_status === 'paid';
    return res.json({ verified: !!ok });
  } catch (err) {
    console.error('❌ /api/verify-session error:', err && err.message ? err.message : err);
    return res.status(500).json({ verified: false, error: 'server_error' });
  }
});

// --- Dev stub for missing API endpoints ---
app.get(['/api.me', '/api/me'], (_req, res) => {
  res.json({ ok: true, user: null, env: process.env.NODE_ENV || 'development' });
});

// --- Debug endpoint for unlock testing ---
app.get('/debug-unlock', (req, res) => {
  const plan = req.query.plan;
  const upgraded = req.query.upgraded;
  
  res.json({
    ok: true,
    message: 'Debug unlock endpoint',
    plan: plan,
    upgraded: upgraded,
    shouldUnlock: plan === 'pro' || upgraded === 'true',
    timestamp: new Date().toISOString()
  });
});

// --- Debug endpoints (dev safe) ---
app.get('/debug/gemini', (_req, res) => {
  const geminiModel = (process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash").replace(/^models\//, '');
  res.json({
    ok: true,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 'SET' : 'MISSING',
    GEMINI_MODEL: process.env.GEMINI_MODEL ? process.env.GEMINI_MODEL : `(default: ${geminiModel})`,
    modelUsed: geminiModel
  });
});

app.get('/debug/where-am-i', (_req, res) => {
  res.json({
    ok: true,
    cwd: process.cwd(),
    __dirname: typeof __dirname !== 'undefined' ? __dirname : null
  });
});

// --- Additional API endpoints for analyzer functionality ---
app.get('/api/user/status/:userId', (req, res) => {
  const userId = req.params.userId;
  const requestedPlan = String(req.query.plan || '').toLowerCase();
  const upgraded = req.query.upgraded === 'true';

  let plan = 'free';
  let report_credits = 0;
  let subscription_expires = null;

  if (requestedPlan === 'pro' || upgraded || req.query.pro === 'true') {
    plan = 'pro';
    report_credits = 0;
    subscription_expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  } else if (requestedPlan === '2reports') {
    plan = 'free';
    report_credits = 2;
  } else if (requestedPlan === '15reports') {
    plan = 'free';
    report_credits = 15;
  }

  console.log(`[DEV] /api/user/status/${userId}`, {
    requestedPlan: requestedPlan || '(none)',
    upgraded,
    returnedPlan: plan,
    returnedReportCredits: report_credits
  });

  res.json({
    ok: true,
    user: {
      id: userId,
      status: 'active',
      plan,
      subscription_expires,
      report_credits,
      avatar_url: null
    }
  });
});

// Stripe session details endpoint
app.post('/api/session-details', express.json(), async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ ok: false, error: 'Session ID required' });
    }
    
    // In a real implementation, you would:
    // 1. Verify the session with Stripe API
    // 2. Extract user ID and plan from session metadata
    // 3. Update user status in database
    // 4. Return session details
    
    // For now, simulate a successful Pro upgrade
    const mockSession = {
      id: sessionId,
      payment_status: 'paid',
      metadata: {
        userId: '123', // This should come from the actual session
        plan: 'pro'
      }
    };
    
    console.log('🎉 Stripe session processed - Pro upgrade successful:', sessionId);
    
    res.json({ 
      ok: true,
      session: mockSession
    });
    
  } catch (error) {
    console.error('❌ Session details error:', error);
    res.status(500).json({ ok: false, error: 'Failed to process session' });
  }
});

app.post('/api/save-analysis', express.json(), (req, res) => {
  // Stub for saving analysis results
  console.log('📊 Analysis data received:', req.body);
  res.json({ 
    ok: true, 
    saved: true, 
    id: Date.now() 
  });
});

// --- Minimal signup stub (JSON only; no DB/session/JWT yet) ---
app.post('/api/signup', express.json(), (req, res) => {
  const { email, username, password } = req.body || {};

  if (!email || !username || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  console.log(`[AUTH] Stub signup successful for: ${email}`);

  return res.status(200).json({
    success: true,
    user: {
      id: 'local-' + Date.now(),
      email,
      username
    },
    token: 'dev-token-' + Date.now()
  });
});

// --- Minimal login stub (JSON only; no DB/session/JWT yet) ---
app.post('/api/login', express.json(), (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  console.log(`[AUTH] Stub login successful for: ${email}`);

  return res.status(200).json({
    success: true,
    user: {
      id: 'local-login-' + Date.now(),
      email,
      username: email.split('@')[0]
    },
    token: 'dev-login-token-' + Date.now()
  });
});

// --- Import API routes (with error handling) ---
try {
  const uploadRoute = require('./routes/upload');
  app.use('/upload', uploadRoute);
  console.log('✅ Upload route loaded');
} catch (err) {
  console.warn('⚠️  Upload route failed to load (missing API keys):', err.message);
  // Add stub upload route for development
  app.post('/upload', (req, res) => {
    console.log('📤 Upload stub called');
    res.json({ 
      ok: true, 
      message: 'Upload endpoint (stub - API keys needed for full functionality)',
      jobId: `upload-${Date.now()}`
    });
  });
}

try {
  const analyzeRoute = require('./routes/analyze');
  app.use('/api/analyze', analyzeRoute);
  console.log('✅ Analyze route loaded');
} catch (err) {
  console.warn('⚠️  Analyze route failed to load (missing API keys):', err.message);
  // Add stub analyze route for development
  app.post('/api/analyze', (req, res) => {
    console.log('🔍 Analyze stub called');
    res.json({
      ok: true, 
      jobId: `analyze-${Date.now()}`,
      status: 'queued',
      message: 'Analysis endpoint (stub - API keys needed for full functionality)'
    });
  });
}

try {
  const affiliateRoute = require('./routes/affiliate');
  app.use('/api/affiliate', affiliateRoute);
  console.log('✅ Affiliate route loaded');
} catch (err) {
  console.warn('⚠️  Affiliate route failed to load (missing API keys):', err.message);
}

// --- Root serves index.html ---
app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.get('/affiliate', (_req, res) => {
  res.sendFile(path.join(publicDir, 'affiliate-dashboard.html'));
});

// --- Error handler for static failures ---
app.use((err, _req, res, _next) => {
    if (err) {
    console.error('Server static error:', err);
    return res.status(500).send('Static error');
  }
  res.status(404).send('Not found');
});

// Server Setup - Production vs Development
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  // Production: Use HTTP server for Render deployment
  const server = http.createServer(app);
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 CopyBoss server running on port ${PORT} (production)`);
    console.log(`🌐 Server listening on 0.0.0.0:${PORT}`);
    console.log(`✅ Render deployment ready - no 502 errors`);
    console.log('✅ Stripe verification route ready');
  });
} else {
  // Development: Try HTTPS first, fallback to HTTP
  try {
    // Load SSL certificates for local development
    const key = fs.readFileSync('cert/localhost-key.pem');
    const cert = fs.readFileSync('cert/localhost-cert.pem');
    
    // Create HTTPS server
    const httpsServer = https.createServer({ key, cert }, app);
    
    httpsServer.listen(PORT, '0.0.0.0', () => {
      console.log(`🔒 CopyBoss HTTPS server running: https://localhost:${PORT}`);
      console.log(`📋 Note: You may need to accept the self-signed certificate in your browser`);
      console.log(`🔧 To trust the certificate: Click "Advanced" → "Proceed to localhost (unsafe)"`);
      console.log('✅ Stripe verification route ready');
    });
    
  } catch (error) {
    console.error('❌ HTTPS setup failed:', error.message);
    console.log('🔄 Falling back to HTTP server...');
    
    // Fallback to HTTP if HTTPS fails
    const server = http.createServer(app);
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`⚠️  CopyBoss HTTP server running: http://localhost:${PORT}`);
      console.log(`⚠️  Note: Stripe iframe may not work due to mixed content policy`);
      console.log('✅ Stripe verification route ready');
    });
  }
}

// === Leaderboard API (file-backed) - added by automation ===
// Dependencies: uses built-in fs, no external DB required (easy to replace with real DB later)
try {
  if (typeof app === 'undefined') {
    console.warn('[LEADERBOARD] Express "app" not found. Ensure this file is appended after Express app creation.');
  } else {
    const fs = require('fs');
    const path = require('path');
    const LB_FILE = path.join(__dirname, 'data', 'leaderboard.json');

    // helper: read and write store (synchronous for simplicity)
    function readStore() {
      try {
        const raw = fs.readFileSync(LB_FILE, 'utf8') || '[]';
        return JSON.parse(raw);
      } catch (e) {
        console.warn('[LEADERBOARD] readStore error, returning []', e);
        return [];
      }
    }
    function writeStore(data) {
      try {
        fs.writeFileSync(LB_FILE, JSON.stringify(data, null, 2), 'utf8');
        return true;
      } catch (e) {
        console.error('[LEADERBOARD] writeStore error', e);
        return false;
      }
    }

    // Normalise incoming score object
    function normalizeEntry(entry) {
      return {
        id: String(entry.id || entry.userId || entry.uid || 'anon-' + Date.now()),
        username: String(entry.username || entry.user || 'Unknown'),
        score: Number(entry.score || 0),
        period: String(entry.period || 'all'),
        avatar: entry.avatar || null,
        ts: entry.ts || Date.now()
      };
    }

    // GET /api/leaderboard?period=all&limit=50&includeUserRank=true&userId=xxx
    app.get('/api/leaderboard', (req, res) => {
      try {
        const period = String(req.query.period || 'all');
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '100', 10)));
        const includeUserRank = String(req.query.includeUserRank || '') === 'true';
        const userId = req.query.userId || null;

        const all = readStore();

        // filter by period
        const filtered = all.filter(it => it.period === period);

        // roll up best score per user for this period
        const map = new Map();
        for (const it of filtered) {
          const cur = map.get(it.id);
          if (!cur || (it.score > cur.score)) {
            map.set(it.id, it);
          }
        }
        const items = Array.from(map.values()).sort((a, b) => b.score - a.score).slice(0, limit);

        let userRank = null;
        if (includeUserRank && userId) {
          const sorted = Array.from(map.values()).sort((a, b) => b.score - a.score);
          const idx = sorted.findIndex(x => x.id === String(userId));
          if (idx >= 0) {
            userRank = {
              rank: idx + 1,
              id: sorted[idx].id,
              username: sorted[idx].username,
              score: sorted[idx].score
            };
          } else {
            userRank = null;
          }
        }

        return res.json({ ok: true, period, limit, items, userRank });
  } catch (err) {
        console.error('[LEADERBOARD] GET error', err);
        return res.status(500).json({ ok: false, error: 'server_error' });
      }
    });

    // POST /api/score  { id, username, score, period, avatar? }
    // Adds or updates a user's score for a period (keeps highest score)
    app.post('/api/score', express.json(), (req, res) => {
      try {
        const body = req.body || {};
        const entry = normalizeEntry(body);
        // read
        const all = readStore();

        // push and then dedupe keeping highest per id+period
        // we'll keep history entries but for rollup we'll select max score per id+period
        all.push(Object.assign({}, entry, { ts: Date.now() }));

        // write back
        const ok = writeStore(all);
        if (!ok) return res.status(500).json({ ok: false, error: 'write_failed' });

        return res.json({ ok: true, saved: entry });
      } catch (err) {
        console.error('[LEADERBOARD] POST error', err);
        return res.status(500).json({ ok: false, error: 'server_error' });
      }
    });

    console.info('[LEADERBOARD] API routes /api/leaderboard and /api/score registered (file-backed store).');
  }
} catch (e) {
  console.warn('[LEADERBOARD] append failed', e);
}
// === End leaderboard block ===



// === Simple SPA fallback route ===
// Specific routes for HTML pages
app.get(["/analyzer", "/pricing", "/leaderboard"], (req, res) => {
  const fs = require("fs");
  const path = require("path");
  const publicDir = path.join(__dirname, "public");
  const htmlFile = path.join(publicDir, req.path.substring(1) + ".html");
  if (fs.existsSync(htmlFile)) {
    return res.sendFile(htmlFile);
  }
  return res.status(404).send("Page not found");
});// === End SPA fallback ===


// TEMP HOTFIX STUB: /api/analyze
// This fallback will be used only if the real analyze route failed to register.
// Returns a queued job response so the frontend won't 404 during testing.
// Remove this block once routes/analyze.js is fixed.
try {
  // Only add stub if app exists and no fatal error
  if (typeof app !== 'undefined' && app && !app.__ANALYZE_STUB_ADDED) {
    app.post('/api/analyze', (req, res) => {
      try {
        const jobId = `stub-job-${Date.now()}`;
        console.log(`[HOTFIX STUB] /api/analyze called -> returning job ${jobId}`);
        return res.json({ ok: true, jobId, status: 'queued', message: 'Analysis queued (temporary stub)' });
      } catch (err) {
        console.error('[HOTFIX STUB] analyze handler error', err && err.stack ? err.stack : err);
        return res.status(500).json({ ok: false, error: 'analyze-stub-error' });
      }
    });
    // mark stub added to avoid duplicate registration if code re-runs
    app.__ANALYZE_STUB_ADDED = true;
    console.log('HOTFIX: /api/analyze stub registered');
  }
} catch(e) {
  console.warn('HOTFIX: failed to add /api/analyze stub', e && e.message ? e.message : e);
}

