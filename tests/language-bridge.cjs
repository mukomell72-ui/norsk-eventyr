'use strict';
// Språkbro: mastery gating, safe prose-only replacements, tap-to-translate, and review.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {chromium}=require('playwright');
const source=fs.readFileSync(path.join(__dirname,'../language-bridge.js'),'utf8');
const now=Date.now();
const state={level:'A1',learningV8:{},dailyDictionary:{
 today:{lemma:'i dag',translation_ru:'сегодня',correct:3,exposures:4,wrong:0,nextDue:now+86400000},
 tomorrow:{lemma:'i morgen',translation_ru:'завтра',correct:1,exposures:1,wrong:0},
 work:{lemma:'jobb',translation_ru:'работа',correct:1,exposures:3,wrong:2}
},srs:{today:{word:'i dag',stage:3,correct:3,due:now+86400000}},wordPracticeQueue:{}};
let saves=0;
const w={neLearnerState:state,saveState:()=>saves++};
vm.runInNewContext(source,{window:w,document:{readyState:'loading',addEventListener(){},getElementById(){return null}},Date,Math,Number,Object,String,JSON,Set,WeakMap});
const bridge=w.NELanguageBridge;
assert(bridge,'Bridge API available');
assert.equal(bridge.entries().length,1,'Do not replace newly seen or poorly recalled vocabulary');
assert.equal(bridge.entries()[0].no,'i dag');
const segments=bridge.segments('Сегодня я учу слово сегодня.',bridge.entries(),1);
assert.equal(segments.filter(x=>x.no).length,1,'A1 gets only one substitution per paragraph');
assert.equal(segments.find(x=>x.no).no,'i dag');
assert.equal(bridge.segments('Посегодняшнему',bridge.entries(),2).some(x=>x.no),false,'Never replace inside an unrelated word');
assert.equal(bridge.queueForgotten('i dag'),true,'Tapped mastered word is queued');
assert(state.wordPracticeQueue['i dag']>0&&state.srs.today.due<=Date.now()&&state.dailyDictionary.today.nextDue<=Date.now(),'Both review schedules become due now');
assert.equal(state.dailyDictionary.today.bridgeLookups,1);
assert.equal(saves,1);
assert.equal(bridge.queueForgotten('ord'),false,'Do not create fictitious dictionary entries');
assert.equal(saves,1);
bridge.toggle();assert.equal(state.learningV8.languageBridgeEnabled,false,'Bridge is user-disableable');
bridge.toggle();assert.equal(state.learningV8.languageBridgeEnabled,true,'Bridge can be re-enabled');
const dictionaryExtra={
 lemma:'en telefon',translation_ru:'телефон',pos:'noun',correct:4,exposures:5,
 wrong:0,strength:75,nextDue:Date.now()+86400000
};
state.dailyDictionary.phone=dictionaryExtra;
state.dailyDictionary.wordFromLesson={lemma:'en barnehage',translation_ru:'детский сад',pos:'substantiv',correct:4,exposures:5,wrong:0};
state.dailyDictionary.unverifiedVerb={lemma:'å begynne',translation_ru:'начать',pos:'verb',correct:5,exposures:6,wrong:0};
state.dailyDictionary.unmasteredNoun={lemma:'en elev',translation_ru:'ученик',pos:'noun',correct:0,exposures:1,wrong:0};
const fromDictionary=bridge.entries();
assert(fromDictionary.some(x=>x.no==='telefon'&&x.ru==='телефон'),'Mastered nouns outside static set are derived from the real dictionary');
assert(fromDictionary.some(x=>x.ru==='начинаю'&&x.no==='begynner'&&x.lemma==='å begynne'),
 'Known infinitive enables a verified corresponding present-tense form');
