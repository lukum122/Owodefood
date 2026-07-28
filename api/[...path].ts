const app = require('../dist/server.cjs');
const expressApp = app.default || app;

export default function handler(req: any, res: any) {
  // Vercel strips the /api prefix. Add it back so Express routes match correctly.
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + req.url;
  }
  
  return expressApp(req, res);
}
