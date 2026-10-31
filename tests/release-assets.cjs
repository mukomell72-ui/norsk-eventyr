'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
// Inspect the real loader expression rather than duplicating a growing list of suffixes.
module.exports=function releaseAssets(root=path.resolve(__dirname,'..')){
 const read=name=>fs.readFileSync(path.join(root,name),'utf8');
 const access=read('access.js'),sw=read('sw.js'),index=read('index.html');
 const version=access.match(/ASSET_REV='([^']+)'/)[1];
 const lessonPatch=access.match(/LESSON_PATCH='([^']+)'/)[1];
 const scripts=Array.from(vm.runInNewContext(access.match(/scripts=(\[[^\]]+\])/)[1]));
 const expression=access.match(/s\.src=(.+?);s\.onload/)[1];
 const urls=scripts.map(name=>vm.runInNewContext(expression,{name,ASSET_REV:version,LESSON_PATCH:lessonPatch,encodeURIComponent},{timeout:1000}));
 const assets=Array.from(vm.runInNewContext(sw.match(/const ASSETS=(\[[^\n]+\]);/)[1]));
 const cache=sw.match(/^const CACHE="([^"]+)";/m)[1];
 return {read,access,sw,index,version,lessonPatch,scripts,urls,assets,cache};
};
