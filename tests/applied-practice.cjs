'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const state={level:'A2'};
let markup='',saved=0,studied=0;
const values={};
const document={
 getElementById(id){if(id==='appliedAnswer')return {value:values.answer||'',focus(){},addEventListener(){}};return {querySelector(){return {focus(){}}}};},
 querySelector(selector){const m=/data-field="([^"]+)"/.exec(selector);return m?{value:values[m[1]]||''}:null;}
};
const window={};
const context={window,state,document,shell:(html)=>{markup=html},saveState:()=>{saved++},touchStudy:()=>{studied++},Date,Intl};
vm.createContext(context);
vm.runInContext(read('cloze-coach.js'),context,{filename:'cloze-coach.js'});
vm.runInContext(read('functional-practice.js'),context,{filename:'functional-practice.js'});
const api=window.NEFunctionalPractice;
assert(api,'Module must initialize');
const catalog=api.getCatalog();
assert.equal(catalog.forms.length,8,'Two document simulations per CEFR level');
assert.equal(catalog.cloze.length,32,'Eight cloze tasks per level');
assert.equal(new Set(catalog.forms.map(x=>x.id)).size,8);
assert.equal(new Set(catalog.cloze.map(x=>x.id)).size,32);
for(const level of ['A1','A2','B1','B2']){
 assert.equal(catalog.forms.filter(x=>x.level===level).length,2);
 assert.equal(catalog.cloze.filter(x=>x.level===level).length,8);
}
for(const item of catalog.cloze){
 assert.equal(item.sentence.split('___').length,2,'Exactly one gap: '+item.id);
 assert(item.answer&&item.rule&&item.tag,'Every answer needs a validated expected form, grammar tag and rule');
 assert(!/[<>]/.test(item.sentence),'No markup in data');
}
for(const form of catalog.forms){
 assert(form.fields.length>=4,'Useful fields required in '+form.id);
 assert(form.fields.filter(f=>f.answer).length>=3,'At least 3 automatically checkable fields');
 assert(form.fields.every(f=>f.answer||f.example),'Open fields require model text');
}
assert.equal(api.normalize('  SNakker   '),'snakker');
api.open('forms','B2');
assert(markup.includes('Кari')===false,'Menu must not expose form answers');
assert(markup.includes('Klage på fiktivt vedtak'),'B2 applications must be reachable');
api.startForm('a2-absence');
const target=catalog.forms.find(x=>x.id==='a2-absence');
for(const field of target.fields)values[field.id]=field.answer||'Jeg er syk. Jeg kan ikke komme.';
const submitted=api.submitForm({preventDefault(){}});
assert.equal(submitted,false,'No browser navigation or server form post');
assert.equal(state.functionalPractice.attempts.at(-1).score,100,'Exact fields score correctly');
assert.equal(state.functionalPractice.attempts.at(-1).kind,'form');
assert(markup.includes('свободный ответ')||markup.includes('Свободный текст'),'Open writing is not scored automatically');
assert(!JSON.stringify(state.functionalPractice).includes(values.melding),'Form text must not enter persisted learning progress');
api.open('cloze','A1');
assert(markup.includes('8 предложений'));
api.startCloze();
const a1=api.getPracticePlan('A1',new Date().toISOString().slice(0,10));
assert.equal(a1.length,8);
assert.equal(a1[0].mode,'guided');
assert(markup.includes('Переведи и вставь слово:')&&markup.includes('изучаю'),'A1 opens with a clearly specified Russian word');
assert.equal(a1.filter(x=>x.mode==='free').length,1,'A1 includes one genuine free word task');
for(let i=0;i<8;i++){
 const match=markup.match(/Задание (\d+) из 8/);
 assert(match,'Cloze screen should have a numbered exercise');
 values.answer='definitely_wrong';
 api.checkCloze();
 assert(markup.includes('Разберём ответ'),'Wrong answer explains uncertainty instead of auto-revealing the answer');
 api.nextCloze();
 assert(markup.includes('Задание '+(i+1)+' из 8'),'Cannot advance without correcting the exercise');
 if(i===0){
  assert.equal(api.explainCloze(),true,'One-tap help must be available');
  assert(markup.includes('Нора объясняет')&&markup.includes('Перевод:')&&markup.includes('Нужная форма:'),
   'Help must show the full Norwegian sentence, its Russian translation and target form');
  assert(state.wordPracticeQueue?.lære,'Help schedules forgotten vocabulary');
  assert.equal(state.srs?.lære?.correct,0,'Assisted response cannot count as independent vocabulary mastery');
 }
 if(a1[i].mode==='free'){
  const alternatives=Object.keys(a1[i].examples).filter(x=>x!==a1[i].answer);
  values.answer=alternatives[0];
 }else values.answer=a1[i].answer;
 api.checkCloze();
 assert(markup.includes('Следующее'),'User can correct and continue after explanation');
 api.nextCloze();
}
assert.equal(state.functionalPractice.attempts.at(-1).score,0);
assert.equal(api.getPracticePlan('A2','2026-10-21').filter(x=>x.mode==='free').length,2);
assert.equal(api.getPracticePlan('B1','2026-10-21').filter(x=>x.mode==='free').length,3);
assert.equal(api.getPracticePlan('B2','2026-10-21').filter(x=>x.mode==='free').length,4);
assert.equal(state.functionalPractice.attempts.at(-1).kind,'cloze');
assert(state.functionalPractice.weaknesses['A1:presens']>0);
assert(saved>0&&studied>0,'Practice results should be persisted and credited as study activity');
assert(!read('functional-practice.js').includes('NEAdaptive.recordAttempt'),'Supplemental exercises must not silently certify CEFR mastery');
const bootstrap=read('access.js'),sw=read('sw.js'),html=read('index.html'),ui=read('ui-v7.js');
assert(bootstrap.includes("'functional-practice.js'"),'Module must load after login');
assert(sw.includes('/functional-practice.js?v=8.3.0'),'Offline module must be cached');
assert(sw.includes('/functional-practice.css?v=8.3.0'),'Offline stylesheet must be cached');
assert(html.includes('/functional-practice.css?v=8.3.0'),'Document stylesheet must load');
assert(ui.includes('window.NEFunctionalPractice?.open(target)'),'Hub router must open practice');
console.log('PASS applied practice: 32 cloze tasks, 8 simulated forms, input checking, privacy and hub/PWA integration');
