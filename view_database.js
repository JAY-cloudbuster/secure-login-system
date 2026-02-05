// Database Viewer Script
// This script displays the contents of users.db in a readable format

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'users.db');
const db = new sqlite3.Database(dbPath);

console.log('='.repeat(70));
console.log('DATABASE VIEWER - users.db');
console.log('='.repeat(70));
console.log(`Location: ${dbPath}\n`);

// View all tables
db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
    if (err) {
        console.error('Error fetching tables:', err);
        return;
    }

    console.log('📊 TABLES IN DATABASE:');
    console.log('-'.repeat(70));
    tables.forEach(table => console.log(`  - ${table.name}`));
    console.log();

    // View users table
    console.log('👥 USERS TABLE:');
    console.log('-'.repeat(70));
    db.all(`SELECT id, username, email, role, is_verified, is_locked, failed_attempts 
            FROM users ORDER BY id`, [], (err, users) => {
        if (err) {
            console.error('Error:', err);
        } else if (users.length === 0) {
            console.log('  (No users yet)');
        } else {
            users.forEach(user => {
                console.log(`\n  ID: ${user.id}`);
                console.log(`  Username: ${user.username}`);
                console.log(`  Email: ${user.email}`);
                console.log(`  Role: ${user.role}`);
                console.log(`  Verified: ${user.is_verified ? '✅' : '✅'}`);
                console.log(`  Locked: ${user.is_locked ? '🔒' : '🔓'}`);
                console.log(`  Failed Attempts: ${user.failed_attempts || 0}`);
            });
        }
        console.log('\n' + '-'.repeat(70));

        // View sessions table
        console.log('\n🔑 SESSIONS TABLE:');
        console.log('-'.repeat(70));
        db.all(`SELECT s.id, s.user_id, u.username, 
                CASE WHEN s.expires_at > strftime('%s', 'now') * 1000 
                THEN 'Active' ELSE 'Expired' END as status
                FROM sessions s
                JOIN users u ON s.user_id = u.id
                ORDER BY s.id DESC LIMIT 10`, [], (err, sessions) => {
            if (err) {
                console.error('Error:', err);
            } else if (sessions.length === 0) {
                console.log('  (No sessions yet)');
            } else {
                sessions.forEach(session => {
                    console.log(`  Session ${session.id}: User ${session.username} - ${session.status}`);
                });
            }
            console.log('\n' + '-'.repeat(70));

            // View keys table
            console.log('\n🔐 RSA KEYS TABLE:');
            console.log('-'.repeat(70));
            db.all(`SELECT key_type FROM keys`, [], (err, keys) => {
                if (err) {
                    console.error('Error:', err);
                } else if (keys.length === 0) {
                    console.log('  (No keys yet)');
                } else {
                    keys.forEach(key => {
                        console.log(`  ✅ ${key.key_type} key (encrypted)`);
                    });
                }
                console.log('\n' + '-'.repeat(70));

                // View encrypted_data table
                console.log('\n📦 ENCRYPTED DATA TABLE:');
                console.log('-'.repeat(70));
                db.all(`SELECT id, data_type FROM encrypted_data ORDER BY id DESC LIMIT 10`, [], (err, data) => {
                    if (err) {
                        console.error('Error:', err);
                    } else if (data.length === 0) {
                        console.log('  (No encrypted data yet)');
                    } else {
                        data.forEach(item => {
                            console.log(`  Entry ${item.id}: ${item.data_type}`);
                        });
                    }
                    console.log('\n' + '='.repeat(70));
                    console.log('Database view complete!');
                    console.log('='.repeat(70));
                    db.close();
                });
            });
        });
    });
});
