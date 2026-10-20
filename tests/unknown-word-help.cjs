// Regression: learner can request verified word help without skipping practice.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const date='2026-10-20',bad='в ... часов';
const card={word:'klokke',translation:bad,key:'klokke',newToday:true};
const day={date,level:'A1',moduleId:'a1-time',newWords:[card],active:[card],cardsSeen:0,cardQueue:[0],
 cardDraft:'',cardFeedback:{correct:true,answer:'часы'},formPractice:null,cardAttempted:{},deferredWords:[],
 miniRound:null,miniRounds:{},stage:'cards',feedback:'',ready:false};
const state={level:'A1',learningV8:{livingVocabulary:{days:{[date]:day},active:[{word:'klokke',translation:bad}]}},
 dailyDictionary:{klokke:{lemma:'klokke',translation_ru:bad}},srs:{klokke:{word:'klokke',translation:bad}},
 dailyPacks:{[date]:{words:[{lemma:'klokke',translation_ru:bad}]}}};
const views=[],spoken=[];
const win={neLearnerState:state,saveState:()=>{},shell:html=>views.push(html),
 NELivingDay:{details:()=>({moduleId:'a1-time',title:'Время',level:'A1',date})},
 speakText:(term)=>spoken.push(term)};
const ctx={window:win,document:{getElementById:()=>null},Date,Math,Array,String,Number,Object,JSON,Set,Intl};
for(const file of ['card-grammar.js','card-form-practice.js','living-words.js'])vm.runInNewContext(read(file),ctx,{filename:file});
const app=win.NELivingWords,session=app.ensure();
for(const value of [session.active[0].translation,state.learningV8.livingVocabulary.active[0].translation,
 state.dailyDictionary.klokke.translation_ru,state.srs.klokke.translation,state.dailyPacks[date].words[0].translation_ru]){
 assert.equal(value,'часы / наручные часы','Old and newly generated incorrect gloss is repaired');
}
assert.equal(app.acceptedTranslation('часы',session.active[0].translation),true);
const tasks=win.NECardFormPractice.taskList(card);
assert.equal(tasks[1].russianSentence,'Часы висят на стене.');
session.formPractice={started:true,done:false,task:tasks[1],draft:'',note:'',misses:0,
 hadMistake:false,needsAnother:false,answers:[],taskCount:1};
app.render();
assert(views.at(-1).includes('Не знаю слово'));
assert.equal(app.showUnknownWordHelp(),true);
assert.equal(session.formPractice.needsAnother,true);
assert.equal(session.formPractice.done,false);
assert(state.wordPracticeQueue.klokke,'Assisted word must join the review queue');
assert(views.at(-1).includes('висят')&&views.at(-1).includes('henger'));
assert(views.at(-1).includes('на стене')&&views.at(-1).includes('på veggen'));
assert.equal(app.listenUnknownWord(0),true);
assert.equal(spoken.at(-1),'henger');
assert.equal(app.studyVerifiedExample(),true);
assert.notEqual(session.formPractice.task.index,1,'A fully revealed example must be followed by a new task');
assert.equal(session.formPractice.done,false,'A revealed answer must not count as mastery');
assert(views.at(-1).includes('Klokka henger på veggen.'));
console.log('PASS: unknown-word help, pronunciation, persisted clock repair, review and non-skippable practice');
