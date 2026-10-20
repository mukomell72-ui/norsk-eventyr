// Each Russian word can be tapped without granting artificial exercise credit.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const date='2026-10-20';
const entry={word:'klokke',translation:'часы',key:'klokke',newToday:true};
const rec={date,level:'A1',moduleId:'a1-time',active:[entry],newWords:[entry],
 stage:'cards',cardsSeen:0,cardQueue:[0],cardFeedback:{correct:true,answer:'часы'},cardDraft:'',
 miniRound:null,miniRounds:{},deferredWords:[],cardAttempted:{},ready:false,feedback:''};
const state={level:'A1',learningV8:{livingVocabulary:{days:{[date]:rec},active:[entry]}},
 dailyDictionary:{klokke:{lemma:'klokke',translation_ru:'часы'}},srs:{},dailyPacks:{}};
const views=[],spoken=[],requests=[];
let saves=0,networkResponse={ok:true,word:{ok:true,lemma_no:'ligge',form_no:'ligger',
 translation_ru:'лежать',grammar_ru:'Настоящее время.'}};
const win={neLearnerState:state,saveState:()=>{saves++},shell:html=>views.push(html),
 NELivingDay:{details:()=>({date,level:'A1',moduleId:'a1-time',title:'Время'})},
 speakText:w=>spoken.push(w),NEAccess:{headers:()=>({'x-ne-device-id':'test-device'})}};
const fetch=async(path,opts)=>{
 requests.push({path,opts,body:JSON.parse(opts.body)});
 return {ok:networkResponse.ok,json:async()=>networkResponse.word};
};
const ctx={window:win,document:{getElementById:id=>id==='livingFormAnswer'?{value:rec.formPractice?.draft||''}:null},
 Date,Math,Array,String,Number,Object,JSON,Set,Intl,fetch};
for(const f of ['card-grammar.js','card-form-practice.js','living-words.js'])
 vm.runInNewContext(read(f),ctx,{filename:f});
const app=win.NELivingWords,E=win.NECardFormPractice,task=E.taskList(entry)[1];
assert.equal(task.russianSentence,'Часы висят на стене.');
rec.formPractice={started:true,done:false,task,draft:'Klokka',note:'',misses:0,hadMistake:false,
 needsAnother:false,answers:[],taskCount:1};
