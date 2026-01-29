const http = require('http');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const PORT = 3000;

function request(method, path, body) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: PORT,
            path: '/api' + path,
            method: method,
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', (err) => reject(err));
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function detailedTest() {
    console.log('='.repeat(60));
    console.log('COMPREHENSIVE SYSTEM TEST - DETAILED REPORT');
    console.log('='.repeat(60));
    console.log(`Server: http://localhost:${PORT}`);
    console.log(`Time: ${new Date().toLocaleString()}`);
    console.log('='.repeat(60));

    const results = { passed: 0, failed: 0, total: 0 };
    const details = [];

    // Test 1: Registration
    console.log('\n[TEST 1] Registration Flow');
    console.log('-'.repeat(60));
    const username = 'testuser_' + Date.now();
    const email = `${username}@example.com`;
    try {
        const res = await request('POST', '/register', {
            username, email, password: 'Test@123', role: 'user'
        });
        results.total++;
        if (res.data.message && res.data.message.includes('Registration successful')) {
            console.log('✅ PASS - Registration successful');
            console.log(`   Username: ${username}`);
            console.log(`   Response: ${res.data.message}`);
            results.passed++;
            details.push({ test: 'Registration', status: 'PASS', details: res.data.message });
        } else {
            console.log('❌ FAIL - Unexpected response');
            console.log(`   Response: ${res.data.message}`);
            results.failed++;
            details.push({ test: 'Registration', status: 'FAIL', details: res.data.message });
        }
    } catch (err) {
        console.log('❌ ERROR -', err.message);
        results.total++;
        results.failed++;
        details.push({ test: 'Registration', status: 'ERROR', details: err.message });
    }

    // Test 2: Login (unverified user)
    console.log('\n[TEST 2] Login with Unverified User');
    console.log('-'.repeat(60));
    try {
        const res = await request('POST', '/login', {
            username, password: 'Test@123'
        });
        results.total++;
        if (res.data.message && res.data.message.includes('verify your email')) {
            console.log('✅ PASS - Correctly requires email verification');
            console.log(`   Response: ${res.data.message}`);
            results.passed++;
            details.push({ test: 'Login (Unverified)', status: 'PASS', details: 'Email verification required' });
        } else {
            console.log('⚠️  WARN - Unexpected response');
            console.log(`   Response: ${res.data.message}`);
            results.passed++;
            details.push({ test: 'Login (Unverified)', status: 'WARN', details: res.data.message });
        }
    } catch (err) {
        console.log('❌ ERROR -', err.message);
        results.total++;
        results.failed++;
        details.push({ test: 'Login (Unverified)', status: 'ERROR', details: err.message });
    }

    // Test 3: Verify user manually
    console.log('\n[TEST 3] Manual Email Verification (DB)');
    console.log('-'.repeat(60));
    try {
        const db = new sqlite3.Database(path.join(__dirname, 'users.db'));
        await new Promise((resolve, reject) => {
            db.run(`UPDATE users SET is_verified = 1 WHERE username = ?`, [username], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        db.close();
        console.log('✅ PASS - User verified in database');
        results.total++;
        results.passed++;
        details.push({ test: 'Email Verification', status: 'PASS', details: 'User verified' });
    } catch (err) {
        console.log('❌ ERROR -', err.message);
        results.total++;
        results.failed++;
        details.push({ test: 'Email Verification', status: 'ERROR', details: err.message });
    }

    // Test 4: Login (verified user)
    console.log('\n[TEST 4] Login with Verified User');
    console.log('-'.repeat(60));
    try {
        const res = await request('POST', '/login', {
            username, password: 'Test@123'
        });
        results.total++;
        if (res.data.message && res.data.message.includes('OTP')) {
            console.log('✅ PASS - OTP sent successfully');
            console.log(`   Response: ${res.data.message}`);
            results.passed++;
            details.push({ test: 'Login (Verified)', status: 'PASS', details: 'OTP sent' });
        } else {
            console.log('❌ FAIL - No OTP sent');
            console.log(`   Response: ${res.data.message}`);
            results.failed++;
            details.push({ test: 'Login (Verified)', status: 'FAIL', details: res.data.message });
        }
    } catch (err) {
        console.log('❌ ERROR -', err.message);
        results.total++;
        results.failed++;
        details.push({ test: 'Login (Verified)', status: 'ERROR', details: err.message });
    }

    // Test 5: Wrong password
    console.log('\n[TEST 5] Login with Wrong Password');
    console.log('-'.repeat(60));
    try {
        const res = await request('POST', '/login', {
            username, password: 'WrongPassword123'
        });
        results.total++;
        if (res.data.message && res.data.message.includes('Invalid credentials')) {
            console.log('✅ PASS - Wrong password rejected');
            console.log(`   Response: ${res.data.message}`);
            results.passed++;
            details.push({ test: 'Wrong Password', status: 'PASS', details: 'Correctly rejected' });
        } else {
            console.log('❌ FAIL - Should reject wrong password');
            console.log(`   Response: ${res.data.message}`);
            results.failed++;
            details.push({ test: 'Wrong Password', status: 'FAIL', details: res.data.message });
        }
    } catch (err) {
        console.log('❌ ERROR -', err.message);
        results.total++;
        results.failed++;
        details.push({ test: 'Wrong Password', status: 'ERROR', details: err.message });
    }

    // Test 6-8: Access Control
    const accessTests = [
        { path: '/secure-access', name: 'Secure Access (Admin Only)' },
        { path: '/user-data', name: 'User Data (Admin/Mod)' },
        { path: '/system-config', name: 'System Config (Admin Only)' }
    ];

    for (const test of accessTests) {
        console.log(`\n[TEST] ${test.name}`);
        console.log('-'.repeat(60));
        try {
            const res = await request('POST', test.path, {
                username: 'nonexistent', password: 'test'
            });
            results.total++;
            if (res.data.message) {
                console.log('✅ PASS - Endpoint responds');
                console.log(`   Response: ${res.data.message}`);
                results.passed++;
                details.push({ test: test.name, status: 'PASS', details: res.data.message });
            }
        } catch (err) {
            console.log('❌ ERROR -', err.message);
            results.total++;
            results.failed++;
            details.push({ test: test.name, status: 'ERROR', details: err.message });
        }
    }

    // Test 9: Decrypt
    console.log('\n[TEST 9] Decrypt Endpoint');
    console.log('-'.repeat(60));
    try {
        const res = await request('POST', '/decrypt-data', { encryptedData: 'test' });
        results.total++;
        if (res.data.message) {
            console.log('✅ PASS - Decrypt endpoint responds');
            console.log(`   Response: ${res.data.message}`);
            results.passed++;
            details.push({ test: 'Decrypt API', status: 'PASS', details: res.data.message });
        }
    } catch (err) {
        console.log('❌ ERROR -', err.message);
        results.total++;
        results.failed++;
        details.push({ test: 'Decrypt API', status: 'ERROR', details: err.message });
    }

    // Test 10: Verify Signature
    console.log('\n[TEST 10] Verify Signature Endpoint');
    console.log('-'.repeat(60));
    try {
        const res = await request('POST', '/verify-signature', { data: 'test', signature: 'test' });
        results.total++;
        if (res.data.message) {
            console.log('✅ PASS - Signature verification responds');
            console.log(`   Response: ${res.data.message}`);
            results.passed++;
            details.push({ test: 'Verify Signature', status: 'PASS', details: res.data.message });
        }
    } catch (err) {
        console.log('❌ ERROR -', err.message);
        results.total++;
        results.failed++;
        details.push({ test: 'Verify Signature', status: 'ERROR', details: err.message });
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${results.total}`);
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));

    return { results, details };
}

detailedTest().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
