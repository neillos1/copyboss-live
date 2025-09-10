require('dotenv').config();

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const sgMail = require('@sendgrid/mail');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');
const app = express();

// Enable trust proxy for Render deployment
app.enable('trust proxy');

// --- Bypass for Stripe webhook (no redirects/auth) ---
app.use((req, res, next) => {
  if (req.path === '/stripe-webhook') return next();
  next();
});

// ===== HTTPS ENFORCEMENT & CANONICAL HOST =====
app.use((req, res, next) => {
  // Skip redirects for Stripe webhook
  if (req.path === '/stripe-webhook') return next();
  
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host');
  const url = req.originalUrl;
  
  // Skip HTTPS enforcement for localhost (development)
  if (host === 'localhost:3000') return next();
  
  // Force HTTPS
  if (protocol !== 'https') {
    return res.redirect(301, `https://${host}${url}`);
  }
  
  // Canonicalize to www.copy-boss.com (except for community subdomain)
  if (host === 'copy-boss.com') {
    return res.redirect(301, `https://www.copy-boss.com${url}`);
  }
  
  // Set HSTS headers for all HTTPS requests
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  next();
});

// ===== STRIPE WEBHOOK (must be first and use raw body) =====
app.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  try {
    const event = stripe.webhooks.constructEvent(
      req.body, // raw buffer from express.raw
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    // Handle the events we listen to
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan;
      const credits = session.metadata?.credits ? parseInt(session.metadata.credits) : 0;

      if (userId) {
        if (plan === 'pro') {
          const expiry = new Date();
          expiry.setMonth(expiry.getMonth() + 1);
          await db.updateUserPlan(userId, 'pro', expiry.toISOString());
          console.log(`✅ Upgraded user ${userId} to PRO until ${expiry}`);
        } else if (credits > 0) {
          await db.addReportCredits(userId, credits);
          console.log(`✅ Added ${credits} report credits to user ${userId}`);
        }
      }

      // process affiliate commission if needed
      await processAffiliateCommission(session);
    }
    
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object;
      const userId = invoice.metadata?.userId;
      if (userId) {
        const expiry = new Date();
        expiry.setMonth(expiry.getMonth() + 1);
        await db.updateUserPlan(userId, 'pro', expiry.toISOString());
        console.log(`🔄 Renewed PRO for user ${userId} until ${expiry}`);
      }
      await processSubscriptionCommission(invoice);
    }

    return res.sendStatus(200); // MUST reply 2xx quickly
  } catch (err) {
    console.error('Webhook verify failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
});
// ===== END STRIPE WEBHOOK =====

// Initialize database and affiliate system
const db = require('./database');
const affiliateRoutes = require('./routes/affiliate');
const { startPayoutCron } = require('./payout-cron');

// Set SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'copyboss-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    domain: process.env.NODE_ENV === 'production' ? '.copy-boss.com' : undefined,
    sameSite: 'lax'
  }
}));

// Avatar upload configuration
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads', 'avatars');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const userId = req.session.userId;
    const ext = path.extname(file.originalname);
    cb(null, `${userId}${ext}`);
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Serve avatar files
app.get('/api/avatar/:userId', (req, res) => {
  const userId = req.params.userId;
  const avatarDir = path.join(__dirname, 'uploads', 'avatars');
  
  // Try to find the avatar file with any extension
  const possibleExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
  let avatarPath = null;
  
  for (const ext of possibleExtensions) {
    const testPath = path.join(avatarDir, `${userId}${ext}`);
    if (fs.existsSync(testPath)) {
      avatarPath = testPath;
      break;
    }
  }
  
  if (avatarPath) {
    res.sendFile(avatarPath);
  } else {
    // Return default avatar
    res.sendFile(path.join(__dirname, 'public', 'assets', 'img', 'default-avatar.png'));
  }
});

