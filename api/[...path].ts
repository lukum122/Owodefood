// Import the pre-bundled server (built by esbuild.config.js during `npm run build`).
// Vercel's function builder does not reliably trace/bundle the full server.ts
// import tree, so we require the already-bundled, self-contained CJS file instead.
import * as serverModule from '../dist/server.cjs';
const app: any = (serverModule as any).default ?? serverModule;

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
