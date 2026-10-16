// Study day vocabulary: canonical five per calendar day, 15 active, cards/cloze/free speech.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const s={level:'A1',learningV8:{},dailyDictionary:{},srs:{},dailyPacks:{}};
let date='2026-10-16',begins=0,saves=0,spoken='',heard=0;
const views=[],input={livingCloze:{value:''},livingWrite:{value:'Jeg lærer norsk på skolen.'}};
const vocab=Array.from({length:10},(_,i)=>['ord'+i,'значение'+i]);
const lesson={vocab};
const w={
 neLearnerState:s,saveState:()=>saves++,shell:markup=>views.push(markup),
 NECurated:{get:id=>({vocab:Array.from({length:10},(_,i)=>['word-'+id+'-'+i,'значение '+id+' '+i])})},NECurriculum:{modules:()=>Array.from({length:8},(_,i)=>({id:'a1-'+i}))},
 NELivingDay:{details:()=>({moduleId:'a1-foundation',title:'Знакомство',level:'A1',date}),begin:()=>{begins++}},
 NEFunctionalPractice:{getCatalog:()=>({cloze:[
  {id:'p1',level:'A1',sentence:'Hver dag ___ jeg norsk.',answer:'lærer',rule:'Å lære'},
  {id:'p2',level:'A1',sentence:'Hun ___ i Kongsberg.',answer:'bor',rule:'Å bo'},
  {id:'p3',level:'A1',sentence:'Vi har tre ___.',answer:'bøker',rule:'en bok'}]})},
 speakText:async()=>{heard++;return{source:'device'}},
 aiEvaluate:async payload=>({ok:true,data:{accepted:true,score:85,explanation_ru:'Хорошо'}})
};
class SR{
 constructor(){this.lang='';this.interimResults=true}
 start(){this.onresult?.({results:[{isFinal:true,0:{transcript:'Jeg kan snakke norsk på jobben.'}}]});this.onend?.()}
}
w.SpeechRecognition=SR;
const document={getElementById:id=>input[id]||null};
const ctx={window:w,document,Date,Math,Array,String,Number,Object,JSON,Set,Intl};
vm.runInNewContext(read('living-words.js'),ctx);
const D=w.NELivingWords;
(async()=>{
 let session=D.ensure();
 assert(session&&session.newWords.length===5,'A learner receives five new words when the bank permits');
 assert.equal(session.active.length,5);
 assert.equal(Object.keys(s.dailyDictionary).length,5,'New words are stored in existing learned vocabulary');
 assert.strictEqual(D.ensure(),session,'Same date must not create another five words');
 assert.equal(D.isReady(),false,'Cards and production cannot be skipped');
 assert.equal(D.nextCard(true),false,'Cards must first be revealed');
 D.render();assert(views.at(-1).includes('Карточка 1')&&views.at(-1).includes('Активных слов'));
 for(let n=0;n<5;n++){D.reveal();assert.equal(D.nextCard(true),true)}
 assert.equal(session.stage,'cloze');
 assert.equal(D.checkCloze(),false,'Empty cloze answer must not advance');
 for(let n=0;n<3;n++){
  const task=D.clozeSet('A1',date)[n];
  input.livingCloze.value='неверно';
  assert.equal(D.checkCloze(),false);
  assert.equal(session.clozeIndex,n,'Wrong cloze answer must not advance');
  input.livingCloze.value=task.answer.toUpperCase();
  assert.equal(D.checkCloze(),true,'Expected word must match in a normalized input');
 }
 assert.equal(session.stage,'writing');
 await D.checkWriting();assert.equal(session.stage,'speaking','Writing must be independently accepted');
 assert.equal(D.checkSpeaking(),false,'Typing cannot count as voice');
 assert.equal(D.recordSpeech(),true);assert(session.speechText.includes('Jeg kan snakke'));
 await D.checkSpeaking();assert.equal(D.isReady(),true);
 assert.equal(begins,1,'After one coherent warmup return to full Nora teacher');
 assert(Object.keys(s.dailyDictionary).length===5);
 for(let n=1;n<=3;n++){
  date='2026-10-'+String(16+n).padStart(2,'0');
  session=D.ensure();
  assert.equal(session.newWords.length,5,'Five new items per day '+n);
  assert(session.active.length<=15,'Exactly a max of fifteen active words');
  assert.strictEqual(D.ensure(),session,'Date '+date+' must be idempotent');
 }
 assert.equal(s.learningV8.livingVocabulary.active.length,15);
 assert.equal(Object.keys(s.dailyDictionary).length,20,'Older learned entries must remain archived');
 assert(saves>4);
 const access=read('access.js'),sw=read('sw.js'),lexicon=read('lexicon.js'),teacher=read('living-day.js');
 assert(access.includes("'living-words.js'")&&sw.includes('/living-words.js?v=8.3.0-lesson17'));
 assert(teacher.includes('NELivingWords.isReady()'),'Main route must check whether warmup is complete');
 assert(lexicon.includes("livingVocabulary?.days?.[date]?.newWords"),'Separate optional daily section cannot award another five new words');
 console.log('PASS daily vocabulary: learned-first cards, five per day, 15 active, archive, cloze, writing, recognized oral phrase');
})().catch(err=>{console.error(err);process.exitCode=1});
