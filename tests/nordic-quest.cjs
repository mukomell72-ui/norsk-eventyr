// NORTHERN COMPASS: evidence-gated world, true curriculum links and saved radio missions.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const s={level:'A1',xp:999999,learningV8:{},completed:{},dailyDictionary:{},srs:{}};
const screens=[],nav=[],started=[];let saves=0,tts=[],day='2026-10-17';
const earned={'a1-foundation':84,'a1-home':40};
const w={neLearnerState:s,NEAdaptive:{
 moduleMastery:(_s,id)=>earned[id]||0,
 highestUnlockedLevel:()=> 'A1'
},saveState:()=>++saves,shell:(html,active)=>screens.push({html,active}),
navigate:(...args)=>nav.push(args),teacherStartModule:id=>started.push(id),
NELivingDay:{details:()=>({moduleId:'a1-home',finished:false})},
neLocalDate:()=>day,speakText:(word,rate)=>tts.push([word,rate])};
const ctx={window:w,Date,Math,Number,Object,String,Array,JSON,Set,Intl};
vm.runInNewContext(read('curriculum-v8.js'),ctx);
vm.runInNewContext(read('nordic-quest-play.js'),ctx);
vm.runInNewContext(read('nordic-quest.js'),ctx);
const W=w.NENordicQuest;
assert(W&&W.REGIONS&&W.PLACES.length===8);
// Daily replayability: three independently rotating tasks create 27 distinct
// daily challenge sets per language level before combinations repeat.
for(const level of ['A1','A2','B1','B2']){
 const variants=new Set();
 for(let offset=0;offset<27;offset++){
  const d=new Date(Date.UTC(2026,9,17+offset)).toISOString().slice(0,10);
  const bank=W.signalBank(level,d);
  assert.equal(bank.length,3);
  bank.forEach((task,index)=>{
   assert(task.scene&&task.ask&&task.no&&task.ru&&task.hint);
   assert.equal(task.wrong.length,2);
   assert.equal(task.wrongRu.length,2);
   assert(!task.wrong.includes(task.no));
   assert(!task.wrongRu.includes(task.ru));
   if(index===1)assert(task.no.trim().split(/\s+/).length>=3,'Sentence builder needs multiple tiles');
  });
  variants.add(bank.map(task=>task.no).join('|'));
 }
 assert.equal(variants.size,27,level+' should have 27 distinct daily mission sets, not three repetitive prompts');
 assert.deepEqual(Array.from(W.signalBank(level,'2026-10-20')).map(x=>x.no),
                  Array.from(W.signalBank(level,'2026-10-20')).map(x=>x.no),'Daily challenge order remains stable across reloads');
}

