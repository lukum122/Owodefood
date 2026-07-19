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
}).then(() => {
  console.log('Server bundled successfully with bcryptjs included!');
  process.exit(0);
}).catch(() => process.exit(1));
