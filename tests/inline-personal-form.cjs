'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<!DOCTYPE html><html lang="ru"><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:8px;background:#f7fafc;font-family:Arial,sans-serif}.card{padding:16px;background:#f7fafb;color:#173346;border-radius:20px}.input{font-family:inherit}</style><style>'+read('inline-personal-form.css')+'</style></head><body><main id="app"></main></body></html>');
  await page.addScriptTag({content:[
   'window.neLessonSession={remediation:null,speakingFollowup:false};',
   "window.lessonFreeTask=(lesson,mode)=>mode==='writing'?lesson.writing:lesson.speaking;",
   "window.freeEx=(lesson,mode)=>'<article id=\"original-writing\">'+mode+'</article>';",
   "window.checkFree=(mode)=>{window.lastAICheck={mode,answer:document.getElementById('freeAnswer').value};};"
  ].join('\n')});
  await page.addScriptTag({content:read('inline-personal-form.js')});
  const task='Заполни короткую личную карточку по-норвежски: имя, страна, город проживания и язык. Напиши 4 простых предложения с jeg heter, jeg kommer fra, jeg bor и jeg snakker.';
  await page.evaluate(text=>{document.getElementById('app').innerHTML=window.freeEx({level:'A1',writing:text},'writing');},task);
  assert(await page.getByRole('heading',{name:'PERSONKORT'}).isVisible(),'Form must replace textbox in A1 writing');
  assert.equal(await page.locator('textarea[data-ne-person-card]').count(),4,'Exactly four sentence fields');
  await page.getByRole('button',{name:'Проверить AI'}).click();
  assert(await page.locator('#neCardValidation').getByText('Заполни все 4 поля',{exact:false}).isVisible(),'Incomplete form must be blocked');
  assert.equal(await page.evaluate(()=>window.lastAICheck),undefined,'Do not send incomplete form to AI');
  const lines=['Jeg heter Anna.','Jeg kommer fra Polen.','Jeg bor i Kongsberg.','Jeg snakker norsk.'];
  for(const [i,key] of ['name','country','city','language'].entries())await page.locator('#ne-card-'+key).fill(lines[i]);
  await page.getByRole('button',{name:'Проверить AI'}).click();
  const received=await page.evaluate(()=>window.lastAICheck);
  assert.equal(received.mode,'writing');
  assert.equal(received.answer,lines.join('\n'),'Do not fabricate student grammar or content');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true,'390px mobile viewport must not overflow');
  await page.evaluate(()=>{document.getElementById('app').innerHTML=window.freeEx({level:'A2',writing:'Заполни короткую личную карточку. jeg heter, jeg kommer fra, jeg bor и jeg snakker'},'writing')});
  assert(await page.locator('#original-writing').isVisible(),'Other levels must remain unchanged');
  await page.evaluate(()=>{window.neLessonSession.remediation={mode:'writing'};document.getElementById('app').innerHTML=window.freeEx({level:'A1',writing:'Заполни короткую личную карточку. jeg heter, jeg kommer fra, jeg bor и jeg snakker'},'writing')});
  assert(await page.locator('#original-writing').isVisible(),'Error transfer must preserve original AI writing flow');
  await page.evaluate(()=>{window.neLessonSession.remediation=null;document.getElementById('app').innerHTML=window.freeEx({level:'A1',writing:'Заполни короткую личную карточку. jeg heter, jeg kommer fra, jeg bor и jeg snakker'},'speaking')});
  assert(await page.locator('#original-writing').isVisible(),'Speaking must remain unchanged');
  assert.deepEqual(errors,[],'No browser JavaScript errors');
  const access=read('access.js'),sw=read('sw.js'),html=read('index.html');
  assert(access.includes("'guided-speaking.js','inline-personal-form.js','lexicon.js'"),'Form must load after guided speech');
  assert(sw.includes('/inline-personal-form.js?v=8.3.0')&&sw.includes('/inline-personal-form.css?v=8.3.0'),'PWA must precache both assets');
  assert(html.includes('/inline-personal-form.css?v=8.3.0'),'CSS must be loaded');
  assert(read('inline-personal-form.js').includes("window.checkFree('writing')"),'Form must reuse actual AI assessment');
  console.log('PASS inline personkort: realistic 4-field writing form, mobile input, no synthetic answers, existing AI, scope and privacy');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
