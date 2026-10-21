// Explain mistakes in verified cloze tasks without inventing grammar rules.
(() => {
 'use strict';
 const norm=x=>String(x||'').normalize('NFKC').toLocaleLowerCase('nb-NO').trim().replace(/^å\s+/,'').replace(/[.,!?]+$/g,'').replace(/\s+/g,' ');
 const escaped=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const verbForms=Object.freeze({
  'lære':{ru:'изучать, учить',forms:{lære:'инфинитив',lærer:'настоящее время (presens)',lærte:'прошедшее время (preteritum)',lært:'причастие прошедшего времени (perfektum)'}},
  'snakke':{ru:'говорить',forms:{snakke:'инфинитив',snakker:'настоящее время (presens)',snakket:'прошедшее время / причастие'}},
  'bo':{ru:'жить, проживать',forms:{bo:'инфинитив',bor:'настоящее время',bodde:'прошедшее время',bodd:'причастие'}},
  'drikke':{ru:'пить',forms:{drikke:'инфинитив',drikker:'настоящее время',drakk:'прошедшее время',drukket:'причастие'}},
  'jobbe':{ru:'работать',forms:{jobbe:'инфинитив',jobber:'настоящее время',jobbet:'прошедшее время / причастие'}},
  'være':{ru:'быть',forms:{være:'инфинитив',er:'настоящее время',var:'прошедшее время',vært:'причастие'}},
  'besøke':{ru:'навещать, посещать',forms:{besøke:'инфинитив',besøker:'настоящее время',besøkte:'прошедшее время',besøkt:'причастие'}},
  'gå':{ru:'идти',forms:{gå:'инфинитив',går:'настоящее время',gikk:'прошедшее время',gått:'причастие'}},
  'sende':{ru:'отправлять',forms:{sende:'инфинитив',sender:'настоящее время',sendte:'прошедшее время',sendt:'причастие'}},
  'ha':{ru:'иметь',forms:{ha:'инфинитив',har:'настоящее время',hadde:'прошедшее время',hatt:'причастие'}},
  'kunne':{ru:'мочь, уметь',forms:{kunne:'инфинитив / прошедшее время',kan:'настоящее время',kunnet:'причастие'}},
  'ville':{ru:'хотеть, собираться',forms:{ville:'инфинитив / прошедшее время',vil:'настоящее время'}},
  'bli':{ru:'становиться',forms:{bli:'инфинитив',blir:'настоящее время',ble:'прошедшее время',blitt:'причастие'}},
  'vurdere':{ru:'оценивать, рассматривать',forms:{vurdere:'инфинитив',vurderer:'настоящее время',vurderte:'прошедшее время',vurdert:'причастие',vurderes:'пассивная форма'}},
 });
 const first={lemma:'lære',meaning:'изучать, учить'};
 const contexts=Object.freeze({'a1-presens-1':'Каждый день я изучаю норвежский язык.'});
 function expectedVerb(task){
  if(task?.id==='a1-presens-1')return 'lære';
  const match=String(task?.sentence||'').match(/\(å\s+([a-zæøå]+)\)/i);
  const lemma=match?.[1]?.toLocaleLowerCase('nb-NO');
  if(lemma&&verbForms[lemma])return lemma;
  const answer=norm(task?.answer);
  return Object.keys(verbForms).find(lemma=>answer in verbForms[lemma].forms)||'';
 }
 function diagnose(task,attempt){
  const word=norm(attempt),correct=norm(task?.answer);
  if(!word)return {kind:'empty',message:'Попробуй ввести слово. Если не знаешь его, нажми «Не знаю — объясни».'};
  if(word===correct)return {kind:'correct',message:'Верно.'};
  const lemma=expectedVerb(task),expected=verbForms[lemma];
  const other=Object.entries(verbForms).find(([_,info])=>word in info.forms);
  const rule=String(task?.rule||'').slice(0,400);
  if(expected&&word in expected.forms){
   const label=expected.forms[word];
   return {kind:'wrong-form',lemma,word,message:'«'+attempt.trim()+'» — '+label+' глагола «å '+lemma+'» («'+expected.ru+'»). В этом задании нужна другая форма. '+rule+' Исправь форму и проверь снова.'};
  }
  if(other&&other[0]!==lemma){
   const [otherLemma,info]=other;
   return {kind:'wrong-word',lemma,word,message:'«'+attempt.trim()+'» — '+info.forms[word]+' глагола «å '+otherLemma+'» («'+info.ru+'»). Само слово не обязательно ошибочно, но в этом упражнении проверяется '+(expected?'«å '+lemma+'» («'+expected.ru+'»)':'другое слово')+'. '+rule+' Попробуй ещё раз.'};
  }
  return {kind:'unverified',lemma,word,message:'Этот вариант пока нельзя подтвердить для данного задания. '+(expected?'Нужное действие — «å '+lemma+'» («'+expected.ru+'»). ':'')+rule+' Проверь значение и форму. Если ты имел в виду другую конструкцию, она может быть правильной в ином предложении.'};
 }
 function help(task,stage){
  const lemma=expectedVerb(task),entry=verbForms[lemma];
  const meaning=entry?'«å '+lemma+'» — '+entry.ru+'. ':'Смотри на смысл предложения и указанное правило. ';
  if(stage===1)return 'Подсказка 1 · Значение. '+(contexts[task?.id]||'')+' '+meaning+'Попробуй подобрать слово самостоятельно.';
  if(stage===2)return 'Подсказка 2 · Грамматика. '+String(task?.rule||'Найди подходящую грамматическую форму.');
  if(stage>=3){
   const example=String(task?.sentence||'').replace('___',String(task?.answer||''));
   return 'Разбор · '+example+'. '+String(task?.rule||'')+' Готовый образец — помощь, а не самостоятельное подтверждение знания. Слово вернётся в повторение.';
  }
  return '';
 }
 function queueReview(task,state){
  if(!state||!task)return false;
  const lemma=expectedVerb(task),info=verbForms[lemma];
  if(!lemma||!info)return false;
  const now=Date.now(),k=lemma;
  state.dailyDictionary=state.dailyDictionary||{};
  state.srs=state.srs||{};
  state.wordPracticeQueue=state.wordPracticeQueue||{};
  const existing=Object.keys(state.dailyDictionary).find(key=>norm(state.dailyDictionary[key]?.lemma||state.dailyDictionary[key]?.word)===lemma);
  const storeKey=existing||k,old=state.dailyDictionary[storeKey]||{};
  if(!existing){
   // Review vocabulary must not consume one of the five new daily words.
   state.dailyDictionary[storeKey]={...old,lemma:'å '+lemma,translation_ru:info.ru,
    level:state.level||'A1',correct:0,wrong:0,strength:0,firstDate:new Date(now).toISOString().slice(0,10),source:'cloze_explanation'};
  }
  const record=state.dailyDictionary[storeKey];record.nextDue=now;
  record.lastClozeExplanation=new Date(now).toISOString();
  const stored=Object.entries(state.srs).find(([key,item])=>norm(item?.word||key)===lemma);
  const srsKey=stored?.[0]||storeKey;
  if(!state.srs[srsKey])state.srs[srsKey]={word:'å '+lemma,translation:info.ru,level:state.level||'A1',stage:0,seen:0,correct:0};
  state.srs[srsKey].due=now;
  state.wordPracticeQueue[k]=now;
  return true;
 }
 window.NEClozeCoach=Object.freeze({diagnose,help,queueReview,expectedVerb,context:task=>contexts[task?.id]||'',norm});
})();