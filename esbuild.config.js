import esbuild from 'esbuild';
import fs from 'fs';

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const dependencies = Object.keys(packageJson.dependencies);

// Keep everything external EXCEPT bcryptjs so it gets bundled directly into server.cjs
const externalDeps = dependencies.filter(dep => dep !== 'bcryptjs');

esbuild.build({
  entryPoints: ['server.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  external: externalDeps,
  sourcemap: true,
  outfile: 'dist/server.cjs',
  // Ensure module.exports IS the Express app directly (not nested under
  // `.default`). Different loaders (tsx, Vercel's Node runtime, plain Node)
  // handle CJS/ESM default-export interop inconsistently, so we make the
  // export shape unambiguous instead of relying on interop behavior.
  footer: {
    js: 'module.exports = module.exports.default || module.exports;',
  },
}).then(() => {
  console.log('Server bundled successfully with bcryptjs included!');
  process.exit(0);
}).catch(() => process.exit(1));
