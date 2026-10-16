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
assert.strictEqual(s.learningV8.livingDay,old);
old.date='2000-01-01';
assert(!D.details().finished,'Next study day is a new session');
const pending=s.learningV8.livingDay;
pending.date='2000-01-01';
assert.strictEqual(s.learningV8.livingDay,pending,'Unfinished lesson cannot be skipped by date change');
D.details();assert.strictEqual(s.learningV8.livingDay,pending);
s.activeLesson={id:'old-lesson'};s.generatedLessons['old-lesson']={id:'old-lesson',_adaptive:{moduleId:'a1-home'}};
D.begin();assert.deepEqual(resumes,['old-lesson'],'Existing checkpoint is resumed');
assert(saves>2);
const app=read('app.js'),ad=read('adaptive-teacher.js'),ui=read('ui-v7.js'),sw=read('sw.js'),access=read('access.js');
assert(app.includes('onLessonFinished?.(l,courseOutcome,reward.avg)'));
assert(ad.includes('teacherStartLivingScene')&&ad.includes("sceneIndex===0?'learn':'review'"));
assert(ui.includes("v7ContinueToday(){return navigate('livingday')}"));
assert(access.includes("'living-day.js'")&&sw.includes('/living-day.js?v=8.3.0-lesson18'));
console.log('PASS one connected Nora day: checks, three situations, no skipping, voice evidence, persistent checkpoints and offline support');
