const http = require('http');

console.log('Testing server connectivity...\n');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/register',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 5000
};

const req = http.request(options, (res) => {
    console.log(`✅ Server is responding! Status: ${res.statusCode}`);
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
        console.log('Response:', data);
    });
});

req.on('error', (err) => {
    console.log('❌ Server connection error:', err.message);
    console.log('\nPossible issues:');
    console.log('1. Server not running on port 3000');
    console.log('2. Firewall blocking connection');
    console.log('3. Server crashed or hung');
});

req.on('timeout', () => {
    console.log('❌ Request timed out');
    req.destroy();
});

req.write(JSON.stringify({
    username: 'quicktest',
    email: 'quick@test.com',
    password: 'Test@123',
    role: 'user'
}));

req.end();
