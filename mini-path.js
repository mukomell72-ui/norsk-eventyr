// Norsk Eventyr · short retrieval rounds. Pure learning-state logic, independent of DOM.
// Original mini-lesson flow, not Duolingo artwork or source code.
(function(){
'use strict';
const SIZE=5,QUIZ=2;
const normalize=v=>String(v||'').normalize('NFKC').toLocaleLowerCase('ru-RU').replace(/ё/g,'е').trim().replace(/\s+/g,' ');
const validWord=x=>x&&typeof x.word==='string'&&typeof x.translation==='string'&&x.translation.trim();
function groups(count){return Math.ceil(Math.max(0,Number(count)||0)/SIZE)}
function boundaries(count){const n=Math.max(0,Math.floor(Number(count)||0)),out=[];for(let i=SIZE;i<n;i+=SIZE)out.push(i);if(n)out.push(n);return out}
function progress(d){
 const initial=Array.isArray(d?.active)?d.active.length:0;
 const rounds=boundaries(initial),reached=Math.min(initial,Math.max(0,Number(d?.cardsSeen)||0));
 const completed=rounds.filter(x=>d?.miniRounds?.[String(x)]?.done===true).length;
 return {size:SIZE,total:initial,seen:reached,rounds:rounds.length,completed,
  reviewCount:Math.max(0,(Number(d?.cardsSeen)||0)-initial),
  pending:!!d?.miniRound,percent:initial?Math.round(100*reached/initial):0,
  stages:rounds.map((limit,i)=>({number:i+1,start:i*SIZE+1,end:limit,done:d?.miniRounds?.[String(limit)]?.done===true,
    current:reached<limit&&reached>=i*SIZE}))};
}
function build(d,boundary){
 const words=Array.isArray(d?.active)?d.active:[],end=Math.max(0,Math.min(words.length,Number(boundary)||0));
 if(!words.length||end===0||!boundaries(words.length).includes(end)||d?.miniRounds?.[String(end)]?.done)return null;
 const start=Math.max(0,end-SIZE),eligible=[];
 for(let i=start;i<end;i++)if(validWord(words[i]))eligible.push(i);
 if(!eligible.length)return {boundary:end,phase:'break',questions:[],index:0,mistakes:0};
 const candidates=eligible.length===1?[eligible[0]]:[eligible[0],eligible[eligible.length-1]];
 const questions=[];
 for(const [n,wordIndex] of candidates.slice(0,QUIZ).entries()){
  const answer=String(words[wordIndex].translation).trim(),same=normalize(answer),alternatives=[];
  for(const [idx,w] of words.entries()){
   if(idx===wordIndex||!validWord(w)||normalize(w.translation)===same)continue;
   if(alternatives.some(x=>normalize(x)===normalize(w.translation)))continue;
   alternatives.push(String(w.translation).trim());
  }
  const other=alternatives.slice(0,2);
  if(!other.length)continue; // Avoid invented or ambiguous distractors.
  const options=other.slice(),position=(end+n)%Math.min(3,other.length+1);
  options.splice(position,0,answer);
  questions.push({wordIndex,options,correct:position,audio:n===1,tries:0,revealed:false});
 }
 return {boundary:end,phase:questions.length?'quiz':'break',questions,index:0,mistakes:0,note:'',startedAt:new Date().toISOString()};
}
function evaluate(round,choice){
 if(!round||round.phase!=='quiz')return {valid:false,reason:'not-a-quiz'};
 const q=round.questions?.[round.index];
 if(!q||!Number.isInteger(choice)||choice<0||choice>=q.options.length)return {valid:false,reason:'invalid-choice'};
 if(choice!==q.correct){q.tries=(Number(q.tries)||0)+1;round.mistakes=(Number(round.mistakes)||0)+1;
  round.note='Пока не получилось. Вспомни слово и выбери другой перевод.';
  return {valid:true,correct:false,wordIndex:q.wordIndex,firstMiss:q.tries===1};
 }
 round.index++;round.note='';
 if(round.index>=round.questions.length)round.phase='break';
 return {valid:true,correct:true,done:round.phase==='break'};
}
window.NEMiniPath=Object.freeze({SIZE,groups,boundaries,progress,build,evaluate});
})();