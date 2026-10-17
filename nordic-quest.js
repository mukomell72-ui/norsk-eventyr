/* Norsk Eventyr — The Northern Compass
 * Original interactive language-adventure world: an illustrated atlas, grounded
 * chapter missions, Nora's field signals and an honest competence passport.
 * Does not copy Duolingo artwork, maps, reward mechanics or user content.
 */
(function(){
'use strict';
const LEVELS=['A1','A2','B1','B2'];
const REGIONS={
 A1:{title:'Берег первых слов',subtitle:'От пристани до огней маленького фьорда',tone:'coast',name:'Первые встречи'},
 A2:{title:'Дороги фьорда',subtitle:'Работа, поездки и разговоры в новых местах',tone:'forest',name:'Самостоятельный путь'},
 B1:{title:'За горным перевалом',subtitle:'Сложные решения, объяснения и истории',tone:'mountain',name:'Своя точка зрения'},
 B2:{title:'Полярная экспедиция',subtitle:'Аргументы, оттенки смысла и свободная речь',tone:'aurora',name:'Точные слова'}
};
const PLACES=[
 {name:'Причал встреч',icon:'⚓',theme:'pier',plot:'На пристани тебя ждёт первое знакомство. Нужно начать разговор так, чтобы тебя поняли.'},
 {name:'Дом у залива',icon:'⌂',theme:'home',plot:'В окнах горит свет. Хозяева ждут, что ты объяснишь, где что находится и что тебе нужно.'},
 {name:'Часовая башня',icon:'◷',theme:'clock',plot:'До отправления мало времени. Важно понять расписание и договориться о встрече.'},
 {name:'Площадь ремесленников',icon:'✧',theme:'market',plot:'Здесь всё решается в разговоре: покупка, заказ, просьба, уточнение.'},
 {name:'Горная дорога',icon:'↗',theme:'road',plot:'Маршрут меняется. Придётся спросить дорогу и объяснить, куда ты направляешься.'},
 {name:'Пункт помощи',icon:'✳',theme:'help',plot:'Нужно понятно рассказать о проблеме, получить совет и правильно его понять.'},
 {name:'Мастерская решений',icon:'⚒',theme:'workshop',plot:'Тебе доверяют важное поручение. Сформулируй цель и уточни детали.'},
 {name:'Маяк свободной речи',icon:'✺',theme:'lighthouse',plot:'Свет маяка включится только после освоения знаний, речи и понимания.'}
];
const SIGNALS={
 A1:[
 {scene:'На причале ты хочешь узнать имя нового знакомого.',ask:'Что ты скажешь?',no:'Hva heter du?',ru:'Как тебя зовут?',wrong:['Hvor mye koster det?','Jeg er sulten.'],wrongRu:['Сколько это стоит?','Я голоден.'],hint:'Нужен вопрос об имени, а не о цене или еде.'},
 {scene:'Ты объясняешь Норе, что изучаешь норвежский.',ask:'Выбери подходящую фразу.',no:'Jeg lærer norsk.',ru:'Я учу норвежский.',wrong:['Jeg drikker vann.','Jeg venter på bussen.'],wrongRu:['Я пью воду.','Я жду автобус.'],hint:'Речь об изучении языка.'},
 {scene:'В магазине нужно узнать цену.',ask:'Какой вопрос поможет?',no:'Hvor mye koster det?',ru:'Сколько это стоит?',wrong:['Hvor bor du?','Hva heter du?'],wrongRu:['Где ты живёшь?','Как тебя зовут?'],hint:'Нужно спросить о стоимости.'}
 ],
 A2:[
 {scene:'Ты хочешь записаться к врачу.',ask:'Как объяснить свою просьбу?',no:'Jeg trenger en time hos legen.',ru:'Мне нужна запись к врачу.',wrong:['Jeg skal kjøpe melk.','Jeg jobber i morgen.'],wrongRu:['Я собираюсь купить молоко.','Я работаю завтра.'],hint:'Нужна запись к врачу, а не покупка или рабочий план.'},
 {scene:'На остановке автобус не приехал вовремя.',ask:'Как это сообщить?',no:'Bussen er forsinket.',ru:'Автобус опаздывает.',wrong:['Bussen er tom.','Bussen er ny.'],wrongRu:['Автобус пустой.','Автобус новый.'],hint:'Forsinket означает «задерживается».'},
 {scene:'Ты рассказываешь, где был вчера.',ask:'Нужна фраза в прошедшем времени.',no:'Jeg var på jobb i går.',ru:'Вчера я был на работе.',wrong:['Jeg er på jobb nå.','Jeg skal på jobb i morgen.'],wrongRu:['Я сейчас на работе.','Завтра я пойду на работу.'],hint:'I går — вчера; нужен preteritum.'}
 ],
 B1:[
 {scene:'Инструкция оказалась непонятной.',ask:'Вежливо попроси объяснить ещё раз.',no:'Kan du forklare det en gang til?',ru:'Можешь объяснить это ещё раз?',wrong:['Jeg har allerede forstått alt.','Dette er ikke nødvendig.'],wrongRu:['Я уже всё понял.','В этом нет необходимости.'],hint:'В ответе должна быть просьба повторно объяснить.'},
 {scene:'Ты хочешь обсудить ситуацию подробнее.',ask:'Выбери уместную фразу.',no:'Jeg ønsker å diskutere saken nærmere.',ru:'Я хотел бы подробнее обсудить вопрос.',wrong:['Jeg har ingen spørsmål.','Det regner mye i dag.'],wrongRu:['У меня нет вопросов.','Сегодня сильно идёт дождь.'],hint:'Nærmere — подробнее.'},
 {scene:'Ты рассуждаешь о нехватке свободного времени.',ask:'Условное предложение — правильный выбор.',no:'Hvis jeg hadde mer tid, ville jeg øvd mer.',ru:'Если бы у меня было больше времени, я бы больше занимался.',wrong:['Jeg har mye tid hver dag.','Jeg øver aldri på norsk.'],wrongRu:['У меня много времени каждый день.','Я никогда не занимаюсь норвежским.'],hint:'Ищи конструкцию hvis ... ville.'}
 ],
 B2:[
 {scene:'Задача оказалась сложной, но команда справилась.',ask:'Выбери точный уступительный оборот.',no:'Selv om det var krevende, fant vi en løsning.',ru:'Хотя это было сложно, мы нашли решение.',wrong:['Vi fant ingen løsning.','Det var enkelt fra begynnelsen.'],wrongRu:['Мы не нашли решения.','С самого начала это было просто.'],hint:'Selv om помогает показать контраст между трудностью и результатом.'},
 {scene:'Тебе нужно предложить обдуманный, осторожный шаг.',ask:'Выбери выражение для взвешенного решения.',no:'Vi bør vurdere alternativene før vi bestemmer oss.',ru:'Нам стоит рассмотреть варианты, прежде чем принять решение.',wrong:['Vi må bestemme oss uten å tenke.','Alle alternativene er like dårlige.'],wrongRu:['Нужно решать не раздумывая.','Все варианты одинаково плохи.'],hint:'Сначала оценить варианты, затем решить.'},
 {scene:'В дискуссии нужно показать две стороны вопроса.',ask:'Выбери фразу для сбалансированного аргумента.',no:'På den ene siden sparer vi tid, på den andre siden øker kostnadene.',ru:'С одной стороны, мы экономим время, с другой — расходы растут.',wrong:['Det finnes bare én løsning.','Ingen har noen mening om dette.'],wrongRu:['Существует лишь одно решение.','Ни у кого нет мнения по этому поводу.'],hint:'Нужна конструкция på den ene siden ... på den andre siden.'}
 ]
};
const h=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=()=>typeof window.neLocalDate==='function'?window.neLocalDate():new Date().toLocaleDateString('sv-SE');
const app=()=>window.neLearnerState;
function safeLevel(level){return LEVELS.includes(level)?level:'A1'}
function getWorldState(s,create=false){
 const root=s?.learningV8||(create&&s?(s.learningV8={}):null);if(!root||typeof root!=='object')return null;
 if(create&&(!root.adventureWorld||typeof root.adventureWorld!=='object'||Array.isArray(root.adventureWorld)))
  root.adventureWorld={viewLevel:safeLevel(s.level),signalRuns:{}};
 const world=root.adventureWorld;
 if(!world)return null;
 if(create&&(!world.signalRuns||typeof world.signalRuns!=='object'||Array.isArray(world.signalRuns)))world.signalRuns={};
 return world;
}
const persist=()=>window.saveState?.();
function mastery(s,id){
 try{const n=Number(window.NEAdaptive?.moduleMastery?.(s,id));
  return Number.isFinite(n)?Math.min(100,Math.max(0,Math.round(n))):0;
 }catch{return 0}
}
function unlocked(s){
 try{return safeLevel(window.NEAdaptive?.highestUnlockedLevel?.(s)||s.level)}catch{return 'A1'}
}
function journey(s,level){
 const selected=safeLevel(level),modules=window.NECurriculum?.modules?.(selected)||[];
 const allowed=LEVELS.indexOf(selected)<=LEVELS.indexOf(unlocked(s));
 const values=modules.map(m=>mastery(s,m.id)),firstOpen=values.findIndex(x=>x<78);
 const chapters=modules.map((m,i)=>{
  const passed=values[i]>=78,first=firstOpen===-1?modules.length-1:firstOpen;
  const place=PLACES[i%PLACES.length];
  return {...place,moduleId:m.id,title:m.title,objective:m.canDo?.[0]||m.title,
   detail:m.contexts,mastery:values[i],number:i+1,
   status:passed?'mastered':allowed&&i===first?'current':'locked'};
 });
 return {level:selected,region:REGIONS[selected],chapters,allowed,unlockedLevel:unlocked(s),
  mastered:chapters.filter(x=>x.status==='mastered').length,
  total:chapters.length,active:chapters.find(x=>x.status==='current')||chapters.at(-1)||null};
}
function passport(s){
 const levels=LEVELS.map(level=>{
  const route=journey(s,level);return {level,earned:route.mastered,total:route.total,region:route.region.title};
 });
 return {levels,earned:levels.reduce((n,x)=>n+x.earned,0),total:levels.reduce((n,x)=>n+x.total,0)};
}
function signalBank(level,key){
 const catalog=SIGNALS[safeLevel(level)];
 const source=String(key||date()).replace(/\D/g,''),shift=(Number(source.slice(-5))||0)%catalog.length;
 return catalog.map((_,i)=>catalog[(i+shift)%catalog.length]);
}
function signalKey(level){return date()+':'+safeLevel(level)}
function play(){return window.NQQuestPlay}
function signalMode(run){return play()?.mode?.(run?.index)||'dialogue'}
function signalRun(s,level,create=false){
 const w=getWorldState(s,create);if(!w)return null;
 const k=signalKey(level);
 if(create&&!w.signalRuns[k]){
  w.signalRuns[k]={version:2,level:safeLevel(level),date:date(),index:0,misses:0,
   completed:false,reveal:false,feedback:'',checked:false,tiles:[],choice:null,spoken:'',voiceNote:''};
  const keys=Object.keys(w.signalRuns).sort();
  for(const stale of keys.slice(0,Math.max(0,keys.length-90)))delete w.signalRuns[stale];
  persist();
 }
 const r=w.signalRuns[k];
 if(r&&create&&r.version===1&&!r.completed){
  // Existing learners keep the current signal and their earlier answers.
  r.version=2;r.tiles=[];r.choice=null;r.spoken='';r.voiceNote='';persist();
 }
 return r||null;
}
function beginSignal(level){
 const s=app();if(!s||!play())return false;
 const l=safeLevel(level);signalRun(s,l,true);return renderSignal(l);
}
function isComplete(s,level){return signalRun(s,level)?.completed===true}
function signalContext(){
 const s=app(),w=getWorldState(s),l=safeLevel(w?.viewLevel||s?.level);
 return {s,w,l,r:signalRun(s,l),tasks:signalBank(l)};
}
function soundEffect(kind){
 const w=getWorldState(app());
 return play()?.cue?.(w?.soundOn===true,kind);
}
function toggleSound(){
 const s=app(),w=getWorldState(s,true);
 if(!w)return false;
 w.soundOn=w.soundOn!==true;
 persist();return renderSignal(safeLevel(w.viewLevel||s.level));
}
function answerSignal(choice){
 const {r,l,tasks}=signalContext();
 if(!r||r.completed||r.checked||!['dialogue','listen'].includes(signalMode(r)))return false;
 const task=tasks[signalMode(r)==='listen'?2:0];
 if(!task||!Number.isInteger(choice)||choice<0||choice>=3)return false;
 const position=(r.index+1)%3;
 if(choice!==position){
  r.misses++;r.feedback=play().feedback(signalMode(r),false)+' '+task.hint;
  persist();soundEffect('wrong');renderSignal(l);return false;
 }
 r.checked=true;r.feedback='Нора: '+play().feedback(signalMode(r),true)+' '+task.ru;
 persist();soundEffect('correct');renderSignal(l);return true;
}
function tilesFor(r,tasks){
 const task=tasks[1];
 return task?play()?.shuffledTiles?.(task.no)||[]:[];
}
function selectTile(index){
 const {r,l,tasks}=signalContext();
 if(!r||r.completed||r.checked||signalMode(r)!=='assemble')return false;
 const tiles=tilesFor(r,tasks);
 if(!Number.isInteger(index)||index<0||index>=tiles.length)return false;
 r.tiles=Array.isArray(r.tiles)?r.tiles:[];
 const existing=r.tiles.indexOf(index);
 if(existing>=0)r.tiles.splice(existing,1);
 else if(r.tiles.length<tiles.length)r.tiles.push(index);
 r.feedback='';persist();renderSignal(l);return true;
}
function clearTiles(){
 const {r,l}=signalContext();
 if(!r||signalMode(r)!=='assemble'||r.checked)return false;
 r.tiles=[];r.feedback='';persist();return renderSignal(l);
}
function checkAssembly(){
 const {r,l,tasks}=signalContext();
 if(!r||r.completed||r.checked||signalMode(r)!=='assemble')return false;
 const task=tasks[1];
 if(!task||!r.tiles?.length)return false;
 if(!play()?.validAssembly?.(task.no,r.tiles)){
  r.misses++;r.feedback='Нора: '+play().feedback('assemble',false);
  persist();soundEffect('wrong');renderSignal(l);return false;
 }
 r.checked=true;r.feedback='Нора: '+play().feedback('assemble',true)+' '+task.ru;
 persist();soundEffect('correct');renderSignal(l);return true;
}
function chooseSignalEnding(choice){
 const {r,l}=signalContext();
 if(!r||r.completed||r.checked||signalMode(r)!=='decision')return false;
 const branch=play()?.branches?.(l)?.[choice];
 if(!branch||!Number.isInteger(choice))return false;
 r.choice=branch.id;r.checked=true;
 r.feedback='Нора: '+play().feedback('decision',true);
 persist();soundEffect('correct');return renderSignal(l);
}
function journalEntries(state){
 const w=getWorldState(state),entries=Array.isArray(w?.journal)?w.journal:[];
 return entries.filter(x=>x&&typeof x.date==='string'&&typeof x.level==='string').slice(-25);
}
function nextSignal(){
 const {s,w,r,l}=signalContext();
 if(!r||!r.checked||r.completed)return false;
 r.index++;r.checked=false;r.reveal=false;r.feedback='';r.tiles=[];r.voiceNote='';r.spoken='';
 const length=r.version===1?3:4;
 if(r.index>=length){
  r.completed=true;r.finishedAt=new Date().toISOString();
  if(r.version===2){
   const branch=play()?.branches?.(l).find(x=>x.id===r.choice);
   if(branch){
    r.storyTitle=branch.title;r.storyResult=branch.story;
    w.journal=Array.isArray(w.journal)?w.journal:[];
    const key=signalKey(l);
    if(!w.journal.some(entry=>entry.key===key)){
     w.journal.push({key,date:date(),level:l,title:branch.title,
      result:branch.story,misses:r.misses,choice:r.choice});
     if(w.journal.length>90)w.journal=w.journal.slice(-90);
    }
   }
  }
 }
 persist();if(r.completed)soundEffect('finish');
 return renderSignal(l);
}
function hearSignal(){
 const {r,l,tasks}=signalContext();
 if(!r||r.completed||!['assemble','listen'].includes(signalMode(r)))return false;
 const task=tasks[signalMode(r)==='listen'?2:1];
 if(!task)return false;
 try{window.speakText?.(task.no,.88);return true}catch{return false}
}
function revealSignal(){
 const {r,l}=signalContext();
 if(!r||r.completed||signalMode(r)!=='listen')return false;
 r.reveal=true;persist();return renderSignal(l);
}
function tryPronunciation(){
 const {r,l,tasks}=signalContext();
 if(!r||r.completed||signalMode(r)!=='assemble'||!r.checked)return false;
 const task=tasks[1],Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!Speech){
  r.voiceNote='На этом устройстве распознавание речи недоступно. Можно прослушать образец и повторить вслух.';
  persist();renderSignal(l);return false;
 }
 try{
  const rec=new Speech();rec.lang='nb-NO';rec.interimResults=false;rec.maxAlternatives=1;
  r.voiceNote='Слушаю норвежскую речь…';persist();renderSignal(l);
  rec.onresult=e=>{
   if(signalRun(app(),l)!==r||r.index!==1)return;
   r.spoken=String(e.results?.[0]?.[0]?.transcript||'').slice(0,260);
   r.voiceNote=r.spoken?'Распознано: '+r.spoken+'. Сравни с образцом выше. Это упражнение не оценивает произношение автоматически.':
    'Не удалось распознать фразу. Попробуй ещё раз.';
   persist();renderSignal(l);
  };
  rec.onerror=()=>{
   if(signalRun(app(),l)!==r||r.index!==1)return;
   r.voiceNote='Микрофон недоступен. Разреши доступ или повтори вслух без записи.';
   persist();renderSignal(l);
  };
  rec.start();return true;
 }catch{
  r.voiceNote='Не удалось запустить микрофон. Прослушай образец и повтори вслух.';
  persist();renderSignal(l);return false;
 }
}
function selectLevel(level){
 const s=app();if(!s)return false;
 getWorldState(s,true).viewLevel=safeLevel(level);persist();
 return open();
}
function currentChapter(s,level){const j=journey(s,level);return j.active}
function canOpen(ch){return ch&&(ch.status==='current'||ch.status==='mastered')}
function openChapter(id){
 const s=app();if(!s)return false;
 const w=getWorldState(s,true),j=journey(s,w.viewLevel);
 const ch=j.chapters.find(x=>x.moduleId===id);
 if(!ch)return false;
 const locked=!canOpen(ch);
 const mode=locked?'Сначала необходимо освоить предыдущие этапы. Посмотреть программу можно заранее.':
 'Здесь тебя ждут разговоры, аудирование, письмо и проверка знаний с Норой.';
 const markup='<section class="nq-world nq-chapter" data-adventure-screen="chapter">'+
  '<button class="nq-back" onclick="navigate(\'adventure\')">← К карте путешествия</button>'+
  '<div class="nq-chapter-panel '+h(ch.theme)+'"><div class="nq-card-stars" aria-hidden="true"></div>'+
   '<span class="nq-kicker">ГЛАВА '+ch.number+' · '+h(j.level)+'</span>'+
   '<div class="nq-chapter-symbol" aria-hidden="true">'+h(ch.icon)+'</div>'+
   '<h1>'+h(ch.name)+'</h1><p>'+h(ch.plot)+'</p>'+
   '<div class="nq-intro-objective"><span>ТВОЯ ЦЕЛЬ В ЯЗЫКЕ</span><b>'+h(ch.objective)+'</b></div>'+
  '</div><div class="nq-action-panel">'+
   '<h2>'+h(ch.title)+'</h2><p>'+h(mode)+'</p>'+
   (locked?'<div class="nq-locked-note" role="status">Эта глава станет доступна после освоения предыдущих навыков.</div>'+
    '<button class="nq-button secondary" onclick="navigate(\'livingday\')">Продолжить доступный урок →</button>':
    '<button class="nq-button primary" onclick="NENordicQuest.startChapter(\''+h(ch.moduleId)+'\')">Начать задание с Норой →</button>'+
    '<div class="nq-options"><button class="nq-option" onclick="navigate(\'listeninglab\')"><span>♫</span><b>Сначала послушать</b><small>Аудирование</small></button>'+
      '<button class="nq-option" onclick="navigate(\'chat\')"><span>❞</span><b>Сначала поговорить</b><small>Диалог с Норой</small></button></div>')+
   '<p class="nq-footnote">Отметка о прохождении появится только после подтверждённого освоения модуля. Мини-игры не заменяют языковую оценку.</p>'+
  '</div></section>';
 window.shell?.(markup,'adventure');return true;
}
function startChapter(id){
 const s=app();if(!s)return false;
 const w=getWorldState(s,true),j=journey(s,w.viewLevel),ch=j.chapters.find(x=>x.moduleId===id);
 if(!canOpen(ch))return false;
 const d=window.NELivingDay?.details?.(false);
 if(s.activeLesson?.id||(!d?.finished&&d?.moduleId===id))return window.navigate?.('livingday');
 return window.teacherStartModule?.(id);
}
function renderSignal(level){
 const s=app();if(!s)return false;
 const l=safeLevel(level),world=getWorldState(s,true);world.viewLevel=l;
 const r=signalRun(s,l,true),tasks=signalBank(l,r.date),done=r.completed;
 if(!play())return false;
 const mode=signalMode(r),total=r.version===1?3:4;
 const title=done?'Маршрут освещён!':'Радио северного маяка';
 const sound='<button class="nq-sound-toggle" aria-pressed="'+(world.soundOn===true)+'" onclick="NENordicQuest.toggleSound()">'+
  (world.soundOn===true?'♫ Звук: включён':'♫ Звук: выключен')+'</button>';
 const common='<section class="nq-world nq-signal" data-adventure-screen="signal">'+
  '<button class="nq-back" onclick="navigate(\'adventure\')">← К карте путешествия</button>'+
  '<header class="nq-signal-header"><span class="nq-signal-symbol" aria-hidden="true">⌁</span>'+
   '<span class="nq-kicker">СЕВЕРНЫЙ ЭФИР · '+h(l)+'</span><h1>'+title+'</h1>'+
   '<p>Твоё собственное приключение с Норой: смысл, порядок слов, понимание на слух и выбор пути. Не заменяет основной урок и проверку уровня.</p>'+
   sound+'</header>';
 if(done){
  const story=r.storyTitle?'<div class="nq-outcome"><span class="nq-kicker">ТВОЯ ИСТОРИЯ</span>'+
   '<h3>'+h(r.storyTitle)+'</h3><p>'+h(r.storyResult)+'</p></div>':'';
  const note=r.version===1?'Три радиосигнала разгаданы.':'Четыре игровых этапа завершены.';
  window.shell?.(common+
   '<div class="nq-signal-finished" role="status"><div class="nq-celebration" aria-hidden="true">✦</div>'+
    '<span class="nq-reward-label">ПОЛЕВАЯ ЗАМЕТКА СОХРАНЕНА</span>'+
    '<h2>Ты дошёл до маяка!</h2><p>'+note+' Ошибок: '+r.misses+
     '. Итог этой истории записан в дневнике. Языковой уровень подтверждается только заданиями курса.</p>'+
    story+'<div class="nq-nora-reaction completed"><div class="nq-reaction-portrait"></div><p><b>Нора</b> Отличная работа над ситуацией! Попробуй применить знакомые слова в полноценном разговоре.</p></div>'+
    '<button class="nq-button primary" onclick="navigate(\'adventure\')">Вернуться к экспедиции →</button>'+
    '<button class="nq-button secondary" onclick="navigate(\'livingday\')">Продолжить обучение с Норой →</button>'+
   '</div></section>','adventure');return true;
 }
 const task=tasks[mode==='assemble'?1:mode==='listen'?2:0];
 const stepNames=['Диалог у пристани','Собери реплику','Сигнал на слух','Твоя развилка'];
 const stepIcons=['❞','▤','♫','✧'];
 const mark=mode==='dialogue'?'ПОНЯТЬ СИТУАЦИЮ':mode==='assemble'?'ПОСТРОИТЬ ПРЕДЛОЖЕНИЕ':
  mode==='listen'?'ПОНЯТЬ НА СЛУХ':'ВЫБРАТЬ СВОЙ ПУТЬ';
 let activity='';
 if(mode==='dialogue'||mode==='listen'){
  const audio=mode==='listen',answers=audio?[task.ru,...task.wrongRu]:[task.no,...task.wrong];
  const index=(r.index+1)%3,right=answers[0],variants=answers.slice(1);
  variants.splice(index,0,right);
  activity=(audio?'<div class="nq-audio-panel"><button class="nq-button primary" onclick="NENordicQuest.hearSignal()">▶ Слушать фразу</button>'+
     '<button class="nq-audio-reveal" onclick="NENordicQuest.revealSignal()">Не слышно? Показать текст</button>'+
     (r.reveal?'<p lang="nb">'+h(task.no)+'</p>':'')+'</div>':
     '<p class="nq-task-context">'+h(task.scene)+'</p>')+
    '<div class="nq-answers">'+variants.map((answer,i)=>
     '<button class="nq-answer" '+(r.checked?'disabled':'')+' onclick="NENordicQuest.answerSignal('+i+')">'+
       '<span class="nq-answer-letter">'+['A','B','C'][i]+'</span><span>'+h(answer)+'</span></button>').join('')+'</div>';
 }else if(mode==='assemble'){
  const tiles=tilesFor(r,tasks),used=Array.isArray(r.tiles)?r.tiles:[],built=play().assembled(task.no,used);
  const picked=used.map(index=>'<button class="nq-tile picked" '+(r.checked?'disabled':'')+' onclick="NENordicQuest.selectTile('+index+')">'+
   h(tiles[index]?.value||'')+' <span aria-hidden="true">×</span></button>').join('');
  const available=tiles.map((tile,index)=>used.includes(index)?'':
   '<button class="nq-tile" onclick="NENordicQuest.selectTile('+index+')">'+h(tile.value)+'</button>').join('');
  activity='<div class="nq-builder">'+
    '<p class="nq-task-context">'+h(task.scene)+' <b>'+h(task.ru)+'</b></p>'+
    '<div class="nq-build-label">ТВОЁ ПРЕДЛОЖЕНИЕ</div>'+
    '<div class="nq-drop-zone" role="group" aria-label="Собранное предложение">'+
      (picked||'<span class="nq-placeholder">Нажимай слова снизу, чтобы собрать фразу</span>')+'</div>'+
    '<div class="nq-build-label">СЛОВА</div><div class="nq-tile-bank" role="group" aria-label="Слова для предложения">'+available+'</div>'+
    (r.checked?'<p class="nq-build-complete" lang="nb">'+h(built)+'</p>':
     '<div class="nq-builder-actions">'+
     '<button class="nq-button primary" '+(used.length!==tiles.length?'disabled':'')+
       ' onclick="NENordicQuest.checkAssembly()">Проверить предложение →</button>'+
     '<button class="nq-button secondary" onclick="NENordicQuest.clearTiles()">Очистить</button></div>')+
    (r.checked?'<div class="nq-speaking-bonus"><b>Бонус: произнеси фразу</b>'+
     '<p>Прослушай образец, повтори и при желании попробуй распознавание микрофоном. Это тренировка, а не автоматическая оценка произношения.</p>'+
     '<button class="nq-button secondary" onclick="NENordicQuest.hearSignal()">▶ Послушать</button>'+
     '<button class="nq-button outline" onclick="NENordicQuest.tryPronunciation()">🎙 Сказать Норе</button>'+
     (r.voiceNote?'<p role="status">'+h(r.voiceNote)+'</p>':'')+'</div>':'')+
   '</div>';
 }else if(mode==='decision'){
  const branches=play().branches(l);
  activity='<div class="nq-decision-scene"><p>Ты получил радиосообщение и достиг развилки. Как поступить?</p>'+
   '<div class="nq-decision-branches">'+branches.map((branch,i)=>
     '<button class="nq-decision-option '+(r.choice===branch.id?'selected':'')+'" '+
      (r.checked?'disabled':'')+' onclick="NENordicQuest.chooseSignalEnding('+i+')">'+
      '<span class="nq-decision-number">'+(i+1)+'</span><b lang="nb">'+h(branch.no)+'</b>'+
      '<small>'+h(branch.ru)+'</small></button>').join('')+'</div>'+
   '<p class="nq-decision-help">Оба варианта грамматически правильные. Выбирай тот, который подходит твоему решению — история изменится.</p>'+
   (r.checked?'<div class="nq-story-teaser"><span class="nq-kicker">ТВОЁ РЕШЕНИЕ</span>'+
     '<h3>'+h(branches.find(x=>x.id===r.choice)?.title||'Новый маршрут')+'</h3>'+
     '<p>'+h(branches.find(x=>x.id===r.choice)?.story||'')+'</p></div>':'')+
   '</div>';
 }
 const msg=r.feedback?'<div class="nq-nora-reaction '+(r.checked?'right':'try')+'" role="status" aria-live="polite">'+
   '<div class="nq-reaction-portrait" aria-hidden="true"></div><p><b>Нора</b> '+h(r.feedback.replace(/^Нора:\s*/,''))+'</p></div>':'';
 window.shell?.(common+
  '<div class="nq-signal-meter"><span>Этап '+(r.index+1)+' / '+total+'</span>'+
   '<div class="nq-meter-track" role="progressbar" aria-label="Прогресс приключения" aria-valuemin="0" aria-valuemax="'+total+'" aria-valuenow="'+r.index+'">'+
    '<i style="width:'+Math.round(r.index/total*100)+'%"></i></div></div>'+
  '<div class="nq-challenge-track">'+stepNames.slice(0,total).map((title,i)=>
    '<span class="nq-challenge-step '+(i<r.index?'done':i===r.index?'now':'later')+'" title="'+h(title)+'">'+
    (i<r.index?'✓':stepIcons[i])+'</span>').join('')+'</div>'+
  '<div class="nq-question nq-mode-'+mode+(r.checked?' nq-solved':'')+'">'+
   '<span class="nq-kicker">'+mark+'</span>'+
   '<h2>'+h(mode==='listen'?'Загадочное сообщение':mode==='assemble'?'Подбери правильные слова':
      mode==='decision'?'Поворот истории':task.scene)+'</h2>'+
   '<p>'+h(mode==='listen'?'Прослушай норвежскую фразу и выбери её значение.':
       mode==='assemble'?'Составь норвежское предложение в правильном порядке.':
       mode==='decision'?'Выбери свою реплику — дальнейшее событие зависит от неё.':task.ask)+'</p>'+
   activity+msg+
   (r.checked?'<button class="nq-button primary nq-next" onclick="NENordicQuest.nextSignal()">'+
      (r.index===total-1?'Завершить приключение →':'Продолжить путь →')+'</button>':'')+
   '<p class="nq-task-note">Можно вернуться к карте и продолжить позже: текущий этап сохраняется. Полные навыки оценивает Нора на уроке.</p>'+
  '</div></section>','adventure');
 return true;
}
function open(){
 const s=app(),curr=window.NECurriculum;
 if(!s||!curr)return window.navigate?.('home');
 const w=getWorldState(s,true),j=journey(s,w.viewLevel),stamps=passport(s);
 const todayDone=isComplete(s,j.level),current=j.active,notes=journalEntries(s),latest=notes.slice(-3).reverse();
 const levelNav=LEVELS.map(l=>'<button class="nq-level '+(l===j.level?'active':'')+'" aria-pressed="'+(l===j.level)+'" onclick="NENordicQuest.selectLevel(\''+l+'\')">'+l+'</button>').join('');
 const nodes=j.chapters.map((ch,i)=>
  '<button class="nq-stop '+h(ch.status)+' nq-stop-'+i+'" onclick="NENordicQuest.openChapter(\''+h(ch.moduleId)+'\')"'+
  ' aria-label="'+h('Глава '+ch.number+': '+ch.name+'. '+(ch.status==='mastered'?'Освоена':ch.status==='current'?'Текущая':'Впереди'))+'">'+
   '<span class="nq-stop-marker" aria-hidden="true">'+(ch.status==='mastered'?'✓':h(ch.icon))+'</span>'+
   '<span class="nq-stop-content"><small>ГЛАВА '+ch.number+' · '+(ch.status==='mastered'?'ОСВОЕНА':ch.status==='current'?'ТВОЯ СЛЕДУЮЩАЯ ЦЕЛЬ':'ВПЕРЕДИ')+'</small>'+
    '<b>'+h(ch.name)+'</b><span>'+h(ch.title)+'</span></span>'+
   '<span class="nq-stop-score">'+(ch.status==='mastered'?'✦':ch.status==='current'?ch.mastery+'%':'⌁')+'</span>'+
  '</button>').join('');
 const seals=stamps.levels.map(x=>
  '<div class="nq-seal '+(x.earned===x.total&&x.total>0?'earned':'')+'">'+
  '<span>'+x.level+'</span><b>'+x.earned+'/'+x.total+'</b><small>'+h(x.region)+'</small></div>').join('');
 const html='<section class="nq-world nq-'+h(j.region.tone)+'" data-adventure-screen="world">'+
  '<div class="nq-hero"><div class="nq-sky" aria-hidden="true"></div>'+
   '<div class="nq-aurora" aria-hidden="true"></div><div class="nq-landscape" aria-hidden="true"></div>'+
   '<div class="nq-hero-copy"><div class="nq-hero-overline">NORSK EVENTYR · ИГРОВОЙ МИР</div>'+
    '<span class="nq-world-mark">✧ СЕВЕРНЫЙ КОМПАС</span>'+
    '<h1>Путешествие<br><em>начинается со слов</em></h1>'+
    '<p>Не собирай случайные очки. Открывай дорогу тем, что действительно умеешь сказать и понять по-норвежски.</p>'+
    '<button class="nq-button primary nq-hero-cta" onclick="navigate(\'livingday\')">Продолжить мой путь <span aria-hidden="true">↗</span></button>'+
   '</div><div class="nq-compass" aria-hidden="true"><span>✦</span><small>N</small></div></div>'+
  '<div class="nq-world-body">'+
   '<div class="nq-intro-row"><div><span class="nq-kicker">АТЛАС ПУТЕШЕСТВЕННИКА</span>'+
    '<h2>'+h(j.region.title)+'</h2><p>'+h(j.region.subtitle)+'</p></div>'+
    '<div class="nq-view-level">'+levelNav+'</div></div>'+
   (!j.allowed?'<p class="nq-unavailable">Маршрут '+h(j.level)+' можно рассмотреть заранее. Начать новые обязательные модули получится после подтверждения предыдущего уровня.</p>':'')+
   '<div class="nq-journey-stats"><div><span>Освоено глав</span><strong>'+j.mastered+' <small>/ '+j.total+'</small></strong></div>'+
    '<div><span>Путевой паспорт</span><strong>'+stamps.earned+' <small>/ '+stamps.total+'</small></strong></div>'+
    '<div><span>Текущий уровень</span><strong>'+h(j.level)+'</strong></div></div>'+
   '<div class="nq-map-heading"><span class="nq-kicker">ВЫБЕРИ МЕСТО НА КАРТЕ</span>'+
    '<p>Каждая глава связана с реальным модулем курса. Освоенные места отмечены звёздным штампом.</p></div>'+
   '<div class="nq-map"><div class="nq-map-river" aria-hidden="true"></div>'+
     '<div class="nq-route-line" aria-hidden="true"></div>'+nodes+'</div>'+
   '<section class="nq-signal-card"><div class="nq-signal-illustration" aria-hidden="true"><span>⌁</span><i></i></div>'+
    '<div class="nq-signal-copy"><span class="nq-kicker">ПОБОЧНОЕ ПРИКЛЮЧЕНИЕ · 4 ИСПЫТАНИЯ</span>'+
     '<h2>Радио северного маяка</h2><p>Ответь в диалоге, собери фразу, разгадай сообщение на слух и выбери продолжение своей истории.</p>'+
     '<button class="nq-button outline" onclick="NENordicQuest.beginSignal(\''+h(j.level)+'\')">'+
       (todayDone?'Открыть путевую заметку':'Принять сигнал Норы')+' →</button></div></section>'+
   '<section class="nq-travel-diary"><div class="nq-section-header">'+
    '<span class="nq-kicker">ТВОИ СОБСТВЕННЫЕ ИСТОРИИ</span><h2>Путевые заметки</h2>'+
    '<p>Решения в дополнительных приключениях создают разные истории. Это игровые сувениры, а не сертификаты владения языком.</p></div>'+
    (latest.length?'<div class="nq-note-list">'+latest.map(note=>
      '<article class="nq-diary-page"><span>'+h(note.level)+' · '+h(note.date)+'</span>'+
      '<b>'+h(note.title)+'</b><p>'+h(note.result)+'</p></article>').join('')+'</div>':
      '<div class="nq-diary-empty"><span aria-hidden="true">✧</span><p>Здесь появится твоя первая история. Прими радиосигнал и выбери, как поступить.</p></div>')+
    '<div class="nq-diary-count">Сохранено разных приключений: <b>'+notes.length+'</b></div></section>'+'<section class="nq-passport"><div class="nq-section-header"><span class="nq-kicker">ДОКАЗАННЫЙ ПРОГРЕСС</span>'+
    '<h2>Паспорт путешественника</h2><p>Штампы здесь нельзя купить за XP: только освоить соответствующие модули.</p></div>'+
    '<div class="nq-seals">'+seals+'</div>'+
    '<div class="nq-nora-note"><div class="nq-nora-portrait" aria-hidden="true"></div><div><b>Записка Норы</b><p>'+
    h(current?'Следующий ориентир — «'+current.title+'». В этой главе тебе пригодится умение: '+current.objective+'.':
       'Все главы этого региона освоены. Продолжай тренировать речь и понимание в новых ситуациях.')+
    '</p><button onclick="navigate(\'chat\')">Поговорить с Норой ↗</button></div></div></section>'+
   '<div class="nq-shortcuts"><button onclick="navigate(\'story\')">✧ Истории Fjordvik <span>↗</span></button>'+
    '<button onclick="navigate(\'course\',\''+h(j.level)+'\')">▤ Полная программа <span>↗</span></button>'+
    '<button onclick="navigate(\'listeninglab\')">♫ Аудирование <span>↗</span></button></div>'+
   '<p class="nq-footnote">Это оригинальный игровой маршрут Norsk Eventyr. Игровые сигналы не подтверждают уровень языка: для перехода нужны результаты письменной, устной и других проверок Норы.</p>'+
  '</div></section>';
 window.shell?.(html,'adventure');return true;
}
function homeTile(){
 const s=app();if(!s)return '';
 const j=journey(s,safeLevel(s.level)),ch=j.active;
 return '<section class="nq-home-invite"><span class="nq-home-orbit" aria-hidden="true">✦</span>'+
  '<div><span class="nq-kicker">МИР NORSK EVENTYR</span><h2>Твой собственный северный маршрут</h2>'+
   '<p>'+(ch?'Следующая глава: '+h(ch.name)+'. '+h(ch.objective)+'.':'Выбери экспедицию, которая поможет заговорить свободнее.')+'</p>'+
   '<div class="nq-home-proof">'+j.mastered+' из '+j.total+' глав этого региона освоено по результатам обучения</div></div>'+
   '<button class="nq-button primary" onclick="navigate(\'adventure\')">Открыть мир →</button></section>';
}
window.NENordicQuest=Object.freeze({
 journey,passport,signalBank,signalRun,answerSignal,nextSignal,isComplete,journalEntries,
 open,homeTile,selectLevel,openChapter,startChapter,beginSignal,hearSignal,revealSignal,
 selectTile,clearTiles,checkAssembly,chooseSignalEnding,tryPronunciation,toggleSound,
 // Visible in tests and internal state tools; must never assert competence from mini-game.
 REGIONS,PLACES
});
})();
