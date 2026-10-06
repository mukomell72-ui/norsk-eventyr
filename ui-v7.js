// Norsk Eventyr 7.0 — living Fjordvik interface
(() => {
  const baseNavigateV7=window.navigate;
  const baseStartChatV7=window.startChat;
  const baseSendChatV7=window.sendChat;
  let currentRouteV7="home",courseModeV7="route",chatBusyV7=false;

  const LEVELS_V7=Array.isArray(window.LEVELS)?window.LEVELS:["A1","A2","B1","B2"];
  const PLACE_NAMES=["Вокзал","Кафе","Магазин","Автобус","Работа","Kommune"];
  const PLACE_ICONS=["🚉","☕","🛍","🚌","💼","🏛"];
  const STEP_ICONS={teacher:"N",review:"↻",words:"📖",lesson:"🎓",story:"🎬",talk:"💬"};
  const CHAT_TOPICS=[["💼","jobb","работа"],["⌂","hjem","дом"],["☁","vær","погода"],["◉","fritid","досуг"]];

  function h(v){
    if(typeof window.esc==="function")return window.esc(String(v??""));
    return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }
  function js(v){
    if(typeof window.escJs==="function")return window.escJs(String(v??""));
    return String(v??"").replace(/\\/g,"\\\\").replace(/'/g,"\\'").replace(/\n/g," ");
  }
  function todayKeyV7(){return window.neLocalDate?window.neLocalDate():new Date().toISOString().slice(0,10)}
  function dueCountV7(){try{return window.neDueWords?window.neDueWords().length:0}catch{return 0}}
  function levelProgressV7(level){try{return typeof window.levelProgress==="function"?window.levelProgress(level):0}catch{return 0}}
  function coreLessonsV7(level){try{return typeof window.lessons==="function"?window.lessons(level):[]}catch{return []}}
  function completedCountV7(level){try{return typeof window.completed==="function"?window.completed(level):0}catch{return 0}}
  function dayActivityV7(){return state.elite?.activity?.[todayKeyV7()]||{}}
  function storyForLevelV7(){
    try{
      const seasons=Array.isArray(window.STORY_SEASONS)?window.STORY_SEASONS:STORY_SEASONS;
      const eps=Array.isArray(window.STORY_EPISODES)?window.STORY_EPISODES:STORY_EPISODES;
      const practiceLevel=LEVELS_V7.includes(state.story?.selectedLevel)?state.story.selectedLevel:state.level;
      const season=seasons.find(s=>s.level===practiceLevel)||seasons[0];
      const list=eps.filter(e=>e.season===season?.id);
      return {season,list,current:list.find(e=>!state.story?.completed?.[e.id])||list[0]||null,practiceLevel};
    }catch{return {season:null,list:[],current:null,practiceLevel:state.level}}
  }
  function nextLessonV7(){
    const core=coreLessonsV7(state.level);
    return core.find(x=>!state.completed?.[x.id])||core[0]||null;
  }
  function cloudOnV7(){return Boolean(localStorage.getItem("ne_cloud_link"))}

  function navGroupV7(active){
    let g=active||currentRouteV7;
    if(["lesson","topic"].includes(g))g="course";
    if(["storyepisode","storyjournal"].includes(g))g="story";
    if(["daily","dailypractice","review","storyside","plan","teacher"].includes(g))g="home";
    if(["tests","test","exam","examrun","exampart","progress","dictionary","dictation","grammarlab","pronunciation","listeninglab","settings","cloud","placement"].includes(g))g="hub";
    return g;
  }
  function iconV7(name){
    const paths={home:'M3 10l9-7 9 7v10H3z M9 20v-7h6v7',course:'M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3z M12 6v16',chat:'M21 11a9 9 0 0 1-9 9H4l-2 2v-11a9 9 0 0 1 19 0z M7 11h.01 M12 11h.01 M17 11h.01',story:'M2 5l6-2 8 3 6-2v16l-6 2-8-3-6 2z M8 3v16 M16 6v16',hub:'M5 12h.01 M12 12h.01 M19 12h.01',words:'M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3z M12 6v16',review:'M20 7a9 9 0 1 0 1 8 M20 2v5h-5',lesson:'M2 9l10-6 10 6-10 6z M5 11v6l7 4 7-4v-6',talk:'M21 11a9 9 0 0 1-9 9H4l-2 2v-11a9 9 0 0 1 19 0z',cafe:'M4 5h13v9a6 6 0 0 1-12 0V5 M17 7h3a3 3 0 0 1 0 6h-3 M2 21h19',shopping:'M4 8h16v13H4z M8 8V5a4 4 0 0 1 8 0v3',bus:'M5 3h14v15H5z M5 11h14 M8 18v3 M16 18v3 M8 15h.01 M16 15h.01',work:'M3 7h18v14H3z M8 7V3h8v4 M3 12h18 M10 12v3h4v-3',port:'M12 6v15 M9 3a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M5 12H2a10 10 0 0 0 20 0h-3 M7 10h10'};
    return '<svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+(paths[name]||paths.lesson)+'"/></svg>';
  }
  function navV7(active){
    const g=navGroupV7(active);
    const items=[
      ["home","⌂","Сегодня"],
      ["course","▤","Курс"],
      ["chat","◉","Разговор"],
      ["story","⌖","Fjordvik"],
      ["hub","•••","Ещё"]
    ];
    return '<nav class="dock-v7">'+items.map(([r,i,t])=>'<button class="'+(g===r?"active":"")+'" onclick="navigate(\''+r+'\')"><b>'+iconV7(r)+'</b><span>'+t+'</span></button>').join("")+'</nav>';
  }

  shell=window.shell=function(content,active="home"){
    window.neScreenRevision=(window.neScreenRevision||0)+1;
    const level=h(state.level||"A1"),streak=Number(state.streak||0);
    document.getElementById("app").innerHTML=
      '<div class="shell-v7">'+
        '<header class="topbar-v7">'+
          '<button class="brand-v7" onclick="navigate(\'home\')"><span>Norsk Eventyr</span><b>7.1</b></button>'+
          '<div class="status-v7"><button class="streak-v7" onclick="navigate(\'hub\')">🔥 <b>'+streak+'</b></button><button class="level-v7" onclick="navigate(\'course\')">'+level+'</button></div>'+
        '</header>'+
        '<main class="main-v7">'+content+helpMarkupV7()+'</main>'+
        navV7(currentRouteV7||active)+
      '</div>';
  };
  window.neAdvance=function(action,delay){
    const revision=window.neScreenRevision;
    return setTimeout(()=>{if(revision===window.neScreenRevision)action()},delay);
  };

  function helpMarkupV7(){
    return '<section class="card" style="margin:16px 0"><button class="btn secondary" onclick="v7OpenHelp()" aria-controls="helpPanelV7" aria-expanded="false" id="helpToggleV7">Мне непонятно</button>'+
      '<div id="helpPanelV7" hidden><p>Задай вопрос по-русски — о задании, норвежском или другой теме. Можно уточнять ответ. Твой ответ на задание сохранится.</p><textarea class="input" id="helpQuestionV7" maxlength="1800" rows="2" placeholder="Что ты хочешь спросить?"></textarea><div class="row" style="margin-top:10px"><button class="btn" id="helpSendV7" onclick="v7AskHelp()">Спросить Нору</button><button class="btn ghost" onclick="v7OpenHelp()">Закрыть</button></div><div id="helpReplyV7" role="status" aria-live="polite" style="white-space:pre-wrap;margin-top:12px"></div></div></section>';
  }
  function v7OpenHelp(){
    const panel=document.getElementById("helpPanelV7");if(!panel)return;
    panel.hidden=!panel.hidden;
    document.getElementById("helpToggleV7")?.setAttribute("aria-expanded",String(!panel.hidden));
    if(!panel.hidden)document.getElementById("helpQuestionV7")?.focus();
  }
  async function v7AskHelp(){
    const input=document.getElementById("helpQuestionV7"),button=document.getElementById("helpSendV7"),box=document.getElementById("helpReplyV7");
    const question=input?.value.trim();if(!question||!button||button.disabled)return;
    const main=document.querySelector(".main-v7"),copy=main.cloneNode(true);
    copy.querySelector("#helpPanelV7")?.parentElement.remove();
    const answer=Array.from(main.querySelectorAll("textarea,input")).filter(e=>e.id!=="helpQuestionV7").map(e=>e.value).filter(Boolean).join("\n");
    const context=(copy.textContent+"\nОтвет ученика: "+answer).slice(0,6000);
    const history=box._helpHistory||[];
    button.disabled=true;box.textContent="Нора объясняет…";
    try{
      const r=await neApiPost("/api/chat",{mode:"explain",message:question,context,level:state.level,history});
      if(!box.isConnected)return;
      const explanation=r.ok?String(r.data?.explanation_ru||r.data?.translation_ru||""):"";
      if(!explanation){box.textContent="Объяснение сейчас недоступно. Вопрос сохранён — попробуй ещё раз.";return;}
      box.textContent=explanation;
      box._helpHistory=[...history,{role:"user",text:question},{role:"assistant",text:explanation}].slice(-8);
      input.value="";
    }catch{if(box.isConnected)box.textContent="Не удалось получить объяснение. Попробуй ещё раз."}
    finally{button.disabled=false;}
  }
  Object.assign(window,{v7OpenHelp,v7AskHelp});

  function guidedV7(){
    const day=todayKeyV7(),wordDue=dueCountV7(),adaptiveDue=window.NEAdaptive?NEAdaptive.dueReviews(state).length:0,teacherDone=state.learningV8?.lastSessionDate===day,mission=window.NEAdaptive?NEAdaptive.nextMission(state):null;
    const reviewRequired=wordDue>0||adaptiveDue>0,reviewDone=!reviewRequired;
    const focus=mission?.module?.title||"Следующий шаг по слабому навыку";
    const steps=[
      {id:"teacher",title:"Главное занятие с Норой",sub:focus,mins:Math.max(10,Math.min(25,Number(state.elite?.dailyMinutes)||20)),done:teacherDone,route:"teacher"},
      ...(reviewRequired?[{id:"review",title:"Повторение по памяти",sub:adaptiveDue?adaptiveDue+" адаптивных проверки":wordDue+" слов по интервалу",mins:5,done:reviewDone,route:adaptiveDue?"teacher":"review"}]:[])
    ];
    const next=steps.find(x=>!x.done)||{title:"Дополнительная практика",sub:"Обязательная часть готова",mins:0,route:"hub"};
    return {day,due:wordDue+adaptiveDue,story:storyForLevelV7().current,lesson:nextLessonV7(),steps,next,done:steps.filter(x=>x.done).length,total:steps.length,mins:steps.filter(x=>!x.done).reduce((a,x)=>a+x.mins,0)};
  }
  function v7ContinueToday(){const x=guidedV7().next;navigate(x.route,x.data)}
  function v7Step(i){const x=guidedV7().steps[i];if(x)navigate(x.route,x.data)}

  function dailyWordsV7(){
    const list=Object.values(state.dailyDictionary||{}).sort((a,b)=>String(b.lastSeen||"").localeCompare(String(a.lastSeen||""))).slice(0,5);
    const fallback=[
      {lemma:"jobb",translation_ru:"работа"},{lemma:"avtale",translation_ru:"встреча"},
      {lemma:"komme",translation_ru:"приходить"},{lemma:"senere",translation_ru:"позже"},{lemma:"vente",translation_ru:"ждать"}
    ];
    return [...list,...fallback].slice(0,5);
  }

  function renderHomeV7(){
    currentRouteV7="home";
    const j=guidedV7(),story=j.story,words=dailyWordsV7(),district=story?.district||"Fjordvik";
    const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Oslo',hour:'numeric',hourCycle:'h23'}).format(new Date())),daypart=hour<6?'ночь':hour<12?'утро':hour<18?'день':'вечер';
    const route=j.steps.map((x,i)=>
      '<button class="route-step-v7 '+(x.done?"done":"")+'" onclick="v7Step('+i+')">'+
        '<span class="route-icon-v7">'+(x.done?"✓":iconV7(x.id))+'</span>'+
        '<div><b>'+h(x.title)+'</b><small>'+h(x.sub)+'</small></div><em>'+x.mins+' мин</em>'+
      '</button>'
    ).join("");
    shell(
      '<section class="home-v7">'+
        '<section class="hero-v7">'+
          '<div class="hero-overlay-v7"></div><div class="nora-cutout-v7" aria-hidden="true"></div>'+
          '<div class="hero-copy-v7"><small>'+h(district)+' · '+daypart+'</small><h1>Hei!</h1><p>Сегодня в Fjordvik. Нора ждёт тебя — продолжим разговор и изучим что-то полезное.</p>'+
          '<button class="cta-v7" onclick="v7ContinueToday()">Продолжить день <b>→</b></button></div>'+
          '<div class="hero-note-v7">Små steg<br>store eventyr ♡</div>'+
        '</section>'+
        '<section class="route-card-v7"><div class="section-head-v7"><div><small>Твой маршрут на сегодня</small><h2>'+(j.mins?"Ещё примерно "+j.mins+" минут":"Маршрут завершён")+'</h2></div><span>◷ '+(j.mins||0)+' мин</span></div><div class="route-steps-v7">'+route+'</div></section>'+
        '<section class="words-card-v7"><div class="section-head-v7"><div><h2>Домашнее задание</h2><p>Изучи слова и используй их в своих ответах.</p></div><button onclick="navigate(\'daily\')">Открыть →</button></div></section>'+
        '<section class="nora-note-v7"><span class="nora-avatar-v7"></span><div><small>Nora</small><p>«Сегодня продолжим без спешки. Говори своими словами — я помогу.»</p></div><button onclick="navigate(\'chat\')">Написать →</button></section>'+
      '</section>',
    "home");
  }

  function renderCourseV7(level=courseLevel){
    currentRouteV7="course";
    const courseLevel=level&&LEVELS_V7.includes(level)?level:courseLevel;
    if(window.NEAdaptive)NEAdaptive.ensure(state);
    const modules=window.NECurriculum?.modules(courseLevel)||[],gate=window.NEAdaptive?NEAdaptive.levelGate(state,courseLevel):null;
    if(!modules.length)return baseNavigateV7("course",courseLevel);
    const masteryOf=m=>window.NEAdaptive?NEAdaptive.moduleMastery(state,m.id):0,done=modules.filter(m=>masteryOf(m)>=78).length,next=modules.find(m=>masteryOf(m)<78)||modules.at(-1),routeProgress=Math.round(done/modules.length*100),profile=gate?.avg||0;
    const nodePos=[[27,86],[66,77],[30,67],[68,57],[30,47],[67,37],[31,27],[65,17]];
    const nodes=modules.map((m,i)=>{
      const mastery=masteryOf(m),isDone=mastery>=78,isNext=next?.id===m.id,p=nodePos[i]||[50,50],locked=!isDone&&!isNext;
      return '<button class="map-node-v7 '+(isDone?"done ":"")+(isNext?"current ":"")+(locked?"locked":"")+'" style="left:'+p[0]+'%;top:'+p[1]+'%" onclick="teacherStartModule(\''+js(m.id)+'\')"><span>'+(isDone?"✓":i+1)+'</span><div><b>'+h(m.title)+'</b><small>'+h(isDone?"Освоено":isNext?"Текущий модуль":"После предыдущего")+'</small></div><em>'+mastery+'%</em></button>';
    }).join("");
    const list=modules.map((m,i)=>{
      const mastery=masteryOf(m),isDone=mastery>=78,isNext=next?.id===m.id,locked=!isDone&&!isNext;
      return '<button class="near-lesson-v7 '+(isDone?"done ":"")+(locked?"locked":"")+'" onclick="teacherStartModule(\''+js(m.id)+'\')"><span>'+(isDone?"✓":i+1)+'</span><div><b>'+h(m.title)+'</b><small>'+h(m.canDo?.[0]||"Практическая цель")+'</small></div><em>'+mastery+'%</em></button>';
    }).join("");
    const legacy=coreLessonsV7(courseLevel),topics=(typeof TOPIC_CATALOG!=="undefined"?TOPIC_CATALOG:[]).filter(x=>x.level===courseLevel).slice(0,8);
    shell(
      '<section class="course-v7">'+
        '<section class="course-hero-v7"><div class="course-copy-v7"><small>Адаптивный путь Bokmål · A1–B2</small><h1>Курс '+h(courseLevel)+'</h1><p>Каждый модуль закрывается только после доказательств по навыкам, а не после просмотра урока.</p></div><div class="level-tabs-v7">'+LEVELS_V7.map(l=>'<button class="'+(l===courseLevel?"active":"")+'" onclick="renderCourse(\''+l+'\')">'+l+'</button>').join("")+'</div>'+
        '<div class="progress-card-v7"><div><b>'+h(courseLevel)+'</b><small>'+done+' из '+modules.length+' модулей освоено</small></div><i><em style="width:'+routeProgress+'%"></em></i><strong>'+routeProgress+'%</strong></div>'+
        '<div class="notice" style="margin-top:12px"><b>Профиль навыков: '+profile+'%</b> · '+(gate?.pass?"уровень подтверждён внутренними критериями":"уровень ещё не подтверждён")+'. Маршрут и профиль — разные показатели.</div></section>'+
        '<section class="course-map-v7"><div class="map-shade-v7"></div><div class="map-title-v7"><small>32-модульный маршрут</small><b>'+h(courseLevel)+' · '+h(next?.title||"Повторение")+'</b></div>'+nodes+
          (next?'<button class="map-continue-v7" onclick="teacherStartModule(\''+js(next.id)+'\')">Продолжить с Норой →</button>':'')+
        '</section>'+
        '<section class="course-side-v7"><div class="nora-guide-v7"><span class="nora-avatar-v7"></span><div><small>Nora · преподаватель</small><b>'+(next?"Следующая цель: "+h(next.canDo?.[0]||next.title):"Повторение уровня")+'</b><p>Я меняю нагрузку по твоим ответам и возвращаю слабые места через интервалы.</p></div></div>'+
        '<div class="section-head-v7"><div><small>Основной маршрут</small><h2>8 модулей '+h(courseLevel)+'</h2></div></div><div class="near-list-v7">'+list+'</div>'+
        '<details class="ai-topics-v7"><summary>Дополнительная практика — не влияет сама по себе на прохождение уровня</summary><div>'+
          legacy.map(x=>'<button onclick="navigate(\'lesson\',\''+js(x.id)+'\')"><b>'+h(x.title)+'</b><small>'+h(x.grammar||"Закрепление")+'</small></button>').join("")+
          topics.map(t=>'<button onclick="navigate(\'topic\',\''+js(t.id)+'\')"><b>'+h(t.title)+'</b><small>'+h(t.goal||"")+'</small></button>').join("")+
        '</div></details>'+
        '</section>'+
      '</section>',
    "course");
  }

  function v7ChatMessages(){
    const hist=state.chatHistory||[];
    if(!hist.length)return '<div class="chat-welcome-v7"><span class="nora-avatar-v7 large"></span><div><small>Nora · norsk samtalepartner</small><h2>Hei! Hvordan har du det i dag?</h2><p>Начни с короткой фразы. Я продолжу разговор.</p><button class="cta-v7 small" onclick="v7StartChat()">Начать разговор →</button></div></div>';
    return hist.map((m,i)=>{
      if(m.role==="user")return '<div class="chat-row-v7 user"><div class="bubble-v7 user">'+h(m.text)+'</div></div>';
      const meta=m.meta||{};
      return '<div class="chat-row-v7 nora"><span class="nora-avatar-v7 mini"></span><div><small class="speaker-v7">Nora</small><div class="bubble-v7 nora">'+h(m.text)+'</div>'+
        '<div class="support-v7"><button onclick="speakText(\''+js(m.text)+'\')">🔊 Слушать</button>'+(meta.translation_ru?'<button onclick="v7Toggle(\'tr'+i+'\')">文 Перевод</button>':'')+'<button onclick="v7Toggle(\'hint'+i+'\')">💡 Подсказка</button></div>'+
        (meta.translation_ru?'<div id="tr'+i+'" class="helper-v7" hidden>'+h(meta.translation_ru)+'</div>':'')+
        '<div id="hint'+i+'" class="helper-v7" hidden>'+(meta.corrected?'<b>Лучше:</b> '+h(meta.corrected):'Ответь своими словами. Для A1 достаточно одного короткого предложения.')+'</div>'+
      '</div></div>';
    }).join("");
  }
  function v7Toggle(id){const e=document.getElementById(id);if(e)e.hidden=!e.hidden}
  function v7ChatSettings(){document.getElementById("chatSettingsV7")?.classList.toggle("open")}
  function v7ChatPref(k,v){state.chatPrefs=state.chatPrefs||{};state.chatPrefs[k]=v;saveState();renderChatV7()}
  const PLACES_V7=[
    {id:'cafe',title:'Кафе',icon:'☕',description:'Заказ · меню · разговор за кофе',scene:'Кафе в Fjordvik. Nora работает за стойкой. Помоги заказать напиток и еду, уточнить размер, цену, оплату и место за столом. Затем естественно продолжай разговор о вкусах и планах ученика.'},
    {id:'home',title:'Дом Nora',icon:'⌂',description:'В гостях · дом · повседневная жизнь',scene:'Ученик в гостях у Nora дома. Nora — хозяйка и знакомая. Обсуждайте комнаты, семью, еду, привычки и планы; реагируй на детали ответа и развивай дружескую беседу.'},
    {id:'shopping',title:'Торговая улица',icon:'▣',description:'Покупки · размер · цена · возврат',scene:'Магазин на торговой улице Fjordvik. Nora — продавец. Выясни, что ученик ищет, затем уточняй размер, цвет, наличие, цену и оплату; предложи подходящую альтернативу или обсуди возврат, когда это уместно.'},
    {id:'bus',title:'Автобус',icon:'🚌',description:'Маршрут · билет · остановки',scene:'Автобус в Fjordvik. Nora — водитель. Уточни, куда ученик едет, помоги выбрать билет, объясни остановку и пересадку; продолжай ситуацию уточнениями времени и маршрута.'},
    {id:'work',title:'Работа',icon:'💼',description:'Коллеги · задачи · рабочий день',scene:'Первый рабочий день в Fjordvik. Nora — коллега. Обсуждайте конкретные рабочие задачи, график, инструменты, перерыв и помощь. Давай по одной естественной реплике и уточняй понимание ученика.'},
    {id:'port',title:'Порт',icon:'⚓',description:'Путешествия · паром · планы',scene:'Порт Fjordvik. Nora — сотрудница у паромного причала. Обсуждайте направление поездки, отправление парома, билеты, багаж, погоду и планы путешествия.'}
  ];
  function selectConversationV7(id,title,topic,scene='',practiceLevel=''){
    if(chatBusyV7)return;
    state.chatThreads=state.chatThreads||{};
    state.chatThreads[state.chatThreadId||'general']=state.chatHistory||[];
    state.chatThreadId=id;state.chatHistory=state.chatThreads[id]||[];
    const level=LEVELS_V7.includes(practiceLevel)?practiceLevel:(LEVELS_V7.includes(state.chatPrefs?.level)?state.chatPrefs.level:state.level);
    state.chatPrefs={...state.chatPrefs,level,topic,mode:scene?'roleplay':'free',sceneContext:scene,conversationTitle:title};
    saveState();navigate('chat');if(!state.chatHistory.length)v7StartChat();
  }
  function v7OpenPlace(id){const place=PLACES_V7.find(x=>x.id===id);if(place)selectConversationV7('place:'+id,place.title,place.description,place.scene,state.story?.selectedLevel||state.level)}
  function v7UseTopic(word){const topic=CHAT_TOPICS.find(x=>x[1]===word);selectConversationV7('topic:'+word,topic?.[2]||word,topic?.[2]||word,'',state.chatPrefs?.level||state.level)}

  function v7ChatKey(e){
    if(e?.key==="Enter"&&!e.shiftKey){
      e.preventDefault();
      if(String(document.getElementById("chatInput")?.value||"").trim())v7SendChat();
    }
  }
  async function v7SendChat(){
    if(chatBusyV7||!baseSendChatV7||!document.getElementById("chatInput")?.value.trim())return;
    chatBusyV7=true;
    try{const request=baseSendChatV7();renderChatV7();await request}finally{chatBusyV7=false;if(currentRouteV7==="chat")renderChatV7()}
  }
  async function v7StartChat(){
    if(chatBusyV7||!baseStartChatV7)return;
    chatBusyV7=true;
    try{const request=baseStartChatV7();renderChatV7();await request}finally{chatBusyV7=false;if(currentRouteV7==="chat")renderChatV7()}
  }
  function v7ClearChat(){if(chatBusyV7)return;if((state.chatHistory||[]).length&&!confirm("Очистить этот разговор?"))return;state.chatHistory=[];if(state.chatMemories)delete state.chatMemories[state.chatThreadId||"general"];saveState();renderChatV7()}

  function renderChatV7(){
    currentRouteV7="chat";
    const p=state.chatPrefs||{level:state.level||"A1",mode:"free",topic:"",scenario:"butikk",autoSpeak:true};
    shell(
      '<section class="chat-v7">'+
        '<section class="chat-scene-v7"><div class="chat-scene-photo-v7"></div><div class="chat-scene-shade-v7"></div><div class="chat-title-v7"><small>Nora · норвежский собеседник</small><h1>'+h(p.conversationTitle||"Разговор")+'</h1><p>'+h(p.sceneContext?p.topic:"Продолжай беседу своими словами — Нора помнит предыдущие ответы.")+'</p></div><button class="chat-settings-btn-v7" onclick="v7ChatSettings()">⚙</button></section>'+
        '<section id="chatSettingsV7" class="chat-settings-v7"><select onchange="v7ChatPref(\'level\',this.value)">'+LEVELS_V7.map(l=>'<option '+(p.level===l?"selected":"")+'>'+l+'</option>').join("")+'</select><select onchange="v7ChatPref(\'mode\',this.value)"><option value="free" '+(p.mode==="free"?"selected":"")+'>Свободно</option><option value="corrections" '+(p.mode==="corrections"?"selected":"")+'>Исправлять</option><option value="exam" '+(p.mode==="exam"?"selected":"")+'>Устная практика</option><option value="roleplay" '+(p.mode==="roleplay"?"selected":"")+'>Ролевая сцена</option></select><button onclick="v7ClearChat()">Очистить</button></section>'+
        '<section class="chat-body-v7"><div id="chatMessages" class="chat-messages-v7">'+v7ChatMessages()+'</div>'+
          '<div class="topic-strip-v7">'+CHAT_TOPICS.map(x=>'<button onclick="v7UseTopic(\''+x[1]+'\')"><span>'+x[0]+'</span><b>'+x[1]+'</b><small>'+x[2]+'</small></button>').join("")+'</div>'+
          '<div class="composer-v7"><button id="chatMicBtn" class="mic-v7" onclick="toggleMic(\'chatInput\')" aria-label="Говорить">🎤</button><textarea id="chatInput" rows="1" placeholder="Ответь Норе по-норвежски…" onkeydown="v7ChatKey(event)"></textarea><button class="send-v7" onclick="v7SendChat()" aria-label="Отправить">➤</button></div>'+
        '</section>'+
      '</section>',
    "chat");
    setTimeout(()=>{const b=document.getElementById("chatMessages");if(b)b.scrollTop=b.scrollHeight},0);
    if(chatBusyV7){
      document.querySelectorAll(".send-v7,.mic-v7,.chat-settings-v7 button,.chat-settings-v7 select").forEach(e=>e.disabled=true);
      document.getElementById("chatInput")?.setAttribute("disabled","");
      const b=document.getElementById("chatMessages");
      if(b&&!b.querySelector(".chat-thinking"))b.insertAdjacentHTML("beforeend",'<div class="chat-thinking" role="status">Нора готовит ответ…</div>');
    }
  }

  function renderStoryV7(seasonId=""){
    currentRouteV7="story";state.story=state.story||{};
    try{
      if(seasonId){
        const seasons=Array.isArray(window.STORY_SEASONS)?window.STORY_SEASONS:STORY_SEASONS;
        const picked=seasons.find(x=>x.id===seasonId);
        if(picked?.level){state.story.selectedLevel=picked.level;saveState()}
      }else if(!LEVELS_V7.includes(state.story.selectedLevel)){state.story.selectedLevel=state.level;saveState()}
    }catch{}
    const {season,list,current,practiceLevel}=storyForLevelV7(),nodes=PLACES_V7,pos=[[27,80],[64,26],[65,67],[29,54],[64,41],[28,93]];
    const labels=PLACES_V7.map(x=>x.title);
    const icons=PLACES_V7.map(x=>x.icon);
    shell(
      '<section class="fjord-v7">'+
        '<section class="fjord-map-v7"><div class="fjord-shade-v7"></div><div class="fjord-title-v7"><small>'+h(season?.title||practiceLevel)+'</small><h1>Fjordvik</h1><p>Живой норвежский город. Выбирай место и говори в реальной ситуации.</p></div>'+
        nodes.map((e,i)=>'<button class="fjord-pin-v7 '+(state.story?.completed?.[e.id]?"done":"")+'" style="left:'+pos[i][0]+'%;top:'+pos[i][1]+'%" onclick="v7OpenPlace(\''+js(e.id)+'\')"><span>'+iconV7(e.id)+'</span><b>'+labels[i]+'</b></button>').join("")+
        '</section>'+
        '<section class="scene-day-v7"><div><small>🎬 Сцена дня · ~14 минут</small><h2>'+h(current?.title||"Встреча в Fjordvik")+'</h2><p>'+h(current?.hook||"Небольшая история, новые слова и живой разговор.")+'</p><button class="cta-v7 small" onclick="'+(current?("navigate(\'storyepisode\',\'"+js(current.id)+"\')"):"navigate(\'storyside\')")+'">Войти в сцену →</button></div><span class="nora-scene-v7"></span></section>'+
        '<section class="places-v7"><div class="section-head-v7"><div><small>⌖ Исследуй Fjordvik</small><h2>Открыто сегодня</h2></div><button onclick="navigate(\'storyjournal\')">Дневник →</button></div><div class="place-cards-v7">'+PLACES_V7.map(x=>'<button onclick="v7OpenPlace(\''+js(x.id)+'\')"><span>'+x.icon+'</span><b>'+h(x.title)+'</b><small>'+h(x.description)+'</small><em>›</em></button>').join("")+'</div></section>'+
        '<section class="nora-note-v7"><span class="nora-avatar-v7"></span><div><small>Nora</small><p>«Выбери место, и я помогу тебе говорить по-норвежски в реальной ситуации.»</p></div><button onclick="navigate(\'storyside\')">Миссия →</button></section>'+
      '</section>',
    "story");
  }

  function hubTileV7(icon,title,sub,route,badge=""){
    return '<button class="tool-v7" onclick="navigate(\''+route+'\')"><span>'+icon+'</span><div><b>'+title+'</b><small>'+sub+'</small></div>'+(badge?'<em>'+badge+'</em>':'')+'</button>';
  }
  function renderHubV7(){
    currentRouteV7="hub";
    const routeProgress=levelProgressV7(state.level),gate=window.NEAdaptive?NEAdaptive.levelGate(state,state.level):null,mastery=gate?gate.avg:routeProgress,dict=Object.keys(state.dailyDictionary||{}).length,due=dueCountV7();
    shell(
      '<section class="hub-v7">'+
        '<section class="hub-hero-v7"><div class="hub-shade-v7"></div><div><small>Твой путь · твои результаты</small><h1>Прогресс<br>и экзамен</h1><p>Всё важное без лишних экранов.</p></div></section>'+
        '<section class="stats-v7"><article><small>Профиль '+h(state.level)+'</small><b>'+(gate?.pass?'Подтверждён':'В работе')+'</b><i><em style="width:'+mastery+'%"></em></i><span>'+mastery+'%</span></article><article><small>Серия занятий</small><b>'+Number(state.streak||0)+' дней</b></article><article><small>Слова в словаре</small><b>'+dict+'</b></article><article><small>Маршрут курса</small><b>'+routeProgress+'%</b></article></section>'+
        '<section class="exam-v7"><div class="exam-bg-v7"></div><div class="exam-copy-v7"><small>Подготовка к Norskprøven</small><h2>Пробный экзамен</h2><p>Четыре навыка в одном маршруте.</p><div class="exam-parts-v7"><span>▤ Чтение</span><span>◉ Аудирование</span><span>✎ Письмо</span><span>◌ Говорение</span></div><button class="cta-v7 small" onclick="navigate(\'exam\')">Начать экзамен →</button></div></section>'+
        '<section class="tools-grid-v7">'+
          hubTileV7("N","Нора","Адаптивный преподаватель","teacher")+
          hubTileV7("↻","Повторение","Интервалы и закрепление","review",due?String(due):"✓")+
          hubTileV7("▤","Выученные слова","Поиск · повтор · задания","learnedwords")+
          hubTileV7("✎","Домашнее задание","Изучение и практика","daily")+
          hubTileV7("✓","Тесты","Проверка уровня","tests")+
          hubTileV7("◉","Listening Lab","Живая норвежская речь","listeninglab")+
          hubTileV7("⌁","Произношение","Звуки и ритм","pronunciation")+
          hubTileV7("Aa","Грамматика","Слабые места","grammarlab")+
          hubTileV7("✎","Диктант","Слух + письмо","dictation")+
          hubTileV7("↗","Прогресс","Навыки и результаты","progress")+
          hubTileV7("◆","Дневник Fjordvik","История решений","storyjournal")+
          hubTileV7("☁","Облако",cloudOnV7()?"Подключено":"Синхронизация","cloud")+
          hubTileV7("⚙","Профиль и настройки","Цель · звук · сохранение","settings")+
        '</section>'+
      '</section>',
    "hub");
  }

  function routeTopV7(){
    try{window.scrollTo({top:0,left:0,behavior:"instant"})}catch{try{window.scrollTo(0,0)}catch{}}
  }
  navigate=window.navigate=function(view,data){
    const target=view==="more"?"hub":view;
    currentRouteV7=target||"home";
    try{
      let r;
      if(target==="home")r=renderHomeV7();
      else if(target==="course")r=renderCourseV7(data||state.level);
      else if(target==="chat")r=renderChatV7();
      else if(target==="story")r=renderStoryV7(data);
      else if(target==="hub")r=renderHubV7();
      else if(target==="learnedwords")r=window.renderLearnedWords();
      else r=baseNavigateV7(target,data);
      routeTopV7();
      if(r&&typeof r.then==="function")return r.then(x=>{routeTopV7();return x});
      return r;
    }catch(e){
      console.error("V7 route failed",target,e);
      return baseNavigateV7("hub");
    }
  };

  window.renderHome=renderHomeV7;
  window.renderCourse=renderCourseV7;
  window.renderChat=renderChatV7;
  window.renderHub=renderHubV7;
  window.renderStoryWorld=renderStoryV7;
  Object.assign(window,{v7ContinueToday,v7Step,v7Toggle,v7ChatSettings,v7ChatPref,v7UseTopic,v7ChatKey,v7SendChat,v7StartChat,v7ClearChat,v7OpenPlace,renderStoryV7});
  // Translate the selected word in its sentence without replacing the learner's answer.
  const wordTranslationsV7=new Map();
  function decorateWordsV7(){
    document.querySelectorAll('.prompt,.bubble-v7.nora,.daily-example b,.reinforcement-row b,.reinforcement-list b').forEach(container=>{
      const sentence=container.textContent;
      const walker=document.createTreeWalker(container,NodeFilter.SHOW_TEXT),nodes=[];
      while(walker.nextNode()){
        const node=walker.currentNode;
        if(!node.parentElement.closest('button,a,textarea,input,select,.word-translate-v7'))nodes.push(node);
      }
      for(const node of nodes){
        const parts=node.textContent.split(/([A-Za-zÆØÅæøå]+(?:[-’'][A-Za-zÆØÅæøå]+)*)/g);
        if(parts.length===1)continue;
        const fragment=document.createDocumentFragment();
        parts.forEach((part,i)=>{
          if(i%2){const button=document.createElement('button');button.type='button';button.className='word-translate-v7';button.textContent=part;button.setAttribute('aria-label','Перевести слово '+part);button.addEventListener('click',()=>translateWordV7(part,sentence));fragment.append(button)}
          else fragment.append(document.createTextNode(part));
        });node.replaceWith(fragment);
      }
    });
  }
  async function translateWordV7(word,sentence){
    document.getElementById('wordTranslationV7')?.remove();
    const panel=document.createElement('dialog');panel.id='wordTranslationV7';panel.className='word-translation-panel-v7';
    panel.innerHTML='<button class="btn ghost" aria-label="Закрыть перевод">Закрыть ×</button><h2>'+h(word)+'</h2><p class="word-translation-result-v7" aria-live="polite">Перевожу…</p><button class="btn secondary word-listen-v7">🔊 Произношение</button>';
    panel.querySelector('button').onclick=()=>panel.remove();panel.querySelector('.word-listen-v7').onclick=()=>speakText(word);
    panel.addEventListener('cancel',event=>{event.preventDefault();panel.remove()});
    panel.addEventListener('click',event=>{if(event.target===panel){const rect=panel.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)panel.remove()}});
    document.body.append(panel);panel.showModal();
    const key=word.toLocaleLowerCase('nb')+'|'+sentence,result=panel.querySelector('.word-translation-result-v7');
    if(wordTranslationsV7.has(key)){result.textContent=wordTranslationsV7.get(key);return}
    try{
      const response=await neApiPost('/api/chat',{mode:'explain',level:state.level,message:'Переведи только слово «'+word+'» с норвежского на русский в предложении ниже. Кратко: перевод, исходная форма, если отличается. Если это часть устойчивого выражения, поясни его смысл. Не отвечай на задание.',context:sentence.slice(0,1500)});
      if(!response.ok)throw new Error('TRANSLATION_FAILED');
      const translation=response.data.explanation_ru||response.data.translation_ru;
      if(!translation)throw new Error('EMPTY_TRANSLATION');
      wordTranslationsV7.set(key,translation);if(panel.isConnected)result.textContent=translation;
    }catch{if(panel.isConnected)result.textContent='Не удалось получить перевод. Закрой окно и нажми слово ещё раз.'}
  }
  let wordDecorationPendingV7=false;
  new MutationObserver(()=>{
    if(wordDecorationPendingV7)return;wordDecorationPendingV7=true;
    queueMicrotask(()=>{wordDecorationPendingV7=false;decorateWordsV7()});
  }).observe(document.getElementById('app'),{childList:true,subtree:true});
  Object.assign(window,{translateWordV7});
  window.neChatVisible=()=>currentRouteV7==="chat";

  setTimeout(()=>{
    const open=new URLSearchParams(location.search).get("open");
    if(!open||open==="home")renderHomeV7();
    else navigate(open);
  },220);
})();
