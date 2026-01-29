const http = require('http');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configuration
const PORT = 3004;
process.env.PORT = PORT; // run on different port
process.env.DB_PATH = './users.db'; // ensure we use the same db

// Start the server
const app = require('./server'); // This might start the server automatically if it's not exported properly, checking server.js... 
// server.js does app.listen()... we need to control it or just run it as a child process.
// Actually server.js runs app.listen at the end inside db.initializeTables.
// Let's just spawn it as a child process to be safe and clean.

const { spawn } = require('child_process');

function request(method, path, body) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: PORT,
            path: '/api' + path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    console.log('Response not JSON:', data);
                    resolve(data);
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function run() {
    console.log('Starting server for reproduction...');

    // Start server process
    const serverProcess = spawn('node', ['server.js'], {
        cwd: __dirname,
        env: { ...process.env, PORT: PORT },
        stdio: 'inherit' // pipe output so we see it
    });

    // Wait for server to be ready (naive wait)
    await new Promise(r => setTimeout(r, 3000));

    try {
        const username = 'bugtest_' + Date.now();
        const password = 'CorrectPassword123';

        console.log(`\n1. Registering user: ${username}`);
        const regRes = await request('POST', '/register', {
            username,
            email: `${username}@example.com`,
            password,
            role: 'user'
        });
        console.log('Register response:', regRes);

        console.log('\n2. Manually verifying user in DB...');
        const db = new sqlite3.Database(path.join(__dirname, 'users.db'));
        await new Promise((resolve, reject) => {
            db.run(`UPDATE users SET is_verified = 1 WHERE username = ?`, [username], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        db.close();

        console.log('\n3. Attempting login with WRONG password...');
        const loginRes = await request('POST', '/login', {
            username,
            password: 'WRONG_PASSWORD_123'
        });
        console.log('Login response:', loginRes);

        if (loginRes.message === 'Login successful' || loginRes.sessionToken) {
            console.error('\n[FAIL] BUG REPRODUCED: Login succeeded with wrong password!');
        } else if (loginRes.message && loginRes.message.includes('Invalid credentials')) {
            console.log('\n[PASS] Login failed as expected for WRONG password.');
        } else {
            console.log('\n[UNKNOWN] Unexpected response for wrong password:', loginRes);
        }

        console.log('\n4. Attempting login with EMPTY password...');
        const emptyPassRes = await request('POST', '/login', {
            username,
            password: ''
        });
        console.log('Empty Password Login response:', emptyPassRes);
        if (emptyPassRes.message === 'Login successful' || emptyPassRes.sessionToken) {
            console.error('\n[FAIL] BUG REPRODUCED: Login succeeded with EMPTY password!');
        } else if (emptyPassRes.message && emptyPassRes.message.includes('Invalid credentials')) {
            console.log('\n[PASS] Login failed as expected for EMPTY password.');
        } else {
            console.log('\n[UNKNOWN] Unexpected response for empty password:', emptyPassRes);
        }

        console.log('\n5. Testing UNVERIFIED user with WRONG password...');
        const unverifiedUser = 'unverified_' + Date.now();
        await request('POST', '/register', {
            username: unverifiedUser,
            email: `${unverifiedUser}@example.com`,
            password: 'Password123!',
            role: 'user'
        });
        // Do NOT verify manually
        const unverifiedRes = await request('POST', '/login', {
            username: unverifiedUser,
            password: 'WRONG_PASSWORD'
        });
        console.log('Unverified Login response:', unverifiedRes);

        // Check if frontend would be fooled
        if (unverifiedRes.message && unverifiedRes.message.includes('OTP')) {
            console.error('\n[FAIL] FRONTEND BYPASS REPRODUCED: Response contains "OTP" before password check!');
            console.log('Frontend logic: if(d.message.includes("OTP")) -> Success');
        } else {
            console.log('\n[PASS] Unverified user response is safe.');
        }

    } catch (err) {
        console.error('Error during reproduction:', err);
    } finally {
        console.log('\nStopping server...');
        serverProcess.kill();
        process.exit(0);
    }
}

run();
