const crypto = require('crypto');
const db = require('./db');
const { decryptFromDb } = require('./keyEncryption');

// Get keys from database
function getKeys(callback) {
  db.get(`SELECT key_value FROM keys WHERE key_type='private'`, (err, privateRow) => {
    if (err || !privateRow) {
      return callback(new Error('Private key not found'));
    }
    
    db.get(`SELECT key_value FROM keys WHERE key_type='public'`, (err, publicRow) => {
      if (err || !publicRow) {
        return callback(new Error('Public key not found'));
      }

      try {
        const privateKey = decryptFromDb(privateRow.key_value);
        const publicKey = decryptFromDb(publicRow.key_value);

        callback(null, { privateKey, publicKey });
      } catch (e) {
        callback(e);
      }
    });
  });
}

function sign(data, callback) {
  getKeys((err, keys) => {
    if (err) return callback(err);
    
    try {
      const signer = crypto.createSign('SHA256');
      signer.update(data);
      const signature = signer.sign(keys.privateKey, 'hex');
      callback(null, signature);
    } catch (error) {
      callback(error);
    }
  });
}

function verify(data, signature, callback) {
  getKeys((err, keys) => {
    if (err) return callback(err);
    
    try {
      const verifier = crypto.createVerify('SHA256');
      verifier.update(data);
      const isValid = verifier.verify(keys.publicKey, signature, 'hex');
      callback(null, isValid);
    } catch (error) {
      callback(error);
    }
  });
}

// Synchronous versions for simpler usage
function signSync(data) {
  throw new Error('signSync is disabled: use async sign() so we can use the DB-stored encrypted RSA keys.');
}

function verifySync(data, signature) {
  throw new Error('verifySync is disabled: use async verify() so we can use the DB-stored encrypted RSA keys.');
}

module.exports = { sign, verify, signSync, verifySync };
