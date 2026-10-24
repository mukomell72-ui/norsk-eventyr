'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const api=fs.readFileSync(path.join(root,'api/evaluate.js'),'utf8');
const src=fs.readFileSync(path.join(root,'access.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
function extract(name,async=false){
 const signature=(async?'async ':'')+'function '+name+'(';
 const start=app.indexOf(signature);
 assert(start>=0,'Missing '+signature);
 const brace=app.indexOf('{',start);
 let quote='',escaped=false,depth=0;
 for(let i=brace;i<app.length;i++){
  const c=app[i];
  if(quote){
   if(escaped){escaped=false;continue;}
   if(c==='\\'){escaped=true;continue;}
   if(c===quote)quote='';
   continue;
  }
  if(c==='"'||c==="'"||c==='\x60'){quote=c;continue;}
  if(c==='{')depth++;
  if(c==='}'&&--depth===0)return app.slice(start,i+1);
 }
 throw Error('Unclosed function '+name);
}
const originals=['firstGrade','firstGradeNote','retryCoachFeedback','reviseCheckedAnswer','checkDialogue'].map(n=>extract(n,n==='checkDialogue')).join('\n');
let grades=0,focuses=0;
let display={innerHTML:'',isConnected:true},input={value:'Jeg kan ikke komme på lørdag.',dataset:{fromVoice:'false'},focus(){focuses++;}};
let session={lesson:{level:'A1',id:'sample'},dialogueIndex:0,locked:true,firstGraded:{}};
const el=id=>id==='dialogAnswer'?input:id==='dialogFb'?display:null;
const ctx={Math,Number,Object,Array,String,document:{getElementById:el},lessonSession:session,esc:s=>String(s),window:{NEExperience:{}},persistLessonCheckpoint(){},firstGradeTrace:[],trackLessonScore(){grades++},currentDialogueTurn:()=>({phrase:'Passer det?',goal:'Предложи другое время'}),aiEvaluate:async()=>({ok:true,data:{accepted:true,score:100,issues:[],explanation_ru:'Верно.',corrected:''}}),aiLessonFeedbackHtml:()=>'',};
vm.runInNewContext(originals+'\nthis.run={firstGrade,firstGradeNote,retryCoachFeedback,reviseCheckedAnswer,checkDialogue};',ctx);
const a=ctx.run;
a.firstGrade(session,'dialogue:0:false',40,()=>grades++);
assert.equal(grades,1);
assert(a.firstGradeNote(session,'dialogue:0:false').includes('40/100'));
assert(a.retryCoachFeedback({score:100,issues:[],explanation_ru:'Исправил.'},true).includes('100/100'));
assert(!a.retryCoachFeedback({score:100,issues:[],explanation_ru:'Исправил.'},true).includes('Исправил.'));
assert(a.retryCoachFeedback({score:78,issues:[{category:'task'}],explanation_ru:'Вопрос неясен.'},true).includes('есть что улучшить'));
a.reviseCheckedAnswer('dialogue');
assert.equal(session.locked,false,'Retry must unlock accepted dialogue');
assert.equal(focuses,1,'Input should be focused for correction');
assert(display.innerHTML.includes('Измени текст'));
(async()=>{
 await a.checkDialogue();
 assert.equal(grades,1,'Retry must not change first grade or XP evidence');
 assert.equal(session.firstGraded['dialogue:0:false'],40,'First grade remains');
 assert(display.innerHTML.includes('Исправить ещё'),'Corrected answer must still allow another correction');
 assert(display.innerHTML.includes('100/100'),'Current grade should be visible');
 assert(display.innerHTML.includes('40/100'),'First grade must remain visible');
 a.reviseCheckedAnswer('dialogue');
 await a.checkDialogue();
 assert.equal(grades,1,'Third submission must remain formative');
 assert.equal(session.locked,true,'After success, continue/revise choice awaits click');
 assert(api.includes('previous_suggestion'),'Previous teaching example should travel to evaluator');
 assert(api.includes('copiedSuggestion'),'Correction must be assessed consistently');
 assert(app.includes('>Исправить ещё</button>'),'Accepted speaking or dialogue response must allow rewrites');
 assert(src.includes("LESSON_PATCH='-lesson24'"),'Fresh lesson assets must be selected');
 assert(index.includes('8.3.0-lesson24'),'Fresh bootstrap must load on mobile');
 assert(sw.includes('norsk-eventyr-v8-3-0-lesson24'),'Existing offline version should remain compatible');
 assert(sw.includes('cache:"no-cache"'),'Updated PWA must request fresh app scripts on revisits');
 console.log('PASS AI correction retries: editable, first grade unchanged, latest score shown, refresh ready');
})().catch(e=>{console.error(e);process.exitCode=1;});
