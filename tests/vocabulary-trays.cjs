'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),code=fs.readFileSync(path.join(root,'lesson-vocabulary-trays.js'),'utf8');
const saved=[],s={level:'A1',learningV8:{},dailyDictionary:{},srs:{},wordPracticeQueue:{}};
const course=[{level:'A1',vocab:[['å begynne','начинать'],['en jobb','работа'],['å slutte','заканчивать'],['å jobbe','работать'],['å snakke','говорить'],['en dag','день'],['en uke','неделя']]}];
const document={getElementById:()=>null,head:{appendChild:()=>{}},createElement:()=>({})};
const w={neLearnerState:s,saveState:()=>saved.push(true),NECardGrammar:{describe:({word})=>word==='å jobbe'?{verified:true,forms:[{label:'Presens',form:'jobber'}],example:{no:'Jeg jobber.',ru:'Я работаю.'}}:null}};
vm.runInNewContext(code,{window:w,document,COURSE:course,Date,Math,Number,String,Object,JSON,Array,Set,Map,Intl});
const api=w.NEWordTrays,lesson={level:'A1',vocab:course[0].vocab};
const day='2026-10-25',yday=api.offset(day,-1),two=api.offset(day,-2);
s.learningV8.lessonWordTrays={days:{}};
assert.equal(api.offset('2026-03-01',-1),'2026-02-28','Local date arithmetic crosses months');
s.learningV8.lessonWordTrays.days[yday]={date:yday,level:'A1',today:[{word:'å lese',ru:'читать'}],yesterday:[],older:[],relearning:[]};
s.learningV8.lessonWordTrays.days[two]={date:two,level:'A1',today:[{word:'å skrive',ru:'писать'}],yesterday:[],older:[],relearning:[]};
const first=api.slots(lesson,day);
assert.equal(first.today.length,5,'Five, not more than five, new words');
assert.equal(first.yesterday[0].word,'å lese');
assert.equal(first.older[0].word,'å skrive');
const oldBefore=JSON.stringify(s.learningV8.lessonWordTrays.days[day]);
assert.equal(JSON.stringify(api.slots(lesson,day)),JSON.stringify(first),'Repeated visits preserve daily selection');
assert(api.markOldForgotten('å skrive',day),'Forgotten old word is promoted to active column');
const promoted=api.slots(lesson,day);
assert.equal(promoted.today.length,5,'Promotion never exceeds the five visible study slots');
assert.equal(promoted.today[0].word,'å skrive');
assert(s.wordPracticeQueue.skrive>0,'Forgotten word is placed in review queue');
assert(s.dailyDictionary.skrive?.translation_ru==='писать','Words found only in older snapshots must enter the persistent dictionary');
assert(s.dailyDictionary.skrive.firstDate===two,'Older learning date is preserved, not replaced with the current date');
assert(s.srs.skrive?.due>0,'Older word must have an SRS record as well as a queue entry');
const savesBeforeSecondTap=saved.length,lookupBeforeSecondTap=s.dailyDictionary.skrive.bridgeLookups;
assert(!api.markOldForgotten('å skrive',day),'A second tap is not a new vocabulary failure');
assert.equal(saved.length,savesBeforeSecondTap,'Second tap does not double-save or falsely double-count');
assert.equal(s.dailyDictionary.skrive.bridgeLookups,lookupBeforeSecondTap,'Lookups remain idempotent');
assert.equal((s.dailyDictionary?.skrive?.correct||0),0,'Looking up a word does not grant mastery');
assert.equal(s.learningV8.lessonWordTrays.days[day].today.length,5,'Original daily history is preserved');
assert(!api.markOldForgotten('å lese',day),'Yesterday lookup does not automatically promote into relearning');
assert.equal(api.focus(lesson).length,6,'Promoted words are included once, not duplicated in review');
const html=api.render(lesson);
assert(html.includes('data-ne-tray-column="today"')&&html.includes('data-ne-tray-column="yesterday"')&&html.includes('data-ne-tray-column="older"'),'Three educational panels render');
assert(html.includes('перевод по нажатию')&&!html.includes('читать'),'Yesterday words remain in the DOM without visible translation before a tap');
assert(html.includes('Полные проверенные формы пока отсутствуют'),'Grammar is never invented when morphology unverified');
assert(html.includes('scroll-snap')===false,'Styling is in stylesheet, not repeated in HTML');
assert(saved.length>0,'Daily history saves with the user account');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
assert(app.includes('NEWordTrays?.render?.(l)'),'Both written and dialogue exercises include trays');
assert(app.includes('NEWordTrays?.render?.({...l,vocab:'),'Dialogue prompts prefer current turn vocabulary');
assert.equal((app.match(/NEWordTrays\?\.render\?\./g)||[]).length,2,'Dialogue and free-answer fields both display panels');
const gen=fs.readFileSync(path.join(root,'api/generate.js'),'utf8');
assert(gen.includes('activeVocabulary')&&gen.includes('2–3 слова'),'New lessons are guided by the selected memory');

// Regression: a day with only two yesterday words should use earlier genuine
// vocabulary to complete the review group, without altering archived facts.
const sparseDay='2026-10-28';
s.learningV8.lessonWordTrays.days[sparseDay]={
 date:sparseDay,level:'A1',today:[],
 yesterday:[{word:'å lese',ru:'читать'},{word:'å skrive',ru:'писать'}],
 older:[{word:'å jobbe',ru:'работать'}],relearning:[]
};
const sparse=api.slots(lesson,sparseDay);
assert.equal(sparse.yesterday.length,5,'Two recent words are backfilled from real older learning');
assert.equal(sparse.older[0].word,'å jobbe','The earlier review column retains its words');
const selected=[...sparse.today,...sparse.yesterday,...sparse.older].map(w=>api.lemma(w.word));
assert.equal(new Set(selected).size,selected.length,'No repeated vocabulary across columns');
assert.equal(s.learningV8.lessonWordTrays.days[sparseDay].yesterday.length,2,
 'Actual yesterday snapshot is never rewritten as if historical words were studied yesterday');
assert(sparse.yesterday.some(w=>w.origin==='review-backlog'),'Backfilled items keep an honest source label');
const backfilled=sparse.yesterday.find(w=>w.origin==='review-backlog');
const detail={innerHTML:'',hidden:true};
const fakeRoot={dataset:{neTrayDate:sparseDay}};
const fakeButton={
 dataset:{neTrayWord:backfilled.word,neTrayKind:'yesterday'},
 parentElement:{querySelector:()=>detail},closest:selector=>selector==='.ne-tray-panel'?{}:selector==='.ne-vocab-trays'?fakeRoot:null,
 setAttribute:()=>{}
};
assert(api.reveal(fakeButton),'Historical review words must reveal their real translation');
assert.equal(detail.hidden,false,'Study-history word translation is visible after tap');
assert(detail.innerHTML.includes(backfilled.ru),'Backfilled translation matches the recorded one');
assert(html.includes('data-ne-tray-tab="yesterday"')&&html.includes('NEWordTrays.select(this)'),
 'Mobile tabs provide explicit navigation, not clipped sideways cards');
assert(html.includes('Значения и формы'),'Lengthy grammar explanations default to collapsible blocks');

console.log('PASS 5+5+5 personal vocabulary, realistic forms, review promotion and writing/dialogue integration');
