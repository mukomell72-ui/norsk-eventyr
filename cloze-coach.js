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
 // The Norwegian example is not the only accepted answer in free practice.
 // Every free prompt states its tense/structure and has vetted alternatives.
 const freeTasks=Object.freeze({
  A1:[
   {id:'free-a1-norsk',sentence:'Hver dag ___ jeg norsk.',answer:'lærer',rule:'Настоящее время; после Hver dag личный глагол стоит перед jeg.',tag:'presens',
    examples:{lærer:'изучаю',snakker:'говорю',leser:'читаю',skriver:'пишу',bruker:'использую',studerer:'изучаю',praktiserer:'практикую'}},
   {id:'free-a1-city',sentence:'Hun ___ i Kongsberg.',answer:'bor',rule:'Подбери подходящий по смыслу глагол в настоящем времени.',tag:'presens',
    examples:{bor:'живёт',jobber:'работает',arbeider:'работает',studerer:'учится',sover:'спит',trener:'тренируется',underviser:'преподаёт'}}
  ],
  A2:[
   {id:'free-a2-home',sentence:'I går ___ jeg hjemme.',answer:'jobbet',rule:'I går требует прошедшего времени (preteritum).',tag:'preteritum',
    examples:{jobbet:'работал',leste:'читал',sov:'спал',spiste:'ел',trente:'тренировался',ryddet:'убирался'}},
   {id:'free-a2-tomorrow',sentence:'I morgen skal jeg ___ hjemme.',answer:'jobbe',rule:'После skal употребляется инфинитив без å.',tag:'infinitiv',
    examples:{jobbe:'работать',lese:'читать',sove:'спать',spise:'есть',trene:'тренироваться',rydde:'убираться'}}
  ],
  B1:[
   {id:'free-b1-return',sentence:'Etter møtet ___ jeg hjem.',answer:'gikk',rule:'Прошедшее событие; выбери подходящий глагол в preteritum.',tag:'preteritum',
    examples:{gikk:'пошёл',dro:'поехал / отправился',kjørte:'поехал на машине',syklet:'поехал на велосипеде',reiste:'отправился'}},
   {id:'free-b1-rain',sentence:'Hvis det regner, ___ jeg hjemme.',answer:'blir',rule:'В главной части после начального придаточного используется обратный порядок слов.',tag:'ordstilling',
    examples:{blir:'остаюсь',jobber:'работаю',leser:'читаю',studerer:'учусь',sitter:'сижу'}},
   {id:'free-b1-opinion',sentence:'Etter samtalen ___ vi saken videre.',answer:'diskuterte',rule:'Грамматически и смыслово подходящее прошедшее время.',tag:'preteritum',
    examples:{diskuterte:'обсудили',vurderte:'рассмотрели',undersøkte:'изучили',behandlet:'рассмотрели'}}
  ],
  B2:[
   {id:'free-b2-solution',sentence:'Dersom planen endres, ___ vi en ny løsning.',answer:'finner',rule:'Условная часть стоит первой: в главной части личная форма глагола перед vi.',tag:'ordstilling',
    examples:{finner:'находим',vurderer:'рассматриваем',foreslår:'предлагаем',utvikler:'разрабатываем',diskuterer:'обсуждаем'}},
   {id:'free-b2-case',sentence:'Saken ble ___ grundig.',answer:'vurdert',rule:'После ble нужна форма причастия прошедшего времени.',tag:'passiv',
    examples:{vurdert:'рассмотрено',behandlet:'обработано / рассмотрено',diskutert:'обсуждено',undersøkt:'исследовано',drøftet:'обсуждено'}},
   {id:'free-b2-report',sentence:'Rapporten bør ___ før møtet.',answer:'sendes',rule:'После bør в таком предложении уместен инфинитив пассива.',tag:'passiv',
    examples:{sendes:'отправить',leses:'прочитать',oppdateres:'обновить',gjennomgås:'просмотреть',vurderes:'рассмотреть'}},
   {id:'free-b2-proposal',sentence:'Forslaget kan ___ videre.',answer:'utvikles',rule:'После kan здесь подходит инфинитив пассива.',tag:'passiv',
    examples:{utvikles:'развивать',vurderes:'рассматривать',diskuteres:'обсуждать',bearbeides:'дорабатывать'}}
  ]
 });
 function freeCatalog(level){return (freeTasks[level]||[]).map(x=>({...x,level,mode:'free'}))}
 function isOpen(task){return task?.mode==='free'&&Object.values(freeTasks).some(pool=>pool.some(x=>x.id===task.id))}
 const targetRussian=Object.freeze({
  'a1-presens-1':'изучаю','a1-presens-2':'живёт','a1-plural-1':'книги','a1-singular':'дом',
  'a1-adjective':'большой','a1-negation':'пью','a1-question':'говоришь','a1-plural-2':'машины',
  'a2-preteritum-1':'работал','a2-preteritum-2':'болел','a2-perfektum':'живу','a2-infinitiv':'посетить',
  'a2-plural':'яблока','a2-strong':'ходили','a2-letter':'отправили','a2-auxiliary':'был',
  'b1-condition':'хочу','b1-v2':'иду','b1-reason':'есть','b1-concession':'идём',
  'b1-passive':'были','b1-duration':'в течение','b1-reported':'мог','b1-plural':'заявлений',
  'b2-passiv':'отправить','b2-conditional':'намереваюсь','b2-counterfactual':'бы','b2-review':'пересмотрено',
  'b2-subordinate':'были','b2-relative':'есть','b2-hypothetical':'могли бы','b2-precision':'точный'
 });
 function targetRu(task){return targetRussian[task?.id]||''}
 function practiceMode(task){
  if(isOpen(task))return 'free';
  return task?.mode==='review'?'review':'guided';
 }
 // In practice the mix changes from translation toward independent composition.
 // Review tasks still require morphological work, not copying a ready-made answer.
 function plan(base,level,date){
  const items=Array.isArray(base)?base.filter(x=>x?.level===level):[];
  const dist={A1:[6,1,1],A2:[5,1,2],B1:[4,1,3],B2:[3,1,4]}[level]||[6,1,1];
  const pool=freeCatalog(level);
  const seed=String(date||'').replace(/\D/g,'');
  const shift=(Number(seed.slice(-2))||0)%Math.max(1,pool.length);
  const free=Array.from({length:dist[2]},(_,i)=>pool[(i+shift)%pool.length]).filter(Boolean);
  const guided=items.slice(0,dist[0]).map(x=>({...x,mode:'guided'}));
  const review=items.slice(dist[0],dist[0]+dist[1]).map(x=>({...x,mode:'review'}));
  return [...guided,...review,...free];
 }
 function dailyPlan(base,level,date){
  const items=Array.isArray(base)?base.filter(x=>x?.level===level):[];
  if(!items.length)return [];
  const seed=Number(String(date||'').replace(/\D/g,''))||0,at=seed%items.length;
  const guided={...items[at],mode:'guided'},review={...items[(at+1)%items.length],mode:'review'};
  const free=freeCatalog(level)[seed%Math.max(1,freeCatalog(level).length)];
  return [guided,review,free].filter(Boolean);
 }
 const freeMeanings=Object.freeze({
  'free-a1-norsk':['å lære','изучать','Каждый день я изучаю норвежский язык.'],
  'free-a1-city':['å bo','жить','Она живёт в Конгсберге.'],
  'free-a2-home':['å jobbe','работать','Вчера я работал дома.'],
  'free-a2-tomorrow':['å jobbe','работать','Завтра я буду работать дома.'],
  'free-b1-return':['å gå','идти','После встречи я пошёл домой.'],
  'free-b1-rain':['å bli','оставаться','Если будет дождь, я останусь дома.'],
  'free-b1-opinion':['å diskutere','обсуждать','После разговора мы продолжили обсуждать вопрос.'],
  'free-b2-solution':['å finne','находить','Если план изменится, мы найдём новое решение.'],
  'free-b2-case':['å vurdere','рассматривать','Дело было тщательно рассмотрено.'],
  'free-b2-report':['å sende','отправлять','Отчёт следует отправить до встречи.'],
  'free-b2-proposal':['å utvikle','разрабатывать','Предложение можно доработать.']
 });
 function infoFor(task){
  const data=meanings[task?.id]||freeMeanings[task?.id];
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
 function checkLocal(task,answer){
  const word=norm(answer);
  if(!word)return {accepted:false,kind:'empty',message:'Введи подходящее слово.'};
  if(word===norm(task?.answer))return {accepted:true,kind:'reference',message:'Верно. Это подходящее слово и нужная форма.'};
  if(!isOpen(task))return {accepted:false,kind:'restricted'};
  if(!/^[a-zæøå]{2,45}$/iu.test(word))return {accepted:false,kind:'wrong-form',message:'Впиши один норвежский глагол в нужной форме, без других слов и знаков.'};
  const reference=freeTasks[task.level]?.find(x=>x.id===task.id);
  const meaning=reference?.examples?.[word];
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
  const isFree=isOpen(task);
  return {sentenceNo:fullNo,
   sentenceRu:record?.sentenceRu||'Перевод всего предложения пока не проверен.',
   lemma:record?.lemma||'',
   translation:record?.translation||'',
   requiredForm:String(task?.answer||''),
   rule:String(task?.rule||'Проверь форму слова.'),
   message:record?(isFree?'Показан только один пример: другие правильные варианты тоже допускаются. Образец добавлен в повторение.':'Помощь записана. Слово появится в повторении.'):'Для этого упражнения нет подтверждённой словарной записи.'
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
 window.NEClozeCoach=Object.freeze({diagnose,help,queueReview,expectedVerb,infoFor,norm,isOpen,checkLocal,verifyUnknown,freeCatalog,practiceMode,targetRu,plan,dailyPlan});
})();