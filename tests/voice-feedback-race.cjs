// Speech UI must report actual playback results and ignore superseded requests.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../visual-world.js'),'utf8');
const lesson={id:'voice-race',level:'A2'},progress={index:0,turns:[]};
const scene={scene:'På jobben',actor:'Mari',opening:'Kan du komme i morgen?',steps:[{task:'Si når du kan komme.'}]};
const nodes={neWorldVoiceStatus:{textContent:''},neWorldGuideTask:{textContent:'Forklar dette.',isConnected:true},neWorldGuideStatus:{textContent:'',isConnected:true},neWorldFreeStatus:{textContent:''}};
const document={getElementById:id=>nodes[id]||null,querySelector:()=>null,querySelectorAll:()=>[]};
const window={neLessonSession:{lesson,guidedSpeech:progress},NEGuidedSpeaking:{definition:()=>scene},neLearnerState:{learningV8:{}}};
vm.runInNewContext(source,{window,document},{filename:'visual-world.js'});
const V=window.NEVisualWorld;
const flush=async()=>{await Promise.resolve();await Promise.resolve()};
(async()=>{
 let pending=[];
 window.speakText=()=>new Promise((resolve,reject)=>pending.push({resolve,reject}));
 assert.equal(V.speakPartner(),true);
 assert.match(nodes.neWorldVoiceStatus.textContent,/готовит/);
 pending.shift().resolve({source:'unavailable'});await flush();
 assert.match(nodes.neWorldVoiceStatus.textContent,/недоступен/,'Failed audio must not be reported as speaking');
 V.speakPartner();pending.shift().resolve({source:'ai'});await flush();
 assert.match(nodes.neWorldVoiceStatus.textContent,/произносит/);
 // Older promise must not overwrite a later voice request's status.
 V.speakPartner();const old=pending.shift();V.speakTask();const current=pending.shift();
 old.resolve({source:'unavailable'});await flush();
 assert.match(nodes.neWorldVoiceStatus.textContent,/Нора готовит/);
 current.resolve({source:'device'});await flush();
 assert.match(nodes.neWorldVoiceStatus.textContent,/Нора объясняет/);
 // Repeated tutor instructions: stale completions are ignored.
 V.speakTask();const first=pending.shift();V.speakTask();const second=pending.shift();
 first.reject(new Error('cancelled'));await flush();
 assert.match(nodes.neWorldVoiceStatus.textContent,/Нора готовит/);
 second.resolve({source:'unavailable'});await flush();
 assert.match(nodes.neWorldVoiceStatus.textContent,/Звук недоступен/);
 // A changed lesson step must not receive an old voice status.
 V.speakTask();const stale=pending.shift();progress.index=1;
 stale.resolve({source:'unavailable'});await flush();
 assert.match(nodes.neWorldVoiceStatus.textContent,/Нора готовит/);
 progress.index=0;
 // Guide audio also respects the newest speech request and stale text.
 V.speakStage();const guideOld=pending.shift();
 V.speakStage();const guideNew=pending.shift();
 guideOld.resolve({source:'unavailable'});await flush();
 assert.match(nodes.neWorldGuideStatus.textContent,/готовит/);
 guideNew.resolve({source:'ai'});await flush();
 assert.match(nodes.neWorldGuideStatus.textContent,/произносит/);
 V.speakStage();const changed=pending.shift();nodes.neWorldGuideTask.textContent='Новая инструкция';
 changed.resolve({source:'unavailable'});await flush();
 assert.match(nodes.neWorldGuideStatus.textContent,/готовит/);
 // Speech failure must never touch lesson grading or saved progress.
 assert.equal(progress.index,0);assert.equal(progress.turns.length,0);
 console.log('PASS async voice statuses: success, failure, superseded requests, guide and lesson continuity');
})().catch(error=>{console.error(error);process.exitCode=1});
