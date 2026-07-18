const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Starting cPanel Build Process...\n');

try {
    console.log('\n🔨 1/2: Building frontend and backend...');
    execSync('npm run build', { stdio: 'inherit' });

    console.log('\n🗜️ 2/2: Packaging deployable-cpanel.zip...');
    
    // Ensure old zip is removed
    if (fs.existsSync('deployable-cpanel.zip')) {
        fs.unlinkSync('deployable-cpanel.zip');
    }

    // Ensure drizzle folder exists (if there are no schema changes, it might not generate anything new, but it should exist)
    if (!fs.existsSync('drizzle')) {
        fs.mkdirSync('drizzle');
    }

    // Using tar (built into Windows 10+ and Linux) to create the zip
    const filesToZip = 'dist drizzle server.js package.json';
    execSync(`tar -a -c -f deployable-cpanel.zip ${filesToZip}`, { stdio: 'inherit' });

    console.log('\n✅ DONE! Upload deployable-cpanel.zip to your cPanel File Manager and extract it.');
} catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
}
