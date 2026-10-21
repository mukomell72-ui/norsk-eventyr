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
 ['kunne','verb',5,'Jeg kunne ikke komme i går.'],
 ['god','adjective',5,'Jeg har en god venn.'],
 ['stor','adjective',5,'Dette er en stor bil.'],
 ['begynner','verb',5,'Jeg begynner på jobb klokka åtte.']
]){
 const entry={word,translation:'пример'},tasks=E.taskList(entry);
 assert.equal(tasks.length,count,word);
 assert(tasks.every(t=>t.kind==='sentence'&&t.prompt&&t.requiredForm&&t.type===type),word);
 assert(tasks.every(t=>t.russianSentence&&t.modelAnswer&&t.prompt.startsWith('Переведи на норвежский:')),
  'Known words must offer a concrete Russian sentence instead of abstract free-writing');
 assert(E.containsWord(tasks.find(t=>t.index===(word==='begynner'?1:word==='kunne'?2:0)),example,entry),
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
 ['verbs',['kunne','være','ha','gjøre','gå','komme','bo','lære','jobbe','snakke','spørre','svare','skrive','lese','se','ta','få','spise','drikke','kjøpe','velge','legge','ligge','forstå','finne','sende','besøke','vente','begynne','slutte','logge inn','ordne opp','rekke','oppdage','beklage','foretrekke','vaske','rengjøre','hente','åpne'],'verb'],
 ['nouns',['bil','hus','bok','jobb','nøkkel','time','oppgave','pause','faktura','brød','møte','avtale','beskjed','erfaring','misforståelse','søknad','vedtak','spørsmål','målgruppe','avveining','forbehold','rapport','eple','dag','uke','år','butikk','rom','ord','barn','jente','skole','venn','klokke'],'noun']
]){
 for(const key of keys){
  const entry={word:pos==='noun'?window.NECardGrammar.describe({word:key}).headword:key,pos};
  const tasks=E.taskList(entry);
  assert(tasks.every(t=>typeof t.russianSentence==='string'&&/[А-Яа-яЁё]/.test(t.russianSentence)),key+' missing Russian text');
  assert(tasks.every(t=>typeof t.modelAnswer==='string'&&E.containsWord(t,t.modelAnswer,entry)),key+' reference answer does not match required form');
 }
}
const modalTasks=E.taskList({word:'kunne',pos:'modal'});
assert.equal(modalTasks[1].russianSentence,'Я могу тебе помочь.');
assert.equal(modalTasks[2].russianSentence,'Вчера я не мог прийти.');
assert(E.containsWord(modalTasks[1],'Jeg kan hjelpe deg.',{word:'kunne',pos:'modal'}));
assert(!E.containsWord(modalTasks[2],'Jeg kan hjelpe deg.',{word:'kunne',pos:'modal'}),
 'Present kan cannot pass the past kunne exercise');
assert(E.containsWord(modalTasks[2],'Jeg kunne ikke komme i går.',{word:'kunne',pos:'modal'}));
assert(E.containsWord(modalTasks[4],'Etter kurset skal jeg kunne snakke norsk.',{word:'kunne',pos:'modal'}));
assert(E.containsWord(modalTasks[3],'Jeg har alltid kunnet hjelpe deg.',{word:'kunne',pos:'modal'}),
 'An adverb between har and kunnet must not be rejected before meaning is checked');
assert(E.containsWord(modalTasks[4],'I morgen skal jeg kanskje kunne hjelpe deg.',{word:'kunne',pos:'modal'}),
 'Natural V2 with a modal adverb must pass the morphology gate');
assert(!E.containsWord(modalTasks[4],'I morgen kan jeg hjelpe deg.',{word:'kunne',pos:'modal'}),
 'Wrong future morphology must remain rejected');
assert(E.hint(modalTasks[2],1).includes('kan — могу'),'Feedback explains the precise modal contrast');
const superlative=E.taskList({word:'stor'})[4];
assert.equal(superlative.russianSentence,'Это самый большой стол в комнате.');
const ordinaryPlural=E.taskList({word:'stor'})[2];
assert.equal(E.spellingHint(ordinaryPlural,'Det er store hus.'),'',
 'A valid Bokmål demonstrative must not be incorrectly classified as a typo');
