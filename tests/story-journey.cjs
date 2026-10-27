// Story renewal regression checks: varied dialogue, safe fallback and fair progression.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const story=read('story-journey.js'),advanced=read('story-journey-advanced.js'),guided=read('guided-speaking.js'),curriculum=read('curriculum-v8.js');
const w={freeEx:()=>'<original>',checkFree:()=>null};
vm.runInNewContext(advanced,{window:w});
vm.runInNewContext(story,{window:w});
vm.runInNewContext(guided,{window:w});
const ids=[...curriculum.matchAll(/\['([ab][12]-[^']+)','/g)].map(x=>x[1]);
assert.equal(ids.length,32,'Exact course roster must remain 32 modules');
const pairs=ids;
for(const moduleId of pairs){
 const original=w.NEGuidedSpeaking.definition({_adaptive:{moduleId}});
 assert(original.steps.length>=3,'existing module lost '+moduleId);
 const variants=[];
 for(const storyVariant of [1,2]){
  const d=w.NEGuidedSpeaking.definition({_adaptive:{moduleId,storyVariant}});
  assert(d.actor&&d.opening&&d.scene&&d.steps.length>=3,moduleId+' incomplete');
  assert(d.steps.every(step=>step.goal.length>=20&&step.task.length>=12&&step.reply.length>=4),moduleId+' broken turn');
  assert.notEqual(d.opening,original.opening,moduleId+' repeats original');
  variants.push(d.opening);
 }
 assert.notEqual(variants[0],variants[1],moduleId+' repeats another variant');
}
assert.equal(w.NEGuidedSpeaking.definition({_adaptive:{moduleId:'a1-time'}}).opening,
 w.NEGuidedSpeaking.definition({_adaptive:{moduleId:'a1-time',storyVariant:0}}).opening,
 'Saved old conversations must remain unchanged');
assert(read('adaptive-teacher.js').includes('storyVariant,origin:source'),'Variant missing from lesson metadata');
assert(read('access.js').includes("'story-journey-advanced.js','story-journey.js','visual-world.js','guided-speaking.js'"),'Scripts load in wrong order');
assert(read('sw.js').includes('/story-journey.js?v=8.3.0-story1')&&read('sw.js').includes('/story-journey-advanced.js?v=8.3.0-story2'),'Offline story asset missing');
(async()=>{
 const lesson={id:'story-a1-time',level:'A1',_adaptive:{moduleId:'a1-time',storyVariant:1}};
 const session={lesson,locked:false};
 const field={value:'Torsdag klokka fire passer for meg.',dataset:{fromVoice:'true',guidedTurn:'0'},focus(){}};
 const feedback={isConnected:true,innerHTML:''},nodes={freeAnswer:field,freeFb:feedback};
 const attempts=[];
 Object.assign(w,{neLessonSession:session,neLearnerState:{},
  aiEvaluate:async()=>({ok:true,data:{accepted:true,score:78,issues:[{category:'spelling',source_fragment:'fire',deduction:22,explanation_ru:'Проверь формулировку.'}],explanation_ru:'Смысл понятен.'}}),
  trackLessonScore:()=>{},NEAdaptive:{recordAttempt:(_s,a)=>attempts.push(a)},saveState:()=>{},
  persistLessonCheckpoint:()=>{},speakText:()=>{}
 });
 // The guided checker uses the current document, not a hardcoded school-style form.
 const ctx={window:w,document:{getElementById:id=>nodes[id]||null},esc:x=>String(x)};
 vm.runInNewContext(guided,ctx,{filename:'guided-speaking.js'});
 const ui=w.freeEx(lesson,'speaking');
 assert(ui.includes('Нора предлагает встретиться'),'A1 episode does not reach spoken lesson');
 await w.checkFree('speaking');
 assert.equal(session.locked,true,'Understandable 78/100 answer should advance');
 assert(session.guidedSpeech.pending,'Accepted turn is missing the next conversational response');
 assert.equal(attempts[0].score,78,'Store actual score, do not give unearned 100');
 assert(feedback.innerHTML.includes('Следующая реплика'),'Story lacks onward momentum');
 assert(feedback.innerHTML.includes('bussen'),'Scripted surprise lost its context');
 console.log('PASS story renewal: 64 authored variants across 32 modules, legacy stability, 78/100 acceptance, offline wiring');
})().catch(e=>{console.error(e);process.exitCode=1});