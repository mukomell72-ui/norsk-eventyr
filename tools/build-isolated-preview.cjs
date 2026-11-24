// Builds a Vercel Build Output API v3 bundle with static files only.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(path.resolve(process.argv[2] || root), '.vercel', 'output');
fs.mkdirSync(output, {recursive: true});
assert.equal(fs.readdirSync(output).length, 0, 'Preview output must be empty');

const staticDir = path.join(output, 'static');
fs.mkdirSync(staticDir);
for (const entry of fs.readdirSync(root, {withFileTypes: true})) {
  if (entry.isFile() && /\.(?:js|css|html|png|svg)$/.test(entry.name) ||
      entry.isDirectory() && ['assets', 'audio'].includes(entry.name) ||
      entry.name === 'manifest.json') {
    fs.cpSync(path.join(root, entry.name), path.join(staticDir, entry.name), {recursive: true});
  }
}

const writeEdited = (name, anchor, replacement) => {
  const file = path.join(staticDir, name);
  const source = fs.readFileSync(file, 'utf8');
  assert(source.includes(anchor), 'Missing preview build anchor in ' + name);
  fs.writeFileSync(file, source.replace(anchor, replacement));
};

fs.copyFileSync(path.join(__dirname, 'preview-demo.js'), path.join(staticDir, 'preview-demo.js'));
writeEdited('index.html', '<head>', '<head>\n  <script src="/preview-demo.js"></script>');
writeEdited('sw.js', 'const ASSETS=[', 'const ASSETS=["/preview-demo.js",');
writeEdited('sw.js', '-eventyr9";', '-eventyr9-isolated";');
const headers = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; worker-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
  'Cache-Control': 'no-cache'
};
fs.writeFileSync(path.join(output, 'config.json'), JSON.stringify({
  version: 3,
  routes: [{src: '/.*', headers, continue: true}, {handle: 'filesystem'}]
}, null, 2) + '\n');
console.log(output);
