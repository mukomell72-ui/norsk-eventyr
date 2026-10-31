'use strict';
const assert=require('node:assert/strict');
const {createEngine,checkRecall}=require('../ne-pedagogy-engine.js');
const lesson=require('../ne-pedagogy-lesson-a1.js');
const date=new Date(2026,9,28,12);
const store=new Map();
const storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
const engine=createEngine({lesson,storage,clock:()=>date});
let n=0;
const eq=(condition,label)=>{assert(condition,label);n++};
// Existing progress remains portable despite new optional fields.
eq(engine.taskCount===22,'legacy lesson stable');
eq(engine.getView().task.id==='w1','current task remains unchanged');
let result=engine.submit('Hei, jeg heter Anna.');
eq(result.accepted,'grade unassisted first reply');
engine.next();
result=engine.submit('Jeg bor i Kongsberg.');
eq(result.accepted,'grade residence');
engine.next();
// Advance exactly through content until first listening exercise.
const examples={m1:'Hei! Jeg heter Maria.',m2:'Jeg kommer fra Polen.',m3:'Jeg bor i Oslo.',m4:'Hva heter du?',v1:0};
while(engine.getView().task?.id!=='v2'){
 const task=engine.getView().task,value=examples[task?.id];eq(value!==undefined,'fixture for '+task?.id);
 const a=typeof value==='number'?engine.submit('',{choiceIndex:value}):engine.submit(value);
 eq(a.accepted,'accepted '+task?.id);engine.next();
}
const before=engine.getView().record.trials;
result=engine.submit('',{choiceIndex:0});
eq(!result.ok&&result.reason==='listen_first','cannot fake listening without audio');
eq(engine.getView().record.trials===before,'missing audio does not consume trial');
eq(!engine.markHeard || engine.markHeard(), 'playback completion creates evidence');
result=engine.submit('',{choiceIndex:0});
eq(result.accepted,'listen-then-answer works');
engine.next();const firstReport=engine.report();
eq(firstReport.sourceEvidence.listeningPlayback===1,'verified playback counted');
eq(firstReport.sourceEvidence.listeningTextFallback===0,'no false fallback');
// Test fallback on another scenario and verify independent listening credit is withheld.
while(engine.getView().task?.id!=='h2')engine.skip();
eq(engine.useReadingFallback(),'audio-unavailable fallback available');
result=engine.submit('',{choiceIndex:0});
eq(result.accepted,'fallback allows lesson continuity');
eq(!engine.getView().record.independent,'reading does not imply independent listening');
engine.next();
eq(engine.report().sourceEvidence.listeningTextFallback===1,'fallback counted separately');
eq(engine.report().skills.listening.readingFallback===1,'fallback not counted as listening mastery');
// Review requires typed recall; accurate answers, wrong words and give-up are different.
const reviewCurrent=engine.report().retention;
eq(reviewCurrent.tested===0,'no hidden retention credit');
date.setDate(29);
let due=engine.dueWords();
eq(due.some(w=>w.word==='hei'),'word due after day boundary');
const recalled=engine.testRecall('hei','Здравствуйте');
eq(recalled.ok&&recalled.correct,'accepted synonym for greeting');
eq(engine.report().retention.remembered===1,'verified recall recorded');
eq(engine.testRecall('hei','привет').reason==='not_due','same-day review spam prevented');
const bad=engine.testRecall('bor','ключ');
eq(bad.ok&&!bad.correct,'wrong translation not credited');
eq(engine.report().retention.tested===2,'wrong answer still a real attempt');
eq(engine.dueWords().every(w=>w.word!=='bor'),'wrong answer scheduled after pause');
const giveUpWord=engine.dueWords().find(w=>w.canTest);
const beforeGive=engine.report().retention.remembered;
const gave=engine.testRecall(giveUpWord.word,'',{giveUp:true});
eq(gave.ok&&!gave.correct,'give up acknowledged without credit');
eq(engine.report().retention.remembered===beforeGive,'revealed answer cannot count as independent recall');
// Persisted structure and future due dates survive reload.
const restored=createEngine({lesson,storage,clock:()=>date});
eq(restored.report().retention.tested===3,'retention history persisted');
eq(restored.report().sourceEvidence.listeningPlayback===1,'audio evidence persisted');
eq(restored.report().sourceEvidence.listeningTextFallback===1,'fallback provenance persisted');
eq(restored.getView().task.id===engine.getView().task.id,'native checkpoint restored');
eq(checkRecall('hei','привет'),'simple answer correct');
eq(!checkRecall('hei','не привет'),'negated answer rejected');
eq(checkRecall('nøkkelen','ключ'),'Norwegian special character works');
console.log('PASS '+n+' pedagogical evidence tests: audio provenance, typed recall, recall scheduling, checkpoint');
