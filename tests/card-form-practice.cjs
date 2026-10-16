// Every card must have randomized form recall or an AI-assessed sentence fallback.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const load=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const window={};
const ctx={window,Math,Number,Array,Object,String};
vm.runInNewContext(load('card-grammar.js'),ctx);
vm.runInNewContext(load('card-form-practice.js'),ctx);
const E=window.NECardFormPractice;
assert(E,'Practice module must initialize');
for(const [word,type,size] of [
 ['en bil','noun',4],['et hus','noun',4],['å gå','verb',5],
 ['å være','verb',5],['god','adjective',5],['stor','adjective',5]
]){
 const tasks=E.taskList({word,translation:'пример'});
 assert.equal(tasks.length,size,word);
 assert(tasks.every(t=>t.kind==='form'&&t.answer),word);
 assert(tasks.every(t=>t.type===type),word);
 assert(tasks.every(t=>t.prompt&&t.label),word);
 for(const task of tasks){
  assert.equal(E.correct(task,task.answer.toUpperCase()+'.',{word}),true,'Accepted target: '+word);
  assert.equal(E.correct(task,'неверная форма',{word}),false,'Rejected wrong inflection '+word);
  assert(E.hint(task,1).includes('Форма'));
  assert(E.hint(task,3).includes('Правильный вариант'));
 }
 for(const task of tasks){
  const replacement=E.choose({word,translation:'x'},task.index,()=>0);
  assert.notEqual(replacement.index,task.index,'Correction must be followed by different form');
 }
}
const noun={word:'en bok',translation:'книга'};
assert(E.correct(E.taskList(noun)[0],'ei bok',noun),'Accepted feminine article alternative');
assert(E.correct(E.taskList(noun)[1],'boka',noun),'Accepted feminine definite form');
const phrase={word:'etter hvert',pos:'phrase',translation:'постепенно'};
const unknown={word:'å underbygge',translation:'обосновывать'};
for(const entry of [phrase,unknown,{word:'hensiktsmessig',pos:'adjective',translation:'целесообразный'}]){
 const tasks=E.taskList(entry);
 assert.equal(tasks.length,3,'All unsupported paradigms require a sentence, never invented endings');
 assert(tasks.every(t=>t.kind==='sentence'&&t.answer===null));
 const different=E.choose(entry,tasks[0].index,()=>0);
 assert.notEqual(different.index,tasks[0].index);
}
assert(E.norm('  HAR   GÅTT! ')==='har gått');
const access=load('access.js'),sw=load('sw.js'),packageInfo=JSON.parse(load('tests/package.json'));
assert(access.includes("'card-grammar.js','card-form-practice.js','living-words.js'"));
assert(sw.includes('/card-form-practice.js?v=8.3.0-lesson19'));
assert(packageInfo.scripts.test.includes('node card-form-practice.cjs'));
console.log('PASS each word: inflections, randomized different retry, feminine variants, unknown form fallback and offline registration');