// Avatar upload endpoint
app.post('/api/upload-avatar', requireAuth, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.session.userId;
    const avatarUrl = `/api/avatar/${userId}`;
    
    // Update user's avatar_url in database
    await db.updateAvatarUrl(userId, avatarUrl);
    
    res.json({ 
      success: true, 
      avatarUrl,
      message: 'Avatar uploaded successfully' 
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// Initialize database
db.initializeDatabase()
  .then(() => {
    console.log('✅ Database initialized');
    // Start the monthly payout cron job
    startPayoutCron();
  })
  .catch(err => {
    console.error('❌ Database initialization failed:', err);
  });

// Community redirects to WordPress subdomain
app.get(/^\/community(?:\/(.*))?$/, (req, res) => {
  const rest = (req.params[0] || '').replace(/^\/+/, '');
  const dest = `https://community.copy-boss.com/${rest}`;
  console.log('[community-redirect]', req.originalUrl, '→', dest);
  return res.redirect(301, dest);
});

// Affiliate route guard - redirect to login if no session
app.get('/affiliate', (req, res) => {
  if (req.session.userId) {
    // User is logged in, redirect to affiliate dashboard
    res.redirect('/affiliate-dashboard.html');
  } else {
    // User is not logged in, redirect to login with redirect parameter
    res.redirect('/login.html?redirect=/affiliate');
  }
});

// Affiliate routes
app.use('/affiliate', affiliateRoutes);

// Serve static files (like index.html, JS, CSS)
app.use(express.static(path.join(__dirname, 'public')));

// Parse JSON and URL-encoded bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Authentication required' });
  }
}

// Authentication endpoints
app.post('/api/signup', async (req, res) => {
  try {
    const { email, username, password, referrerId } = req.body;
    
    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Email, username, and password required' });
    }

    // Check if user already exists
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Validate referrer if provided
    if (referrerId) {
      const referrer = await db.getUserById(referrerId);
      if (!referrer) {
        return res.status(400).json({ error: 'Invalid referrer' });
      }
    }

    // Create user
    const userId = await db.createUser(email, username, password, referrerId);
    
    // Auto-login after signup - create session
    const user = await db.getUserById(userId);
    req.session.userId = userId;
    
    // Set affiliate cookie if referrerId is provided
    if (referrerId) {
      res.cookie('affiliate_id', referrerId, { 
        path: '/', 
        sameSite: 'lax', 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });
    }
    
    // Check if this is an affiliate signup (has referrerId or affiliate intent)
    const isAffiliateSignup = referrerId || req.query.intent === 'affiliate';
    
    if (isAffiliateSignup) {
      // For affiliate signups, redirect to affiliate dashboard
      return res.redirect(302, '/affiliate-dashboard.html');
    }
    
    res.json({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar_url: user.avatar_url,
        referrer_id: user.referrer_id,
        stripe_account_id: user.stripe_account_id
      },
      message: referrerId ? 'User created with referral' : 'User created successfully'
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Authenticate user
    const user = await db.authenticateUser(email, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Create session
    req.session.userId = user.id;
    
    res.json({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar_url: user.avatar_url,
        referrer_id: user.referrer_id,
        stripe_account_id: user.stripe_account_id
      },
      token: 'session-token' // For compatibility with frontend
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

app.get('/api/me', requireAuth, async (req, res) => {
  try {
    const user = await db.getUserById(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar_url: user.avatar_url,
        referrer_id: user.referrer_id,
        stripe_account_id: user.stripe_account_id
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Report Issue endpoint
app.post('/api/report-issue', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    const msg = {
      to: 'hello@copy-boss.com',
      from: 'hello@copy-boss.com',
      subject: `New Feedback from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
      html: `
        <h3>New Feedback Submitted</h3>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Message:</b><br/> ${message}</p>
      `,
    };

    await sgMail.send(msg);
    res.json({ success: true, message: 'Thanks! Your feedback has been sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error sending feedback.' });
  }
});

// Leaderboard endpoint
app.get('/api/leaderboard', async (req, res) => {
  try {
    const { period = 'daily', limit = 10, includeUserRank = 'false' } = req.query;
    const currentUserId = req.session.userId || null;
    
    // Validate period
    if (!['daily', 'weekly', 'alltime'].includes(period)) {
      return res.status(400).json({ error: 'Invalid period. Must be daily, weekly, or alltime' });
    }
    
    // Validate limit
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ error: 'Invalid limit. Must be between 1 and 100' });
    }
    
    // Get leaderboard data
    const leaderboardData = await db.getLeaderboard(
      period, 
      limitNum, 
      includeUserRank === 'true', 
      currentUserId
    );
    
    res.json(leaderboardData);
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Save analysis result endpoint
app.post('/api/save-analysis', requireAuth, async (req, res) => {
  try {
    const { score } = req.body;
    const userId = req.session.userId;
    
    if (!score || isNaN(score)) {
      return res.status(400).json({ error: 'Valid score required' });
    }
    
    const resultId = await db.saveAnalysisResult(userId, parseInt(score));
    
    res.json({ 
      success: true, 
      resultId,
      message: 'Analysis result saved successfully' 
    });
  } catch (error) {
    console.error('Save analysis error:', error);
    res.status(500).json({ error: 'Failed to save analysis result' });
  }
});


// User status API endpoint
app.get('/api/user/status/:id', async (req, res) => {
  try {
    const status = await db.getUserStatus(req.params.id);
    if (!status) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(status);
  } catch (err) {
    console.error('Error fetching user status:', err);
    res.status(500).json({ error: 'Failed to fetch user status' });
  }
});

// Create Stripe checkout session
app.post("/create-checkout-session", async (req, res) => {
  try {
    const { plan, userId } = req.body;
    console.log("➡️ Creating checkout session:", { plan, userId });

    let priceId;
    if (plan === "pro") priceId = process.env.STRIPE_PRICE_PRO;
    if (plan === "2reports") priceId = process.env.STRIPE_PRICE_2REPORTS;
    if (plan === "15reports") priceId = process.env.STRIPE_PRICE_15REPORTS;

    console.log("➡️ Using priceId:", priceId);

    // Get user data to include affiliate information
    let affiliateId = null;
    if (userId) {
      try {
        const user = await db.getUserById(userId);
        if (user && user.referrer_id) {
          affiliateId = user.referrer_id;
        }
      } catch (error) {
        console.error("Error fetching user for affiliate data:", error);
      }
    }

    // Prepare metadata
    const metadata = {
      userId: userId || 'anonymous',
      plan: plan
    };
    
    if (affiliateId) {
      metadata.affiliate_id = affiliateId;
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: plan === "pro" ? "subscription" : "payment",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.DOMAIN}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.DOMAIN}/cancel.html`,
      metadata: metadata,
    });

    console.log("✅ Checkout session created:", session.id, "with metadata:", metadata);
    res.json({ url: session.url });

  } catch (err) {
    console.error("❌ Error creating checkout session:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get session details
app.post('/api/session-details', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    res.json(session);
  } catch (err) {
    console.error('Error retrieving session details:', err);
    res.status(500).json({ error: 'Failed to retrieve session details' });
  }
});

// Serve homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve analyzer page
app.get('/analyzer', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'analyzer.html'));
});

// Serve generator page
app.get('/generator', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'generator.html'));
});

// Serve pricing page
app.get('/pricing', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pricing.html'));
});


// Process affiliate commission for one-time purchases
async function processAffiliateCommission(session) {
  try {
    // Extract user ID from session metadata or customer
    const userId = session.metadata?.userId || session.customer;
    const affiliateId = session.metadata?.affiliate_id;
    
    if (!userId) {
      console.log('No user ID found in session');
      return;
    }

    let referrerId = null;
    
    // First try to get referrer from user record
    const user = await db.getUserById(userId);
    if (user && user.referrer_id) {
      referrerId = user.referrer_id;
    } else if (affiliateId) {
      // Fallback to affiliate_id from metadata
      referrerId = affiliateId;
    }
    
    if (!referrerId) {
      console.log('No referral found for user:', userId);
      return;
    }

    // Calculate commission (40% of purchase amount)
    const purchaseAmount = session.amount_total / 100; // Convert from pence
    const commissionAmount = purchaseAmount * 0.4;
    
    // Create commission record
    await db.createCommission(
      referrerId,
      userId,
      purchaseAmount,
      commissionAmount,
      session.payment_intent
    );

    console.log(`✅ Commission recorded: £${commissionAmount} for user ${userId} (affiliate: ${referrerId})`);
  } catch (error) {
    console.error('❌ Failed to process affiliate commission:', error);
  }
}

// Process subscription commission (first 3 months only)
async function processSubscriptionCommission(invoice) {
  try {
    const userId = invoice.metadata?.userId || invoice.customer;
    const affiliateId = invoice.metadata?.affiliate_id;
    
    if (!userId) {
      console.log('No user ID found in invoice');
      return;
    }

    let referrerId = null;
    
    // First try to get referrer from user record
    const user = await db.getUserById(userId);
    if (user && user.referrer_id) {
      referrerId = user.referrer_id;
    } else if (affiliateId) {
      // Fallback to affiliate_id from metadata
      referrerId = affiliateId;
    }
    
    if (!referrerId) {
      console.log('No referral found for user:', userId);
      return;
    }

    // Check if this is within first 3 months of subscription
    const subscriptionStart = new Date(user.created_at);
    const invoiceDate = new Date(invoice.created * 1000);
    const monthsDiff = (invoiceDate.getFullYear() - subscriptionStart.getFullYear()) * 12 + 
                      (invoiceDate.getMonth() - subscriptionStart.getMonth());
    
    if (monthsDiff >= 3) {
      console.log('Subscription commission period expired for user:', userId);
      return;
    }

    // Calculate commission (40% of subscription amount)
    const purchaseAmount = invoice.amount_paid / 100; // Convert from pence
    const commissionAmount = purchaseAmount * 0.4;
    
    // Create commission record
    await db.createCommission(
      referrerId,
      userId,
      purchaseAmount,
      commissionAmount,
      invoice.payment_intent
    );

    console.log(`✅ Subscription commission recorded: £${commissionAmount} for user ${userId} (affiliate: ${referrerId})`);
  } catch (error) {
    console.error('❌ Failed to process subscription commission:', error);
  }
}

// ✅ Load the working upload route
const uploadRoute = require('./routes/upload');
app.use('/upload', uploadRoute);

// 🚫 REMOVE or COMMENT OUT the unused analyze route
// const analyzeRoute = require('./routes/analyze');
// app.use('/analyze', analyzeRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ Stripe webhook endpoint: http://localhost:${PORT}/stripe-webhook`);
  console.log(`✅ Affiliate system initialized`);
});
