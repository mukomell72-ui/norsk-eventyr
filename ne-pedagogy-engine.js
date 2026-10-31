/* Norsk Eventyr pedagogy engine v0.1. Pure, local, formative learning. No official CEFR grading. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.NEPedagogyEngine=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const KEY='ne_pedagogy_a1_exemplar_v1';
// Reuse the existing checkpoint key. New optional fields remain backward-compatible.
const REVIEW_GAPS=[1,1,3,7,14,30];
const RUSSIAN_RECALL=Object.freeze({
 hei:['привет','здравствуй','здравствуйте'],
 heter:['зовут','называют','меня зовут'],
 bor:['живу','живешь','живёт','живет','жить','проживаю','проживает'],
 i:['в','во'],
 nøkkelen:['ключ','этот ключ'],
 på:['на'],
 bordet:['стол','столе','стола'],
 takk:['спасибо','благодарю'],
 hyggelig:['приятно','приятный','милый','рад'],
 også:['тоже','также'],
 kaffe:['кофе'],
 kommer:['прихожу','приходит','приезжаю','приезжает'],
 kommer_fra:['родом из','происхожу из','приезжаю из','из','откуда'],
 hva:['что','какой','какая'],
 ha_det:['пока','до свидания','прощай'],
 fra:['из','от'],
 hvor:['где','куда','откуда'],
 spørsmål:['вопрос'],
 nå:['сейчас','теперь'],
 god_morgen:['доброе утро'],
 du:['ты','тебя'],
 jeg:['я'],
 under:['под'],
 melken:['молоко'],
 klokka:['время','часов'],
 besøk:['гости','визит','посещение'],
 brød:['хлеб'],
 ta_med:['взять с собой','принести'],
 har:['имею','есть','имеет']
});
const cap=(s,max=800)=>String(s??'').trim().slice(0,max);
const normalize=s=>cap(s).normalize('NFKC').toLocaleLowerCase('nb').replace(/[!?.,;:()[\]"«»]/g,' ').replace(/\s+/g,' ').trim();
function localDay(date){let d=new Date(date);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function addDays(date,days){const d=new Date(date);d.setHours(12,0,0,0);d.setDate(d.getDate()+days);return localDay(d)}
function normalizeRussian(s){return cap(s,160).normalize('NFKC').toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/[!?.,;:()[\]"«»]/g,' ').replace(/\s+/g,' ').trim()}
function recallKey(word){return String(word||'').normalize('NFKC').toLocaleLowerCase('nb').trim().replace(/\s+/g,'_')}
function checkRecall(word,input){const key=recallKey(word),choices=RUSSIAN_RECALL[key]||[];if(!choices.length)return null;const answer=normalizeRussian(input);return answer.length>0&&choices.some(x=>normalizeRussian(x)===answer)}
function assess(task,text,choiceIndex){
 if(task.kind==='choice'){
  const index=choiceIndex,valid=Number.isInteger(index)&&index>=0&&index<task.choices.length;
  return {accepted:valid&&task.choices[index][1]===true,missing:valid&&task.choices[index][1]?[]:[{name:'смысл реплики',explain:task.teach}],valid};
 }
 const answer=normalize(text);
 if(answer.length<2)return {accepted:false,missing:[],valid:false};
 // Rules check the requested communicative goal, not just isolated keywords.
 // This remains local formative feedback, never a pronunciation or CEFR grade.
 const missing=(task.criteria||[]).filter(c=>{
  const found=c.patterns.some(p=>new RegExp(p,'iu').test(answer));
  const contradicted=(c.reject||[]).some(p=>new RegExp(p,'iu').test(answer));
  return !found||contradicted;
 });
 return {accepted:missing.length===0,missing,valid:true};
}
function createEngine({lesson,storage,clock=()=>new Date(),key=KEY}={}){
 if(!lesson||!Array.isArray(lesson.stages))throw new Error('Урок не задан.');
 const tasks=lesson.stages.flatMap((stage,stageIndex)=>stage.tasks.map((task,taskIndex)=>({...task,stageIndex,taskIndex,stageId:stage.id})));
 if(new Set(tasks.map(x=>x.id)).size!==tasks.length)throw new Error('Повторяющиеся id учебных заданий.');
 const defaultState=()=>({schema:1,lessonId:lesson.id,revision:lesson.revision,index:0,records:{},reviews:{},avatar:'male',name:'',lastFeedback:null,completedAt:null,startedAt:clock().toISOString()});
 let store=storage||null;
 if(!store){try{store=typeof localStorage!=='undefined'?localStorage:null}catch{store=null}}
 function validState(raw){
  if(!raw||raw.schema!==1||raw.lessonId!==lesson.id||raw.revision!==lesson.revision)return defaultState();
  const fresh=defaultState();
  return {...fresh,index:Math.max(0,Math.min(tasks.length,Number.isInteger(raw.index)?raw.index:0)),avatar:['male','female'].includes(raw.avatar)?raw.avatar:'male',name:cap(raw.name,40),records:raw.records&&typeof raw.records==='object'&&!Array.isArray(raw.records)?raw.records:{},reviews:raw.reviews&&typeof raw.reviews==='object'&&!Array.isArray(raw.reviews)?raw.reviews:{},completedAt:cap(raw.completedAt,30)||null,startedAt:cap(raw.startedAt,30)||fresh.startedAt,lastFeedback:null};
 }
 let state;
 try{state=validState(JSON.parse(store?.getItem(key)||'null'))}catch{state=defaultState()}
 function persist(){try{store?.setItem(key,JSON.stringify({...state,lastFeedback:null}));return true}catch{return false}}
 function now(){return clock()}
 function day(){return localDay(now())}
 function current(){if(state.index>=tasks.length)return null;return tasks[state.index]}
 function record(){const task=current();if(!task)return null;return state.records[task.id]||(state.records[task.id]={trials:0,hints:0,accepted:false,skipped:false,independent:false,skills:[],lastAnswer:'',feedback:null});}
  function saveDraft(text,{source='typed'}={}){
   const r=record();if(!r||r.accepted||r.skipped)return true;
   r.draft=String(text??'').slice(0,500);r.draftSource=source==='voice'?'voice':'typed';
   return persist();
  }
 function progress(){
  const done=tasks.slice(0,state.index);
  const independent=done.filter(t=>state.records[t.id]?.independent).length;
  const assisted=done.filter(t=>state.records[t.id]?.accepted&&!state.records[t.id]?.independent).length;
  const skipped=done.filter(t=>state.records[t.id]?.skipped).length;
  return {done:state.index,total:tasks.length,independent,assisted,skipped,percent:Math.round(state.index/tasks.length*100)};
 }
 function schedule(task,independent){
  for(const word of task.words||[]){
   const old=state.reviews[word]||{interval:0,successes:0};
   const successes=independent?Math.min(5,Number(old.successes||0)+1):0;
   state.reviews[word]={...old,successes,interval:REVIEW_GAPS[successes],due:addDays(now(),REVIEW_GAPS[successes]),last:day(),times:(Number(old.times)||0)+1,verifiedRecalls:Number(old.verifiedRecalls)||0};
  }
 }
 function askHelp(){
  const t=current();if(!t)return null;
  const r=record();r.hints=Math.min(100,r.hints+1);
  const explain=r.hints>=2?('Ещё один пример: '+(t.alternative||t.teach)):t.teach;
  persist();return {title:'Нора объясняет',text:explain,assisted:true};
 }
 function audioTask(task){return task?.skill==='listening'&&task?.hideSpeech===true}
  function markHeard(){const task=current();if(!audioTask(task))return false;const r=record();r.heardAt=now().toISOString();persist();return true}
 function useReadingFallback(){const task=current();if(!audioTask(task))return false;const r=record();r.readingFallback=true;r.heardAt=null;persist();return true}
 function submit(input,{source='typed',choiceIndex}={}){
  const task=current();if(!task)return {ok:false,reason:'finished'};
  const r=record();if(r.accepted||r.skipped)return {ok:false,reason:'already_checked'};
  if(audioTask(task)&&!r.heardAt&&!r.readingFallback)return {ok:false,reason:'listen_first',message:'Сначала прослушай реплику до конца. Если звук недоступен, выбери чтение вместо аудирования.'};
  const result=assess(task,input,choiceIndex);
  if(!result.valid)return {ok:false,reason:'empty',message:'Выбери ответ или введи свою реплику.'};
  r.trials=Math.min(100,r.trials+1);
  r.lastAnswer=task.kind==='choice'?String(choiceIndex):cap(input);
  r.lastSource=audioTask(task)?(r.readingFallback?'reading_fallback':'audio_playback'):(source==='voice'?'voice_transcript':'typed_text');
  r.lastAt=now().toISOString();
  r.skills.push({skill:task.skill,source:r.lastSource,correct:result.accepted,assisted:r.hints>0,at:r.lastAt});
  if(result.accepted){
   r.accepted=true;
   r.independent=r.trials===1&&r.hints===0&&!r.readingFallback;
   schedule(task,r.independent);
   r.feedback={accepted:true,firstTry:r.independent,explanation:r.independent?'Хорошо! Ты выполнил задачу самостоятельно.':'Верно! После объяснения получилось. Повторим позже без подсказки.',source:r.lastSource};
  }else{
   let explanation=result.missing[0]?.explain||task.teach||'Проверь смысл реплики.';
   if(r.trials===2){
    // A second failure changes the explanation, not just repeats the first notice.
    r.hints=Math.min(100,r.hints+1);
    explanation='Попробуем иначе. '+(task.teach||explanation)+' Другой пример, не готовый ответ: '+(task.alternative||'Составь одну короткую фразу, затем добавь вторую.');
   }else if(r.trials>=3){
    r.hints=Math.min(100,r.hints+1);
    explanation='Раздели ответ на маленькие части. Сначала скажи основную мысль; потом добавь то, чего не хватает: '+result.missing.map(x=>x.name).join(', ')+'. '+(task.alternative||task.teach||'');
   }
   r.feedback={accepted:false,firstTry:false,explanation,missing:result.missing.map(x=>x.name),source:r.lastSource};
  }
  state.lastFeedback=r.feedback;
   r.draft=task.kind==='choice'?'':String(input??'').slice(0,500);r.draftSource=source==='voice'?'voice':'typed';
   const saved=persist();return {ok:true,...r.feedback,tries:r.trials,saved};
 }
 function next(){
  const t=current();if(!t)return false;
  const r=record();if(!r.accepted&&!r.skipped)return false;
  state.index++;
  if(state.index>=tasks.length)state.completedAt=now().toISOString();
   state.lastFeedback=null;
   if(!persist()){state.index--;state.completedAt=null;return false}
   return true;
 }
 function skip(){
  const t=current();if(!t)return false;
  const r=record();r.skipped=true;r.feedback={accepted:false,skipped:true,explanation:'Задание пропущено. Вернись к нему при повторении.'};
  for(const w of t.words||[]){state.reviews[w]={successes:0,interval:0,due:day(),last:day(),times:0}}
  state.index++;if(state.index>=tasks.length)state.completedAt=now().toISOString();persist();return true;
 }
 function dueWords(limit=15){return Object.entries(state.reviews).filter(([,r])=>r.due<=day()).sort((a,b)=>a[1].due.localeCompare(b[1].due)).slice(0,limit).map(([word,r])=>({word,due:r.due,successes:r.successes,meaning:lesson.wordGlossary?.[word]||'',canTest:!!RUSSIAN_RECALL[recallKey(word)]}))}
 function reviewWord(word,remembered){
  // Backward-compatible *self-report*. Never mark as verified recall.
  const item=state.reviews[word];if(!item||item.due>day())return false;
  const level=remembered?Math.min(5,(Number(item.successes)||0)+1):0;
  state.reviews[word]={...item,successes:level,interval:REVIEW_GAPS[level],due:addDays(now(),REVIEW_GAPS[level]),last:day(),times:(Number(item.times)||0)+1,unverifiedSelfReports:(Number(item.unverifiedSelfReports)||0)+1};
  persist();return true;
 }
 function testRecall(word,answer,{giveUp=false}={}){
  const item=state.reviews[word];
  if(!item||item.due>day())return {ok:false,reason:'not_due'};
  if(!RUSSIAN_RECALL[recallKey(word)])return {ok:false,reason:'no_key',message:'Для этого слова ещё нет надёжного контрольного ответа.'};
  if(!giveUp&&!normalizeRussian(answer))return {ok:false,reason:'empty',message:'Напиши перевод или выбери «Не знаю».'};
  const correct=!giveUp&&checkRecall(word,answer)===true;
  const level=correct?Math.min(5,(Number(item.successes)||0)+1):0;
  state.reviews[word]={...item,successes:level,interval:REVIEW_GAPS[level],due:addDays(now(),REVIEW_GAPS[level]),last:day(),times:(Number(item.times)||0)+1,
   verifiedRecalls:(Number(item.verifiedRecalls)||0)+(correct?1:0),recallAttempts:(Number(item.recallAttempts)||0)+1,
   lastRecallCorrect:correct,lastRecallAnswer:cap(answer,160),lastRecallAt:now().toISOString()};
  persist();return {ok:true,correct,word,expected:RUSSIAN_RECALL[recallKey(word)][0],nextDue:state.reviews[word].due,verified:!giveUp};
 }
  function setAvatar(v){if(!['male','female'].includes(v))return false;state.avatar=v;return persist()}
  function setName(v){state.name=cap(v,40).replace(/[<>]/g,'');return persist()}
 function report(){
  const p=progress(),skills={};for(const t of tasks.slice(0,state.index)){
   const r=state.records[t.id];if(!r)continue;
   const k=t.skill, item=skills[k]||(skills[k]={independent:0,assisted:0,skipped:0,voiceTranscripts:0});
   if(r.skipped)item.skipped++;
   else if(r.readingFallback)item.readingFallback=(item.readingFallback||0)+1;
   else if(r.independent)item.independent++;
   else if(r.accepted)item.assisted++;
   if(r.lastSource==='voice_transcript')item.voiceTranscripts++;
  }
  const reviews=Object.values(state.reviews);
  const retention={tested:reviews.reduce((n,r)=>n+(Number(r.recallAttempts)||0),0),remembered:reviews.reduce((n,r)=>n+(Number(r.verifiedRecalls)||0),0),selfReports:reviews.reduce((n,r)=>n+(Number(r.unverifiedSelfReports)||0),0)};
  const sourceEvidence={voiceTranscripts:Object.values(state.records).filter(r=>r?.lastSource==='voice_transcript').length,
   typedDialogues:tasks.filter(t=>t.skill==='speaking'&&state.records[t.id]?.lastSource==='typed_text').length,
    listeningPlayback:tasks.filter(t=>t.skill==='listening'&&state.records[t.id]?.accepted&&state.records[t.id]?.heardAt&&!state.records[t.id]?.readingFallback).length,
   listeningTextFallback:tasks.filter(t=>t.skill==='listening'&&state.records[t.id]?.accepted&&state.records[t.id]?.readingFallback).length};
  return {...p,skills,due:dueWords(),retention,sourceEvidence,completed:state.index===tasks.length,plannedMinutes:lesson.plannedMinutes};
 }
 function getView(){const task=current();if(!task)return {finished:true,report:report(),avatar:state.avatar,name:state.name};return {finished:false,task,stage:lesson.stages[task.stageIndex],stageNumber:task.stageIndex+1,stageTotal:lesson.stages.length,progress:progress(),record:record(),feedback:state.lastFeedback,avatar:state.avatar,name:state.name,due:dueWords()}}
 function clearForTesting(){state=defaultState();persist()}
  return Object.freeze({getView,save:persist,saveDraft,submit,askHelp,next,skip,progress,dueWords,reviewWord,testRecall,markHeard,useReadingFallback,setAvatar,setName,report,reset:clearForTesting,export:()=>JSON.stringify({...state,lastFeedback:null}),lesson,taskCount:tasks.length});
}
return Object.freeze({createEngine,assess,normalize,normalizeRussian,checkRecall,localDay,addDays});
});
