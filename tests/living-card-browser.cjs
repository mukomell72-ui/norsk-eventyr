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
  await page.addScriptTag({content:source});
  await page.evaluate(()=>window.NELivingWords.render());
  async function finishCard(){
   await page.getByRole('button',{name:'Задание с этим словом'}).click();
   const answer=await page.evaluate(()=>{
    const d=window.NELivingWords.ensure();
    const task=d.formPractice.task;
    const word=d.active[d.cardQueue[d.cardsSeen]];
    return task.kind==='form'?task.answer:'Jeg bruker '+word.word+' i dag.';
   });
   await page.locator('#livingFormAnswer').fill(answer);
   await page.getByRole('button',{name:'Проверить форму'}).click();
   await page.getByRole('button',{name:/Следующая карточка|Продолжить повтор/}).click();
  }
  const field=page.locator('#livingTranslate');
  assert(await field.isVisible(),'Answer field is shown directly under Norwegian word');
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
  assert((await page.locator('#app').innerText()).includes('Повторяем трудные слова'));
  assert((await page.locator('#app').innerText()).includes('hjemme'));
  await page.getByRole('button',{name:'Не знаю · показать'}).click();
  await page.getByRole('button',{name:'Задание с этим словом'}).click();
  const last=await page.evaluate(()=>{
   const d=window.NELivingWords.ensure(),task=d.formPractice.task,word=d.active[d.cardQueue[d.cardsSeen]];
   return task.kind==='form'?task.answer:'Jeg bruker '+word.word+' i dag.';
  });
  await page.locator('#livingFormAnswer').fill(last);
  await page.getByRole('button',{name:'Проверить форму'}).click();
  await page.getByRole('button',{name:'Продолжить повтор'}).click();
  assert((await page.locator('#app').innerText()).includes('Практическая грамматика')||
    (await page.locator('#app').innerText()).includes('Составь собственное предложение'),
    'After review the full Nora study day proceeds');
  const state=await page.evaluate(()=>window.neLearnerState);
  assert(state.wordPracticeQueue?.hjemme,'Incorrect translation remains scheduled for review');
  assert(state.learningV8.livingVocabulary.days['2026-10-16'].cardAttempted[0]>=1);
  assert.deepEqual(errors,[],'No uncaught browser JS errors');
  console.log('PASS mobile browser: typing Russian translation, voice recognition, wrong-word review and persisted mistakes');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
