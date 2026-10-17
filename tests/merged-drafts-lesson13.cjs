// Lock together the safely integrated parts of historical draft PRs #33, #58,
// #59 and the released lesson13 writing form. This test must not import their
// obsolete whole-branch assets into the live app.
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const ctx={window:{},Date,Math,Number,Object,Array,String,JSON,Set,Intl};
vm.createContext(ctx);
for(const file of ['curriculum-v8.js','course-methodology.js','adaptive-teacher.js']){
 vm.runInContext(read(file),ctx,{filename:file});
}
const C=ctx.window.NECurriculum,M=ctx.window.NECourseMethod,A=ctx.window.NEAdaptive;
assert(C&&M&&A,'Curriculum, staged course and adaptive teacher must coexist');
assert.equal(C.levels.join(','),'A1,A2,B1,B2');
assert.equal(C.levels.reduce((n,l)=>n+C.modules(l).length,0),32);
const chapter=C.modules('A1')[0],id=chapter.id;
const state={level:'A1',skills:{},learningV8:{startLevel:'A1'}};
A.ensure(state);
assert.equal(M.modulePlan(chapter,state).stageKey,'introduce');
// PR #59: A newly created chapter cannot earn fake mastery by answering quizzes.
for(const skill of ['reading','listening','writing','speaking','grammar','vocabulary']){
 A.recordAttempt(state,{level:'A1',moduleId:id,skill,score:100,source:'lesson'});
}
assert.deepEqual(Array.from(state.learningV8.modules[id].courseV2.passedStages),[]);
assert.equal(M.modulePlan(chapter,state).stageKey,'introduce');
assert(A.moduleMastery(state,id)<78,'Course must not be bypassed by quiz scores');
// PR #58: many good answers on the same day cannot push due dates into the future.
const review=state.learningV8.reviews[id+':reading'],due=review.due;
A.recordAttempt(state,{level:'A1',moduleId:id,skill:'reading',score:100,source:'quick_repeat'});
assert.equal(review.stage,0);
assert.equal(review.due,due);
assert(!review.delayedPasses);
review.due='2000-01-01';
A.recordAttempt(state,{level:'A1',moduleId:id,skill:'reading',score:100,source:'delayed_review',reviewKey:id+':reading'});
assert.equal(review.stage,1);
assert.equal(review.delayedPasses,1);
const nextDue=review.due;
A.recordAttempt(state,{level:'A1',moduleId:id,skill:'reading',score:100,source:'early_extra'});
assert.equal(review.due,nextDue);
// PR #33 ideas, current 8.2 replacement: scoped error patterns need two mistakes,
// then a genuine correction/transfer, without erasing course or review progress.
for(let i=0;i<2;i++)A.recordAttempt(state,{level:'A1',moduleId:id,skill:'writing',score:40,source:'lesson_free',errorTag:'word_order'});
assert.equal(state.learningV8.patternStats['A1:word_order'].misses,2);
// Due reviews have priority. After due review is cleared, correction is available.
const all=state.learningV8.reviews;
for(const k of Object.keys(all))all[k].due='2999-01-01';
assert.equal(A.nextMission(state).kind,'error_remediation','Repeated error must get targeted coaching');
assert.equal(A.nextMission(state).errorTag,'word_order');
const before=state.learningV8.patternStats['A1:word_order'].severity;
A.recordAttempt(state,{level:'A1',moduleId:id,skill:'writing',score:93,source:'lesson_free_transfer',targetErrorTag:'word_order',transfer:true});
assert(state.learningV8.patternStats['A1:word_order'].severity<before);
assert.equal(state.learningV8.patternStats['A1:word_order'].transferPasses,1);
assert.notEqual(A.nextMission(state).kind,'error_remediation');
assert.equal(M.modulePlan(chapter,state).stageKey,'introduce','Spaced recall and error corrections cannot skip structured course stages');
assert.equal(A.levelGate(state,'A1').pass,false,'No premature level promotion');
// Lesson13: special writing task gets a fillable card, without altering AI scoring,
// other level writing, speaking or personal study records.
ctx.window.neLessonSession={remediation:null,speakingFollowup:false};
ctx.window.lessonFreeTask=(l,mode)=>mode==='writing'?l.writing:l.speaking;
ctx.window.freeEx=(l,mode)=>'<section id="original">'+mode+'</section>';
ctx.window.checkFree=()=>{};
vm.runInContext(read('inline-personal-form.js'),ctx,{filename:'inline-personal-form.js'});
const l={level:'A1',writing:'Заполни короткую личную карточку: jeg heter, jeg kommer fra, jeg bor, jeg snakker.'};
const view=ctx.window.freeEx(l,'writing');
assert(view.includes('PERSONKORT'),'A1 personal data task must be rendered directly as a form');
assert.equal((view.match(/data-ne-person-card=/g)||[]).length,4);
assert(view.includes('id="freeAnswer"')&&view.includes('neInlineCardSubmit()'));
assert(ctx.window.freeEx({...l,level:'A2'},'writing').includes('id="original"'));
assert(ctx.window.freeEx(l,'speaking').includes('id="original"'));
assert(ctx.window.neLessonSession.remediation===null);
const scripts=read('access.js'),cache=read('sw.js');
for(const f of ['course-methodology.js','adaptive-teacher.js','inline-personal-form.js']){
 assert(scripts.includes("'"+f+"'"),'Missing script '+f);
 assert(cache.includes('/'+f+'?v=8.3.0'+(f==='inline-personal-form.js'?'':'-lesson21')),
  'Missing cached script '+f);
}
assert(scripts.includes("LESSON_PATCH='-lesson21'"));
console.log('PASS integrated old draft functionality #33/#58/#59 + live lesson13: no stale branch merge and all learning gates intact');
