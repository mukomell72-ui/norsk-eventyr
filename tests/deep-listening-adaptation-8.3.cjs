// Verify a genuine third independent authored listening situation in 8 modules,
// safe answer rotation, and coverage-aware Nora skills selection.
// All audio texts in this suite are scripts for synthetic speech, not human recordings.
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const context={window:{},Math,Number,Date,String,Object,Array,JSON,Set,Intl};
vm.createContext(context);
for(const file of ['curriculum-v8.js','practice-foundations.js','foundation-extensions.js','advanced-b1.js','advanced-b2.js','adaptive-teacher.js'])
 vm.runInContext(read(file),context,{filename:file});
const C=context.window.NECurriculum,B=context.window.NECurated,A=context.window.NEAdaptive;
assert(C&&B&&A);
const enhanced=new Set(['a1-home','a1-shopping','a2-work','a2-health','b1-work','b1-news','b2-listening','b2-argument']);
const all=C.levels.flatMap(l=>C.modules(l));
assert.equal(all.length,32);
let texts=0;
for(const m of all){
 const lesson=B.get(m.id),length=enhanced.has(m.id)?3:2;
 assert.equal(lesson.listeningSets.length,length,m.id+' unexpected listening stage count');
 texts+=length;
 if(!enhanced.has(m.id))continue;
 const extra=lesson.listeningSets[2],minimum={A1:45,A2:75,B1:110,B2:140}[m.level];
 assert(extra.audio.trim().split(/\s+/).length>=minimum,m.id+': additional story too short');
 assert.equal(extra.sourceType,'synthetic_tts_script');
 assert.equal(extra.editorStatus,'draft','Do not claim human-expert verification');
 assert.equal(extra.opts.length,4);
 assert.equal(new Set(extra.opts).size,4);
 assert.equal(extra.correct,0);
 assert(extra.audio!==lesson.listeningSets[0].audio&&extra.audio!==lesson.listeningSets[1].audio);
 for(let round=0;round<8;round++){
  const v=B.variant(m.id,round).listeningSets[2];
  assert.equal(v.opts[v.correct],extra.opts[extra.correct],m.id+' mutated correct key on round '+round);
 }
}
assert.equal(texts,72,'32 original two-part modules and eight additional independent scenarios');
assert.equal([...enhanced].filter(id=>B.get(id)?.listeningSets.length===3).length,8);

const state={level:'A1',skills:{},learningV8:{startLevel:'A1'}};
A.ensure(state);
assert.equal(A.learningFocus(state,'A1').skill,'listening','No-evidence path stays deterministic');
A.recordAttempt(state,{level:'A1',moduleId:'a1-home',skill:'listening',score:35});
assert.equal(A.learningFocus(state,'A1').skill,'reading','At comparable weakness, less practised skill takes priority');
A.recordAttempt(state,{level:'A1',moduleId:'a1-home',skill:'reading',score:35,diagnostic:true});
assert.equal(A.learningFocus(state,'A1').skill,'reading','Placement score is NOT a practice attempt');
assert.equal(A.levelGate(state,'A1').pass,false,'Missing independent skills block premature advancement');
const weak={level:'A1',skills:{},learningV8:{startLevel:'A1',levelSkills:{A1:{
 listening:20,reading:55,writing:60,speaking:58,grammar:62,vocabulary:70
 }},attempts:Array.from({length:25},(_,i)=>({level:'A1',skill:'listening',score:30,date:'2026-09-01',moduleId:'a1-home'}))}};
A.ensure(weak);
assert.equal(A.learningFocus(weak,'A1').skill,'listening','Evidence balancing must never hide a substantially weaker skill');
assert.equal(A.learningFocus(weak,'A1').observations,25);
const legacy={level:'A1',skills:{},learningV8:{startLevel:'A1',attempts:[]}};
assert(A.nextMission(legacy).kind==='learn','Old accounts with sparse progress remain supported');
const app=read('app.js');
assert(app.includes('function listeningTranscriptFeedback()'),'Learners need post-answer transcript');
assert(app.includes('skillHint==="listening"?listeningTranscriptFeedback():""'),'Transcript should appear only upon successful listening answer');
assert(app.includes("['marin','cedar','sage'][idx%3]"),'All three listening stages need varied synthetic voices');
console.log('PASS deeper learning: 8 independent audio stories, 72 clip scripts, stable answer keys, evidence-aware Nora and delayed transcript');
