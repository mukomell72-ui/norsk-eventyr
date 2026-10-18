// Evidence-gated course progression checks. Not evidence of real learning outcomes.
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
const sandbox={window:{},Date,Math,Object,Array,Number,String,JSON,Set,Intl};
vm.createContext(sandbox);
for(const name of ['curriculum-v8.js','course-methodology.js','adaptive-teacher.js'])vm.runInContext(read(name),sandbox,{filename:name});
const C=sandbox.window.NECurriculum,A=sandbox.window.NEAdaptive,M=sandbox.window.NECourseMethod;
const chapter=C.modules('A1')[0],id=chapter.id,all=['listening','reading','writing','speaking','grammar','vocabulary'];
const learner={level:'A1',skills:{},learningV8:{startLevel:'A1',modules:{[id]:{
 skills:Object.fromEntries(all.map(s=>[s,92])),mastery:92,courseV2:{startedOn:new Date().toLocaleDateString('sv-SE'),passedStages:[]}
}}}};
A.ensure(learner);
// A fresh learner cannot shortcut all four stages via ordinary practice,
// even if every quiz skill eventually reaches a high numeric mastery.
const fresh={level:'A1',skills:{},learningV8:{startLevel:'A1',modules:{}}};
A.ensure(fresh);
for(let round=0;round<20;round++)for(const skill of all)
 A.recordAttempt(fresh,{level:'A1',moduleId:id,skill,score:100,source:'lesson_choice'});
assert.equal(fresh.learningV8.modules[id].courseV2.passedStages.length,0);
assert.equal(A.moduleMastery(fresh,id),77,'Fresh quiz-only mastery must remain blocked until four stage passes');
const chapterProgress=learner.learningV8.modules[id];
assert.equal(A.moduleMastery(learner,id),77,'High quiz scores alone must not unlock an unfinished teaching chapter');
function attempt(skill,score=95,transfer=false,source='lesson_free'){
 A.recordAttempt(learner,{level:'A1',moduleId:id,skill,score,source,transfer});
}
function run(stage,score=90){
 const meta={kind:'learn',moduleId:id,courseStage:stage,startedAt:new Date(Date.now()-10000).toISOString()};
 return A.completeLesson(learner,{level:'A1',_adaptive:meta},score);
}
attempt('vocabulary');attempt('grammar');attempt('listening');
let outcome=run('introduce');assert.equal(outcome.advanced,true);
assert.equal(M.modulePlan(chapter,learner).stageKey,'understand');
assert.equal(A.moduleMastery(learner,id),77);
learner.learningV8.attempts=[];
attempt('listening');attempt('reading');
outcome=run('understand');assert.equal(outcome.advanced,true);
assert.equal(M.modulePlan(chapter,learner).stageKey,'produce');
learner.learningV8.attempts=[];
attempt('writing',95,false,'lesson_free_text');
outcome=run('produce');
assert.equal(outcome.advanced,false,'Typed text must not stand in for oral competence');
assert.equal(chapterProgress.courseV2.passedStages.length,2);
learner.learningV8.attempts=[];
attempt('writing',95,false,'lesson_free_text');attempt('speaking',90,false,'dialogue_voice');
outcome=run('produce');assert.equal(outcome.advanced,true);
assert.equal(A.moduleMastery(learner,id),77);
assert.equal(M.modulePlan(chapter,learner).stageKey,'transfer');
learner.learningV8.attempts=[];
attempt('writing',95,true);attempt('speaking',92,true,'dialogue_voice');
outcome=run('transfer');assert.equal(outcome.advanced,false,'Same-day transfer is insufficient delayed evidence');
// Merely starting the course long ago must NOT count as later-day transfer:
chapterProgress.courseV2.startedOn='2000-01-01';
learner.learningV8.attempts=[];
attempt('writing',95,true);attempt('speaking',92,true,'dialogue_voice');
outcome=run('transfer');assert.equal(outcome.advanced,false,'Old course start is not proof of delayed production recall');
// In real use this timestamp is written by verifyStage on the preceding pass.
chapterProgress.courseV2.lastPassedAt='2000-01-01T12:00:00.000Z';
learner.learningV8.attempts=[];
attempt('writing',95,true);attempt('speaking',92,true,'dialogue_voice');
outcome=run('transfer');assert.equal(outcome.advanced,true);
assert.equal(chapterProgress.courseV2.passedStages.length,4);
assert(A.moduleMastery(learner,id)>=78,'Strong skill evidence and four phases should unlock a completed chapter');
const legacy={level:'A1',skills:{},learningV8:{modules:{[id]:{skills:Object.fromEntries(all.map(s=>[s,90]))}}}};
assert(A.moduleMastery(legacy,id)>=78,'Existing mastered chapters must not be re-locked on upgrade');
assert.equal(M.modulePlan(chapter,learner).graduated,true);
const app=read('app.js'),teacher=read('adaptive-teacher.js'),map=read('ui-v7.js');
assert(app.includes('completeLesson(state,l,reward.avg)'),'The actual lesson score must be sent to the teaching verifier');
assert(app.includes('Этап пока не подтверждён'),'Failed teaching stage must be explained rather than silently passed');
assert(teacher.includes('startedAt:new Date().toISOString()'),'New learning missions must capture a timestamp for evidence');
assert(teacher.includes("courseStep?.stageKey==='transfer'"),'Transfer missions need transfer-labelled evidence');
assert(map.includes('Подтверждено этапов'),'Course roadmap must display verified chapter stages');
const elite=read('elite.js');
assert(map.includes('route:"listeninglab"')&&map.includes('route:"dictation"')&&map.includes('route:"chat"'),
 'The daily roadmap must offer listening, conversation and writing');
assert(map.includes('План '+String.fromCharCode(39)+'+j.planned'), 'UI must show planned, not claimed spent minutes');
assert(elite.includes("p.heard&&!p.revealed")&&elite.includes("markActivity('listening')"),
 'Verified Norwegian audio attempts must be eligible for listening practice, never reading-only answers');
assert(elite.includes('Это тренировочная активность, не оценка CEFR.')&&elite.includes('Это не записи носителей.'),
 'Listening activity must not be misrepresented as CEFR mastery or native-speaker recording');
console.log('PASS evidence-based teacher course: no skipping, voice proof, meaningful comprehension, delayed transfer and grandfathered legacy state');
