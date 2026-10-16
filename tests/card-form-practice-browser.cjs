// Mobile browser: every word has one mandatory task; wrong form -> hint -> fix -> different form.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<html lang="ru"><body><main id="app"></main></body></html>');
  await page.evaluate(()=>{
   window.neLearnerState={learningV8:{},dailyDictionary:{},srs:{},dailyPacks:{}};
   window.NELivingDay={details:()=>({moduleId:'testing',title:'Знакомство',level:'A1',date:'2026-10-17'}),begin:()=>{}};
   window.NECurated={get:()=>({vocab:[['å gå','идти'],['en bok','книга'],['god','хороший'],['etter hvert','постепенно']]})};
   window.NECurriculum={modules:()=>[]};
   window.NEFunctionalPractice={getCatalog:()=>({cloze:[]})};
   window.saveState=()=>{};
   window.shell=html=>document.getElementById('app').innerHTML=html;
   window.speakText=()=>{};
   window.aiEvaluate=async payload=>({ok:true,data:{
    accepted:payload.answer.includes('etter hvert'),score:90,explanation_ru:'Хорошее предложение'
   }});
   window.recognizedLanguages=[];
   window.recognitionAnswer='';
   window.SpeechRecognition=class{
    constructor(){this.lang=''}
    start(){
     window.recognizedLanguages.push(this.lang);
     this.onresult?.({results:[{isFinal:true,0:{transcript:window.recognitionAnswer}}]});
     this.onend?.();
    }
   };
  });
  for(const file of ['card-grammar.js','card-form-practice.js','living-words.js'])
   await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'..',file),'utf8')});
  await page.evaluate(()=>window.NELivingWords.render());
  const wordAt=()=>page.evaluate(()=>{
   const d=window.NELivingWords.ensure();return d.active[d.cardQueue[d.cardsSeen]];
  });
  async function translate(answer){
   await page.locator('#livingTranslate').fill(answer);
   await page.getByRole('button',{name:'Проверить перевод'}).click();
   assert.equal(await page.evaluate(()=>window.NELivingWords.nextCard()),false,'Cannot bypass per-word assignment');
   await page.getByRole('button',{name:'Задание с этим словом'}).click();
   assert(await page.locator('#livingFormAnswer').isVisible());
  }
  async function solve(useVoice=false){
   const d=await page.evaluate(()=>{
    const s=window.NELivingWords.ensure(),p=s.formPractice;
    return {task:p.task,word:s.active[s.cardQueue[s.cardsSeen]]};
   });
   const answer=d.task.kind==='form'?d.task.answer:
    'Etter hvert lærer jeg mer norsk.';
   if(useVoice){
    await page.evaluate(a=>window.recognitionAnswer=a,answer);
    await page.getByRole('button',{name:'Сказать по-норвежски'}).click();
    assert.equal(await page.locator('#livingFormAnswer').inputValue(),answer);
    const lang=await page.evaluate(()=>window.recognizedLanguages.at(-1));
    assert.equal(lang,'nb-NO');
   }else await page.locator('#livingFormAnswer').fill(answer);
   const previous=await page.evaluate(()=>window.NELivingWords.ensure().formPractice.answers.length);
   await page.getByRole('button',{name:'Проверить форму'}).click();
   await page.waitForFunction(prev=>{
    const p=window.NELivingWords.ensure().formPractice;
    return p.answers.length>prev||p.note.startsWith('Пока неверно.')||p.note.startsWith('Проверка Норы сейчас недоступна');
   },previous);
   return d;
  }
  await translate('идти');
  const first=await page.evaluate(()=>window.NELivingWords.ensure().formPractice.task);
  await page.locator('#livingFormAnswer').fill('неправильно');
  await page.getByRole('button',{name:'Проверить форму'}).click();
  assert((await page.locator('#app').innerText()).includes('Пока неверно.'));
  assert.equal(await page.evaluate(()=>window.NELivingWords.nextCard()),false);
  assert.equal(await page.evaluate(()=>window.NELivingWords.ensure().formPractice.task.index),first.index,
   'Wrong form is not replaced before learner corrects it');
  await solve(false);
  const second=await page.evaluate(()=>window.NELivingWords.ensure().formPractice.task);
  assert.notEqual(second.index,first.index,'After correction, assign a different tense/grammatical form');
  assert.equal(await page.evaluate(()=>window.NELivingWords.ensure().formPractice.done),false);
  await solve(true);
  assert.equal(await page.evaluate(()=>window.NELivingWords.ensure().formPractice.done),true);
  await page.getByRole('button',{name:'Следующая карточка'}).click();
  let guard=0,checked=1;
  while(await page.evaluate(()=>window.NELivingWords.ensure().stage)==='cards'){
   if(++guard>12)throw Error('Card queue did not complete after valid answers');
   const word=await wordAt();
   await translate(word.translation);
   await solve();
   const done=await page.evaluate(()=>window.NELivingWords.ensure().formPractice.done);
   const debug=await page.evaluate(()=>{const d=window.NELivingWords.ensure();
    return {card:d.active[d.cardQueue[d.cardsSeen]]?.word,task:d.formPractice?.task,
      feedback:d.formPractice?.note,answers:d.formPractice?.answers,misses:d.formPractice?.misses,
      needsAnother:d.formPractice?.needsAnother};});
   assert(done,'One correct morphology or sentence assignment is enough for each word: '+JSON.stringify(debug));
   await page.getByRole('button',{name:/Следующая карточка|Продолжить повтор/}).click();
   checked++;
  }
  assert(checked>=5,'Every initial word and the missed word received practice');
  const state=await page.evaluate(()=>window.neLearnerState);
  assert(state.wordPracticeQueue?.['å gå'],'Missed inflection remains due for later review');
  assert(state.learningV8.livingVocabulary.days['2026-10-17'].cardAttempted[0]>=1);
  assert.deepEqual(errors,[],'No uncaught JS errors');
  console.log('PASS mobile: mandatory randomized task for every word, correction before new form, voice, unknown fallback and spaced review');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
