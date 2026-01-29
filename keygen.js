const crypto = require('crypto');
const db = require('./db');
const { encryptForDb } = require('./keyEncryption');

/**
 * Generates and stores RSA keys (encrypted) if missing.
 * Calls `done(err)` when finished (or immediately if keys already exist).
 */
function generateKeys(done) {
  const cb = typeof done === 'function' ? done : () => {};

  db.get(`SELECT COUNT(*) AS count FROM keys`, (err, row) => {
    if (err) {
      console.error('Error checking keys table:', err);
      return cb(err);
    }

    if (row && row.count > 0) {
      console.log('RSA keys already exist in database');
      return cb(null);
    }

    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    let encryptedPublic;
    let encryptedPrivate;
    try {
      encryptedPublic = encryptForDb(publicKey);
      encryptedPrivate = encryptForDb(privateKey);
    } catch (e) {
      console.error('\n❌ RSA key encryption failed.');
      console.error(`   ${e.message}`);
      console.error('   Fix: set KEY_ENC_SECRET (>=16 chars) and restart the server.');
      console.error('   Example (PowerShell): $env:KEY_ENC_SECRET=\"replace-with-a-strong-secret\"');
      return cb(e);
    }

    // Insert both keys and only then call done().
    let pending = 2;
    let failed = false;
    const finish = (e) => {
      if (failed) return;
      if (e) {
        failed = true;
        return cb(e);
      }
      pending -= 1;
      if (pending === 0) cb(null);
    };

    db.run(`INSERT INTO keys (key_type, key_value) VALUES (?, ?)`, ['public', encryptedPublic], (e) => {
      if (e) {
        console.error('Error inserting public key:', e);
        return finish(e);
      }
      console.log('RSA public key generated and stored (encrypted)');
      finish(null);
    });

    db.run(`INSERT INTO keys (key_type, key_value) VALUES (?, ?)`, ['private', encryptedPrivate], (e) => {
      if (e) {
        console.error('Error inserting private key:', e);
        return finish(e);
      }
      console.log('RSA private key generated and stored (encrypted)');
      finish(null);
    });
  });
}

module.exports = generateKeys;
