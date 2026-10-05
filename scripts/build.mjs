import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const dist = resolve(root, 'dist');
const items = [
  'index.html',
  'styles.css',
  'manifest.webmanifest',
  'sw.js',
  'src',
  'assets',
  'data'
];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const item of items) {
  await cp(resolve(root, item), resolve(dist, item), { recursive: true });
}
await cp(resolve(root, 'index.html'), resolve(dist, '404.html'));
await writeFile(
  resolve(dist, 'build.json'),
  JSON.stringify({ version: '0.2.0', builtAt: new Date().toISOString() }, null, 2)
);
console.log(`BliBli construit dans ${dist}`);
