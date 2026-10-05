const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const assert=(v,m)=>{if(!v)throw new Error(m)};

const sandbox={window:{},console,Date,Math,Object,Array,Number,String,JSON,Set,Intl};
vm.createContext(sandbox);
vm.runInContext(read('curriculum-v8.js'),sandbox);
vm.runInContext(read('adaptive-teacher.js'),sandbox);
const C=sandbox.window.NECurriculum,A=sandbox.window.NEAdaptive;

assert(C&&A,'adaptive globals missing');
assert(C.levels.join(',')==='A1,A2,B1,B2','CEFR level order missing');
for(const level of C.levels){
 const modules=C.modules(level);
 assert(modules.length===8,level+' must have 8 curriculum modules');
 assert(modules.every(m=>Array.isArray(m.canDo)&&m.canDo.length>=2),level+' can-do coverage missing');
 assert(modules.at(-1).id.includes('transfer')||modules.at(-1).id.includes('capstone'),level+' transfer checkpoint missing');
}

const state={level:'A1',skills:{},learningV8:{}};
A.ensure(state);
assert(state.learningV8.levelSkills.A1&&state.learningV8.levelSkills.B2,'level-specific skill profiles missing');
const a2Before=state.learningV8.levelSkills.A2.reading;
A.recordAttempt(state,{level:'A1',skill:'reading',score:100,moduleId:'a1-foundation',source:'qa'});
assert(state.learningV8.levelSkills.A1.reading>a2Before,'A1 reading evidence did not update');
assert(state.learningV8.levelSkills.A2.reading===a2Before,'A1 evidence leaked into A2');
assert(A.dueReviews(state).length===0,'successful fresh evidence should not be due immediately');
assert(A.levelGate(state,'A1').pass===false,'single answer must never certify A1');

const p=state.learningV8;
for(const s of ['listening','reading','writing','speaking','grammar','vocabulary'])p.levelSkills.A1[s]=90;

// Imported/stale progress must not certify a module from a stored vanity percentage alone.
for(const m of C.modules('A1'))p.modules[m.id]={skills:{listening:90,reading:90,writing:90,speaking:90},mastery:99,attempts:8,transferPasses:8};
for(let i=0;i<4;i++)p.reviews['a1-foundation:'+['listening','reading','writing','speaking'][i]]={stage:2,lastScore:90,due:'2999-01-01'};
assert(A.levelGate(state,'A1').pass===false,'stored mastery without grammar/vocabulary evidence must not certify A1');

// All six components must be evidenced in each mastered module.
for(const m of C.modules('A1'))p.modules[m.id]={skills:{listening:90,reading:90,writing:90,speaking:90,grammar:90,vocabulary:90},mastery:90,attempts:12,transferPasses:8};
assert(A.levelGate(state,'A1').pass===true,'mastery gate should pass only after broad six-component evidence');

// Delayed evidence must cover all four communicative skills, not four checks of one skill.
p.reviews={};
for(let i=0;i<4;i++)p.reviews['a1-'+i+':reading']={stage:2,lastScore:90,due:'2999-01-01'};
assert(A.levelGate(state,'A1').pass===false,'four delayed checks of one skill must not certify A1');
for(const skill of ['listening','reading','writing','speaking'])p.reviews['a1-foundation:'+skill]={stage:2,lastScore:90,due:'2999-01-01'};
assert(A.levelGate(state,'A1').pass===true,'delayed evidence across all four core skills should satisfy the retention gate');

// An assessment for another level must update that level only.
const a1WritingBefore=p.levelSkills.A1.writing,a2WritingBefore=p.levelSkills.A2.writing;
A.assessment(state,'A2',88,{writing:88});
assert(p.levelSkills.A1.writing===a1WritingBefore,'A2 assessment leaked into A1');
assert(p.levelSkills.A2.writing>a2WritingBefore,'A2 assessment failed to update A2');

// Spaced reviews must keep the CEFR level where the evidence was created.
const reviewState={level:'B1',skills:{},learningV8:{}};
A.ensure(reviewState);
A.recordAttempt(reviewState,{level:'A2',skill:'listening',score:30,moduleId:'a2-supplemental',source:'qa'});
reviewState.learningV8.reviews['a2-supplemental:listening'].due='2000-01-01';
const reviewMission=A.nextMission(reviewState);
assert(reviewMission.kind==='review'&&reviewMission.level==='A2','due A2 review was incorrectly promoted to current B1 level');

const app=read('app.js'),access=read('access.js'),sw=read('sw.js'),generate=read('api/generate.js'),evaluate=read('api/evaluate.js');
assert(app.includes('view==="teacher"')&&app.includes('startAdaptiveTeacher'),'teacher route missing');
assert(app.includes('"learningV8"'),'adaptive state validation missing');
assert(app.includes('previousLevel:state.level')&&!app.includes('function startTest(level){touchStudy();state.level=level'),'starting a diagnostic must not switch the active course level');
assert(app.includes('level:testSession.level,skill'),'diagnostic evidence must be written to the tested CEFR level');
assert(access.includes("'curriculum-v8.js'")&&access.includes("'adaptive-teacher.js'"),'adaptive scripts not loaded');
assert(sw.includes('/curriculum-v8.js?v=7.4.0')&&sw.includes('/adaptive-teacher.js?v=7.4.0'),'adaptive assets not cached');
assert(generate.includes('teacherMode')&&generate.includes('Can-do цели'),'objective-driven generator prompt missing');
assert(evaluate.includes('retry_prompt_no')&&evaluate.includes('micro_rule_ru'),'teacher feedback schema missing');
console.log('Norsk Eventyr adaptive teacher 8.0 foundation checks: PASS');