const a1=W.journey(s,'A1');
assert.equal(a1.chapters.length,8);
assert.equal(a1.mastered,1,'A mastered chapter needs real module mastery, not XP');
assert.equal(a1.chapters[0].status,'mastered');
assert.equal(a1.chapters[1].status,'current');
assert.equal(a1.chapters[2].status,'locked');
assert.equal(a1.chapters[1].moduleId,'a1-home');
const b2=W.journey(s,'B2');
assert.equal(b2.chapters.length,8);
assert.equal(b2.allowed,false);
assert(b2.chapters.every(ch=>ch.status==='locked'),'Future level not available without level gate');
const pass=W.passport(s);
assert.equal(pass.earned,1);
assert.equal(pass.total,32);
assert(W.homeTile().includes('северный маршрут'));
assert(W.homeTile().includes('Дом у залива'));
assert(W.open(), 'World can render');
assert(screens.at(-1).html.includes('nq-world'));
assert.equal((screens.at(-1).html.match(/class="nq-stop /g)||[]).length,8);
assert.equal(screens.at(-1).active,'adventure');
assert(W.selectLevel('B1'));
assert.equal(s.level,'A1','Browsing a locked level MUST NOT alter learner level');
assert.equal(s.learningV8.adventureWorld.viewLevel,'B1');
assert(W.openChapter('b1-foundation')===false,'Unknown chapter ids should not open');
const id=W.journey(s,'B1').chapters[0].moduleId;
assert(W.openChapter(id),'Future chapter can be previewed');
assert(screens.at(-1).html.includes('станет доступна'));
assert.equal(W.startChapter(id),false,'No playing of locked learning chapters');
assert.equal(W.beginSignal('B1'),false,'A future CEFR-level radio quest is locked until the level gate passes');
assert.equal(started.length,0);
W.selectLevel('A1');
assert(W.openChapter('a1-home'));
assert(screens.at(-1).html.includes('ТВОЯ ЦЕЛЬ В ЯЗЫКЕ'));
assert(!screens.at(-1).html.includes('станет доступна'));
assert(W.startChapter('a1-home')!==false,'Current mission must point to real course');
assert(nav.some(args=>args[0]==='livingday'),'Active Nora study day is reused');
assert.equal(started.length,0,'Does not bypass active Nora study day');
const chaptersBefore=W.passport(s).earned;
assert(W.beginSignal('A1'));
const q=w.NQQuestPlay;
let state=W.signalRun(s,'A1');
assert.equal(state.version,2);
assert.equal(state.index,0);
assert(!state.completed);
assert(screens.at(-1).html.includes('Радио северного маяка'));
assert(screens.at(-1).html.includes('Этап 1 / 4'));
assert.equal(W.answerSignal(0),false,'A wrong Norwegian response cannot advance');
assert.equal(state.index,0);
assert.equal(state.misses,1);
assert(state.feedback.includes('Вспомни'));
assert.equal(W.answerSignal(1),true,'Correct contextual Norwegian phrase accepted');
assert.equal(W.answerSignal(1),false,'No double credit');
assert.equal(state.checked,true);
assert.equal(W.nextSignal(),true);
assert.equal(state.index,1);
assert(screens.at(-1).html.includes('nq-drop-zone'),'A word-order board replaces multiple choice');
// A player can stop overnight without losing their unfinished story or
// receiving a new phrase midway through an active sentence assembly.
const originalMissionPhrase=W.signalBank('A1','2026-10-17')[1];
assert.notEqual(originalMissionPhrase.no,W.signalBank('A1','2026-10-20')[1].no);
day='2026-10-20';
assert(W.open());
assert(screens.at(-1).html.includes('Продолжить сигнал Норы'),'Atlas offers saved unfinished mission');
assert(W.beginSignal('A1'));
assert.strictEqual(W.signalRun(s,'A1'),state,'Same saved mission must resume after midnight');
assert.equal(state.index,1,'Interrupted stage is restored');
assert(screens.at(-1).html.includes(originalMissionPhrase.ru),'Original sentence task is restored');
assert.equal(W.isComplete(s,'A1'),false,'Unfinished mission never earns credit');
day='2026-10-17';
const phrase=W.signalBank('A1')[1].no,tiles=q.shuffledTiles(phrase);
const correct=q.phraseTokens(phrase).map((_,i)=>tiles.findIndex(x=>x.id===i));
assert(tiles.length>=3);
assert(!q.validAssembly(phrase,tiles.map((_,i)=>i)),'Shuffled chips require active sentence construction');
for(const i of tiles.map((_,i)=>i))assert.equal(W.selectTile(i),true);
assert.equal(W.checkAssembly(),false,'Wrong word order must be corrected');
assert.equal(state.index,1);
assert.equal(W.clearTiles(),true);
for(const i of correct)assert.equal(W.selectTile(i),true);
assert.equal(W.checkAssembly(),true,'Norwegian sentence produced with original order');
assert.equal(state.checked,true);
assert.equal(W.hearSignal(),true,'Pronunciation model can play example from sentence stage');
assert.equal(tts.length,1);
assert.equal(W.tryPronunciation(),false,'Unavailable microphone does not prevent language learning');
assert(state.voiceNote.includes('недоступно'));
assert.equal(W.nextSignal(),true);
assert.equal(state.index,2);
assert.equal(W.hearSignal(),true,'Audio listening challenge still plays Norwegian');
assert.equal(tts.length,2);
assert.equal(W.revealSignal(),true,'Audio fallback is available for silent devices');
assert.equal(state.reveal,true);
assert.equal(W.answerSignal(1),false,'Incorrect listening answer rejected');
assert.equal(W.answerSignal(0),true,'Correct listening answer accepted');
assert.equal(W.nextSignal(),true);
assert.equal(state.index,3);
assert(screens.at(-1).html.includes('Поворот истории'),'Fourth stage is a story-changing decision');
assert.equal(W.chooseSignalEnding(1),true);
assert.equal(state.choice,'explore');
assert(state.checked);
assert(screens.at(-1).html.includes('ТВОЁ РЕШЕНИЕ'));
day='2026-10-20'; // Completing after midnight retains the mission's original journal identity.
assert.equal(W.nextSignal(),true);
assert(screens.at(-1).html.includes('Маршрут освещён'),'Late completion shows its own ending');
assert.equal(s.learningV8.adventureWorld.signalRuns['2026-10-20:A1'],undefined,
 'Finishing yesterday must not silently generate a new mission');
day='2026-10-17';
assert(state.completed,'Completing the fourth challenge persists');
assert(screens.at(-1).html.includes('Маршрут освещён'));
assert(screens.at(-1).html.includes('ПОЛЕВАЯ ЗАМЕТКА СОХРАНЕНА'));
assert.equal(W.isComplete(s,'A1'),true);
assert.equal(W.passport(s).earned,chaptersBefore,'Mini-games never forge CEFR skills');
const notes=W.journalEntries(s);
assert.equal(notes.length,1);
assert.equal(notes[0].choice,'explore');
assert.equal(notes[0].key,'2026-10-17:A1','A continued old quest uses its original daily key');
assert.equal(notes[0].date,'2026-10-17',"Diary records the adventure's start date");
assert(notes[0].result.includes('тропу'),'Choice changes the narrative outcome');
assert(W.open());
assert(screens.at(-1).html.includes('Путевые заметки'));
assert(screens.at(-1).html.includes('Тропа к городу'));
const snapshot=JSON.parse(JSON.stringify(s));
assert(snapshot.learningV8.adventureWorld.signalRuns['2026-10-17:A1'].completed,'Quest journal survives JSON persistence');
assert(snapshot.learningV8.adventureWorld.journal.length===1);
assert(W.beginSignal('A1'),'Reopening completed daily mission shows ending');
assert(screens.at(-1).html.includes('Маршрут освещён'));
day='2026-10-18';
assert.equal(W.isComplete(s,'A1'),false,'A different day gets new mission');
assert(W.beginSignal('A1'));
assert.equal(W.signalRun(s,'A1').index,0);
assert(W.toggleSound(),'Effects can be deliberately enabled');
assert.equal(s.learningV8.adventureWorld.soundOn,true);
assert(W.toggleSound(),'Effects can be deliberately disabled');
assert.equal(s.learningV8.adventureWorld.soundOn,false);
assert(saves>15,'Tiles, errors, progress, results and sound choice persist');
assert.equal(s.level,'A1');
assert.equal(s.xp,999999,'Game choices do not mint fake XP');
const sw=read('sw.js'),access=read('access.js'),ui=read('ui-v7.js'),html=read('index.html');
for(const entry of ['/nordic-quest-play.js?v=8.3.0-lesson23','/nordic-quest.js?v=8.3.0-lesson23','/nordic-quest.css?v=8.3.0-lesson23'])
 assert(sw.includes(entry),'World asset must be offline cached: '+entry);
assert(access.includes("'ui-v8.js','nordic-quest-play.js','nordic-quest.js','placement-calibration.js'"));
assert(html.includes('/nordic-quest.css?v=8.3.0-lesson23'));
assert(ui.includes('else if(target==="adventure")'));
assert(ui.includes('NENordicQuest?.homeTile?.()'));
console.log('PASS Nordic Quest: eight chapters per level, locked chapters, true evidence passport, original daily story challenge, audio, persistence and PWA');
