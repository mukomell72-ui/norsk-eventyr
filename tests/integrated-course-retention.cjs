// Integration QA: keep a teacher-led chapter and delayed retention evidence simultaneously.
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const env={window:{},Date,Math,Number,Object,Array,String,JSON,Set,Intl};
vm.createContext(env);
for(const filename of ['curriculum-v8.js','course-methodology.js','adaptive-teacher.js'])
 vm.runInContext(read(filename),env,{filename});
const C=env.window.NECurriculum,M=env.window.NECourseMethod,A=env.window.NEAdaptive;
assert(C&&M&&A,'Integrated course, curriculum and teacher must load');
const chapter=C.modules('A1')[0];
const learner={level:'A1',skills:{},learningV8:{startLevel:'A1',modules:{}}};
A.ensure(learner);
assert.equal(M.modulePlan(chapter,learner).stageKey,'introduce');
A.recordAttempt(learner,{level:'A1',moduleId:chapter.id,skill:'reading',score:100,source:'lesson'});
A.recordAttempt(learner,{level:'A1',moduleId:chapter.id,skill:'reading',score:100,source:'lesson_retry'});
const r=learner.learningV8.reviews[chapter.id+':reading'];
assert.equal(r.stage,0,'Same-day repetition cannot inflate intervals');
assert(!r.delayedPasses,'Same-day attempts are not delayed memory evidence');
assert.equal(M.modulePlan(chapter,learner).stageKey,'introduce','Same-day practice does not skip course stages');
r.due='2000-01-01';
A.recordAttempt(learner,{level:'A1',moduleId:chapter.id,skill:'reading',score:95,source:'due_review',reviewKey:chapter.id+':reading'});
assert.equal(r.stage,1,'Only an overdue check should advance an interval');
assert.equal(r.delayedPasses,1,'Real overdue review must be credited');
const deadline=r.due;
A.recordAttempt(learner,{level:'A1',moduleId:chapter.id,skill:'reading',score:100,source:'early_review'});
assert.equal(r.due,deadline,'Early success cannot move a review date');
assert.equal(A.levelGate(learner,'A1').pass,false,'One skill cannot award A1');
const cache=read('sw.js'),bootstrap=read('access.js');
for(const asset of ['adaptive-teacher.js','course-methodology.js'])
 assert(cache.includes('/'+asset+'?v=8.3.0-lesson22'),'Integration PWA cache mismatch: '+asset);
assert(bootstrap.includes("LESSON_PATCH='-lesson22'"),'Integration PWA bootstrap mismatch');
assert(bootstrap.includes("'course-methodology.js'"),'Course framework missing from bootstrap');
console.log('PASS integration: course continuity + genuine spaced retention + synced local PWA assets');
