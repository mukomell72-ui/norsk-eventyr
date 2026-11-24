// Builds a Vercel Build Output API v3 bundle with static files only.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const gitBuild = process.argv[2] === '--git-build';
const output = gitBuild ? path.join(root, 'preview-dist')
  : path.join(path.resolve(process.argv[2] || root), '.vercel', 'output');
fs.mkdirSync(output, {recursive: true});
assert.equal(fs.readdirSync(output).length, 0, 'Preview output must be empty');

const staticDir = gitBuild ? output : path.join(output, 'static');
fs.mkdirSync(staticDir, {recursive: true});
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
writeEdited('index.html', '<head>', '<head>\n  <script src="/preview-demo.js?v=2"></script>');
writeEdited('index.html', '  <script src="/study-activity.js?v=8.3.0-lesson24" defer></script>\n', '');
writeEdited('sw.js', 'const ASSETS=[', 'const ASSETS=["/preview-demo.js?v=2",');
writeEdited('sw.js', '-eventyr91";', '-eventyr91-isolated2";');
if (!gitBuild) {
  const {routes} = require(path.join(root, 'vercel.json'));
  fs.writeFileSync(path.join(output, 'config.json'), JSON.stringify({version: 3, routes}, null, 2) + '\n');
}
console.log(output);
