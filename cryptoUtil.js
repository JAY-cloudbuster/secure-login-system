const crypto = require('crypto');

const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);

function encrypt(text) {
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let enc = cipher.update(text, 'utf8', 'hex');
  return enc + cipher.final('hex');
}

function decrypt(enc) {
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let dec = decipher.update(enc, 'hex', 'utf8');
  return dec + decipher.final('utf8');
}

module.exports = { encrypt, decrypt };
