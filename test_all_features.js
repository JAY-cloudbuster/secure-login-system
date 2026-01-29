const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const results = [];

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
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', (err) => reject(err));
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function testFrontendFiles() {
    console.log('\n=== TESTING FRONTEND FILES ===\n');
    const frontendDir = path.join(__dirname, '..', 'frontend');
    const requiredFiles = [
        'index.html',
        'register.html',
        'login.html',
        'otp.html',
        'verify-registration.html',
        'dashboard.html',
        'admin.html',
        'secure.html',
        'user-data.html',
        'system-config.html',
        'style.css'
    ];

    for (const file of requiredFiles) {
        const filePath = path.join(frontendDir, file);
        if (fs.existsSync(filePath)) {
            console.log(`✅ ${file} exists`);
            results.push({ test: `Frontend: ${file}`, status: 'PASS' });
        } else {
            console.log(`❌ ${file} missing`);
            results.push({ test: `Frontend: ${file}`, status: 'FAIL' });
        }
    }
}

async function testRegistration() {
    console.log('\n=== TESTING REGISTRATION ===\n');
    const username = 'testuser_' + Date.now();
    const email = `${username}@example.com`;

    try {
        const res = await request('POST', '/register', {
            username,
            email,
            password: 'Test@123',
            role: 'user'
        });

        if (res.data.message && res.data.message.includes('Registration successful')) {
            console.log('✅ Registration endpoint works');
            results.push({ test: 'Registration API', status: 'PASS', username });
            return username;
        } else {
            console.log('❌ Registration failed:', res.data.message);
            results.push({ test: 'Registration API', status: 'FAIL', error: res.data.message });
            return null;
        }
    } catch (err) {
        console.log('❌ Registration error:', err.message);
        results.push({ test: 'Registration API', status: 'ERROR', error: err.message });
        return null;
    }
}

async function testLogin(username) {
    console.log('\n=== TESTING LOGIN ===\n');

    if (!username) {
        console.log('⚠️  Skipping login test (no username from registration)');
        return;
    }

    try {
        const res = await request('POST', '/login', {
            username,
            password: 'Test@123'
        });

        if (res.data.message && res.data.message.includes('verify your email')) {
            console.log('✅ Login endpoint works (requires email verification as expected)');
            results.push({ test: 'Login API (unverified)', status: 'PASS' });
        } else if (res.data.message && res.data.message.includes('OTP')) {
            console.log('✅ Login endpoint works (OTP sent)');
            results.push({ test: 'Login API', status: 'PASS' });
        } else {
            console.log('⚠️  Login response:', res.data.message);
            results.push({ test: 'Login API', status: 'WARN', message: res.data.message });
        }
    } catch (err) {
        console.log('❌ Login error:', err.message);
        results.push({ test: 'Login API', status: 'ERROR', error: err.message });
    }
}

async function testAccessControl() {
    console.log('\n=== TESTING ACCESS CONTROL ENDPOINTS ===\n');

    const endpoints = [
        { path: '/secure-access', name: 'Secure Access (Admin only)' },
        { path: '/user-data', name: 'User Data (Admin/Moderator)' },
        { path: '/system-config', name: 'System Config (Admin only)' }
    ];

    for (const endpoint of endpoints) {
        try {
            const res = await request('POST', endpoint.path, {
                username: 'test',
                password: 'test'
            });

            if (res.data.message) {
                console.log(`✅ ${endpoint.name} endpoint responds`);
                results.push({ test: endpoint.name, status: 'PASS', response: res.data.message });
            } else {
                console.log(`⚠️  ${endpoint.name} unexpected response`);
                results.push({ test: endpoint.name, status: 'WARN' });
            }
        } catch (err) {
            console.log(`❌ ${endpoint.name} error:`, err.message);
            results.push({ test: endpoint.name, status: 'ERROR', error: err.message });
        }
    }
}

async function testUtilityEndpoints() {
    console.log('\n=== TESTING UTILITY ENDPOINTS ===\n');

    // Test decrypt endpoint
    try {
        const res = await request('POST', '/decrypt-data', {
            encryptedData: 'test'
        });
        console.log('✅ Decrypt endpoint responds');
        results.push({ test: 'Decrypt API', status: 'PASS' });
    } catch (err) {
        console.log('❌ Decrypt error:', err.message);
        results.push({ test: 'Decrypt API', status: 'ERROR', error: err.message });
    }

    // Test verify signature endpoint
    try {
        const res = await request('POST', '/verify-signature', {
            data: 'test',
            signature: 'test'
        });
        console.log('✅ Verify Signature endpoint responds');
        results.push({ test: 'Verify Signature API', status: 'PASS' });
    } catch (err) {
        console.log('❌ Verify Signature error:', err.message);
        results.push({ test: 'Verify Signature API', status: 'ERROR', error: err.message });
    }
}

async function runTests() {
    console.log('🧪 Starting Comprehensive System Tests...\n');
    console.log('Server should be running on http://localhost:3000\n');

    await testFrontendFiles();
    const username = await testRegistration();
    await testLogin(username);
    await testAccessControl();
    await testUtilityEndpoints();

    console.log('\n\n=== TEST SUMMARY ===\n');

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const errors = results.filter(r => r.status === 'ERROR').length;
    const warnings = results.filter(r => r.status === 'WARN').length;

    console.log(`Total Tests: ${results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`🔴 Errors: ${errors}`);

    console.log('\n=== DETAILED RESULTS ===\n');
    results.forEach(r => {
        const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : r.status === 'WARN' ? '⚠️' : '🔴';
        console.log(`${icon} ${r.test}: ${r.status}`);
        if (r.error) console.log(`   Error: ${r.error}`);
        if (r.message) console.log(`   Message: ${r.message}`);
        if (r.response) console.log(`   Response: ${r.response}`);
    });

    console.log('\n✅ Testing complete!\n');
}

runTests().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
