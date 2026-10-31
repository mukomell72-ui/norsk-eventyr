const assert=require('node:assert/strict');
const {createEngine,assess,localDay,addDays}=require('../ne-pedagogy-engine.js');
const lesson=require('../ne-pedagogy-lesson-a1.js');
const map=new Map(),store={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};
const d=new Date(2026,9,28,12);const e=createEngine({lesson,storage:store,clock:()=>d});
let n=0;const test=(value,msg)=>{assert(value,msg);n++};
test(lesson.plannedMinutes===60,'60 min curriculum');
test(lesson.stages.length===8,'8 pedagogical stages');
test(e.taskCount===22,'22 tasks');
test(e.getView().task.id==='w1','first task');
test(!e.next(),'cant advance without accepted answer');
test(e.submit('',{source:'typed'}).reason==='empty','reject empty');
let r=e.submit('Hei! Hvor bor du?');
test(r.ok&&!r.accepted,'semantically off-topic answer fails');
test(r.missing.includes('имя'),'explains missing name');
test(!e.progress().independent,'bad answer does not count as mastered');
let h=e.askHelp();test(h?.assisted,'help available');
test(h.text.includes('Hei'),'hint relevant');
r=e.submit('Hei, jeg heter Maria.');
test(r.accepted&&!r.firstTry,'corrected answer aided');
test(e.next(),'advance after success');
test(e.getView().task.id==='w2','next task');
r=e.submit('Jeg bor i Bergen.',{source:'voice'});
test(r.accepted&&r.firstTry,'independent speech recognized');
test(e.getView().record.lastSource==='voice_transcript','voice evidence provenance');
test(e.next(),'move after successful voice');
let r1=e.report();test(r1.independent===1&&r1.assisted===1,'separate assisted vs independent');
const resumed=createEngine({lesson,storage:store,clock:()=>d});
test(resumed.getView().task.id==='m1','checkpoint loads');
test(resumed.getView().avatar==='male','default male portrait');
test(resumed.setAvatar('female')&&resumed.getView().avatar==='female','female avatar saved');
test(!resumed.setAvatar('invalid'),'invalid avatar rejected');
test(resumed.setName('Petro')&&resumed.getView().name==='Petro','profile name saved');
test(createEngine({lesson,storage:store,clock:()=>d}).getView().name==='Petro','saved profile persists');
const task=lesson.stages[1].tasks[0];
test(assess(task,'God morgen! Jeg heter Petro.').accepted,'name variant accepted');
test(!assess(task,'Hei! Hvor bor du?').accepted,'off-goal still rejected');
test(assess(lesson.stages[2].tasks[0],'',0).accepted,'choice correct');
test(!assess(lesson.stages[2].tasks[0],'',1).accepted,'choice wrong');
test(localDay(d)==='2026-10-28','local day');
test(addDays(d,3)==='2026-10-31','interval computation');
test(e.dueWords().length===0,'no premature reviews');
d.setDate(29);
test(e.dueWords().length>0,'next day review queued');
const on=lesson.stages[4].tasks[3];
test(assess(on,'Nøkkelen ligger på bordet.').accepted,'location accepted');
test(assess(on,'Den ligger på bordet.').accepted,'contextual pronoun accepted');
test(!assess(on,'Nøkkelen er under stolen.').accepted,'contradictory location rejected');
test(!assess(on,'Hvor er nøkkelen?').accepted,'question not accepted as statement');
resumed.skip();test(resumed.getView().task.id==='m2','skip records no mastered credit');
test(resumed.report().skipped===1,'skip reported');
test(resumed.getView().record.trials===0,'new task clean');
const safeStorage={getItem:()=>'{badjson',setItem:()=>{throw Error('disabled')}};
test(createEngine({lesson,storage:safeStorage,clock:()=>d}).getView().task.id==='w1','storage failure safe');
// Work through all remaining tasks, using planned correct answers. Do not claim grades.
const examples={
 m1:'Hei! Jeg heter Nora.',m2:'Jeg kommer fra Danmark.',m3:'Jeg bor i Oslo.',m4:'Hva heter du?',
 v1:0,v2:0,v3:0,g1:'Jeg bor i Norge.',g2:'Hva heter du?',g3:'Hvor er nøkkelen?',
 h1:'Ja, takk.',h2:0,h3:'Hvor er nøkkelen?',h4:'Nøkkelen er på bordet.',h5:'Takk! Vi sees!',
 r1:0,r2:0,p1:'Hei! Jeg heter Maria. Jeg bor i Tromsø.',t1:'Hei! Jeg heter Anna. Jeg bor i Kongsberg.',t2:'Ha det!'
};
// Start a new pristine session for full course completion.
const complete=createEngine({lesson,storage:null,clock:()=>d,key:'separate'});
for(let i=0;i<complete.taskCount;i++){
 const task0=complete.getView().task;
 if(task0.skill==='listening'&&task0.hideSpeech) complete.markHeard();
 const example=({w1:'Hei! Jeg heter Petro.',w2:'Jeg bor i Kongsberg.',...examples})[task0.id];
 test(example!==undefined,'fixture exists '+task0.id);
 const answer=typeof example==='number'?complete.submit('',{choiceIndex:example}):complete.submit(example);
 test(answer.accepted,'task accepts relevant reply '+task0.id+' missing '+(answer.missing||[]).join(','));
 test(complete.next(),'move from '+task0.id);
}
test(complete.getView().finished,'lesson completes');
test(complete.report().independent===22,'all independent evidence (demo data)');
test(!complete.getView().task,'no step after finish');
console.log('PASS '+n+' engine checks | stages='+lesson.stages.length+' tasks='+complete.taskCount);
// Adaptive explanation changes after a repeated failure; it is always aided evidence.
const repeat=createEngine({lesson,storage:null,clock:()=>d,key:'repeat'});
const fail1=repeat.submit('Hei! Jeg spiser mat.');
const fail2=repeat.submit('Hei! Hvor bor du?');
const fail3=repeat.submit('Hei! Hvor jobber du?');
assert(!fail1.accepted && !fail2.accepted && !fail3.accepted);
assert(fail2.explanation!==fail1.explanation,'Second failure must lead to a different explanation');
assert(fail3.explanation!==fail2.explanation,'Third failure decomposes the missing goal');
assert(repeat.getView().record.hints>=2,'Adaptive extra help is recorded');
repeat.submit('Hei! Jeg heter Test.');
assert(repeat.getView().record.accepted&&!repeat.getView().record.independent,'Aided answer not independently mastered');
const reviews=e.dueWords();
if(reviews.length){
 const word=reviews[0].word;
 assert(e.reviewWord(word,true),'due review accepted');
 assert(!e.dueWords().some(x=>x.word===word),'review scheduled for future');
 assert(!e.reviewWord(word,true),'future review cannot be spammed for credit');
}
console.log('PASS additional adaptation and spaced-review assertions');
