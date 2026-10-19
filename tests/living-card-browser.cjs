// Browser smoke test: visible Russian text field, voice transcript and wrong-word retry.
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<html lang="ru"><body><main id="app"></main></body></html>');
  await page.evaluate(()=>{
   const bank=[['hjemme','дома'],['jobb','работа'],['takk','спасибо'],['hvor','где'],['norsk','норвежский']];
   window.neLearnerState={level:'A1',learningV8:{},dailyDictionary:{},srs:{},dailyPacks:{}};
   window.NELivingDay={details:()=>({moduleId:'a1-foundation',title:'Жизненные ситуации',level:'A1',date:'2026-10-16'}),begin:()=>{}};
   window.NECurated={get:()=>({vocab:bank})};window.NECurriculum={modules:()=>[]};
   window.NEFunctionalPractice={getCatalog:()=>({cloze:[]})};
   window.saveState=()=>{};window.shell=html=>{document.getElementById('app').innerHTML=html};
   window.speakText=()=>{};
   window.aiEvaluate=async()=>({ok:true,data:{accepted:true,score:85,explanation_ru:'Отлично'}});
   window.voiceAnswer='работа';
   window.SpeechRecognition=class{
    constructor(){this.lang=''}
    start(){
     if(this.lang!=='ru-RU')throw Error('Wrong recognition language '+this.lang);
     this.onresult?.({results:[{isFinal:true,0:{transcript:window.voiceAnswer}}]});
     this.onend?.();
    }
   };
  });
  const source=fs.readFileSync(path.join(__dirname,'..','living-words.js'),'utf8');
  await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'..','card-grammar.js'),'utf8')});
  await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'..','card-form-practice.js'),'utf8')});
  await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'..','mini-path.js'),'utf8')});
  await page.addScriptTag({content:source});
  await page.evaluate(()=>window.NELivingWords.render());
  async function finishCard(){
   assert((await page.locator('#app').innerText()).includes('ШАГ 2 ИЗ 2'));
   await page.getByRole('button',{name:'Задание с этим словом'}).click();
   const data=await page.evaluate(()=>{
    const d=window.NELivingWords.ensure(),task=d.formPractice.task;
    const word=d.active[d.cardQueue[d.cardsSeen]];
    return {task,word:word.word};
   });
   const task=data.task;
   let answer=task.modelAnswer||{
    hjemme:'Jeg er hjemme nå.',
    takk:'Jeg sier takk for hjelpen.',
    hvor:'Hvor bor du i Norge?',
    norsk:'Jeg lærer norsk hver dag.'
   }[data.word];
   if(data.word==='jobb'&&!task.modelAnswer){
    const form=task.requiredForm;
    answer=[
     'Jeg har '+form+'.',
     'Jeg liker '+form+' min.',
     'Jeg har to '+form+'.',
     'Jeg kjenner '+form+' godt.'
    ][task.index];
   }
   assert(answer,'Every word needs a full contextual sentence');
   await page.locator('#livingFormAnswer').fill(answer);
   await page.getByRole('button',{name:'Проверить предложение'}).click();
   await page.waitForFunction(()=>window.NELivingWords.ensure().formPractice.done);
   await page.getByRole('button',{name:/Следующая карточка|Продолжить повтор/}).click();
  }
  const field=page.locator('#livingTranslate');
  assert(await field.isVisible(),'Answer field is shown directly under Norwegian word');
  assert((await page.locator('#app').innerText()).includes('ШАГ 1 ИЗ 2'));
  assert.equal(await page.locator('#livingFormAnswer').count(),0,
   'Before translation there must be no Norwegian assignment field');
  assert(await page.getByRole('button',{name:'Ответить голосом'}).isVisible(),'Voice button visible on mobile');
  await field.fill('другой ответ');
  await page.getByRole('button',{name:'Проверить перевод'}).click();
  assert((await page.locator('#app').innerText()).includes('Нужно повторить.'));
  assert((await page.locator('#app').innerText()).includes('дома'));
  await finishCard();
  await page.getByRole('button',{name:'Ответить голосом'}).click();
  assert.equal(await field.inputValue(),'работа','Russian voice recognition fills editable field');
  await page.getByRole('button',{name:'Проверить перевод'}).click();
  assert((await page.locator('#app').innerText()).includes('Верно!'));
  await finishCard();
  for(const answer of ['спасибо','где','норвежский']){
   await field.fill(answer);
   await page.getByRole('button',{name:'Проверить перевод'}).click();
   await finishCard();
  }
  assert((await page.locator('#app').innerText()).includes('Быстрая проверка'));
  while(await page.evaluate(()=>window.NELivingWords.ensure().miniRound?.phase)==='quiz'){
   const index=await page.evaluate(()=>{
    const m=window.NELivingWords.ensure().miniRound;
    return m.questions[m.index].correct;
   });
   await page.locator('button[onclick^="NELivingWords.answerMini("]').nth(index).click();
  }
  assert((await page.locator('#app').innerText()).includes('Остановиться сейчас'));
  const paused=await page.evaluate(()=>JSON.parse(JSON.stringify(window.NELivingWords.ensure().miniRound)));
  assert.equal(paused.boundary,5,'Mini checkpoint is saved to learner session');
  await page.getByRole('button',{name:/Повторить трудные слова|Перейти к следующим словам|Продолжить занятие/}).click();
  assert((await page.locator('#app').innerText()).includes('Повторяем трудные слова'));
  assert((await page.locator('#app').innerText()).includes('hjemme'));
  await page.getByRole('button',{name:'Не знаю · показать'}).click();
  await finishCard();
  assert((await page.locator('#app').innerText()).includes('Повторяем трудные слова'),
   'After a second missed answer, the word must be repeated again');
  await page.locator('#livingTranslate').fill('дома');
  await page.getByRole('button',{name:'Проверить перевод'}).click();
  await finishCard();
  assert((await page.locator('#app').innerText()).includes('Практическая грамматика')||
    (await page.locator('#app').innerText()).includes('Составь собственное предложение'),
    'After review the full Nora study day proceeds');
  const state=await page.evaluate(()=>window.neLearnerState);
  assert(state.wordPracticeQueue?.hjemme,'Incorrect translation remains scheduled for review');
  assert(state.learningV8.livingVocabulary.days['2026-10-16'].cardAttempted[0]>=1);
  assert.deepEqual(errors,[],'No uncaught browser JS errors');
  console.log('PASS mobile browser: typed/voice translation, contextual use, short recognition quiz, saved checkpoint, due-word repetitions');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
