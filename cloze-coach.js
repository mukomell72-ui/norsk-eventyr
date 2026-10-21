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
 const meanings=Object.freeze({
 'a1-presens-1':['å lære','изучать, учить','Каждый день я изучаю норвежский язык.'],
 'a1-presens-2':['å bo','жить','Она живёт в Конгсберге.'],
 'a1-plural-1':['en bok','книга','У нас три книги.'],
 'a1-singular':['et hus','дом','У меня есть дом.'],
 'a1-adjective':['stor','большой','Это большой дом.'],
 'a1-negation':['å drikke','пить','Я не пью кофе.'],
 'a1-question':['å snakke','говорить','Ты говоришь по-норвежски?'],
 'a1-plural-2':['en bil','машина','У меня две машины.'],
 'a2-preteritum-1':['å jobbe','работать','Вчера я работал.'],
 'a2-preteritum-2':['å være','быть','На прошлой неделе я болел.'],
 'a2-perfektum':['å bo','жить','Я живу в Норвегии уже два года.'],
 'a2-infinitiv':['å besøke','посещать, навещать','Завтра я собираюсь посетить врача.'],
 'a2-plural':['et eple','яблоко','Она купила два яблока.'],
 'a2-strong':['å gå','идти','Вчера мы ходили в город.'],
 'a2-letter':['å sende','отправлять','В понедельник мы отправили заявление.'],
 'a2-auxiliary':['å ha','иметь (вспомогательный глагол)','Я никогда не был в этом офисе.'],
 'b1-condition':['å ville','хотеть; выражать намерение','Если я получу выходной, я навещу семью.'],
 'b1-v2':['å gå','идти','После работы я иду домой.'],
 'b1-reason':['å ha','иметь','Я ищу работу, потому что у меня есть опыт.'],
 'b1-concession':['å gå','идти','Хотя идёт дождь, мы идём гулять.'],
 'b1-passive':['å bli','становиться; вспомогательный глагол пассива','Документы были отправлены вчера.'],
 'b1-duration':['i','в течение (о длительности)','Я жду уже три недели.'],
 'b1-reported':['å kunne','мочь','Он рассказал, что не мог прийти.'],
 'b1-plural':['en søknad','заявление, заявка','Было рассмотрено несколько заявлений.'],
 'b2-passiv':['å sende','отправлять','Письмо следует отправить до установленного срока.'],
 'b2-conditional':['å ville','хотеть; намереваться','Если вопрос не будет решён, я попрошу обоснование.'],
 'b2-counterfactual':['å ha','иметь (вспомогательный глагол)','Предложение было бы лучше, если бы мы сначала оценили затраты.'],
 'b2-review':['å vurdere','рассматривать, оценивать','Решение необходимо пересмотреть.'],
 'b2-subordinate':['å bli','становиться; вспомогательный глагол пассива','Крайне важно, чтобы все стороны были выслушаны.'],
 'b2-relative':['å være','быть','Прилагаемая документация описывает проблему.'],
 'b2-hypothetical':['å ville','хотеть; условная конструкция','Если бы отчёт был готов, мы отправили бы его вчера.'],
 'b2-precision':['presis','точный','Нам нужен более точный ответ.']
 });
 function infoFor(task){
  const data=meanings[task?.id];
  return data?{lemma:data[0],translation:data[1],sentenceRu:data[2]}:null;
 }
 function expectedVerb(task){
  if(task?.id==='a1-presens-1')return 'lære';
  const match=String(task?.sentence||'').match(/\(å\s+([a-zæøå]+)\)/i);
  const lemma=match?.[1]?.toLocaleLowerCase('nb-NO');
  if(lemma&&verbForms[lemma])return lemma;
  const answer=norm(task?.answer);
  return Object.keys(verbForms).find(lemma=>answer in verbForms[lemma].forms)||'';
 }
 // These prompts do not prescribe a particular verb or Russian meaning.
 // Accept a verified local set immediately; ask the tutor for other plausible verbs.
 const openPrompts=Object.freeze({
  'a1-presens-1':Object.freeze({
   lærer:'изучаю',snakker:'говорю',studerer:'изучаю',leser:'читаю',skriver:'пишу',
   bruker:'использую',forstår:'понимаю',praktiserer:'практикую'
  }),
  'a1-presens-2':Object.freeze({
   bor:'живёт',jobber:'работает',arbeider:'работает',studerer:'учится',
   lever:'живёт',sover:'спит',handler:'делает покупки',trener:'тренируется',
   underviser:'преподаёт',lærer:'учится',oppholder:'находится'
  })
 });
 function isOpen(task){return Object.prototype.hasOwnProperty.call(openPrompts,task?.id)}
 function checkLocal(task,answer){
  const word=norm(answer);
  if(!word)return {accepted:false,kind:'empty',message:'Введи подходящее слово.'};
  if(word===norm(task?.answer))return {accepted:true,kind:'reference',message:'Верно. Это подходящее слово и нужная форма.'};
  if(!isOpen(task))return {accepted:false,kind:'restricted'};
  if(!/^[a-zæøå]{2,45}$/iu.test(word))return {accepted:false,kind:'wrong-form',message:'Впиши один норвежский глагол в нужной форме, без других слов и знаков.'};
  const meaning=openPrompts[task.id][word];
  if(meaning)return {accepted:true,kind:'alternative',
   message:'Верно! «'+answer.trim()+'» ('+meaning+') — грамматически подходящий вариант. Твой ответ отличается от примера, но он правильный.'};
  const recognized=Object.entries(verbForms).find(([lemma,info])=>word in info.forms&&lemma!=='ville');
  if(recognized){
   const form=recognized[1].forms[word];
   if(!/настоящее время/.test(form))
    return {accepted:false,kind:'wrong-form',message:'«'+answer.trim()+'» — '+form+' глагола «å '+recognized[0]+'». Здесь нужна форма настоящего времени (presens).'};
  }
  return {accepted:null,kind:'needs-review',message:'Это другой вариант. Нора проверит грамматику и смысл всего предложения.'};
 }
 async function verifyUnknown(task,answer){
  if(!isOpen(task))return {accepted:false,kind:'restricted',message:'В этом задании указан конкретный грамматический материал.'};
  const local=checkLocal(task,answer);if(local.accepted!==null)return local;
  if(typeof window.aiEvaluate!=='function')
    return {accepted:null,kind:'unavailable',message:'Не удалось проверить этот вариант автоматически. Это не считается ошибкой. Проверь подключение и попробуй ещё раз.'};
  try{
    const response=await window.aiEvaluate({action:'validate_open_cloze',task_id:task.id,word:String(answer||'').trim()});
    if(!response?.ok||response.data?.kind!=='open_cloze'||typeof response.data.accepted!=='boolean')
      return {accepted:null,kind:'unavailable',message:'Сейчас не удалось проверить этот вариант. Ответ не засчитан как ошибка, повтори проверку при наличии связи.'};
    return {accepted:response.data.accepted,kind:response.data.accepted?'alternative':'context-error',
      message:String(response.data.explanation_ru||'').slice(0,360)||'Нора не смогла подробно объяснить ответ.'};
  }catch{return {accepted:null,kind:'unavailable',message:'Нет связи с проверкой. Ответ пока не оценён и не считается ошибкой.'}}
 }
 function diagnose(task,attempt){
  const word=norm(attempt),correct=norm(task?.answer);
  if(!word)return {kind:'empty',message:'Попробуй ввести слово. Если не знаешь его, нажми «Не знаю слово».'};
  if(word===correct)return {kind:'correct',message:'Верно.'};
  if(isOpen(task)){
   const verdict=checkLocal(task,attempt);
   if(verdict.kind!=='needs-review')return verdict;
   return {kind:'unverified',message:'В этом предложении может быть несколько правильных глаголов. '+verdict.message};
  }
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
 function help(task){
  const record=infoFor(task),fullNo=String(task?.sentence||'').replace('___',String(task?.answer||''));
  return {sentenceNo:fullNo,
   sentenceRu:record?.sentenceRu||'Перевод всего предложения пока не проверен.',
   lemma:record?.lemma||'',
   translation:record?.translation||'',
   requiredForm:String(task?.answer||''),
   rule:String(task?.rule||'Проверь форму слова.'),
   message:record?'Помощь записана. Слово появится в повторении.':'Для этого упражнения нет подтверждённой словарной записи.'
  };
 }
 function queueReview(task,state){
  const item=infoFor(task);if(!item||!state)return false;
  const lemma=item.lemma,normalized=norm(lemma),now=Date.now();
  state.dailyDictionary=state.dailyDictionary||{};
  state.srs=state.srs||{};
  state.wordPracticeQueue=state.wordPracticeQueue||{};
  const found=Object.entries(state.dailyDictionary).find(([k,v])=>norm(v?.lemma||v?.word||k)===normalized);
  const dk=found?.[0]||normalized,existing=found?.[1];
  if(!existing)state.dailyDictionary[dk]={
   lemma,translation_ru:item.translation,level:task.level||state.level||'A1',correct:0,wrong:0,
   strength:0,firstDate:new Date(now).toISOString().slice(0,10),source:'cloze_help'
  };
  const record=state.dailyDictionary[dk];
  record.nextDue=now;record.lastClozeHelp=new Date(now).toISOString();
  const savedSrs=Object.entries(state.srs).find(([k,v])=>norm(v?.word||k)===normalized);
  const sk=savedSrs?.[0]||dk;
  if(!state.srs[sk])state.srs[sk]={
   word:lemma,translation:item.translation,level:task.level||state.level||'A1',stage:0,seen:0,correct:0
  };
  state.srs[sk].due=now;
  state.wordPracticeQueue[normalized]=now;
  return true;
 }
 window.NEClozeCoach=Object.freeze({diagnose,help,queueReview,expectedVerb,infoFor,norm,isOpen,checkLocal,verifyUnknown});
})();