(async()=>{
 app.render();
 for(const word of ['Часы','висят','на','стене'])
  assert(views.at(-1).includes('Перевести слово '+word),'Sentence token must be tappable: '+word);
 assert(!views.at(-1).includes('henger</b> — висят'),'Hint hidden until selected');
 assert.equal(await app.tapUnknownWord(1),true);
 assert(views.at(-1).includes('henger</b> — висят'));
 assert(views.at(-1).includes('henge'),'The lemma is shown for study');
 assert(views.at(-1).includes('В словаре'),'Saved status visible beside selected word');
 assert.equal(state.dailyDictionary.henge.translation_ru,'висеть');
 assert.equal(state.srs.henge.word,'henge');
 assert(state.wordPracticeQueue.henge,'Tapped words queued for spaced practice');
 assert.equal(rec.formPractice.draft,'Klokka','Incomplete answer must survive opening a translation');
 assert.equal(rec.formPractice.done,false,'A hint must not complete exercise');
 assert.equal(rec.formPractice.needsAnother,true,'Use of a hint must still require an independent task');
 assert.equal(app.listenTappedWord(),true);
 assert.equal(spoken.at(-1),'henger');
 const seen=state.dailyDictionary.henge.exposures;
 assert.equal(await app.tapUnknownWord(1),true);
 assert.equal(state.dailyDictionary.henge.exposures,seen,'Repeated tap must not create duplicate exposures');
 assert.equal(requests.length,0,'Reviewed examples should reveal immediately without a network call');
 assert.equal(await app.tapUnknownWord(3),true);
 assert.equal(state.dailyDictionary.vegg.translation_ru,'стена');
 assert(views.at(-1).includes('veggen</b> — стене'),'Contextual form must show beside clicked word');
 rec.formPractice.task={...task,russianSentence:'Сегодня я лежу здесь.',modelAnswer:'I dag ligger jeg her.'};
 rec.formPractice.wordTapHints={};rec.formPractice.wordTap=null;
 app.render();
 assert.equal(await app.tapUnknownWord(2),true);
 assert.equal(requests.length,1,'Non-curated word must use existing evaluate endpoint');
 assert.equal(requests[0].path,'/api/evaluate');
 assert.equal(requests[0].body.action,'word_lookup');
 assert.equal(requests[0].body.selected_word,'лежу');
 assert.equal(requests[0].body.reference_no,'I dag ligger jeg her.');
 assert.equal(state.dailyDictionary.ligge.translation_ru,'лежать');
 assert(views.at(-1).includes('ligger</b> — лежу'));
 assert.equal(await app.tapUnknownWord(2),true);
 assert.equal(requests.length,1,'Same word lookup should be cached in exercise state');
 rec.formPractice.task={...task,russianSentence:'Сегодня я отдыхаю дома.',modelAnswer:'I dag slapper jeg av hjemme.'};
 rec.formPractice.wordTap=null;rec.formPractice.wordTapHints={};
 networkResponse={ok:false,word:{error:'WORD_NOT_ALIGNED'}};
 assert.equal(await app.tapUnknownWord(2),false);
 assert(views.at(-1).includes('Ничего не сохранено'));
 assert(views.at(-1).includes('Онлайн-перевод временно недоступен'),
  'Server outage must not masquerade as an incorrect Norwegian translation');
 assert.equal(state.dailyDictionary.slappe,undefined,'Rejected uncertain hints must never enter dictionary');
 // Regression from a real saved card: the old wording implied a wristwatch
 // even though the verified Bokmål reference only said "ei klokke".
 const legacy={...E.taskList(entry)[0],russianSentence:'У меня есть наручные часы.',
  prompt:'Переведи на норвежский: «У меня есть наручные часы.»',
  modelAnswer:'Jeg har ei klokke.'};
 const wrist=E.tappedWordGloss(legacy,'наручные');
 assert.equal(wrist.lemma_no,'armbåndsur','A tapped wristwatch has a real Bokmål lemma');
 assert.equal(wrist.translation_ru,'наручные часы');
 assert.equal(wrist.form_no,'et armbåndsur');
 assert.equal(E.taskList(entry)[0].russianSentence,'У меня есть часы.','New prompts must match their model translation');
 rec.formPractice.task=legacy;
 rec.formPractice.draft='Jeg har';
 rec.formPractice.wordTap={index:3,status:'error'};
 rec.formPractice.wordTapHints={};
 app.render();
 assert.equal(rec.formPractice.task.russianSentence,'У меня есть часы.',
  'Saved inaccurate task must be migrated to correct wording');
 assert.equal(rec.formPractice.draft,'Jeg har','Migration must preserve an unfinished translation');
 assert.equal(rec.formPractice.wordTap,null,'Obsolete failure bubble is discarded');
 assert(!views.at(-1).includes('Перевод не подтверждён.'));
 assert(views.at(-1).includes('Перевести слово часы'),'Migrated prompt supports instant tap');
 const before=requests.length;
 assert.equal(await app.tapUnknownWord(2),true); // "есть" is a part of "у меня есть"
 assert(views.at(-1).includes('jeg har</b> — у меня есть'),'Idiomatic Russian phrase shown as one unit');
 assert.equal(state.dailyDictionary.ha.translation_ru,'иметь');
 assert.equal(await app.tapUnknownWord(3),true);
 assert(views.at(-1).includes('ei klokke</b> — часы'));
 assert(state.wordPracticeQueue.klokke,'Clock noun is retained for review');
 assert.equal(requests.length,before,'Curated Russian words do not need flaky remote AI');
 assert.equal(rec.formPractice.draft,'Jeg har');
 // Screenshot regression: no online failure for "Часы показывают разное время."
 const clockTasks=E.taskList(entry);
 assert.equal(clockTasks.length,4);
 const wordSets=[
  ['у','меня','есть','часы'],
  ['часы','висят','на','стене'],
  ['в','магазине','несколько','часов'],
  ['часы','показывают','разное','время']
 ];
 for(let i=0;i<clockTasks.length;i++){
  assert.equal(wordSets[i].join(' '),
   (clockTasks[i].russianSentence.match(/[А-Яа-яЁё]+/gu)||[]).join(' ').toLocaleLowerCase('ru-RU'));
  for(const russian of wordSets[i])
   assert(E.tappedWordGloss(clockTasks[i],russian)?.lemma_no,
    'No verified offline gloss: '+clockTasks[i].russianSentence+' / '+russian);
 }
 rec.formPractice.task=clockTasks[3];
 rec.formPractice.draft='Klokkene';
 rec.formPractice.wordTap={index:0,status:'error'};
 rec.formPractice.wordTapHints={};
 app.render();
 assert.equal(rec.formPractice.wordTap,null,'Obsolete failed lookup must disappear on update');
 assert(!views.at(-1).includes('Перевод не подтверждён'));
 const remoteBefore=requests.length;
 for(const [index,lemma,form,ru] of [
  [0,'klokke','klokkene','часы'],[1,'vise','viser','показывать'],
  [2,'forskjellig','forskjellig','разный'],[3,'tid','tid','время']
 ]){
  assert.equal(await app.tapUnknownWord(index),true,
   'Tap must work offline for index '+index);
  assert.equal(rec.formPractice.wordTap.entry.form_no,form);
  assert.equal(state.dailyDictionary[lemma].translation_ru,ru);
  assert(state.wordPracticeQueue[lemma],'New word '+lemma+' must be queued for repeat');
 }
 assert.equal(requests.length,remoteBefore,'All clock prompt tokens bypass flaky network');
 assert.equal(rec.formPractice.draft,'Klokkene','Partial text must survive multiple taps');
 assert.equal(rec.formPractice.done,false,'Hints do not count as completion');
 rec.formPractice.task=clockTasks[2];
 rec.formPractice.wordTap=null;
 rec.formPractice.wordTapHints={};
 assert.equal(await app.tapUnknownWord(3),true);
 assert.equal(rec.formPractice.wordTap.entry.form_no,'klokker',
  'Several clocks means plural clocks, never hours of time');
 assert.equal(requests.length,remoteBefore);
 // Another saved-word variant from older generated day packs used to escape repair.
 rec.active[0]={word:'klokka',translation:'В ... часов',key:'klokka'};
 state.learningV8.livingVocabulary.active[0]={word:'klokka',translation:'в ... часов',key:'klokka'};
 rec.cardFeedback={correct:false,answer:'неверно'};
 app.render();
 assert.equal(rec.active[0].translation,'часы');
 assert(!views.at(-1).includes('Правильный перевод: В ... часов'),
  'Old standalone inflected klokke card cannot show the incorrect hours gloss');
 assert(views.at(-1).includes('Правильный перевод: часы'));
 assert(saves>5);
 const sw=read('sw.js');
 assert(sw.includes('/living-words.js?v=8.3.0-lesson24-translate4-wordhelp1-tap1-watch1-taponly1-clock1'));
 assert(sw.includes('/card-form-practice.js?v=8.3.0-lesson24-translate4-wordhelp1-tap1-watch1-taponly1-clock1'));
 console.log('PASS inline word taps: instant help, contextual API, dictionary, pronunciation, retry, no guessing and progress preserved');
})().catch(e=>{console.error(e);process.exitCode=1});
