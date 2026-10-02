// Norsk Eventyr 6.0 — compact mobile-first interface
(() => {
  const oldNavigate=window.navigate;
  const baseRenderCourse=window.renderCourse;

  const activeGroup=(active)=>{
    if(["course","lesson","topic","daily","dailypractice","review","dictionary","dictation","grammarlab","pronunciation","listeninglab"].includes(active))return "study";
    if(active==="chat")return "chat";
    if(["story","storyepisode","storyjournal","storyside"].includes(active))return "story";
    if(["tests","exam","progress","placement","plan","cloud","settings","more"].includes(active))return "more";
    return "home";
  };
  function cloudOn(){try{return !!JSON.parse(localStorage.getItem("ne_cloud_link")||"null")}catch{return false}}
  function dueCount(){try{return window.neDueWords?neDueWords().length:0}catch{return 0}}
  function storyDone(){return Object.keys(state.story?.completed||{}).length}
  function nextLesson(){return COURSE.find(x=>x.level===state.level&&!state.completed?.[x.id])||COURSE.find(x=>x.level===state.level)||COURSE[0]}
  function levelPct(){const arr=COURSE.filter(x=>x.level===state.level);return arr.length?Math.round(arr.filter(x=>state.completed?.[x.id]).length/arr.length*100):0}
  function todayKey(){return window.neLocalDate?neLocalDate():new Date().toISOString().slice(0,10)}
  function dailyDone(){return !!state.dailyProgress?.[todayKey()]?.completed}

  nav=window.nav=function(active){
    const g=activeGroup(active),items=[["home","⌂","Главная"],["study","▤","Учиться"],["chat","◉","Разговор"],["story","◆","История"],["more","•••","Ещё"]];
    return '<nav class="nav nav-v6">'+items.map(function(x){
      const id=x[0],icon=x[1],label=x[2];
      const action=id==="study"?"navigate('course',state.level)":id==="story"?"navigate('story')":"navigate('"+id+"')";
      return '<button class="'+(g===id?"active":"")+'" onclick="'+action+'"><b>'+icon+'</b><span>'+label+'</span></button>';
    }).join("")+'</nav>';
  };

  shell=window.shell=function(content,active="home"){
    const lvl=state.level||"A1";
    document.getElementById("app").innerHTML=
      '<div class="shell shell-v6">'+
      '<header class="topbar topbar-v6">'+
        '<button class="brand brand-v6" onclick="navigate(\'home\')"><span class="brand-mark">N</span><span>Norsk <small>6.0</small></span></button>'+
        '<div class="top-actions-v6">'+
          '<button class="level-pill" onclick="navigate(\'course\',state.level)">'+esc(lvl)+'</button>'+
          '<span class="xp-v6">'+(state.xp||0)+' XP</span>'+
          '<button class="icon-btn" onclick="navigate(\'settings\')" aria-label="Настройки">⚙</button>'+
        '</div>'+
      '</header>'+
      '<main class="main-v6">'+content+'</main>'+nav(active)+'</div>';
  };

  navigate=window.navigate=function(view,data){
    if(view==="more")return renderMoreV6();
    if(view==="home")return renderHomeV6();
    return oldNavigate(view,data);
  };
  renderHome=window.renderHome=renderHomeV6;

  function renderHomeV6(){
    const lesson=nextLesson(),due=dueCount(),todayDone=dailyDone(),sDone=storyDone(),pct=levelPct();
    const weak=(window.neWeakSkills?neWeakSkills():[]).slice(0,2);
    shell(
      '<section class="home-v6">'+
        '<div class="welcome-v6"><div><span class="eyebrow">Сегодня · '+esc(state.level)+'</span><h1>Что делаем?</h1></div><div class="mini-progress-v6"><b>'+pct+'%</b><small>'+esc(state.level)+'</small></div></div>'+
        '<button class="continue-v6" onclick="navigate(\'lesson\',\''+escJs(lesson.id)+'\')"><span class="continue-icon">▶</span><span><small>Продолжить курс</small><b>'+esc(lesson.title)+'</b></span><span class="arrow">›</span></button>'+
        '<div class="daily-strip-v6">'+
          '<button onclick="navigate(\'daily\')" class="'+(todayDone?"done":"")+'"><span>5</span><b>'+(todayDone?"Слова готовы":"5 слов")+'</b><small>'+(todayDone?"✓ сегодня":"персонально")+'</small></button>'+
          '<button onclick="navigate(\'review\')" class="'+(due===0?"done":"")+'"><span>↻</span><b>Повтор</b><small>'+due+' сейчас</small></button>'+
          '<button onclick="navigate(\'chat\')"><span>◉</span><b>Разговор</b><small>AI · '+esc(state.level)+'</small></button>'+
          '<button onclick="navigate(\'story\')"><span>◆</span><b>Fjordvik</b><small>'+sDone+'/24</small></button>'+
        '</div>'+
        '<section class="focus-v6"><div class="section-head-v6"><div><small>На сегодня</small><h2>15–20 минут</h2></div><button onclick="navigate(\'plan\')">План ›</button></div><div class="focus-list-v6">'+
          focusRow(todayDone,"01","5 новых слов","Слова из твоих реальных пробелов","navigate('daily')")+
          focusRow(due===0,"02","Повторение",due?due+" слов ждут повторения":"На сегодня всё повторено","navigate('review')")+
          focusRow(false,"03","3 минуты речи","Ответь без готовых вариантов","navigate('chat')")+
        '</div></section>'+
        '<section class="quick-v6"><div class="section-head-v6"><h2>Быстро</h2></div><div class="quick-grid-v6">'+
          quick("🎧","Слушать","listeninglab")+quick("🎤","Произношение","pronunciation")+quick("✍","Диктант","dictation")+quick("✓","Тест","tests")+quick("★","Norskprøven","exam")+quick("↗","Прогресс","progress")+
        '</div></section>'+
        (weak.length?'<section class="weak-v6"><div class="section-head-v6"><h2>Подтянуть</h2><button onclick="navigate(\'progress\')">Подробнее ›</button></div><div class="weak-row-v6">'+weak.map(k=>'<div><span>'+esc(skillLabel(k))+'</span><b>'+Number(state.skills?.[k]||0)+'%</b><i><em style="width:'+Number(state.skills?.[k]||0)+'%"></em></i></div>').join("")+'</div></section>':'')+
      '</section>',
      "home"
    );
  }

  function focusRow(done,num,title,sub,action){return '<button class="focus-row-v6 '+(done?"done":"")+'" onclick="'+action+'"><span class="focus-num">'+(done?"✓":num)+'</span><span><b>'+title+'</b><small>'+sub+'</small></span><span class="arrow">›</span></button>'}
  function quick(icon,label,route){return '<button onclick="navigate(\''+route+'\')"><span>'+icon+'</span><b>'+label+'</b></button>'}

  renderCourse=window.renderCourse=function(level=state.level){
    state.level=level;saveState();
    const core=COURSE.filter(x=>x.level===level),done=core.filter(x=>state.completed?.[x.id]).length,p=core.length?Math.round(done/core.length*100):0;
    shell(
      '<div class="compact-head-v6"><button class="back-v6" onclick="navigate(\'home\')">←</button><div><small>Курс</small><h1>'+esc(level)+'</h1></div><span>'+done+'/'+core.length+'</span></div>'+
      '<div class="level-switch-v6">'+["A1","A2","B1","B2"].map(l=>'<button class="'+(l===level?"active":"")+'" onclick="renderCourse(\''+l+'\')">'+l+'</button>').join("")+'</div>'+
      '<div class="course-progress-v6"><i><em style="width:'+p+'%"></em></i><small>'+p+'% уровня</small></div>'+
      '<section class="lesson-list lesson-list-v6">'+core.map((x,i)=>{const d=!!state.completed?.[x.id];return '<button class="lesson-row-v6 '+(d?"done":"")+'" onclick="navigate(\'lesson\',\''+x.id+'\')"><span class="lesson-index-v6">'+(d?"✓":i+1)+'</span><span class="lesson-copy-v6"><b>'+x.icon+' '+esc(x.title)+'</b><small>'+esc(x.grammar)+'</small></span><span class="arrow">›</span></button>'}).join("")+'</section>'+
      '<button class="more-lessons-v6" onclick="renderTopicsV6(\''+level+'\')"><span>✨</span><span><b>Дополнительные темы</b><small>12 адаптивных AI-модулей</small></span><span class="arrow">›</span></button>',
      "course"
    );
  };

  window.renderTopicsV6=function(level){
    const topics=TOPIC_CATALOG.filter(x=>x.level===level);
    shell('<div class="compact-head-v6"><button class="back-v6" onclick="renderCourse(\''+level+'\')">←</button><div><small>'+level+'</small><h1>Доп. темы</h1></div></div>'+
      '<div class="topic-list-v6">'+topics.map(t=>'<button class="topic-row-v6" onclick="navigate(\'topic\',\''+t.id+'\')"><span>✨</span><span><b>'+esc(t.title)+'</b><small>'+esc(t.goal)+'</small></span><span class="arrow">›</span></button>').join("")+'</div>',
      "course");
  };

  function renderMoreV6(){
    shell('<div class="compact-head-v6"><button class="back-v6" onclick="navigate(\'home\')">←</button><div><small>Norsk Eventyr</small><h1>Все инструменты</h1></div></div>'+
      '<section class="more-v6">'+
        group("Учёба",[["5","5 слов","daily"],["↻","Повторение","review"],["▤","Словарь","dictionary"],["✍","Диктант","dictation"],["G","Грамматика","grammarlab"],["🎤","Произношение","pronunciation"],["🎧","Аудирование","listeninglab"]])+
        group("Проверка",[["✓","Тесты","tests"],["★","Norskprøven","exam"],["↗","Прогресс","progress"],["⌁","Определить уровень","placement"]])+
        group("Приложение",[["◆","Дневник Fjordvik","storyjournal"],["☁","Облако "+(cloudOn()?"✓":""),"cloud"],["⚙","Настройки","settings"]])+
      '</section>',"more");
  }
  function group(title,items){return '<div class="more-group-v6"><h2>'+title+'</h2><div>'+items.map(x=>'<button onclick="navigate(\''+x[2]+'\')"><span>'+x[0]+'</span><b>'+x[1]+'</b><span class="arrow">›</span></button>').join("")+'</div></div>'}

  const obs=new MutationObserver(()=>{
    const layout=document.querySelector(".chat-layout");
    if(layout&&!layout.dataset.v6){
      layout.dataset.v6="1";
      const settings=layout.querySelector(".chat-settings"),main=layout.querySelector(".chat-main");
      if(settings&&main){
        const toggle=document.createElement("button");toggle.className="chat-settings-toggle-v6";toggle.textContent="⚙ Настройки разговора";
        toggle.onclick=()=>settings.classList.toggle("open-v6");
        main.prepend(toggle);
      }
    }
  });
  obs.observe(document.getElementById("app"),{childList:true,subtree:true});

  setTimeout(()=>renderHomeV6(),160);
  Object.assign(window,{renderHomeV6,renderMoreV6});
})();