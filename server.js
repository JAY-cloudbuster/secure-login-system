// Load environment variables from backend/.env if present
try {
  require('dotenv').config();
} catch (e) {
  // dotenv is optional; server will still run without it
}

// Load backend/config.local.json (optional) and apply to env
// This avoids relying on dotfiles on Windows.
try {
  const { applyConfigToEnv } = require('./config');
  applyConfigToEnv();
} catch (e) {
  // ignore
}

const express = require('express');
const cors = require('cors');
const authRoutes = require('./auth');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', authRoutes);

const PORT = process.env.PORT || 3000;

// Initialize database tables, then start server and generate keys
db.initializeTables((err) => {
  if (err) {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  }

  // Now that tables are ready, generate RSA keys
  const generateKeys = require('./keygen');
  generateKeys((keyErr) => {
    if (keyErr) {
      // Key generation failed (likely missing KEY_ENC_SECRET). Don't crash the DB init.
      // The server can still run, but signature features will fail until keys exist.
      console.error('Continuing without RSA keys. Fix the error above and restart to generate keys.');
    }

    // Start the server
    const server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

    // Handle port already in use error
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use!`);
        console.log('Please either:');
        console.log(`  1. Stop the existing server (Ctrl+C in the other terminal)`);
        console.log(`  2. Kill the process: netstat -ano | findstr :${PORT}`);
        console.log(`  3. Use a different port: PORT=3001 node server.js\n`);
        process.exit(1);
      } else {
        console.error('Server error:', err);
        process.exit(1);
      }
    });
  });
});