assert(!fromDictionary.some(x=>x.no==='begynne'),'Do not paste raw infinitives where a present form was expected');
assert(!fromDictionary.some(x=>x.no==='elev'),'Newly seen words are not treated as learned');
assert(!fromDictionary.some(x=>x.no==='barnehage'),'Ambiguous multiword or inflected translations require curated mappings');
assert(bridge.controlHtml().includes('Подтверждено слов:'),'Learner can see why bridging may not yet appear');
assert(bridge.queueForgotten('en telefon'),'Tap must work with article-prefixed dictionary entries');
assert(bridge.queueForgotten('å begynne'),'Tap on a conjugated bridge form queues the known base verb');
assert(state.wordPracticeQueue.telefon,'Dynamic dictionary word must enter the existing review queue');
assert.equal(state.dailyDictionary.phone.correct,4,'Lookup does not award mastery credit');
// Natural phrase order is kept when every component has been learned.
// An unseen word or too-low load budget must block the full substitution.
for(const [id,lemma] of [
 ['you','du'],['job','å jobbe'],['can','å kunne'],['meet','å møtes'],
 ['reply','å svare'],['say','å si'],['loud','høyt'],['tomorrow','i morgen'],
 ['thankyou','takk'],['home','hus'],['water','vann'],['friend','venn']]){
 state.dailyDictionary[id]={lemma,translation_ru:'подтвержденное',correct:4,exposures:5,wrong:0};
}
const learned=bridge.entries(),phrase=bridge.segments('Сегодня ты работаешь.',learned,3);
assert.equal(phrase.filter(x=>x.no).map(x=>x.no).join(' '),'I dag jobber du','Mastered whole phrase uses correct Bokmål inversion');
assert.equal(bridge.segments('Сегодня ты работаешь.',learned,2).filter(x=>x.no).some(x=>x.no==='jobber'),false,'Never insert an incomplete inverted phrase');
assert(learned.some(x=>x.ru==='ответь'&&x.no==='svar'),'Known imperative is used, not a present-tense form');
assert(learned.some(x=>x.ru==='можешь'&&x.no==='kan'),'Previously learned modal may appear in mixed directions');
assert.equal(bridge.segments('Сегодня ты работаешь.',bridge.entries().filter(x=>x.source!=='phrase'),3).filter(x=>x.no).map(x=>x.no).join(' '),'i dag jobber','Low-context replacement still uses a correct conjugated verb');
const normalDensity=bridge.density('Сегодня ты работаешь. Ответь Анне вслух и скажи, когда можешь встретиться.');
state.learningV8.bridgeLookupEvents=[Date.now(),Date.now(),Date.now(),Date.now(),Date.now(),Date.now()];
assert(bridge.density('Сегодня ты работаешь. Ответь Анне вслух и скажи, когда можешь встретиться.')<normalDensity,'Repeated translation help reduces cognitive load');
state.learningV8.bridgeLookupEvents=[];

