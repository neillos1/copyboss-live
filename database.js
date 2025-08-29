const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

// Database file path
const dbPath = path.join(__dirname, 'affiliate.db');

// Create database connection
const db = new sqlite3.Database(dbPath);

// Initialize database tables
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    // Users table (extended for affiliate system)
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        username TEXT,
        password TEXT,
        avatar_url TEXT,
        referrer_id INTEGER,
        stripe_account_id TEXT,
        plan TEXT DEFAULT 'free',
        subscription_expires DATETIME,
        report_credits INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (referrer_id) REFERENCES users (id)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating users table:', err);
        reject(err);
        return;
      }
      
      // Add password column if it doesn't exist
      db.run(`
        ALTER TABLE users ADD COLUMN password TEXT
      `, (err) => {
        // Ignore error if column already exists
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding password column:', err);
        }
      });
      
      // Add avatar_url column if it doesn't exist
      db.run(`
        ALTER TABLE users ADD COLUMN avatar_url TEXT
      `, (err) => {
        // Ignore error if column already exists
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding avatar_url column:', err);
        }
      });
      
      // Add plan column if it doesn't exist
      db.run(`
        ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free'
      `, (err) => {
        // Ignore error if column already exists
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding plan column:', err);
        }
      });
      
      // Add subscription_expires column if it doesn't exist
      db.run(`
        ALTER TABLE users ADD COLUMN subscription_expires DATETIME
      `, (err) => {
        // Ignore error if column already exists
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding subscription_expires column:', err);
        }
      });
      
      // Add report_credits column if it doesn't exist
      db.run(`
        ALTER TABLE users ADD COLUMN report_credits INTEGER DEFAULT 0
      `, (err) => {
        // Ignore error if column already exists
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding report_credits column:', err);
        }
      });
      
      // Commissions table
      db.run(`
        CREATE TABLE IF NOT EXISTS commissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          referrer_id INTEGER NOT NULL,
          referred_user_id INTEGER NOT NULL,
          purchase_amount DECIMAL(10,2) NOT NULL,
          commission_amount DECIMAL(10,2) NOT NULL,
          status TEXT DEFAULT 'pending',
          stripe_payment_intent_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          paid_at DATETIME,
          FOREIGN KEY (referrer_id) REFERENCES users (id),
          FOREIGN KEY (referred_user_id) REFERENCES users (id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating commissions table:', err);
          reject(err);
          return;
        }
        
        // Affiliate payouts table
        db.run(`
          CREATE TABLE IF NOT EXISTS affiliate_payouts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            stripe_payout_id TEXT,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            paid_at DATETIME,
            FOREIGN KEY (user_id) REFERENCES users (id)
          )
        `, (err) => {
          if (err) {
            console.error('Error creating affiliate_payouts table:', err);
            reject(err);
            return;
          }
          
          // Analysis results table for leaderboard
          db.run(`
            CREATE TABLE IF NOT EXISTS analysis_results (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              score INTEGER NOT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users (id)
            )
          `, (err) => {
            if (err) {
              console.error('Error creating analysis_results table:', err);
              reject(err);
              return;
            }
            
            console.log('✅ Database initialized successfully');
            resolve();
          });
        });
      });
    });
  });
}

// Seed default test affiliate user
function seedDefaultUser() {
  return new Promise((resolve, reject) => {
    // Check if users table is empty
    db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (row.count === 0) {
        // Hash password for test user
        const hashedPassword = bcrypt.hashSync('testpass123', 10);
        
        // Insert default test affiliate user
        db.run(`
          INSERT INTO users (id, email, username, password, referrer_id, stripe_account_id, created_at) 
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [1, 'testaffiliate@example.com', 'testaffiliate', hashedPassword, null, 'acct_1SO08TBd2C87vY3k'], function(err) {
          if (err) {
            reject(err);
            return;
          }
          
          console.log('✅ Seeded default test affiliate user');
          resolve();
        });
      } else {
        console.log('ℹ️ Users table not empty, skipping seed');
        resolve();
      }
    });
  });
}

// User operations
function createUser(email, username, password, referrerId = null) {
  return new Promise(async (resolve, reject) => {
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      db.run(
        'INSERT INTO users (email, username, password, referrer_id) VALUES (?, ?, ?, ?)',
        [email, username, hashedPassword, referrerId],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    } catch (error) {
      reject(error);
    }
  });
}

function authenticateUser(email, password) {
  return new Promise(async (resolve, reject) => {
    try {
      const user = await getUserByEmail(email);
      if (!user) {
        resolve(null);
        return;
      }
      
      const isValid = await bcrypt.compare(password, user.password);
      if (isValid) {
        // Don't return password in response
        const { password: _, ...userWithoutPassword } = user;
        resolve(userWithoutPassword);
      } else {
        resolve(null);
      }
    } catch (error) {
      reject(error);
    }
  });
}

function getUserById(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

function getUserByEmail(email) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

function updateStripeAccountId(userId, accountId) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET stripe_account_id = ? WHERE id = ?',
      [accountId, userId],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      }
    );
  });
}

function updateAvatarUrl(userId, avatarUrl) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET avatar_url = ? WHERE id = ?',
      [avatarUrl, userId],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      }
    );
  });
}

// Commission operations
function createCommission(referrerId, referredUserId, purchaseAmount, commissionAmount, paymentIntentId = null) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO commissions (referrer_id, referred_user_id, purchase_amount, commission_amount, stripe_payment_intent_id) VALUES (?, ?, ?, ?, ?)',
      [referrerId, referredUserId, purchaseAmount, commissionAmount, paymentIntentId],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      }
    );
  });
}

