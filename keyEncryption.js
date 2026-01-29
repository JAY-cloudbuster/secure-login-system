const crypto = require('crypto');

// Encrypt RSA keys before storing them in SQLite.
//
// IMPORTANT:
// - Set KEY_ENC_SECRET in your environment (PowerShell example below).
// - If you change KEY_ENC_SECRET, you will NOT be able to decrypt old keys.
//
// PowerShell:
//   $env:KEY_ENC_SECRET="your-strong-secret-here"
//   node server.js

function getSecret() {
  return process.env.KEY_ENC_SECRET;
}

function requireSecret() {
  const secret = getSecret();
  if (!secret || secret.trim().length < 16) {
    throw new Error(
      'KEY_ENC_SECRET is missing/too short. Set a strong KEY_ENC_SECRET (>=16 chars) before running the server.'
    );
  }
}

function deriveKey() {
  requireSecret();
  // Derive a stable 32-byte key from the secret.
  return crypto.scryptSync(getSecret(), 'secure-login-system:key-encryption', 32);
}

/**
 * Encrypt plaintext into a JSON string safe to store in SQLite.
 * AES-256-GCM provides confidentiality + integrity.
 */
function encryptForDb(plaintext) {
  const key = deriveKey();
  const iv = crypto.randomBytes(12); // recommended IV size for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return JSON.stringify({
    v: 1,
    alg: 'aes-256-gcm',
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ct: ciphertext.toString('base64')
  });
}

/**
 * Decrypt JSON produced by encryptForDb().
 * If the value is a legacy PEM string, returns it as-is.
 */
function decryptFromDb(value) {
  if (typeof value !== 'string') throw new Error('Encrypted value must be a string');

  // Backwards compatibility: old rows may store raw PEM.
  if (value.includes('-----BEGIN')) return value;

  const parsed = JSON.parse(value);
  if (!parsed || parsed.v !== 1 || parsed.alg !== 'aes-256-gcm') {
    throw new Error('Unsupported encrypted key format');
  }

  const key = deriveKey();
  const iv = Buffer.from(parsed.iv, 'base64');
  const tag = Buffer.from(parsed.tag, 'base64');
  const ct = Buffer.from(parsed.ct, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ct), decipher.final()]);
  return plaintext.toString('utf8');
}

module.exports = {
  encryptForDb,
  decryptFromDb
};

