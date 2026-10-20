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
 assert.equal(value,'часы','Old and newly generated incorrect gloss is repaired');
}
assert.equal(app.acceptedTranslation('часы',session.active[0].translation),true);
const tasks=win.NECardFormPractice.taskList(card);
assert.equal(tasks[1].russianSentence,'Часы висят на стене.');
session.formPractice={started:true,done:false,task:tasks[1],draft:'Klokka',note:'Подсказка открыта: изучи незнакомые слова, затем самостоятельно переведи предложение. После помощи будет ещё одно задание.',misses:0,
 helpOpen:true,hadMistake:true,needsAnother:true,answers:[],taskCount:1};
app.render();
const html=views.at(-1);
assert(!html.includes('Помощь с незнакомыми словами'),'Deprecated full-list translation box must be absent');
assert(!html.includes('Не знаю слово'),'Old separate translation button must be absent');
assert(!html.includes('разное время →'),'Translations cannot be pre-opened as a list');
assert(!html.includes('Подсказка открыта:'),'Saved obsolete notice must be cleared');
assert(html.includes('Перевести слово висят'),'Russian words remain tappable');
assert.equal(session.formPractice.helpOpen,false,'Saved expanded help panel is closed');
assert.equal(session.formPractice.note,'','Stale help note removed');
assert.equal(session.formPractice.draft,'Klokka','Saved partial Norwegian answer preserved');
assert.equal(session.formPractice.needsAnother,true,'Old help must not falsely count independent mastery');
assert.equal(session.formPractice.done,false);
assert.equal(win.NECardFormPractice.unknownWordHints,undefined,'Deprecated list API removed');
assert.equal(app.showUnknownWordHelp,undefined,'Deprecated list action removed');
assert.equal(win.NECardFormPractice.tappedWordGloss(tasks[1],'висят').form_no,'henger');
(async()=>{
 assert.equal(await app.tapUnknownWord(1),true,'Word-specific translation opens on tap');
 const inline=views.at(-1);
 assert(inline.includes('henger</b> — висят'),'Only selected word appears next to sentence');
 assert(!inline.includes('Помощь с незнакомыми словами'));
 assert.equal(state.dailyDictionary.henge.translation_ru,'висеть');
 assert.equal(state.wordPracticeQueue.henge>0,true,'Tapped item added to spaced repetition');
 assert.equal(app.listenTappedWord(),true);
 assert.equal(spoken.at(-1),'henger');
 assert.equal(session.formPractice.draft,'Klokka');
 assert.equal(session.formPractice.done,false);
 console.log('PASS: old multi-word translation panel hidden; one-word tap, dictionary and legacy draft preserved');
})().catch(e=>{console.error(e);process.exitCode=1});
