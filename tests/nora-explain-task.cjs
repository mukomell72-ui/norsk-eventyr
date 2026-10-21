// Contextual help must not award exercise credit or expose the model answer.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const date='2026-10-20',word={word:'kunne',translation:'мочь, уметь',key:'kunne'};
const record={date,level:'A1',moduleId:'a1-time',active:[word],newWords:[word],
 stage:'cards',cardsSeen:0,cardQueue:[0],cardFeedback:{correct:true,answer:'мочь'},
 miniRound:null,miniRounds:{},deferredWords:[],cardAttempted:{},ready:false,feedback:''};
const state={level:'A1',learningV8:{livingVocabulary:{days:{[date]:record},active:[word]}},
 dailyDictionary:{},srs:{},dailyPacks:{}};
const views=[],payloads=[];let saved=0,reply=null;
const win={neLearnerState:state,saveState:()=>saved++,shell:html=>views.push(html),
 NELivingDay:{details:()=>({date,level:'A1',moduleId:'a1-time',title:'Помощь'})},
 aiEvaluate:async input=>{payloads.push(input);return reply?reply(input):{ok:true,data:{
  kind:'explain_task',explanation_ru:'Перфект описывает прошлое с результатом сейчас.',
  rule_ru:'har + причастие прошедшего времени',steps_ru:['Найди подлежащее','Поставь har','Выбери причастие'],
  example_no:'Jeg har jobbet.',example_ru:'Я поработал.',next_step_ru:'Попробуй самостоятельно.'
 }}}};
const document={getElementById:id=>id==='livingFormAnswer'?{value:record.formPractice?.draft||''}:null};
const ctx={window:win,document,Date,Math,Array,String,Number,Object,JSON,Set,Intl};
for(const file of ['card-grammar.js','card-form-practice.js','living-words.js'])
 vm.runInNewContext(read(file),ctx,{filename:file});
const app=win.NELivingWords;
record.formPractice={started:true,done:false,task:{
 kind:'sentence',word:'kunne',lemma:'kunne',type:'verb',label:'Перфект (har + причастие)',
 prompt:'Переведи на норвежский: «Я мог тебе помогать».',
 russianSentence:'Я мог тебе помогать.',modelAnswer:'Jeg har kunnet hjelpe deg.',
 requiredForm:'har kunnet',index:3},draft:'',misses:0,answers:[]};
(async()=>{
 app.render();
 assert(views.at(-1).includes('Нора, объясни мне'),'Help button must be visible under the task');
 assert(!views.at(-1).includes('Jeg har kunnet hjelpe deg.'),'Model answer hidden before trying');
 assert.equal(await app.explainForm(),true);
 assert.equal(payloads.length,1);
 assert.equal(payloads[0].action,'explain_task');
 assert.equal(payloads[0].attempts,0);
 assert.equal(payloads[0].learner_answer,'','No answer sent before grading');
 assert(views.at(-1).includes('Перфект описывает прошлое'));
 assert(views.at(-1).includes('Jeg har jobbet.'),'Unrelated example visible');
 assert(!views.at(-1).includes('Jeg har kunnet hjelpe deg.'));
 assert.equal(record.formPractice.done,false);
 assert.equal(record.cardsSeen,0);
 assert.equal(record.formPractice.misses,0);
 assert.equal(record.formPractice.hadMistake,undefined);
 assert(saved>0,'The exercise and help are saved');
 assert.equal(await app.explainForm(),true,'Second click collapses explanation');
 assert(!views.at(-1).includes('Перфект описывает прошлое'));
 assert.equal(await app.explainForm(),true,'Third click reopens without a second paid request');
 assert.equal(payloads.length,1);
 record.formPractice.misses=1;record.formPractice.draft='Jeg kunne';
 reply=()=>({ok:false,error:'NETWORK'});
 assert.equal(await app.explainForm(),false);
 assert(views.at(-1).includes('краткая подсказка без ИИ'));
 assert.equal(record.formPractice.draft,'Jeg kunne','Network failure cannot discard text');
 assert.equal(record.formPractice.done,false);
 assert.equal(record.formPractice.misses,1);
 // A delayed reply cannot attach an explanation to a different exercise.
 record.formPractice.noraExplanation=null;
 let resolveReply;reply=()=>new Promise(resolve=>{resolveReply=resolve});
 const promise=app.explainForm();
 assert.equal(record.formPractice.noraExplanation.status,'loading');
 record.formPractice.task={...record.formPractice.task,index:1};
 resolveReply({ok:true,data:{kind:'explain_task',explanation_ru:'Старая подсказка',rule_ru:'Х',steps_ru:['X']}});
 assert.equal(await promise,false);
 assert(!String(record.formPractice.noraExplanation.explanation_ru||'').includes('Старая подсказка'));
 const api=read('api/evaluate.js');
 assert(api.includes('action==="explain_task"'));
 assert(api.includes('EXPLANATION_REVEALS_ANSWER'));
 assert(api.includes('reference_example:reveal?reference:null'));
 assert(read('sw.js').includes('feedback2-explain1'),'Updated PWA cache');
 console.log('PASS Nora explanations: before-attempt protection, AI/offline modes, drafts, no artificial completion');
})().catch(e=>{console.error(e);process.exitCode=1});