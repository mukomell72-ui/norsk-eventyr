// Norsk Eventyr 6.0 — compact mobile-first interface
(() => {
  const baseNavigate=window.navigate;
  const baseSendChat=window.sendChat;
  const baseStartChat=window.startChat;
  const baseSpeakText=window.speakText;
  let courseTab="core",currentRoute="home";

  const SKILL_RU={reading:"Чтение",listening:"Слух",writing:"Письмо",speaking:"Речь",grammar:"Грамматика",vocabulary:"Слова"};
  const CHAT_SCENARIOS={
    butikk:"Магазин",lege:"Врач",jobb:"Работа",intervju:"Собеседование",kommune:"Kommune",
    skole:"Школа",transport:"Транспорт",nabo:"Сосед",kafé:"Кафе",tilfeldig:"Случайная ситуация"
  };

  function todayKey(){return window.neLocalDate?window.neLocalDate():new Date().toISOString().slice(0,10)}
  function dueCount(){try{return window.neDueWords?window.neDueWords().length:0}catch{return 0}}
  function storyDone(){return Object.keys(state.story?.completed||{}).length}
  function currentStory(){
    if(typeof STORY_EPISODES==="undefined"||!Array.isArray(STORY_EPISODES))return null;
    const preferred=(typeof STORY_SEASONS!=="undefined"?STORY_SEASONS:[]).find(s=>s.level===state.level);
    const eps=preferred?STORY_EPISODES.filter(e=>e.season===preferred.id):STORY_EPISODES;
    return eps.find(e=>!state.story?.completed?.[e.id])||eps[0]||null;
  }
  function nextLesson(){
    return COURSE.find(x=>x.level===state.level&&!state.completed?.[x.id])||lessons(state.level)[0];
  }
  function cloudOn(){return Boolean(localStorage.getItem("ne_cloud_link"))}
  function dayActivity(){return state.elite?.activity?.[todayKey()]||{}}
  function safePct(n,d){return d?Math.round(n/d*100):0}

  function navV6(active){
    let group=active;
    if(["lesson","topic"].includes(group))group="course";
    if(["storyepisode","storyjournal"].includes(group))group="story";
    if(["daily","dailypractice","review","storyside","plan"].includes(group))group="home";
    if(["tests","test","exam","examrun","exampart","progress","dictionary","dictation","grammarlab","pronunciation","listeninglab","settings","cloud"].includes(group))group="hub";
    const items=[
      ["home","⌂","Сегодня"],
      ["course","▤","Курс"],
      ["chat","◉","Разговор"],
      ["story","◆","Fjordvik"],
      ["hub","•••","Ещё"]
    ];
    return '<nav class="dock-v6">'+items.map(x=>'<button class="'+(group===x[0]?"active":"")+'" onclick="navigate(\''+x[0]+'\')"><b>'+x[1]+'</b><span>'+x[2]+'</span></button>').join("")+'</nav>';
  }

  shell=window.shell=function(content,active="home"){
    const level=esc(state.level||"A1");
    document.getElementById("app").innerHTML=
      '<div class="shell shell-v6">'+
        '<header class="topbar topbar-v6">'+
          '<button class="brand-v6" onclick="navigate(\'home\')" aria-label="Главная"><span>N</span><strong>Norsk</strong></button>'+
          '<div class="top-status-v6"><span>'+level+'</span><button onclick="navigate(\'hub\')" aria-label="Меню">•••</button></div>'+
        '</header>'+
        '<main class="main-v6">'+content+'</main>'+
        navV6(currentRoute||active)+
      '</div>';
  };

  function compactHeader(kicker,title,right=""){
    return '<div class="head-v6"><div><small>'+esc(kicker)+'</small><h1>'+esc(title)+'</h1></div>'+right+'</div>';
  }

  function guidedJourneyV61(){
    state.guidedJourney=state.guidedJourney||{lessonDates:{},reviewDates:{}};
    state.guidedJourney.lessonDates=state.guidedJourney.lessonDates||{};
    state.guidedJourney.reviewDates=state.guidedJourney.reviewDates||{};
    const day=todayKey(),due=dueCount(),activity=dayActivity(),story=currentStory(),lesson=nextLesson();
    const dailyDone=Boolean(state.dailyProgress?.[day]?.completed);
    const lessonDone=Boolean(state.guidedJourney.lessonDates[day]);
    const storyDoneToday=Boolean(state.story?.sideQuests?.[day]);
    const talkDone=Boolean(activity.conversation);
    const reviewWasRequired=due>0||Boolean(state.guidedJourney.reviewDates[day]);
    const reviewDone=reviewWasRequired?Boolean(state.guidedJourney.reviewDates[day])&&due===0:true;
    const steps=[
      {id:"words",title:"5 персональных слов",sub:"Из твоих реальных пробелов",mins:5,done:dailyDone,route:"daily"},
      ...(reviewWasRequired?[{id:"review",title:"Короткое повторение",sub:due?due+" слов ждут":"Повторение завершено",mins:3,done:reviewDone,route:"review"}]:[]),
      {id:"lesson",title:"Основной урок",sub:lesson?.title||"Курс "+state.level,mins:7,done:lessonDone,route:lesson?"lesson":"course",data:lesson?.id||state.level},
      {id:"story",title:"Сцена в Fjordvik",sub:story?.title||"Миссия дня",mins:4,done:storyDoneToday,route:"storyside"},
      {id:"talk",title:"3 минуты живой речи",sub:"Скажи своими словами",mins:3,done:talkDone,route:"chat"}
    ];
    const next=steps.find(x=>!x.done)||{id:"done",title:"Сегодня всё готово",sub:"Можно продолжить сюжет без обязательств",mins:0,done:true,route:"story"};
    return {day,due,activity,story,lesson,steps,next,done:steps.filter(x=>x.done).length,total:steps.length,mins:steps.filter(x=>!x.done).reduce((a,x)=>a+x.mins,0)};
  }
  function continueTodayV61(){const x=guidedJourneyV61().next;navigate(x.route,x.data)}
  function guidedStepV61(i){const x=guidedJourneyV61().steps[i];if(x)navigate(x.route,x.data)}
  function journeyStepV61(x,i){
    return '<button class="journey-step-v61 '+(x.done?"done":"")+'" onclick="guidedStepV61('+i+')"><span class="journey-dot-v61">'+(x.done?"✓":i+1)+'</span><span><b>'+esc(x.title)+'</b><small>'+esc(x.sub)+'</small></span><em>'+(x.done?"готово":x.mins+" мин")+'</em></button>';
  }

  renderHome=window.renderHome=function(){currentRoute="home";
    const j=guidedJourneyV61(),story=j.story,pct=j.total?Math.round(j.done/j.total*100):100;
    const npc=story?.npc||"Fjordvik",district=story?.district||"Сегодня";
    const allDone=j.done===j.total;
    shell(
      '<section class="today-v61">'+
        '<div class="today-top-v61"><div><small>'+esc(district)+' · '+esc(state.level||"A1")+'</small><h1>Сегодня в Fjordvik</h1></div><div class="today-count-v61"><b>'+j.done+'/'+j.total+'</b><span>готово</span></div></div>'+
        '<section class="journey-hero-v61 '+(allDone?"complete":"")+'">'+
          '<div class="journey-scene-v61"><span class="npc-v61">'+esc(String(npc).slice(0,1))+'</span><div><small>'+esc(npc)+'</small><h2>'+esc(story?.title||"Твой норвежский день")+'</h2><p>'+esc(story?.hook||"Небольшая практика сегодня приблизит следующий уровень.")+'</p></div></div>'+
          '<div class="journey-progress-v61"><i><em style="width:'+pct+'%"></em></i><span>'+pct+'%</span></div>'+
          '<button class="journey-main-v61" onclick="continueTodayV61()">'+
            '<span><small>'+(allDone?"Маршрут завершён":"Следующее действие · "+j.next.mins+" мин")+'</small><b>'+esc(j.next.title)+'</b><em>'+esc(j.next.sub)+'</em></span><strong>→</strong>'+
          '</button>'+
        '</section>'+
        '<section class="route-v61"><div class="route-head-v61"><div><small>Твой маршрут</small><h2>'+(j.mins?("Ещё примерно "+j.mins+" мин"):"На сегодня достаточно")+'</h2></div><span>'+j.done+'/'+j.total+'</span></div>'+
          '<div class="journey-list-v61">'+j.steps.map(journeyStepV61).join("")+'</div>'+
        '</section>'+
        '<details class="free-mode-v61"><summary>Хочу выбрать сам</summary><div class="free-grid-v61">'+
          '<button onclick="navigate(\'course\')"><span>▤</span><b>Курс</b></button>'+
          '<button onclick="navigate(\'chat\')"><span>◉</span><b>Samtale</b></button>'+
          '<button onclick="navigate(\'story\')"><span>◆</span><b>Fjordvik</b></button>'+
          '<button onclick="navigate(\'hub\')"><span>•••</span><b>Все инструменты</b></button>'+
        '</div></details>'+
      '</section>',
    "home");
  };

  renderCourse=window.renderCourse=function(level=state.level){currentRoute="course";
    state.level=level;saveState();
    const core=lessons(level),topics=(typeof TOPIC_CATALOG!=="undefined"?TOPIC_CATALOG:[]).filter(x=>x.level===level),next=core.find(x=>!state.completed?.[x.id])||core[0],progress=levelProgress(level);
    const list=courseTab==="topics"?topics:core;
    shell(
      compactHeader("Курс "+level,"Учиться",'<span class="head-score-v6">'+progress+'%</span>')+
      '<div class="level-switch-v6">'+LEVELS.map(l=>'<button class="'+(l===level?"active":"")+'" onclick="renderCourse(\''+l+'\')">'+l+'</button>').join("")+'</div>'+
      '<div class="course-progress-v6"><div class="progress mini"><i style="width:'+progress+'%"></i></div><span>'+completed(level)+'/'+core.length+' основных уроков</span></div>'+
      (next?'<button class="resume-v6" onclick="navigate(\'lesson\',\''+escJs(next.id)+'\')"><span>'+esc(next.icon||"▶")+'</span><div><small>Продолжить</small><b>'+esc(next.title)+'</b></div><i>→</i></button>':'')+
      '<div class="segmented-v6"><button class="'+(courseTab==="core"?"active":"")+'" onclick="v6CourseTab(\'core\')">Основные</button><button class="'+(courseTab==="topics"?"active":"")+'" onclick="v6CourseTab(\'topics\')">Темы AI</button></div>'+
      '<section class="course-list-v6">'+
        (courseTab==="core"?list.map((x,i)=>lessonRowV6(x,i)).join(""):list.map(topicRowV6).join(""))+
      '</section>',
    "course");
  };

  function lessonRowV6(x,i){
    const done=Boolean(state.completed?.[x.id]);
    return '<button class="lesson-row-v6 '+(done?"done":"")+'" onclick="navigate(\'lesson\',\''+escJs(x.id)+'\')">'+
      '<span class="lesson-dot-v6">'+(done?"✓":i+1)+'</span>'+
      '<div><strong>'+esc(x.title)+'</strong><small>'+esc(x.grammar||"")+'</small></div>'+
      '<i>›</i>'+
    '</button>';
  }
  function topicRowV6(t){
    const done=Boolean(state.completedTopics?.[t.id]);
    return '<button class="lesson-row-v6 '+(done?"done":"")+'" onclick="navigate(\'topic\',\''+escJs(t.id)+'\')">'+
      '<span class="lesson-dot-v6">'+(done?"✓":"✦")+'</span>'+
      '<div><strong>'+esc(t.title)+'</strong><small>'+esc(t.goal||"")+'</small></div>'+
      '<i>›</i>'+
    '</button>';
  }
  function v6CourseTab(tab){courseTab=tab;renderCourse(state.level)}

  function chatMessagesV6(){
    const h=state.chatHistory||[];
    if(!h.length)return '<div class="chat-empty-v6"><span>◉</span><strong>Начни разговор</strong><small>Напиши фразу или нажми «Новый диалог».</small></div>';
    return h.map((m,i)=>{
      if(m.role==="user")return '<div class="bubble-v6 user">'+esc(m.text)+'</div>';
      const meta=m.meta||{};
      return '<div class="ai-line-v6"><span>N</span><div><div class="bubble-v6 ai">'+esc(m.text)+'</div>'+
        '<div class="bubble-actions-v6"><button onclick="speakText(\''+escJs(m.text)+'\')">🔊</button>'+(meta.translation_ru?'<button onclick="v6ToggleTranslation('+i+')">RU</button>':'')+'</div>'+
        (meta.translation_ru?'<div id="v6tr'+i+'" class="mini-translation-v6" hidden>'+esc(meta.translation_ru)+'</div>':'')+
        (meta.corrected?'<div class="mini-correction-v6"><b>Лучше:</b> '+esc(meta.corrected)+'</div>':'')+
      '</div></div>';
    }).join("");
  }

  function renderChatV6(){currentRoute="chat";
    const p=state.chatPrefs||{level:state.level||"A1",mode:"free",topic:"",scenario:"butikk",autoSpeak:true};
    shell(
      compactHeader("Samtale","Разговор",'<button class="round-action-v6" onclick="v6ToggleChatSetup()">⚙</button>')+
      '<section id="chatSetupV6" class="chat-setup-v6">'+
        '<div class="chat-selects-v6"><select onchange="v6ChatPref(\'level\',this.value)">'+LEVELS.map(l=>'<option '+(p.level===l?"selected":"")+'>'+l+'</option>').join("")+'</select>'+
        '<select onchange="v6ChatPref(\'mode\',this.value)"><option value="free" '+(p.mode==="free"?"selected":"")+'>Свободно</option><option value="corrections" '+(p.mode==="corrections"?"selected":"")+'>Исправлять</option><option value="exam" '+(p.mode==="exam"?"selected":"")+'>Устная практика</option><option value="roleplay" '+(p.mode==="roleplay"?"selected":"")+'>Роль</option></select></div>'+
        '<input class="input compact" value="'+esc(p.topic||"")+'" placeholder="Тема: работа, машины, жизнь…" onchange="v6ChatPref(\'topic\',this.value)">'+
        (p.mode==="roleplay"?'<select class="input compact" onchange="v6ChatPref(\'scenario\',this.value)">'+Object.entries(CHAT_SCENARIOS).map(([k,v])=>'<option value="'+k+'" '+(p.scenario===k?"selected":"")+'>'+esc(v)+'</option>').join("")+'</select>':'')+
      '</section>'+
      '<section class="chat-card-v6">'+
        '<div id="chatMessages" class="chat-messages-v6">'+chatMessagesV6()+'</div>'+
        '<div class="composer-v6"><textarea id="chatInput" rows="2" placeholder="Скажи или напиши по-норвежски…"></textarea><div><button id="chatMicBtn" onclick="toggleMic(\'chatInput\')">🎤</button><button onclick="v6SendChat()">↑</button></div></div>'+
      '</section>'+
      '<div class="chat-footer-v6"><button class="today-return-v61" onclick="navigate(\'home\')">← Сегодня</button><button onclick="v6StartChat()">＋ Новый диалог</button><button onclick="v6ClearChat()">Очистить</button></div>',
    "chat");
    setTimeout(()=>{const box=document.getElementById("chatMessages");if(box)box.scrollTop=box.scrollHeight},0);
  }

  function v6ToggleChatSetup(){document.getElementById("chatSetupV6")?.classList.toggle("open")}
  function v6ChatPref(key,value){
    state.chatPrefs=state.chatPrefs||{};
    state.chatPrefs[key]=value;if(key==="level")state.level=value;saveState();renderChatV6();
  }
  function v6ToggleTranslation(i){const e=document.getElementById("v6tr"+i);if(e)e.hidden=!e.hidden}
  async function v6SendChat(){
    if(!baseSendChat)return;
    await baseSendChat();
    renderChatV6();
  }
  async function v6StartChat(){
    if(!baseStartChat)return;
    await baseStartChat();
    renderChatV6();
  }
  function v6ClearChat(){
    if((state.chatHistory||[]).length&&!confirm("Очистить этот разговор?"))return;
    state.chatHistory=[];saveState();renderChatV6();
  }

  function hubItem(icon,title,sub,route,badge=""){
    return '<button class="hub-item-v6" onclick="navigate(\''+route+'\')"><span>'+icon+'</span><div><strong>'+title+'</strong><small>'+sub+'</small></div>'+(badge?'<b>'+badge+'</b>':'')+'</button>';
  }
  function renderHub(){currentRoute="hub";
    const due=dueCount(),dict=Object.keys(state.dailyDictionary||{}).length;
    shell(
      compactHeader("Все инструменты","Ещё",'<span class="head-score-v6">'+Number(state.xp||0)+' XP · '+Number(state.streak||0)+' дн.</span>')+
      '<section class="hub-v6">'+
        hubItem("↻","Повторение","Слова по интервалам","review",due?String(due):"✓")+
        hubItem("5","Словарь","Персональные слова","dictionary",dict?String(dict):"")+
        hubItem("✓","Тесты","Проверка уровня","tests")+
        hubItem("★","Norskprøven","Экзаменационная практика","exam")+
        hubItem("✎","Диктант","Слух + письмо","dictation")+
        hubItem("Aa","Грамматика","Слабые места","grammarlab")+
        hubItem("⌁","Произношение","Звуки и ритм","pronunciation")+
        hubItem("◌","Listening Lab","Настоящая речь","listeninglab")+
        hubItem("↗","Прогресс","Навыки и результаты","progress")+
        hubItem("☁","Облако",cloudOn()?"Подключено":"Синхронизация","cloud")+
        hubItem("⚙","Настройки","Цель и режим","settings")+
        hubItem("◆","Дневник Fjordvik","История решений","storyjournal")+
      '</section>',
    "hub");
  }

  const ROUTES_V62=new Set([
    "home","course","chat","story","hub","daily","dailypractice","dictionary","review",
    "tests","test","exam","examrun","exampart","progress","dictation","grammarlab",
    "pronunciation","listeninglab","cloud","settings","plan","placement","lesson","topic",
    "storyepisode","storyjournal","storyside"
  ]);
  function routeTopV62(){
    try{window.scrollTo({top:0,left:0,behavior:"auto"})}catch{try{window.scrollTo(0,0)}catch{}}
  }
  function routeErrorV62(view,error){
    console.error("Norsk Eventyr route failed:",view,error);
    currentRoute="hub";
    shell(
      '<section class="card route-error-v62">'+
        '<div class="route-error-mark-v62">!</div>'+
        '<div class="eyebrow">Экран не открылся</div>'+
        '<h1>Попробуй ещё раз</h1>'+
        '<p class="muted">Раздел «'+esc(view||"неизвестный")+'» не загрузился. Прогресс не потерян.</p>'+
        '<div class="row"><button class="btn" onclick="navigate(\'hub\')">Все инструменты</button><button class="btn ghost" onclick="navigate(\'home\')">Сегодня</button></div>'+
      '</section>',
    "hub");
    routeTopV62();
  }
  navigate=window.navigate=function(view,data){
    const target=view==="more"?"hub":view;
    if(!ROUTES_V62.has(target))return routeErrorV62(target,new Error("UNKNOWN_ROUTE"));
    currentRoute=target;stopTimer();
    try{
      let result;
      if(target==="home")result=renderHome();
      else if(target==="course")result=renderCourse(data||state.level);
      else if(target==="chat")result=renderChatV6();
      else if(target==="hub")result=renderHub();
      else result=baseNavigate(target,data);
      routeTopV62();
      if(result&&typeof result.then==="function"){
        return result.then(v=>{routeTopV62();return v}).catch(e=>routeErrorV62(target,e));
      }
      return result;
    }catch(e){
      return routeErrorV62(target,e);
    }
  };

  window.renderChat=renderChatV6;
  Object.assign(window,{v6CourseTab,v6ToggleChatSetup,v6ChatPref,v6ToggleTranslation,v6SendChat,v6StartChat,v6ClearChat,renderHub,continueTodayV61,guidedStepV61,routeErrorV62});

  setTimeout(()=>{const open=new URLSearchParams(location.search).get("open");if(!open||open==="home")renderHome()},140);
})();