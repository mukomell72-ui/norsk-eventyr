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
    if(["storyepisode","storyside","storyjournal"].includes(group))group="story";
    if(["review","tests","test","exam","examrun","exampart","progress","dictionary","daily","dailypractice","plan","dictation","grammarlab","pronunciation","listeninglab","settings","cloud"].includes(group))group="hub";
    const items=[
      ["home","⌂","Главная"],
      ["course","▤","Учиться"],
      ["chat","◉","Разговор"],
      ["story","◆","История"],
      ["hub","•••","Ещё"]
    ];
    return '<nav class="dock-v6">'+items.map(x=>'<button class="'+(group===x[0]?"active":"")+'" onclick="navigate(\''+x[0]+'\')"><b>'+x[1]+'</b><span>'+x[2]+'</span></button>').join("")+'</nav>';
  }

  shell=window.shell=function(content,active="home"){
    const level=esc(state.level||"A1"),xp=Number(state.xp||0);
    document.getElementById("app").innerHTML=
      '<div class="shell shell-v6">'+
        '<header class="topbar topbar-v6">'+
          '<button class="brand-v6" onclick="navigate(\'home\')" aria-label="Главная"><span>N</span><strong>Norsk Eventyr</strong></button>'+
          '<div class="top-status-v6"><span>'+level+'</span><span>'+xp+' XP</span><button onclick="navigate(\'hub\')" aria-label="Меню">•••</button></div>'+
        '</header>'+
        '<main class="main-v6">'+content+'</main>'+
        navV6(currentRoute||active)+
      '</div>';
  };

  function compactHeader(kicker,title,right=""){
    return '<div class="head-v6"><div><small>'+esc(kicker)+'</small><h1>'+esc(title)+'</h1></div>'+right+'</div>';
  }

  renderHome=window.renderHome=function(){currentRoute="home";
    const next=nextLesson(),due=dueCount(),story=currentStory(),activity=dayActivity(),dailyDone=Boolean(state.dailyProgress?.[todayKey()]?.completed);
    const weak=Object.entries(state.skills||{}).sort((a,b)=>Number(a[1])-Number(b[1])).slice(0,3);
    const today=[
      {icon:"5",title:"5 слов",sub:dailyDone?"готово":"на сегодня",done:dailyDone,route:"daily"},
      {icon:"↻",title:"Повтор",sub:due?due+" ждут":"всё чисто",done:due===0,route:"review"},
      {icon:"◉",title:"Разговор",sub:activity.conversation?"готово":"3–5 минут",done:Boolean(activity.conversation),route:"chat"},
      {icon:"◆",title:"Fjordvik",sub:state.story?.sideQuests?.[todayKey()]?"готово":"миссия дня",done:Boolean(state.story?.sideQuests?.[todayKey()]),route:"storyside"}
    ];
    const prog=safePct(Object.keys(state.completed||{}).length,COURSE.length);
    shell(
      '<section class="home-v6">'+
        '<div class="welcome-v6">'+
          '<div><small>Сегодня · '+esc(state.level||"A1")+'</small><h1>Продолжай с того места, где остановился</h1></div>'+
          '<div class="streak-v6"><b>'+Number(state.streak||1)+'</b><span>дней</span></div>'+
        '</div>'+

        '<button class="continue-v6" onclick="navigate(\'lesson\',\''+escJs(next.id)+'\')">'+
          '<div class="continue-icon-v6">'+esc(next.icon||"▶")+'</div>'+
          '<div><small>Следующий урок</small><strong>'+esc(next.title)+'</strong><span>'+esc(next.grammar||"")+'</span></div>'+
          '<i>→</i>'+
        '</button>'+

        '<div class="today-strip-v6">'+today.map(x=>
          '<button class="today-card-v6 '+(x.done?"done":"")+'" onclick="navigate(\''+x.route+'\')">'+
            '<b>'+x.icon+'</b><span>'+x.title+'</span><small>'+x.sub+'</small>'+
          '</button>'
        ).join("")+'</div>'+

        '<section class="home-grid-v6">'+
          '<button class="feature-v6 story-feature-v6" onclick="navigate(\'story\')">'+
            '<div><small>Сюжетное обучение</small><strong>'+(story?esc(story.title):"Fjordvik")+'</strong><span>'+storyDone()+'/24 эпизодов</span></div><i>◆</i>'+
          '</button>'+
          '<button class="feature-v6 talk-feature-v6" onclick="navigate(\'chat\')">'+
            '<div><small>Практика речи</small><strong>Samtale</strong><span>Говори своими словами</span></div><i>◉</i>'+
          '</button>'+
        '</section>'+

        '<section class="compact-progress-v6">'+
          '<div class="progress-title-v6"><span>Курс</span><b>'+prog+'%</b></div>'+
          '<div class="progress mini"><i style="width:'+prog+'%"></i></div>'+
          '<div class="skill-row-v6">'+weak.map(([k,v])=>'<span><small>'+esc(SKILL_RU[k]||k)+'</small><b>'+Number(v||0)+'%</b></span>').join("")+'</div>'+
        '</section>'+

        '<div class="quick-v6">'+
          '<button onclick="navigate(\'dictation\')"><b>✎</b><span>Диктант</span></button>'+
          '<button onclick="navigate(\'pronunciation\')"><b>⌁</b><span>Звуки</span></button>'+
          '<button onclick="navigate(\'listeninglab\')"><b>◌</b><span>Слух</span></button>'+
          '<button onclick="navigate(\'tests\')"><b>✓</b><span>Тест</span></button>'+
        '</div>'+
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
      '<div class="chat-footer-v6"><button onclick="v6StartChat()">＋ Новый диалог</button><button onclick="v6ClearChat()">Очистить</button></div>',
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
      compactHeader("Все инструменты","Ещё")+
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

  navigate=window.navigate=function(view,data){
    currentRoute=view;stopTimer();
    if(view==="home")return renderHome();
    if(view==="course")return renderCourse(data||state.level);
    if(view==="chat")return renderChatV6();
    if(view==="hub")return renderHub();
    return baseNavigate(view,data);
  };

  window.renderChat=renderChatV6;
  Object.assign(window,{v6CourseTab,v6ToggleChatSetup,v6ChatPref,v6ToggleTranslation,v6SendChat,v6StartChat,v6ClearChat,renderHub});

  setTimeout(()=>{const open=new URLSearchParams(location.search).get("open");if(!open||open==="home")renderHome()},140);
})();