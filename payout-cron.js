const cron = require('node-cron');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('./database');

// Monthly payout job - runs on the last day of each month at 2 AM
const monthlyPayoutJob = cron.schedule('0 2 28-31 * *', async () => {
  console.log('🔄 Starting monthly affiliate payout process...');
  
  try {
    // Check if it's the last day of the month
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (tomorrow.getDate() !== 1) {
      console.log('⏭️ Not the last day of the month, skipping payout');
      return;
    }

    await processMonthlyPayouts();
  } catch (error) {
    console.error('❌ Monthly payout job failed:', error);
  }
}, {
  scheduled: false, // Don't start automatically
  timezone: "Europe/London"
});

async function processMonthlyPayouts() {
  try {
    console.log('📊 Processing monthly affiliate payouts...');

    // Get all users with pending commissions >= £50
    const eligibleUsers = await getEligibleUsers();
    
    if (eligibleUsers.length === 0) {
      console.log('ℹ️ No eligible users for payout');
      return;
    }

    console.log(`💰 Processing payouts for ${eligibleUsers.length} affiliates`);

    for (const user of eligibleUsers) {
      try {
        await processUserPayout(user);
      } catch (error) {
        console.error(`❌ Failed to process payout for user ${user.id}:`, error);
        // Continue with other users
      }
    }

    console.log('✅ Monthly payout process completed');
  } catch (error) {
    console.error('❌ Monthly payout process failed:', error);
    throw error;
  }
}

async function getEligibleUsers() {
  return new Promise((resolve, reject) => {
    db.db.all(`
      SELECT DISTINCT u.*, 
             COALESCE(SUM(c.commission_amount), 0) as total_pending
      FROM users u
      LEFT JOIN commissions c ON u.id = c.referrer_id AND c.status = 'pending'
      WHERE u.stripe_account_id IS NOT NULL
      GROUP BY u.id
      HAVING total_pending >= 50
      ORDER BY total_pending DESC
    `, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

async function processUserPayout(user) {
  try {
    console.log(`💳 Processing payout for user ${user.id} (${user.email})`);

    // Get total pending commissions
    const totalPending = await db.getTotalPendingCommissions(user.id);
    
    if (totalPending < 50) {
      console.log(`⏭️ User ${user.id} below threshold (£${totalPending})`);
      return;
    }

    // Convert to pence (Stripe uses smallest currency unit)
    const payoutAmount = Math.round(totalPending * 100);

    // Create Stripe payout
    const payout = await stripe.transfers.create({
      amount: payoutAmount,
      currency: 'gbp',
      destination: user.stripe_account_id,
      description: `CopyBoss Affiliate Payout - ${new Date().toLocaleDateString()}`,
      metadata: {
        user_id: user.id.toString(),
        affiliate_payout: 'true'
      }
    });

    // Create payout record
    const payoutId = await db.createPayout(user.id, totalPending);
    
    // Update payout status
    await db.updatePayoutStatus(payoutId, 'paid', payout.id);

    // Update all pending commissions to paid
    await updateCommissionsToPaid(user.id);

    console.log(`✅ Payout processed for user ${user.id}: £${totalPending} (${payout.id})`);

  } catch (error) {
    console.error(`❌ Payout failed for user ${user.id}:`, error);
    
    // Create failed payout record
    const totalPending = await db.getTotalPendingCommissions(user.id);
    const payoutId = await db.createPayout(user.id, totalPending);
    await db.updatePayoutStatus(payoutId, 'failed');
    
    throw error;
  }
}

async function updateCommissionsToPaid(userId) {
  return new Promise((resolve, reject) => {
    db.db.run(`
      UPDATE commissions 
      SET status = 'paid', paid_at = CURRENT_TIMESTAMP 
      WHERE referrer_id = ? AND status = 'pending'
    `, [userId], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this.changes);
      }
    });
  });
}

// Manual payout trigger (for testing)
async function triggerManualPayout() {
  console.log('🔧 Triggering manual payout process...');
  await processMonthlyPayouts();
}

// Start the cron job
function startPayoutCron() {
  monthlyPayoutJob.start();
  console.log('✅ Monthly payout cron job started');
}

// Stop the cron job
function stopPayoutCron() {
  monthlyPayoutJob.stop();
  console.log('⏹️ Monthly payout cron job stopped');
}

module.exports = {
  startPayoutCron,
  stopPayoutCron,
  triggerManualPayout,
  processMonthlyPayouts
};
