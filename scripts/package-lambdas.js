const { execSync } = require('node:child_process');
const { mkdirSync, existsSync, unlinkSync } = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const outDir = path.join(root, 'dist-lambda', 'ff-coach-run');
const zipOut = path.join(root, 'lambda_zips', 'ff-coach-run.zip');

function sh(cmd, cwd = root) { execSync(cmd, { stdio: 'inherit', cwd }); }

// 1) Build with esbuild → dist-lambda/ff-coach-run/index.mjs
mkdirSync(outDir, { recursive: true });
sh([
  'npx esbuild src/lambda/runner.ts',
  '--bundle',
  '--platform=node',
  '--target=node20',
  '--format=esm',
  '--outfile=dist-lambda/ff-coach-run/index.mjs',
].join(' '));

// 2) Zip folder → lambda_zips/ff-coach-run.zip
mkdirSync(path.join(root, 'lambda_zips'), { recursive: true });
if (existsSync(zipOut)) unlinkSync(zipOut);
sh(`cd ${path.join(root, 'dist-lambda', 'ff-coach-run')} && zip -r -q "${zipOut}" .`);

console.log('\n✅ Built and zipped →', path.relative(root, zipOut));
console.log('   Handler: index.handler (Node.js 20, ESM)');
