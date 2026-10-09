// Norsk Eventyr 5.0 — elite learning/product layer
(() => {
  const today=()=>window.neLocalDate?neLocalDate():new Date().toISOString().slice(0,10);
  state.elite=state.elite||{};
  state.elite.goal=state.elite.goal||"norskprove";
  state.elite.dailyMinutes=Number(state.elite.dailyMinutes)||20;
  state.elite.activity=state.elite.activity||{};
  state.elite.achievements=state.elite.achievements||{};
  state.elite.counts=state.elite.counts||{dictation:0,grammar:0,pronunciation:0,conversation:0,listening:0};
  state.elite.drills=state.elite.drills||{};
  state.elite.grammarDrills=state.elite.grammarDrills||{};
  state.elite.version=5;
  saveState();

  const baseSaveState=saveState;
  const baseShell=shell;
  const baseNavigate=navigate;
  const baseSendChat=window.sendChat;
  const baseAnswerReview=window.answerReview;
  let installPrompt=null,cloudTimer=null,cloudBusy=false,dictSession=null,grammarSession=null,pronSelection={group:0,phrase:0},listeningSession=null;

  const GOALS={
    norskprove:["Norskprøven","Экзамен и официальный формат"],
    work:["Работа","Собеседования, коллеги, сообщения"],
    life:["Жизнь в Норвегии","Врач, магазин, kommune, транспорт"],
    b2:["B2","Точность, аргументация и свободная речь"]
  };
  const ACH=[
    ["first5","Первые 5","Изучить первые пять ежедневных слов",()=>Object.keys(state.dailyDictionary||{}).length>=5],
    ["v50","50 слов","Накопить 50 слов в личном словаре",()=>Object.keys(state.dailyDictionary||{}).length>=50],
    ["v100","100 слов","Накопить 100 слов",()=>Object.keys(state.dailyDictionary||{}).length>=100],
    ["v250","250 слов","Накопить 250 слов",()=>Object.keys(state.dailyDictionary||{}).length>=250],
    ["streak7","7 дней","Учиться семь дней подряд",()=>Number(state.streak)>=7],
    ["streak30","30 дней","Учиться тридцать дней подряд",()=>Number(state.streak)>=30],
    ["talk10","Samtale ×10","Провести 10 разговорных тренировок",()=>Number(state.elite.counts.conversation)>=10],
    ["listen10","Слух ×10","Пройти 10 тренировок аудирования/диктанта",()=>Number(state.elite.counts.listening)+Number(state.elite.counts.dictation)>=10],
    ["pron10","Произношение ×10","Сделать 10 тренировок произношения",()=>Number(state.elite.counts.pronunciation)>=10],
    ["exam1","Экзамен","Завершить хотя бы одну экзаменационную часть",()=>Array.isArray(state.examHistory)&&state.examHistory.length>0],
    ["story1","Fjordvik","Завершить первый сюжетный эпизод",()=>Object.keys(state.story?.completed||{}).length>=1],
    ["story6","Глава A1","Завершить первую сюжетную главу",()=>Object.values(state.story?.completed||{}).filter(x=>x.season==="s1").length>=6],
    ["story24","История Fjordvik","Пройти все 24 сюжетных эпизода",()=>Object.keys(state.story?.completed||{}).length>=24]
  ];

  function refreshAchievements(persist=true){
    let changed=false;
    for(const [id] of ACH)if(!state.elite.achievements[id]&&ACH.find(x=>x[0]===id)[3]()){state.elite.achievements[id]=new Date().toISOString();changed=true}
    if(changed&&persist)baseSaveState();
    return changed;
  }
  function activity(){return state.elite.activity[today()]||(state.elite.activity[today()]={})}
  function markActivity(k){
    const a=activity();if(!a[k]){a[k]=true;state.elite.counts[k]=(state.elite.counts[k]||0)+1}
    touchStudy();refreshAchievements(false);baseSaveState();scheduleCloud();
  }
  function mission(){
    const due=window.neDueWords?neDueWords().length:0,teacherDone=state.learningV8?.lastSessionDate===today();
    return [
      ["teacher","Главное занятие с Норой",teacherDone,"navigate('teacher')"],
      ["review",due?"Повторить то, что пора забыть":"Повторение по расписанию готово",due===0,"navigate('review')"]
    ];
  }
  function elitePanel(){
    refreshAchievements(false);const m=mission(),done=m.filter(x=>x[2]).length,pct=Math.round(done/m.length*100),goal=GOALS[state.elite.goal]||GOALS.norskprove;
    return '<section class="elite-dashboard card"><div class="elite-dash-head"><div><div class="eyebrow">Сегодня · '+goal[0]+' · '+state.elite.dailyMinutes+' мин</div><h2>Дневной план '+done+'/'+m.length+'</h2></div><div class="mini-ring" style="--pct:'+pct+'%"><b>'+pct+'%</b></div></div><div class="mission-grid">'+m.map(x=>'<button class="mission '+(x[2]?"done":"")+'" onclick="'+x[3]+'"><span>'+(x[2]?"✓":"○")+'</span><b>'+x[1]+'</b></button>').join("")+'</div><div class="row" style="margin-top:12px"><button class="btn secondary" onclick="navigate(\'plan\')">Дополнительная практика</button><button class="btn ghost" onclick="navigate(\'progress\')">Что реально освоено</button></div></section>';
  }

  shell=window.shell=function(content,active="home"){
    const isMainHome=active==="home"&&content.includes('<section class="hero">');
    document.getElementById("app").innerHTML='<div class="shell"><header class="topbar"><div class="brand"><span class="brand-mark">N</span>Norsk Eventyr <small class="v4">8.0 beta</small></div><div class="row top-actions"><span class="pill">'+esc(state.level)+'</span><span class="pill">'+(state.xp||0)+' XP</span><button class="icon-btn" onclick="navigate(\'cloud\')" title="Облачная синхронизация">'+(cloudLink()?'☁✓':'☁')+'</button><button class="icon-btn" onclick="navigate(\'settings\')" title="Настройки">⚙</button></div></header>'+(isMainHome?elitePanel():"")+content+nav(active)+'</div>';
  };

  navigate=window.navigate=function(view,data){
    stopTimer();
    if(listeningSession&&view!=="listeninglab"){URL.revokeObjectURL(listeningSession.url);listeningSession=null}
    if(view==="plan")return renderPlan();
    if(view==="dictation")return startDictation();
    if(view==="grammarlab")return startGrammarLab();
    if(view==="pronunciation")return renderPronunciationLab();
    if(view==="listeninglab")return renderListeningLab();
    if(view==="cloud")return renderCloud();
    if(view==="settings")return renderSettings();
    return baseNavigate(view,data);
  };

  saveState=window.saveState=function(){baseSaveState();refreshAchievements(false);scheduleCloud()};

  if(baseSendChat){
    sendChat=window.sendChat=async function(){const before=(state.chatHistory||[]).length;await baseSendChat();if((state.chatHistory||[]).length>before)markActivity("conversation")};
  }
  if(baseAnswerReview){
    answerReview=window.answerReview=function(...args){const r=baseAnswerReview(...args);if(window.neDueWords&&neDueWords().length===0)activity().review=true;baseSaveState();scheduleCloud();return r};
  }

  function renderPlan(){
    refreshAchievements();const m=mission(),done=m.filter(x=>x[2]).length;
    shell('<div class="screen-head"><button class="back" onclick="navigate(\'home\')">←</button><div><div class="eyebrow">Персональный маршрут</div><h2 style="margin:0">План на сегодня</h2></div></div>'+
      '<section class="grid3"><div class="kpi"><small>Выполнено</small><strong>'+done+'/'+m.length+'</strong></div><div class="kpi"><small>Серия</small><strong>'+state.streak+' дн.</strong></div><div class="kpi"><small>Цель</small><strong>'+esc((GOALS[state.elite.goal]||GOALS.norskprove)[0])+'</strong></div></section>'+
      '<section class="card" style="margin-top:14px"><div class="mission-list">'+m.map(x=>'<button class="mission-row '+(x[2]?"done":"")+'" onclick="'+x[3]+'"><span>'+(x[2]?"✓":"○")+'</span><div><b>'+x[1]+'</b><small>'+(x[2]?"Готово":"Открыть тренировку")+'</small></div></button>').join("")+'</div></section>'+
      '<div class="section-title"><h2>Интенсивная практика</h2></div><section class="grid3"><article class="card"><h3>✍ Диктант</h3><p class="muted">Слушай фразы с твоими словами и записывай их.</p><button class="btn secondary" onclick="navigate(\'dictation\')">Начать</button></article><article class="card"><h3>Грамматика</h3><p class="muted">Новый мини-тест по слабым местам и изученной лексике.</p><button class="btn secondary" onclick="navigate(\'grammarlab\')">Начать</button></article><article class="card"><h3>Произношение</h3><p class="muted">Звуки, ритм и запись голоса с AI-оценкой.</p><button class="btn secondary" onclick="navigate(\'pronunciation\')">Начать</button></article></section>'+
      '<div class="section-title"><h2>Достижения</h2></div><section class="badge-grid">'+ACH.map(([id,title,desc])=>'<article class="badge '+(state.elite.achievements[id]?"unlocked":"")+'"><div class="badge-icon">'+(state.elite.achievements[id]?"★":"☆")+'</div><b>'+title+'</b><small>'+desc+'</small></article>').join("")+'</section>',"home");
  }

  async function startDictation(){
    const key=today()+"-"+state.level,cache=state.elite.drills[key];
    shell('<section class="card loading-card"><div class="spinner"></div><h2>'+(cache?"Открываю диктант":"Создаю диктант")+'</h2><p class="muted">Использую слова из твоего личного словаря.</p></section>',"home");
    const revision=window.neScreenRevision;
    let data=cache;
    if(!data){const r=await neApiPost("/api/drill",{kind:"dictation",level:state.level,practiceWords:neReinforcementWords?neReinforcementWords(10):[],weakSkills:neWeakSkills?neWeakSkills():[]});if(revision!==window.neScreenRevision)return;if(!r.ok)return errorCard("Диктант недоступен",r.error);data=r.data;state.elite.drills[key]=data;baseSaveState()}
    dictSession={items:data.items||[],i:0,scores:[]};renderDictation();
  }
  function renderDictation(){
    const s=dictSession,it=s.items[s.i];if(!it)return finishDictation();
    shell('<div class="screen-head"><button class="back" onclick="navigate(\'hub\')">←</button><div><div class="eyebrow">Диктант · '+state.level+'</div><h2 style="margin:0">Фраза '+(s.i+1)+'/'+s.items.length+'</h2></div></div><section class="exercise"><article class="card"><div class="notice">Сначала слушай. Текст появится только после проверки.</div><div class="dictation-play"><button class="btn" onclick="speakText(\''+escJs(it.audio_no||"")+'\')">▶ Прослушать</button><button class="btn ghost" onclick="speakText(\''+escJs(it.audio_no||"")+'\',.72)">🐢 Медленнее</button></div><textarea id="dictAnswer" class="input" placeholder="Запиши услышанное по-норвежски…"></textarea><button class="btn" style="margin-top:10px" onclick="checkDictation()">Проверить</button><div id="dictFb"></div></article></section>',"home");
  }
  function norm(s){return String(s||"").toLowerCase().replace(/[.,!?;:"'()]/g,"").replace(/\s+/g," ").trim()}
  function sim(a,b){a=norm(a);b=norm(b);if(!a||!b)return 0;const x=a.split(" "),y=b.split(" "),d=Array.from({length:x.length+1},()=>Array(y.length+1).fill(0));for(let i=0;i<=x.length;i++)d[i][0]=i;for(let j=0;j<=y.length;j++)d[0][j]=j;for(let i=1;i<=x.length;i++)for(let j=1;j<=y.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(x[i-1]===y[j-1]?0:1));return Math.max(0,Math.round((1-d[x.length][y.length]/Math.max(x.length,y.length))*100))}
  function checkDictation(){
    const s=dictSession;if(!s||s.locked)return;const it=s.items[s.i],a=document.getElementById("dictAnswer").value,score=sim(a,it.audio_no);if(!a.trim())return;
    if(window.neUpdateSkill){neUpdateSkill("listening",score);neUpdateSkill("vocabulary",score)}
    if(window.NEAdaptive){NEAdaptive.recordAttempt(state,{level:state.level,skill:"listening",score,moduleId:state.level.toLowerCase()+"-supplemental",source:"dictation"});NEAdaptive.recordAttempt(state,{level:state.level,skill:"vocabulary",score,moduleId:state.level.toLowerCase()+"-supplemental",source:"dictation"});baseSaveState()}
    const ok=score>=75;if(ok){s.scores.push(score);s.locked=true}
    document.getElementById("dictFb").innerHTML='<div class="feedback '+(ok?"good":"bad")+'"><b>'+(ok?'✓ Верно':'Исправь и попробуй ещё раз')+'</b><br><b>Правильно:</b> '+esc(it.audio_no||"")+'<br><span class="muted">'+esc(it.translation_ru||"")+'</span></div>';
    if(ok)neAdvance(()=>nextDictation(),650);else document.getElementById("dictAnswer").focus();
  }

  function nextDictation(){dictSession.i++;dictSession.locked=false;renderDictation()}
  function finishDictation(){const avg=dictSession.scores.length?Math.round(dictSession.scores.reduce((a,b)=>a+b,0)/dictSession.scores.length):0;markActivity("dictation");state.elite.counts.listening=(state.elite.counts.listening||0)+1;baseSaveState();shell('<section class="card result-card"><div class="score-ring" style="--pct:'+avg+'%"><b>'+avg+'%</b></div><h1>Диктант завершён</h1><p class="muted">Фразы использовали лексику из твоего накопительного словаря.</p><button class="btn" onclick="navigate(\'hub\')">К инструментам</button></section>',"home");dictSession=null}

  async function startGrammarLab(){
    const key=today()+"-"+state.level,cache=state.elite.grammarDrills[key];
    shell('<section class="card loading-card"><div class="spinner"></div><h2>'+(cache?"Открываю тренировку":"Создаю грамматическую тренировку")+'</h2></section>',"home");
    const revision=window.neScreenRevision;
    let data=cache;
    if(!data){const r=await neApiPost("/api/drill",{kind:"grammar",level:state.level,practiceWords:neReinforcementWords?neReinforcementWords(10):[],weakSkills:neWeakSkills?neWeakSkills():[]});if(revision!==window.neScreenRevision)return;if(!r.ok)return errorCard("Грамматика недоступна",r.error);data=r.data;state.elite.grammarDrills[key]=data;baseSaveState()}
    grammarSession={items:data.items||[],i:0,correct:0};renderGrammarLab();
  }
  function renderGrammarLab(){
    const s=grammarSession,it=s.items[s.i];if(!it)return finishGrammarLab();
    shell('<div class="screen-head"><button class="back" onclick="navigate(\'hub\')">←</button><div><div class="eyebrow">Грамматика · '+state.level+'</div><h2 style="margin:0">Задание '+(s.i+1)+'/'+s.items.length+'</h2></div></div><section class="exercise"><article class="card"><div class="prompt">'+esc(it.q_ru||it.q||"")+'</div><div class="choice-list">'+(it.opts||[]).map((x,i)=>'<button class="choice" onclick="answerGrammarLab('+i+')">'+esc(x)+'</button>').join("")+'</div><div id="grammarLabFb"></div></article></section>',"home");
  }
  function answerGrammarLab(i){
    const s=grammarSession;if(!s||s.locked)return;
    const it=s.items[s.i],c=Number(it.correct)||0,ok=i===c;if(ok){s.correct++;s.locked=true}if(window.neUpdateSkill)neUpdateSkill("grammar",ok?100:20);if(window.NEAdaptive){NEAdaptive.recordAttempt(state,{level:state.level,skill:"grammar",score:ok?100:20,moduleId:state.level.toLowerCase()+"-supplemental",source:"grammar_lab"});baseSaveState()}
    document.querySelectorAll(".choice").forEach((button,j)=>{if(ok){button.disabled=true;if(j===c)button.classList.add("good")}else if(j===i){button.disabled=true;button.classList.add("bad")}});
    document.getElementById("grammarLabFb").innerHTML='<div class="feedback '+(ok?"good":"bad")+'">'+(ok?"✓ Верно":"Исправь и попробуй ещё раз")+'<br>'+esc(it.explanation_ru||"")+'</div>';
    if(ok)neAdvance(()=>nextGrammarLab(),650);
  }

  function nextGrammarLab(){grammarSession.i++;grammarSession.locked=false;renderGrammarLab()}
  function finishGrammarLab(){const score=Math.round(grammarSession.correct/Math.max(1,grammarSession.items.length)*100);markActivity("grammar");shell('<section class="card result-card"><div class="score-ring" style="--pct:'+score+'%"><b>'+score+'%</b></div><h1>Грамматика завершена</h1><button class="btn" onclick="navigate(\'hub\')">К инструментам</button></section>',"home");grammarSession=null}

  const SOUND_LAB=[
    {sound:"Y /yː, y/",why:"Не заменяй на русское «и» или «у». Губы округлены, язык как для «и».",phrases:["ny by","dyr sykkel","Jeg synes lyset er fint."]},
    {sound:"Ø /øː, œ/",why:"Округли губы, язык остаётся впереди.",phrases:["søt","før og etter","Jeg spør før jeg kjøper."]},
    {sound:"U /ʉː, ʉ/",why:"Норвежское u обычно произносится центральнее русского «у».",phrases:["du","hus","Hun bor i et stort hus."]},
    {sound:"KJ /ç/",why:"Мягкий шумный звук; не превращай его в «ш».",phrases:["kjøpe","kjære","Jeg skal kjøpe en ny jakke."]},
    {sound:"SKJ /ʂ, ʃ/",why:"Более тёмный шипящий звук, отличается от kj.",phrases:["sjø","skjorte","Kanskje vi sees i morgen."]},
    {sound:"Ритм и ударение",why:"Пиши слова обычным способом. Ударение показывается отдельно: jobber — 1-й слог; morgen — 1-й; reise — 1-й; Oslo — 1-й; hjelpe — 1-й; dette — 1-й.",phrases:["Jeg jobber i dag.","I morgen skal jeg reise til Oslo.","Kan du hjelpe meg med dette?"]}
  ];
  function renderPronunciationLab(){
    const g=SOUND_LAB[pronSelection.group],phrase=g.phrases[pronSelection.phrase];
    shell('<div class="screen-head"><button class="back" onclick="navigate(\'hub\')">←</button><div><div class="eyebrow">Произношение</div><h2 style="margin:0">Лаборатория звуков</h2></div></div><section class="sound-tabs">'+SOUND_LAB.map((x,i)=>'<button class="'+(i===pronSelection.group?"active":"")+'" onclick="selectSoundGroup('+i+')">'+esc(x.sound)+'</button>').join("")+'</section><section class="card sound-card"><h2>'+esc(g.sound)+'</h2><p class="muted">'+esc(g.why)+'</p><div class="phrase-picker">'+g.phrases.map((x,i)=>'<button class="'+(i===pronSelection.phrase?"active":"")+'" onclick="selectPronPhrase('+i+')">'+esc(x)+'</button>').join("")+'</div><div class="pron-target"><div class="eyebrow">Повтори</div><div class="prompt">'+esc(phrase)+'</div><button class="btn secondary" onclick="speakText(\''+escJs(phrase)+'\')">🔊 Образец</button></div><textarea id="elitePronText" class="input" placeholder="После записи здесь появится распознанная речь."></textarea><button id="pronBtn" class="btn" style="margin-top:10px" onclick="practicePronounce()">🎤 Записать и сравнить</button><div id="pronFb"></div><div class="notice" style="margin-top:14px">Оценка AI учебная. Диалекты норвежского различаются, поэтому задача — разборчивость и контроль звуков, а не единственный «правильный» акцент.</div></section>',"home");
  }
  function selectSoundGroup(i){pronSelection={group:i,phrase:0};renderPronunciationLab()}
  function selectPronPhrase(i){pronSelection.phrase=i;renderPronunciationLab()}
  function practicePronounce(){const g=SOUND_LAB[pronSelection.group],p=g.phrases[pronSelection.phrase];markActivity("pronunciation");toggleMic("elitePronText",p)}

  const FSI_HUMAN_AUDIO=[
    ["Introductions","Знакомство и вежливые выражения","https://fsi-language-courses-media.nyc3.cdn.digitaloceanspaces.com/languages/Norwegian/Headstart/Norwegian%20Headstart%20-%20Unit%201%20-%20Courtesy%20ExpressionsA.mp3"],
    ["Numbers","Числа","https://fsi-language-courses-media.nyc3.cdn.digitaloceanspaces.com/languages/Norwegian/Headstart/Norwegian%20Headstart%20-%20Unit%202%20-%20DistanceA.mp3"],
    ["Time","Время и дни недели","https://fsi-language-courses-media.nyc3.cdn.digitaloceanspaces.com/languages/Norwegian/Headstart/Norwegian%20Headstart%20-%20Unit%203%20-%20Time%20Days%20of%20WeekA.mp3"],
    ["Restaurant","В ресторане","https://fsi-language-courses-media.nyc3.cdn.digitaloceanspaces.com/languages/Norwegian/Headstart/Norwegian%20Headstart%20-%20Unit%204%20-%20In%20A%20RestaurantA.mp3"],
    ["Shopping","Покупки","https://fsi-language-courses-media.nyc3.cdn.digitaloceanspaces.com/languages/Norwegian/Headstart/Norwegian%20Headstart%20-%20Unit%205%20-%20ShoppingA.mp3"],
    ["Hotel","В отеле","https://fsi-language-courses-media.nyc3.cdn.digitaloceanspaces.com/languages/Norwegian/Headstart/Norwegian%20Headstart%20-%20Unit%206%20-%20At%20The%20HotelA.mp3"],
    ["Directions","Как спросить дорогу","https://fsi-language-courses-media.nyc3.cdn.digitaloceanspaces.com/languages/Norwegian/Headstart/Norwegian%20Headstart%20-%20Unit%207%20-%20Asking%20For%20Directions.mp3"],
    ["At a party","В гостях","https://fsi-language-courses-media.nyc3.cdn.digitaloceanspaces.com/languages/Norwegian/Headstart/Norwegian%20Headstart%20-%20Unit%208%20-%20Courtesy%20To%20A%20Host.mp3"]
  ];
  const AUTH_RESOURCES=[
    ["NTNU LearnNoW","Современный официальный учебный курс NTNU; открываем как внешний источник, потому что права на перепубликацию его аудио отдельно не заявлены.","https://www.ntnu.edu/learnnow/info/downloads"],
    ["Nasjonalbiblioteket Språkbanken","Открытые норвежские речевые корпуса, включая CC0-материалы.","https://www.nb.no/sprakbanken/en/resource-catalogue/"],
    ["NRK Oppdatert","Ежедневный норвежский подкаст о текущих темах — для B1–B2.","https://radio.nrk.no/podkast/oppdatert"],
    ["Klar Tale","Новости на более доступном норвежском.","https://www.klartale.no/"]
  ];
  function renderListeningLab(){
    if(listeningSession){URL.revokeObjectURL(listeningSession.url);listeningSession=null}
    shell('<div class="screen-head"><button class="back" onclick="navigate(\'hub\')">←</button><div><div class="eyebrow">Настоящий норвежский</div><h2 style="margin:0">Listening Lab</h2></div></div>'+
    '<div class="notice"><b>Живые голоса:</b> ниже встроены реальные записи норвежской речи из Norwegian Headstart. Материал распространяется как public domain; запись не является AI-озвучкой.</div>'+
    '<div class="section-title"><h2>Живой курс · 8 ситуаций</h2><span class="tag">FSI / DLI</span></div>'+
    '<section class="fsi-audio-list-v63">'+FSI_HUMAN_AUDIO.map((x,i)=>'<article class="fsi-audio-card-v63"><div><small>Unit '+(i+1)+'</small><b>'+esc(x[0])+'</b><span>'+esc(x[1])+'</span></div><audio controls preload="none" src="'+x[2]+'"></audio></article>').join("")+'</section>'+
    '<div class="fsi-license-v63"><b>Источник:</b> Norwegian Headstart, U.S. government language material. Записи публично распространяются как public domain. Курс 1981 года, поэтому отдельные формы обращения могут быть устаревшими; современную норму приложение продолжает проверять отдельно.</div>'+
    '<div class="section-title"><h2>Современные источники</h2></div><section class="grid">'+AUTH_RESOURCES.map(x=>'<article class="card"><h3>'+esc(x[0])+'</h3><p class="muted">'+esc(x[1])+'</p><a class="btn secondary link-btn" href="'+x[2]+'" target="_blank" rel="noopener">Открыть источник ↗</a></article>').join("")+'</section>'+
    '<div class="section-title"><h2>Разобрать своё аудио</h2></div><section class="card"><p class="muted">Выбери короткий норвежский аудиофайл до 6 МБ. Мы сделаем транскрипцию и 5 вопросов на понимание.</p><input id="listenFile" type="file" accept="audio/*" class="input"><button class="btn" style="margin-top:10px" onclick="analyzeListeningFile()">Анализировать</button><div id="listenLabBox"></div></section>',"home");
  }
  async function fileB64(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(",")[1]);r.onerror=reject;r.readAsDataURL(file)})}
  async function analyzeListeningFile(){
    const file=document.getElementById("listenFile")?.files?.[0],box=document.getElementById("listenLabBox");if(!file||!box||box.dataset.analyzing)return;
    if(file.size>6*1024*1024){box.innerHTML='<div class="feedback bad">Файл больше 6 МБ. Выбери короткий фрагмент.</div>';return}
    const level=state.level,revision=window.neScreenRevision;box.dataset.analyzing="true";
    const current=()=>box.isConnected&&revision===window.neScreenRevision;
    box.innerHTML='<div class="feedback">⏳ Распознаю аудио и создаю задания…</div>';
    try{
      const b64=await fileB64(file);if(!current())return;
      const tr=await neApiPost("/api/transcribe",{audioBase64:b64,mime:file.type||"audio/webm"});if(!current())return;
      if(!tr.ok||!tr.data?.text){box.innerHTML='<div class="feedback bad">Не удалось распознать аудио: '+esc(tr.error||"")+'</div>';return}
      const qs=await neApiPost("/api/listening-questions",{transcript:tr.data.text,level,practiceWords:neReinforcementWords?neReinforcementWords(10):[]});if(!current())return;
      if(!qs.ok||!Array.isArray(qs.data?.questions)||!qs.data.questions.length){box.innerHTML='<div class="feedback bad">Не удалось создать вопросы: '+esc(qs.error||"")+'</div>';return}
      if(listeningSession)URL.revokeObjectURL(listeningSession.url);
      listeningSession={transcript:tr.data.text,data:qs.data,i:0,correct:0,url:URL.createObjectURL(file)};renderListeningQuestions();
    }catch{if(current())box.innerHTML='<div class="feedback bad">Не удалось прочитать аудиофайл. Выбери файл снова и повтори попытку.</div>'}
    finally{delete box.dataset.analyzing}
  }
  function renderListeningQuestions(){
    const s=listeningSession,q=s.data.questions[s.i],box=document.getElementById("listenLabBox");if(!box)return;
    if(!q)return finishListeningLab();
    box.innerHTML='<div class="auth-audio"><audio controls src="'+s.url+'"></audio></div><div class="prompt">'+esc(q.q)+'</div><div class="choice-list">'+q.opts.map((x,i)=>'<button class="choice" onclick="answerListeningLab('+i+')">'+esc(x)+'</button>').join("")+'</div><div id="listenQfb"></div>';
  }
  function answerListeningLab(i){
    const s=listeningSession;if(!s||s.locked)return;const q=s.data.questions[s.i],ok=i===Number(q.correct);if(ok){s.correct++;s.locked=true}if(window.neUpdateSkill)neUpdateSkill("listening",ok?100:20);if(window.NEAdaptive){NEAdaptive.recordAttempt(state,{level:state.level,skill:"listening",score:ok?100:20,moduleId:state.level.toLowerCase()+"-supplemental",source:"listening_lab"});baseSaveState()}
    document.querySelectorAll("#listenLabBox .choice").forEach((button,j)=>{if(ok){button.disabled=true;if(j===Number(q.correct))button.classList.add("good")}else if(j===i){button.disabled=true;button.classList.add("bad")}});
    document.getElementById("listenQfb").innerHTML='<div class="feedback '+(ok?"good":"bad")+'">'+(ok?"✓ Верно":"Послушай ещё раз и попробуй другой ответ")+(q.evidence_no?'<br><small>'+esc(q.evidence_no)+'</small>':'')+'</div>';
    if(ok)neAdvance(()=>nextListeningLab(),650);
  }

  function nextListeningLab(){listeningSession.i++;listeningSession.locked=false;renderListeningQuestions()}
  function finishListeningLab(){
    const s=listeningSession,score=Math.round(s.correct/Math.max(1,s.data.questions.length)*100),box=document.getElementById("listenLabBox");markActivity("listening");
    box.innerHTML='<div class="feedback '+(score>=60?"good":"bad")+'"><b>Результат '+score+'%</b></div><details class="listen-transcript"><summary>Показать транскрипт</summary><p>'+esc(s.transcript)+'</p></details><h3>Полезные слова</h3><div class="wordchips">'+(s.data.vocabulary||[]).map(x=>'<span class="wordchip"><b>'+esc(x[0])+'</b> · '+esc(x[1])+'</span>').join("")+'</div>';
    URL.revokeObjectURL(s.url);
  }

  function cloudLink(){try{return JSON.parse(localStorage.getItem("ne_cloud_link")||"null")}catch{return null}}
  function setCloudLink(x){if(x)localStorage.setItem("ne_cloud_link",JSON.stringify(x));else localStorage.removeItem("ne_cloud_link")}
  function b64url(bytes){let s="";bytes.forEach(b=>s+=String.fromCharCode(b));return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
  async function rpc(name,body){const r=await neApiPost("/api/cloud",{name,params:body});if(!r.ok)throw new Error(r.error||"CLOUD");return r.data}
  function mergeHist(a=[],b=[]){const m=new Map();[...a,...b].forEach(x=>m.set(JSON.stringify([x.date,x.level,x.band,x.part,x.score]),x));return [...m.values()].sort((x,y)=>String(x.date||"").localeCompare(String(y.date||""))).slice(-100)}
  function newestPlacement(a,b){
    const valid=x=>x&&typeof x==="object"&&["A1","A2","B1","B2"].includes(x.recommendedStart||x.level);
    if(!valid(a))return valid(b)?b:null;if(!valid(b))return a;
    return String(a.date||"")>=String(b.date||"")?a:b;
  }
  function resolveStartLevel(local,remote,placement){
    const levels=["A1","A2","B1","B2"],explicit=placement?.recommendedStart||placement?.level;
    if(levels.includes(explicit))return explicit;
    const vals=[local?.learningV8?.startLevel,remote?.learningV8?.startLevel].filter(x=>levels.includes(x));
    if(!vals.length)return levels.includes(local?.level)?local.level:"A1";
    return vals.sort((a,b)=>levels.indexOf(a)-levels.indexOf(b))[0];
  }
  function mergeState(local,remote){
    const m={...remote,...local};m.xp=Math.max(local.xp||0,remote.xp||0);m.streak=Math.max(local.streak||0,remote.streak||0);
    m.placement=newestPlacement(local.placement,remote.placement)||local.placement||remote.placement||null;
    m.completed={...(remote.completed||{}),...(local.completed||{})};m.completedTopics={...(remote.completedTopics||{}),...(local.completedTopics||{})};
    m.gamification={...(remote.gamification||{}),...(local.gamification||{})};m.gamification.lessonAwards={};
    const awardDays=new Set([...Object.keys(remote.gamification?.lessonAwards||{}),...Object.keys(local.gamification?.lessonAwards||{})]);
    for(const day of awardDays){const rr=remote.gamification?.lessonAwards?.[day]||{},ll=local.gamification?.lessonAwards?.[day]||{},merged={...rr};for(const [k,v] of Object.entries(ll))merged[k]=Math.max(Number(merged[k]||0),Number(v||0));m.gamification.lessonAwards[day]=merged}
    Object.keys(m.gamification.lessonAwards).sort().slice(0,-14).forEach(day=>delete m.gamification.lessonAwards[day]);
    m.gamification.startedRewards={...(remote.gamification?.startedRewards||{})};for(const [k,v] of Object.entries(local.gamification?.startedRewards||{}))m.gamification.startedRewards[k]=Math.max(Number(m.gamification.startedRewards[k]||0),Number(v||0));
    const lastAwards=[remote.gamification?.lastAward,local.gamification?.lastAward].filter(Boolean).sort((a,b)=>String(a.date||"").localeCompare(String(b.date||"")));m.gamification.lastAward=lastAwards.at(-1)||null;
    m.errors={...(remote.errors||{})};for(const [k,v] of Object.entries(local.errors||{}))m.errors[k]=Math.max(m.errors[k]||0,v||0);
    m.skills={...(remote.skills||{})};for(const [k,v] of Object.entries(local.skills||{}))m.skills[k]=Math.max(m.skills[k]||0,v||0);
    m.srs={...(remote.srs||{}),...(local.srs||{})};m.dailyPacks={...(remote.dailyPacks||{}),...(local.dailyPacks||{})};m.dailyProgress={...(remote.dailyProgress||{}),...(local.dailyProgress||{})};
    m.dailyDictionary={...(remote.dailyDictionary||{})};for(const [k,v] of Object.entries(local.dailyDictionary||{})){const r=m.dailyDictionary[k];m.dailyDictionary[k]=!r?v:{...r,...v,firstDate:[r.firstDate,v.firstDate].filter(Boolean).sort()[0],exposures:Math.max(r.exposures||0,v.exposures||0),correct:Math.max(r.correct||0,v.correct||0),wrong:Math.max(r.wrong||0,v.wrong||0),strength:Math.max(r.strength||0,v.strength||0)}}
    m.lexicalCandidates={...(remote.lexicalCandidates||{})};for(const [k,v] of Object.entries(local.lexicalCandidates||{})){const r=m.lexicalCandidates[k];m.lexicalCandidates[k]=!r?v:{...r,...v,occurrences:Math.max(r.occurrences||0,v.occurrences||0),confidence:Math.max(r.confidence||0,v.confidence||0),firstSeen:[r.firstSeen,v.firstSeen].filter(Boolean).sort()[0],lastSeen:[r.lastSeen,v.lastSeen].filter(Boolean).sort().at(-1)}}
    m.lexicalCapture={...(remote.lexicalCapture||{}),...(local.lexicalCapture||{})};
    m.guidedJourney={...(remote.guidedJourney||{}),...(local.guidedJourney||{})};m.guidedJourney.lessonDates={...(remote.guidedJourney?.lessonDates||{}),...(local.guidedJourney?.lessonDates||{})};m.guidedJourney.reviewDates={...(remote.guidedJourney?.reviewDates||{}),...(local.guidedJourney?.reviewDates||{})};
    m.learningV8={...(remote.learningV8||{}),...(local.learningV8||{})};m.learningV8.startLevel=resolveStartLevel(local,remote,m.placement);
    m.learningV8.skills={...(remote.learningV8?.skills||{})};for(const [k,v] of Object.entries(local.learningV8?.skills||{}))m.learningV8.skills[k]=Math.max(m.learningV8.skills[k]||0,v||0);
    m.learningV8.levelSkills={};for(const level of ["A1","A2","B1","B2"]){m.learningV8.levelSkills[level]={...(remote.learningV8?.levelSkills?.[level]||{})};for(const [k,v] of Object.entries(local.learningV8?.levelSkills?.[level]||{}))m.learningV8.levelSkills[level][k]=Math.max(m.learningV8.levelSkills[level][k]||0,v||0)}
    m.learningV8.modules={...(remote.learningV8?.modules||{}),...(local.learningV8?.modules||{})};
    m.learningV8.reviews={...(remote.learningV8?.reviews||{}),...(local.learningV8?.reviews||{})};
    m.learningV8.errorPatterns={...(remote.learningV8?.errorPatterns||{})};for(const [k,v] of Object.entries(local.learningV8?.errorPatterns||{}))m.learningV8.errorPatterns[k]=Math.max(m.learningV8.errorPatterns[k]||0,v||0);
    const adaptiveAttempts=[...(remote.learningV8?.attempts||[]),...(local.learningV8?.attempts||[])],seenAdaptive=new Set();
    m.learningV8.attempts=adaptiveAttempts.filter(x=>{const key=JSON.stringify([x?.date,x?.skill,x?.moduleId,x?.source,x?.score]);if(seenAdaptive.has(key))return false;seenAdaptive.add(key);return true}).sort((a,b)=>String(a?.date||"").localeCompare(String(b?.date||""))).slice(-500);
    m.story={...(remote.story||{}),...(local.story||{})};m.story.completed={...(remote.story?.completed||{}),...(local.story?.completed||{})};m.story.choices={...(remote.story?.choices||{}),...(local.story?.choices||{})};m.story.journal={...(remote.story?.journal||{}),...(local.story?.journal||{})};m.story.sideQuests={...(remote.story?.sideQuests||{}),...(local.story?.sideQuests||{})};m.story.stats={...(remote.story?.stats||{})};for(const [k,v] of Object.entries(local.story?.stats||{}))m.story.stats[k]=Math.max(m.story.stats[k]||0,v||0);
    for(const key of ["wordFavorites","chatThreads","chatMemories","generatedLessons"]){m[key]={...(remote[key]||{}),...(local[key]||{})};}
    const rm=remote.noraMemory||{},lm=local.noraMemory||{};
    m.noraMemory={...rm,...lm,introduced:rm.introduced===true||lm.introduced===true,
      conversationCount:Math.max(Number(rm.conversationCount)||0,Number(lm.conversationCount)||0),
      lastPracticeDate:[rm.lastPracticeDate,lm.lastPracticeDate].filter(Boolean).sort().at(-1)||""};
    const ra=remote.activeLesson,la=local.activeLesson;
    m.activeLesson=(ra&&la)?(String(ra.savedAt||"")>String(la.savedAt||"")?ra:la):(la||ra||null);
    m.elite={...(remote.elite||{}),...(local.elite||{})};
    for(const key of ["drills","grammarDrills"]){m.elite[key]={...(remote.elite?.[key]||{}),...(local.elite?.[key]||{})};}
    m.testHistory=mergeHist(remote.testHistory,local.testHistory);m.examHistory=mergeHist(remote.examHistory,local.examHistory);
    m.elite.activity={...(remote.elite?.activity||{}),...(local.elite?.activity||{})};m.elite.achievements={...(remote.elite?.achievements||{}),...(local.elite?.achievements||{})};
    m.elite.counts={...(remote.elite?.counts||{})};for(const [k,v] of Object.entries(local.elite?.counts||{}))m.elite.counts[k]=Math.max(m.elite.counts[k]||0,v||0);
    return m;
  }
  async function createCloud(){
    const sync_id=crypto.randomUUID(),buf=new Uint8Array(32);crypto.getRandomValues(buf);const secret=b64url(buf);
    const d=await rpc("norsk_eventyr_sync_create",{p_sync_id:sync_id,p_secret:secret,p_state:state});const link={sync_id,secret,revision:Number(d.revision)||1,lastSync:new Date().toISOString()};setCloudLink(link);renderCloud();
  }
  async function cloudSync(show=true){
    const link=cloudLink();if(!link||cloudBusy)return false;cloudBusy=true;
    // Do not replace the local state before the server has actually accepted it.
    // Otherwise a rejected push can leave the learner with unconfirmed remote data.
    try{
      const pulled=await rpc("norsk_eventyr_sync_pull",{p_sync_id:link.sync_id,p_secret:link.secret});
      if(cloudLink()?.sync_id!==link.sync_id)return false;
      if(!pulled.ok)throw new Error("Код синхронизации отклонён.");
      if(!validProgressState(pulled.state))throw new Error("В облаке повреждённый прогресс. Локальные данные сохранены.");
      const outgoing=mergeState(state,pulled.state);
      if(!validProgressState(outgoing))throw new Error("Не удалось безопасно объединить учебные данные.");
      const pushed=await rpc("norsk_eventyr_sync_push",{p_sync_id:link.sync_id,p_secret:link.secret,p_state:outgoing,p_expected_revision:Number(pulled.revision)});
      if(!pushed.ok&&pushed.error==="CONFLICT")throw new Error("Данные изменились на другом устройстве. Нажми синхронизацию ещё раз.");
      if(!pushed.ok)throw new Error("Облако не подтвердило сохранение. Попробуй ещё раз.");
      if(cloudLink()?.sync_id!==link.sync_id)return false;
      // Merge fresh local progress again: the learner might have answered a task
      // while the network request was in flight. Never roll those answers back.
      state=mergeState(state,outgoing);
      if(!baseSaveState())throw new Error("Не удалось сохранить объединённый прогресс на устройстве.");
      link.revision=Number(pushed.revision)||Number(pulled.revision);
      link.lastSync=new Date().toISOString();setCloudLink(link);
      if(show&&document.querySelector('.shell-v7[data-screen="cloud"] #cloudFb'))renderCloud();
      return true;
    }catch(e){
      if(show)document.getElementById("cloudFb")?.replaceChildren(Object.assign(document.createElement("div"),{className:"feedback bad",textContent:e.message}));
      return false;
    }finally{cloudBusy=false}
  }
  function scheduleCloud(){if(!cloudLink())return;clearTimeout(cloudTimer);cloudTimer=setTimeout(()=>cloudSync(false),4000)}
  async function connectCloud(){
    const val=document.getElementById("cloudCode")?.value.trim(),parts=val?.split(".");if(!parts||parts.length!==2)return alert("Неверный код синхронизации.");
    if(cloudBusy)return;const previous=cloudLink();
    const link={sync_id:parts[0],secret:parts[1],revision:0,lastSync:null};setCloudLink(link);const ok=await cloudSync(false);if(!ok){setCloudLink(previous);return alert("Не удалось подключить этот код.")}renderCloud();
  }
  function renderCloud(){
    const link=cloudLink(),last=link?.lastSync?new Date(link.lastSync).toLocaleString("ru-RU"):"—",code=link?link.sync_id+"."+link.secret:"";
    shell('<div class="screen-head"><button class="back" onclick="navigate(\'hub\')">←</button><div><div class="eyebrow">Облако</div><h2 style="margin:0">Синхронизация между устройствами</h2></div></div><section class="card"><p class="muted">Секретный код нужен для восстановления учебного прогресса. В старом режиме облака он даёт доступ к данным; новая защита дополнительно проверяет аккаунт. Не передавай код другим людям и сохрани резервную копию перед сменой устройства.</p>'+(link?'<div class="metric"><span>Последняя синхронизация</span><strong>'+esc(last)+'</strong></div><label class="field-label">Код восстановления</label><textarea id="cloudRecovery" class="input" readonly>'+esc(code)+'</textarea><div class="notice"><b>Не публикуй этот код.</b> Он даёт доступ к твоему учебному прогрессу.</div><div class="row" style="margin-top:12px"><button class="btn" onclick="cloudSync()">Синхронизировать сейчас</button><button class="btn secondary" onclick="copyRecovery()">Копировать код</button><button class="btn ghost" onclick="disconnectCloud()">Отключить это устройство</button><button class="btn ghost" onclick="deleteCloudData()">Удалить облачную копию</button></div>':'<button class="btn" onclick="createCloud()">Создать облачную синхронизацию</button><hr><label class="field-label">Или код с другого устройства</label><textarea id="cloudCode" class="input" placeholder="UUID.секретный-код"></textarea><button class="btn secondary" style="margin-top:10px" onclick="connectCloud()">Подключить</button>')+'<div id="cloudFb"></div></section>',"home");
  }
  async function copyRecovery(){const t=document.getElementById("cloudRecovery")?.value;if(t){await navigator.clipboard.writeText(t);alert("Код скопирован.")}}
  function disconnectCloud(){if(confirm("Отключить облако только на этом устройстве? Данные в облаке останутся.")){setCloudLink(null);renderCloud()}}
  async function deleteCloudData(){
    const link=cloudLink();if(!link||cloudBusy)return;
    if(!confirm("Удалить облачную копию навсегда? Код восстановления перестанет работать на ВСЕХ устройствах. Локальный прогресс сохранится."))return;
    cloudBusy=true;
    try{
      const data=await rpc("norsk_eventyr_sync_delete",{p_sync_id:link.sync_id,p_secret:link.secret});
      if(data?.ok!==true)throw new Error("Удаление не подтверждено сервером.");
      if(cloudLink()?.sync_id===link.sync_id){setCloudLink(null);renderCloud();alert("Облачная копия удалена. Прогресс на устройстве сохранён.");}
    }catch{alert("Не удалось удалить облачную копию. Она могла остаться в облаке; повтори попытку.");}
    finally{cloudBusy=false}
  }


  function renderSettings(){
    const canInstall=!!installPrompt;
    shell('<div class="screen-head"><button class="back" onclick="navigate(\'hub\')">←</button><div><div class="eyebrow">Настройки</div><h2 style="margin:0">Norsk Eventyr 8.0 beta</h2></div></div><section class="grid"><article class="card"><h3>Учебная цель</h3><div class="goal-options">'+Object.entries(GOALS).map(([k,v])=>'<button class="goal-option '+(state.elite.goal===k?"active":"")+'" onclick="setEliteGoal(\''+k+'\')"><b>'+esc(v[0])+'</b><small>'+esc(v[1])+'</small></button>').join("")+'</div></article><article class="card"><h3>Время в день</h3><div class="row">'+[10,20,30,45].map(n=>'<button class="btn '+(state.elite.dailyMinutes===n?"":"ghost")+'" onclick="setDailyMinutes('+n+')">'+n+' мин</button>').join("")+'</div><hr><h3>Приложение</h3><button class="btn secondary" '+(canInstall?"":"disabled")+' onclick="installApp()">'+(canInstall?"Установить на телефон":"Установка уже недоступна/выполнена")+'</button></article></section><div class="section-title"><h2>Системная проверка</h2></div><section class="card health-list"><div class="metric"><span>LocalStorage</span><strong>✓</strong></div><div class="metric"><span>Service Worker</span><strong>'+("serviceWorker" in navigator?"✓":"—")+'</strong></div><div class="metric"><span>Микрофон API</span><strong>'+(navigator.mediaDevices?.getUserMedia?"✓":"—")+'</strong></div><div class="metric"><span>Облако</span><strong>'+(cloudLink()?"✓":"не подключено")+'</strong></div><div id="healthRemote" class="metric"><span>Сервер AI</span><strong>—</strong></div><div class="row"><button class="btn ghost" onclick="runHealthCheck()">Проверить сервер</button><button class="btn ghost" onclick="navigate(\'cloud\')">Настроить облако</button></div></section>',"home");
  }
  async function runHealthCheck(){
    const box=document.getElementById("healthRemote");if(box)box.querySelector("strong").textContent="…";
    try{const r=await fetch("/api/health",{cache:"no-store"}),d=await r.json();if(box)box.querySelector("strong").textContent=r.ok&&d.ok===true?"✓ сервер доступен":"⚠ проверка"}catch{if(box)box.querySelector("strong").textContent="✕"}
  }
  function setEliteGoal(g){state.elite.goal=g;saveState();renderSettings()}
  function setDailyMinutes(n){state.elite.dailyMinutes=n;saveState();renderSettings()}
  async function installApp(){return window.NEAccess?.install()}

  function errorCard(title,msg){shell('<section class="card"><h2>'+esc(title)+'</h2><p class="muted">'+esc(msg||"Неизвестная ошибка")+'</p><button class="btn" onclick="navigate(\'home\')">На главную</button></section>',"home")}

  Object.assign(window,{renderPlan,startDictation,checkDictation,nextDictation,startGrammarLab,answerGrammarLab,nextGrammarLab,renderPronunciationLab,selectSoundGroup,selectPronPhrase,practicePronounce,renderListeningLab,analyzeListeningFile,answerListeningLab,nextListeningLab,renderCloud,createCloud,cloudSync,connectCloud,copyRecovery,disconnectCloud,deleteCloudData,renderSettings,runHealthCheck,setEliteGoal,setDailyMinutes,installApp,neMergeState:mergeState,neResolveStartLevel:resolveStartLevel});

  window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installPrompt=e});
  window.addEventListener("appinstalled",()=>{installPrompt=null});
  window.addEventListener("online",()=>scheduleCloud());
  setTimeout(()=>{refreshAchievements();if(cloudLink())cloudSync(false);const open=new URLSearchParams(location.search).get("open");if(open&&["chat","daily","dictation","pronunciation","listeninglab","plan","story","storyside"].includes(open)){navigate(open);history.replaceState(null,"",location.pathname)}},1200);
})();