const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Starting cPanel Build Process...\n');

try {
    console.log('\n🔨 1/2: Building frontend and backend...');
    execSync('npm run build', { stdio: 'inherit' });

    console.log('\n🗜️ 2/2: Packaging deployable-cpanel.zip...');
    
    // Ensure old zip is removed
    if (fs.existsSync('owodefood-cpanel-deploy.zip')) {
        fs.unlinkSync('owodefood-cpanel-deploy.zip');
    }

    // Ensure drizzle folder exists (if there are no schema changes, it might not generate anything new, but it should exist)
    if (!fs.existsSync('drizzle')) {
        fs.mkdirSync('drizzle');
    }

    // Generate .env.example for cPanel
    const envExample = `NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://user:password@127.0.0.1:5432/dbname
JWT_SECRET=your_super_secret_jwt_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=your_email@gmail.com
`;
    fs.writeFileSync('.env.example', envExample);

    // Using tar (built into Windows 10+ and Linux) to create the zip
    const filesToZip = 'dist drizzle server.js package.json .env.example';
    execSync(`tar -a -c -f owodefood-cpanel-deploy.zip ${filesToZip}`, { stdio: 'inherit' });

    console.log('\n✅ DONE! Upload owodefood-cpanel-deploy.zip to your cPanel File Manager and extract it.');
    console.log('⚠️ IMPORTANT: Do not forget to copy .env.example to .env and configure your PostgreSQL connection string (which should be on 127.0.0.1 if hosted on the same cPanel).');
} catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
}
