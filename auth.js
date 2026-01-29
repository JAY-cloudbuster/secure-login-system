const express = require('express');
const bcrypt = require('bcrypt');
const db = require('./db');
const sendOTP = require('./mailer');
const { encrypt, decrypt } = require('./cryptoUtil');
const { sign, verify } = require('./signature');
const { generateOTPQR, generateQRBase64 } = require('./qrUtil');
const crypto = require('crypto');

const router = express.Router();
const MAX_ATTEMPTS = 3;

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/* REGISTER */
router.post('/register', async (req, res) => {
  const { username, email, password, role } = req.body;

  // Validate role
  const validRoles = ['user', 'admin', 'moderator'];
  if (!validRoles.includes(role)) {
    return res.json({ message: 'Invalid role. Must be: user, admin, or moderator' });
  }

  const hash = await bcrypt.hash(password, 10);

  // Check if user already exists
  db.get(`SELECT * FROM users WHERE username=? OR email=?`, [username, email], async (err, existingUser) => {
    if (existingUser) {
      return res.json({ message: 'User already exists' });
    }

    // Generate OTP for email verification
    const otp = generateOTP();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes for registration

    // Create user with is_verified=0 (unverified)
    db.run(
      `INSERT INTO users (username, email, password_hash, role, otp, otp_expires, is_verified)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [username, email, hash, role, otp, expires],
      function (insertErr) {
        if (insertErr) {
          return res.json({ message: 'Registration failed. Please try again.' });
        }

        // Send OTP to email
        sendOTP(email, otp, 'registration');
        res.json({ message: 'Registration successful. OTP sent to email for verification.' });
      }
    );
  });
});

/* LOGIN */
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.get(`SELECT * FROM users WHERE username=?`, [username], async (err, user) => {
    if (!user) return res.json({ message: 'Invalid credentials' });

    // If account is already locked, block immediately
    if (user.is_locked) {
      return res.json({ message: 'Account locked due to too many failed attempts' });
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      // Make sure null/undefined is treated as 0 for existing rows
      const currentAttempts = user.failed_attempts || 0;
      const attempts = currentAttempts + 1;
      const locked = attempts >= MAX_ATTEMPTS ? 1 : 0;
      db.run(
        `UPDATE users SET failed_attempts=?, is_locked=? WHERE id=?`,
        [attempts, locked, user.id]
      );

      if (locked) {
        return res.json({ message: 'Account locked due to too many failed attempts' });
      }

      return res.json({ message: `Invalid credentials. Attempts: ${attempts}/${MAX_ATTEMPTS}` });
    }

    if (!user.is_verified) return res.json({ message: 'Please verify your email first. Check your inbox for verification OTP.' });

    const otp = generateOTP();
    const expires = Date.now() + 2 * 60 * 1000;

    db.run(
      `UPDATE users SET otp=?, otp_expires=?, failed_attempts=0 WHERE id=?`,
      [otp, expires, user.id]
    );

    sendOTP(user.email, otp);
    res.json({ message: 'OTP sent to email' });
  });
});

/* OTP VERIFY (for login) */
router.post('/verify-otp', async (req, res) => {
  const { username, otp } = req.body;

  db.get(`SELECT * FROM users WHERE username=?`, [username], async (err, user) => {
    if (!user || otp !== user.otp)
      return res.json({ message: 'OTP invalid' });

    if (Date.now() > user.otp_expires)
      return res.json({ message: 'OTP expired' });

    // Generate QR code for OTP (encoding demonstration)
    try {
      const qrCode = await generateOTPQR(otp, username);

      // Sign the login data with digital signature
      const loginData = JSON.stringify({ username, timestamp: Date.now() });
      sign(loginData, (err, signature) => {
        if (err) {
          console.error('Signature error:', err);
        }

        // Create a session token for post-login access (expires in 30 minutes)
        const token = crypto.randomBytes(24).toString('hex');
        const expiresAt = Date.now() + 30 * 60 * 1000;

        db.run(
          `INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)`,
          [user.id, token, expiresAt],
          (sessErr) => {
            db.run(`UPDATE users SET otp=NULL, otp_expires=NULL WHERE id=?`, [user.id]);
            if (sessErr) {
              console.error('Session create error:', sessErr);
              return res.json({ message: 'Login successful', role: user.role });
            }

            res.json({
              message: 'Login successful',
              role: user.role,
              sessionToken: token,
              qrCode: qrCode,
              signature: signature || null
            });
          }
        );
      });
    } catch (error) {
      db.run(`UPDATE users SET otp=NULL, otp_expires=NULL WHERE id=?`, [user.id]);

      const token = crypto.randomBytes(24).toString('hex');
      const expiresAt = Date.now() + 30 * 60 * 1000;
      db.run(
        `INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)`,
        [user.id, token, expiresAt],
        () => {
          res.json({ message: 'Login successful', role: user.role, sessionToken: token });
        }
      );
    }
  });
});

/* SECURE MESSAGE (dashboard button) - ADMIN ONLY */
router.get('/secure-message', (req, res) => {
  const token = req.headers['x-session-token'];
  if (!token) return res.status(401).json({ message: 'Not authenticated' });

  db.get(
    `SELECT s.expires_at, u.role
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ?`,
    [token],
    (err, row) => {
      if (err || !row) return res.status(401).json({ message: 'Invalid session' });
      if (Date.now() > row.expires_at) return res.status(401).json({ message: 'Session expired' });

      if (row.role !== 'admin') {
        return res.status(403).json({ message: 'You are not allowed to see the secure data' });
      }

      return res.json({ message: 'the developer is jayesh' });
    }
  );
});

/* VERIFY REGISTRATION (email verification) */
router.post('/verify-registration', (req, res) => {
  const { username, otp } = req.body;

  db.get(`SELECT * FROM users WHERE username=?`, [username], (err, user) => {
    if (!user) return res.json({ message: 'User not found' });
    if (user.is_verified) return res.json({ message: 'Email already verified' });
    if (otp !== user.otp) return res.json({ message: 'OTP invalid' });

    if (Date.now() > user.otp_expires)
      return res.json({ message: 'OTP expired. Please register again.' });

    // Verify the account
    db.run(
      `UPDATE users SET is_verified=1, otp=NULL, otp_expires=NULL WHERE id=?`,
      [user.id],
      (updateErr) => {
        if (updateErr) return res.json({ message: 'Verification failed' });
        res.json({ message: 'Email verified successfully. You can now login.' });
      }
    );
  });
});

/* ACCESS CONTROL: OBJECT 1 - SECURE DATA ACCESS (ADMIN ONLY) */
router.post('/secure-access', async (req, res) => {
  const { username, password } = req.body;

  db.get(`SELECT * FROM users WHERE username=?`, [username], async (err, user) => {
    if (!user) return res.json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.json({ message: 'Invalid credentials' });

    // Access Control: Only admin can access secure data
    if (user.role !== 'admin')
      return res.json({ message: 'Access denied: Admin role required' });

    // Encrypt sensitive data before sending
    const sensitiveData = 'Highly Confidential Data: System Configuration';
    const encryptedData = encrypt(sensitiveData);

    res.json({
      message: 'Access granted',
      data: encryptedData,
      note: 'Data is encrypted using AES-256-CBC'
    });
  });
});

/* ACCESS CONTROL: OBJECT 2 - USER DATA (ADMIN + MODERATOR) */
router.post('/user-data', async (req, res) => {
  const { username, password } = req.body;

  db.get(`SELECT * FROM users WHERE username=?`, [username], async (err, user) => {
    if (!user) return res.json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.json({ message: 'Invalid credentials' });

    // Access Control: Admin and Moderator can access user data
    if (!['admin', 'moderator'].includes(user.role))
      return res.json({ message: 'Access denied: Admin or Moderator role required' });

    // Get all users (encrypted)
    db.all(`SELECT id, username, email, role, is_verified FROM users`, [], (err, users) => {
      if (err) return res.json({ message: 'Error fetching user data' });

      // Encrypt user data
      const userData = JSON.stringify(users);
      const encryptedData = encrypt(userData);

      // Sign the data
      sign(userData, (err, signature) => {
        if (err) {
          return res.json({ message: 'Error signing data' });
        }

        // Store encrypted data with signature
        db.run(
          `INSERT INTO encrypted_data (data_type, encrypted_content, signature) VALUES (?, ?, ?)`,
          ['user-data', encryptedData, signature],
          () => {
            res.json({
              message: 'Access granted: User data retrieved',
              encryptedData: encryptedData,
              signature: signature,
              note: 'Data encrypted with AES-256-CBC and signed with RSA-SHA256'
            });
          }
        );
      });
    });
  });
});

/* ACCESS CONTROL: OBJECT 3 - SYSTEM CONFIG (ADMIN ONLY) */
router.post('/system-config', async (req, res) => {
  const { username, password } = req.body;

  db.get(`SELECT * FROM users WHERE username=?`, [username], async (err, user) => {
    if (!user) return res.json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.json({ message: 'Invalid credentials' });

    // Access Control: Only admin can access system config
    if (user.role !== 'admin')
      return res.json({ message: 'Access denied: Admin role required' });

    const configData = {
      serverPort: 3000,
      maxLoginAttempts: 3,
      otpExpiry: 120000,
      encryptionAlgorithm: 'AES-256-CBC',
      signatureAlgorithm: 'RSA-SHA256'
    };

    // Encrypt and sign config data
    const configString = JSON.stringify(configData);
    const encryptedConfig = encrypt(configString);

    sign(configString, (err, signature) => {
      if (err) {
        return res.json({ message: 'Error signing data' });
      }

      // Store encrypted config with signature
      db.run(
        `INSERT INTO encrypted_data (data_type, encrypted_content, signature) VALUES (?, ?, ?)`,
        ['system-config', encryptedConfig, signature],
        () => {
          res.json({
            message: 'Access granted: System configuration',
            encryptedData: encryptedConfig,
            signature: signature,
            note: 'Configuration encrypted and digitally signed'
          });
        }
      );
    });
  });
});

/* VERIFY DIGITAL SIGNATURE */
router.post('/verify-signature', (req, res) => {
  const { data, signature } = req.body;

  if (!data || !signature) {
    return res.json({ message: 'Data and signature required' });
  }

  verify(data, signature, (err, isValid) => {
    if (err) {
      return res.json({ message: 'Verification error', error: err.message });
    }

    res.json({
      message: isValid ? 'Signature valid' : 'Signature invalid',
      isValid: isValid
    });
  });
});

/* GET QR CODE FOR OTP */
router.get('/qr-code/:username', async (req, res) => {
  const { username } = req.params;

  db.get(`SELECT otp FROM users WHERE username=?`, [username], async (err, user) => {
    if (!user || !user.otp) {
      return res.json({ message: 'No active OTP found' });
    }

    try {
      const qrCode = await generateOTPQR(user.otp, username);
      res.json({ qrCode: qrCode });
    } catch (error) {
      res.json({ message: 'Error generating QR code', error: error.message });
    }
  });
});

/* DECRYPT DATA (for demonstration) */
router.post('/decrypt-data', (req, res) => {
  const { encryptedData } = req.body;

  if (!encryptedData) {
    return res.json({ message: 'Encrypted data required' });
  }

  try {
    const decrypted = decrypt(encryptedData);
    res.json({
      message: 'Data decrypted successfully',
      decryptedData: decrypted
    });
  } catch (error) {
    res.json({ message: 'Decryption failed', error: error.message });
  }
});

module.exports = router;
