// Norsk Eventyr 7.0 — living Fjordvik interface
(() => {
  const baseNavigateV7=window.navigate;
  const baseStartChatV7=window.startChat;
  const baseSendChatV7=window.sendChat;
  let currentRouteV7="home",courseModeV7="route",chatBusyV7=false;

  const LEVELS_V7=Array.isArray(window.LEVELS)?window.LEVELS:["A1","A2","B1","B2"];
  const PLACE_NAMES=["Вокзал","Кафе","Магазин","Автобус","Работа","Kommune"];
  const PLACE_ICONS=["🚉","☕","🛍","🚌","💼","🏛"];
  const STEP_ICONS={teacher:"N",review:"↻",listen:"♫",words:"📖",lesson:"🎓",story:"🎬",talk:"💬"};
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
    if(["storyepisode","storyjournal"].includes(g))g="adventure";
    if(["daily","dailypractice","review","storyside","plan","teacher"].includes(g))g="home";
    if(["forms","cloze","tests","test","exam","examrun","exampart","progress","dictionary","dictation","grammarlab","pronunciation","listeninglab","settings","cloud","placement"].includes(g))g="hub";
    return g;
  }
  function iconV7(name){
    const paths={home:'M3 10l9-7 9 7v10H3z M9 20v-7h6v7',course:'M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3z M12 6v16',chat:'M21 11a9 9 0 0 1-9 9H4l-2 2v-11a9 9 0 0 1 19 0z M7 11h.01 M12 11h.01 M17 11h.01',story:'M2 5l6-2 8 3 6-2v16l-6 2-8-3-6 2z M8 3v16 M16 6v16',adventure:'M12 2l2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6z M12 10a2 2 0 1 0 0 4a2 2 0 0 0 0-4',hub:'M5 12h.01 M12 12h.01 M19 12h.01',words:'M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3z M12 6v16',review:'M20 7a9 9 0 1 0 1 8 M20 2v5h-5',lesson:'M2 9l10-6 10 6-10 6z M5 11v6l7 4 7-4v-6',talk:'M21 11a9 9 0 0 1-9 9H4l-2 2v-11a9 9 0 0 1 19 0z',cafe:'M4 5h13v9a6 6 0 0 1-12 0V5 M17 7h3a3 3 0 0 1 0 6h-3 M2 21h19',shopping:'M4 8h16v13H4z M8 8V5a4 4 0 0 1 8 0v3',bus:'M5 3h14v15H5z M5 11h14 M8 18v3 M16 18v3 M8 15h.01 M16 15h.01',work:'M3 7h18v14H3z M8 7V3h8v4 M3 12h18 M10 12v3h4v-3',port:'M12 6v15 M9 3a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M5 12H2a10 10 0 0 0 20 0h-3 M7 10h10'};
    return '<svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+(paths[name]||paths.lesson)+'"/></svg>';
  }
  function navV7(active){
    const g=navGroupV7(active);
    const items=[
      ["home","⌂","Сегодня"],
      ["course","▤","Курс"],
      ["chat","◉","Разговор"],
      ["adventure","✦","Мир"],
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
          '<button class="brand-v7" onclick="navigate(\'home\')"><span>Norsk Eventyr</span><b>8.2.1</b></button>'+
          '<div class="status-v7"><button class="streak-v7" onclick="navigate(\'hub\')">🔥 <b>'+streak+'</b></button><button class="level-v7" onclick="navigate(\'course\')">'+level+'</button></div>'+
        '</header>'+
        '<main class="main-v7">'+content+helpMarkupV7(content.includes('class="card guided-speaking"'),content.includes('lesson-exercise-v6'))+'</main>'+
        navV7(currentRouteV7||active)+
      '</div>';
  };
  window.neAdvance=function(action,delay){
    const revision=window.neScreenRevision;
    return setTimeout(()=>{if(revision===window.neScreenRevision)action()},delay);
  };

  // Shared on-demand Nora coach. One memory per lesson step, stored in the
  // existing checkpoint and never reused across unrelated learners or screens.
  let neHelpSpeech=null;
  function v7HelpState(session,create=false){
    if(!session?.lesson)return null;
    if(!session.helpV8&&create)session.helpV8={historyByStep:{},aidedSteps:{}};
    return session.helpV8||null;
  }
  function v7HelpHistory(session,step){
    const memory=v7HelpState(session);
    const history=memory?.historyByStep?.[String(step)];
    return Array.isArray(history)?history.slice(-8):[];
  }
  function helpMarkupV7(guided=false,lessonScreen=false){
    const session=lessonScreen&&typeof window!=='undefined'?window.neLessonSession:null,step=session?.step;
    const transcript=(session&&typeof v7HelpHistory==='function'?v7HelpHistory(session,step):[]).map(turn=>
      '<div class="ne-help-turn"><b>'+(turn.role==='assistant'?'Нора':'Ты')+'</b><p>'+h(String(turn.text||'').slice(0,1600))+'</p></div>'
    ).join('');
    // The generic helper remains available to Nora during guided lessons;
    // visual-world.js also supplies its specialized in-scene tutor.
    return (guided?'<section class="ne-guided-help-mount">':'<section class="card" style="margin:16px 0">')+
      (guided?'':'<button type="button" class="btn secondary" onclick="v7OpenHelp()" aria-controls="helpPanelV7" aria-expanded="false" id="helpToggleV7">Спросить Нору · русский / norsk</button>')+
      '<div id="helpPanelV7" hidden><p>Спроси на русском или норвежском, даже смешивая языки. Нора объяснит и поможет продолжить текущую задачу, не решая её вместо тебя. После подсказки ответ считается тренировкой.</p>'+
      '<div class="ne-help-quick"><button type="button" onclick="v7QuickHelp(\'simple\')">Объясни проще</button><button type="button" onclick="v7QuickHelp(\'example\')">Похожий пример</button><button type="button" onclick="v7QuickHelp(\'why\')">Почему так?</button></div>'+
      '<div class="ne-help-log" id="helpLogV7" aria-live="polite">'+transcript+'</div>'+
      '<label for="helpQuestionV7">Вопрос Норе</label><textarea class="input" id="helpQuestionV7" maxlength="1800" rows="2" placeholder="Jeg ... не помню, как будет «живу» ... i Norge?" oninput="this.dataset.fromSpeech=\'false\'"></textarea>'+
      '<div class="row ne-help-actions" style="margin-top:10px"><button type="button" class="btn secondary" onclick="v7DictateHelp(\'ru\')">🎤 Русский</button><button type="button" class="btn secondary" onclick="v7DictateHelp(\'nb\')">🎤 Norsk</button><button type="button" class="btn" id="helpSendV7" onclick="v7AskHelp()">Спросить Нору</button><button type="button" class="btn ghost" onclick="v7OpenHelp()">Закрыть</button></div>'+
      '<small>Микрофон распознаёт выбранный язык, а не оба одновременно. Проверь текст перед отправкой. Ответ Норы не начисляет баллы.</small>'+
      '<div id="helpReplyV7" role="status" aria-live="polite" style="white-space:pre-wrap;margin-top:12px"></div></div></section>';
  }
  function v7OpenHelp(){
    const panel=document.getElementById("helpPanelV7");if(!panel)return;
    panel.hidden=!panel.hidden;
    document.getElementById("helpToggleV7")?.setAttribute("aria-expanded",String(!panel.hidden));
    if(!panel.hidden)document.getElementById("helpQuestionV7")?.focus();
  }
  function v7QuickHelp(kind){
    const input=document.getElementById('helpQuestionV7'),panel=document.getElementById('helpPanelV7');
    if(!input||!panel)return;
    const requests={
      simple:'Объясни задание совсем простыми словами, без готового ответа. Скажи, что именно мне нужно сделать.',
      example:'Покажи другой, похожий пример с другим смыслом, не раскрывая ответ на текущее упражнение.',
      why:'Объясни, почему здесь используется такое слово или правило, и как я смогу применить это сам.'
    };
    if(!requests[kind])return;
    if(panel.hidden)v7OpenHelp();
    input.value=requests[kind];v7AskHelp();
  }
  function v7DictateHelp(language){
    const input=document.getElementById('helpQuestionV7'),panel=document.getElementById('helpPanelV7');
    const status=document.getElementById('helpReplyV7');
    const locale=language==='ru'?'ru-RU':language==='nb'?'nb-NO':'';
    if(!locale||!input||!panel)return false;
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(typeof Recognition!=='function'){
      if(status)status.textContent='Распознавание речи недоступно: напиши вопрос вручную.';
      return false;
    }
    try{neHelpSpeech?.abort?.()}catch{}
    const old=input.value,revision=window.neScreenRevision,session=window.neLessonSession;
    let mic;
    try{mic=new Recognition()}catch{
      if(status)status.textContent='Не удалось запустить микрофон.';
      return false;
    }
    neHelpSpeech=mic;mic.lang=locale;mic.interimResults=false;mic.maxAlternatives=1;
    mic.onresult=event=>{
      if(neHelpSpeech!==mic||window.neScreenRevision!==revision||window.neLessonSession!==session||
         !input.isConnected||input.value!==old)return;
      const phrase=String(event.results?.[0]?.[0]?.transcript||'').trim();
      if(!phrase)return;
      input.value=[old.trim(),phrase].filter(Boolean).join(' ').slice(0,1800);
      if(input.dataset)input.dataset.fromSpeech='true';
      if(status?.isConnected)status.textContent='Проверь распознанную речь, затем нажми «Спросить Нору».';
    };
    mic.onerror=()=>{if(neHelpSpeech===mic&&status?.isConnected)status.textContent='Речь не распознана. Напиши вопрос текстом.'};
    mic.onend=()=>{if(neHelpSpeech===mic)neHelpSpeech=null};
    try{mic.start();if(status)status.textContent='Слушаю '+(language==='ru'?'по-русски':'на норвежском')+'…';return true}
    catch{if(neHelpSpeech===mic)neHelpSpeech=null;if(status)status.textContent='Микрофон сейчас недоступен.';return false}
  }
  // Only explicit requests about language learning are routed to Nora.
  // Ordinary questions to an NPC remain valid dialogue answers.
  function v7IsNoraHelpRequest(text){
    const raw=String(text||'').trim();
    if(!raw)return false;
    if(/[\u0400-\u04ff]/u.test(raw)&&
       /(?:не\s+(?:знаю|помню|понимаю|понял|поняла)|забыл(?:а)?|как\s+(?:сказать|будет|перевести)|что\s+(?:значит|означает)|подскажи|помоги|объясни|переведи|повтори|медленнее)/iu.test(raw))return true;
    // Explicitly addressed to Nora, not an ordinary NPC question.
    if(/^nora\s*[,!:]\s*(?:kan\s+du|hva|hvordan|jeg|forklar|oversett|gjenta)/iu.test(raw))return true;
    return /^(?:hva\s+betyr\s+(?:ordet|uttrykket|verbet|setningen)|hvordan\s+(?:sier\s+(?:jeg|man)|oversetter\s+(?:jeg|man))\b[^?!.]{0,100}\bpå\s+norsk|kan\s+du\s+(?:forklare|oversette)\s+(?:ordet|uttrykket|verbet|setningen|grammatikken)|jeg\s+(?:husker|vet|forstår)\s+ikke\s+(?:hva\s+(?:ordet|uttrykket)|hvordan\s+(?:jeg|man)\s+sier))/iu.test(raw);
  }
  // Recognize explicit help requests even when the learner types them into
  // the main writing or dialogue box and presses its usual Check button.
  // A legitimate Norwegian answer must pass through unchanged.
  function v7HelpFromLessonAnswer(text,source){
    const raw=String(text||'').trim();
    if(!v7IsNoraHelpRequest(raw))return false;
    const session=window.neLessonSession,panel=document.getElementById('helpPanelV7');
    const input=document.getElementById('helpQuestionV7');
    if(!session?.lesson||!panel||!input)return false;
    if(panel.hidden)v7OpenHelp();
    const send=document.getElementById('helpSendV7');
    if(send?.disabled){
      const box=document.getElementById('helpReplyV7');
      if(box)box.textContent='Нора отвечает на предыдущий вопрос. Твой исходный ответ не изменён.';
      return true;
    }
    input.value=raw.slice(0,1800);
    if(input.dataset)input.dataset.fromSpeech=['true','recognition'].includes(String(source?.dataset?.fromVoice||''))?'true':'false';
    void v7AskHelp();
    return true;
  }
  async function v7AskHelp(){
    const input=document.getElementById("helpQuestionV7"),button=document.getElementById("helpSendV7"),box=document.getElementById("helpReplyV7");
    const question=input?.value.trim();if(!question||!button||button.disabled||!box)return;
    const main=document.querySelector(".main-v7");if(!main)return;
    const revision=window.neScreenRevision,session=main.querySelector('.lesson-exercise-v6')?window.neLessonSession:null,step=session?.step;
    const copy=main.cloneNode(true);
    copy.querySelector("#helpPanelV7")?.parentElement?.remove?.();
    const answer=Array.from(main.querySelectorAll("textarea,input")).filter(e=>e.id!=="helpQuestionV7").map(e=>e.value).filter(Boolean).join("\n");
    const context=(copy.textContent+"\nЧерновик ответа ученика (ещё не проверен): "+answer).slice(0,6000);
    const inPlacement=!!main.querySelector("#placementUnknown");
    const history=v7HelpHistory(session,step);
    const fallback=Array.isArray(box._helpHistory)?box._helpHistory:[];
    const savedHistory=session?.lesson?history:fallback;
    button.disabled=true;box.textContent="Нора объясняет…";
    try{
      // Diagnostic placement must remain independent of tutor hints.
      const request=inPlacement
        ?"Это диагностический тест. Объясни ученику по-русски только смысл формулировки и что от него требуется. Не называй правильный вариант, не переводи варианты ответов, не решай задание и не выдавай подсказок, раскрывающих решение. Если ученик не знает ответ, предложи нажать «Не знаю». Вопрос ученика: "+question
        :question;
      const r=await neApiPost("/api/chat",{mode:"explain",scenario:inPlacement?"":"lesson_help",message:request,
        inputSource:input?.dataset?.fromSpeech==='true'?'voice_transcript':'typed_text',context,level:state.level,history:savedHistory});
      // A response to an old screen, question or lesson must never mark evidence.
      if(!box.isConnected||window.neScreenRevision!==revision||
         window.neLessonSession!==session||session?.step!==step||input.value.trim()!==question)return;
      const explanation=r.ok?String(r.data?.explanation_ru||r.data?.translation_ru||"").trim():"";
      if(!explanation){
        box.textContent="Объяснение сейчас недоступно. Вопрос сохранён — попробуй ещё раз.";
        return;
      }
      const updated=[...savedHistory,{role:"user",text:question},{role:"assistant",text:explanation}].slice(-8);
      if(session?.lesson&&!inPlacement){
        const memory=v7HelpState(session,true);
        memory.historyByStep=memory.historyByStep||{};
        memory.aidedSteps=memory.aidedSteps||{};
        memory.historyByStep[String(step)]=updated;
        memory.aidedSteps[String(step)]=true;
        if(session.guidedSpeech?.index>=0){
          session.guidedSpeech.aidedTurns=session.guidedSpeech.aidedTurns||{};
          session.guidedSpeech.aidedTurns[String(session.guidedSpeech.index)]=true;
        }
        try{window.persistLessonCheckpoint?.()}catch{}
      }
      if(session?.lesson&&!inPlacement)window.NEWordTrays?.recordTutorWord?.({question,explanation,lesson:session.lesson});
      box._helpHistory=updated;
      box.textContent=explanation+"\n\nЭто подсказка. Продолжи исходное задание самостоятельно.";
      input.value="";if(input.dataset)input.dataset.fromSpeech='false';
    }catch{
      if(box.isConnected&&window.neScreenRevision===revision)box.textContent="Не удалось получить объяснение. Вопрос сохранён — попробуй ещё раз.";
    }finally{if(button.isConnected)button.disabled=false;}
  }
  Object.assign(window,{v7OpenHelp,v7AskHelp,v7QuickHelp,v7DictateHelp,v7HelpFromLessonAnswer,neNoraHelpIntent:v7IsNoraHelpRequest});

  function guidedV7(){
    const day=todayKeyV7(),wordDue=dueCountV7(),adaptiveDue=window.NEAdaptive?NEAdaptive.dueReviews(state).length:0,
      activity=dayActivityV7(),
      pending=state.activeLesson?.id&&state.generatedLessons?.[state.activeLesson.id]?state.generatedLessons[state.activeLesson.id]:null,
      teacherDone=state.learningV8?.lastSessionDate===day&&!pending,
      mission=window.NEAdaptive?NEAdaptive.nextMission(state):null;
    const focus=pending?.title||mission?.module?.title||"Следующий модуль курса";
    const plan=window.NECourseMethod?.dailyPlan(state.elite?.dailyMinutes||20,state.learningV8?.levelSkills?.[state.level]);
    const minutes=i=>plan?.parts?.[i]?.minutes||[10,15,15,15,5][i];
    const steps=[
      {id:"teacher",title:pending?"Продолжить незаконченный урок":"Урок с Норой",sub:focus,mins:minutes(1),done:teacherDone,route:pending?"lesson":"teacher",data:pending?.id},
      {id:"review",title:"Повторение через интервалы",sub:adaptiveDue?adaptiveDue+" проверок курса":wordDue?wordDue+" слов к повторению":"Всё запланированное повторено",mins:minutes(0),done:wordDue+adaptiveDue===0,route:adaptiveDue?"teacher":"review"},
      {id:"listen",title:"Живая норвежская речь",sub:"Послушать запись и проверить понимание",mins:minutes(2),done:activity.listening===true,route:"listeninglab"},
      {id:"talk",title:"Разговор с Норой",sub:"Самостоятельные ответы в жизненном диалоге",mins:minutes(3),done:activity.conversation===true,route:"chat"},
      {id:"words",title:"Письмо и диктант",sub:"Закрепить слова в письменных заданиях",mins:minutes(4),done:activity.dictation===true,route:"dictation"}
    ];
    const next=steps.find(x=>!x.done)||{title:"Дополнительное занятие с Норой",sub:"Все блоки дневного маршрута выполнены",mins:0,route:"teacher"};
    return {day,due:wordDue+adaptiveDue,story:storyForLevelV7().current,lesson:nextLessonV7(),steps,next,
      done:steps.filter(x=>x.done).length,total:steps.length,planned:plan?.minutes||60,
      mins:steps.filter(x=>!x.done).reduce((a,x)=>a+x.mins,0)};
  }
  function v7ContinueToday(){return navigate('livingday')}
  function v7Step(i){return navigate('livingday')}

  function dailyWordsV7(){
    const list=Object.values(state.dailyDictionary||{}).sort((a,b)=>String(b.lastSeen||"").localeCompare(String(a.lastSeen||""))).slice(0,5);
    const fallback=[
      {lemma:"jobb",translation_ru:"работа"},{lemma:"avtale",translation_ru:"встреча"},
      {lemma:"komme",translation_ru:"приходить"},{lemma:"senere",translation_ru:"позже"},{lemma:"vente",translation_ru:"ждать"}
    ];
    return [...list,...fallback].slice(0,5);
  }

  function xpJourneyV7(){
    const status=window.xpRewardStatus?xpRewardStatus():{xp:state.xp||0,unlocked:[],next:null,progress:0,toNext:0},rewards=window.xpRewardCatalog?xpRewardCatalog():[];
    const rewardButtons=rewards.map(r=>{
      const open=status.xp>=r.xp;
      return '<button class="xp-reward-v8 '+(open?'open':'locked')+'" '+(open?'onclick="v7XpMission(\''+js(r.id)+'\')"':'disabled')+
        '><span>'+r.xp+' XP</span><b>'+h(r.title)+'</b>'+
        '<small lang="nb">'+h(r.goals_no||'')+'</small><small lang="ru">'+h(r.goals_ru||r.description)+'</small>'+
        '<small>'+(open?'Открыто · практиковать':'Ещё '+Math.max(0,r.xp-status.xp)+' XP')+'</small></button>';
    }).join("");
    const next=status.next?'<div class="xp-progress-v8"><div><span>Следующая практическая миссия</span><b>'+h(status.next.title)+'</b><em>ещё '+status.toNext+' XP</em></div><i><strong style="width:'+status.progress+'%"></strong></i></div>':'<div class="xp-progress-v8 complete"><b>Все текущие XP-миссии открыты; продолжай практику для закрепления навыков.</b></div>';
    const best=Math.max(Number(state.gamification?.bestStreak)||0,Number(state.streak)||0);
    const achievements=[3,7,14,30].map(n=>(best>=n?'✓ ':'○ ')+n+' дней подряд').join(' · ');
    return '<section class="xp-journey-v8"><div class="section-head-v7"><div><small>XP · практические миссии Норы</small><h2>'+status.xp+' XP</h2><p>XP открывают дополнительные жизненные диалоги, не заменяют оценку урока и не определяют языковой уровень.</p></div></div>'+next+
      '<p class="muted">Достижения за регулярность · '+h(achievements)+'</p>'+
      '<div class="xp-rewards-v8">'+rewardButtons+'</div>'+
      '<p class="muted">В миссии отвечай своими словами. Нора задаёт вопросы по очереди и помогает исправить ошибки; прохождение разговора само по себе не подтверждает уровень.</p></section>';
  }
  function renderHomeV7(){
    currentRouteV7="home";
    const j=guidedV7(),living=window.NELivingDay?.details?.()||null,wordStatus=window.NELivingWords?.progress?.()||null,story=j.story,words=dailyWordsV7(),district=story?.district||"Fjordvik",
      pending=state.activeLesson?.id&&state.generatedLessons?.[state.activeLesson.id],
      met=state.noraMemory?.introduced===true,
      heroTitle=living?(living.finished?'На сегодня отлично!':pending?'Продолжим?':'Учим норвежский вместе'):pending?"Продолжим?":j.mins===0?"До завтра!":met?"Идём дальше!":"Начнём вместе",
      heroText=living?(living.finished?'Тема закреплена. Твой следующий шаг подберётся по результатам.':'Нора продолжает одну тему в новых ситуациях. Ответы и учебный прогресс сохраняются.'):pending?"Мы сохранили твой урок. Продолжим с того места, где остановились.":
        j.mins===0?"Главная цель на сегодня выполнена. Дополнительная практика доступна по желанию.":
        met?"Новая задача и повторение слабых мест. Никакого знакомства заново.":
        "Первый шаг к настоящему разговору по-норвежски — в твоём темпе.";
    const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Oslo',hour:'numeric',hourCycle:'h23'}).format(new Date())),daypart=hour<6?'ночь':hour<12?'утро':hour<18?'день':'вечер';
    const route=j.steps.map((x,i)=>
      '<button class="route-step-v7 '+(x.done?"done":"")+'" onclick="v7Step('+i+')">'+
        '<span class="route-icon-v7">'+(x.done?"✓":iconV7(x.id))+'</span>'+
        '<div><b>'+h(x.title)+'</b><small>'+h(x.sub)+'</small></div><em>'+x.mins+' мин</em>'+
      '</button>'
    ).join("");
    const shortSteps=(wordStatus?.stages?.length?wordStatus.stages:[
      {number:1,start:1,end:5,done:false},{number:2,start:6,end:10,done:false},
      {number:3,start:11,end:15,done:false}
    ]).map(step=>
      '<button class="route-step-v7 '+(step.done?'done':'')+'" onclick="v7ContinueToday()">'+
       '<span class="route-icon-v7">'+(step.done?'✓':step.number)+'</span>'+
       '<div><b>Слова · мини-этап '+step.number+'</b><small>'+step.start+'–'+step.end+
        ' · перевод, предложение, быстрая проверка</small></div>'+
       '<em>'+(step.done?'Готово':wordStatus?.seen>=step.start-1?'Продолжить':'Далее')+'</em></button>'
    ).join('');
    const miniPath= living?
      '<section class="route-card-v7"><div class="section-head-v7"><div>'+
        '<small>Твой маршрут · маленькие шаги</small><h2>'+h(living.title)+'</h2></div>'+
        '<span>'+h(living.level)+'</span></div>'+
        '<p>'+h(living.objective)+'</p>'+
        '<p class="muted">Сначала слова короткими этапами по пять. После них — практика с Норой: слух, речь и письмо. Можно остановиться и продолжить позже без потери результата.</p>'+
        '<div class="progress" role="progressbar" aria-label="Прогресс словарной практики"><i style="width:'+(wordStatus?.percent||0)+'%"></i></div>'+
        '<div class="route-steps-v7">'+shortSteps+
          '<button class="route-step-v7 '+(living.finished?'done':'')+'" onclick="v7ContinueToday()">'+
           '<span class="route-icon-v7">'+(living.finished?'✓':'N')+'</span>'+
           '<div><b>Нора · ситуации и разговор</b><small>'+living.scene+' из '+living.total+
             ' связанных ситуаций освоено; переход подтверждается ответами</small></div>'+
           '<em>'+(living.finished?'Готово':'Продолжить')+'</em></button></div>'+
        '<p class="muted">Полное дневное занятие может занять больше времени, чем один мини-этап. Уровень определяется проверкой навыков, а не количеством нажатий.</p>'+
        '<button class="btn secondary" onclick="v7ContinueToday()">Продолжить с сохранённого места →</button>'+ 
   '<button class="btn ghost" onclick="navigate(\'lessonarchive\')">Архив пройденных уроков →</button>'+
      '</section>':null;
    shell(
      '<section class="home-v7">'+
        '<section class="hero-v7">'+
          '<div class="hero-overlay-v7"></div><div class="nora-cutout-v7" aria-hidden="true"></div>'+
          '<div class="hero-copy-v7"><small>'+h(district)+' · '+daypart+'</small><h1>'+h(heroTitle)+'</h1><p>'+h(heroText)+'</p><div class="home-focus-v81"><span>Сегодня с Норой</span><strong>'+h(living?.title||j.steps[0]?.sub||"Практика норвежского")+'</strong></div>'+
          '<button class="cta-v7" onclick="v7ContinueToday()">'+(living?.finished?'Урок завершён':'Урок с Норой · '+(living?.plannedMinutes||60)+' мин')+' <b>→</b></button></div>'+
          '<div class="hero-note-v7">Små steg<br>store eventyr ♡</div>'+
        '</section>'+
        (window.NEExperience?.homeChoice?.(state)||'')+
        (living?miniPath:
        '<section class="route-card-v7"><div class="section-head-v7"><div><small>Твой маршрут на сегодня · 5 занятий</small><h2>'+(j.mins?"Осталось "+(j.total-j.done)+" из "+j.total+" блоков":"Маршрут завершён")+'</h2></div><span>План '+j.planned+' мин</span></div><p class="muted">Время на каждый блок — ориентир, а не измерение фактически потраченных минут.</p><div class="route-steps-v7">'+route+'</div></section>')+
        (window.NENordicQuest?.homeTile?.()||'')+
        '<details class="ne-home-extras"><summary>Дополнительная практика и награды <span>'+h(state.xp||0)+' XP · по желанию</span></summary>'+
        xpJourneyV7()+
                '<section class="card applied-home-entry"><div class="section-head-v7"><div><small>Дополнительная практика · '+h(state.level)+'</small><h2>Норвежский для жизни</h2><p>Проверь формы слов и потренируйся заполнять документы.</p></div></div><div class="applied-actions"><button class="btn" onclick="navigate(\'cloze\')">Вставить слово</button><button class="btn secondary" onclick="navigate(\'forms\')">Анкеты и заявления</button></div></section>'+
        '<section class="words-card-v7 daily-focus-v81"><div class="section-head-v7"><div><small>Короткая ежедневная практика</small><h2>Слова для реальной жизни</h2><p>Попробуй вспомнить эти слова и составить собственную фразу.</p></div><button onclick="navigate(\'daily\')">Практика →</button></div><div class="daily-words-v81">'+words.slice(0,3).map(w=>'<div class="daily-word-v81"><b>'+h(w.lemma||w.word||"")+'</b><span>'+h(w.translation_ru||w.translation||"")+'</span></div>').join("")+'</div></section>'+
        '</details>'+ 
        '<section class="nora-note-v7"><span class="nora-avatar-v7"></span><div><small>Nora</small><p>«'+h(pending?"Продолжим с сохранённого этапа.":"Я подберу практику по твоим результатам. Говори своими словами.")+'»</p></div><button onclick="navigate(\'chat\')">Написать →</button></section>'+
      '</section>',
    "home");
  }

  function renderCourseV7(level=state.level){
    currentRouteV7="course";
    const courseLevel=level&&LEVELS_V7.includes(level)?level:state.level;
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
      const syllabus=window.NECourseMethod?.modulePlan(m,state);
      return '<button class="near-lesson-v7 '+(isDone?"done ":"")+(locked?"locked":"")+'" onclick="teacherStartModule(\''+js(m.id)+'\')"><span>'+(isDone?"✓":i+1)+'</span><div><b>'+h(m.title)+'</b><small>'+h(m.canDo?.[0]||"Практическая цель")+'</small>'+(syllabus?'<small>'+h(syllabus.stageTitle)+' · '+h(m.grammar)+'</small>'+(syllabus.verifiedStages!==null?'<small>Подтверждено этапов: '+syllabus.verifiedStages+'/4</small>':''):'')+'</div><em>'+mastery+'%</em></button>';
    }).join("");
    const levelSchedule=window.NECourseMethod?.levelPlan(courseLevel),daily=window.NECourseMethod?.dailyPlan(Math.max(45,state.elite?.dailyMinutes||60));
    const legacy=coreLessonsV7(courseLevel),topics=(typeof TOPIC_CATALOG!=="undefined"?TOPIC_CATALOG:[]).filter(x=>x.level===courseLevel).slice(0,8);
    shell(
      '<section class="course-v7">'+
        '<section class="course-hero-v7"><div class="course-copy-v7"><small>Адаптивный путь Bokmål · A1–B2</small><h1>Курс '+h(courseLevel)+'</h1><p>Каждый модуль закрывается только после доказательств по навыкам, а не после просмотра урока.</p></div><div class="level-tabs-v7">'+LEVELS_V7.map(l=>'<button class="'+(l===courseLevel?"active":"")+'" onclick="renderCourse(\''+l+'\')">'+l+'</button>').join("")+'</div>'+
        '<div class="progress-card-v7"><div><b>'+h(courseLevel)+'</b><small>'+done+' из '+modules.length+' модулей освоено</small></div><i><em style="width:'+routeProgress+'%"></em></i><strong>'+routeProgress+'%</strong></div>'+
        '<div class="notice" style="margin-top:12px"><b>Профиль навыков: '+profile+'%</b> · '+(gate?.pass?"уровень подтверждён внутренними критериями":"уровень ещё не подтверждён")+'. Маршрут и профиль — разные показатели.</div>'+
        (levelSchedule?'<div class="notice" style="margin-top:10px"><b>Учебная программа, не разрозненные уроки.</b> 8 модулей по порядку; каждый включает ситуацию, разбор, аудирование, речевую практику и перенос навыка. Ориентир '+levelSchedule.weeks+' недель при занятиях по 60 мин × 6 дней. Твой дневной план: '+daily.minutes+' минут. Сроки ориентировочные, переход только по навыкам.</div>':'')+'</section>'+
        '<section class="course-map-v7"><div class="map-shade-v7"></div><div class="map-title-v7"><small>32-модульный маршрут</small><b>'+h(courseLevel)+' · '+h(next?.title||"Повторение")+'</b></div>'+nodes+
          (next?'<button class="map-continue-v7" onclick="teacherStartModule(\''+js(next.id)+'\')">Продолжить с Норой →</button>':'')+
        '</section>'+
        '<section class="course-side-v7"><div class="nora-guide-v7"><span class="nora-avatar-v7"></span><div><small>Nora · преподаватель</small><b>'+(next?"Следующая цель: "+h(next.canDo?.[0]||next.title):"Повторение уровня")+'</b><p>Я меняю нагрузку по твоим ответам и возвращаю слабые места через интервалы.</p></div></div>'+
        '<div class="section-head-v7"><div><small>Основной маршрут</small><h2>8 модулей '+h(courseLevel)+'</h2></div></div><div class="near-list-v7">'+list+'</div>'+
        '<details class="ai-topics-v7"><summary>Дополнительная практика — не влияет сама по себе на прохождение уровня</summary><div>'+
          legacy.map(x=>'<button onclick="navigate(\'lesson\',\''+js(x.id)+'\')"><b>'+h(x.title)+'</b><small>'+h(x.grammar||"Закрепление")+'</small></button>').join("")+
          topics.map(t=>'<button onclick="navigate(\'topic\',\''+js(t.id)+'\')"><b>'+h(t.title)+'</b><small>'+h(t.goal||"")+'</small></button>').join("")+
        '</div></details>'+
        '<section class="card" style="margin-top:14px"><div class="eyebrow">Проверенные внешние материалы · '+h(courseLevel)+'</div><h3>Учись также по университетским курсам</h3>'+
          '<p class="muted">Эти материалы созданы внешними специалистами. Они открываются на сайте издателя и не заменяют оценки нашей программы.</p>'+
          (window.NEResources?.byLevel(courseLevel,['course'])||[]).map(r=>'<p><a href="'+h(r.url)+'" target="_blank" rel="noopener noreferrer">'+h(r.name)+' ↗</a><br><small>'+h(r.note)+'</small></p>').join('')+
          '<p><button class="btn secondary" onclick="navigate(\'listeninglab\')">Аудиокорпуса и критерии Norskprøven →</button></p></section>'+
        '</section>'+
      '</section>',
    "course");
  }

  function v7NoraFeedback(meta){
    if(meta.score_valid!==true||!["correct","partial","incorrect"].includes(meta.feedback_status))return "";
    const label={correct:"Правильно",partial:"Частично правильно",incorrect:"Неправильно"}[meta.feedback_status];
    const good=meta.feedback_status!=="incorrect";
    const parts=[
      '<b>'+label+' · '+h(meta.score)+'/100</b>',
      meta.assessment_source==="voice_transcript"?'<br><small>Предварительная оценка смысла распознанной речи, не произношения. Распознавание слов может ошибаться.</small>':"",
      meta.error_fragment_ru?'<br><b>Где ошибка:</b> '+h(meta.error_fragment_ru):"",
      meta.explanation_ru?'<br><b>Объяснение:</b> '+h(meta.explanation_ru):"",
      meta.corrected?'<br><b>Как правильно / естественнее:</b> '+h(meta.corrected):"",
      meta.score_reason_ru?'<br><b>Почему такая оценка:</b> '+h(meta.score_reason_ru):"",
      !good?'<br><small>Попробуй ещё раз — сцена не засчитана.</small>':""
    ];
    return '<div class="feedback '+(good?"good":"bad")+' nora-check-v822" role="status">'+parts.join("")+'</div>';
  }
  function v7ChatMessages(){
    const hist=state.chatHistory||[];
    if(!hist.length)return '<div class="chat-welcome-v7"><span class="nora-avatar-v7 large"></span><div><small>Nora · norsk samtalepartner</small><h2>'+(state.noraMemory?.introduced?"Продолжим разговор?":"Hei! La oss snakke norsk!")+'</h2><p>Нора учитывает выбранную тему и твой уровень. Можно ответить голосом или текстом.</p><button class="cta-v7 small" onclick="v7StartChat()">Начать разговор →</button></div></div>';
    return hist.map((m,i)=>{
      if(m.role==="user")return '<div class="chat-row-v7 user"><div class="bubble-v7 user">'+h(m.text)+'</div></div>';
      const meta=m.meta||{};
      return '<div class="chat-row-v7 nora"><span class="nora-avatar-v7 mini"></span><div><small class="speaker-v7">Nora</small><div class="bubble-v7 nora">'+h(m.text)+'</div>'+
        v7NoraFeedback(meta)+
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
  function v7XpMission(id){
    const reward=(window.xpRewardCatalog?xpRewardCatalog():[]).find(x=>x.id===id);
    if(!reward||(state.xp||0)<reward.xp)return;
    const place=PLACES_V7.find(x=>x.id===id);
    const steps=(reward.steps_no||[]).map((step,i)=>(i+1)+'. '+step).join(' ');
    const scene='XP-миссия Норы. '+(reward.scene||place?.scene||'Повседневная ситуация в Fjordvik.')+
      ' Задача ученика (Bokmål): '+(reward.goals_no||reward.description)+
      ' Шаги: '+steps+
      ' Проводи живой ролевой разговор на норвежском, по одному вопросу за раз; не давай готовых ответов без запроса. Если ученик не понял, кратко объясни по-русски. Никаких фиктивных баллов или подтверждения CEFR.';
    state.gamification=state.gamification&&typeof state.gamification==="object"?state.gamification:{};
    state.gamification.startedRewards=state.gamification.startedRewards||{};
    state.gamification.startedRewards[id]=(state.gamification.startedRewards[id]||0)+1;
    saveState();
    selectConversationV7('xp:'+id,'XP-миссия · '+reward.title,reward.goals_no+' / '+reward.goals_ru,scene,state.level);
  }
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
          '<div class="composer-v7"><button id="chatMicBtn" class="mic-v7" onclick="toggleMic(\'chatInput\')" aria-label="Говорить">🎤</button><textarea id="chatInput" rows="1" placeholder="Ответь Норе по-норвежски…" oninput="this.dataset.fromVoice=false" onkeydown="v7ChatKey(event)"></textarea><button class="send-v7" onclick="v7SendChat()" aria-label="Отправить">➤</button></div><div id="chatVoiceStatus" class="chat-live-status-v8" role="status" aria-live="polite"></div>'+
        '</section>'+
      '</section>',
    "chat");
    setTimeout(()=>{const b=document.getElementById("chatMessages");if(b)b.scrollTop=b.scrollHeight},0);
    if(chatBusyV7){
      document.querySelectorAll(".send-v7,.mic-v7,.chat-settings-v7 button,.chat-settings-v7 select").forEach(e=>e.disabled=true);
      document.getElementById("chatInput")?.setAttribute("disabled","");
      const b=document.getElementById("chatMessages");
      if(b&&!b.querySelector(".chat-thinking"))b.insertAdjacentHTML("beforeend",'<div class="chat-thinking" role="status">Нора думает…</div>');
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
  function daysLabelV7(count){
    const n=Math.max(0,Math.floor(Number(count)||0)),last=n%10,hundred=n%100;
    const word=last===1&&hundred!==11?'день':last>=2&&last<=4&&(hundred<12||hundred>14)?'дня':'дней';
    return n+' '+word;
  }
  function renderHubV7(){
    currentRouteV7="hub";
    const routeProgress=levelProgressV7(state.level),gate=window.NEAdaptive?NEAdaptive.levelGate(state,state.level):null,mastery=gate?gate.avg:routeProgress,dict=Object.keys(state.dailyDictionary||{}).length,due=dueCountV7();
    shell(
      '<section class="hub-v7">'+
        '<section class="hub-hero-v7"><div class="hub-shade-v7"></div><div><small>Твой путь · твои результаты</small><h1>Прогресс<br>и экзамен</h1><p>Всё важное без лишних экранов.</p></div></section>'+
        '<section class="stats-v7"><article><small>Профиль '+h(state.level)+'</small><b>'+(gate?.pass?'Подтверждён':'В работе')+'</b><i><em style="width:'+mastery+'%"></em></i><span>'+mastery+'%</span></article><article><small>Серия занятий</small><b>'+daysLabelV7(state.streak)+'</b></article><article><small>Слова в словаре</small><b>'+dict+'</b></article><article><small>Маршрут курса</small><b>'+routeProgress+'%</b></article></section>'+
        '<section class="exam-v7"><div class="exam-bg-v7"></div><div class="exam-copy-v7"><small>Подготовка к Norskprøven</small><h2>Пробный экзамен</h2><p>Четыре навыка в одном маршруте.</p><div class="exam-parts-v7"><span>▤ Чтение</span><span>◉ Аудирование</span><span>✎ Письмо</span><span>◌ Говорение</span></div><button class="cta-v7 small" onclick="navigate(\'exam\')">Начать экзамен →</button></div></section>'+
        '<section class="tools-grid-v7">'+
          hubTileV7("✦","Северный компас","Приключение и карта маршрута","adventure")+
          hubTileV7("⌖","Истории Fjordvik","Сюжет и выбор","story")+
          hubTileV7("N","Нора","Адаптивный преподаватель","teacher")+
          hubTileV7("▤","Архив уроков","Повторение пройденных занятий","lessonarchive")+
          hubTileV7("↻","Повторение","Интервалы и закрепление","review",due?String(due):"✓")+
          hubTileV7("▤","Выученные слова","Поиск · повтор · задания","learnedwords")+
          hubTileV7("✎","Домашнее задание","Изучение и практика","daily")+
          hubTileV7("✓","Тесты","Проверка уровня","tests")+
          hubTileV7("◉","Listening Lab","Живая норвежская речь","listeninglab")+
          hubTileV7("⌁","Произношение","Звуки и ритм","pronunciation")+
          hubTileV7("Aa","Грамматика","Слабые места","grammarlab")+
          hubTileV7("▤","Анкеты и заявления","Учебные бланки · A1–B2","forms")+
          hubTileV7("Aa","Вставить слово","Времена · число · порядок слов","cloze")+
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
      else if(target==="adventure")r=window.NENordicQuest?.open?.()||renderHomeV7();
      else if(target==="livingday")r=window.NELivingDay?.open?.();
      else if(target==="lessonarchive")r=window.NELivingDay?.archive?.();
      else if(target==="chat")r=renderChatV7();
      else if(target==="story")r=renderStoryV7(data);
      else if(target==="hub")r=renderHubV7();
      else if(target==="forms"||target==="cloze")r=window.NEFunctionalPractice?.open(target);
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
  Object.assign(window,{v7ContinueToday,v7Step,v7Toggle,v7ChatSettings,v7ChatPref,v7UseTopic,v7ChatKey,v7SendChat,v7StartChat,v7ClearChat,v7OpenPlace,v7XpMission,renderChatV7,renderStoryV7});
  // Translate the selected word in its sentence without replacing the learner's answer.
  const wordTranslationsV7=new Map();
  function decorateWordsV7(){
    document.querySelectorAll('.ne-task-direction [lang="nb"],.prompt,.bubble-v7.nora,.daily-example b,.reinforcement-row b,.reinforcement-list b,.dialogue-scene-v83 p,.dialogue-task-v83 p,.lesson-intro-v6 .dialogue-lead-v83,.lesson-intro-v6 .lesson-words-v6 b,.ne-coach-hint,.nq-nora-note').forEach(container=>{
      const sentence=container.textContent;
      const walker=document.createTreeWalker(container,NodeFilter.SHOW_TEXT),nodes=[];
      while(walker.nextNode()){
        const node=walker.currentNode;
        if(!node.parentElement.closest('button,a,textarea,input,select,.word-translate-v7,.ne-bridge-gloss,[data-no-bridge]'))nodes.push(node);
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
    panel.innerHTML='<button class="btn ghost" aria-label="Закрыть перевод">Закрыть ×</button><h2>'+h(word)+'</h2><p class="word-translation-result-v7" aria-live="polite">Перевожу…</p><button type="button" class="btn secondary word-listen-v7">🔊 Произношение</button><p class="word-play-status-v7" aria-live="polite"></p>';
    const playWord=()=>{
      const button=panel.querySelector('.word-listen-v7'),status=panel.querySelector('.word-play-status-v7');
      status.textContent="Загружаю произношение…";
      try{
        const playback=window.neSpeakWord?window.neSpeakWord(word,button):speakText(word,.9,button);
        Promise.resolve(playback).then(result=>{
          if(!panel.isConnected)return;
          status.textContent=result?.source==="unavailable"?"Не удалось озвучить слово. Проверь звук на телефоне.":"Для повторения нажми «Произношение».";
        }).catch(()=>{if(panel.isConnected)status.textContent="Звук недоступен. Нажми «Произношение» ещё раз."});
      }catch{status.textContent="Звук недоступен. Попробуй ещё раз."}
    };
    panel.querySelector('button').onclick=()=>panel.remove();
    panel.querySelector('.word-listen-v7').onclick=playWord;
    panel.addEventListener('cancel',event=>{event.preventDefault();panel.remove()});
    panel.addEventListener('click',event=>{if(event.target===panel){const rect=panel.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)panel.remove()}});
    document.body.append(panel);panel.showModal();
    playWord(); // Immediate sound on the original word tap, without waiting for translation.
    const key=word.toLocaleLowerCase('nb')+'|'+sentence,result=panel.querySelector('.word-translation-result-v7');
    const known=window.NELanguageBridge?.knownNorwegian?.(word);
    if(known?.translation){
      const queued=window.NELanguageBridge?.queueForgotten?.(known.lemma);
      result.textContent=known.translation+(queued?' · добавлено в повторение':'');
      return;
    }
    if(wordTranslationsV7.has(key)){
      const translation=wordTranslationsV7.get(key);
      const queued=window.NELanguageBridge?.queueNorwegianLookup?.(word,translation);
      result.textContent=translation+(queued?' · добавлено в повторение':'');
      return;
    }
    try{
      const response=await neApiPost('/api/chat',{mode:'explain',level:state.level,message:'Переведи только слово «'+word+'» с норвежского на русский в предложении ниже. Начни ответ строго со строки ПЕРЕВОД: <одно-три слова по-русски>. Затем кратко укажи исходную форму и контекст, если необходимо. Не решай задание.',context:sentence.slice(0,1500)});
      if(!response.ok)throw new Error('TRANSLATION_FAILED');
      const translation=response.data.explanation_ru||response.data.translation_ru;
      if(!translation)throw new Error('EMPTY_TRANSLATION');
      wordTranslationsV7.set(key,translation);
      const queued=window.NELanguageBridge?.queueNorwegianLookup?.(word,translation);
      if(panel.isConnected)result.textContent=translation+(queued?' · добавлено в повторение':'');
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
