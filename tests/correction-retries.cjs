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
// The shared reviewer includes regular-expression braces; extract it as one contiguous module.
const teachingReview=app.slice(app.indexOf('function noraAttemptReviewHtml('),app.indexOf('function lessonFeedbackSummary('));
assert(teachingReview.includes('function aiLessonFeedbackHtml('));
const originals=teachingReview+'\n'+['fullyCorrectAnswer','storyAcceptedAnswer','firstGrade','firstGradeNote','retryCoachFeedback','reviseCheckedAnswer','checkDialogue'].map(n=>extract(n,n==='checkDialogue')).join('\n');
let grades=0,focuses=0;
let display={innerHTML:'',isConnected:true},input={value:'Jeg kan ikke komme på lørdag.',dataset:{fromVoice:'false'},focus(){focuses++;}};
let session={lesson:{level:'A1',id:'sample'},dialogueIndex:0,locked:true,firstGraded:{}};
const el=id=>id==='dialogAnswer'?input:id==='dialogFb'?display:null;
const ctx={Math,Number,Object,Array,String,document:{getElementById:el},lessonSession:session,esc:s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),window:{NEExperience:{}},persistLessonCheckpoint(){},firstGradeTrace:[],trackLessonScore(){grades++},saveLessonDraft(){},flushLessonDraft(){},currentDialogueTurn:()=>({phrase:'Passer det?',goal:'Предложи другое время'}),aiEvaluate:async()=>({ok:true,data:{accepted:true,score:100,issues:[],explanation_ru:'Верно.',corrected:''}}),aiLessonFeedbackHtml:()=>'',};
vm.runInNewContext(originals+'\nthis.run={noraAttemptReviewHtml,aiLessonFeedbackHtml,fullyCorrectAnswer,firstGrade,firstGradeNote,retryCoachFeedback,reviseCheckedAnswer,checkDialogue};',ctx);
const a=ctx.run;
assert.equal(a.fullyCorrectAnswer({accepted:true,score:60,issues:[{category:'verb_form'}]}),false,'Meaningful but imperfect responses are not finished');
assert.equal(a.fullyCorrectAnswer({accepted:true,score:100,issues:[]}),true,'Verified mistake-free responses can finish');
assert.equal(a.fullyCorrectAnswer({accepted:true,score:100,issues:[{category:'task'}]}),false,'Issue prevents completion even when score is inconsistent');
a.firstGrade(session,'dialogue:0:false',40,()=>grades++);
assert.equal(grades,1);
assert(a.firstGradeNote(session,'dialogue:0:false').includes('40/100'));
assert(a.retryCoachFeedback({score:100,issues:[],explanation_ru:'Исправил.'},true).includes('100/100'));
assert(!a.retryCoachFeedback({score:100,issues:[],explanation_ru:'Исправил.'},true).includes('Исправил.'));
assert(a.retryCoachFeedback({score:78,issues:[{category:'task'}],explanation_ru:'Вопрос неясен.'},true).includes('есть что улучшить'));
const reviewed={accepted:true,score:75,issues:[{category:'word_order',source_fragment:'jeg på fredag',
 deduction:25,explanation_ru:'После обстоятельства времени нужен глагол на втором месте.',
 corrected_fragment:'på fredag kan jeg'}],
 corrected:'På fredag kan jeg møtes.',
 strengths_ru:['«kan jeg» — модальный глагол помогает выразить возможность.',
  '«mørgen» — несуществующий фрагмент, который Нора не должна хвалить.']};
const review=a.noraAttemptReviewHtml(reviewed,{
 answer:'Jeg kan jeg på fredag.',ok:true,firstScore:40,isCorrection:true
});
assert(review.includes('Что хорошо и почему'),'Corrected response explains verified strengths');
assert(review.includes('Что неправильно и почему'),'Corrected response names verified errors');
assert(review.includes('Почему:'),'Corrected response explains WHY');
assert(review.includes('Как исправить:'),'Corrected response shows a specific correction');
assert(review.includes('75/100')&&review.includes('40/100'),'Original and current grades remain distinct');
assert(!review.includes('mørgen'),'Praise with invented Norwegian wording must not be shown');
assert(review.includes('jeg på fredag'),'Exact original mistake is shown');
const htmlSafe=a.noraAttemptReviewHtml({
 accepted:false,score:40,issues:[{category:'vocabulary',source_fragment:'abc',deduction:20,
 explanation_ru:'<script>alert(1)</script>',corrected_fragment:'bedre ord'}]
},{answer:'abc',ok:false});
assert(!htmlSafe.includes('<script>'),'Feedback must escape AI-generated HTML');
const first=a.aiLessonFeedbackHtml({...reviewed,accepted:true},'✓ Задача выполнена','Jeg kan jeg på fredag.');
assert(first.includes('Что хорошо и почему')&&first.includes('Что неправильно и почему'),
 'First attempts receive the same breakdown as corrected answers');
a.reviseCheckedAnswer('dialogue');
assert.equal(session.locked,false,'Retry must unlock accepted dialogue');
assert.equal(focuses,1,'Input should be focused for correction');
assert(display.innerHTML.includes('Измени текст'));
(async()=>{
 ctx.aiEvaluate=async()=>({ok:true,data:{accepted:true,score:60,issues:[{
  category:'task',requirement_quote:'Предложи другое время',deduction:40,
  explanation_ru:'Отказ есть, но нужно предложить другое время.',
  corrected_fragment:'Passer det på søndag?'
 }],corrected:'Jeg kan ikke komme på lørdag. Passer det på søndag?'}});
 await a.checkDialogue();
 assert.equal(session.locked,false,'A clear but flawed 60/100 response must remain editable');
 assert(display.innerHTML.includes('60/100')&&display.innerHTML.includes('Отказ есть'),
  'Student receives a precise reason before another check');
 assert(!display.innerHTML.includes('Дальше →'),'A flawed answer cannot advance');
 input.value='Jeg kan ikke komme på lørdag. Passer det på søndag?';
 ctx.aiEvaluate=async()=>({ok:true,data:{accepted:true,score:100,issues:[],explanation_ru:'Верно.',corrected:''}});
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
 assert(sw.includes('norsk-eventyr-v8-3-0-story2-lesson24'),'Offline cache must represent the current story bundle');
 assert(sw.includes('cache:"no-cache"'),'Updated PWA must request fresh app scripts on revisits');
 console.log('PASS AI correction retries: editable, first grade unchanged, latest score shown, refresh ready');
})().catch(e=>{console.error(e);process.exitCode=1;});
