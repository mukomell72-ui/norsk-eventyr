// Study day contract: sequential evidence, persistence, no calendar skip.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const module={id:'a1-foundation',level:'A1',title:'Знакомство',grammar:'jeg/du; heter',canDo:['Представиться']};
const state={level:'A1',elite:{dailyMinutes:20},learningV8:{}};
const events=[],visits=[];
let mastery=35;
const dictionary=Array.from({length:6},(_,i)=>['ord'+i,'значение'+i]);
const bank={vocab:dictionary,grammarQ:'Velg riktig.',grammarOpts:['riktig','feil 1','feil 2','feil 3'],grammarCorrect:0,grammarRuleRu:'Ordrekkefølge',
 q:'Hvor?',read:'Jeg bor i Oslo.',opts:['Oslo','Bergen','Trondheim','Tromsø'],correct:0,
 listeningSets:[{audio:'Jeg heter Anna.',q:'Hva heter hun?',opts:['Anna','Sara','Kari','Eva'],correct:0},{audio:'Jeg bor her.',q:'Hvor?',opts:['Her','Der','Borte','Ute'],correct:0}]};
const fakeA={ensure:s=>s.learningV8,highestUnlockedLevel:()=> 'A1',levelGate:()=>({pass:false}),moduleMastery:()=>mastery,
 moduleMission:()=>({kind:'learn',module}),recordAttempt:(_state,entry)=>events.push(entry)};
const w={
 neLearnerState:state,NEAdaptive:fakeA,NECurriculum:{moduleById:()=>module,modules:()=>[module]},
 NECourseMethod:{modulePlan:()=>({stageKey:'introduce',objective:'Представиться'})},
 NECurated:{variant:()=>bank,get:()=>bank},saveState:()=>{},shell:html=>visits.push(html),
 speakText:t=>visits.push('speak:'+t),teacherStartDailyModule:(id,stage)=>visits.push('teacher:'+id+':'+stage)
};
const context={window:w,state,Date,Math,Number,Object,Array,String,JSON,Set,Intl};
vm.runInNewContext(read('daily-course.js'),context,{filename:'daily-course.js'});
const D=w.NEDailyCourse;
assert(D,'Daily module must be registered');
let s=D.summary();
assert(s.planned>=45,'A configured short profile must still have 45+ minute core day');
assert.equal(s.done,0);assert.equal(s.moduleId,'a1-foundation');
assert.equal(s.total,5);
assert(s.steps.every(x=>x.mins>0));
assert(s.steps.slice(1).every(x=>x.locked));
const startDay=state.learningV8.dailyCourse;
assert.equal(D.answer(3),false,'Wrong vocabulary choice must not pass');
assert.equal(D.summary().done,0);
for(let i=0;i<3;i++){
 const shift=i%4;
 const correct=shift===0?0:(4-shift)%4; // opts rotated left by shift
 assert.equal(D.answer(correct),true,'Vocabulary question '+i+' should accept only its correct answer');
}
assert.equal(D.summary().done,1);
assert.equal(D.answer(3),false,'Grammar error must not pass');
assert.equal(D.answer(0),true);assert.equal(D.summary().done,2);
assert.equal(D.answer(0),true);assert.equal(D.summary().done,2,'All listening questions required');
assert.equal(D.answer(0),true);assert.equal(D.summary().done,3);
assert.equal(D.answer(0),true);assert.equal(D.summary().done,4);
assert.equal(D.answer(0),false,'Core lesson cannot be skipped via choice API');
D.beginTeacher();
assert(visits.some(x=>x==='teacher:a1-foundation:introduce'));
D.onLessonFinish({_adaptive:{moduleId:'a1-foundation',courseStage:'introduce'}},{advanced:false,reason:'Требуется практика'},70);
assert.equal(D.summary().done,4);
assert(!state.learningV8.dailyCourse.finished);
D.onLessonFinish({_adaptive:{moduleId:'a1-foundation',courseStage:'different'}},{advanced:true},100);
assert.equal(D.summary().done,4,'A different course stage cannot pass the day');
D.onLessonFinish({_adaptive:{moduleId:'a1-foundation',courseStage:'introduce'}},{advanced:true},85);
assert.equal(D.summary().done,5);assert(state.learningV8.dailyCourse.finished);
assert.strictEqual(state.learningV8.dailyCourse,startDay);
assert.equal(D.summary().mins,0);
assert.equal(D.answer(0),false,'Finished days cannot advance again');
assert(events.some(x=>x.source==='daily_guided_listening'));
assert(visits.some(x=>x.includes('Аудирование')||x.includes('Слушаем')));
const teacher=read('adaptive-teacher.js'),ui=read('ui-v7.js'),app=read('app.js'),assets=read('sw.js'),boot=read('access.js');
assert(ui.includes("return navigate('daycourse')"),'The continue button must open the full day route');
assert(ui.includes('window.NEDailyCourse?.open?.()'),'Daily route must be dispatched');
assert(teacher.includes('teacherStartDailyModule'),'Daily core cannot select an arbitrary future module');
assert(app.includes('onLessonFinish?.(l,courseOutcome,reward.avg)'),'Daily completion must depend on teacher course evidence');
assert(assets.includes('/daily-course.js?'),'Study day must work in installed PWA');
assert(boot.includes("'daily-course.js'"),'Authenticated bootstrap must load the day controller');
console.log('PASS daily course: 45+ minute plan, sequential questions, no skipping, pending day, failed stage blocks, evidence unlock, PWA entry');
