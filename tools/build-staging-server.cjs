// Assemble a standalone Build Output API v3 tree locally.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

const routes = [
  'chat', 'cloud', 'daily', 'drill', 'evaluate', 'generate', 'health',
  'listening-questions', 'pronounce', 'session', 'speech', 'transcribe'
];
const writeJson = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');

function build(destination) {
  const output = path.join(destination, '.vercel', 'output');
  fs.mkdirSync(output, {recursive: true});
  assert.equal(fs.readdirSync(output).length, 0, 'Server output must be empty');
  const staticDir = path.join(output, 'static');
  fs.mkdirSync(staticDir);
  for (const entry of fs.readdirSync(root, {withFileTypes: true})) {
    if ((entry.isFile() && /\.(?:js|css|html|png|svg)$/.test(entry.name)) ||
        (entry.isDirectory() && ['assets', 'audio'].includes(entry.name)) ||
        entry.name === 'manifest.json') {
      fs.cpSync(path.join(root, entry.name), path.join(staticDir, entry.name), {recursive: true});
    }
  }
  const {routes: staticRoutes} = require('../vercel.json');
  const headers = {...staticRoutes[0].headers};
  // Remote streams or API calls from the browser are unnecessary.
  writeJson(path.join(output, 'config.json'), {
    version: 3,
    routes: [{src: '/.*', headers, continue: true}, {handle: 'filesystem'}]
  });
  const helpers = fs.readdirSync(path.join(root, 'api')).filter(name => /^_.*\.js$/.test(name));
  for (const route of routes) {
    const dir = path.join(output, 'functions', 'api', route + '.func');
    fs.mkdirSync(path.join(dir, 'api'), {recursive: true});
    for (const name of [...helpers, route + '.js']) {
      fs.copyFileSync(path.join(root, 'api', name), path.join(dir, 'api', name));
    }
    if (route === 'session') {
      fs.mkdirSync(path.join(dir, 'lib'));
      fs.copyFileSync(path.join(root, 'lib', 'access-handler.js'), path.join(dir, 'lib', 'access-handler.js'));
    }
    writeJson(path.join(dir, 'package.json'), {type: 'module'});
    fs.copyFileSync(path.join(root, 'staging', 'node-handler.mjs'), path.join(dir, 'node-handler.mjs'));
    fs.writeFileSync(path.join(dir, 'index.mjs'),
      `import handler from './api/${route}.js';\n` +
      "import {withHttpHelpers} from './node-handler.mjs';\n" +
      "export default withHttpHelpers(handler);\n");
    writeJson(path.join(dir, '.vc-config.json'), {
      runtime: 'nodejs22.x', handler: 'index.mjs', launcherType: 'Nodejs'
    });
  }
  return output;
}

if (require.main === module) {
  assert(process.argv[2], 'Supply a separate local staging directory');
  console.log(build(path.resolve(process.argv[2])));
}
module.exports = {build};
