// Real mobile Chromium: explicit translation -> contextual sentence on every word.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
function sentence(task){
 const form=task.requiredForm;
 if(!form){
  return [
   'Etter hvert lærer jeg norsk bedre.',
   'Jeg forstår mer etter hvert.',
   'Etter hvert snakker jeg mer norsk.'
  ][task.index];
 }
 if(task.type==='noun')return [
  'Jeg har '+form+' hjemme.',
  'Jeg ser '+form+' her.',
  'Jeg har to '+form+' hjemme.',
  'Jeg ser '+form+' her.'
 ][task.index];
 if(task.type==='verb')return [
  'Jeg liker '+form+' tidlig.',
  'Jeg '+form+' på jobb i dag.',
  'Jeg '+form+' på jobb i går.',
  'Jeg '+form+' på jobb denne uka.',
  'Jeg '+form+' på jobb i morgen.'
 ][task.index];
 if(task.type==='adjective')return [
  'Jeg har en '+form+' venn.',
  'Jeg har et '+form+' hus.',
  'Jeg har '+form+' venner.',
  'Dette er '+form+' enn før.',
  'Dette er '+form+' akkurat nå.'
 ][task.index];
 throw Error('Unexpected task '+JSON.stringify(task));
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<html lang="ru"><body><main id="app"></main></body></html>');
  await page.evaluate(()=>{
   const bank=[['begynner','начинаю'],['en bok','книга'],['god','хороший'],['etter hvert','постепенно']];
   window.neLearnerState={learningV8:{},dailyDictionary:{},srs:{},dailyPacks:{}};
   window.NELivingDay={details:()=>({moduleId:'testing',title:'Повседневная жизнь',level:'A1',date:'2026-10-17'}),begin:()=>{}};
   window.NECurated={get:()=>({vocab:bank})};window.NECurriculum={modules:()=>[]};
   window.NEFunctionalPractice={getCatalog:()=>({cloze:[]})};
   window.saveState=()=>{};window.shell=s=>document.getElementById('app').innerHTML=s;
   window.speakText=()=>{};
   window.evaluations=[];
   window.rejectNext=false;
   window.aiEvaluate=async payload=>{
    window.evaluations.push(payload);
    const accepted=!window.rejectNext;window.rejectNext=false;
    return {ok:true,data:{accepted,score:accepted?91:35,
     explanation_ru:accepted?'Значение и грамматика верны.':'Предложение не соответствует значению. Исправь контекст.'}};
   };
   window.spoken='';
   window.languages=[];
   window.SpeechRecognition=class{
    constructor(){this.lang=''}
    start(){
     window.languages.push(this.lang);
     this.onresult?.({results:[{isFinal:true,0:{transcript:window.spoken}}]});
     this.onend?.();
    }
   };
  });
  for(const name of ['card-grammar.js','card-form-practice.js','mini-path.js','living-words.js'])
   await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'..',name),'utf8')});
  await page.evaluate(()=>window.NELivingWords.render());
  assert(await page.getByRole('heading',{name:'å begynne'}).isVisible(),'The inflected beginnen form receives its infinitive lemma');
  assert((await page.locator('#app').innerText()).includes('ШАГ 1 ИЗ 2'));
  assert(await page.locator('#livingTranslate').isVisible(),'Russian translation is the first visible input');
  assert.equal(await page.locator('#livingFormAnswer').count(),0,'No grammar task until translation is checked');
  assert.equal(await page.evaluate(()=>window.NELivingWords.nextCard()),false);
  async function translate(value,spoken=false){
   assert(await page.locator('#livingTranslate').isVisible());
   if(spoken){
    await page.evaluate(t=>window.spoken=t,value);
    await page.getByRole('button',{name:'Ответить голосом'}).click();
    assert.equal(await page.locator('#livingTranslate').inputValue(),value);
    assert.equal(await page.evaluate(()=>window.languages.at(-1)),'ru-RU');
   }else await page.locator('#livingTranslate').fill(value);
   await page.getByRole('button',{name:'Проверить перевод'}).click();
   assert((await page.locator('#app').innerText()).includes('ШАГ 2 ИЗ 2'));
   assert((await page.locator('#app').innerText()).includes('Правильный перевод:'));
   assert.equal(await page.locator('#livingTranslate').count(),0);
   assert.equal(await page.evaluate(()=>window.NELivingWords.nextCard()),false);
   await page.getByRole('button',{name:'Задание с этим словом'}).click();
   assert(await page.locator('#livingFormAnswer').isVisible(),'A contextual assignment is mandatory for every word');
   const task=await page.evaluate(()=>window.NELivingWords.ensure().formPractice.task);
   if(task.russianSentence)assert((await page.locator('#app').innerText()).includes(task.russianSentence),
    'After the Russian word translation, show the full Russian sentence to translate into Norwegian');
  }
  async function solve(useVoice=false){
   const task=await page.evaluate(()=>window.NELivingWords.ensure().formPractice.task);
   assert.equal(task.kind,'sentence','The learner must make a meaningful sentence, not repeat a bare form');
   const answer=task.modelAnswer||sentence(task),previous=await page.evaluate(()=>{
    const p=window.NELivingWords.ensure().formPractice;
    return {answers:p.answers.length,misses:p.misses};
   });
   if(useVoice){
    await page.evaluate(t=>window.spoken=t,answer);
    await page.getByRole('button',{name:'Сказать предложение'}).click();
    assert.equal(await page.locator('#livingFormAnswer').inputValue(),answer);
    assert.equal(await page.evaluate(()=>window.languages.at(-1)),'nb-NO');
   }else await page.locator('#livingFormAnswer').fill(answer);
   await page.getByRole('button',{name:'Проверить предложение'}).click();
   await page.waitForFunction(prev=>{
    const p=window.NELivingWords.ensure().formPractice;
    return p.answers.length>prev.answers||p.misses>prev.misses||
      p.note.includes('недоступна');
   },previous);
   return task;
  }
  await translate('начинаю');
  const initial=await page.evaluate(()=>window.NELivingWords.ensure().formPractice.task);
  assert.equal(initial.type,'verb');
  await page.locator('#livingFormAnswer').fill('Начать');
  await page.getByRole('button',{name:'Проверить предложение'}).click();
  assert((await page.locator('#app').innerText()).includes('Русский перевод уже проверен на шаге 1'),
   'Pasting a Russian translation into the Norwegian sentence field receives explicit guidance');
  assert.equal(await page.evaluate(()=>window.NELivingWords.nextCard()),false);
  assert.equal(await page.evaluate(()=>window.NELivingWords.ensure().formPractice.task.index),initial.index);
  // A saved identical answer must not trigger the old free-writing
  // duplicate guard in translation mode; let Nora grade its meaning.
  await page.evaluate(()=>{
   const p=window.NELivingWords.ensure().formPractice;
   p.answers.push(p.task.modelAnswer);
  });
  await page.evaluate(()=>window.rejectNext=true);
  await solve();
  assert((await page.locator('#app').innerText()).includes('смысл')||
   (await page.locator('#app').innerText()).includes('контекст'),'Nora must reject bad semantics even for valid forms');
  await solve();
  const different=await page.evaluate(()=>window.NELivingWords.ensure().formPractice.task.index);
  assert.notEqual(different,initial.index,'After fixing an error, a DIFFERENT grammar task is mandatory');
  await solve(true);
  assert.equal(await page.evaluate(()=>window.NELivingWords.ensure().formPractice.done),true);
  assert((await page.locator('#app').innerText()).includes('правильно применил слово'));
  await page.getByRole('button',{name:'Следующая карточка'}).click();
  let guard=0,checked=1;
  while(await page.evaluate(()=>window.NELivingWords.ensure().stage)==='cards'){
   if(++guard>10)throw Error('Vocabulary did not finish after correct independent sentences');
   if(await page.evaluate(()=>!!window.NELivingWords.ensure().miniRound)){
    while(await page.evaluate(()=>window.NELivingWords.ensure().miniRound?.phase)==='quiz'){
     const correct=await page.evaluate(()=>{
      const m=window.NELivingWords.ensure().miniRound;return m.questions[m.index].correct;
     });
     await page.locator('button[onclick^="NELivingWords.answerMini("]').nth(correct).click();
    }
    await page.getByRole('button',{name:/Продолжить занятие|Повторить трудные слова|Перейти к следующим словам/}).click();
    continue;
   }
   const word=await page.evaluate(()=>{
    const d=window.NELivingWords.ensure();return d.active[d.cardQueue[d.cardsSeen]];
   });
   await translate(word.translation,word.word==='en bok');
   await solve();
   const debug=await page.evaluate(()=>{
    const d=window.NELivingWords.ensure(),p=d.formPractice;
    return {word:d.active[d.cardQueue[d.cardsSeen]]?.word,done:p?.done,task:p?.task,
      note:p?.note,misses:p?.misses,hadMistake:p?.hadMistake,needsAnother:p?.needsAnother,
      answers:p?.answers,draft:p?.draft};
   });
   assert(debug.done,'Card did not complete after model translation: '+JSON.stringify(debug));
   await page.getByRole('button',{name:/Следующая карточка|Продолжить повтор/}).click();
   checked++;
  }
  assert(checked>=5,'A contextual task is mandatory for every initial and repeated word');
  const state=await page.evaluate(()=>window.neLearnerState),evaluations=await page.evaluate(()=>window.evaluations);
  assert(state.wordPracticeQueue?.begynner,'Incorrect usage remains scheduled for spaced repetition');
  assert(evaluations.length>=checked);
  assert(evaluations.every(v=>v.goal.includes('смысл')||v.goal.includes('русский смысл')),
   'Teacher gets the actual meaning and usage rubric');
  // A previously saved free-writing prompt for kunne must update in place
  // after the new verified modal exercises become available, without losing draft.
  await page.evaluate(()=>{
   const d=window.NELivingWords.ensure();
   d.ready=false;d.stage='cards';d.cardsSeen=0;d.cardQueue=[0];
   d.active=[{word:'kunne',translation:'мочь',newToday:false}];
   d.cardFeedback={correct:true,answer:'мочь'};
   d.formPractice={started:true,done:false,task:{
    kind:'sentence',index:2,type:'other',requiredForm:null,russianSentence:null,
    prompt:'Придумай осмысленную фразу с kunne.',lemma:'kunne',word:'kunne'
   },draft:'Jeg kan hjelpe deg',note:'',misses:1,hadMistake:true,answers:[]};
   window.NELivingWords.render();
  });
  const restored=await page.evaluate(()=>{
   const p=window.NELivingWords.ensure().formPractice;
   return {task:p.task,draft:p.draft,misses:p.misses};
  });
  assert.equal(restored.task.russianSentence,'Вчера я не мог прийти.');
  assert.equal(restored.task.requiredForm,'kunne');
  assert.equal(restored.draft,'Jeg kan hjelpe deg');
  assert.equal(restored.misses,1);
  assert(await page.getByRole('button',{name:'Нора, объясни мне'}).isVisible());
  await page.getByRole('button',{name:'Нора, объясни мне'}).click();
  assert((await page.locator('#app').innerText()).includes('kan — могу'),
   'Hint must explain kan / kunne before a learner submits an error');
  await page.locator('#livingFormAnswer').fill('Jeg kan hjelpe deg.');
  await page.getByRole('button',{name:'Проверить предложение'}).click();
  assert(await page.getByRole('button',{name:'Разобрать ошибку и получить новое задание'}).isVisible(),
   'After two failed attempts, the learner can request a verified example');
  await page.getByRole('button',{name:'Разобрать ошибку и получить новое задание'}).click();
  const recovery=await page.evaluate(()=>{
   const p=window.NELivingWords.ensure().formPractice;
   return {task:p.task,misses:p.misses,done:p.done,answers:p.answers,hadMistake:p.hadMistake,
    draft:p.draft,note:p.note};
  });
  assert.notEqual(recovery.task.index,2,'Worked example must be followed by a DIFFERENT task');
  assert.equal(recovery.done,false,'Seeing a sample must never complete the card');
  assert.equal(recovery.answers.length,0,'A shown example is not a successful answer');
  assert.equal(recovery.hadMistake,true,'Errors stay scheduled for spaced repetition');
  assert.equal(recovery.draft,'','Old wrong answer should not silently enter the new task');
  assert(recovery.note.includes('Jeg kunne ikke komme i går.'),'Show the verified worked example');
  assert.equal(await page.evaluate(()=>window.NELivingWords.nextCard()),false);
  await page.evaluate(()=>{
   const d=window.NELivingWords.ensure();
   d.active=[{word:'etter hvert',translation:'постепенно',newToday:false}];
   d.formPractice={started:true,done:false,
    task:window.NECardFormPractice.taskList(d.active[0])[0],
    draft:'',misses:2,hadMistake:true,needsAnother:true,answers:[],taskCount:1,note:''};
   window.NELivingWords.render();
  });
  assert(await page.getByRole('button',{name:'Сменить ситуацию без готового ответа'}).isVisible());
  await page.getByRole('button',{name:'Сменить ситуацию без готового ответа'}).click();
  const unknownRecovery=await page.evaluate(()=>window.NELivingWords.ensure().formPractice);
  assert.equal(unknownRecovery.task.index!==0,true);
  assert(unknownRecovery.note.includes('нет заранее проверенного примера'),
    'Never fabricate an exemplar for an unverified word');
  assert.equal(unknownRecovery.done,false);
  // Norwegian has legitimate two-word sentences. Format mistakes must not
  // be recorded as genuine vocabulary failures.
  await page.evaluate(()=>{
   const d=window.NELivingWords.ensure();
   d.active=[{word:'sover',translation:'спит',newToday:false}];
   d.cardFeedback={correct:true,answer:'спит'};
   d.formPractice={started:true,done:false,
    task:window.NECardFormPractice.taskList(d.active[0])[0],
    draft:'',misses:0,hadMistake:false,needsAnother:false,answers:[],taskCount:1,note:''};
   window.NELivingWords.render();
  });
  await page.locator('#livingFormAnswer').fill('Сплю');
  await page.getByRole('button',{name:'Проверить предложение'}).click();
  assert.equal(await page.evaluate(()=>window.NELivingWords.ensure().formPractice.misses),0,
   'Accidentally typing Russian must not count as an incorrect Norwegian attempt');
  await page.locator('#livingFormAnswer').fill('Jeg sover.');
  await page.getByRole('button',{name:'Проверить предложение'}).click();
  await page.waitForFunction(()=>window.NELivingWords.ensure().formPractice.done===true);
  assert.equal(await page.evaluate(()=>window.NELivingWords.ensure().formPractice.misses),0);
  assert.deepEqual(errors,[],'No JavaScript errors during the mobile lesson');
  console.log('PASS mobile: contextual sentence on every card, Russian/voice input, semantic corrections, saved mini-lesson and spaced review');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
