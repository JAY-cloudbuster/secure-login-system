// Prints what's stored in the SQLite `keys` table so you can verify
// the RSA keys are encrypted-at-rest in `users.db`.
//
// Run:
//   cd backend
//   node print-keys.js

const db = require('./db');

db.all(`SELECT id, key_type, key_value FROM keys ORDER BY id`, (err, rows) => {
  if (err) {
    console.error('Error reading keys table:', err);
    process.exit(1);
  }

  if (!rows || rows.length === 0) {
    console.log('No keys found in DB.');
    process.exit(0);
  }

  for (const r of rows) {
    const preview = String(r.key_value).slice(0, 120).replace(/\s+/g, ' ');
    console.log(`id=${r.id} type=${r.key_type}`);
    console.log(`key_value (preview): ${preview}${String(r.key_value).length > 120 ? '…' : ''}`);
    console.log('---');
  }

  process.exit(0);
});

