// Norsk Eventyr 4.1 — contextual vocabulary acquisition
(() => {
  state.wordPracticeQueue=state.wordPracticeQueue||{};
  state.lexicalCandidates=state.lexicalCandidates||{};
  state.lexicalCapture=state.lexicalCapture||{detected:0,reactivated:0,last:null};
  saveState();

  const baseNavigate=window.navigate;
  const baseAiEvaluate=window.aiEvaluate;
  const baseSendChat=window.sendChat;
  const baseAnswerReview=window.answerReview;
  let dictQuery="",dictZone="all",dictPos="all",dailyGenerationBusy=false;

  function dateKey(){return window.neLocalDate?neLocalDate():new Date().toISOString().slice(0,10)}
  function dateDiff(a,b=dateKey()){
    if(!a)return 999;
    const x=new Date(a+"T12:00:00"),y=new Date(b+"T12:00:00");
    return Math.max(0,Math.round((y-x)/86400000));
  }
  function lexKey(s){
    return String(s||"").toLowerCase().normalize("NFKC").trim().replace(/^å\s+/,"").replace(/[.,!?;:"'()[\]{}]/g,"").replace(/\s+/g," ");
  }
  function studyAge(x){const n=Number(x.firstDayNumber);return Number.isFinite(n)&&n>0?Math.max(0,(state.dailyDayCount||n)-n):dateDiff(x.firstDate)}
  function zoneOf(x){const d=studyAge(x);return d===0?"today":d<=2?"active":"longterm"}
  function refreshLongTermSchedule(){
    const now=Date.now();
    for(const [k,x] of Object.entries(state.dailyDictionary||{})){
      if(zoneOf(x)!=="longterm"||x.longTermSince)continue;
      x.longTermSince=new Date().toISOString();
      const delay=(x.wrong||0)>0?86400000:7*86400000;
      x.nextDue=now+delay;
      const s=state.srs?.[k];if(s){s.stage=Math.max(Number(s.stage)||0,2);s.due=x.nextDue}
    }
  }
  function dictionaryList(){
    const map=new Map();
    for(const [key,x] of Object.entries(state.srs||{}))map.set(lexKey(x.word||key),{key,lemma:x.word||key,translation_ru:x.translation||"",level:x.level,strength:Math.min(100,(x.stage||0)*16),nextDue:x.due});
    for(const x of Object.values(state.dailyDictionary||{})){
      const key=lexKey(x.lemma||x.word);map.set(key,{...map.get(key),...x});
    }
    return [...map.values()];
  }
  function findKnown(lemma){
    const k=lexKey(lemma);
    return dictionaryList().find(x=>lexKey(x.lemma||x.word)===k)||null;
  }
  function pendingCandidates(){
    return Object.values(state.lexicalCandidates||{}).filter(x=>x.status!=="dismissed"&&x.status!=="selected"&&!findKnown(x.lemma)).sort((a,b)=>{
      const pa=(a.occurrences||1)*100+(a.confidence||.8)*20+Date.parse(a.lastSeen||0)/1e12;
      const pb=(b.occurrences||1)*100+(b.confidence||.8)*20+Date.parse(b.lastSeen||0)/1e12;
      return pb-pa;
    });
  }
  function smartReviewEntries(limit=15){
    const now=Date.now();
    return dictionaryList().map(x=>{
      const daysAgo=dateDiff(x.firstDate),age=studyAge(x),zone=zoneOf(x),due=(x.nextDue||0)<=now,weak=100-(x.strength||20);
      const active=zone==="today"?1400:zone==="active"?(1200-daysAgo*80):0;
      return {...x,daysAgo,studyAge:age,zone,_p:(state.wordPracticeQueue[lexKey(x.lemma||x.word)]?5000:0)+active+(due?320:0)+weak+(x.wrong||0)*18};
    }).sort((a,b)=>b._p-a._p).slice(0,limit);
  }
  function smartReviewWords(limit=15){return smartReviewEntries(limit).map(x=>x.lemma||x.word)}

  function toast(text){
    let e=document.getElementById("lexToast");
    if(!e){e=document.createElement("div");e.id="lexToast";e.className="lex-toast";document.body.appendChild(e)}
    e.textContent=text;e.classList.add("show");clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove("show"),3200);
  }

  function storeCandidate(c,source){
    const key=lexKey(c.target_lemma);if(!key)return null;
    const known=findKnown(key);
    if(known){
      known.wrong=(known.wrong||0)+1;
      known.strength=Math.max(5,(known.strength||20)-18);
      known.nextDue=Date.now();
      known.reactivatedAt=new Date().toISOString();
      state.lexicalCapture.reactivated=(state.lexicalCapture.reactivated||0)+1;
      state.lexicalCapture.last={type:"reactivated",lemma:known.lemma||known.word,date:new Date().toISOString()};
      saveState();
      toast("Вернул в повторение: "+(known.lemma||known.word));
      return {reactivated:true,lemma:known.lemma||known.word};
    }
    const old=state.lexicalCandidates[key]||{};
    state.lexicalCandidates[key]={
      ...old,
      key,
      lemma:c.target_lemma,
      translation_ru:c.translation_ru,
      kind:c.kind||"phrase",
      reason_ru:c.reason_ru||"",
      corrected_sentence:c.corrected_sentence||"",
      source_fragment:c.source_fragment||"",
      source:source||old.source||"answer",
      confidence:Math.max(Number(old.confidence)||0,Number(c.confidence)||0),
      occurrences:(old.occurrences||0)+1,
      firstSeen:old.firstSeen||new Date().toISOString(),
      lastSeen:new Date().toISOString(),
      status:"pending"
    };
    state.lexicalCapture.detected=(state.lexicalCapture.detected||0)+1;
    state.lexicalCapture.last={type:"candidate",lemma:c.target_lemma,date:new Date().toISOString()};
    saveState();
    toast("Кандидат на изучение: "+c.target_lemma+" — "+c.translation_ru);
    return {candidate:true,lemma:c.target_lemma};
  }

  async function captureLexicalGaps(text,context="",level=state.level||"A1",source="answer",force=false){
    const s=String(text||"").trim();if(!s)return [];
    const hasRu=/[\u0400-\u04FF]/.test(s);
    if(!force&&!hasRu)return [];
    const r=await neApiPost("/api/evaluate",{action:"lexical_gap",text:s,context,level,source});
    if(!r.ok||!Array.isArray(r.data?.candidates))return [];
    const out=[];for(const c of r.data.candidates){const x=storeCandidate(c,source);if(x)out.push(x)}
    return out;
  }

  aiEvaluate=window.aiEvaluate=async function(payload){
    const r=await baseAiEvaluate(payload);
    const answer=String(payload?.answer||"");
    const should=/[\u0400-\u04FF]/.test(answer)||r?.data?.error_tag==="vocabulary";
    if(should){
      try{await captureLexicalGaps(answer,payload?.question||payload?.goal||"",payload?.level||state.level,payload?.mode||"answer",true)}catch{}
    }
    return r;
  };

  if(baseAnswerReview){
    answerReview=window.answerReview=function(...args){
      const key=args[0],r=baseAnswerReview(...args);
      if(args[1]===args[2])delete state.wordPracticeQueue[lexKey(state.srs?.[key]?.word||key)];
      const s=state.srs?.[key],d=state.dailyDictionary?.[key];
      if(s&&d)d.nextDue=s.due;
      saveState();
      return r;
    };
  }

  if(baseSendChat){
    sendChat=window.sendChat=async function(){
      const msg=document.getElementById("chatInput")?.value.trim()||"";
      const before=(state.chatHistory||[]).length;
      const result=await baseSendChat();
      const last=(state.chatHistory||[]).at(-1),meta=last?.role==="assistant"?(last.meta||{}):{};
      const should=/[\u0400-\u04FF]/.test(msg)||meta.error_tag==="vocabulary";
      if(msg&&should){
        try{await captureLexicalGaps(msg,state.chatPrefs?.topic||"Свободный разговор",state.chatPrefs?.level||state.level,"samtale",true)}catch{}
      }
      return result;
    };
  }

  function registerPack(pack){
    const date=pack.date||dateKey(),now=Date.now();
    (pack.words||[]).forEach(w=>{
      const k=lexKey(w.lemma||w.word);if(!k)return;
      const existingKey=Object.keys(state.dailyDictionary||{}).find(x=>lexKey(state.dailyDictionary[x]?.lemma||state.dailyDictionary[x]?.word)===k);
      const storeKey=existingKey||k,old=state.dailyDictionary[storeKey]||{};
      state.dailyDictionary[storeKey]={...old,...w,key:storeKey,firstDate:old.firstDate||date,firstDayNumber:old.firstDayNumber||pack.dayNumber||state.dailyDayCount||1,lastSeen:date,exposures:(old.exposures||0)+1,correct:old.correct||0,wrong:old.wrong||0,strength:old.strength??20,nextDue:old.nextDue||now+86400000};
      if(!state.srs[storeKey])state.srs[storeKey]={word:w.lemma||w.word,translation:w.translation_ru,level:pack.level,stage:0,due:now+86400000,seen:0,correct:0};
      const ck=w.candidate_key||k;
      if(state.lexicalCandidates[ck]){state.lexicalCandidates[ck].status="selected";state.lexicalCandidates[ck].selectedDate=date}
      else{
        const found=Object.keys(state.lexicalCandidates).find(x=>lexKey(state.lexicalCandidates[x]?.lemma)===k);
        if(found){state.lexicalCandidates[found].status="selected";state.lexicalCandidates[found].selectedDate=date}
      }
    });
    (pack.review_words||[]).forEach(word=>{const e=findKnown(word);if(e){e.exposures=(e.exposures||0)+1;e.lastSeen=date}});
    saveState();
  }

  async function generateSmartDailyPack(){
    if(dailyGenerationBusy)return;
    const date=dateKey(),level=state.level||"A1";if(state.dailyPacks?.[date])return renderSmartDaily();
    dailyGenerationBusy=true;try{
    shell('<section class="card loading-card"><div class="spinner"></div><h2>Собираю персональные 5 слов</h2><p class="muted">Сначала беру слова и конструкции, которых тебе реально не хватило в речи и письме. Остальное дополняю полезной лексикой уровня.</p></section>',"home");
    const revision=window.neScreenRevision;
    const review=smartReviewEntries(15).filter(x=>x.daysAgo>0||x.zone==="longterm").map(x=>({word:x.lemma||x.word,translation_ru:x.translation_ru,daysAgo:x.daysAgo,strength:x.strength||20,zone:x.zone}));
    const candidates=pendingCandidates().slice(0,10).map(x=>({key:x.key,lemma:x.lemma,translation_ru:x.translation_ru,kind:x.kind,occurrences:x.occurrences,confidence:x.confidence,reason_ru:x.reason_ru}));
    const dayNumber=(state.dailyDayCount||0)+1;
    const r=await neApiPost("/api/daily",{level,date,knownWords:dictionaryList().map(x=>x.lemma||x.word),reviewWords:review,candidateWords:candidates,weakSkills:neWeakSkills?neWeakSkills():[],dayNumber});
    if(!r.ok){if(revision!==window.neScreenRevision)return;shell('<section class="card"><h2>Не удалось подготовить домашнее задание</h2><p class="muted">'+esc(r.error||"")+'</p><button class="btn" onclick="navigate(\'daily\')">Назад</button></section>',"home");return}
    const pack=r.data;pack.date=date;pack.level=level;pack.dayNumber=dayNumber;
    state.dailyPacks[date]=pack;state.dailyProgress[date]={completed:false,scores:[]};state.dailyDayCount=dayNumber;
    const dates=Object.keys(state.dailyPacks).sort();while(dates.length>120){const old=dates.shift();delete state.dailyPacks[old];delete state.dailyProgress[old]}
    registerPack(pack);if(revision===window.neScreenRevision)renderSmartDaily();
    }finally{dailyGenerationBusy=false}
  }

  function wordCard(w,i){
    const forms=(w.forms||[]).map(x=>'<tr><td>'+esc(x.label)+'</td><td><b>'+esc(x.form)+'</b></td></tr>').join("");
    const examples=(w.examples||[]).map(x=>'<div class="daily-example"><span class="tag">'+esc(x.label)+'</span><button class="mini-audio" onclick="speakText(\''+escJs(x.no)+'\')">🔊</button><b>'+esc(x.no)+'</b><div class="muted">'+esc(x.ru)+'</div></div>').join("");
    return '<article class="card daily-word-card '+(w.source==="learner"?"learner-word":"")+'"><div class="row"><span class="lesson-num">'+(i+1)+'</span><div><div class="eyebrow">'+(w.source==="learner"?"Из твоей речи · ":"")+(w.pos?esc(w.pos):"слово")+'</div><h2>'+esc(w.lemma||w.word)+' <button class="mini-audio" onclick="speakText(\''+escJs(w.lemma||w.word)+'\')">🔊</button></h2><div class="daily-translation">'+esc(w.translation_ru)+'</div></div></div>'+(forms?'<table class="forms-table"><tbody>'+forms+'</tbody></table>':'')+'<div class="daily-examples">'+examples+'</div>'+(w.collocation?'<div class="notice"><b>Часто вместе:</b> '+esc(w.collocation)+'</div>':'')+(w.note_ru?'<p class="muted daily-note">'+esc(w.note_ru)+'</p>':'')+'<a class="btn ghost link-btn" target="_blank" rel="noopener" href="https://ordbokene.no/bm/'+encodeURIComponent(w.lemma||w.word)+'">Bokmålsordboka ↗</a></article>';
  }

  function renderSmartDaily(){
    refreshLongTermSchedule();saveState();
    const date=dateKey(),pack=state.dailyPacks?.[date],done=state.dailyProgress?.[date]?.completed;
    const head='<div class="screen-head"><button class="back" onclick="navigate(\'home\')">←</button><h2>Домашнее задание</h2></div>';
    if(!pack){
      shell(head+'<section class="card"><h3>Изучи и попробуй сам</h3><p>Разбери слова и примеры, затем используй их в своих ответах. Задание учитывает то, что тебе нужно повторить.</p><button class="btn" onclick="generateSmartDailyPack()">Получить задание</button></section><section class="card" style="margin-top:14px"><p>Какое слово хочешь изучить?</p><div class="row"><input id="manualGap" class="input compact" placeholder="Слово или выражение по-русски"><button class="btn secondary" onclick="addManualGap()">Добавить</button></div></section>',"home");return;
    }
    shell(head+'<p>Изучи слова и примеры. Затем выполни задания своими словами.</p><section class="daily-word-list">'+(pack.words||[]).map(wordCard).join("")+'</section>'+
    ((pack.reinforcement_sentences||[]).length?'<section class="card" style="margin-top:14px"><h3>Примеры для закрепления</h3>'+pack.reinforcement_sentences.map(x=>'<p><button class="mini-audio" onclick="speakText(\''+escJs(x.no)+'\')">🔊</button> <b>'+esc(x.no)+'</b><br>'+esc(x.ru)+'</p>').join("")+'</section>':'')+
    '<section class="card" style="margin-top:14px"><button class="btn" onclick="navigate(\'dailypractice\',\''+date+'\')">'+(done?'Повторить задание':'Выполнить задание')+'</button> <button class="btn secondary" onclick="navigate(\'learnedwords\')">Выученные слова</button></section>',"home");
  }

  function candidateListHtml(list){
    if(!list.length)return '<div class="empty">Пока очередь пуста. Пиши и говори своими словами — приложение само найдёт недостающую лексику.</div>';
    return '<div class="candidate-list">'+list.map(x=>'<div class="candidate-row"><div><b>'+esc(x.lemma)+'</b> <span class="tag">'+esc(x.translation_ru)+'</span><small>'+esc(x.reason_ru||"Обнаружено в твоём ответе")+'</small>'+(x.corrected_sentence?'<small><b>Пример исправления:</b> '+esc(x.corrected_sentence)+'</small>':'')+'</div><div><span class="pill">×'+(x.occurrences||1)+'</span> <button class="mini-btn" onclick="dismissCandidate(\''+escJs(x.key)+'\')">Уже знаю</button></div></div>').join("")+'</div>';
  }

  async function addManualGap(){
    const f=document.getElementById("manualGap"),v=f?.value.trim();if(!v)return;
    const r=await captureLexicalGaps("Я не знаю, как сказать по-норвежски: "+v,"Ручное добавление полезной лексики",state.level||"A1","manual",true);
    if(r.length)renderSmartDaily();
  }
  function dismissCandidate(key){if(state.lexicalCandidates[key]){state.lexicalCandidates[key].status="dismissed";saveState();if(document.getElementById("smartDictionaryList"))renderSmartDictionary();else renderSmartDaily()}}

  function renderSmartDictionary(){
    refreshLongTermSchedule();saveState();
    const all=dictionaryList().sort((a,b)=>String(b.firstDate||"").localeCompare(String(a.firstDate||""))),pending=pendingCandidates(),counts={today:0,active:0,longterm:0};
    all.forEach(x=>counts[zoneOf(x)]++);
    shell('<div class="screen-head"><button class="back" onclick="navigate(\'daily\')">←</button><div><div class="eyebrow">Персональный словарь</div><h2 style="margin:0">'+all.length+' изученных единиц</h2></div></div>'+
    '<section class="grid3"><div class="kpi"><small>Сегодня</small><strong>'+counts.today+'</strong></div><div class="kpi"><small>Закрепляем 3 дня</small><strong>'+counts.active+'</strong></div><div class="kpi"><small>Долгосрочно</small><strong>'+counts.longterm+'</strong></div></section>'+
    '<div class="section-title"><h2>Очередь из твоей речи</h2><span class="tag">'+pending.length+'</span></div><section class="card">'+candidateListHtml(pending.slice(0,12))+'</section>'+
    '<div class="section-title"><h2>Все изученные</h2></div><section class="card dictionary-tools"><input id="smartDictSearch" class="input compact" placeholder="Найти слово или перевод…" value="'+esc(dictQuery)+'" oninput="smartDictSearch(this.value)"><div class="row" style="margin-top:10px"><select class="input compact" onchange="smartDictZone(this.value)"><option value="all">Все зоны</option><option value="today" '+(dictZone==="today"?"selected":"")+'>Сегодня</option><option value="active" '+(dictZone==="active"?"selected":"")+'>Закрепляем</option><option value="longterm" '+(dictZone==="longterm"?"selected":"")+'>Долгосрочно</option></select><select class="input compact" onchange="smartDictPos(this.value)"><option value="all">Все части речи</option>'+["verb","modal","noun","adjective","adverb","function","phrase"].map(p=>'<option value="'+p+'" '+(dictPos===p?"selected":"")+'>'+p+'</option>').join("")+'</select></div></section><div id="smartDictionaryList">'+dictionaryHtml(all)+'</div>',"home");
  }
  function dictionaryHtml(all){
    const q=dictQuery.toLowerCase().trim(),filtered=all.filter(x=>(dictZone==="all"||zoneOf(x)===dictZone)&&(dictPos==="all"||x.pos===dictPos)&&(!q||String(x.lemma||x.word).toLowerCase().includes(q)||String(x.translation_ru||"").toLowerCase().includes(q)));
    if(!filtered.length)return '<section class="card"><div class="empty">Ничего не найдено.</div></section>';
    return '<section class="dictionary-list">'+filtered.map(x=>{
      const zone=zoneOf(x),forms=(x.forms||[]).map(f=>'<span><small>'+esc(f.label)+'</small><b>'+esc(f.form)+'</b></span>').join(""),examples=(x.examples||[]).map(e=>'<div><button class="mini-audio" onclick="speakText(\''+escJs(e.no)+'\')">🔊</button> '+esc(e.no)+' <span class="muted">— '+esc(e.ru)+'</span></div>').join("");
      const zl=zone==="today"?"сегодня":zone==="active"?"закрепляем":"долгосрочно";
      return '<details class="card dictionary-entry"><summary><div><b class="dictionary-word">'+esc(x.lemma||x.word)+'</b><span class="muted"> · '+esc(x.translation_ru)+'</span></div><div class="row"><span class="tag">'+zl+'</span><span class="tag">'+Math.round(x.strength||20)+'%</span></div></summary><div class="dictionary-body">'+(x.source==="learner"?'<div class="notice"><b>Источник:</b> слово пришло из твоей собственной речи/письма.</div>':'')+'<button class="btn ghost" onclick="event.preventDefault();speakText(\''+escJs(x.lemma||x.word)+'\')">🔊 Произношение</button><div class="forms-grid">'+forms+'</div>'+(x.collocation?'<p><b>Сочетание:</b> '+esc(x.collocation)+'</p>':'')+'<div class="dictionary-examples">'+examples+'</div><div class="row"><small>Изучено: '+esc(x.firstDate||"—")+' · встречалось: '+(x.exposures||1)+' раз · ошибок: '+(x.wrong||0)+'</small><a class="btn ghost link-btn" target="_blank" rel="noopener" href="https://ordbokene.no/bm/'+encodeURIComponent(x.lemma||x.word)+'">Bokmålsordboka ↗</a></div></div></details>';
    }).join("")+'</section>';
  }
  function smartDictSearch(v){dictQuery=v;const e=document.getElementById("smartDictionaryList");if(e)e.innerHTML=dictionaryHtml(dictionaryList().sort((a,b)=>String(b.firstDate||"").localeCompare(String(a.firstDate||""))))}
  function smartDictZone(v){dictZone=v;renderSmartDictionary()}
  function smartDictPos(v){dictPos=v;renderSmartDictionary()}

  let learnedQuery="",learnedFilter="all";
  state.wordFavorites=state.wordFavorites||{};
  function learnedEntries(){return dictionaryList().sort((a,b)=>String(a.lemma||a.word).localeCompare(String(b.lemma||b.word),"nb"))}
  function learnedHtml(){
    const query=lexKey(learnedQuery);
    const rows=learnedEntries().filter(x=>{
      const key=lexKey(x.lemma||x.word),matches=!query||[x.lemma||x.word,x.translation_ru,...(x.forms||[]).map(f=>f.form)].some(v=>lexKey(v).includes(query));
      return matches&&(learnedFilter==='all'||learnedFilter==='favorites'&&state.wordFavorites[key]||learnedFilter==='review'&&(state.wordPracticeQueue[key]||Number(x.nextDue)<=Date.now()));
    });
    if(!rows.length)return '<div class="card">'+(learnedEntries().length?'Слово не найдено.':'Слова появятся после изучения уроков и личной лексики.')+'</div>';
    return rows.map(x=>{
      const key=lexKey(x.lemma||x.word);
      return '<article class="card learned-word-row-v8"><span class="word-picture-v8">📖</span><div><h3>'+esc(x.lemma||x.word)+'</h3><p>'+esc(x.translation_ru)+'</p></div><button class="word-star-v8" aria-label="'+(state.wordFavorites[key]?'Убрать из избранного':'В избранное')+'" onclick="toggleLearnedFavorite(\''+escJs(key)+'\')">'+(state.wordFavorites[key]?'★':'☆')+'</button><div class="row"><button class="btn secondary" onclick="speakText(\''+escJs(x.lemma||x.word)+'\')">Слушать</button><button class="btn" onclick="queueLearnedWord(\''+escJs(key)+'\')">В повтор и задания</button></div><small>'+(state.wordPracticeQueue[key]?'Добавлено в ближайшее повторение и задания':'')+'</small></article>';
    }).join('');
  }
  function toggleLearnedFavorite(key){state.wordFavorites[key]=!state.wordFavorites[key];saveState();searchLearnedWords(learnedQuery)}
  function filterLearnedWords(filter){learnedFilter=filter;renderLearnedWords()}
  function addLearnedWord(){
    const word=document.getElementById('newLearnedWord')?.value.trim(),translation=document.getElementById('newLearnedTranslation')?.value.trim();
    if(!word||!translation){document.getElementById('newWordFeedback').textContent='Введи слово и его перевод.';return}
    const key=lexKey(word),existing=Object.entries(state.srs||{}).find(([id,item])=>lexKey(item.word||id)===key),id=existing?.[0]||key;
    state.srs[id]={...(state.srs[id]||{stage:0,seen:0,correct:0}),word,translation,level:state.level,due:Date.now()};
    state.wordPracticeQueue[key]=Date.now();learnedQuery='';learnedFilter='all';saveState();renderLearnedWords();
  }

  function renderLearnedWords(){
    shell('<div class="screen-head"><button class="back" onclick="navigate(\'hub\')">←</button><h2>Мои слова</h2></div><p>Найди слово и верни его в практику.</p><input id="learnedSearch" class="input" placeholder="Норвежское слово или русский перевод…" value="'+esc(learnedQuery)+'" oninput="searchLearnedWords(this.value)"><div class="word-filter-v8">'+[['all','Все'],['review','Повторение'],['favorites','Избранное']].map(([key,label])=>'<button class="'+(learnedFilter===key?'active':'')+'" onclick="filterLearnedWords(\''+key+'\')">'+label+'</button>').join('')+'</div><div id="learnedList">'+learnedHtml()+'</div><button class="btn secondary" style="margin-top:14px" onclick="navigate(\'review\')">Начать повторение</button><details class="card word-add-v8"><summary>＋ Добавить слово</summary><input id="newLearnedWord" class="input" placeholder="Слово по-норвежски" maxlength="100"><input id="newLearnedTranslation" class="input" placeholder="Перевод по-русски" maxlength="200"><button class="btn" onclick="addLearnedWord()">Сохранить и повторить</button><p id="newWordFeedback" aria-live="polite"></p></details>',"hub");
  }
  function searchLearnedWords(value){learnedQuery=value;const list=document.getElementById('learnedList');if(list)list.innerHTML=learnedHtml()}
  function queueLearnedWord(key){
    const x=learnedEntries().find(x=>lexKey(x.lemma||x.word)===key);if(!x)return;
    const existing=Object.entries(state.srs||{}).find(([k,v])=>lexKey(v.word||k)===key),srsKey=existing?.[0]||key;
    if(!state.srs[srsKey])state.srs[srsKey]={word:x.lemma||x.word,translation:x.translation_ru,level:x.level||state.level,stage:0,seen:0,correct:0};
    state.srs[srsKey].due=Date.now();
    const daily=findKnown(x.lemma||x.word);if(daily&&state.dailyDictionary[daily.key||key])state.dailyDictionary[daily.key||key].nextDue=Date.now();
    state.wordPracticeQueue[key]=Date.now();saveState();searchLearnedWords(learnedQuery);
  }
  Object.assign(window,{renderLearnedWords,searchLearnedWords,queueLearnedWord,toggleLearnedFavorite,filterLearnedWords,addLearnedWord});

  navigate=window.navigate=function(view,data){
    if(view==="learnedwords")return renderLearnedWords();
    if(view==="daily")return renderSmartDaily();
    if(view==="dictionary")return renderSmartDictionary();
    return baseNavigate(view,data);
  };

  generateDailyPack=window.generateDailyPack=generateSmartDailyPack;
  renderDaily=window.renderDaily=renderSmartDaily;
  renderDictionary=window.renderDictionary=renderSmartDictionary;
  neReinforcementWords=window.neReinforcementWords=smartReviewWords;

  Object.assign(window,{captureLexicalGaps,generateSmartDailyPack,renderSmartDaily,renderSmartDictionary,addManualGap,dismissCandidate,smartDictSearch,smartDictZone,smartDictPos});

  setTimeout(()=>{if(Object.keys(state.lexicalCandidates||{}).length||Object.keys(state.dailyDictionary||{}).length)saveState()},400);
})();