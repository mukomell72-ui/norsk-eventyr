// Mobile card shows grammatical forms after a learner translation, without losing audio/input.
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<html lang="ru"><body><main id="app"></main></body></html>');
  await page.evaluate(()=>{
   const bank=[['en bil','автомобиль'],['å gå','идти'],['god','хороший'],['å underbygge','обосновывать'],['på bordet','на столе']];
   window.neLearnerState={level:'A1',learningV8:{},dailyDictionary:{},srs:{},dailyPacks:{}};
   window.NELivingDay={details:()=>({moduleId:'a1-foundation',title:'Знакомство',level:'A1',date:'2026-10-16'}),begin:()=>{}};
   window.NECurated={get:()=>({vocab:bank})};window.NECurriculum={modules:()=>[]};
   window.NEFunctionalPractice={getCatalog:()=>({cloze:[]})};
   window.saveState=()=>{};window.shell=s=>document.getElementById('app').innerHTML=s;
   window.speakText=()=>{};
  });
  const source=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
  await page.addScriptTag({content:source('card-grammar.js')});
  await page.addScriptTag({content:source('card-form-practice.js')});
  await page.addScriptTag({content:source('living-words.js')});
  await page.evaluate(()=>window.NELivingWords.render());
  assert(await page.getByRole('heading',{name:'en bil'}).isVisible());
  const details=page.locator('details');
  assert.equal(await details.evaluate(x=>x.open),false,'Forms collapsed to encourage independent recall');
  assert(await page.locator('#livingTranslate').isVisible());
  await page.locator('#livingTranslate').fill('автомобиль');
  await page.getByRole('button',{name:'Проверить перевод'}).click();
  assert.equal(await details.evaluate(x=>x.open),true,'Forms are shown automatically after feedback');
  const text=await page.locator('#app').innerText();
  for(const value of ['bilen','biler','bilene','Jeg har en bil.'])assert(text.includes(value),value);
  assert.equal(await page.evaluate(()=>window.NELivingWords.nextCard()),false,'Form practice cannot be skipped');
  await page.getByRole('button',{name:'Задание с этим словом'}).click();
  assert(await page.locator('#livingFormAnswer').isVisible(),'Every card receives form practice');
  const task=await page.evaluate(()=>window.NELivingWords.ensure().formPractice.task);
  await page.locator('#livingFormAnswer').fill(task.answer);
  await page.getByRole('button',{name:'Проверить форму'}).click();
  assert((await page.locator('#app').innerText()).includes('Форма слова закреплена'));
  await page.getByRole('button',{name:'Следующая карточка'}).click();
  assert(await page.getByRole('heading',{name:'å gå'}).isVisible());
  await page.locator('summary').click();
  const verbText=await page.locator('#app').innerText();
  for(const value of ['presens','preteritum','gikk','har gått','skal gå'])assert(verbText.includes(value),value);
  assert(await page.getByRole('button',{name:'Ответить голосом'}).isVisible(),'Existing voice input retained');
  assert.deepEqual(errors,[]);
  console.log('PASS mobile grammar cards: noun forms, required word-specific task, conjugation and retained spoken/written translation');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