function getPendingCommissions(userId) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM commissions WHERE referrer_id = ? AND status = "pending" ORDER BY created_at DESC',
      [userId],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
}

function getPaidCommissions(userId) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM commissions WHERE referrer_id = ? AND status = "paid" ORDER BY paid_at DESC',
      [userId],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
}

function updateCommissionStatus(commissionId, status, payoutId = null) {
  return new Promise((resolve, reject) => {
    const paidAt = status === 'paid' ? new Date().toISOString() : null;
    db.run(
      'UPDATE commissions SET status = ?, paid_at = ? WHERE id = ?',
      [status, paidAt, commissionId],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      }
    );
  });
}

function getTotalPendingCommissions(userId) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT SUM(commission_amount) as total FROM commissions WHERE referrer_id = ? AND status = "pending"',
      [userId],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.total || 0);
        }
      }
    );
  });
}

// Referral operations
function getReferrals(userId) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM users WHERE referrer_id = ? ORDER BY created_at DESC',
      [userId],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
}

// Payout operations
function createPayout(userId, amount) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO affiliate_payouts (user_id, amount) VALUES (?, ?)',
      [userId, amount],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      }
    );
  });
}

function updatePayoutStatus(payoutId, status, stripePayoutId = null) {
  return new Promise((resolve, reject) => {
    const paidAt = status === 'paid' ? new Date().toISOString() : null;
    db.run(
      'UPDATE affiliate_payouts SET status = ?, stripe_payout_id = ?, paid_at = ? WHERE id = ?',
      [status, stripePayoutId, paidAt, payoutId],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      }
    );
  });
}

// Leaderboard operations
function saveAnalysisResult(userId, score) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO analysis_results (user_id, score) VALUES (?, ?)',
      [userId, score],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      }
    );
  });
}

function getLeaderboard(period = 'daily', limit = 10, includeUserRank = false, currentUserId = null) {
  return new Promise((resolve, reject) => {
    let dateFilter = '';
    let params = [];
    
    switch (period) {
      case 'daily':
        dateFilter = 'WHERE DATE(ar.created_at) = DATE("now")';
        break;
      case 'weekly':
        dateFilter = 'WHERE strftime("%Y-%W", ar.created_at) = strftime("%Y-%W", "now")';
        break;
      case 'alltime':
        dateFilter = '';
        break;
      default:
        dateFilter = 'WHERE DATE(ar.created_at) = DATE("now")';
    }
    
    // Get top scores with user info
    const topQuery = `
      SELECT 
        u.id as user_id,
        u.username,
        u.avatar_url,
        MAX(ar.score) as score,
        ROW_NUMBER() OVER (ORDER BY MAX(ar.score) DESC) as rank
      FROM analysis_results ar
      JOIN users u ON ar.user_id = u.id
      ${dateFilter}
      GROUP BY u.id, u.username, u.avatar_url
      ORDER BY MAX(ar.score) DESC
      LIMIT ?
    `;
    
    db.all(topQuery, [limit], (err, topRows) => {
      if (err) {
        reject(err);
        return;
      }
      
      let result = { top: topRows };
      
      // If user rank is requested and user is not in top results
      if (includeUserRank && currentUserId) {
        const userRankQuery = `
          SELECT 
            u.id as user_id,
            u.username,
            u.avatar_url,
            MAX(ar.score) as score,
            ROW_NUMBER() OVER (ORDER BY MAX(ar.score) DESC) as rank
          FROM analysis_results ar
          JOIN users u ON ar.user_id = u.id
          ${dateFilter}
          GROUP BY u.id, u.username, u.avatar_url
          HAVING u.id = ?
        `;
        
        db.get(userRankQuery, [currentUserId], (err, userRow) => {
          if (err) {
            reject(err);
            return;
          }
          
          result.userRank = userRow;
          resolve(result);
        });
      } else {
        resolve(result);
      }
    });
  });
}

// User plan and credit management functions
function updateUserPlan(userId, plan, expiryDate) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE users SET plan = ?, subscription_expires = ? WHERE id = ?`,
      [plan, expiryDate, userId],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      }
    );
  });
}

function addReportCredits(userId, credits) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE users SET report_credits = report_credits + ? WHERE id = ?`,
      [credits, userId],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      }
    );
  });
}

function useReportCredit(userId) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE users SET report_credits = report_credits - 1 WHERE id = ? AND report_credits > 0`,
      [userId],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      }
    );
  });
}

function getUserStatus(userId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT plan, subscription_expires, report_credits FROM users WHERE id = ?`,
      [userId],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      }
    );
  });
}

function isSubscriptionActive(userId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT plan, subscription_expires FROM users WHERE id = ?`,
      [userId],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          if (!row || row.plan !== 'pro') {
            resolve(false);
            return;
          }
          
          if (!row.subscription_expires) {
            resolve(false);
            return;
          }
          
          const now = new Date();
          const expiry = new Date(row.subscription_expires);
          resolve(expiry > now);
        }
      }
    );
  });
}

module.exports = {
  db,
  initializeDatabase,
  createUser,
  authenticateUser,
  getUserById,
  getUserByEmail,
  updateStripeAccountId,
  updateAvatarUrl,
  createCommission,
  getPendingCommissions,
  getPaidCommissions,
  updateCommissionStatus,
  getTotalPendingCommissions,
  getReferrals,
  createPayout,
  updatePayoutStatus,
  saveAnalysisResult,
  getLeaderboard,
  updateUserPlan,
  addReportCredits,
  useReportCredit,
  getUserStatus,
  isSubscriptionActive
};
