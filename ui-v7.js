// Norsk Eventyr 7.0 — living Fjordvik interface
(() => {
  const baseNavigateV7=window.navigate;
  const baseStartChatV7=window.startChat;
  const baseSendChatV7=window.sendChat;
  let currentRouteV7="home",courseModeV7="route",chatBusyV7=false;

  const LEVELS_V7=Array.isArray(window.LEVELS)?window.LEVELS:["A1","A2","B1","B2"];
  const PLACE_NAMES=["Вокзал","Кафе","Магазин","Автобус","Работа","Kommune"];
  const PLACE_ICONS=["🚉","☕","🛍","🚌","💼","🏛"];
  const STEP_ICONS={words:"📖",review:"↻",lesson:"🎓",story:"🎬",talk:"💬"};
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
      const season=seasons.find(s=>s.level===state.level)||seasons[0];
      const list=eps.filter(e=>e.season===season?.id);
      return {season,list,current:list.find(e=>!state.story?.completed?.[e.id])||list[0]||null};
    }catch{return {season:null,list:[],current:null}}
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
    if(["daily","dailypractice","review","storyside","plan"].includes(g))g="home";
    if(["tests","test","exam","examrun","exampart","progress","dictionary","dictation","grammarlab","pronunciation","listeninglab","settings","cloud","placement"].includes(g))g="hub";
    return g;
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
    return '<nav class="dock-v7">'+items.map(([r,i,t])=>'<button class="'+(g===r?"active":"")+'" onclick="navigate(\''+r+'\')"><b>'+i+'</b><span>'+t+'</span></button>').join("")+'</nav>';
  }

  shell=window.shell=function(content,active="home"){
    const level=h(state.level||"A1"),streak=Number(state.streak||0);
    document.getElementById("app").innerHTML=
      '<div class="shell-v7">'+
        '<header class="topbar-v7">'+
          '<button class="brand-v7" onclick="navigate(\'home\')"><span>Norsk Eventyr</span><b>7.0</b></button>'+
          '<div class="status-v7"><button class="streak-v7" onclick="navigate(\'hub\')">🔥 <b>'+streak+'</b></button><button class="level-v7" onclick="navigate(\'course\')">'+level+'</button></div>'+
        '</header>'+
        '<main class="main-v7">'+content+helpMarkupV7()+'</main>'+
        navV7(currentRouteV7||active)+
      '</div>';
  };

  function helpMarkupV7(){
    return '<section class="card" style="margin:16px 0"><button class="btn secondary" onclick="v7OpenHelp()" aria-controls="helpPanelV7" aria-expanded="false" id="helpToggleV7">Мне непонятно</button>'+
      '<div id="helpPanelV7" hidden><p>Спроси Нору по-русски. Она увидит текущее задание. Ответ на задание сохранится.</p><textarea class="input" id="helpQuestionV7" maxlength="1800" rows="2" placeholder="Как понять эту фразу? Почему здесь такой порядок слов?"></textarea><div class="row" style="margin-top:10px"><button class="btn" id="helpSendV7" onclick="v7AskHelp()">Спросить Нору</button><button class="btn ghost" onclick="v7OpenHelp()">Закрыть</button></div><div id="helpReplyV7" role="status" aria-live="polite" style="white-space:pre-wrap;margin-top:12px"></div></div></section>';
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
    state.guidedJourney=state.guidedJourney||{lessonDates:{},reviewDates:{}};
    state.guidedJourney.lessonDates=state.guidedJourney.lessonDates||{};
    state.guidedJourney.reviewDates=state.guidedJourney.reviewDates||{};
    const day=todayKeyV7(),due=dueCountV7(),activity=dayActivityV7(),story=storyForLevelV7().current,lesson=nextLessonV7();
    const dailyDone=Boolean(state.dailyProgress?.[day]?.completed);
    const lessonDone=Boolean(state.guidedJourney.lessonDates[day]);
    const storyDone=Boolean(state.story?.sideQuests?.[day]);
    const talkDone=Boolean(activity.conversation);
    const reviewRequired=due>0||Boolean(state.guidedJourney.reviewDates[day]);
    const reviewDone=reviewRequired?Boolean(state.guidedJourney.reviewDates[day])&&due===0:true;
    const steps=[
      {id:"words",title:"5 слов",sub:"Новые слова",mins:5,done:dailyDone,route:"daily"},
      ...(reviewRequired?[{id:"review",title:"Повторение",sub:due?due+" слов ждут":"Закрепляем",mins:3,done:reviewDone,route:"review"}]:[]),
      {id:"lesson",title:"Урок",sub:lesson?.title||"В контексте",mins:7,done:lessonDone,route:lesson?"lesson":"course",data:lesson?.id||state.level},
      {id:"story",title:"Сцена",sub:"В Fjordvik",mins:4,done:storyDone,route:"storyside"},
      {id:"talk",title:"Разговор",sub:"С Nora",mins:3,done:talkDone,route:"chat"}
    ];
    const next=steps.find(x=>!x.done)||{title:"Исследовать Fjordvik",sub:"Сегодня всё готово",mins:0,route:"story"};
    return {day,due,story,lesson,steps,next,done:steps.filter(x=>x.done).length,total:steps.length,mins:steps.filter(x=>!x.done).reduce((a,x)=>a+x.mins,0)};
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
    const route=j.steps.map((x,i)=>
      '<button class="route-step-v7 '+(x.done?"done":"")+'" onclick="v7Step('+i+')">'+
        '<span class="route-icon-v7">'+(x.done?"✓":STEP_ICONS[x.id]||"•")+'</span>'+
        '<b>'+h(x.title)+'</b><small>'+h(x.sub)+'</small>'+
      '</button>'
    ).join("");
    shell(
      '<section class="home-v7">'+
        '<section class="hero-v7">'+
          '<div class="hero-overlay-v7"></div><div class="nora-cutout-v7" aria-hidden="true"></div>'+
          '<div class="hero-copy-v7"><small>'+h(district)+' · утро</small><h1>Сегодня</h1><p>Небольшой шаг сегодня приближает тебя к большой истории в Норвегии.</p>'+
          '<button class="cta-v7" onclick="v7ContinueToday()">Продолжить день <b>→</b></button></div>'+
          '<div class="hero-note-v7">Små steg<br>store eventyr ♡</div>'+
        '</section>'+
        '<section class="route-card-v7"><div class="section-head-v7"><div><small>Твой маршрут на сегодня</small><h2>'+(j.mins?"Ещё примерно "+j.mins+" минут":"Маршрут завершён")+'</h2></div><span>◷ '+(j.mins||0)+' мин</span></div><div class="route-steps-v7">'+route+'</div></section>'+
        '<section class="words-card-v7"><div class="section-head-v7"><div><small>⭐ Слова дня</small><h2>5 слов для сегодняшней истории</h2></div><button onclick="navigate(\'daily\')">Все →</button></div>'+
          '<div class="word-strip-v7">'+words.map((w,i)=>'<button class="word-v7 w'+i+'" onclick="speakText(\''+js(w.lemma||w.word||"")+'\')"><span class="word-art-v7">'+["☕","✎","⛰","☀","⌛"][i]+'</span><b>'+h(w.lemma||w.word||"")+'</b><small>'+h(w.translation_ru||w.translation||"")+'</small><em>🔊</em></button>').join("")+'</div>'+
        '</section>'+
        '<section class="nora-note-v7"><span class="nora-avatar-v7"></span><div><small>Nora</small><p>«Сегодня продолжим без спешки. Говори своими словами — я помогу.»</p></div><button onclick="navigate(\'chat\')">Написать →</button></section>'+
      '</section>',
    "home");
  }

  function renderCourseV7(level=state.level){
    currentRouteV7="course";
    if(level&&LEVELS_V7.includes(level))state.level=level;
    saveState();
    const core=coreLessonsV7(state.level),progress=levelProgressV7(state.level),done=completedCountV7(state.level),next=core.find(x=>!state.completed?.[x.id])||core[0];
    const mapLessons=core.slice(0,6);
    const nodePos=[[12,18],[52,30],[19,48],[61,58],[25,72],[61,84]];
    const nodes=mapLessons.map((x,i)=>{
      const isDone=Boolean(state.completed?.[x.id]),isNext=next?.id===x.id,p=nodePos[i]||[50,50];
      return '<button class="map-node-v7 '+(isDone?"done ":"")+(isNext?"current":"")+'" style="left:'+p[0]+'%;top:'+p[1]+'%" onclick="navigate(\'lesson\',\''+js(x.id)+'\')"><span>'+PLACE_ICONS[i]+'</span><div><b>'+(i+1)+'. '+PLACE_NAMES[i]+'</b><small>'+h(x.title)+'</small></div><em>'+h(state.level)+'</em></button>';
    }).join("");
    const near=core.slice(0,Math.min(4,core.length)).map((x,i)=>'<button class="near-lesson-v7 '+(state.completed?.[x.id]?"done":"")+'" onclick="navigate(\'lesson\',\''+js(x.id)+'\')"><span>'+(state.completed?.[x.id]?"✓":i+1)+'</span><div><b>'+h(x.title)+'</b><small>'+h(x.grammar||"Практика в ситуации")+'</small></div><em>'+h(state.level)+'</em></button>').join("");
    const topics=(typeof TOPIC_CATALOG!=="undefined"?TOPIC_CATALOG:[]).filter(x=>x.level===state.level).slice(0,8);
    shell(
      '<section class="course-v7">'+
        '<section class="course-hero-v7"><div class="course-copy-v7"><small>Твой путь по Bokmål A1–B2</small><h1>Курс</h1><p>Учись через места и реальные ситуации в жизни Fjordvik.</p></div><div class="level-tabs-v7">'+LEVELS_V7.map(l=>'<button class="'+(l===state.level?"active":"")+'" onclick="renderCourse(\''+l+'\')">'+l+'</button>').join("")+'</div>'+
        '<div class="progress-card-v7"><div><b>'+h(state.level)+'</b><small>'+done+' из '+core.length+' уроков</small></div><i><em style="width:'+progress+'%"></em></i><strong>'+progress+'%</strong></div></section>'+
        '<section class="course-map-v7"><div class="map-shade-v7"></div><div class="map-title-v7"><small>Маршрут '+h(state.level)+'</small><b>Каждый урок — новое место</b></div>'+nodes+
          (next?'<button class="map-continue-v7" onclick="navigate(\'lesson\',\''+js(next.id)+'\')">Продолжить маршрут →</button>':'')+
        '</section>'+
        '<section class="course-side-v7"><div class="nora-guide-v7"><span class="nora-avatar-v7"></span><div><small>Nora сегодня</small><b>'+(next?"Следующий шаг: "+h(next.title):"Маршрут завершён")+'</b><p>Учимся говорить так, как это понадобится в обычной жизни.</p></div></div>'+
        '<div class="section-head-v7"><div><small>Ближайшие уроки</small><h2>Что дальше</h2></div></div><div class="near-list-v7">'+near+'</div>'+
        (topics.length?'<details class="ai-topics-v7"><summary>Дополнительные AI-темы</summary><div>'+topics.map(t=>'<button onclick="navigate(\'topic\',\''+js(t.id)+'\')"><b>'+h(t.title)+'</b><small>'+h(t.goal||"")+'</small></button>').join("")+'</div></details>':'')+
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
  function v7ChatPref(k,v){state.chatPrefs=state.chatPrefs||{};state.chatPrefs[k]=v;if(k==="level")state.level=v;saveState();renderChatV7()}
  function v7UseTopic(word){const e=document.getElementById("chatInput");if(e){e.value=word+" ";e.focus()}}
  function v7ChatKey(e){
    if(e?.key==="Enter"&&!e.shiftKey){
      e.preventDefault();
      if(String(document.getElementById("chatInput")?.value||"").trim())v7SendChat();
    }
  }
  async function v7SendChat(){
    if(chatBusyV7||!baseSendChatV7||!document.getElementById("chatInput")?.value.trim())return;
    chatBusyV7=true;
    try{const request=baseSendChatV7();renderChatV7();await request}finally{chatBusyV7=false;renderChatV7()}
  }
  async function v7StartChat(){
    if(chatBusyV7||!baseStartChatV7)return;
    chatBusyV7=true;
    try{const request=baseStartChatV7();renderChatV7();await request}finally{chatBusyV7=false;renderChatV7()}
  }
  function v7ClearChat(){if(chatBusyV7)return;if((state.chatHistory||[]).length&&!confirm("Очистить этот разговор?"))return;state.chatHistory=[];saveState();renderChatV7()}

  function renderChatV7(){
    currentRouteV7="chat";
    const p=state.chatPrefs||{level:state.level||"A1",mode:"free",topic:"",scenario:"butikk",autoSpeak:true};
    shell(
      '<section class="chat-v7">'+
        '<section class="chat-scene-v7"><div class="chat-scene-photo-v7"></div><div class="chat-scene-shade-v7"></div><div class="chat-title-v7"><small>Nora · норвежский собеседник</small><h1>Разговор</h1><p>Живой Bokmål — без готового сценария.</p></div><button class="chat-settings-btn-v7" onclick="v7ChatSettings()">⚙</button></section>'+
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
    currentRouteV7="story";
    try{
      if(seasonId){
        const seasons=Array.isArray(window.STORY_SEASONS)?window.STORY_SEASONS:STORY_SEASONS;
        const picked=seasons.find(x=>x.id===seasonId);
        if(picked?.level&&picked.level!==state.level){state.level=picked.level;saveState()}
      }
    }catch{}
    const {season,list,current}=storyForLevelV7(),nodes=list.slice(0,6),pos=[[20,26],[54,35],[29,49],[71,57],[38,70],[68,80]];
    const labels=["Кафе","Дом Nora","Торговая улица","Автобус","Работа","Порт"];
    const icons=["☕","⌂","▣","🚌","💼","⚓"];
    shell(
      '<section class="fjord-v7">'+
        '<section class="fjord-map-v7"><div class="fjord-shade-v7"></div><div class="fjord-title-v7"><small>'+h(season?.title||state.level)+'</small><h1>Fjordvik</h1><p>Живой норвежский город. Выбирай место и говори в реальной ситуации.</p></div>'+
        nodes.map((e,i)=>'<button class="fjord-pin-v7 '+(state.story?.completed?.[e.id]?"done":"")+'" style="left:'+pos[i][0]+'%;top:'+pos[i][1]+'%" onclick="navigate(\'storyepisode\',\''+js(e.id)+'\')"><span>'+icons[i]+'</span><b>'+labels[i]+'</b></button>').join("")+
        '</section>'+
        '<section class="scene-day-v7"><div><small>🎬 Сцена дня · ~14 минут</small><h2>'+h(current?.title||"Встреча в Fjordvik")+'</h2><p>'+h(current?.hook||"Небольшая история, новые слова и живой разговор.")+'</p><button class="cta-v7 small" onclick="'+(current?("navigate(\'storyepisode\',\'"+js(current.id)+"\')"):"navigate(\'storyside\')")+'">Войти в сцену →</button></div><span class="nora-scene-v7"></span></section>'+
        '<section class="places-v7"><div class="section-head-v7"><div><small>⌖ Исследуй Fjordvik</small><h2>Открыто сегодня</h2></div><button onclick="navigate(\'storyjournal\')">Дневник →</button></div><div class="place-cards-v7">'+[
          ["☕","Кафе","Разговоры · новые слова"],["⚓","Порт","Истории · путешествия"],["▣","Торговая улица","Покупки · повседневный язык"]
        ].map((x,i)=>'<button onclick="'+(nodes[i]?("navigate(\'storyepisode\',\'"+js(nodes[i].id)+"\')"):"navigate(\'storyside\')")+'"><span>'+x[0]+'</span><b>'+x[1]+'</b><small>'+x[2]+'</small><em>›</em></button>').join("")+'</div></section>'+
        '<section class="nora-note-v7"><span class="nora-avatar-v7"></span><div><small>Nora</small><p>«Выбери место, и я помогу тебе говорить по-норвежски в реальной ситуации.»</p></div><button onclick="navigate(\'storyside\')">Миссия →</button></section>'+
      '</section>',
    "story");
  }

  function hubTileV7(icon,title,sub,route,badge=""){
    return '<button class="tool-v7" onclick="navigate(\''+route+'\')"><span>'+icon+'</span><div><b>'+title+'</b><small>'+sub+'</small></div>'+(badge?'<em>'+badge+'</em>':'')+'</button>';
  }
  function renderHubV7(){
    currentRouteV7="hub";
    const progress=levelProgressV7(state.level),dict=Object.keys(state.dailyDictionary||{}).length,due=dueCountV7();
    shell(
      '<section class="hub-v7">'+
        '<section class="hub-hero-v7"><div class="hub-shade-v7"></div><div><small>Твой путь · твои результаты</small><h1>Прогресс<br>и экзамен</h1><p>Всё важное без лишних экранов.</p></div></section>'+
        '<section class="stats-v7"><article><small>Текущий уровень</small><b>'+h(state.level)+'</b><i><em style="width:'+progress+'%"></em></i><span>'+progress+'%</span></article><article><small>Серия</small><b>🔥 '+Number(state.streak||0)+' дней</b></article><article><small>Слова</small><b>'+dict+'</b></article><article><small>XP</small><b>'+Number(state.xp||0)+'</b></article></section>'+
        '<section class="exam-v7"><div class="exam-bg-v7"></div><div class="exam-copy-v7"><small>Подготовка к Norskprøven</small><h2>Пробный экзамен</h2><p>Четыре навыка в одном маршруте.</p><div class="exam-parts-v7"><span>▤ Чтение</span><span>◉ Аудирование</span><span>✎ Письмо</span><span>◌ Говорение</span></div><button class="cta-v7 small" onclick="navigate(\'exam\')">Начать экзамен →</button></div></section>'+
        '<section class="tools-grid-v7">'+
          hubTileV7("↻","Повторение","Интервалы и закрепление","review",due?String(due):"✓")+
          hubTileV7("5","Словарь","Твои персональные слова","dictionary",dict?String(dict):"")+
          hubTileV7("✓","Тесты","Проверка уровня","tests")+
          hubTileV7("◉","Listening Lab","Живая норвежская речь","listeninglab")+
          hubTileV7("⌁","Произношение","Звуки и ритм","pronunciation")+
          hubTileV7("Aa","Грамматика","Слабые места","grammarlab")+
          hubTileV7("✎","Диктант","Слух + письмо","dictation")+
          hubTileV7("↗","Прогресс","Навыки и результаты","progress")+
          hubTileV7("◆","Дневник Fjordvik","История решений","storyjournal")+
          hubTileV7("☁","Облако",cloudOnV7()?"Подключено":"Синхронизация","cloud")+
          hubTileV7("⚙","Настройки","Цель и режим","settings")+
        '</section>'+
      '</section>',
    "hub");
  }

  function routeTopV7(){
    try{window.scrollTo({top:0,left:0,behavior:"auto"})}catch{try{window.scrollTo(0,0)}catch{}}
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
  Object.assign(window,{v7ContinueToday,v7Step,v7Toggle,v7ChatSettings,v7ChatPref,v7UseTopic,v7ChatKey,v7SendChat,v7StartChat,v7ClearChat,renderStoryV7});

  setTimeout(()=>{
    const open=new URLSearchParams(location.search).get("open");
    if(!open||open==="home")renderHomeV7();
    else navigate(open);
  },220);
})();
