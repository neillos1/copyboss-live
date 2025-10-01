// server.js
const express = require('express');
const path = require('path');

const app = express();
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

// --- Static public dir ---
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir, { fallthrough: true }));

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

// --- Dev stub for missing API endpoints ---
app.get(['/api.me', '/api/me'], (_req, res) => {
  res.json({ ok: true, user: null, env: process.env.NODE_ENV || 'development' });
});

// --- Additional API endpoints for analyzer functionality ---
app.get('/api/user/status/:userId', (req, res) => {
  // Stub for user status endpoint
  res.json({ 
    ok: true, 
    user: { 
      id: req.params.userId, 
      status: 'active',
      avatar_url: null 
    } 
  });
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

// --- Import API routes (with error handling) ---
try {
  const uploadRoute = require('./routes/upload');
  app.use('/upload', uploadRoute);
  console.log('✅ Upload route loaded');
} catch (err) {
  console.warn('⚠️  Upload route failed to load (missing API keys):', err.message);
}

try {
  const analyzeRoute = require('./routes/analyze');
  app.use('/api/analyze', analyzeRoute);
  console.log('✅ Analyze route loaded');
} catch (err) {
  console.warn('⚠️  Analyze route failed to load (missing API keys):', err.message);
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

// --- Error handler for static failures ---
app.use((err, _req, res, _next) => {
    if (err) {
    console.error('Server static error:', err);
    return res.status(500).send('Static error');
  }
  res.status(404).send('Not found');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`CopyBoss dev server running: http://localhost:${PORT}`);
});

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
app.get(["/analyzer", "/generator", "/pricing", "/leaderboard"], (req, res) => {
  const fs = require("fs");
  const path = require("path");
  const publicDir = path.join(__dirname, "public");
  const htmlFile = path.join(publicDir, req.path.substring(1) + ".html");
  if (fs.existsSync(htmlFile)) {
    return res.sendFile(htmlFile);
  }
  return res.status(404).send("Page not found");
});// === End SPA fallback ===

