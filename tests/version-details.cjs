const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm'),
 path=require('node:path'),{MessageChannel}=require('node:worker_threads');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const currentCache=read('sw.js').match(/^const CACHE="([^"]+)";/m)[1];
const currentBuild=currentCache.replace(/^norsk-eventyr-v(\d+)-(\d+)-(\d+)/,'$1.$2.$3');
const elements=Object.fromEntries(['neBuildCurrent','neBuildCache','neBuildServer','neBuildCheck'].map(id=>[id,{textContent:''}]));
const handlers={},swHandlers={};let updateCalls=0,lastNotice=0;
const portCache=currentCache;
const controller={postMessage(message,ports){
 assert.equal(message.type,'NE_GET_VERSION');
 ports[0].postMessage({type:'NE_VERSION',cache:portCache});
}};
const registration={waiting:null,installing:null,addEventListener(){},async update(){updateCalls++}};
const serviceWorker={
 controller,addEventListener:(type,cb)=>{swHandlers[type]=cb},
 async register(){return registration},
 async getRegistration(){return registration}
};
const document={
 scripts:[{src:'http://localhost/access.js?v='+currentBuild}],
 getElementById:id=>elements[id]||null,
 querySelectorAll:()=>[],
 addEventListener:(type,cb)=>{handlers[type]=cb},
 body:{append(){lastNotice++}},
};
const window={addEventListener(){}};const ctx={
 window,document,navigator:{onLine:true,serviceWorker},MessageChannel,
 location:{href:'http://localhost/',reload(){throw Error('Unrequested reload')}},
 fetch:async url=>({ok:true,async text(){return 'const CACHE="'+currentCache+'";'}}),
 URL,Date,Error,JSON,String,Array,Object,RegExp,Promise,
 setTimeout,clearTimeout,setInterval:()=>42,localStorage:{setItem(){throw Error('User data must not change')}},
 getComputedStyle:()=>({display:'block',visibility:'visible'})
};
vm.runInNewContext(read('updates.js'),ctx,{filename:'updates.js'});
(async()=>{
 assert(window.NEUpdates,'Version detector must expose a callable UI API');
 assert.equal(window.NEUpdates.runningBuild(),currentBuild);
 assert.equal(window.NEUpdates.buildFromCache(currentCache),currentBuild);
 await window.NEUpdates.refreshInfo();
 assert(elements.neBuildCache.textContent.includes(currentBuild),'PWA version must be reported from ACTIVE worker');
 await window.NEUpdates.checkNow();
 assert(elements.neBuildCheck.textContent.includes('Версии страницы, кеша и сервера совпадают'),
   'True three-way match must be confirmed');
 assert(elements.neBuildServer.textContent.includes(currentBuild));
 assert(updateCalls>0,'Check button must request SW update');
 assert.equal(lastNotice,0,'No false update banner for an up-to-date app');
 assert(read('ui-v8.js').includes('id="neVersionCard"'),'Version card must appear on profile');
 assert(read('ui-v8.js').includes('NEUpdates.checkNow()'),'Version check button must be functional');
 assert(read('ui-v7.js').includes('daysLabelV7(state.streak)'),'Streak must inflect days correctly');
 const html=read('index.html'),sw=read('sw.js'),access=read('access.js');
 assert(html.includes('/access.js?v='+currentBuild),'Bootstrap URL must match published build');
 for(const [filename,revision] of [
  ['ui-v7.js','8.3.0-lesson24-translate4'],
  ['ui-v8.js','8.3.0-translate4'],
  ['updates.js','8.3.0-translate4']
 ])assert(sw.includes('/'+filename+'?v='+revision),'Installed cache must refresh '+filename);
 assert(access.includes("'ui-v7.js','ui-v8.js','updates.js','card-form-practice.js','living-words.js'"));
 console.log('PASS version page/client/SW/server consistency, update button, old-device cache bust, correct Russian singular');
})().catch(error=>{console.error(error);process.exitCode=1});