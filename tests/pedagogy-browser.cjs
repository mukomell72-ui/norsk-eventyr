'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');const root=path.resolve(__dirname,'..');
const identity={user_id:'11111111-1111-4111-8111-111111111111',email:'pilot@example.test',status:'paid',access_granted:true,owner:false};
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://local');
 if(url.pathname.startsWith('/api/')){
  res.setHeader('Content-Type','application/json');
  if(url.pathname==='/api/session'){res.end(JSON.stringify(identity));return}
  res.end(JSON.stringify({ok:true,version:'8.3.0',items:[],public:[],status:'unavailable'}));return;
 }
 const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 try{const data=fs.readFileSync(file);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.webp')?'image/webp':'text/html');res.end(data)}catch{res.writeHead(404).end()}
});
(async()=>{
 let browser;
 try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 browser=await chromium.launch({executablePath:process.env.NE_CHROMIUM_PATH,headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const origin='http://127.0.0.1:'+server.address().port;
 const ready=async()=>page.waitForFunction(()=>window.NEAccess?.ready()&&window.NEPedagogyPilot);
 await page.goto(origin);await ready();
 await page.evaluate(()=>navigate('settings'));
 await page.getByRole('button',{name:'Открыть учебный пилот'}).click();
 await page.locator('dialog.ne-pilot').waitFor();
 assert(await page.locator('dialog.ne-pilot').evaluate(el=>el.scrollWidth<=innerWidth),'Pilot fits mobile viewport');
 const nativeBefore=await page.evaluate(()=>{const {pedagogyPilotA1,...native}=neLearnerState.learningV8||{};return JSON.stringify({native,xp:neLearnerState.xp,level:neLearnerState.level})});
 const draft='  Hei! Jeg heter Åse.\nJeg bor i ';
 await page.locator('#npAnswer').fill(draft);
 await page.locator('[data-np-tab="profile"]').click();await page.locator('[data-np-tab="lesson"]').click();
 assert.equal(await page.locator('#npAnswer').inputValue(),draft,'Tab switch retains exact draft');
 await page.locator('[data-np="close"]').click();
 await page.evaluate(()=>NEPedagogyPilot.open());assert.equal(await page.locator('#npAnswer').inputValue(),draft,'Close/reopen retains draft');
 await page.reload();await ready();await page.evaluate(()=>NEPedagogyPilot.open());
 assert.equal(await page.locator('#npAnswer').inputValue(),draft,'Reload retains account-scoped draft');
 // Local-storage failures must be visible and must not discard an unsaved answer.
 await page.evaluate(()=>{window.savedSaveState=window.saveState;window.saveState=()=>false});
 await page.locator('#npAnswer').fill('Черновик при переполнении хранилища');
 assert((await page.locator('[data-pilot-save]').innerText()).includes('Не удалось сохранить'));
 await page.locator('[data-np="close"]').click();
 assert.equal(await page.evaluate(()=>NEPedagogyPilot.isOpen()),true,'Keep unsaved answer open');
 await page.evaluate(()=>{window.saveState=savedSaveState});
 await page.locator('#npAnswer').fill(draft);
 // A delayed recognizer result must not replace the draft after leaving its task/tab.
 await page.evaluate(()=>{window.SpeechRecognition=class{start(){window.oldRecognition=this}abort(){}}});
 await page.locator('[data-np="mic"]').click();await page.locator('[data-np-tab="profile"]').click();
 await page.evaluate(()=>oldRecognition.onresult({results:[[{transcript:'stale voice'}]]}));
 await page.locator('[data-np-tab="lesson"]').click();assert.equal(await page.locator('#npAnswer').inputValue(),draft);
 // Access is decided by the active server grant, not status strings or ownership.
 await page.locator('[data-np="close"]').click();
 await page.evaluate(()=>{window.pilotIdentity=NEAccess.info();window.realInfo=NEAccess.info;window.realAllowed=NEAccess.allowed;NEAccess.info=()=>pilotIdentity;NEAccess.allowed=()=>pilotIdentity.access_granted===true&&!window.denyGrant});
 for(const status of ['paid','free','trial','approved']){
  assert(await page.evaluate(status=>{pilotIdentity.status=status;pilotIdentity.access_granted=true;return NEPedagogyPilot.open()},status),status);
  await page.locator('[data-np="close"]').click();
 }
 assert.equal(await page.evaluate(()=>{pilotIdentity.owner=true;pilotIdentity.access_granted=false;return NEPedagogyPilot.open()}),false,'Revoked owner denied');
 assert.equal(await page.evaluate(()=>{pilotIdentity.access_granted=true;window.denyGrant=true;return NEPedagogyPilot.open()}),false,'Native allowed=false overrides status');
 await page.evaluate(()=>{window.denyGrant=false;pilotIdentity.owner=false;NEPedagogyPilot.open()});
 const beforeRevocation=await page.evaluate(()=>JSON.stringify(neLearnerState.learningV8.pedagogyPilotA1));
 await page.evaluate(()=>{pilotIdentity.access_granted=false;document.querySelector('[data-np="check"]').click()});
 await page.waitForFunction(()=>!NEPedagogyPilot.isOpen());
 assert.equal(await page.evaluate(()=>JSON.stringify(neLearnerState.learningV8.pedagogyPilotA1)),beforeRevocation,'No grading after revoked access');
 await page.evaluate(()=>{pilotIdentity.access_granted=true;NEPedagogyPilot.open()});
 const checkpoint=await page.evaluate(()=>JSON.stringify(neLearnerState.learningV8.pedagogyPilotA1));
 await page.evaluate(()=>{pilotIdentity.user_id='22222222-2222-4222-8222-222222222222';document.querySelector('#npAnswer').value='other account';document.querySelector('[data-np="check"]').click()});
 await page.waitForFunction(()=>!NEPedagogyPilot.isOpen());
 assert.equal(await page.evaluate(()=>JSON.stringify(neLearnerState.learningV8.pedagogyPilotA1)),checkpoint,'No mutation after account switch');
 await page.evaluate(()=>{NEAccess.info=realInfo;NEAccess.allowed=realAllowed});
 await page.evaluate(()=>NEPedagogyPilot.open());
 await page.locator('.np-words summary').click();
 await page.locator('#npAnswer').fill('Hei! Jeg heter Åse.');
 await page.locator('[data-np="check"]').click();
 assert.equal(await page.evaluate(()=>neLearnerState.learningV8.pedagogyPilotA1.records.w1.independent),false,'Revealed glossary is assistance');
 await page.locator('[data-np="next"]').click();
 assert.equal(await page.locator('#npAnswer').inputValue(),'','Draft belongs to its own task');
 await page.locator('[data-np="close"]').click();
 // Re-render an audio checkpoint, preserving native course data.
 await page.evaluate(()=>{const s=neLearnerState.learningV8.pedagogyPilotA1;s.index=7;s.records={};saveState();NEPedagogyPilot.open()});
 await page.evaluate(()=>{speechSynthesis.speak=utterance=>{window.previousSpeech=utterance};speechSynthesis.cancel=()=>{}});
 await page.locator('[data-np="tts"]').click();
 await page.locator('[data-np="close"]').click();await page.evaluate(()=>NEPedagogyPilot.open());
 await page.evaluate(()=>previousSpeech.onend());
 assert.equal(await page.evaluate(()=>!!neLearnerState.learningV8.pedagogyPilotA1.records.v2?.heardAt),false,'Old speech completion cannot credit a reopened task');
 assert.equal(await page.locator('.np-choices button').first().getAttribute('data-i'),'1','Correct choice no longer always first');
 await page.locator('.np-choices button[data-i="0"]').click();
 assert((await page.locator('[data-pilot-message]').innerText()).includes('Сначала прослушай'));
 await page.locator('[data-np="reading-fallback"]').click();await page.locator('.np-choices button[data-i="0"]').click();
 assert.equal(await page.evaluate(()=>neLearnerState.learningV8.pedagogyPilotA1.records.v2.independent),false,'Text fallback is not independent listening');
 await page.locator('[data-np="next"]').click();
 await page.locator('[data-np="close"]').click();
 const nativeAfter=await page.evaluate(()=>{const {pedagogyPilotA1,...native}=neLearnerState.learningV8||{};return JSON.stringify({native,xp:neLearnerState.xp,level:neLearnerState.level})});
 assert.equal(nativeAfter,nativeBefore,'Pilot does not alter native course progress, XP or level');
 assert.deepEqual(errors,[]);
 console.log('PASS A1 v3 browser: real loader/profile, paid/free/native grants, revocation/account switch, exact drafts across tabs/close/reload, stale microphone, choices, reading fallback, native progress isolation');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error(e);process.exitCode=1});
