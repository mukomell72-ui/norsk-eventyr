// Each vocabulary word must be applied meaningfully in a complete sentence,
// with a randomized, verified inflection requirement where the paradigm is known.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const load=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const window={};
const ctx={window,Math,Number,Array,Object,String};
vm.runInNewContext(load('card-grammar.js'),ctx);
vm.runInNewContext(load('card-form-practice.js'),ctx);
const E=window.NECardFormPractice;
assert(E,'Contextual practice engine should initialize');
for(const [word,type,count,example] of [
 ['en bil','noun',4,'Jeg har en bil.'],
 ['et hus','noun',4,'Jeg bor i et hus.'],
 ['å gå','verb',5,'Jeg liker å gå hjem.'],
 ['å være','verb',5,'Jeg ønsker å være hjemme.'],
 ['god','adjective',5,'Jeg har en god venn.'],
 ['stor','adjective',5,'Dette er en stor bil.'],
 ['begynner','verb',5,'Jeg begynner på jobb klokka åtte.']
]){
 const entry={word,translation:'пример'},tasks=E.taskList(entry);
 assert.equal(tasks.length,count,word);
 assert(tasks.every(t=>t.kind==='sentence'&&t.prompt&&t.requiredForm&&t.type===type),word);
 assert(tasks.every(t=>t.russianSentence&&t.modelAnswer&&t.prompt.startsWith('Переведи на норвежский:')),
  'Known words must offer a concrete Russian sentence instead of abstract free-writing');
 assert(E.containsWord(tasks.find(t=>t.index===(word==='begynner'?1:0)),example,entry),
  'Appropriate sentence must contain required morphological form for '+word);
 for(const task of tasks){
  assert(E.containsWord(task,'Jeg vil skrive: '+task.requiredForm+'.',entry),'Exact form in phrase detected: '+word);
  assert(!E.containsWord(task,'Bordet ligger inne i skapet.',entry),
   'Unrelated text must be rejected: '+word);
  assert(E.hint(task,1).includes('форм'),'Targeted grammar hint: '+word);
  assert(E.hint(task,3).length>40,'Targeted morphological hint after repeated errors');
  assert.notEqual(E.choose(entry,task.index,()=>0).index,task.index,'Changed task following mistake');
 }
}
assert.equal(window.NECardGrammar.describe({word:'begynner'}).headword,'å begynne');
assert.equal(E.containsWord(E.taskList({word:'en bil'})[0],'Jeg har en gammel bil.',{word:'en bil'}),true,
 'A natural indefinite noun phrase may contain an adjective between article and noun');
assert.equal(E.containsWord(E.taskList({word:'en bok'})[0],'Jeg leser ei bok.',{word:'en bok'}),true,
 'Bokmål alternative feminine articles must be accepted');
assert.equal(E.containsWord(E.taskList({word:'en bok'})[1],'Jeg leser boka.',{word:'en bok'}),true,
 'Bokmål feminine definite endings must be accepted');
assert.equal(E.containsWord(E.taskList({word:'et hus'})[2],'Jeg ser huset.',{word:'et hus'}),false,
 'Singular bestemt cannot count as plural ubestemt');
// All 86 verified lexemes (34 nouns, 39 verbs, 13 adjectives) have Russian prompts
// for every inflection, and a model solution that passes the morphology gate.
for(const [name,keys,pos] of [
 ['adjectives',['stor','liten','god','ny','viktig','lang','kort','gammel','fin','dyr','billig','rask','forsinket'],'adjective'],
 ['verbs',['være','ha','gjøre','gå','komme','bo','lære','jobbe','snakke','spørre','svare','skrive','lese','se','ta','få','spise','drikke','kjøpe','velge','legge','ligge','forstå','finne','sende','besøke','vente','begynne','slutte','logge inn','ordne opp','rekke','oppdage','beklage','foretrekke','vaske','rengjøre','hente','åpne'],'verb'],
 ['nouns',['bil','hus','bok','jobb','nøkkel','time','oppgave','pause','faktura','brød','møte','avtale','beskjed','erfaring','misforståelse','søknad','vedtak','spørsmål','målgruppe','avveining','forbehold','rapport','eple','dag','uke','år','butikk','rom','ord','barn','jente','skole','venn','klokke'],'noun']
]){
 for(const key of keys){
  const entry={word:pos==='noun'?window.NECardGrammar.describe({word:key}).headword:key,pos};
  const tasks=E.taskList(entry);
  assert(tasks.every(t=>typeof t.russianSentence==='string'&&/[А-Яа-яЁё]/.test(t.russianSentence)),key+' missing Russian text');
  assert(tasks.every(t=>typeof t.modelAnswer==='string'&&E.containsWord(t,t.modelAnswer,entry)),key+' reference answer does not match required form');
 }
}
const superlative=E.taskList({word:'stor'})[4];
assert.equal(superlative.russianSentence,'Это самый большой стол в комнате.');
assert(E.containsWord(superlative,'Dette er det største bordet i rommet.',{word:'stor'}));
assert(E.spellingHint(superlative,'Dette er det største bordet i romm').includes('«romm»: правильно «rommet»'),
 'Near-identical mistranslation pinpoints the typo instead of demanding a new sentence');
assert.equal(E.spellingHint(superlative,superlative.modelAnswer),'','A correct translation must have no spelling warning');
assert.equal(E.spellingHint(superlative,'Dette er det største bordet i stua.'),'',
 'An independently valid alternative is left to semantic grading');

assert(!E.containsWord(superlative,'Dette er et stort bord i rommet.',{word:'stor'}));
assert(E.containsWord(E.taskList({word:'begynner'})[4],'I morgen skal jeg begynne på jobb.',{word:'begynner'}));
const phrase={word:'etter hvert',pos:'phrase',translation:'постепенно'};
const unknown={word:'å underbygge',translation:'обосновывать'};
for(const entry of [phrase,unknown,{word:'hensiktsmessig',pos:'adjective',translation:'целесообразный'}]){
 const tasks=E.taskList(entry);
 assert.equal(tasks.length,3,'Unknown paradigms still get three contextual variations');
 assert(tasks.every(t=>t.kind==='sentence'&&t.answer===null&&t.requiredForm===null),
  'Unknown morphology must not be fabricated');
 assert.notEqual(E.choose(entry,tasks[0].index,()=>0).index,tasks[0].index);
}
assert(E.containsWord(E.taskList(phrase)[0],'Etter hvert lærer jeg flere ord.',phrase));
assert(!E.containsWord(E.taskList(phrase)[0],'Jeg lærer flere ord.',phrase));
assert(E.norm('  HAR   GÅTT! ')==='har gått');
const access=load('access.js'),sw=load('sw.js'),pkg=JSON.parse(load('tests/package.json'));
assert(access.includes("'card-grammar.js','card-form-practice.js','mini-path.js','living-words.js'"));
assert(sw.includes('/card-form-practice.js?v=8.3.0-lesson23'));
assert(pkg.scripts.test.includes('node card-form-practice.cjs'));
console.log('PASS contextual practice: per-word sentences, verified inflections, meaningful situations, feminine alternatives, safety for unknown words');
