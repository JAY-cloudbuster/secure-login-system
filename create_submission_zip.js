// Automatic Submission Zip Creator
// This script creates a clean, submission-ready zip file

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('='.repeat(70));
console.log('CREATING SUBMISSION ZIP');
console.log('='.repeat(70));

const projectRoot = __dirname;
const submissionDir = path.join(projectRoot, '..', 'secure-login-system-SUBMISSION');
const zipName = 'secure-login-system-SUBMISSION.zip';

// Files and folders to include
const filesToCopy = {
    // Frontend - all files
    'frontend': {
        type: 'folder',
        files: ['*.html', '*.css']
    },
    // Backend - only source files
    'backend': {
        type: 'folder',
        files: [
            'server.js', 'auth.js', 'db.js', 'cryptoUtil.js',
            'signature.js', 'keygen.js', 'keyEncryption.js',
            'mailer.js', 'qrUtil.js', 'config.js', 'authz.js',
            'package.json', 'config.local.json.example'
        ]
    },
    // Root documentation
    'root': {
        type: 'files',
        files: [
            'README.md', 'SECURITY_DOCUMENTATION.md',
            'ACCESS_CONTROL_POLICY.md', 'RUBRIC_COVERAGE_ANALYSIS.md',
            'IMPLEMENTATION_SUMMARY.md', 'package.json',
            'VIVA_PREPARATION.md', 'ALGORITHM_REFERENCE.md',
            'HOW_TO_VIEW_DATABASE.md'
        ]
    }
};

// Create submission directory
console.log('\n1. Creating submission directory...');
if (fs.existsSync(submissionDir)) {
    fs.rmSync(submissionDir, { recursive: true, force: true });
}
fs.mkdirSync(submissionDir, { recursive: true });
console.log('   ✅ Created:', submissionDir);

// Copy frontend folder
console.log('\n2. Copying frontend files...');
const frontendSrc = path.join(projectRoot, 'frontend');
const frontendDest = path.join(submissionDir, 'frontend');
fs.mkdirSync(frontendDest, { recursive: true });

const frontendFiles = fs.readdirSync(frontendSrc);
frontendFiles.forEach(file => {
    if (file.endsWith('.html') || file.endsWith('.css')) {
        fs.copyFileSync(
            path.join(frontendSrc, file),
            path.join(frontendDest, file)
        );
        console.log(`   ✅ ${file}`);
    }
});

// Copy backend files
console.log('\n3. Copying backend files...');
const backendSrc = path.join(projectRoot, 'backend');
const backendDest = path.join(submissionDir, 'backend');
fs.mkdirSync(backendDest, { recursive: true });

filesToCopy.backend.files.forEach(file => {
    const srcPath = path.join(backendSrc, file);
    if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, path.join(backendDest, file));
        console.log(`   ✅ ${file}`);
    }
});

// Copy root documentation
console.log('\n4. Copying documentation...');
filesToCopy.root.files.forEach(file => {
    const srcPath = path.join(projectRoot, file);
    if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, path.join(submissionDir, file));
        console.log(`   ✅ ${file}`);
    }
});

// Create zip file
console.log('\n5. Creating zip file...');
const zipPath = path.join(projectRoot, '..', zipName);

try {
    // Remove old zip if exists
    if (fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath);
    }

    // Create zip using PowerShell
    const command = `Compress-Archive -Path "${submissionDir}\\*" -DestinationPath "${zipPath}" -CompressionLevel Optimal -Force`;
    execSync(command, { shell: 'powershell.exe' });

    console.log('   ✅ Zip created:', zipPath);
} catch (err) {
    console.error('   ❌ Error creating zip:', err.message);
    console.log('\n   Manual zip creation:');
    console.log(`   1. Open: ${submissionDir}`);
    console.log('   2. Select all files and folders');
    console.log('   3. Right-click → Send to → Compressed (zipped) folder');
    process.exit(1);
}

// Verify zip contents
console.log('\n6. Verifying zip contents...');
const stats = fs.statSync(zipPath);
const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
console.log(`   📦 Zip size: ${sizeMB} MB`);

// Count files
function countFiles(dir) {
    let count = 0;
    const items = fs.readdirSync(dir);
    items.forEach(item => {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
            count += countFiles(fullPath);
        } else {
            count++;
        }
    });
    return count;
}

const totalFiles = countFiles(submissionDir);
console.log(`   📄 Total files: ${totalFiles}`);

// List frontend files
const frontendCount = fs.readdirSync(frontendDest).length;
console.log(`   🎨 Frontend files: ${frontendCount}`);

// List backend files
const backendCount = fs.readdirSync(backendDest).length;
console.log(`   ⚙️  Backend files: ${backendCount}`);

console.log('\n' + '='.repeat(70));
console.log('✅ SUBMISSION ZIP CREATED SUCCESSFULLY!');
console.log('='.repeat(70));
console.log(`\nLocation: ${zipPath}`);
console.log(`Size: ${sizeMB} MB`);
console.log('\nNext steps:');
console.log('1. Extract the zip to verify all files are present');
console.log('2. Check that frontend folder has all 11 HTML/CSS files');
console.log('3. Upload to your submission platform');
console.log('\nSubmission folder (for manual verification):');
console.log(submissionDir);
console.log('='.repeat(70));
