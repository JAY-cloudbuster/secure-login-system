const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Loads optional local config from backend/config.local.json (not a dotfile,
 * so it's easy to create on Windows). Env vars still take precedence.
 */
function loadLocalConfig() {
  const p = path.join(__dirname, 'config.local.json');
  if (!fs.existsSync(p)) return {};

  try {
    const raw = fs.readFileSync(p, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    console.error('Failed to read backend/config.local.json:', e.message);
    return {};
  }
}

function applyConfigToEnv() {
  const cfg = loadLocalConfig();

  // Only fill missing env vars so users can still override with env.
  if (!process.env.KEY_ENC_SECRET && cfg.KEY_ENC_SECRET) {
    process.env.KEY_ENC_SECRET = String(cfg.KEY_ENC_SECRET);
  }
  if (!process.env.PORT && cfg.PORT) {
    process.env.PORT = String(cfg.PORT);
  }

  // If KEY_ENC_SECRET is still missing, generate and persist it so the app
  // can encrypt RSA keys at rest without manual env setup (Windows-friendly).
  if (!process.env.KEY_ENC_SECRET || String(process.env.KEY_ENC_SECRET).trim().length < 16) {
    const generated = crypto.randomBytes(32).toString('base64url'); // strong, URL-safe
    process.env.KEY_ENC_SECRET = generated;

    const targetPath = path.join(__dirname, 'config.local.json');
    try {
      // Only create if it doesn't exist; do not overwrite user config.
      if (!fs.existsSync(targetPath)) {
        fs.writeFileSync(
          targetPath,
          JSON.stringify({ KEY_ENC_SECRET: generated, PORT: process.env.PORT ? Number(process.env.PORT) : 3000 }, null, 2) +
            '\n',
          'utf8'
        );
        console.log('Created backend/config.local.json with a generated KEY_ENC_SECRET.');
      } else {
        console.warn(
          'KEY_ENC_SECRET was missing/too short, but backend/config.local.json exists. Please set KEY_ENC_SECRET in that file.'
        );
      }
    } catch (e) {
      console.warn(
        'KEY_ENC_SECRET was missing/too short and could not write backend/config.local.json. Using an in-memory secret for this run only.'
      );
      console.warn(`Reason: ${e.message}`);
    }
  }
}

module.exports = {
  loadLocalConfig,
  applyConfigToEnv
};

