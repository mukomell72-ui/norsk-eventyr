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
 assert(views.at(-1).includes('henger — висят'));
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
 assert.equal(state.dailyDictionary.slappe,undefined,'Rejected uncertain hints must never enter dictionary');
 assert(saves>5);
 const sw=read('sw.js');
 assert(sw.includes('/living-words.js?v=8.3.0-lesson24-translate4-wordhelp1-tap1'));
 assert(sw.includes('/card-form-practice.js?v=8.3.0-lesson24-translate4-wordhelp1-tap1'));
 console.log('PASS inline word taps: instant help, contextual API, dictionary, pronunciation, retry, no guessing and progress preserved');
})().catch(e=>{console.error(e);process.exitCode=1});
