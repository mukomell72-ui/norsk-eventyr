// Regression: one teacher-led day, active clock, archive, isolated replay and speaking-first plan.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const context={window:{},Math,Number,Date,Array,String,Object,JSON,Set,Intl};
vm.createContext(context);
vm.runInContext(read('course-methodology.js'),context);
const plan=context.window.NECourseMethod.dailyPlan(60);
assert.deepEqual(Array.from(plan.parts,p=>p.minutes),[10,12,13,20,5]);
assert(plan.parts[3].minutes>plan.parts[1].minutes,'Speaking gets more time than explanation');
const speechGap=context.window.NECourseMethod.dailyPlan(60,{vocabulary:75,grammar:74,listening:76,reading:73,writing:72,speaking:40});
assert(speechGap.parts[3].minutes>=24,'The weakest oral skill should receive adaptive extra time');
const scenario={id:'a1-foundation',level:'A1',title:'Знакомство',canDo:['Представиться и задать вопрос']};
const s={level:'A1',elite:{dailyMinutes:60},learningV8:{modules:{},attempts:[]},generatedLessons:{}};
const pages=[],resumes=[];
let tick=500000,saveCount=0;
class ClockDate extends Date{static now(){return tick}}
const doc={hidden:false,querySelector:()=>({}),getElementById:()=>null,addEventListener:()=>{}};
const w={neLearnerState:s,saveState:()=>{saveCount++},shell:x=>pages.push(x),startLesson:id=>resumes.push(id),navigate:()=>{},addEventListener:()=>{},
 NEAdaptive:{ensure:x=>x.learningV8,highestUnlockedLevel:()=> 'A1',levelGate:()=>({pass:false}),moduleMastery:()=>35,moduleMission:()=>({module:scenario,level:'A1',blocked:false,kind:'learn'})},
 NECurriculum:{modules:()=>[scenario],moduleById:id=>id===scenario.id?scenario:null},
 NECourseMethod:{modulePlan:()=>({stageKey:'introduce'})},teacherStartLivingScene:()=>{}};
vm.runInNewContext(read('living-day.js'),{window:w,document:doc,setInterval:()=>1,Date:ClockDate,Math,Number,Array,String,Object,JSON,Intl});
const D=w.NELivingDay,d=D.details();
D.open();
tick+=10000;D.clockPulse();
assert.equal(Math.round(s.learningV8.livingDay.activeMs),10000,'Foreground activity must be counted');
tick+=200000;D.clockPulse();
assert.equal(Math.round(s.learningV8.livingDay.activeMs),10000,'Idle time must not be credited');
const iso=new Date(Date.now()-120000).toISOString();
function lesson(i,kind){const id='scene-'+i;s.generatedLessons[id]={id,title:'Разговор '+i,level:'A1',vocab:[['hei','привет']],_adaptive:{moduleId:scenario.id,livingDayId:d.id,livingScene:i,kind,courseStage:'introduce',startedAt:iso}};return s.generatedLessons[id]}
assert(D.onLessonFinished(lesson(0,'learn'),{advanced:true},90).advanced);
s.learningV8.attempts.push(
 {date:new Date().toISOString(),moduleId:scenario.id,skill:'speaking',score:86,source:'dialogue_voice'},
 {date:new Date().toISOString(),moduleId:scenario.id,skill:'writing',score:80,source:'lesson_free_text'});
assert(D.onLessonFinished(lesson(1,'review'),null,92).advanced);
assert(D.onLessonFinished(lesson(2,'review'),null,91).finished);
assert.equal(s.learningV8.lessonArchive.length,1);
assert.deepEqual(Array.from(s.learningV8.lessonArchive[0].lessonIds),['scene-0','scene-1','scene-2']);
D.archive();assert(pages.at(-1).includes('Архив уроков')&&pages.at(-1).includes('Повторить часть'));
D.replay('scene-1');assert.equal(resumes.length,1);
const id=resumes[0],replay=s.generatedLessons[id];
assert(replay&&replay._adaptive.kind==='archive_replay');
assert(replay._adaptive.moduleId.startsWith('archive:'));
assert.equal(replay._adaptive.livingDayId,'','Replaying cannot finish the current teaching day');
assert.equal(s.learningV8.lessonArchive.length,1,'Replay does not duplicate archive completion');
s.learningV8.livingDay.date='2000-01-01';
assert(!D.details().finished,'Next date starts a different session');
assert.equal(s.learningV8.lessonArchive.length,1,'Prior archive survives new study day');
assert(saveCount>0);
const guided=read('guided-speaking.js'),ui=read('ui-v7.js'),gen=read('api/generate.js');
assert(guided.includes('function neGuidedExplain()'),'Confusion help must be reachable from speaking');
assert(ui.includes('Урок с Норой · ')&&ui.includes('lessonarchive'),'One-tap lesson and archive must be accessible');
assert(gen.includes('Устная практика — приоритет'),'Teacher prompts must emphasize oral practice');
const cache=read('sw.js'),access=read('access.js'),index=read('index.html');
assert(index.includes('-audit11-story1-world13" defer>'),'New story bootstrap must invalidate cached lessons');
for(const name of ['course-methodology.js','guided-speaking.js','living-day.js','ui-v7.js'])
 assert(cache.includes('/'+name+'?v=8.3.0-lesson24')&&access.includes("'-teacher2'"),'Versioned offline lessons required: '+name);
assert(/-teacher2-coach6-fresh1-bridge8-audit[1-9][0-9]*(?:-story1)?(?:-world[1-9][0-9]*)?" defer><\/script>/.test(index),'App bootstrap must invalidate old lesson cache for the tutor release');
console.log('PASS teacher-led day: 60-minute plan, extra speaking, idle-safe clock, retained archive and safe replay');
