// Conservative account-scoped evidence of independently used Norwegian words.
// No raw learner answers saved; no SRS, XP or CEFR mastery awarded by a word match.
(()=>{
'use strict';
const norm=s=>String(s||'').normalize('NFKC').toLocaleLowerCase('nb-NO').trim().replace(/\s+/gu,' ');
const lemma=s=>norm(s).replace(/^(?:å|en|ei|et)\s+/u,'');
const valid=s=>/^[a-zæøå]+(?:[\s'-][a-zæøå]+)*$/iu.test(s)&&s.length<=65;
function store(create=false){
 const s=window.neLearnerState;
 if(!s)return null;
 if(!s.learningV8||typeof s.learningV8!=='object'||Array.isArray(s.learningV8)){
  if(!create)return null;
  s.learningV8={};
 }
 const v=s.learningV8;
 if(!v.wordUsageEvidence||typeof v.wordUsageEvidence!=='object'||Array.isArray(v.wordUsageEvidence)){
  if(!create)return null;
  v.wordUsageEvidence={events:[],attemptKeys:[]};
 }
 const d=v.wordUsageEvidence;
 if(!Array.isArray(d.events))d.events=[];
 if(!Array.isArray(d.attemptKeys))d.attemptKeys=[];
 return d;
}
function variants(word){
 const values=[norm(word),lemma(word)];
 const forms=window.NECardGrammar?.describe?.({word});
 if(forms?.verified&&Array.isArray(forms.forms)){
  for(const x of forms.forms.slice(0,8))if(typeof x.form==='string')values.push(norm(x.form));
 }
 return [...new Set(values.filter(valid))].sort((a,b)=>b.length-a.length);
}
function contains(text,form){
 const escaped=form.replace(/[.*+?^$()|[\]{}]/g,'\\$&');
 return new RegExp('(?:^|[^\\p{L}])'+escaped+'(?=$|[^\\p{L}])','iu').test(text);
}
function observe({lesson,answer,assessment,gradeKey,firstAttempt,mode}={}){
 if(!firstAttempt||!lesson||!gradeKey||typeof answer!=='string'||
    !assessment||assessment.accepted!==true||assessment.score!==100||
    !Array.isArray(assessment.issues)||assessment.issues.length||
    !['dialogue','writing','speaking'].includes(mode))return [];
 if(answer.length>6000||!answer.trim()||!String(lesson.id||'').trim())return [];
 const rows=window.NEWordTrays?.focus?.(lesson);
 if(!Array.isArray(rows)||!rows.length)return [];
 const key=String(lesson.id).slice(0,100)+'|'+String(gradeKey).slice(0,100);
 const db=store(true);
 if(db.attemptKeys.includes(key))return [];
 const found=[],seen=new Set();
 for(const w of rows.slice(0,15)){
  const id=lemma(w.word);
  if(!valid(id)||seen.has(id))continue;
  if(variants(w.word).some(form=>contains(answer,form))){
   seen.add(id);found.push({word:w.word,stage:w.stage});
  }
 }
 if(!found.length)return [];
 db.attemptKeys.push(key);
 db.attemptKeys=db.attemptKeys.slice(-240);
 const at=Date.now(),date=new Date().toLocaleDateString('sv-SE');
 for(const w of found.slice(0,15)){
  db.events.push({word:w.word,date,at,level:String(lesson.level||'').slice(0,2),
   lessonId:String(lesson.id).slice(0,100),mode,stage:w.stage});
 }
 db.events=db.events.slice(-240);
 window.saveState?.();
 return found.map(x=>x.word);
}
function focus(lesson,max=15){
 const rows=window.NEWordTrays?.focus?.(lesson)||[];
 if(!Array.isArray(rows)||!rows.length)return [];
 const events=(store(false)?.events||[]).filter(e=>e&&Number(e.at)>Date.now()-45*86400000);
 const counts=new Map();
 for(const e of events){
  const k=lemma(e.word);if(!valid(k))continue;
  counts.set(k,(counts.get(k)||0)+1);
 }
 const stages={new:0,yesterday:1,review:2};
 return rows.slice(0,15).map(w=>({word:w.word,ru:w.ru,stage:w.stage,
  usageCount:counts.get(lemma(w.word))||0}))
  .filter(x=>valid(lemma(x.word))&&String(x.ru||'').length<=120)
  .sort((a,b)=>a.usageCount-b.usageCount||(stages[a.stage]??3)-(stages[b.stage]??3))
  .slice(0,Math.min(15,Math.max(1,Number(max)||15)));
}
window.NEWordLearning=Object.freeze({observe,focus,variants});
})();