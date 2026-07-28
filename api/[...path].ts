import app from '../server.ts';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: any, res: any) {
  // Vercel strips the /api prefix. Add it back so Express routes match correctly.
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + req.url;
  }
  
  return app(req, res);
}
