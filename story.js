// Norsk Eventyr 5.0 — Fjordvik story engine
(() => {
  state.story=state.story||{};
  state.story.completed=state.story.completed||{};
  state.story.stats=state.story.stats||{mot:0,tillit:0,nysgjerrighet:0};
  state.story.choices=state.story.choices||{};
  state.story.journal=state.story.journal||{};
  state.story.sideQuests=state.story.sideQuests||{};
  state.story.startedAt=state.story.startedAt||null;
  state.story.lastEpisode=state.story.lastEpisode||null;
  saveState();

  const baseNavigate=window.navigate;
  const baseShell=window.shell;
  let storySession=null;
  const STAT_LABEL={mot:"Смелость",tillit:"Доверие",nysgjerrighet:"Любопытство"};
  const STAT_ICON={mot:"⚡",tillit:"🤝",nysgjerrighet:"🔎"};

  function storyEpisodes(season){return STORY_EPISODES.filter(x=>x.season===season)}
  function completedCount(season=null){return Object.values(state.story.completed).filter(x=>!season||x.season===season).length}
  function totalCompleted(){return completedCount()}
  function storyPct(){return Math.round(totalCompleted()/STORY_EPISODES.length*100)}
  function isUnlocked(ep){
    const list=storyEpisodes(ep.season),i=list.findIndex(x=>x.id===ep.id);
    return i===0||Boolean(state.story.completed[list[i-1]?.id]);
  }
  function nextEpisode(){
    const preferred=STORY_SEASONS.find(s=>s.level===state.level);
    const pools=preferred?[...storyEpisodes(preferred.id),...STORY_EPISODES.filter(x=>x.season!==preferred.id)]:STORY_EPISODES;
    return pools.find(ep=>isUnlocked(ep)&&!state.story.completed[ep.id])||STORY_EPISODES.find(ep=>!state.story.completed[ep.id])||STORY_EPISODES[0];
  }
  function activeWords(){return window.neReinforcementWords?neReinforcementWords(8):[]}
  function storyBanner(){
    const next=nextEpisode(),pct=storyPct(),done=totalCompleted();
    return '<section class="story-banner card"><div class="story-banner-copy"><div class="eyebrow">Новый режим · Fjordvik</div><h2>Язык как история, а не как список упражнений</h2><p class="muted">24 сюжетные миссии A1–B2: персонажи, выборы, тайна синего блокнота, голосовые ответы и твои собственные слова внутри истории.</p><div class="row"><button class="btn story-primary" onclick="navigate(\'story\')">▶ Продолжить историю</button><button class="btn ghost" onclick="navigate(\'storyjournal\')">Дневник</button></div></div><div class="story-banner-progress"><div class="story-orb" style="--pct:'+pct+'%"><b>'+pct+'%</b></div><small>'+done+'/24 эпизодов</small><span class="tag">'+esc(next.level)+' · '+esc(next.title)+'</span></div></section>';
  }

  shell=window.shell=function(content,active="home"){
    if(active==="home"&&content.includes('<section class="hero">')&&!content.includes("story-banner"))content=storyBanner()+content;
    return baseShell(content,active);
  };

  navigate=window.navigate=function(view,data){
    stopTimer();
    if(view==="story")return renderStoryWorld(data);
    if(view==="storyepisode")return startStoryEpisode(data);
    if(view==="storyjournal")return renderStoryJournal();
    if(view==="storyside")return renderStorySideQuest();
    return baseNavigate(view,data);
  };

  function renderStoryWorld(seasonId=null){
    const current=seasonId||STORY_SEASONS.find(x=>x.level===state.level)?.id||"s1",season=STORY_SEASONS.find(x=>x.id===current)||STORY_SEASONS[0],eps=storyEpisodes(season.id),next=eps.find(x=>isUnlocked(x)&&!state.story.completed[x.id]),pct=storyPct(),sideDone=Boolean(state.story.sideQuests[localDay()]);
    shell('<div class="screen-head"><button class="back" onclick="navigate(\'home\')">←</button><div><div class="eyebrow">Fjordvik · интерактивная история</div><h2 style="margin:0">Учись, чтобы двигать сюжет</h2></div></div>'+
      '<section class="story-world-hero card"><div><div class="eyebrow">Общий прогресс</div><h1>Тайна синего блокнота</h1><p>Ты приезжаешь в вымышленный норвежский город Fjordvik. Обычные бытовые ситуации постепенно превращаются в историю, где язык нужен, чтобы понимать людей, принимать решения и раскрывать прошлое города.</p><div class="row"><button class="btn story-primary" onclick="navigate(\'storyepisode\',\''+escJs((next||nextEpisode()).id)+'\')">'+(next?"Продолжить: "+esc(next.title):"Открыть следующую главу")+'</button><button class="btn secondary" onclick="navigate(\'storyside\')">'+(sideDone?"✓ Побочная миссия":"🎲 Миссия дня")+'</button></div></div><div class="story-world-score"><div class="story-orb large" style="--pct:'+pct+'%"><b>'+pct+'%</b></div><div class="story-stats">'+Object.keys(STAT_LABEL).map(k=>'<span>'+STAT_ICON[k]+' '+STAT_LABEL[k]+' <b>'+Number(state.story.stats[k]||0)+'</b></span>').join("")+'</div></div></section>'+
      '<section class="story-season-tabs">'+STORY_SEASONS.map(s=>'<button class="'+(s.id===season.id?"active":"")+'" onclick="renderStoryWorld(\''+s.id+'\')"><span>'+s.icon+'</span><b>'+s.level+'</b><small>'+completedCount(s.id)+'/6</small></button>').join("")+'</section>'+
      '<div class="section-title"><div><div class="eyebrow">'+season.level+'</div><h2>'+esc(season.title)+'</h2><p class="muted">'+esc(season.subtitle)+'</p></div></div>'+
      '<section class="story-map">'+eps.map((ep,i)=>storyEpisodeCard(ep,i)).join("")+'</section>'+
      '<div class="section-title"><h2>Почему это не просто игра</h2></div><section class="grid3"><article class="card"><h3>🎭 Реальные ситуации</h3><p class="muted">Транспорт, работа, врач, жильё, kommune, переговоры, источники и презентации.</p></article><article class="card"><h3>🧠 Твои слова</h3><p class="muted">Активная лексика из твоего словаря появляется в свободных ответах и миссии дня.</p></article><article class="card"><h3>🎤 Свой ответ</h3><p class="muted">Сюжет требует говорить и писать самому. Ошибка не отнимает «жизни» — она становится материалом для обучения.</p></article></section>',"home");
  }

  function storyEpisodeCard(ep,i){
    const done=state.story.completed[ep.id],unlocked=isUnlocked(ep),boss=ep.boss;
    return '<article class="story-node '+(done?"done ":"")+(unlocked?"":"locked ")+'card"><div class="story-node-index">'+(done?"✓":i+1)+'</div><div class="story-node-body"><div class="row"><span class="level-badge">'+ep.level+'</span><span class="tag">'+esc(ep.district)+'</span>'+(boss?'<span class="tag boss">Финал главы</span>':'')+'</div><h3>'+esc(ep.title)+'</h3><p class="muted">'+esc(ep.hook)+'</p>'+(done?'<small>Результат: '+done.score+'% · '+new Date(done.date).toLocaleDateString("ru-RU")+'</small>':'')+'</div><button class="btn '+(done?"secondary":unlocked?"story-primary":"ghost")+'" '+(unlocked?'onclick="navigate(\'storyepisode\',\''+ep.id+'\')"':'disabled')+'>'+(done?"Переиграть":unlocked?"Начать":"Закрыто")+'</button></article>';
  }

  function startStoryEpisode(id){
    const ep=STORY_EPISODES.find(x=>x.id===id);if(!ep||!isUnlocked(ep))return renderStoryWorld(ep?.season);
    if(!state.story.startedAt)state.story.startedAt=new Date().toISOString();
    state.story.lastEpisode=id;saveState();touchStudy();
    storySession={episode:ep,step:0,choiceScore:null,listenScore:null,freeScore:null,decision:null,freeFeedback:null};
    renderStoryEpisode();
  }

  function renderStoryEpisode(){
    const s=storySession,ep=s.episode,step=s.step;let body="";
    if(step===0)body=storyIntro(ep);if(step===1)body=storyChoice(ep);if(step===2)body=storyListen(ep);if(step===3)body=storyFree(ep);if(step===4)body=storyDecision(ep);
    shell('<div class="screen-head"><button class="back" onclick="exitStoryEpisode()">←</button><div style="flex:1"><div class="eyebrow">'+ep.level+' · '+esc(ep.district)+(ep.boss?" · Финал главы":"")+'</div><h2 style="margin:0">'+esc(ep.title)+'</h2></div><span class="pill">'+(step+1)+'/5</span></div><div class="progress story-progress"><i style="width:'+Math.round((step+1)/5*100)+'%"></i></div><section class="story-scene">'+body+'</section>',"home");
  }

  function storyIntro(ep){
    const words=activeWords().slice(0,4);
    return '<article class="card story-dialogue-card"><div class="story-cinematic"><div class="story-location">📍 '+esc(ep.district)+'</div><div class="story-npc"><span>'+npcAvatar(ep.npc)+'</span><div><b>'+esc(ep.npc)+'</b><small>'+esc(ep.role)+'</small></div></div></div><div class="story-hook">'+esc(ep.hook)+'</div><p class="story-narrative">'+esc(ep.intro)+'</p>'+(words.length?'<div class="story-word-hint"><small>Твои активные слова могут пригодиться дальше:</small><div class="wordchips">'+words.map(w=>'<span class="wordchip">'+esc(w)+'</span>').join("")+'</div></div>':'')+'<button class="btn story-primary wide" onclick="storyNext()">Войти в сцену →</button></article>';
  }
  function npcAvatar(name){const map={Nora:"N",Amir:"A",Liv:"L",Ingrid:"I",Jonas:"J",Sara:"S",Maja:"M",Erik:"E",Sofie:"S",Thomas:"T",Anna:"A"};return map[name]||String(name||"?").slice(0,1)}

  function storyChoice(ep){
    return '<article class="card story-dialogue-card"><div class="story-npc"><span>'+npcAvatar(ep.npc)+'</span><div><b>'+esc(ep.npc)+'</b><small>'+esc(ep.role)+'</small></div></div><div class="prompt">'+esc(ep.choiceQ)+'</div><div class="choice-list">'+ep.choices.map((x,i)=>'<button class="choice" onclick="answerStoryChoice('+i+')">'+esc(x)+'</button>').join("")+'</div><div id="storyFb"></div></article>';
  }
  function answerStoryChoice(i){
    const s=storySession,ep=s.episode,ok=i===ep.correct;s.choiceScore=ok?100:35;
    if(window.neUpdateSkill){neUpdateSkill("grammar",ok?100:35);neUpdateSkill("speaking",ok?90:45)}
    document.querySelectorAll(".choice").forEach((b,j)=>{b.disabled=true;if(j===ep.correct)b.classList.add("good");if(j===i&&!ok)b.classList.add("bad")});
    document.getElementById("storyFb").innerHTML='<div class="feedback '+(ok?"good":"bad")+'"><b>'+(ok?"✅ Отлично":"↻ Запомни естественный вариант")+'</b><br>'+esc(ep.choiceExplain)+'</div><button class="btn story-primary wide" style="margin-top:10px" onclick="storyNext()">Дальше →</button>';
  }

  function storyListen(ep){
    return '<article class="card story-dialogue-card"><div class="eyebrow">Слушай, а не читай</div><div class="prompt">'+esc(ep.listenQ)+'</div><div class="story-audio-panel"><button class="btn story-primary" onclick="speakText(\''+escJs(ep.listen)+'\')">▶ Нормальная скорость</button><button class="btn ghost" onclick="speakText(\''+escJs(ep.listen)+'\',.72)">🐢 Медленнее</button></div><div class="choice-list">'+ep.listenOpts.map((x,i)=>'<button class="choice" onclick="answerStoryListen('+i+')">'+esc(x)+'</button>').join("")+'</div><div id="storyFb"></div></article>';
  }
  function answerStoryListen(i){
    const s=storySession,ep=s.episode,ok=i===ep.listenCorrect;s.listenScore=ok?100:30;
    if(window.neUpdateSkill)neUpdateSkill("listening",ok?100:30);
    document.querySelectorAll(".choice").forEach((b,j)=>{b.disabled=true;if(j===ep.listenCorrect)b.classList.add("good");if(j===i&&!ok)b.classList.add("bad")});
    document.getElementById("storyFb").innerHTML='<div class="feedback '+(ok?"good":"bad")+'">'+(ok?"✅ Ты понял смысл.":"❌ Прослушай ещё раз и свяжи ключевые слова со смыслом.")+'</div><button class="btn story-primary wide" style="margin-top:10px" onclick="storyNext()">Дальше →</button>';
  }

  function storyFree(ep){
    const words=activeWords().slice(0,5),prev=storySession.freeFeedback;
    return '<article class="card story-dialogue-card"><div class="eyebrow">Теперь без готовых вариантов</div><div class="prompt">'+esc(ep.freePrompt)+'</div><p class="muted">'+esc(ep.freeGoal)+'</p>'+(words.length?'<div class="story-word-hint"><small>Если это естественно, попробуй использовать одно из своих активных слов:</small><div class="wordchips">'+words.map(w=>'<span class="wordchip">'+esc(w)+'</span>').join("")+'</div></div>':'')+'<textarea id="storyAnswer" class="input story-answer" placeholder="Пиши по-норвежски или ответь голосом…"></textarea><div class="row" style="margin-top:10px"><button id="micBtn" class="btn secondary" onclick="toggleMic(\'storyAnswer\')">🎤 Ответить голосом</button><button class="btn story-primary" onclick="checkStoryFree()">🧠 Ответить</button></div><div id="storyFb">'+(prev||"")+'</div></article>';
  }
  async function checkStoryFree(){
    const s=storySession,ep=s.episode,a=document.getElementById("storyAnswer")?.value.trim();if(!a)return;
    const box=document.getElementById("storyFb");box.innerHTML='<div class="feedback">🧠 Персонаж слушает и оценивает смысл…</div>';
    const words=activeWords().slice(0,5),goal=ep.freeGoal+(words.length?" Если естественно, приветствуется использование знакомой лексики: "+words.join(", "):"");
    const r=await aiEvaluate({answer:a,question:ep.freePrompt,goal,level:ep.level,mode:"story_speaking"});
    if(!r.ok){s.freeScore=null;box.innerHTML='<div class="feedback bad">AI сейчас недоступен. Ответ сохранён как попытка, но не снижает результат.</div><button class="btn story-primary wide" style="margin-top:10px" onclick="storyNext()">Продолжить →</button>';return}
    const d=r.data,score=Math.max(0,Math.min(100,Number(d.score)||0));s.freeScore=score;
    if(window.neUpdateSkill){neUpdateSkill("speaking",score);neUpdateSkill("grammar",d.breakdown?.grammar??score);neUpdateSkill("vocabulary",d.breakdown?.vocabulary??score)}
    const html='<div class="feedback '+(score>=60?"good":"bad")+'"><b>'+score+'/100</b><br>'+esc(d.explanation_ru||"")+(d.corrected?'<br><br><b>Естественнее:</b><br>'+esc(d.corrected):"")+'</div><button class="btn story-primary wide" style="margin-top:10px" onclick="storyNext()">Продолжить историю →</button>';
    s.freeFeedback=html;box.innerHTML=html;
  }

  function storyDecision(ep){
    return '<article class="card story-decision-card"><div class="eyebrow">Здесь нет единственного правильного ответа</div><h2>'+esc(ep.decisionQ)+'</h2><p class="muted">Выбор влияет на твой профиль в Fjordvik, но не на оценку языка.</p><div class="decision-list">'+ep.decisions.map((x,i)=>'<button onclick="chooseStoryDecision('+i+')"><span>'+STAT_ICON[x.stat]+'</span><div><b>'+esc(x.text)+'</b><small>+'+x.delta+' · '+STAT_LABEL[x.stat]+'</small></div></button>').join("")+'</div></article>';
  }
  function chooseStoryDecision(i){
    const s=storySession,ep=s.episode,d=ep.decisions[i];s.decision={index:i,...d};state.story.stats[d.stat]=(state.story.stats[d.stat]||0)+Number(d.delta||1);state.story.choices[ep.id]=s.decision;saveState();finishStoryEpisode();
  }
  function storyNext(){storySession.step++;renderStoryEpisode()}

  function finishStoryEpisode(){
    const s=storySession,ep=s.episode,scores=[s.choiceScore,s.listenScore,s.freeScore].filter(x=>x!==null&&x!==undefined),score=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):0,first=!state.story.completed[ep.id];
    state.story.completed[ep.id]={id:ep.id,season:ep.season,level:ep.level,score,date:new Date().toISOString(),decision:s.decision?.text||"",stat:s.decision?.stat||""};
    state.story.journal[ep.id]={title:ep.title,ending:ep.ending,cliffhanger:ep.cliffhanger,decision:s.decision?.text||"",score,date:new Date().toISOString()};
    if(first)state.xp=(state.xp||0)+(ep.boss?60:30);else state.xp=(state.xp||0)+8;
    touchStudy();saveState();
    const postcard=ep.boss?STORY_POSTCARDS.find(x=>x.season===ep.season):null,next=nextEpisode();
    shell('<section class="card story-finish"><div class="story-finish-icon">'+(ep.boss?"🏆":"✨")+'</div><div class="eyebrow">'+(ep.boss?"Глава завершена":"Эпизод завершён")+'</div><h1>'+esc(ep.title)+'</h1><div class="story-result-score">'+score+'%</div><p class="story-ending">'+esc(ep.ending)+'</p>'+(postcard?'<div class="postcard"><span>'+postcard.icon+'</span><div><b>'+esc(postcard.title)+'</b><small>'+esc(postcard.text)+'</small></div></div>':'')+'<div class="cliffhanger"><small>Дальше</small>'+esc(ep.cliffhanger)+'</div><div class="row" style="justify-content:center;margin-top:18px"><button class="btn story-primary" onclick="navigate(\'storyepisode\',\''+escJs(next.id)+'\')">Следующий эпизод →</button><button class="btn secondary" onclick="navigate(\'story\',\''+ep.season+'\')">К карте</button></div></section>',"home");
    storySession=null;
  }
  function exitStoryEpisode(){if(!storySession||storySession.step===0||confirm("Выйти из эпизода? Пройденные шаги этого запуска не сохранятся.")){const season=storySession?.episode?.season;storySession=null;renderStoryWorld(season)}}

  function localDay(){return window.neLocalDate?neLocalDate():new Date().toISOString().slice(0,10)}
  function renderStorySideQuest(){
    const day=localDay(),done=state.story.sideQuests[day],words=activeWords().slice(0,4),npcs=["Nora","Amir","Liv","Ingrid","Sofie","Maja"],npc=npcs[new Date(day+"T12:00:00").getDate()%npcs.length];
    if(done){
      shell('<section class="card story-side-complete"><div style="font-size:56px">🎲</div><div class="eyebrow">Миссия дня выполнена</div><h1>'+done.score+'%</h1><p class="muted">Завтра появится новая короткая ситуация с другими активными словами.</p><button class="btn" onclick="navigate(\'story\')">К истории</button></section>',"home");return;
    }
    const prompt=sideQuestPrompt(npc,words);
    shell('<div class="screen-head"><button class="back" onclick="navigate(\'story\')">←</button><div><div class="eyebrow">Миссия дня · 3–5 минут</div><h2 style="margin:0">Случайная встреча с '+npc+'</h2></div></div><section class="card story-side"><div class="story-npc"><span>'+npcAvatar(npc)+'</span><div><b>'+npc+'</b><small>Fjordvik</small></div></div><div class="prompt">'+esc(prompt)+'</div>'+(words.length?'<div class="wordchips">'+words.map(w=>'<span class="wordchip">'+esc(w)+'</span>').join("")+'</div>':'')+'<textarea id="sideAnswer" class="input" placeholder="Ответь своими словами по-норвежски…"></textarea><div class="row" style="margin-top:10px"><button id="micBtn" class="btn secondary" onclick="toggleMic(\'sideAnswer\')">🎤 Голосом</button><button class="btn story-primary" onclick="checkStorySide()">Ответить</button></div><div id="sideFb"></div></section>',"home");
  }
  function sideQuestPrompt(npc,words){
    const variants=[npc+" пишет: «Я опаздываю на встречу. Объясни, как ты отреагируешь и что предложишь».",npc+" спрашивает, как прошёл твой день. Ответь 3–5 предложениями и добавь один план на завтра.",npc+" просит совета: выбрать автобус или идти пешком. Сравни варианты и объясни выбор.",npc+" хочет узнать твоё мнение о новой идее в городе. Выскажи позицию и одну причину.",npc+" не понял твоё предыдущее сообщение. Переформулируй его простыми и ясными словами."];
    let p=variants[new Date(localDay()+"T12:00:00").getDate()%variants.length];if(words.length)p+=" Если естественно, используй хотя бы одно из слов: "+words.join(", ")+".";
    return p;
  }
  async function checkStorySide(){
    const day=localDay(),a=document.getElementById("sideAnswer")?.value.trim();if(!a)return;
    const box=document.getElementById("sideFb"),words=activeWords().slice(0,4),q=sideQuestPrompt("Собеседник",words);box.innerHTML='<div class="feedback">🧠 Проверяю…</div>';
    const r=await aiEvaluate({answer:a,question:q,goal:"Естественно ответить в короткой реальной ситуации. Смысл важнее дословного совпадения.",level:state.level||"A1",mode:"story_side"});
    if(!r.ok){box.innerHTML='<div class="feedback bad">Проверка временно недоступна.</div>';return}
    const d=r.data,score=Number(d.score||0);state.story.sideQuests[day]={score,date:new Date().toISOString()};state.xp=(state.xp||0)+10;touchStudy();saveState();
    box.innerHTML='<div class="feedback '+(score>=60?"good":"bad")+'"><b>'+score+'/100</b><br>'+esc(d.explanation_ru||"")+(d.corrected?'<br><br><b>Естественнее:</b> '+esc(d.corrected):"")+'</div><button class="btn wide" style="margin-top:10px" onclick="navigate(\'story\')">Готово</button>';
  }

  function renderStoryJournal(){
    const entries=STORY_EPISODES.filter(x=>state.story.journal[x.id]),cards=STORY_POSTCARDS.filter(x=>storyEpisodes(x.season).every(ep=>state.story.completed[ep.id]));
    shell('<div class="screen-head"><button class="back" onclick="navigate(\'story\')">←</button><div><div class="eyebrow">Дневник Fjordvik</div><h2 style="margin:0">Твои решения и пройденные главы</h2></div></div>'+
      '<section class="grid3"><div class="kpi"><small>Эпизоды</small><strong>'+totalCompleted()+'/24</strong></div><div class="kpi"><small>Сильная черта</small><strong>'+bestStat()+'</strong></div><div class="kpi"><small>Открытки</small><strong>'+cards.length+'/4</strong></div></section>'+
      '<div class="section-title"><h2>Открытки глав</h2></div><section class="postcard-grid">'+(cards.length?cards.map(x=>'<article class="postcard large"><span>'+x.icon+'</span><div><b>'+esc(x.title)+'</b><small>'+esc(x.text)+'</small></div></article>').join(""):'<article class="card"><div class="empty">Первая открытка откроется после финала A1.</div></article>')+'</section>'+
      '<div class="section-title"><h2>Хроника</h2></div><section class="story-journal-list">'+(entries.length?entries.slice().reverse().map(ep=>{const j=state.story.journal[ep.id];return '<article class="card"><div class="row"><span class="level-badge">'+ep.level+'</span><span class="tag">'+esc(ep.district)+'</span><span class="tag">'+j.score+'%</span></div><h3>'+esc(ep.title)+'</h3><p>'+esc(j.ending)+'</p>'+(j.decision?'<small><b>Твой выбор:</b> '+esc(j.decision)+'</small>':'')+'</article>'}).join(""):'<article class="card"><div class="empty">Дневник пока пуст. Начни первый эпизод.</div></article>')+'</section>',"home");
  }
  function bestStat(){const x=Object.entries(state.story.stats).sort((a,b)=>b[1]-a[1])[0];return x&&x[1]>0?STAT_ICON[x[0]]+" "+STAT_LABEL[x[0]]:"—"}

  Object.assign(window,{renderStoryWorld,startStoryEpisode,storyNext,answerStoryChoice,answerStoryListen,checkStoryFree,chooseStoryDecision,exitStoryEpisode,renderStorySideQuest,checkStorySide,renderStoryJournal});
})();