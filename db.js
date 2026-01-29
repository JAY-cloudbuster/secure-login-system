const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./users.db', () => {
  console.log('Connected to SQLite database');
});

// Initialize database tables
function initializeTables(callback) {
  /* USERS TABLE */
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      email TEXT UNIQUE,
      password_hash TEXT,
      role TEXT,
      otp TEXT,
      otp_expires INTEGER,
      failed_attempts INTEGER DEFAULT 0,
      is_locked INTEGER DEFAULT 0,
      is_verified INTEGER DEFAULT 0
    )
  `, (err) => {
    if (err) {
      console.error('Error creating users table:', err);
      return callback(err);
    }

    /* Add is_verified column to existing tables if it doesn't exist */
    db.run(`ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0`, (err) => {
      // Column might already exist, ignore error
    });

    /* RSA KEYS TABLE */
    db.run(`
      CREATE TABLE IF NOT EXISTS keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key_type TEXT,
        key_value TEXT
      )
    `, (err) => {
      if (err) {
        console.error('Error creating keys table:', err);
        return callback(err);
      }

      /* SESSIONS TABLE (for post-OTP authenticated access) */
      db.run(`
        CREATE TABLE IF NOT EXISTS sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          token TEXT UNIQUE,
          expires_at INTEGER,
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          FOREIGN KEY(user_id) REFERENCES users(id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating sessions table:', err);
          return callback(err);
        }

      /* ENCRYPTED DATA TABLE */
      db.run(`
        CREATE TABLE IF NOT EXISTS encrypted_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          data_type TEXT,
          encrypted_content TEXT,
          signature TEXT,
          created_at INTEGER DEFAULT (strftime('%s', 'now'))
        )
      `, (err) => {
        if (err) {
          console.error('Error creating encrypted_data table:', err);
          return callback(err);
        }
        console.log('Database tables initialized');
        callback(null);
      });
      });
    });
  });
}

module.exports = db;
module.exports.initializeTables = initializeTables;
