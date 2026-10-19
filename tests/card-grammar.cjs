// Paradigms must be part-of-speech specific, no invented forms for unknown words.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','card-grammar.js'),'utf8');
const window={};vm.runInNewContext(source,{window,Date,String,Object,Array});
const G=window.NECardGrammar;
assert(G&&G.knownCount.nouns>=25&&G.knownCount.verbs>=30&&G.knownCount.adjectives>=10);
const sample=[
 [{word:'en bil',translation:'машина'},'noun','en bil',['en bil','bilen','biler','bilene']],
 [{word:'nøkkelen',translation:'ключ'},'noun','en nøkkel',['en nøkkel','nøkkelen','nøkler','nøklene']],
 [{word:'et hus',translation:'дом'},'noun','et hus',['et hus','huset','hus','husene']],
 [{word:'klokka',translation:'часы'},'noun','ei klokke',['ei klokke','klokka','klokker','klokkene']],
 [{word:'å gå',translation:'ходить'},'verb','å gå',['å gå','går','gikk','har gått','skal gå']],
 [{word:'å være',translation:'быть'},'verb','å være',['å være','er','var','har vært','skal være']],
 [{word:'kunne',pos:'modal',translation:'мочь'},'verb','å kunne',['å kunne','kan','kunne','har kunnet','skal kunne']],
 [{word:'å skrive',translation:'писать'},'verb','å skrive',['å skrive','skriver','skrev','har skrevet','skal skrive']],
 [{word:'å logge inn',translation:'входить'},'verb','å logge inn',['å logge inn','logger inn','logget inn','har logget inn','skal logge inn']],
 [{word:'begynner',translation:'начинаю'},'verb','å begynne',['å begynne','begynner','begynte','har begynt','skal begynne']],
 [{word:'god',translation:'хороший'},'adjective','god',['god','godt','gode','bedre','best']],
 [{word:'liten',translation:'маленький'},'adjective','liten',['liten','lite','små','mindre','minst']]
];
for(const [entry,type,head,forms] of sample){
 const result=G.describe(entry);
 assert.equal(result.type,type,entry.word);
 assert.equal(result.headword,head);
 assert.deepEqual(Array.from(result.forms,x=>x.form),forms);
 assert(result.example?.no&&result.example?.ru);
 assert(result.url.startsWith('https://ordbokene.no/bm/'));
}
const noun=G.describe({word:'en avdeling',translation:'отдел'});
assert.equal(noun.headword,'en avdeling');assert.equal(noun.forms.length,0,'Unknown noun must not receive guessed suffixes');
const verb=G.describe({word:'å underbygge',translation:'обосновывать'});
assert.equal(verb.headword,'å underbygge');assert.equal(verb.forms.length,1,'Unknown verb keeps only trustworthy infinitive');
const adj=G.describe({word:'hensiktsmessig',translation:'целесообразный',pos:'adjective'});
assert.equal(adj.forms.length,0,'Unknown adjectives cannot receive fabricated degrees');
const phrase=G.describe({word:'etter hvert',translation:'постепенно',pos:'phrase'});
assert.equal(phrase.type,'other');assert.equal(phrase.forms.length,0,'Multiword expressions do not need an article');
assert.equal(G.describe({word:'en bil'}).forms.length,4);
console.log('PASS article/infinitive/tense grammar: written paradigms, irregular forms, safe unknown fallback and contextual examples');
