'use strict';
// Grounded explanations of wrong words/forms and one-tap review scheduling.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict');
const w={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../cloze-coach.js'),'utf8'),{window:w,Date,Number,Object,String});
const coach=w.NEClozeCoach;
assert(coach,'Nora cloze tutor available');
const all=fs.readFileSync(path.join(__dirname,'../functional-practice.js'),'utf8');
const ids=[...all.matchAll(/\['(a1|a2|b1|b2)-[a-z0-9-]+'/g)].map(m=>m[0].slice(2,-1));
const uniq=[...new Set(ids)];
assert(uniq.length>=32,'Core cloze catalog should contain 32 exercises');
for(const id of uniq){
 const info=coach.infoFor({id});
 assert(info&&info.lemma&&info.translation&&info.sentenceRu,'All core cloze prompts have a vetted Russian translation and dictionary lemma: '+id);
}
const task={id:'a1-presens-1',sentence:'Hver dag ___ jeg norsk.',answer:'lærer',rule:'Presens: å lære → lærer'};
const help=coach.help(task);
assert.equal(help.sentenceNo,'Hver dag lærer jeg norsk.');
assert.equal(help.sentenceRu,'Каждый день я изучаю норвежский язык.');
assert.equal(help.lemma,'å lære');assert.equal(help.requiredForm,'lærer');
assert.equal(coach.diagnose(task,'lære').kind,'wrong-form');
assert(coach.diagnose(task,'lære').message.includes('инфинитив'),'Wrong conjugation has an explanation');
assert.equal(coach.diagnose(task,'lærte').kind,'wrong-form');
assert(coach.diagnose(task,'lærte').message.includes('прошедшее'),'Wrong tense explained');
assert.equal(coach.diagnose(task,'snakker').kind,'wrong-word');
assert(coach.diagnose(task,'snakker').message.includes('говорить'),'Different semantic word is distinguished');
assert.equal(coach.diagnose(task,'ghjjf').kind,'unverified','Unknown answers are not categorically called ungrammatical');
const state={level:'A1',dailyDictionary:{},srs:{},wordPracticeQueue:{}};
assert.equal(coach.queueReview(task,state),true);
assert.equal(state.dailyDictionary.lære.correct,0,'Reading answer never counts as mastery');
assert.equal(state.srs.lære.correct,0);
assert(state.wordPracticeQueue.lære>0,'Help schedules near-term review');
state.dailyDictionary.lære.correct=2;
const length=Object.keys(state.dailyDictionary).length;
assert.equal(coach.queueReview(task,state),true);
assert.equal(Object.keys(state.dailyDictionary).length,length,'Repeated help must not duplicate learned word');
assert.equal(state.dailyDictionary.lære.correct,2,'Repeat lookup does not erase prior mastery');
assert.equal(coach.queueReview({id:'a1-plural-1',sentence:'Vi har tre ___. (en bok)',answer:'bøker'},state),true);
assert.equal(state.dailyDictionary['en bok'].translation_ru,'книга','Nouns also enter the dictionary using lemma');
assert.equal(state.srs['en bok'].correct,0);
assert.equal(coach.queueReview({id:'unknown'},state),false,'Unverified content cannot create arbitrary vocabulary entries');
const g=coach.plan([
 {id:'a1-presens-1',level:'A1',answer:'lærer',sentence:'Hver dag ___ jeg norsk.',tag:'presens'},
 {id:'a1-presens-2',level:'A1',answer:'bor',sentence:'Hun ___ i Kongsberg.',tag:'presens'},
 ...Array.from({length:6},(_,i)=>({id:'a1-'+i,level:'A1',answer:'test'+i,tag:'presens'}))
],'A1','2026-10-21');
assert.equal(g.length,8);
assert.equal(g[0].mode,'guided');
assert.equal(coach.targetRu(g[0]),'изучаю');
assert.equal(g.filter(x=>x.mode==='review').length,1);
assert.equal(g.filter(x=>x.mode==='free').length,1);
const free=g.find(x=>x.mode==='free');
assert(coach.isOpen(free));
assert(coach.checkLocal(free,free.answer).accepted===true);
assert(coach.checkLocal(free,free.id==='free-a1-norsk'?'snakker':'jobber').accepted===true,
 'Alternative in open practice must pass without matching the reference');
assert(coach.checkLocal(free,'lærte').accepted===false || coach.checkLocal(free,'lærte').accepted===null,
 'Past tense cannot get automatic credit for A1 present practice');
assert.equal(coach.checkLocal({...g[0]},'snakker').accepted,false,
 'The same alternative must NOT satisfy a targeted Russian translation');
assert.equal(coach.diagnose(g[0],'snakker').kind,'wrong-word');
assert.equal(coach.help(free).sentenceRu.startsWith('Перевод'),false,
 'Free practice should include a checked Russian example');
for(const level of ['A1','A2','B1','B2']){
 const prompts=coach.freeCatalog(level);
 assert(prompts.length>=1&&prompts.every(x=>coach.isOpen(x)&&coach.infoFor(x)?.sentenceRu),
  'Each free prompt needs verified examples and translation: '+level);
 const distribution=coach.plan(Array.from({length:8},(_,i)=>({id:'course-'+level+'-'+i,level,answer:'har'})),level,'2026-10-21');
 assert.equal(distribution.length,8);
 assert.equal(distribution.filter(x=>x.mode==='free').length,{A1:1,A2:2,B1:3,B2:4}[level]);
 assert.equal(distribution.filter(x=>x.mode==='review').length,1);
}

console.log('PASS Nora cloze tutoring: 32 verified translations, form/tense/meaning diagnostics, immediate dictionary and spaced reviews without free mastery');
