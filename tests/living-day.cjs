// Regression tests for the continuous Nora lesson (planning time is not measured time).
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const moduleData={id:'a1-foundation',level:'A1',title:'Знакомство',canDo:['Представиться']};
const s={level:'A1',elite:{dailyMinutes:20},learningV8:{modules:{},attempts:[]},generatedLessons:{}};
let saves=0;const views=[],starts=[],resumes=[];
const w={neLearnerState:s,saveState:()=>saves++,shell:x=>views.push(x),startLesson:id=>resumes.push(id),navigate:()=>{},
 NEAdaptive:{ensure:x=>x.learningV8,highestUnlockedLevel:()=> 'A1',levelGate:()=>({pass:false}),moduleMastery:()=>35,moduleMission:()=>({module:moduleData,level:'A1',blocked:false,kind:'learn'})},
 NECurriculum:{modules:()=>[moduleData],moduleById:id=>id===moduleData.id?moduleData:null},
 NECourseMethod:{modulePlan:()=>({stageKey:'introduce'})},
 teacherStartLivingScene:(...x)=>starts.push(x)};
vm.runInNewContext(read('living-day.js'),{window:w,Date,Math,Number,Array,String,Object,JSON,Intl});
const D=w.NELivingDay;
const d=D.details(),old=s.learningV8.livingDay;
assert(d&&d.moduleId==='a1-foundation'&&d.plannedMinutes>=45);
D.open();assert(views.at(-1).includes('Знакомство')&&!views.at(-1).includes('5 обязательных блоков'));
D.begin();assert.equal(starts.length,1);assert.equal(starts[0][2],0);
const first={_adaptive:{moduleId:d.moduleId,livingDayId:d.id,livingScene:0,kind:'learn',courseStage:'introduce',startedAt:new Date(Date.now()-30000).toISOString()}};
assert.equal(D.onLessonFinished(first,{advanced:false,reason:'Повтори'},90).advanced,false);
assert.equal(D.details().scene,0);
assert.equal(D.onLessonFinished(first,{advanced:true},90).advanced,true);
assert.equal(D.details().scene,1);
assert.equal(D.details().recap.length,1,'Completed stage should persist a chapter');
assert(D.lessonContinuity(old).includes('Разбираемся в ситуации'));
D.open();assert(views.at(-1).includes('Нора помнит нашу историю'),'Recap should appear before the next scene');
assert.equal(D.onLessonFinished(first,{advanced:true},90),null);
D.begin();assert.equal(starts[1][2],1);
const second={_adaptive:{...first._adaptive,kind:'review',livingScene:1}};
assert.equal(D.onLessonFinished(second,null,100).advanced,false,'No silent progress from quiz score without productive skills');
s.learningV8.attempts.push(
 {date:new Date().toISOString(),moduleId:d.moduleId,skill:'writing',score:80,source:'lesson_free_text'},
 {date:new Date().toISOString(),moduleId:d.moduleId,skill:'speaking',score:80,source:'dialogue_voice'}
);
assert.equal(D.onLessonFinished(second,null,90).advanced,true);
D.begin();assert.equal(starts[2][2],2);
const third={_adaptive:{...second._adaptive,livingScene:2}};
assert.equal(D.onLessonFinished(third,null,70).advanced,false);
assert.equal(D.onLessonFinished(third,null,90).advanced,true);
assert(D.details().finished);
assert.equal(D.details().recap.length,3,'All three chapters should persist');
D.open();assert(views.at(-1).includes('ne-day-consolidation'),'Early completion offers voluntary practice');
assert.strictEqual(s.learningV8.livingDay,old);
old.date='2000-01-01';
assert(!D.details().finished,'Next study day is a new session');
const pending=s.learningV8.livingDay;
pending.date='2000-01-01';
pending.id='2000-01-01:a1-foundation:introduce';
s.activeLesson={id:'old-lesson',step:3,guidedSpeech:{index:1,turns:[]}};
s.generatedLessons['old-lesson']={id:'old-lesson',_adaptive:{
 moduleId:pending.moduleId,livingDayId:pending.id,livingScene:pending.scene}};
D.details();
assert.notStrictEqual(s.learningV8.livingDay,pending,'New day must not stay trapped in unfinished scene');
assert(s.learningV8.pausedDays.some(x=>x.id===pending.id),'Old day must stay in history');
assert(!s.activeLesson,'Old checkpoint must be parked, not forced on the new day');
assert.equal(s.learningV8.pausedCheckpoints['old-lesson'].step,3,'Checkpoint step must be retained');
w.NELivingWords={isReady:()=>false,render:()=>{views.push('blocked-vocabulary');return false}};
D.open();assert(views.at(-1).includes('NELivingDay.begin()'),'New day must open without mandatory flashcards');
D.begin();assert.equal(starts.at(-1)[2],0,'Vocabulary queue must not block new speaking mission');
D.archive();assert(views.at(-1).includes('resumePaused'),'Older checkpoint must be recoverable');
D.resumePaused('old-lesson');
assert.deepEqual(resumes,['old-lesson'],'Paused lesson can be resumed explicitly');
assert.equal(s.activeLesson.step,3,'Restored lesson keeps its original step');
assert(saves>2);
const app=read('app.js'),ad=read('adaptive-teacher.js'),ui=read('ui-v7.js'),sw=read('sw.js'),access=read('access.js');
assert(app.includes('onLessonFinished?.(l,courseOutcome,reward.avg)'));
assert(ad.includes('teacherStartLivingScene')&&ad.includes("sceneIndex===0?'learn':'review'"));
assert(ui.includes('return engine.begin()'),'The lesson button must start the lesson in one tap');
assert(access.includes("'living-day.js'")&&sw.includes('/living-day.js?v=8.3.0-lesson24'));
console.log('PASS Nora day: three situations, fresh day rollover, paused checkpoints, voice evidence and offline support');