(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  await page.setContent('<html lang="ru"><body><main id="app"><div class="shell"><p id="prose">Сегодня мы учим слова. Завтра повторим.</p><p id="dictionary">Этот телефон уже знаком.</p><div class="exercise"><p id="graded">Сегодня выбери верный ответ.</p><div class="ne-lesson-coach"><p id="nora">Нора объясняет, почему сегодня важно повторять.</p></div></div><div lang="nb"><p id="norwegian">Телефон</p></div></div></main></body></html>');
  await page.evaluate(()=>{
   window.neLearnerState={level:'A1',learningV8:{},dailyDictionary:{today:{lemma:'i dag',translation_ru:'сегодня',correct:4,exposures:5,wrong:0,nextDue:Date.now()+90000000}},srs:{today:{word:'i dag',stage:3,correct:3}},wordPracticeQueue:{}};
   window.neLearnerState.dailyDictionary.phone={lemma:'en telefon',translation_ru:'телефон',pos:'noun',correct:3,exposures:4,wrong:0};
   window.saveState=()=>{window.__bridgeSaved=(window.__bridgeSaved||0)+1};
  });
  await page.addScriptTag({content:source});
  await page.waitForSelector('#prose .ne-bridge-word');
  assert.equal(await page.locator('#prose .ne-bridge-word').count(),1);
  assert.equal(await page.locator('#prose .ne-bridge-word').innerText(),'i dag');
  assert((await page.locator('#graded').innerText()).includes('Сегодня'),'Assessed instruction remains in Russian');
  assert.equal(await page.locator('#dictionary .ne-bridge-word').innerText(),'telefon','A dictionary-only word is inserted in a new prose paragraph');
  assert.equal(await page.locator('#nora .ne-bridge-word').count(),1,'Tutor explanations are translated even inside an exercise container');
  assert.equal(await page.locator('#norwegian .ne-bridge-word').count(),0,'Norwegian examples are never rewritten');

  await page.locator('#prose .ne-bridge-word').click();
  assert((await page.locator('#prose .ne-bridge-gloss').innerText()).includes('сегодня'),'Tap immediately shows Russian translation');
  assert((await page.locator('#prose .ne-bridge-gloss').innerText()).includes('добавлено в повторение'));
  const review=await page.evaluate(()=>({
   nextDue:window.neLearnerState.dailyDictionary.today.nextDue,
   queued:window.neLearnerState.wordPracticeQueue['i dag'],
   saved:window.__bridgeSaved,
   newCount:window.neLearnerState.dailyDictionary.today.correct
  }));
  assert(review.queued>0&&review.nextDue<=Date.now()&&review.saved>=1,'Tap persists a due review');
  assert.equal(review.newCount,4,'Tap must not award learned-word credit');
  await page.evaluate(()=>window.NELanguageBridge.toggle());
  assert.equal(await page.locator('#prose .ne-bridge-word').count(),0,'Disabling bridge restores original Russian');
  assert((await page.locator('#prose').innerText()).includes('Сегодня'));
  await page.evaluate(()=>window.NELanguageBridge.toggle());
  await page.waitForSelector('#prose .ne-bridge-word');
  assert.equal(await page.locator('#dictionary .ne-bridge-word').count(),1,'Re-enabled bridge restores dictionary-driven substitutions');
  // Exercise instructions are now bridged; graded prompts and translations are not.
  await page.evaluate(()=>{
   const s=window.neLearnerState,lemmas=['du','å jobbe','å kunne','å møtes','å svare','å si','høyt','i morgen','takk','hus','vann','venn','her','alltid'];
   for(const lemma of lemmas)s.dailyDictionary[lemma]={lemma,translation_ru:'выучено',correct:5,exposures:6,wrong:0};
   document.querySelector('.shell').insertAdjacentHTML('beforeend',
    '<section class="exercise"><div class="dialogue-task-v83"><p id="spokenInstruction">Сегодня ты работаешь. Ответь Анне вслух и скажи, когда можешь встретиться.</p></div>'+
    '<div id="writtenInstruction" class="prompt" data-bridge-instruction="true">Сегодня ответь Анне.</div>'+
    '<div id="protectedQuestion" class="prompt">Сегодня выбери правильный ответ.</div>'+
    '<div class="translation"><p id="protectedTranslation">Сегодня ты работаешь.</p></div></section>');
  });
  await page.waitForSelector('#spokenInstruction .ne-bridge-word');
  assert((await page.locator('#spokenInstruction').innerText()).includes('I dag jobber du'),'Dialogue guidance switches a learned full clause');
  assert((await page.locator('#writtenInstruction .ne-bridge-word').count())>0,'Marked free-response instruction is bridged');
  assert.equal(await page.locator('#protectedQuestion .ne-bridge-word').count(),0,'Untargeted graded prompts stay unchanged');
  assert.equal(await page.locator('#protectedTranslation .ne-bridge-word').count(),0,'Assessed translations are protected');
  await page.locator('#spokenInstruction .ne-bridge-word').filter({hasText:'jobber'}).click();
  assert((await page.locator('#spokenInstruction .ne-bridge-gloss').innerText()).includes('работаешь'),'Tapped conjugation shows Russian meaning');
  const lookup=await page.evaluate(()=>({
   queued:window.neLearnerState.wordPracticeQueue.jobbe,
   score:window.neLearnerState.dailyDictionary['å jobbe']?.correct,
   peeks:window.neLearnerState.learningV8.bridgeLookupEvents?.length
  }));
  assert(lookup.queued>0&&lookup.peeks===1&&lookup.score===5,'Tapped lemma is scheduled for review without mastery credit');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  assert.deepEqual(errors,[]);
  console.log('PASS Språkbro: gradual lesson instructions, natural mastered phrase, adaptive density, protected tests, tap review, opt-out');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
