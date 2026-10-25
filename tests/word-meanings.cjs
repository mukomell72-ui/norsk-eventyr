// Contextual dictionary: senses, provenance, safe HTML, integration and no progress mutation.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const styles=[];
const document={getElementById:()=>null,head:{appendChild:x=>styles.push(x)},
 createElement:()=>({id:'',textContent:''})};
const win={},sandbox={window:win,document,console};
vm.runInNewContext(read('word-meanings.js'),sandbox,{filename:'word-meanings.js'});
const lib=win.NEWordMeanings;
assert(lib&&typeof lib.render==='function','Dictionary module is installed');
const til=lib.lookup({word:'til',translation_ru:'к'});
assert.equal(til.senses.length,5,'til has five distinct contextual senses');
assert.equal(til.senses.find(x=>x.ru==='ещё').no,'Jeg vil ha en til.');
assert.equal(til.translation,'к','Original lesson translation stays contextual');
assert.equal(lib.lookup('på').senses.find(x=>x.no==='Jeg sitter på bussen.').ru,'в');
assert.equal(lib.lookup('i').senses.length,2,'i does not inherit the meaning of om');
assert(lib.searchText('til').includes('ещё')&&lib.searchText('til').includes('en gang til'),'Search includes secondary senses and phrases');
assert(!lib.hasVerified({word:'ukjent',translation_ru:'придуманное значение'}),'Unknown senses are never invented');
assert(lib.render({word:'ukjent',translation_ru:'слово'}).includes('Другие значения пока не проверены'));
const html=lib.render({word:'til',translation_ru:'<img src=x onerror=alert(1)>'},{expanded:true});
assert(html.includes('&lt;img')&&!html.includes('<img'),'User-provided text is escaped');
assert(html.includes('<details')&&html.includes('open'),'Expanded sense panel is accessible');
assert(!lib.lookup({word:'ukjent',meanings:[{ru:'ложный перевод',no:'Test.',translation:'Test.'}]}).senses.length,
 'Unverified generated senses must never appear as verified');
assert.equal(lib.lookup({word:'ukjent',meaningsVerified:true,meanings:[{ru:'пробный',no:'Dette er et eksempel.',translation:'Это пример.'}]}).senses.length,1,
 'Explicitly verified extra senses may be shown');
const required={
 'access.js':['word-meanings.js'],
 'lexicon.js':['NEWordMeanings?.searchText','NEWordMeanings?.render'],
 'lesson-vocabulary-trays.js':['NEWordMeanings?.render'],
 'living-words.js':['NEWordMeanings?.render']
};
for(const [file,tokens] of Object.entries(required))
 for(const token of tokens)assert(read(file).includes(token),file+' must integrate '+token);
assert(styles.length===1,'Styles are installed once');
console.log('Contextual dictionary checks passed.');
