// Headless Chromium checks for the actual interactive training screens.
// This harness stubs ONLY the app shell and storage: no login, cloud or AI claims.
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const read=x=>fs.readFileSync(path.join(root,x),'utf8');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<!doctype html><html lang="ru"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box} body{margin:8px;background:#0e2638;color:white;font-family:Arial,sans-serif}</style><style>'+read('functional-practice.css')+'</style></head><body><div id="app"></div></body></html>');
  await page.addScriptTag({content:'var state={level:"A1",functionalPractice:{attempts:[],weaknesses:{}}};function saveState(){}function touchStudy(){}function shell(html){document.getElementById("app").innerHTML=html}'});
  await page.addScriptTag({content:read('functional-practice.js')});
  await page.evaluate(()=>window.NEFunctionalPractice.open('forms','A1'));
  assert.equal(await page.locator('.applied-tile').count(),2,'Expected both A1 practice forms');
  await page.locator('.applied-tile').first().click();
  assert(await page.getByText('Påmelding til norskkurs').isVisible());
  await page.locator('#applied-field-0').fill('Anna');
  await page.locator('#applied-field-1').fill('Berg');
  await page.locator('#applied-field-2').fill('3616');
  await page.locator('#applied-field-3').fill('A1');
  await page.getByRole('button',{name:'Проверить заполнение'}).click();
  assert(await page.getByText('Проверка структурированных полей: 4 из 4').isVisible());
  assert.equal(await page.evaluate(()=>state.functionalPractice.attempts.at(-1).score),100);
  assert.equal(await page.evaluate(()=>JSON.stringify(state).includes('Anna')),false,'Entered name may not be saved');
  await page.getByRole('button',{name:'Вставить слово'}).click();
  await page.getByRole('button',{name:'Начать тренировку'}).click();
  assert(await page.getByText('Задание 1 из 8',{exact:false}).isVisible());
  await page.locator('#appliedAnswer').fill('lærer');
  await page.getByRole('button',{name:'Проверить ответ'}).click();
  assert(await page.getByText('Верно',{exact:true}).isVisible());
  await page.getByRole('button',{name:'Следующее'}).click();
  await page.locator('#appliedAnswer').fill('not_a_norwegian_word');
  await page.getByRole('button',{name:'Проверить ответ'}).click();
  assert(await page.getByText('Правильный ответ:',{exact:false}).isVisible());
  const noOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2);
  assert(noOverflow,'The learning screen must fit a 390px mobile viewport');
  await page.evaluate(()=>window.NEFunctionalPractice.open('forms','B2'));
  assert.equal(await page.locator('.applied-tile').count(),2,'B2 needs formal and complaint forms');
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('PASS applied Chromium: mobile navigation, real inputs, scoring, cloze corrections, no JS errors');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
