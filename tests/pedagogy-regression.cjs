'use strict';
const assert=require('node:assert/strict');
const {createEngine,assess}=require('../ne-pedagogy-engine.js');
const lesson=require('../ne-pedagogy-lesson-a1.js');
const tasks=Object.fromEntries(lesson.stages.flatMap(s=>s.tasks).map(t=>[t.id,t]));
for(const text of ['Hei! Jeg heter ikke Anna.','Hei! Jeg er fra Norge.','Hei! Jeg er en lærer.','Hei! Jeg er trøtt.'])
 assert.equal(assess(tasks.w1,text).accepted,false,text);
for(const text of ['Hei! Jeg heter Åse.','God morgen! Jeg heter Zoë.','Hei! Jeg er Jean-Luc.'])
 assert.equal(assess(tasks.w1,text).accepted,true,text);
assert(assess(tasks.w1,'Heisann! Mitt navn er Åse.').accepted);
assert(!assess(tasks.w1,'Hei! Mitt navn er ikke Anna.').accepted);
assert(assess(tasks.w2,'Jeg bor nå i Tromsø.').accepted);
assert(assess(tasks.w2,'Nå bor jeg på Svalbard.').accepted);
assert(assess(tasks.h1,'Nei, ellers takk.').accepted);
assert(assess(tasks.h4,'På bordet ligger nøkkelen.').accepted);
assert(assess(tasks.t2,'Vi snakkes!').accepted);
for(const text of ['Jeg bor ikke i Bergen.','Jeg bor i.','Jeg bor i og.'])
 assert.equal(assess(tasks.w2,text).accepted,false,text);
for(const text of ['Jeg bor i Ålesund.','Jeg bor på Svalbard.'])
 assert.equal(assess(tasks.w2,text).accepted,true,text);
assert(!assess(tasks.m2,'Jeg kommer ikke fra Polen.').accepted);
for(const id of ['g3','h3']){
 assert(!assess(tasks[id],'Hvor bor katten?').accepted);
 assert(!assess(tasks[id],'Hvor er mobilen?').accepted);
 assert(assess(tasks[id],'Hvor ligger nøkkelen min?').accepted);
}
for(const text of ['på bordet','Jeg er på bordet.','Nøkkelen er ikke på bordet.','Nøkkelen er under stolen.'])
 assert(!assess(tasks.h4,text).accepted,text);
assert(assess(tasks.h4,'Nøkkelen ligger på bordet.').accepted);
for(const index of [null,undefined,'0',NaN,-1,3])assert(!assess(tasks.v1,'',index).accepted);
assert(assess(tasks.v1,'',0).accepted);
const memory=new Map();const storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
let engine=createEngine({lesson,storage});
const draft='  Hei! Jeg heter Åse.\nJeg bor i ';engine.saveDraft(draft,{source:'voice'});
engine=createEngine({lesson,storage});
assert.equal(engine.getView().record.draft,draft);assert.equal(engine.getView().record.draftSource,'voice');
assert.equal(engine.getView().record.trials,0);assert.equal(engine.progress().done,0);
engine.saveDraft(draft,{source:'typed'});
assert.equal(createEngine({lesson,storage}).getView().record.draftSource,'typed');
engine.askHelp();engine.submit('Hei! Jeg heter Åse.');
assert.equal(engine.getView().record.independent,false);engine.next();
assert.equal(engine.getView().task.id,'w2');assert.equal(engine.getView().record.draft,undefined);
// Old checkpoints have no draft fields. They must resume without resets or lost grades.
const old=JSON.parse(engine.export());old.records.w2={trials:2,hints:1,accepted:false,skills:[],lastAnswer:'test'};
memory.set('ne_pedagogy_a1_exemplar_v1',JSON.stringify(old));engine=createEngine({lesson,storage});
assert.equal(engine.getView().task.id,'w2');assert.equal(engine.getView().record.trials,2);
assert.equal(engine.getView().record.hints,1);engine.saveDraft('Jeg bor i Oslo.');
assert.equal(JSON.parse(engine.export()).records.w1.accepted,true);
// An unpersisted answer must not silently advance the checkpoint.
let blocked=false;const failing={getItem:()=>null,setItem(){if(blocked)throw Error('quota')}};
engine=createEngine({lesson,storage:failing});engine.submit('Hei! Jeg heter Åse.');blocked=true;
assert.equal(engine.next(),false);assert.equal(engine.getView().task.id,'w1');
assert.equal(engine.saveDraft('test'),true); // accepted answer has no pending draft
engine=createEngine({lesson,storage:{getItem:()=>null,setItem(){throw Error('quota')}}});
assert.equal(engine.saveDraft('unsaved draft'),false);
assert.equal(engine.getView().record.draft,'unsaved draft','Keep unsaved input in memory');
// Once a listening transcript has been revealed, later playback cannot erase that evidence.
engine=createEngine({lesson,storage:{getItem:()=>null,setItem(){}}});
while(engine.getView().task.id!=='v2')engine.skip();
engine.useReadingFallback();engine.markHeard();engine.submit('',{choiceIndex:0});engine.next();
assert.equal(engine.report().sourceEvidence.listeningPlayback,0);
assert.equal(engine.report().sourceEvidence.listeningTextFallback,1);
console.log('PASS A1 v3: negative goals, Unicode names, key/location, strict choices, drafts, old checkpoints, failed-save navigation');
