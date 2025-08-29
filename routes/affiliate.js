const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../database');

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Authentication required' });
  }
}

// Affiliate onboarding - redirect to Stripe Connect
router.get('/onboard', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;

    // Create Stripe Connect account link
    const accountLink = await stripe.accountLinks.create({
      account: await createStripeAccount(userId),
      refresh_url: `${process.env.BASE_URL || 'http://localhost:3000'}/affiliate/onboard/refresh`,
      return_url: `${process.env.BASE_URL || 'http://localhost:3000'}/affiliate-dashboard.html`,
      type: 'account_onboarding',
    });

    res.redirect(accountLink.url);
  } catch (error) {
    console.error('Affiliate onboarding error:', error);
    res.status(500).json({ error: 'Failed to start onboarding' });
  }
});

// Create Stripe Connect account
async function createStripeAccount(userId) {
  try {
    const user = await db.getUserById(userId);
    
    if (user.stripe_account_id) {
      return user.stripe_account_id;
    }

    const account = await stripe.accounts.create({
      type: 'express',
      country: 'GB', // Default to UK
      email: user.email,
      capabilities: {
        transfers: { requested: true },
      },
    });

    await db.updateStripeAccountId(userId, account.id);
    return account.id;
  } catch (error) {
    console.error('Error creating Stripe account:', error);
    throw error;
  }
}

// Affiliate dashboard
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;

    const user = await db.getUserById(userId);
    const pendingCommissions = await db.getPendingCommissions(userId);
    const paidCommissions = await db.getPaidCommissions(userId);
    const totalPending = await db.getTotalPendingCommissions(userId);
    const referrals = await db.getReferrals(userId);

    // Calculate next payout date (end of current month)
    const now = new Date();
    const nextPayoutDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const dashboardData = {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        stripeAccountId: user.stripe_account_id,
        referralLink: `https://copyboss.com/?ref=${user.id}`
      },
      stats: {
        totalReferrals: referrals.length,
        pendingCommissions: totalPending,
        paidCommissions: paidCommissions.reduce((sum, c) => sum + parseFloat(c.commission_amount), 0),
        payoutThreshold: 50, // £50 minimum
        nextPayoutDate: nextPayoutDate.toISOString().split('T')[0]
      },
      commissions: {
        pending: pendingCommissions,
        paid: paidCommissions
      },
      referrals: referrals
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Affiliate dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// Get user's referral link
router.get('/referral-link/:userId', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const requestedUserId = req.params.userId;
    
    // Ensure user can only access their own referral link
    if (userId != requestedUserId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const referralLink = `https://copyboss.com/?ref=${userId}`;
    res.json({ referralLink });
  } catch (error) {
    console.error('Get referral link error:', error);
    res.status(500).json({ error: 'Failed to get referral link' });
  }
});

// Process referral signup
router.post('/process-referral', async (req, res) => {
  try {
    const { email, username, password, referrerId } = req.body;
    
    if (!email || !username || !password || !referrerId) {
      return res.status(400).json({ error: 'All fields required' });
    }

    // Validate referrer exists
    const referrer = await db.getUserById(referrerId);
    if (!referrer) {
      return res.status(400).json({ error: 'Invalid referrer' });
    }

    // Check if user already exists
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create user with referral
    const userId = await db.createUser(email, username, password, referrerId);
    
    res.json({ 
      success: true, 
      userId,
      message: 'User created with referral'
    });
  } catch (error) {
    console.error('Process referral error:', error);
    res.status(500).json({ error: 'Failed to process referral' });
  }
});

// Process commission for purchase
router.post('/process-commission', async (req, res) => {
  try {
    const { referrerId, referredUserId, purchaseAmount, paymentIntentId } = req.body;
    
    if (!referrerId || !referredUserId || !purchaseAmount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Calculate commission (40%)
    const commissionAmount = purchaseAmount * 0.4;
    
    // Create commission record
    const commissionId = await db.createCommission(
      referrerId,
      referredUserId,
      purchaseAmount,
      commissionAmount,
      paymentIntentId
    );

    res.json({ 
      success: true, 
      commissionId,
      commissionAmount
    });
  } catch (error) {
    console.error('Process commission error:', error);
    res.status(500).json({ error: 'Failed to process commission' });
  }
});

// Get user's commissions
router.get('/commissions/:userId', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const requestedUserId = req.params.userId;
    
    // Ensure user can only access their own commissions
    if (userId != requestedUserId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const pendingCommissions = await db.getPendingCommissions(userId);
    const paidCommissions = await db.getPaidCommissions(userId);
    
    res.json({
      pending: pendingCommissions,
      paid: paidCommissions
    });
  } catch (error) {
    console.error('Get commissions error:', error);
    res.status(500).json({ error: 'Failed to get commissions' });
  }
});

// Get user's referrals
router.get('/referrals/:userId', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const requestedUserId = req.params.userId;
    
    // Ensure user can only access their own referrals
    if (userId != requestedUserId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const referrals = await db.getReferrals(userId);
    res.json({ referrals });
  } catch (error) {
    console.error('Get referrals error:', error);
    res.status(500).json({ error: 'Failed to get referrals' });
  }
});

module.exports = router;
