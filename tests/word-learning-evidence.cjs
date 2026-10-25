'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'word-learning-evidence.js'),'utf8');
let saved=0,current={level:'A1',learningV8:{},dailyDictionary:{},srs:{}};
const glossary=[{word:'å begynne',ru:'начинать',stage:'new'},{word:'en jobb',ru:'работа',stage:'yesterday'},{word:'en buss',ru:'автобус',stage:'review'}];
const window={get neLearnerState(){return current;},saveState(){saved++},NEWordTrays:{focus:()=>glossary},NECardGrammar:{describe:({word})=>word==='å begynne'?{verified:true,forms:[{form:'begynner'},{form:'begynte'}]}:word==='en jobb'?{verified:true,forms:[{form:'jobben'},{form:'jobber'}]}:{verified:false,forms:[]}}};
vm.runInNewContext(source,{window,Date,Array,Set,Map,Object,Math,Number,String,JSON,RegExp,Intl});
const api=window.NEWordLearning,lesson={id:'qa-work-1',level:'A1'},good={accepted:true,score:100,issues:[]};
const used=api.observe({lesson,answer:'Jeg begynner på jobben klokka åtte.',assessment:good,gradeKey:'dialogue:0',firstAttempt:true,mode:'dialogue'});
assert.deepEqual(Array.from(used),['å begynne','en jobb'],'Verified inflected forms are found');
assert.equal(current.learningV8.wordUsageEvidence.events.length,2);
assert(!JSON.stringify(current.learningV8.wordUsageEvidence).includes('Jeg begynner'),'No raw answers stored');
assert.equal(api.observe({lesson,answer:'Jeg begynner på jobben.',assessment:good,gradeKey:'dialogue:0',firstAttempt:true,mode:'dialogue'}).length,0);
assert.equal(current.learningV8.wordUsageEvidence.events.length,2,'Repeat is not counted twice');
assert.equal(api.observe({lesson,answer:'Jeg begynner.',assessment:good,gradeKey:'free:writing:4',firstAttempt:false,mode:'writing'}).length,0);
assert.equal(api.observe({lesson,answer:'Jeg begynner.',assessment:{accepted:true,score:90,issues:[{source_fragment:'begynner'}]},gradeKey:'free:writing:4',firstAttempt:true,mode:'writing'}).length,0);
assert.equal(api.observe({lesson,answer:'Jeg begynner.',assessment:{accepted:true,score:100,issues:null},gradeKey:'free:writing:4',firstAttempt:true,mode:'writing'}).length,0);
assert.deepEqual(Array.from(api.observe({lesson,answer:'Jeg begynner.',assessment:good,gradeKey:'free:writing:4',firstAttempt:true,mode:'writing'})),['å begynne']);
assert.equal(current.learningV8.wordUsageEvidence.events.length,3);
assert.equal(Object.keys(current.dailyDictionary).length,0,'No fake mastery in dictionary');
assert.equal(Object.keys(current.srs).length,0,'No fake mastery in SRS');
assert.equal(saved,2,'Only two independent responses persisted');
const todayRanked=api.focus(lesson);
assert.equal(todayRanked.find(x=>x.word==='å begynne').delayedUse,false,
 'Two uses in one lesson on the same day do not prove delayed recall');
assert.equal(todayRanked.find(x=>x.word==='å begynne').distinctDays,1,
 'Only one study day is counted before a delayed occasion');
// Simulate the first grounded response having happened two days ago.
const past=current.learningV8.wordUsageEvidence.events.find(e=>e.word==='en jobb');
past.at=Date.now()-2*86400000;
past.date=new Date(past.at).toLocaleDateString('sv-SE');
assert.deepEqual(Array.from(api.observe({
 lesson:{id:'qa-work-2',level:'A1'},answer:'Jobben er viktig.',
 assessment:good,gradeKey:'free:writing:5',firstAttempt:true,mode:'writing'
})),['en jobb']);
const history=api.focus(lesson).find(x=>x.word==='en jobb');
assert.equal(history.usageCount,2);
assert.equal(history.distinctDays,2,'Delayed review requires different days');
assert.equal(history.contextCount,2,'Delayed review requires different lesson contexts');
assert.equal(history.delayedUse,true,'Independent usage after 24h in a new lesson is observed');
assert.equal(api.focus(lesson).find(x=>x.word==='å begynne').delayedUse,false,
 'Other words cannot inherit delayed retention evidence');
assert.equal(saved,3,'Delayed independent usage is persisted once');
const ranked=api.focus(lesson);
assert.equal(ranked[0].word,'en buss','Not-yet-applied review word receives more teaching attention');
assert.equal(ranked.find(x=>x.word==='å begynne').usageCount,2);
assert.equal(ranked.find(x=>x.word==='en buss').usageCount,0);
current={level:'A1',learningV8:{},dailyDictionary:{},srs:{}};
assert(api.focus(lesson).every(x=>x.usageCount===0),'No evidence leaks between accounts');
assert.equal(api.observe({lesson,answer:'Jeg bor i en buss.',assessment:{accepted:false,score:100,issues:[]},gradeKey:'dialogue:1',firstAttempt:true,mode:'dialogue'}).length,0);
console.log('PASS integrated Nora usage evidence: exact inflections, independent first answers, no XP, private history');
