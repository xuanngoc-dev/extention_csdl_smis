/**
 * Build extension: src/ -> build/
 */
import { watch as watchFs } from 'node:fs';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { build, context } from 'esbuild';

const watch = process.argv.includes('--watch');
const shared = {
  bundle: true,
  format: 'iife',
  target: ['chrome116'],
  charset: 'utf8',
  legalComments: 'none',
  logLevel: 'info',
};
const entries = [
  { entryPoints: ['src/background/index.js'], outfile: 'build/background.js' },
  { entryPoints: ['src/page/staff-watch.js'], outfile: 'build/content-scripts/page-hook.js' },
  {
    entryPoints: ['src/content/index.js'],
    outfile: 'build/content-scripts/csdl.js',
    define: {
      'process.env.NODE_ENV': '"production"',
      __VUE_OPTIONS_API__: 'false',
      __VUE_PROD_DEVTOOLS__: 'false',
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
    },
  },
];

async function copyStatic() {
  await mkdir('build/content-scripts', { recursive: true });
  await cp('src/content/styles.css', 'build/content-scripts/csdl.css');
  await cp('icon', 'build/icon', { recursive: true });
  const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
  await writeFile('build/manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
}

if (watch) {
  const contexts = await Promise.all(entries.map((entry) => context({ ...shared, ...entry })));
  await Promise.all(contexts.map((item) => item.watch()));
  await copyStatic();
  for (const file of ['src/content/styles.css', 'manifest.json']) {
    watchFs(file, () => {
      copyStatic().catch((error) => console.error(error));
    });
  }
  console.log('[build] watching...');
} else {
  await rm('build', { recursive: true, force: true });
  await Promise.all(entries.map((entry) => build({ ...shared, ...entry })));
  await copyStatic();
  console.log('[build] xong -> build/');
}
