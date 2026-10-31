'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const {scripts,urls,assets,index,sw,cache,version}=require('./release-assets.cjs')(root);
assert(cache.startsWith('norsk-eventyr-v'+version.replaceAll('.','-')+'-'));
assert(cache.endsWith('-pilot3'));
assert.equal(new Set(assets).size,assets.length,'No duplicate precache URLs');
for(const url of [...urls,...Array.from(index.matchAll(/(?:href|src)="(\/[^"#]+\?v=[^"]+)"/g),m=>m[1])])
 assert(assets.includes(url),'Runtime URL missing from offline manifest: '+url);
for(const asset of assets){
 const url=new URL(asset,'http://local');assert.equal(url.origin,'http://local');assert(!url.pathname.startsWith('/api/'));
 assert(fs.existsSync(path.join(root,url.pathname==='/'?'index.html':url.pathname.slice(1))),asset);
}
assert(sw.includes('u.pathname.startsWith("/api/")'));
for(const [a,b] of [['guided-speaking.js','ne-pedagogy-lesson-a1.js'],['ne-pedagogy-lesson-a1.js','ne-pedagogy-engine.js'],['ne-pedagogy-engine.js','ne-pedagogy-pilot.js'],['ne-pedagogy-pilot.js','ui-v8.js']])
 assert(scripts.indexOf(a)<scripts.indexOf(b),a+' must load before '+b);
assert(fs.readFileSync(path.join(root,'ui-v8.js'),'utf8').includes('NEPedagogyPilot.open()'));
console.log('PASS A1 v3 integration: authorization-loader order, '+urls.length+' runtime URLs, '+assets.length+' local precache assets, API exclusion');
