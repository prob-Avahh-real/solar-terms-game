const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const www = path.join(root, 'www');

fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(www, { recursive: true });

const files = ['index.html', 'manifest.json', 'sw.js'];
for (const name of files) {
  const src = path.join(root, name);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(www, name));
}

for (const dir of ['css', 'js', 'icons']) {
  const src = path.join(root, dir);
  if (!fs.existsSync(src)) continue;
  fs.cpSync(src, path.join(www, dir), { recursive: true });
}

console.log('✅ Web assets ready → www/');
