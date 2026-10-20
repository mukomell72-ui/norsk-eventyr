// Integration regression: sentence feedback names the actual wrong words.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const date='2026-10-20',word={word:'klokke',translation:'часы',key:'klokke',newToday:true};
const day={date,level:'A1',moduleId:'a1-time',active:[word],newWords:[word],stage:'cards',
 cardQueue:[0],cardsSeen:0,cardDraft:'',cardFeedback:{correct:true,answer:'часы'},
 formPractice:null,cardAttempted:{},deferredWords:[],miniRound:null,miniRounds:{},feedback:'',ready:false};
const state={level:'A1',learningV8:{livingVocabulary:{days:{[date]:day},active:[word]}},
 dailyDictionary:{klokke:{lemma:'klokke',translation_ru:'часы'}},srs:{},dailyPacks:{}};
const views=[],input={value:'Det er flere klokka i butiken'};let saves=0,aiCalls=0;
const win={neLearnerState:state,saveState:()=>saves++,shell:html=>views.push(html),
 NELivingDay:{details:()=>({moduleId:'a1-time',title:'Время',level:'A1',date})},
 speakText:()=>{},aiEvaluate:async()=>{aiCalls++;return {ok:true,data:{
 accepted:true,score:100,explanation_ru:'Верно.'}}}};
const ctx={window:win,document:{getElementById:id=>id==='livingFormAnswer'?input:null},
 Date,Math,Array,String,Number,Object,JSON,Set,Intl};
for(const file of ['card-grammar.js','card-form-practice.js','living-words.js'])
 vm.runInNewContext(read(file),ctx,{filename:file});
const E=win.NECardFormPractice,D=win.NELivingWords;
const task=E.taskList(word)[2];
day.formPractice={started:true,done:false,task,draft:input.value,note:'',misses:0,
 hadMistake:false,needsAnother:false,answers:[],taskCount:1};
(async()=>{
 const result=await D.checkForm();
 assert.equal(result,false);
 assert.equal(aiCalls,0,'Concrete local mistakes must be explained without an API call');
 const p=day.formPractice;
 assert(p.note.includes('«klokka» → «klokker»'),p.note);
 assert(p.note.includes('«butiken» → «butikken»'),p.note);
 assert(p.note.includes('после «flere»'),p.note);
 assert(!p.note.includes('Недостаточно написать одно слово'),p.note);
 assert.equal(p.draft,input.value,'Do not discard what the learner typed');
 assert.equal(p.misses,1);
 assert.equal(p.done,false);
 assert(state.wordPracticeQueue.klokke,'Mistake must enter review queue');
 assert(views.at(-1).includes('klokka')&&views.at(-1).includes('butikken'),
   'Rendered screen must include both actual corrections');
 input.value='Det er flere klokker i butikken.';
 const corrected=await D.checkForm();
 assert.equal(corrected,true);
 assert.equal(aiCalls,1,'Correct answer proceeds to Nora meaning assessment');
 assert(p.note.includes('Исправление принято!'));
 assert.notEqual(p.task.index,2,'Following a corrected mistake a different task must follow');
 assert.equal(p.draft,'','Only successfully completed exercise resets the draft');
 // Valid non-literal answers are not rejected as spelling mistakes.
 p.task=task;p.done=false;p.misses=0;p.needsAnother=false;p.draft='';p.answers=[];
 input.value='Det er flere klokker i butikkene.';
 assert.equal(await D.checkForm(),true);
 assert.equal(aiCalls,2,'Natural alternatives reach the semantic evaluator');
 assert(saves>=3);
 console.log('PASS exact two-error feedback, saved draft, repeat, correction and synonyms');
})().catch(e=>{console.error(e);process.exitCode=1});
