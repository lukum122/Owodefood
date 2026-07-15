// This file is used as the entry point for cPanel Node.js deployments
process.env.NODE_ENV = 'production'; // Force production mode so it never crashes

import('./dist/server.cjs').catch(err => {
    console.error("Failed to start server:", err);
    process.exit(1);
});
