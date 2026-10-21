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
assert.equal(G.knownCount.translatedVerbs,G.knownCount.verbs,'Every curated verb must have Russian translations');
assert.equal(G.knownCount.translatedNouns,G.knownCount.nouns,'Every curated noun must have reviewed Russian glosses');
for(const noun of ['en bil','et hus','ei klokke','en time','et barn','en erfaring','en avtale','et rom']){
 const described=G.describe({word:noun});
 assert.equal(described.forms.length,4,noun);
 for(const row of described.forms)assert(row.translationRu&&row.translationRu.trim().length>=3,
   'Every noun form should show Russian translation: '+noun+' '+row.form);
}
assert.deepEqual(Array.from(G.describe({word:'ei klokke'}).forms,row=>row.translationRu),
 ['часы (одни)','эти часы (одни, конкретные)','часы (несколько)','эти часы (несколько конкретных)']);
assert.equal(G.describe({word:'en avdeling'}).forms.length,0,'Unknown nouns must not receive invented translations');
for(const lemma of ['kunne','gå','være','komme','skrive','begynne','jobbe','hente']){
 const result=G.describe({word:'å '+lemma});
 assert.equal(result.forms.length,5);
 for(const row of result.forms)assert(row.translationRu&&row.translationRu.length>2,lemma+' '+row.label);
}
assert.deepEqual(Array.from(G.describe({word:'kunne',pos:'modal'}).forms,row=>row.translationRu),
 ['мочь / уметь','могу / умею','мог / могла; мог(ла) бы','смог / смогла; имел(а) возможность','смогу / буду в состоянии']);
// Regression: a card with "skulle" and even a generic POS must show verified forms.
for(const word of ['skulle','skal','skullet','å skulle']){
 const result=G.describe({word,pos:'other',translation:'собираться'});
 assert.equal(result.type,'verb',word);
 assert.equal(result.headword,'å skulle',word);
 assert.equal(result.verified,true,word);
 assert.deepEqual(Array.from(result.forms,row=>row.form),['å skulle','skal','skulle','har skullet'],word);
 assert(result.forms.every(row=>row.translationRu),'Every modal form needs a Russian gloss');
 assert(!result.forms.some(row=>row.form==='skal skulle'),'Do not invent modal future');
}
console.log('PASS Russian translations on every verified verb form');
console.log('PASS article/infinitive/tense grammar: written paradigms, irregular forms, safe unknown fallback and contextual examples');