for(const [word,examples] of [
 ['time',['Урок начинается в девять.','Timen begynner klokka ni.']],
 ['brød',['Буханки хлеба лежат на столе.','Brødene ligger på bordet.']],
 ['erfaring',['Это был полезный опыт.','Det var en nyttig erfaring.']],
 ['jobb',['Работа начинается в восемь.','Jobben begynner klokka åtte.']],
 ['faktura',['Счета уже оплачены.','Fakturaene er betalt.']],
 ['klokke',['Часы висят на стене.','Klokka henger på veggen.']]
]){
 const tasks=E.taskList({word, pos:'noun'});
 assert(tasks.some(t=>t.russianSentence===examples[0]&&t.modelAnswer===examples[1]),word+' must have a life-like context');
}
for(const key of ['jobb','time','brød','erfaring','klokke','dag','uke','år','møte','misforståelse','avtale','faktura','målgruppe','forbehold','avveining']){
 const entry={word:key,pos:'noun'},tasks=E.taskList(entry);
 assert(tasks.length===4&&tasks.every(t=>t.modelAnswer&&E.containsWord(t,t.modelAnswer,entry)),
  'Every curated noun sentence must pass its actual morphological requirement: '+key);
 assert(tasks.every(t=>!/(этот час здесь|эти хлеба важны|эти опыты важны)/i.test(t.russianSentence)),
  'Do not teach meaningless generic patterns: '+key);
}
assert(E.containsWord(superlative,'Dette er det største bordet i rommet.',{word:'stor'}));
assert(E.spellingHint(superlative,'Dette er det største bordet i romm').includes('«romm»: правильно «rommet»'),
 'Near-identical mistranslation pinpoints the typo instead of demanding a new sentence');
assert.equal(E.spellingHint(superlative,superlative.modelAnswer),'','A correct translation must have no spelling warning');
assert.equal(E.spellingHint(superlative,'Dette er det største bordet i stua.'),'',
 'An independently valid alternative is left to semantic grading');

// Screenshot regression: a full sentence can contain two simultaneous mistakes.
// Explain each one (where, correction and why), not "write a complete sentence".
const clockTask=E.taskList({word:'klokke'})[2];
assert.equal(clockTask.modelAnswer,'Det er flere klokker i butikken.');
const errorNote=E.diagnoseErrors(clockTask,'Det er flere klokka i butiken',{word:'klokke'});
assert(errorNote.includes('«klokka» → «klokker»'),errorNote);
assert(errorNote.includes('«butiken» → «butikken»'),errorNote);
assert(errorNote.includes('после «flere»'),errorNote);
assert(!errorNote.includes('нужно полное предложение'),errorNote);
assert.equal(E.diagnoseErrors(clockTask,clockTask.modelAnswer,{word:'klokke'}),'');
assert.equal(E.diagnoseErrors(clockTask,'Det er flere klokker i butikkene.',{word:'klokke'}),'',
 'Valid inflected alternative must not be labeled a misspelling');
assert.equal(E.diagnoseErrors(clockTask,'Det finnes flere klokker i butikken.',{word:'klokke'}),'',
 'A natural synonymous sentence must not be forced to match word-for-word');
assert(E.diagnoseErrors(clockTask,'Det er flere klokker i butiken',{word:'klokke'}).includes('butikken'),
 'Single typo is diagnosed without needing a form error');
assert(E.diagnoseErrors(clockTask,'Det er flere klokka i butikken',{word:'klokke'}).includes('klokker'),
 'Single wrong noun form is diagnosed without needing a typo');
assert(!E.hint(clockTask,1).includes('Недостаточно написать одно слово'),
 'No generic "one word" reprimand for a submitted full sentence');

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
assert(sw.includes('/card-form-practice.js?v=8.3.0-lesson24-translate4'));
assert(pkg.scripts.test.includes('node card-form-practice.cjs'));
// Regression: "skulle" must no longer fall back to unverified free writing.
for(const spelling of ['skulle','skal']){
 const word={word:spelling,pos:'other',translation:'собираться'};
 const tasks=E.taskList(word);
 assert.deepEqual(Array.from(tasks,t=>t.requiredForm),['skal','skulle']);
 assert(tasks.every(t=>t.kind==='sentence'&&t.russianSentence&&t.modelAnswer));
 assert(tasks.every(t=>E.containsWord(t,t.modelAnswer,word)), 'Modal answers must pass morphology: '+spelling);
 assert(!tasks.some(t=>t.requiredForm==='har skullet'),'No rare perfect drills on A1');
}
console.log('PASS contextual practice: per-word sentences, verified inflections, meaningful situations, feminine alternatives, safety for unknown words');
