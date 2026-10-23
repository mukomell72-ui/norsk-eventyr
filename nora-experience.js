// Nora Experience 1.0 — a calm, continuous human-centered learning journey.
// Presentation and optional scenario preferences only. No grades or CEFR gates change.
(()=>{
 'use strict';
 const OPTIONS=Object.freeze([
  {id:'everyday',label:'Повседневная жизнь',scene:'дом, друзья, повседневные планы'},
  {id:'work',label:'Работа',scene:'коллеги, рабочие задачи, договорённости'},
  {id:'shopping',label:'Магазины и услуги',scene:'покупки, возвраты, общение с сервисами'},
  {id:'people',label:'Общение с людьми',scene:'знакомые, соседи, приглашения, просьбы'},
  {id:'travel',label:'Транспорт и поездки',scene:'дорога, билеты, задержки, планы'}
 ]);
 const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 const learner=()=>window.neLearnerState||(typeof state==='object'&&state?state:null);
 function settings(data=learner()){
  if(!data)return{focus:'everyday'};
  if(!data.learningV8||typeof data.learningV8!=='object'||Array.isArray(data.learningV8))data.learningV8={};
  const current=data.learningV8.noraExperience;
  if(!current||typeof current!=='object'||Array.isArray(current))
   data.learningV8.noraExperience={focus:'everyday'};
  const record=data.learningV8.noraExperience;
  if(!OPTIONS.some(x=>x.id===record.focus))record.focus='everyday';
  return record;
 }
 function focus(data=learner()){
  const item=OPTIONS.find(x=>x.id===settings(data).focus)||OPTIONS[0];
  return{...item};
 }
 function choose(id){
  if(!OPTIONS.some(x=>x.id===id))return false;
  const state=learner();if(!state)return false;
  const prefs=settings(state),previous=prefs.focus;
  prefs.focus=id;
  let saved=true;
  try{if(typeof window.saveState==='function')saved=window.saveState()===true}catch{saved=false}
  if(!saved){prefs.focus=previous;return false}
  const label=document.getElementById('neFocusCurrent');
  if(label)label.textContent=focus(state).label;
  document.querySelectorAll('[data-ne-focus]').forEach(b=>{
   b.setAttribute('aria-pressed',String(b.getAttribute('data-ne-focus')===id));
  });
  const note=document.getElementById('neFocusFeedback');
  if(note)note.textContent='Принято. Нора учтёт эту тему в следующих новых уроках. Начатый урок не изменится.';
  return true;
 }
 function homeChoice(data=learner()){
  if(!data)return'';
  const chosen=focus(data);
  return '<section class="ne-focus-card" aria-label="Личные интересы для следующих уроков">'+
   '<div class="ne-focus-top"><div><small>ТВОЙ ЖИВОЙ НОРВЕЖСКИЙ</small>'+
   '<h2>Где тебе нужен язык?</h2>'+
   '<p>Нора будет чаще выбирать такие ситуации для будущих новых уроков. Текущая тема и контроль уровня сохраняются.</p></div></div>'+
   '<details class="ne-focus-picker"><summary>Сейчас: <strong id="neFocusCurrent">'+safe(chosen.label)+'</strong> · изменить</summary>'+
   '<div class="ne-focus-options" role="group" aria-label="Темы интересов">'+
   OPTIONS.map(o=>'<button type="button" data-ne-focus="'+o.id+'" aria-pressed="'+(o.id===chosen.id)+
    '" onclick="NEExperience.choose(\''+o.id+'\')">'+safe(o.label)+'</button>').join('')+
   '</div><p id="neFocusFeedback" role="status" aria-live="polite"></p></details></section>';
 }
 // Four connected story acts, while retaining every underlying assessment.
 let lastLesson=null,lastLessonOwner=null;
 const ACTS=[
  {name:'Встречаемся',note:'Сначала поймём, кто говорит и зачем.'},
  {name:'Разбираемся',note:'Подготовим нужные слова и увидим, как устроена фраза.'},
  {name:'Слушаем и замечаем',note:'Слушаем и читаем так, как бывает в жизни.'},
  {name:'Действуем сами',note:'Теперь ты решаешь, что сказать и написать.'}
 ];
 function act(step,hasGrammar=false){
  const reading=hasGrammar?4:3,writing=hasGrammar?5:4;
  const index=step===0?0:step<reading?1:step<writing?2:3;
  return{index,...ACTS[index]};
 }
 function activity(step,hasGrammar=false){
  const names=hasGrammar?[
   'Ответь живому собеседнику','Вспомним нужные слова','Одно полезное правило',
   'Услышим ситуацию','Поймём сообщение','Напишем по делу','Скажем своими словами'
  ]:[
   'Ответь живому собеседнику','Вспомним нужные слова','Услышим ситуацию',
   'Поймём сообщение','Напишем по делу','Скажем своими словами'
  ];
  return names[Math.max(0,Math.min(names.length-1,Number(step)||0))];
 }
 function brief(lesson,session,total){
  const l=lesson||{},step=Math.max(0,Number(session?.step)||0),grammar=total===7;
  const stage=act(step,grammar);
  const goal=String(l?._adaptive?.courseObjective||l?._adaptive?.goal||l.title||'общаться по-норвежски').trim().slice(0,125);
  const scene=String(l.dialogueScene||'').trim().slice(0,165);
  return{stage,activity:activity(step,grammar),goal,scene,step,total};
 }

 // Passively revisit actual lesson words across its stages. Passive exposure never
 // counts as a correct answer, SRS advancement, or CEFR evidence.
 function wordEncounter(lesson,session){
  const data=learner(),raw=Array.isArray(lesson?.vocab)?lesson.vocab:[];
  const normalize=x=>String(x||'').normalize('NFKC').toLocaleLowerCase('nb-NO')
   .trim().replace(/^(?:en|ei|et|å)\s+/,'').replace(/\s+/g,' ');
  const seen=new Set(),words=[];
  for(const pair of raw){
   if(!Array.isArray(pair)||typeof pair[0]!=='string'||typeof pair[1]!=='string')continue;
   const no=pair[0].trim().slice(0,90),ru=pair[1].trim().slice(0,100),key=normalize(no);
   if(!key||!ru||seen.has(key))continue;
   seen.add(key);
   const dict=data?.dailyDictionary?.[key]||data?.dailyDictionary?.[no]||{};
   const q=data?.wordPracticeQueue||{};
   const due=Number(dict.nextDue)>0&&Number(dict.nextDue)<=Date.now();
   const priority=(q[key]||q[no]?100:0)+(due?35:0)+Math.min(40,(Number(dict.wrong)||0)*8);
   words.push({no,ru,key,priority,order:words.length});
  }
  if(!words.length)return '';
  words.sort((a,b)=>b.priority-a.priority||a.order-b.order);
  const step=Math.max(0,Math.floor(Number(session?.step)||0));
  const item=words[Math.floor(step/2)%Math.min(3,words.length)];
  const cues=['Нора напоминает','Вспомни ещё раз','Слово возвращается',
   'Проверь, узнаёшь ли','Ещё одна встреча со словом','Применяй по смыслу',
   'Перед разговором вспомни'];
  return '<p class="ne-mission-word" data-ne-word-encounter="1">'+
   '<span>'+cues[Math.min(step,cues.length-1)]+':</span> '+
   '<strong lang="nb">'+safe(item.no)+'</strong> '+
   '<details><summary>Перевод</summary><span>'+safe(item.ru)+'</span></details></p>';
 }

 // High-frequency function words, taught by *function* instead of a misleading
 // one-word Russian translation. Independent micro-practice never affects scores.
 const FUNCTION_WORDS=Object.freeze([
  {id:'meg',kind:'Местоимение, не союз',rule:'Jeg — «я», когда я делаю действие. Meg — «меня / мне / мной» после глагола или предлога. Не говори «hjelpe jeg».',
   examples:[['Jeg snakker norsk.','Я говорю по-норвежски.'],['Kan du hjelpe meg?','Можешь мне помочь?']],
   question:'Kan du hjelpe ___?',options:['jeg','meg','til'],correct:1,
   why:'После hjelpe («помочь кому?») требуется объектная форма meg. Jeg — форма подлежащего.'},
  {id:'til',kind:'Предлог',rule:'Til показывает направление («куда?») или получателя («кому?»): til Oslo, til deg. Это не универсальное русское «для».',
   examples:[['Jeg drar til Oslo.','Я еду в Осло.'],['Dette brevet er til deg.','Это письмо тебе.']],
   question:'Jeg reiser ___ Bergen.',options:['til','om','for'],correct:0,
   why:'После reiser, когда называем направление, говорим til Bergen.'},
  {id:'om',kind:'Предлог или союз',rule:'Om + существительное — «о чём-то»: snakke om jobben. Om + время — «через»: om en time. После vet ikke om — «ли».',
   examples:[['Vi snakker om jobben.','Мы говорим о работе.'],['Jeg vet ikke om hun kommer.','Я не знаю, придёт ли она.']],
   question:'Vi snakker ___ kurset.',options:['for','til','om'],correct:2,
   why:'Snakke om noe означает «говорить о чём-то»; snakke til кого-то — «говорить кому-то», смысл другой.'},
  {id:'for',kind:'Предлог или сочинительный союз',rule:'For å + инфинитив объясняет цель: «чтобы». For + существительное может значить «для / за». Отдельное for между частями предложения иногда означает «ведь / потому что».',
   examples:[['Jeg lærer norsk for å jobbe her.','Я учу норвежский, чтобы здесь работать.'],['Jeg blir hjemme, for jeg er syk.','Я остаюсь дома, ведь я болен.']],
   question:'Jeg lærer norsk ___ å jobbe her.',options:['om','for','til'],correct:1,
   why:'Цель выражают конструкцией for å + инфинитив: for å jobbe.'},
  {id:'og',kind:'Сочинительный союз',rule:'Og соединяет слова или равноправные части: «и». Не путай og («и») с å (маркер инфинитива).',
   examples:[['Jeg leser og skriver.','Я читаю и пишу.'],['Jeg liker te og kaffe.','Мне нравятся чай и кофе.']],
   question:'Jeg leser ___ skriver.',options:['og','å','om'],correct:0,
   why:'Два действия соединяет og, а å используют перед инфинитивом.'},
  {id:'men',kind:'Сочинительный союз',rule:'Men вводит противопоставление: «но». Оно не заменяет fordi («потому что»).',
   examples:[['Jeg vil komme, men jeg er syk.','Я хочу прийти, но болен.'],['Det er dyrt, men bra.','Это дорого, но хорошо.']],
   question:'Jeg vil komme, ___ jeg er syk.',options:['til','men','om'],correct:1,
   why:'Здесь противопоставление «хочу прийти, но болен»: men.'},
  {id:'fordi',kind:'Подчинительный союз',rule:'Fordi указывает причину — «потому что». В придаточном с fordi слово ikke обычно стоит перед личной формой глагола.',
   examples:[['Jeg er hjemme fordi jeg er syk.','Я дома, потому что болен.'],['Jeg kommer ikke fordi jeg ikke har tid.','Я не прихожу, потому что у меня нет времени.']],
   question:'Jeg er hjemme ___ jeg er syk.',options:['til','fordi','om'],correct:1,
   why:'Причину с придаточным предложением вводит fordi. Обрати внимание: fordi jeg ikke har tid.'},
  {id:'at',kind:'Подчинительный союз',rule:'At вводит придаточную мысль («что»): Jeg tror at … Не путай с å + инфинитив.',
   examples:[['Jeg tror at hun kommer.','Я думаю, что она придёт.'],['Jeg vet at du kan.','Я знаю, что ты можешь.']],
   question:'Jeg tror ___ hun kommer.',options:['å','at','til'],correct:1,
   why:'После tror перед целым придаточным предложением ставим at; å относится к инфинитиву.'}
 ]);
 function functionWordGuide(lesson,session){
  const step=Math.max(0,Math.floor(Number(session?.step)||0));
  if(step%2)return '';
  const level=['A1','A2','B1','B2'].includes(lesson?.level)?lesson.level:'A1';
  const words=level==='A1'?FUNCTION_WORDS.slice(0,4):FUNCTION_WORDS;
  const title=String(lesson?.id||'a1');
  const offset=[...title].reduce((n,c)=>n+c.charCodeAt(0),0)%words.length;
  const item=words[(offset+Math.floor(step/2))%words.length];
  return '<section class="ne-function-word-card" data-no-bridge aria-label="Нора объясняет служебные слова">'+
   '<div class="ne-function-word-top"><span>Нора объясняет · маленькие слова</span>'+
   '<b lang="nb">'+safe(item.id)+'</b><small>'+safe(item.kind)+'</small></div>'+ 
   '<p class="ne-function-word-rule">'+safe(item.rule)+'</p>'+
   '<details><summary>Примеры и практика: '+safe(item.id)+'</summary>'+
   item.examples.map(x=>'<p class="ne-function-word-example"><span lang="nb">'+safe(x[0])+'</span><small>'+safe(x[1])+'</small></p>').join('')+
   '<p class="ne-function-word-question"><b>Попробуй сам:</b> <span lang="nb">'+safe(item.question)+'</span></p>'+
   '<div class="ne-function-word-choices">'+item.options.map((o,i)=>
    '<button type="button" onclick="NEExperience.checkFunctionWord(\''+item.id+'\','+i+')">'+safe(o)+'</button>').join('')+'</div>'+
   '<p data-ne-function-feedback="'+item.id+'" role="status" aria-live="polite"></p>'+
   '<small>Практика для понимания; уровень и XP не изменяются.</small></details></section>';
 }
 function checkFunctionWord(id,choice){
  const item=FUNCTION_WORDS.find(x=>x.id===id);
  if(!item||!Number.isInteger(choice)||choice<0||choice>=item.options.length)return false;
  const target=document.querySelector('[data-ne-function-feedback="'+id+'"]');
  if(!target)return false;
  target.textContent=(choice===item.correct?'Верно. ':'Пока нет. ')+item.why;
  return choice===item.correct;
 }

 function lessonHeader(lesson,session,total){
  // A completed lesson may be detached from lessonSession by old renderers.
  // Retain only a short non-sensitive reference to the lesson displayed here.
  if(lesson&&['A1','A2','B1','B2'].includes(lesson.level)){
   lastLessonOwner=learner();
   lastLesson={id:String(lesson.id||'').slice(0,75),level:lesson.level,
    title:String(lesson.title||'').slice(0,120),
    dialogueScene:String(lesson.dialogueScene||'').slice(0,500)};
  }
  const b=brief(lesson,session,total);
  const dots=ACTS.map((a,i)=>'<span class="'+(i<b.stage.index?'done':i===b.stage.index?'now':'')+
   '" title="'+safe(a.name)+'"></span>').join('');
  return '<section class="ne-mission-head" aria-label="Одна история, четыре действия">'+
   '<div class="ne-mission-overline">ТВОЯ СИТУАЦИЯ · '+safe(lesson?.level||'A1')+'</div>'+
   '<div class="ne-mission-main"><div><h2>'+safe(b.stage.name)+'</h2>'+
   '<p data-bridge-instruction="true">'+safe(b.activity)+'. '+safe(b.stage.note)+'</p></div>'+
   '<button type="button" class="ne-pause-button" onclick="NEExperience.pause()">Пауза</button></div>'+
   (b.scene&&b.step>0?'<p class="ne-mission-story" data-bridge-instruction="true">В нашей истории: '+safe(b.scene)+'</p>':'')+
    wordEncounter(lesson,session)+
    functionWordGuide(lesson,session)+
   '<div class="ne-mission-track" aria-label="Этап '+(b.stage.index+1)+' из 4">'+dots+'</div>'+
   '<details class="ne-mission-purpose"><summary>Зачем это нужно?</summary><p>'+safe(b.goal)+
   (b.scene?'<span> Ситуация: '+safe(b.scene)+'</span>':'')+'</p></details>'+
   '</section>';
 }
 function response(ok,kind){
  const subject=kind==='speaking'?'разговор':kind==='writing'?'письмо':kind==='dialogue'?'диалог':'задание';
  const step=typeof lessonSession==='object'?Math.max(0,Number(lessonSession?.step)||0):0;
  const replies=kind==='speaking'
   ?['Ответ понятен. Дальше попробуем сказать то же более самостоятельно.','Ты выразил мысль. Продолжим беседу в новой ситуации.']
   :kind==='writing'
   ?['Твоя мысль передана письменно. В следующем шаге попробуем другой контекст.','С письменным ответом справился. Теперь перенесём идею в жизнь.']
   :['Ответ подходит к ситуации. Посмотрим, как она развивается.','Это верный выбор. Следующая реплика потребует нового решения.'];
  return ok
   ?'<p class="ne-human-response">'+replies[step%replies.length]+'</p>'
   :'<p class="ne-human-response">В этом '+subject+' есть что поправить. Разберём одну важную ошибку и попробуем ещё раз.</p>';
 }
 function endNote(lesson,verified){
  const title=safe(String(lesson?.title||'текущую тему').slice(0,90));
  return '<div class="ne-end-note"><h2>'+ (verified?'Ты применил язык в этой ситуации':'Ситуация пройдена — продолжаем закрепление')+'</h2>'+
    '<p>'+(verified?'Ты справился с учебными действиями по теме «'+title+'». Впереди — перенос навыка в другую обстановку.':
     'Ты прошёл тему «'+title+'», но часть ответов ещё требует практики. Нора вернёт трудные места в следующих занятиях.')+
    '</p></div>';
 }

 function openFollowup(){
  const data=learner();
  // Never carry module-scoped lesson references into another learner's account.
  if(!data||lastLessonOwner!==data)return false;
  const sessionLesson=typeof lessonSession==='object'&&lessonSession?.lesson;
  const lesson=sessionLesson||lastLesson;
  if(!lesson||!['A1','A2','B1','B2'].includes(lesson.level))return false;
  const before={};
  for(const k of ['chatThreads','chatThreadId','chatHistory','chatPrefs'])
   before[k]={present:Object.prototype.hasOwnProperty.call(data,k),value:data[k]};
  const id='lesson:'+String(lesson.id||'unknown').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,70);
  const threads=data.chatThreads&&typeof data.chatThreads==='object'&&!Array.isArray(data.chatThreads)
   ?{...data.chatThreads}:{};
  threads[data.chatThreadId||'general']=Array.isArray(data.chatHistory)?data.chatHistory:[];
  data.chatThreads=threads;
  data.chatThreadId=id;
  data.chatHistory=Array.isArray(threads[id])?threads[id]:[];
  const title=String(lesson.title||'Жизненная ситуация').slice(0,120),
   scene=String(lesson.dialogueScene||'').slice(0,500);
  data.chatPrefs={...(data.chatPrefs||{}),mode:'roleplay',level:lesson.level,
   topic:title,conversationTitle:'Продолжение: '+title,
   sceneContext:'Новая короткая жизненная ситуация по изученной теме. '+
    (scene?scene+' ':'')+'Продолжи настоящую беседу, но не повторяй дословно пройденное задание. '+
    'Ученик сам выбирает реплику. Не сообщай готовый ответ.'};
  let saved=true;
  try{if(typeof window.saveState==='function')saved=window.saveState()===true}catch{saved=false}
  if(!saved){
   for(const [k,previous] of Object.entries(before)){
    if(previous.present)data[k]=previous.value;else delete data[k];
   }
   return false;
  }
  if(typeof window.navigate==='function')window.navigate('chat');
  if(typeof window.renderChatV7==='function')window.renderChatV7();
  return true;
 }
 function pause(){
  if(typeof window.persistLessonCheckpoint==='function')window.persistLessonCheckpoint();
  if(typeof window.navigate==='function')window.navigate('home');
 }
 window.NEExperience=Object.freeze({focus,settings,choose,homeChoice,brief,lessonHeader,wordEncounter,functionWordGuide,checkFunctionWord,response,endNote,pause,openFollowup,act,activity});
})();
