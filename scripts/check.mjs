import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const required = [
  'index.html', 'styles.css', 'manifest.webmanifest', 'sw.js',
  'src/main.js', 'src/store.js', 'src/views.js', 'src/map.js',
  'assets/logo.svg', 'assets/logo-light.svg', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png',
  'data/vendors.json'
];

for (const file of required) await access(resolve(file));
const html = await readFile(resolve('index.html'), 'utf8');
if (!html.includes('src/main.js')) throw new Error('Le module principal manque dans index.html');
console.log(`Vérification réussie : ${required.length} fichiers essentiels présents.`);
