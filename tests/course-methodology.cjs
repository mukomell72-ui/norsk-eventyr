// Technical tests for planned course structure, not proof of learning outcomes.
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const ctx={window:{},Math,Number,Date,Object,Array,String,JSON,Set,Intl};
vm.createContext(ctx);
vm.runInContext(read('curriculum-v8.js'),ctx);
vm.runInContext(read('course-methodology.js'),ctx);
const C=ctx.window.NECurriculum,M=ctx.window.NECourseMethod;
assert(C&&M,'Course framework must initialize with existing curriculum');
assert.deepEqual(Array.from(M.levels),['A1','A2','B1','B2']);
const expected={A1:16,A2:20,B1:28,B2:36};
let seen=0;
for(const level of C.levels){
 const mods=C.modules(level),schedule=M.levelPlan(level);
 assert.equal(mods.length,8);
 assert.equal(schedule.weeks,expected[level]);
 assert.equal(schedule.hours,expected[level]*6);
 for(const mod of mods){
  seen++;
  const state={learningV8:{modules:{}}};
  const intro=M.modulePlan(mod,state);
  assert.equal(intro.stageKey,'introduce');
  assert.equal(intro.objective,mod.canDo[0]);
  assert.equal(intro.grammar,mod.grammar);
  assert.equal(intro.lexicon,mod.lexicon);
  assert(intro.studyDaysGuide>=12,'Each chapter needs multiple study sessions');
  const a=Math.ceil(intro.studyDaysGuide/4);
  state.learningV8.modules[mod.id]={completions:a};
  assert.equal(M.modulePlan(mod,state).stageKey,'understand');
  state.learningV8.modules[mod.id].completions=2*a;
  assert.equal(M.modulePlan(mod,state).stageKey,'produce');
  state.learningV8.modules[mod.id].completions=3*a;
  assert.equal(M.modulePlan(mod,state).stageKey,'transfer');
  const last=M.modulePlan(mod,state);
  assert(last.objective===mod.canDo[0],'Transfer still tests the original can-do objective');
 }
}
assert.equal(seen,32);
const target=M.courseEstimate(60);
assert.equal(target.coreHours,600);
assert.equal(target.hoursPerWeek,6);
assert.equal(target.approxWeeks,100);
for(const m of [20,30,45,60,75]){
 const plan=M.dailyPlan(m);
 assert.equal(plan.minutes,m);
 assert.equal(plan.parts.length,5);
 assert.equal(plan.parts.reduce((s,p)=>s+p.minutes,0),m);
 assert(plan.parts.every(p=>p.minutes>=0));
}
assert.deepEqual(Array.from(M.dailyPlan(60).parts,x=>x.minutes),[10,15,15,15,5]);
const access=read('access.js'),sw=read('sw.js'),adaptive=read('adaptive-teacher.js'),generate=read('api/generate.js'),coursePage=read('ui-v7.js'),settings=read('ui-v8.js');
assert(access.includes("'curriculum-v8.js','course-methodology.js','verified-learning-resources.js','practice-foundations.js'"),'Course plan must load after curriculum and before adaptive teacher');
assert(sw.includes('/course-methodology.js?v=8.3.0-lesson15'),'PWA must pre-cache course plan');
assert(adaptive.includes('courseObjective:courseStep?.objective'),'Adaptive teacher must send stage objective to lesson generator');
assert(generate.includes('teacherMode&&courseStage'),'AI should stay within instructor-ordered stage');
assert(coursePage.includes('levelSchedule.weeks'),'Course overview must expose duration and ordering');
assert(settings.includes('[45,60,75,90]'),'Profile must offer full study days');
console.log('PASS structured course: 32 sequenced chapters, 4 teacher phases, 600 h planning model and mobile PWA integration');
