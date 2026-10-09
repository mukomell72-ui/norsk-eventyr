// Norsk Eventyr 3.0 — adaptive layer
(() => {
  const SKILLS=["reading","listening","writing","speaking","grammar","vocabulary"];
  state.skills=state.skills||Object.fromEntries(SKILLS.map(k=>[k,50]));
  for(const k of SKILLS) if(typeof state.skills[k]!=="number") state.skills[k]=50;
  state.srs=state.srs||{};
  state.errors=state.errors||{};
  state.generatedLessons=state.generatedLessons||{};
  state.placement=state.placement||null;
  state.completedTopics=state.completedTopics||{};
  state.chatHistory=Array.isArray(state.chatHistory)?state.chatHistory.slice(-40):[];
  state.noraMemory=state.noraMemory&&typeof state.noraMemory==="object"&&!Array.isArray(state.noraMemory)?state.noraMemory:{introduced:false,conversationCount:0,lastTopic:"",lastPracticeDate:""};
  if(!state.noraMemory.introduced&&(state.completed?.["a1-1"]===true||
      state.chatHistory.some(x=>x.role==="user")||
      Object.values(state.chatThreads||{}).some(t=>Array.isArray(t)&&t.some(x=>x?.role==="user")))){
    state.noraMemory.introduced=true;
  }
  state.chatPrefs=state.chatPrefs||{level:state.level||"A1",mode:"free",topic:"",scenario:"butikk",autoSpeak:true};
  state.dailyPacks=state.dailyPacks||{};
  state.dailyDictionary=state.dailyDictionary||{};
  state.dailyProgress=state.dailyProgress||{};
  state.dailyDayCount=Number(state.dailyDayCount)||Object.keys(state.dailyPacks).length;
  saveState();

  let neSession=sessionStorage.getItem("ne_session")||"",micBusy=false,speechAudio=null,speechRequest=0,speechActiveButton=null,speechAudioContext=null;
  const speechCache=new Map(),SPEECH_CACHE_LIMIT=12;
  let placementSession=null,reviewSession=null,examV3=null,dailyTaskSession=null,mediaRecorder=null,mediaStream=null,recordChunks=[],recordTimer=null,recordStartedAt=0,chatInputWasVoice=false;
  const MIC_CONSTRAINTS={audio:{channelCount:{ideal:1},sampleRate:{ideal:48000},echoCancellation:true,noiseSuppression:true,autoGainControl:true}};
  function micStreamAlive(){
    return !!(mediaStream&&mediaStream.getAudioTracks?.().some(t=>t.readyState==="live"));
  }
  async function getMicStream(){
    if(micStreamAlive()){
      mediaStream.getAudioTracks().forEach(t=>t.enabled=true);
      return mediaStream;
    }
    mediaStream=await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
    mediaStream.getAudioTracks().forEach(t=>t.enabled=true);
    return mediaStream;
  }
  function parkMicStream(){
    if(!micStreamAlive())return;
    mediaStream.getAudioTracks().forEach(t=>t.enabled=false);
  }
  function releaseMicStream(){
    try{mediaStream?.getTracks?.().forEach(t=>t.stop())}catch{}
    mediaStream=null;
  }
  window.addEventListener("pagehide",event=>{
    if(mediaRecorder?.state==="recording")mediaRecorder.stop();
    if(event.persisted)parkMicStream();else releaseMicStream();
  });


  function skillLabel(k){return SKILL_NAMES[k]||k}
  function updateSkill(k,score){
    if(!SKILLS.includes(k))return;
    const old=Number(state.skills[k]??50);
    state.skills[k]=Math.max(0,Math.min(100,Math.round(old*.78+Number(score)*.22)));
    saveState();
  }
  function rememberError(tag){
    if(!tag)return;
    state.errors[tag]=(state.errors[tag]||0)+1;saveState();
  }
  function weakSkills(){return [...SKILLS].sort((a,b)=>state.skills[a]-state.skills[b]).slice(0,3)}
  function todayMs(){const d=new Date();d.setHours(0,0,0,0);return d.getTime()}
  function dueWords(){return Object.entries(state.srs).filter(([,v])=>(v.due||0)<=Date.now()).sort((a,b)=>(a[1].due||0)-(b[1].due||0))}
  function localDateKey(d=new Date()){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return y+"-"+m+"-"+day}
  function daysBetween(a,b=localDateKey()){const x=new Date(a+"T12:00:00"),y=new Date(b+"T12:00:00");return Math.max(0,Math.round((y-x)/86400000))}
  function dictionaryEntries(){return Object.values(state.dailyDictionary||{})}
  function knownDailyWords(){return Object.keys(state.dailyDictionary||{})}
  function reinforcementEntries(limit=15){
    const now=Date.now(),today=localDateKey();
    return dictionaryEntries().map(x=>{
      const daysAgo=daysBetween(x.firstDate||today,today),zone=daysAgo===0?"today":daysAgo<=2?"active":"longterm",due=(x.nextDue||0)<=now?1:0,weak=100-(x.strength||20);
      const activePriority=zone==="today"?1400:zone==="active"?(1200-daysAgo*80):0;
      const longPriority=due*320+weak+(x.wrong||0)*18+Math.max(0,30-daysAgo);
      return {...x,daysAgo,zone,_priority:activePriority+longPriority};
    }).sort((a,b)=>b._priority-a._priority).slice(0,limit);
  }
  function reinforcementWordList(limit=15){if(window.neReinforcementWords&&window.neReinforcementWords!==reinforcementWordList)return window.neReinforcementWords(limit);return reinforcementEntries(limit).map(x=>x.lemma||x.word)}
  function registerDailyPack(pack){
    const date=pack.date||localDateKey(),now=Date.now();
    (pack.words||[]).forEach(w=>{
      const key=String(w.lemma||w.word).toLowerCase().trim();if(!key)return;
      const old=state.dailyDictionary[key]||{};
      state.dailyDictionary[key]={...old,...w,key,firstDate:old.firstDate||date,lastSeen:date,exposures:(old.exposures||0)+1,correct:old.correct||0,wrong:old.wrong||0,strength:old.strength??20,nextDue:old.nextDue||now+86400000};
      if(!state.srs[key])state.srs[key]={word:w.lemma||w.word,translation:w.translation_ru,level:pack.level,stage:0,due:now,seen:0,correct:0};
    });
    (pack.review_words||[]).forEach(word=>{
      const key=String(word).toLowerCase().trim(),e=state.dailyDictionary[key];if(e){e.exposures=(e.exposures||0)+1;e.lastSeen=date}
    });
    saveState();
  }
  function updateDailyStrength(words,score){
    const now=Date.now(),days=score>=85?7:score>=70?4:score>=55?2:1;
    (words||[]).forEach(word=>{
      const key=String(word).toLowerCase().trim(),e=state.dailyDictionary[key];if(!e)return;
      e.exposures=(e.exposures||0)+1;e.strength=Math.max(0,Math.min(100,Math.round((e.strength||20)*.72+score*.28)));
      if(score>=55)e.correct=(e.correct||0)+1;else e.wrong=(e.wrong||0)+1;
      e.nextDue=now+days*86400000;e.lastSeen=localDateKey();
    });saveState();
  }
  function seedSrs(lesson){
    (lesson.vocab||[]).forEach(([word,translation])=>{
      const key=String(word).toLowerCase();
      if(!state.srs[key]) state.srs[key]={word,translation,level:lesson.level,stage:0,due:Date.now(),seen:0,correct:0};
      else {state.srs[key].translation=translation;state.srs[key].level=lesson.level}
    });
    saveState();
  }
  async function ensureSession(force=false){
    if(neSession&&!force)return neSession;
    const r=await fetch("/api/session",{method:"POST",headers:{"Content-Type":"application/json",...(window.NEAccess?.headers?.()||{})}});
    if(!r.ok)throw new Error("SESSION");
    const d=await r.json();neSession=d.token;sessionStorage.setItem("ne_session",neSession);return neSession;
  }
  async function apiPost(path,payload){
    try{
      await ensureSession();
      let r=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json","x-ne-session":neSession,...(window.NEAccess?.headers?.()||{})},body:JSON.stringify(payload)});
      if(r.status===401){await ensureSession(true);r=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json","x-ne-session":neSession,...(window.NEAccess?.headers?.()||{})},body:JSON.stringify(payload)})}
      if(!r.ok){const d=await r.json().catch(()=>({}));if(["APPROVAL_REQUIRED","LOGIN_REQUIRED"].includes(d.code))window.NEAccess?.status();return {ok:false,error:d.code||d.error||("HTTP "+r.status)}}
      const ct=r.headers.get("content-type")||"";
      return ct.includes("application/json")?{ok:true,data:await r.json()}:{ok:true,response:r};
    }catch(e){return {ok:false,error:"NETWORK"}}
  }

  aiEvaluate=async function(payload){
    const r=await apiPost("/api/evaluate",payload);
    return r.ok?{ok:true,data:r.data}:{ok:false,error:r.error};
  };

  function restoreSpeechButton(btn){
    if(!btn)return;
    if(btn.dataset.speechOriginal!==undefined)btn.innerHTML=btn.dataset.speechOriginal;
    btn.classList.remove("speech-loading","speech-playing");
    btn.disabled=false;
    if(speechActiveButton===btn)speechActiveButton=null;
  }
  function setSpeechButton(btn,stateName){
    if(!btn)return;
    if(btn.dataset.speechOriginal===undefined)btn.dataset.speechOriginal=btn.innerHTML;
    btn.classList.remove("speech-loading","speech-playing");
    if(stateName==="loading"){btn.classList.add("speech-loading");btn.innerHTML=btn.classList.contains("mini-audio")?"…":"⏳ Готовлю голос…";btn.disabled=true}
    if(stateName==="playing"){btn.classList.add("speech-playing");btn.innerHTML=btn.classList.contains("mini-audio")?"🔊":"🔊 Нора говорит…";btn.disabled=true}
    speechActiveButton=btn;
  }
  function stopSpeechPlayback(){
    speechAudio?.pause();speechAudio=null;
    window.speechSynthesis?.cancel();
    restoreSpeechButton(speechActiveButton);
  }
  function speechKey(text,level,voice="marin"){return String(level||"A1")+"\n"+String(voice||"marin")+"\n"+String(text||"").trim()}
  function trimSpeechCache(){
    while(speechCache.size>SPEECH_CACHE_LIMIT){
      const [key,item]=speechCache.entries().next().value||[];
      if(!key)break;
      if(item?.url)URL.revokeObjectURL(item.url);
      speechCache.delete(key);
    }
  }
  async function getSpeechAudio(text,level,voice="marin"){
    const key=speechKey(text,level,voice),cached=speechCache.get(key);
    if(cached?.url)return cached;
    if(cached?.promise)return cached.promise;
    const promise=(async()=>{
      const r=await apiPost("/api/speech",{text,level,voice});
      if(!r.ok)throw new Error(r.error||"SPEECH_FAILED");
      const blob=await r.response.blob(),url=URL.createObjectURL(blob),item={url};
      speechCache.set(key,item);trimSpeechCache();return item;
    })().catch(e=>{speechCache.delete(key);throw e});
    speechCache.set(key,{promise});return promise;
  }
  function primeSpeech(text,level=(lessonSession?.lesson?.level)||state.level||"A1"){
    if(!String(text||"").trim()||window.NEHumanVoice?.has?.(text))return;
    getSpeechAudio(text,level).catch(()=>{});
  }
  function fallbackSpeech(text,rate=.9,btn=null){
    if(!("speechSynthesis" in window)){restoreSpeechButton(btn);return}
    speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang="nb-NO";u.rate=rate;
    const v=speechSynthesis.getVoices().find(x=>/^nb|no/i.test(x.lang));if(v)u.voice=v;
    u.onstart=()=>setSpeechButton(btn,"playing");u.onend=()=>restoreSpeechButton(btn);u.onerror=()=>restoreSpeechButton(btn);
    speechSynthesis.speak(u);
  }
  speakText=async function(text,rate=.9,btn=null,voice="marin"){
    btn=btn||(document.activeElement?.tagName==="BUTTON"?document.activeElement:null);
    const request=++speechRequest;stopSpeechPlayback();setSpeechButton(btn,"loading");
    // Prefer a licensed real-human Nora recording when an exact clip exists.
    try{
      if(window.NEHumanVoice?.has?.(text)){
        setSpeechButton(btn,"playing");
        const played=await window.NEHumanVoice.play(text,rate);
        if(played){setTimeout(()=>restoreSpeechButton(btn),Math.max(900,String(text).length*65));return {source:"human",speaker:window.NEHumanVoice.speaker}}
      }
    }catch{}
    const level=(lessonSession?.lesson?.level)||state.level||"A1";
    try{
      const item=await getSpeechAudio(text,level,voice);if(request!==speechRequest){restoreSpeechButton(btn);return}
      const a=new Audio(item.url);speechAudio=a;a.preload="auto";a.volume=1;
      a.playbackRate=Math.max(.75,Math.min(1.25,Number(rate)/.9||1));
      try{
        const AC=window.AudioContext||window.webkitAudioContext;
        if(AC){
          speechAudioContext=speechAudioContext||new AC();
          if(speechAudioContext.state==="suspended")await speechAudioContext.resume();
          const src=speechAudioContext.createMediaElementSource(a);
          const high=speechAudioContext.createBiquadFilter();high.type="highpass";high.frequency.value=90;high.Q.value=.7;
          const low=speechAudioContext.createBiquadFilter();low.type="lowpass";low.frequency.value=9500;low.Q.value=.7;
          const comp=speechAudioContext.createDynamicsCompressor();comp.threshold.value=-24;comp.knee.value=18;comp.ratio.value=2.2;comp.attack.value=.004;comp.release.value=.16;
          src.connect(high).connect(low).connect(comp).connect(speechAudioContext.destination);
        }
      }catch{}
      a.onplaying=()=>setSpeechButton(btn,"playing");
      a.onended=()=>{speechAudio=null;restoreSpeechButton(btn)};
      a.onerror=()=>{speechAudio=null;restoreSpeechButton(btn)};
      await a.play();return {source:"ai"};
    }catch{
      if(request!==speechRequest){restoreSpeechButton(btn);return}
      fallbackSpeech(text,rate,btn);return {source:"browser"};
    }
  };
  window.nePrimeSpeech=primeSpeech;

  function normSpeech(s){return String(s||"").toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}\s]/gu,"").replace(/\s+/g," ").trim()}
  function similarity(a,b){
    a=normSpeech(a);b=normSpeech(b);if(!a||!b)return 0;
    const x=a.split(" "),y=b.split(" "),dp=Array.from({length:x.length+1},()=>Array(y.length+1).fill(0));
    for(let i=0;i<=x.length;i++)dp[i][0]=i;for(let j=0;j<=y.length;j++)dp[0][j]=j;
    for(let i=1;i<=x.length;i++)for(let j=1;j<=y.length;j++)dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(x[i-1]===y[j-1]?0:1));
    return Math.max(0,Math.round((1-dp[x.length][y.length]/Math.max(x.length,y.length))*100));
  }
  async function blobToBase64(blob){return new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(String(fr.result).split(",")[1]);fr.onerror=reject;fr.readAsDataURL(blob)})}
  async function blobToWavBase64(blob){
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error("NO_AUDIO_CONTEXT");
    const ac=new AC(),buf=await ac.decodeAudioData((await blob.arrayBuffer()).slice(0)),len=buf.length,channels=buf.numberOfChannels,sr=buf.sampleRate;
    const out=new ArrayBuffer(44+len*2),v=new DataView(out);
    const w=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};
    w(0,"RIFF");v.setUint32(4,36+len*2,true);w(8,"WAVE");w(12,"fmt ");v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,"data");v.setUint32(40,len*2,true);
    const data=Array.from({length:channels},(_,i)=>buf.getChannelData(i));let o=44;
    for(let i=0;i<len;i++){let s=0;for(let c=0;c<channels;c++)s+=data[c][i];s=Math.max(-1,Math.min(1,s/channels));v.setInt16(o,s<0?s*0x8000:s*0x7fff,true);o+=2}
    await ac.close();let bin="",u=new Uint8Array(out);for(let i=0;i<u.length;i+=0x8000)bin+=String.fromCharCode(...u.subarray(i,i+0x8000));return btoa(bin);
  }
  toggleMic=async function(target="freeAnswer",expected="",context=""){
    const btn=target==="chatInput"?document.getElementById("chatMicBtn"):(document.getElementById("micBtn")||document.getElementById("pronBtn"));
    if(mediaRecorder&&mediaRecorder.state==="recording"){mediaRecorder.stop();return}
    if(micBusy)return;
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){
      const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
      if(!SR)return alert("Запись речи недоступна в этом браузере.");
      const rec=new SR();rec.lang="nb-NO";rec.interimResults=true;const f=document.getElementById(target);
      rec.onstart=()=>{if(btn)btn.textContent="■ Слушаю…"};rec.onresult=e=>{let t="";for(let i=e.resultIndex;i<e.results.length;i++)t+=e.results[i][0].transcript;f.value=t};
      rec.onend=()=>{if(btn)btn.textContent="🎤 Говорить"};rec.start();return;
    }
    try{
      micBusy=true;
      const recordedField=document.getElementById(target);
      mediaStream=await getMicStream();recordChunks=[];recordStartedAt=Date.now();
      const preferredMime=["audio/webm;codecs=opus","audio/webm","audio/mp4"].find(x=>MediaRecorder.isTypeSupported?.(x));
      try{mediaRecorder=new MediaRecorder(mediaStream,preferredMime?{mimeType:preferredMime,audioBitsPerSecond:128000}:{audioBitsPerSecond:128000})}catch{mediaRecorder=preferredMime?new MediaRecorder(mediaStream,{mimeType:preferredMime}):new MediaRecorder(mediaStream)};
      mediaRecorder.ondataavailable=e=>{if(e.data.size)recordChunks.push(e.data)};
      mediaRecorder.onerror=()=>{clearTimeout(recordTimer);mediaRecorder=null;micBusy=false;parkMicStream();if(btn)btn.textContent="🎤 Говорить";alert("Запись прервалась. Попробуй ещё раз.")};
      mediaRecorder.onstop=async()=>{
        const recorder=mediaRecorder,chunks=recordChunks.slice(),field=recordedField;
        try{
        clearTimeout(recordTimer);if(btn)btn.textContent="⏳ Распознаю…";
        const blob=new Blob(chunks,{type:(recorder.mimeType||"audio/webm").split(";")[0]});
        parkMicStream();mediaRecorder=null;
        const durationMs=Date.now()-recordStartedAt;recordStartedAt=0;
        if(blob.size<900||durationMs<650){if(btn)btn.textContent="🎤 Говорить";alert("Запись слишком короткая. Нажми микрофон, начни говорить и останови запись после фразы.");return}
        const b64=await blobToBase64(blob);
        const transcribePromise=apiPost("/api/transcribe",{audioBase64:b64,mime:blob.type,expected,context});
        const pronouncePromise=expected?blobToWavBase64(blob).then(wav=>apiPost("/api/pronounce",{audioBase64:wav,expected})).catch(()=>null):Promise.resolve(null);
        const [r,pron]=await Promise.all([transcribePromise,pronouncePromise]);
        if(r.ok){
          const text=r.data.text||"",f=document.getElementById(target);if(f===field&&field?.isConnected){f.value=text;f.dataset.fromVoice="true"}if(target==="chatInput"&&f===field&&field?.isConnected)chatInputWasVoice=true;
          if(expected){
            const fallback=similarity(text,expected),box=document.getElementById("pronFb"),p=pron&&pron.ok?pron.data:null,sc=p?.score??fallback;
            if(box)box.innerHTML='<div class="feedback '+(sc>=70?"good":"bad")+'"><b>Произношение: '+sc+'/100</b><br>'+(p?esc(p.pronunciation_ru||""):'Речь оценена по точности распознавания.')+(p?'<br><small>Разборчивость '+p.clarity+' · ритм '+p.rhythm+' · соответствие образцу '+p.accuracy+'</small>':'')+(p?.difficult_words?.length?'<br><b>Потренировать:</b> '+p.difficult_words.map(esc).join(", "):'')+'<br><small>AI-оценка аудиозаписи для тренировки, не оценка официального экзаменатора.</small></div>';
            updateSkill("speaking",sc);
          }
        }else{
          const msg=r.error==="NO_SPEECH"?"Речь не распознана. Попробуй говорить чуть громче и ближе к телефону.":"Не удалось обработать запись. Попробуй записать фразу ещё раз.";
          alert(msg);
        }
        if(btn)btn.textContent="🎤 Говорить";
        }catch{alert("Не удалось обработать запись. Попробуй ещё раз.")}
        finally{micBusy=false;parkMicStream();if(btn)btn.textContent="🎤 Говорить";}
      };
      mediaRecorder.start(250);if(btn)btn.textContent="■ Слушаю…";
      recordTimer=setTimeout(()=>{if(mediaRecorder?.state==="recording")mediaRecorder.stop()},30000);
    }catch(e){
      micBusy=false;parkMicStream();if(btn)btn.textContent="🎤 Говорить";
      alert(e?.name==="NotAllowedError"?"Разреши микрофон для этого сайта в настройках браузера. Выбери постоянное разрешение, если браузер предлагает его.":"Не удалось включить микрофон. Проверь, что он доступен, и попробуй снова.");
    }
  };

  const adaptiveRenderLesson=window.renderLesson,adaptiveLessonNext=window.lessonNext,adaptiveLessonChoice=window.lessonChoice,adaptiveCheckFree=window.checkFree,adaptiveFinishLesson=window.finishLesson;
  const oldNavigate=navigate;
  navigate=function(view,data){
    stopTimer();
    if(view==="placement")return renderPlacement();
    if(view==="review")return renderReview();
    if(view==="daily")return renderDaily();
    if(view==="dictionary")return renderDictionary();
    if(view==="dailypractice")return startDailyPractice(data);
    if(view==="chat")return renderChat();
    if(view==="topic")return startTopic(data);
    if(view==="exampart")return startExamPart(data?.part||data,data?.band||null);
    return oldNavigate(view,data);
  };
  nav=function(active){
    const a=[["home","⌂","Главная"],["course","▤","Курс"],["chat","◉","Разговор"],["review","↻","Повтор"],["tests","✓","Тесты"],["exam","★","Экзамен"],["progress","↗","Прогресс"]];
    return '<nav class="nav nav7">'+a.map(x=>'<button class="'+(active===x[0]?"active":"")+'" onclick="navigate(\''+x[0]+'\')"><b>'+x[1]+'</b>'+x[2]+'</button>').join("")+'</nav>';
  };

  renderHome=function(){
    const next=COURSE.find(x=>x.level===state.level&&!state.completed[x.id])||lessons(state.level)[0],due=dueWords().length,weak=weakSkills(),gen=Object.keys(state.completedTopics).length,last=state.examHistory.at(-1);
    shell('<section class="hero"><div class="card hero-main"><div class="eyebrow">Norsk Eventyr 3.0 · адаптивный Bokmål</div><h1>Учись своими ответами, а не угадыванием.</h1><p class="muted">Свободное письмо и речь, интервальное повторение, естественное AI-аудирование, входной тест и экзаменационная практика.</p><div class="row"><button class="btn" onclick="navigate(\'lesson\',\''+next.id+'\')">Продолжить: '+esc(next.title)+'</button><button class="btn secondary" onclick="navigate(\'daily\')">5 новых слов сегодня</button><button class="btn secondary" onclick="navigate(\'chat\')">◉ Норвежский собеседник</button><button class="btn secondary" onclick="navigate(\'review\')">Повторить слова · '+due+'</button>'+(state.placement?'':'<button class="btn ghost" onclick="navigate(\'placement\')">Определить уровень</button>')+'</div></div>'+
    '<div class="card"><div class="metric"><span>Основные уроки</span><strong>'+Object.keys(state.completed).length+'/'+COURSE.length+'</strong></div><div class="metric"><span>Расширенные темы</span><strong>'+gen+'/'+TOPIC_CATALOG.length+'</strong></div><div class="metric"><span>Серия</span><strong>'+state.streak+' дн.</strong></div><div class="metric"><span>Последний экзамен</span><strong>'+(last?(last.score??last.ai??"—")+"%":"—")+'</strong></div></div></section>'+
    '<div class="section-title"><div><div class="eyebrow">Адаптивный план</div><h2>Слабые навыки</h2></div></div><section class="grid3">'+weak.map(k=>'<article class="card"><div class="eyebrow">'+skillLabel(k)+'</div><div class="big">'+state.skills[k]+'%</div><div class="progress"><i style="width:'+state.skills[k]+'%"></i></div></article>').join("")+'</section>'+
    '<div class="section-title"><h2>Уровни</h2></div><section class="grid">'+LEVELS.map(l=>'<article class="card level-card"><div class="row"><span class="level-badge">'+l+'</span><span class="tag">'+completed(l)+'/'+lessons(l).length+' основных</span></div><div class="big">'+l+'</div><p class="muted">'+levelDesc(l)+'</p><div class="progress"><i style="width:'+levelProgress(l)+'%"></i></div><br><button class="btn secondary" onclick="state.level=\''+l+'\';saveState();navigate(\'course\',\''+l+'\')">Открыть уровень</button></article>').join("")+'</section>'+
    '<div class="section-title"><h2>Что изменилось</h2></div><section class="grid3"><article class="card"><h3>↻ Повторение</h3><p class="muted">Слова возвращаются по интервалам 1–3–7–14–30–60 дней.</p></article><article class="card"><h3>🎧 Живая речь</h3><p class="muted">Аудирование использует AI-голоса; голос синтетический, не запись человека.</p></article><article class="card"><h3>🧭 Входной тест</h3><p class="muted">Определяет стартовый уровень и отдельные слабые навыки.</p></article><article class="card"><h3>◉ Samtale</h3><p class="muted">Свободный норвежский собеседник на любую тему, A1–B2, текстом или голосом.</p></article><article class="card"><h3>5 слов в день</h3><p class="muted">Каждый день 5 новых слов с формами и временами; старые слова постоянно возвращаются в следующих заданиях.</p></article></section>',"home");
  };

  renderCourse=function(level=state.level){
    state.level=level;saveState();const core=lessons(level),topics=TOPIC_CATALOG.filter(x=>x.level===level);
    shell('<div class="screen-head"><button class="back" onclick="navigate(\'home\')">←</button><div><div class="eyebrow">Курс '+level+'</div><h2 style="margin:0">'+levelDesc(level)+'</h2></div></div>'+
    '<div class="row">'+LEVELS.map(l=>'<button class="btn '+(l===level?"":"ghost")+'" onclick="renderCourse(\''+l+'\')">'+l+'</button>').join("")+'</div>'+
    '<div class="section-title"><h2>Основные уроки</h2><span class="tag">7 этапов каждый</span></div><section class="lesson-list">'+core.map((x,i)=>'<article class="card lesson-card '+(state.completed[x.id]?"done":"")+'"><div class="lesson-num">'+(state.completed[x.id]?"✓":i+1)+'</div><div><h3>'+x.icon+' '+esc(x.title)+'</h3><div class="meta">'+esc(x.grammar)+' · грамматика · словарь · аудирование · чтение · письмо · речь</div></div><button class="btn '+(state.completed[x.id]?"secondary":"")+'" onclick="navigate(\'lesson\',\''+x.id+'\')">'+(state.completed[x.id]?"Повторить":"Начать")+'</button></article>').join("")+'</section>'+
    '<div class="section-title"><div><div class="eyebrow">Расширенная программа</div><h2>12 тематических модулей '+level+'</h2></div><span class="tag">AI создаёт новый вариант</span></div><section class="grid">'+topics.map(t=>'<article class="card topic-card"><div class="row"><span class="level-badge">'+t.level+'</span>'+(state.completedTopics[t.id]?'<span class="tag">✓ пройден</span>':'')+'</div><h3>'+esc(t.title)+'</h3><p class="muted">'+esc(t.goal)+'</p><small>'+esc(t.grammar)+'</small><br><br><button class="btn secondary" onclick="navigate(\'topic\',\''+t.id+'\')">'+(state.generatedLessons[t.id]?"Открыть / новый вариант":"Создать урок")+'</button></article>').join("")+'</section>',"course");
  };

  async function startTopic(id){
    const topic=TOPIC_CATALOG.find(x=>x.id===id);if(!topic)return;
    shell('<section class="card loading-card"><div class="spinner"></div><h2>Создаю урок «'+esc(topic.title)+'»</h2><p class="muted">Новый текст, словарь, грамматика, письмо и устная практика.</p></section>',"course");
    const revision=window.neScreenRevision;
    let lesson=state.generatedLessons[id];
    const r=await apiPost("/api/generate",{kind:"lesson",level:topic.level,topic:topic.title,goal:topic.goal,weakSkills:weakSkills(),reviewWords:reinforcementWordList(15)});
    if(r.ok){
      const d=r.data;
      if(d&&Array.isArray(d.vocab)&&Array.isArray(d.opts)){
        lesson={id:"gen-"+id,topicId:id,level:topic.level,title:d.title||topic.title,icon:"✨",grammar:d.grammarTitle||topic.grammar,phrase:d.phrase,ru:d.ru,vocab:d.vocab,read:d.read,q:d.q,opts:d.opts,correct:Number(d.correct)||0,writing:d.writing,speaking:d.speaking,grammarData:d};
        state.generatedLessons[id]=lesson;saveState();
      }
    }
    if(revision!==window.neScreenRevision)return;
    if(!lesson){alert("Не удалось создать урок. Попробуй ещё раз.");return renderCourse(topic.level)}
    state.level=lesson.level;lessonSession={lesson,step:0,locked:false,xpScores:[]};touchStudy();renderLesson();
  }

  function grammarDataFor(l){
    if(l.grammarData)return {title:l.grammarData.grammarTitle,rule:l.grammarData.grammarRuleRu,examples:l.grammarData.grammarExamples||[],q:l.grammarData.grammarQ,opts:l.grammarData.grammarOpts||[],correct:Number(l.grammarData.grammarCorrect)||0};
    const arr=GRAMMAR_GUIDE[l.level],idx=Math.abs([...l.id].reduce((a,c)=>a+c.charCodeAt(0),0))%arr.length;return arr[idx];
  }
  function grammarEx(l){
    const g=grammarDataFor(l);
    return '<article class="card"><div class="eyebrow">Грамматика</div><h2>'+esc(g.title)+'</h2><div class="notice">'+esc(g.rule)+'</div><div class="example-list">'+(g.examples||[]).map(x=>'<div class="example">'+esc(x)+'</div>').join("")+'</div><div class="prompt">'+esc(g.q)+'</div><div class="choice-list">'+(g.opts||[]).map((x,i)=>'<button class="choice" onclick="checkGrammar(this,'+i+','+g.correct+')">'+esc(x)+'</button>').join("")+'</div><div id="fb"></div></article>';
  }
  function checkGrammar(btn,i,c){
    if(lessonSession.locked)return;const ok=i===c;trackLessonScore(ok?100:35);
    if(ok){
      lessonSession.locked=true;document.querySelectorAll(".choice").forEach((b,j)=>{b.disabled=true;if(j===c)b.classList.add("good")});
      updateSkill("grammar",100);document.getElementById("fb").innerHTML='<div class="feedback good"><b>✓ Верно</b></div><button class="btn lesson-next-v8" onclick="lessonNext(15)">Дальше →</button>';
      return;
    }
    btn.classList.add("bad");btn.disabled=true;rememberError("grammar");updateSkill("grammar",25);
    document.getElementById("fb").innerHTML='<div class="feedback bad"><b>Неверно.</b> Посмотри правило и выбери другой вариант.</div>';
    lessonSession.locked=false;
  }
  function listenExV3(l){
    const d=shuffle(COURSE.filter(x=>x.level===l.level&&x.id!==l.id)).slice(0,3).map(x=>x.phrase),o=shuffle([l.phrase,...d]),c=o.indexOf(l.phrase);
    return '<article class="card"><div class="eyebrow">Аудирование</div><div class="notice"><b>AI-голос:</b> аудио синтезировано, это не запись реального человека.</div><div class="prompt">Прослушай и выбери точную фразу.</div><button class="btn" onclick="speakText(\''+escJs(l.phrase)+'\',.85,this)">▶ Прослушать</button><div class="choice-list">'+o.map((x,i)=>'<button class="choice" onclick="lessonChoice(this,'+i+','+c+',\''+escJs(l.ru)+'\')">'+esc(x)+'</button>').join("")+'</div><hr><div class="eyebrow">Речь и разборчивость</div><p class="muted">Повтори фразу вслух. Запись будет распознана и сравнена с образцом.</p><textarea id="pronText" class="input" placeholder="После записи здесь появится распознанный текст."></textarea><button id="pronBtn" class="btn secondary" style="margin-top:10px" onclick="toggleMic(\'pronText\',\''+escJs(l.phrase)+'\')">🎤 Повторить фразу</button><div id="pronFb"></div><div id="fb"></div></article>';
  }
  renderLesson=function(){
    if(lessonSession?.lesson?._adaptive&&typeof adaptiveRenderLesson==="function")return adaptiveRenderLesson();
    const s=lessonSession,l=s.lesson,n=["Диалог","Грамматика","Словарь","Аудирование","Чтение","Письмо","Речь"];let b="";
    if(s.step===0)b=lessonIntro(l);if(s.step===1)b=grammarEx(l);if(s.step===2)b=vocabEx(l);if(s.step===3)b=listenExV3(l);if(s.step===4)b=readEx(l);if(s.step===5)b=freeEx(l,"writing");if(s.step===6)b=freeEx(l,"speaking");
    shell('<div class="screen-head"><button class="back" onclick="navigate(\'course\',\''+l.level+'\')">←</button><div><div class="eyebrow">'+l.level+' · '+esc(l.title)+'</div><h2 style="margin:0">'+n[s.step]+' · '+(s.step+1)+'/7</h2></div></div><div class="progress"><i style="width:'+pct(s.step,7)+'%"></i></div><section class="exercise">'+b+'</section>',"course");
  };
  lessonNext=function(xp=0){if(lessonSession?.lesson?._adaptive&&typeof adaptiveLessonNext==="function")return adaptiveLessonNext(xp);saveState();lessonSession.step++;lessonSession.locked=false;if(lessonSession.step>6)return finishLesson();renderLesson()};
  lessonChoice=function(btn,i,c,note,skillHint=""){
    if(lessonSession?.lesson?._adaptive&&typeof adaptiveLessonChoice==="function")return adaptiveLessonChoice(btn,i,c,note,skillHint);
    if(lessonSession.locked)return;const ok=i===c;trackLessonScore(ok?100:35);
    const skill=lessonSession.step===2?"vocabulary":lessonSession.step===3?"listening":"reading";
    if(ok){
      lessonSession.locked=true;document.querySelectorAll(".choice").forEach((b,j)=>{b.disabled=true;if(j===c)b.classList.add("good")});
      updateSkill(skill,100);document.getElementById("fb").innerHTML='<div class="feedback good"><b>✓ Верно</b></div><button class="btn lesson-next-v8" onclick="lessonNext(15)">Дальше →</button>';
      return;
    }
    btn.classList.add("bad");btn.disabled=true;rememberError(skill);updateSkill(skill,20);
    document.getElementById("fb").innerHTML='<div class="feedback bad"><b>Неверно.</b> '+esc(note)+'<br><small>Попробуй другой ответ.</small></div>';
    lessonSession.locked=false;
  };
  checkFree=async function(mode){
    if(lessonSession?.lesson?._adaptive&&typeof adaptiveCheckFree==="function")return adaptiveCheckFree(mode);
    const s=lessonSession,a=document.getElementById("freeAnswer")?.value.trim();if(!a||!s||s.locked)return;s.locked=true;const b=document.getElementById("freeFb"),l=s.lesson,p=mode==="speaking"?l.speaking:l.writing;
    b.innerHTML='<div class="feedback">Проверяю…</div>';const r=await aiEvaluate({answer:a,question:p,goal:p,level:l.level,mode});
    if(!b.isConnected||lessonSession!==s){s.locked=false;return}
    if(!r.ok){s.locked=false;b.innerHTML='<div class="feedback bad">Проверка временно недоступна. Попробуй ещё раз.</div>';return}
    const d=r.data,score=Number(d.score||0),ok=d.accepted!==false&&score>=55;trackLessonScore(score);
    updateSkill(mode,score);updateSkill("grammar",d.breakdown?.grammar??score);updateSkill("vocabulary",d.breakdown?.vocabulary??score);rememberError(d.error_tag);
    if(ok){
      b.innerHTML=(typeof aiLessonFeedbackHtml==="function"?aiLessonFeedbackHtml(d,"✓ Хороший ответ"):'<div class="feedback good"><b>✓ Хороший ответ · '+score+'/100</b><br>'+esc(d.explanation_ru||"Ответ принят.")+'</div>')+'<button class="btn lesson-next-v8" onclick="lessonNext(20)">Дальше →</button>';
      return;
    }
    s.locked=false;
    b.innerHTML='<div class="feedback bad"><b>Исправь и попробуй ещё раз</b><br>'+esc(d.explanation_ru||"")+(d.corrected?'<br><br><b>Возможный вариант:</b><br>'+esc(d.corrected):"")+'</div>';
    document.getElementById("freeAnswer")?.focus();
  };
  finishLesson=function(){
    if(lessonSession?.lesson?._adaptive&&typeof adaptiveFinishLesson==="function")return adaptiveFinishLesson();
    const l=lessonSession.lesson;
    if(l.topicId)state.completedTopics[l.topicId]=true;else state.completed[l.id]=true;
    seedSrs(l);const reward=awardLessonXp(l),xp=xpRewardStatus();
    const today=localDateKey();state.guidedJourney=state.guidedJourney||{lessonDates:{},reviewDates:{}};state.guidedJourney.lessonDates=state.guidedJourney.lessonDates||{};state.guidedJourney.lessonDates[today]=l.id;
    saveState();
    const unlocked=reward.newlyUnlocked.length?'<div class="xp-unlock-v8"><b>Открыто:</b> '+reward.newlyUnlocked.map(x=>esc(x.title)).join(", ")+'</div>':"",repeat=reward.repeat===1?'<small class="muted">Повтор этого урока сегодня: начислено 25% обычных XP.</small>':reward.repeat>1?'<small class="muted">За этот урок сегодня XP уже получены.</small>':"",next=xp.next?'<div class="xp-next-v8"><span>До награды «'+esc(xp.next.title)+'»</span><b>'+xp.toNext+' XP</b><i><em style="width:'+xp.progress+'%"></em></i></div>':'<div class="xp-next-v8"><b>Все текущие XP-миссии открыты</b></div>';
    shell('<section class="card guided-finish-v61"><div class="guided-finish-mark-v61">✓</div><div class="eyebrow">'+l.level+' · готово на сегодня</div><h1>'+esc(l.title)+'</h1><p class="muted">Урок засчитан в сегодняшний маршрут.</p><div class="xp-award-v8"><strong>+'+reward.earned+' XP</strong><span>Оценка занятия Норы: '+reward.avg+'/100</span></div>'+repeat+unlocked+next+'<button class="btn" onclick="navigate(\'home\')">Продолжить день →</button><button class="btn ghost" onclick="navigate(\'course\',\''+l.level+'\')">К курсу</button></section>',"home");
  };


  const POS_LABEL={verb:"глагол",modal:"модальный/вспомогательный",noun:"существительное",adjective:"прилагательное",adverb:"наречие",function:"служебная единица"};

  function renderDaily(){
    const date=localDateKey(),pack=state.dailyPacks[date],total=dictionaryEntries().length,review=reinforcementEntries(10);
    if(!pack){
      shell('<div class="screen-head"><button class="back" onclick="navigate(\'home\')">←</button><div><div class="eyebrow">Ежедневная программа</div><h2 style="margin:0">5 новых слов в день</h2></div></div>'+
      '<section class="card daily-hero"><div class="eyebrow">Сегодня · '+date+'</div><h1>5 новых полезных слов</h1><p class="muted">В каждый день входят глаголы, модальные/служебные конструкции и другая частотная лексика. Для глаголов показываются настоящее, прошедшее, perfektum и будущее как конструкция.</p><div class="notice"><b>Закрепление:</b> слова прошлых дней будут специально возвращаться в сегодняшних примерах, заданиях, расширенных уроках, тестах и Samtale.</div><br><div class="row"><button class="btn" onclick="generateDailyPack()">Получить сегодняшние 5 слов</button><button class="btn secondary" onclick="navigate(\'dictionary\')">Мой словарь · '+total+'</button></div></section>'+
      (review.length?'<div class="section-title"><h2>Сегодня повторим</h2></div><section class="card"><div class="wordchips">'+review.map(x=>'<span class="wordchip"><b>'+esc(x.lemma||x.word)+'</b> · '+esc(x.translation_ru)+'</span>').join("")+'</div></section>':''),"home");return;
    }
    const done=state.dailyProgress[date]?.completed;
    shell('<div class="screen-head"><button class="back" onclick="navigate(\'home\')">←</button><div><div class="eyebrow">5 слов в день · '+pack.level+'</div><h2 style="margin:0">'+date+'</h2></div></div>'+
    '<section class="grid3"><div class="kpi"><small>Сегодня</small><strong>5</strong></div><div class="kpi"><small>Всего в словаре</small><strong>'+total+'</strong></div><div class="kpi"><small>Задания</small><strong>'+(done?"✓":"—")+'</strong></div></section>'+
    '<div class="section-title"><div><div class="eyebrow">Новые слова</div><h2>Сегодняшняя пятёрка</h2></div><button class="btn ghost" onclick="navigate(\'dictionary\')">Открыть словарь</button></div>'+
    '<section class="daily-word-list">'+(pack.words||[]).map((w,i)=>dailyWordCard(w,i)).join("")+'</section>'+
    ((pack.review_words||[]).length?'<div class="section-title"><h2>Закрепляем слова прошлых дней</h2></div><section class="card"><div class="wordchips">'+pack.review_words.map(x=>'<span class="wordchip">'+esc(x)+'</span>').join("")+'</div></section>':'')+
    ((pack.reinforcement_sentences||[]).length?'<div class="section-title"><h2>Новые + старые слова вместе</h2></div><section class="card reinforcement-list">'+pack.reinforcement_sentences.map(x=>'<div class="reinforcement-row"><button class="mini-audio" onclick="speakText(\''+escJs(x.no)+'\',.9,this)">🔊</button><div><b>'+esc(x.no)+'</b><br><span class="muted">'+esc(x.ru)+'</span></div></div>').join("")+'</section>':'')+
    '<div class="section-title"><h2>Практика</h2></div><section class="card"><p class="muted">Задания смешивают сегодняшние слова со словами предыдущих дней. Так старые слова не исчезают после одного урока.</p><div class="row"><button class="btn" onclick="navigate(\'dailypractice\',\''+date+'\')">'+(done?"Пройти задания ещё раз":"Начать задания")+'</button><button class="btn secondary" onclick="navigate(\'review\')">Интервальное повторение</button></div></section>',"home");
  }
  function dailyWordCard(w,i){
    const forms=(w.forms||[]).map(x=>'<tr><td>'+esc(x.label)+'</td><td><b>'+esc(x.form)+'</b></td></tr>').join("");
    const examples=(w.examples||[]).map(x=>'<div class="daily-example"><span class="tag">'+esc(x.label)+'</span><button class="mini-audio" onclick="speakText(\''+escJs(x.no)+'\',.9,this)">🔊</button><b>'+esc(x.no)+'</b><div class="muted">'+esc(x.ru)+'</div></div>').join("");
    return '<article class="card daily-word-card"><div class="row"><span class="lesson-num">'+(i+1)+'</span><div><div class="eyebrow">'+esc(POS_LABEL[w.pos]||w.pos)+(w.gender?" · "+esc(w.gender):"")+'</div><h2>'+esc(w.lemma||w.word)+' <button class="mini-audio" onclick="speakText(\''+escJs(w.lemma||w.word)+'\',.9,this)">🔊</button></h2><div class="daily-translation">'+esc(w.translation_ru)+'</div></div></div>'+
    (forms?'<table class="forms-table"><tbody>'+forms+'</tbody></table>':'')+
    '<div class="daily-examples">'+examples+'</div>'+
    (w.collocation?'<div class="notice"><b>Часто вместе:</b> '+esc(w.collocation)+'</div>':'')+
    (w.note_ru?'<p class="muted daily-note">'+esc(w.note_ru)+'</p>':'')+'<a class="btn ghost link-btn" target="_blank" rel="noopener" href="https://ordbokene.no/bm/'+encodeURIComponent(w.lemma||w.word)+'">Проверить в Bokmålsordboka ↗</a></article>';
  }
  async function generateDailyPack(){
    const date=localDateKey();if(state.dailyPacks[date])return renderDaily();
    shell('<section class="card loading-card"><div class="spinner"></div><h2>Подбираю 5 новых слов</h2><p class="muted">Проверяю словарь, чтобы не повторить уже изученное, и добавляю слова прошлых дней в новые примеры.</p></section>',"home");
    const review=reinforcementEntries(12).map(x=>({word:x.lemma||x.word,translation_ru:x.translation_ru,daysAgo:x.daysAgo,strength:x.strength||20}));
    const dayNumber=(state.dailyDayCount||0)+1;
    const r=await apiPost("/api/daily",{level:state.level||"A1",date,knownWords:knownDailyWords(),reviewWords:review,weakSkills:weakSkills(),dayNumber});
    if(!r.ok){shell('<section class="card"><h2>Не удалось создать слова на сегодня</h2><p class="muted">'+esc(r.error)+'</p><button class="btn" onclick="renderDaily()">Назад</button></section>',"home");return}
    const pack=r.data;pack.date=date;pack.level=state.level||"A1";state.dailyPacks[date]=pack;state.dailyProgress[date]={completed:false,scores:[]};state.dailyDayCount=dayNumber;const oldDates=Object.keys(state.dailyPacks).sort();while(oldDates.length>120){const old=oldDates.shift();delete state.dailyPacks[old];delete state.dailyProgress[old]}registerDailyPack(pack);renderDaily();
  }
  function startDailyPractice(date=localDateKey()){
    const pack=state.dailyPacks[date];if(!pack||!(pack.practice||[]).length)return renderDaily();
    dailyTaskSession={date,pack,i:0,scores:[]};renderDailyPractice();
  }
  function renderDailyPractice(){
    const s=dailyTaskSession,t=s.pack.practice[s.i];if(!t)return finishDailyPractice();
    shell('<div class="screen-head"><button class="back" onclick="renderDaily()">←</button><div><div class="eyebrow">Ежедневная практика</div><h2 style="margin:0">Задание '+(s.i+1)+'/'+s.pack.practice.length+'</h2></div></div><div class="progress"><i style="width:'+pct(s.i,s.pack.practice.length)+'%"></i></div><section class="exercise"><article class="card"><div class="prompt">'+esc(t.prompt_ru)+'</div>'+
    ((t.review_words||[]).length?'<div class="wordchips"><span class="tag">Повторяем</span>'+t.review_words.map(x=>'<span class="wordchip">'+esc(x)+'</span>').join("")+'</div>':'')+
    ((t.new_words||[]).length?'<div class="wordchips"><span class="tag">Новые</span>'+t.new_words.map(x=>'<span class="wordchip">'+esc(x)+'</span>').join("")+'</div>':'')+
    '<textarea id="dailyAnswer" class="input" placeholder="Напиши ответ по-норвежски…"></textarea><div class="row" style="margin-top:10px"><button id="micBtn" class="btn secondary" onclick="toggleMic(\'dailyAnswer\')">🎤 Сказать</button><button class="btn" onclick="checkDailyTask()">🧠 Проверить</button></div><div id="dailyFb"></div></article></section>',"home");
  }
  async function checkDailyTask(){
    const s=dailyTaskSession,t=s?.pack.practice[s.i],a=document.getElementById("dailyAnswer")?.value.trim();if(!a||!t||s.locked)return;s.locked=true;const b=document.getElementById("dailyFb");b.innerHTML='<div class="feedback">Проверяю…</div>';
    const goal=(t.goal_ru||t.prompt_ru)+(t.model_answer_no?" Пример естественного ответа: "+t.model_answer_no:"");
    const r=await aiEvaluate({answer:a,question:t.prompt_ru,goal,level:s.pack.level,mode:"daily_vocabulary"});
    if(!b.isConnected||dailyTaskSession!==s){s.locked=false;return}
    if(!r.ok){s.locked=false;b.innerHTML='<div class="feedback bad">Проверка временно недоступна. Попробуй ещё раз.</div>';return}
    const score=Number(r.data.score||0),ok=r.data.accepted!==false&&score>=55;
    updateDailyStrength([...(t.review_words||[]),...(t.new_words||[])],score);updateSkill("vocabulary",score);updateSkill("grammar",r.data.breakdown?.grammar??score);rememberError(r.data.error_tag);
    if(ok){
      s.scores.push(score);b.innerHTML='<div class="feedback good"><b>✓ '+score+'/100</b></div>';
      neAdvance(()=>{s.locked=false;nextDailyTask()},500);return;
    }
    s.locked=false;
    b.innerHTML='<div class="feedback bad"><b>Исправь и попробуй ещё раз</b><br>'+esc(r.data.explanation_ru||"")+(r.data.corrected?'<br><br><b>Возможный вариант:</b><br>'+esc(r.data.corrected):"")+(t.model_answer_no?'<br><br><b>Пример:</b> '+esc(t.model_answer_no):"")+'</div>';
    document.getElementById("dailyAnswer")?.focus();
  }
  function nextDailyTask(){dailyTaskSession.i++;renderDailyPractice()}
  function finishDailyPractice(){
    const s=dailyTaskSession,avg=s.scores.length?Math.round(s.scores.reduce((a,b)=>a+b,0)/s.scores.length):0;
    state.dailyProgress[s.date]={completed:true,scores:s.scores,average:avg,completedAt:new Date().toISOString()};saveState();
    shell('<section class="card guided-finish-v61"><div class="guided-finish-mark-v61">✓</div><div class="eyebrow">Домашнее задание выполнено</div><h1>'+avg+'%</h1><p class="muted">Новые слова останутся активными в следующих заданиях и разговоре.</p><button class="btn" onclick="navigate(\'home\')">Продолжить день →</button><button class="btn ghost" onclick="navigate(\'learnedwords\')">Выученные слова</button></section>',"home");dailyTaskSession=null;
  }

  let dictionaryFilter={q:"",pos:"all"};
  function renderDictionary(){
    const list=dictionaryEntries().sort((a,b)=>String(b.firstDate||"").localeCompare(String(a.firstDate||"")));
    shell('<div class="screen-head"><button class="back" onclick="navigate(\'daily\')">←</button><div><div class="eyebrow">Личный словарь</div><h2 style="margin:0">'+list.length+' изученных слов</h2></div></div>'+
    '<section class="card dictionary-tools"><input id="dictSearch" class="input compact" placeholder="Найти слово или перевод…" value="'+esc(dictionaryFilter.q)+'" oninput="filterDictionary(this.value)"><div class="row" style="margin-top:10px">'+["all","verb","modal","noun","adjective","adverb","function"].map(p=>'<button class="btn '+(dictionaryFilter.pos===p?"":"ghost")+'" onclick="setDictionaryPos(\''+p+'\')">'+(p==="all"?"Все":esc(POS_LABEL[p]||p))+'</button>').join("")+'</div></section><div id="dictionaryList">'+dictionaryListHtml(list)+'</div>',"home");
  }
  function dictionaryListHtml(list){
    const q=dictionaryFilter.q.toLowerCase().trim(),filtered=list.filter(x=>(dictionaryFilter.pos==="all"||x.pos===dictionaryFilter.pos)&&(!q||String(x.lemma||x.word).toLowerCase().includes(q)||String(x.translation_ru||"").toLowerCase().includes(q)));
    if(!filtered.length)return '<section class="card" style="margin-top:14px"><div class="empty">Ничего не найдено.</div></section>';
    return '<section class="dictionary-list">'+filtered.map(x=>{
      const forms=(x.forms||[]).map(f=>'<span><small>'+esc(f.label)+'</small><b>'+esc(f.form)+'</b></span>').join("");
      const ex=(x.examples||[]).map(e=>'<div><button class="mini-audio" onclick="speakText(\''+escJs(e.no)+'\',.9,this)">🔊</button> '+esc(e.no)+' <span class="muted">— '+esc(e.ru)+'</span></div>').join("");
      return '<details class="card dictionary-entry"><summary><div><b class="dictionary-word">'+esc(x.lemma||x.word)+'</b><span class="muted"> · '+esc(x.translation_ru)+'</span></div><div class="row"><span class="tag">'+esc(POS_LABEL[x.pos]||x.pos)+'</span><span class="tag">'+Math.round(x.strength||20)+'%</span></div></summary><div class="dictionary-body"><button class="btn ghost" onclick="event.preventDefault();speakText(\''+escJs(x.lemma||x.word)+'\',.9,this)">🔊 Произношение</button><div class="forms-grid">'+forms+'</div>'+(x.collocation?'<p><b>Сочетание:</b> '+esc(x.collocation)+'</p>':'')+'<div class="dictionary-examples">'+ex+'</div><div class="row"><small>Изучено: '+esc(x.firstDate||"—")+' · встречалось: '+(x.exposures||1)+' раз</small><a class="btn ghost link-btn" target="_blank" rel="noopener" href="https://ordbokene.no/bm/'+encodeURIComponent(x.lemma||x.word)+'">Bokmålsordboka ↗</a></div></div></details>';
    }).join("")+'</section>';
  }
  function filterDictionary(q){dictionaryFilter.q=q;const e=document.getElementById("dictionaryList");if(e)e.innerHTML=dictionaryListHtml(dictionaryEntries().sort((a,b)=>String(b.firstDate||"").localeCompare(String(a.firstDate||""))))}
  function setDictionaryPos(pos){dictionaryFilter.pos=pos;renderDictionary()}

  function renderReview(){
    const due=dueWords(),all=Object.values(state.srs);
    shell('<div class="screen-head"><button class="back" onclick="navigate(\'home\')">←</button><div><div class="eyebrow">Интервальное повторение</div><h2 style="margin:0">Словарь</h2></div></div><section class="grid3"><div class="kpi"><small>Слов в базе</small><strong>'+all.length+'</strong></div><div class="kpi"><small>Нужно сегодня</small><strong>'+due.length+'</strong></div><div class="kpi"><small>Освоено</small><strong>'+all.filter(x=>x.stage>=5).length+'</strong></div></section><section class="card" style="margin-top:14px">'+(all.length?'<p class="muted">Интервалы: сегодня → 1 → 3 → 7 → 14 → 30 → 60 дней. Ошибки возвращают слово раньше.</p><div class="row"><button class="btn" onclick="startReview()">'+(due.length?"Начать повторение":"Повторить самые слабые")+'</button><button class="btn secondary" onclick="navigate(\'dictionary\')">Личный словарь</button><button class="btn ghost" onclick="navigate(\'daily\')">5 слов сегодня</button></div>':'<div class="empty">Слова появятся после первого урока.</div>')+'</section>',"review");
  }
  function startReview(){
    let items=dueWords();if(!items.length)items=Object.entries(state.srs).sort((a,b)=>(a[1].stage||0)-(b[1].stage||0)).slice(0,12);
    items.sort((a,b)=>Number(Boolean(state.wordPracticeQueue?.[String(b[1].word||b[0]).toLowerCase().replace(/^å\s+/,"" )]))-Number(Boolean(state.wordPracticeQueue?.[String(a[1].word||a[0]).toLowerCase().replace(/^å\s+/,"" )])));
    reviewSession={items:items.slice(0,20),i:0,missed:{}};renderReviewCard();
  }
  function renderReviewCard(){
    const row=reviewSession.items[reviewSession.i];if(!row)return finishReview();
    const [key,item]=row,pool=shuffle(Object.values(state.srs).map(x=>x.translation).filter(x=>x!==item.translation)),opts=shuffle([item.translation,...pool.slice(0,3)]),correct=opts.indexOf(item.translation);
    shell('<div class="screen-head"><button class="back" onclick="renderReview()">←</button><div><div class="eyebrow">Повторение '+(reviewSession.i+1)+'/'+reviewSession.items.length+'</div><h2 style="margin:0">'+item.level+'</h2></div></div><section class="exercise"><article class="card"><div class="prompt">'+esc(item.word)+'</div><button class="btn ghost" onclick="speakText(\''+escJs(item.word)+'\',.9,this)">🔊 Слушать</button><div class="choice-list">'+opts.map((x,i)=>'<button class="choice" onclick="answerReview(\''+escJs(key)+'\','+i+','+correct+')">'+esc(x)+'</button>').join("")+'</div></article></section>',"review");
  }
  function answerReview(key,i,c){
    const it=state.srs[key],ok=i===c,interval=[0,1,3,7,14,30,60],buttons=[...document.querySelectorAll(".choice")],fb=document.getElementById("reviewFb");
    if(ok){
      it.seen=(it.seen||0)+1;it.correct=(it.correct||0)+1;
      if(!reviewSession.missed[key])it.stage=Math.min(6,(it.stage||0)+1);
      const days=interval[it.stage]||1;it.due=Date.now()+days*86400000;updateSkill("vocabulary",100);if(state.dailyDictionary[key])updateDailyStrength([key],100);saveState();
      buttons.forEach(b=>b.disabled=true);buttons[i]?.classList.add("good");if(fb)fb.innerHTML='<div class="feedback good"><b>✓ Верно</b></div>';
      neAdvance(()=>{reviewSession.i++;renderReviewCard()},380);return;
    }
    if(!reviewSession.missed[key]){
      reviewSession.missed[key]=true;it.seen=(it.seen||0)+1;it.stage=Math.max(0,(it.stage||0)-1);it.due=Date.now()+86400000;rememberError("vocabulary");updateSkill("vocabulary",15);if(state.dailyDictionary[key])updateDailyStrength([key],15);saveState();
    }
    buttons[i]?.classList.add("bad");buttons[i].disabled=true;if(fb)fb.innerHTML='<div class="feedback bad"><b>Неверно.</b> Попробуй другой перевод.</div>';
  }
  function finishReview(){const today=localDateKey();state.guidedJourney=state.guidedJourney||{lessonDates:{},reviewDates:{}};state.guidedJourney.reviewDates=state.guidedJourney.reviewDates||{};state.guidedJourney.reviewDates[today]=true;saveState();shell('<section class="card guided-finish-v61"><div class="guided-finish-mark-v61">✓</div><div class="eyebrow">Повторение завершено</div><h1>Готово</h1><p class="muted">Следующие даты пересчитаны. Возвращаемся к сегодняшнему маршруту.</p><button class="btn" onclick="navigate(\'home\')">Продолжить день →</button></section>',"home")}

  function renderPlacement(){
    shell('<section class="card" style="max-width:760px;margin:30px auto"><div class="eyebrow">Входной скрининг</div><h1>С какого материала лучше начать?</h1><p class="muted">20 коротких заданий A1–B2 проверяют грамматику, словарь, чтение и аудирование. Это быстрый выбор точки старта, а не определение полного уровня.</p><div class="notice"><b>Письмо и речь здесь не измеряются.</b> Их Нора проверит в реальных ответах первых занятий. Скрининг не подтверждает CEFR и не заменяет Norskprøven.</div><br><button class="btn" onclick="startPlacement()">Начать скрининг</button></section>',"home");
  }
  function startPlacement(){placementSession={qs:[...PLACEMENT_BANK],i:0,byLevel:{A1:[0,0],A2:[0,0],B1:[0,0],B2:[0,0]},bySkill:{},byLevelSkill:{A1:{},A2:{},B1:{},B2:{}}};renderPlacementQ()}
  function renderPlacementQ(){
    const s=placementSession,q=s.qs[s.i];if(!q)return finishPlacement();
    shell('<div class="screen-head"><button class="back" onclick="navigate(\'home\')">←</button><div><div class="eyebrow">Диагностика</div><h2 style="margin:0">Задание '+(s.i+1)+'/20</h2></div></div><div class="progress"><i style="width:'+pct(s.i,20)+'%"></i></div><section class="exercise"><article class="card">'+(q.context?'<div class="translation">'+esc(q.context)+'</div><br>':"")+(q.audio?'<button class="btn" onclick="speakText(\''+escJs(q.audio)+'\',.9,this)">▶ Прослушать</button><br><br>':"")+'<div class="prompt">'+esc(q.q)+'</div><div class="choice-list">'+q.opts.map((x,i)=>'<button class="choice" onclick="answerPlacement('+i+')">'+esc(x)+'</button>').join("")+'</div></article></section>',"home");
  }
  function answerPlacement(i){
    const s=placementSession,q=s.qs[s.i],ok=i===q.correct;s.byLevel[q.level][1]++;if(ok)s.byLevel[q.level][0]++;
    s.bySkill[q.skill]=s.bySkill[q.skill]||[0,0];s.bySkill[q.skill][1]++;if(ok)s.bySkill[q.skill][0]++;
    const cell=s.byLevelSkill[q.level][q.skill]||(s.byLevelSkill[q.level][q.skill]=[0,0]);cell[1]++;if(ok)cell[0]++;
    s.i++;renderPlacementQ();
  }
  function finishPlacement(){
    const s=placementSession,rat=Object.fromEntries(LEVELS.map(l=>[l,s.byLevel[l][1]?s.byLevel[l][0]/s.byLevel[l][1]:0]));let rec="A1";
    if(rat.A1>=.8&&rat.A2>=.6)rec="A2";
    if(rec==="A2"&&rat.B1>=.6)rec="B1";
    if(rec==="B1"&&rat.B2>=.6)rec="B2";
    for(const [k,[correct,total]] of Object.entries(s.bySkill))if(total)updateSkill(k,Math.round(correct/total*100));
    if(window.NEAdaptive){
      const p=NEAdaptive.ensure(state),fresh=(p.attempts||[]).length===0;
      for(const level of LEVELS){
        const profile=p.levelSkills[level]||(p.levelSkills[level]={});
        for(const skill of ["reading","listening","grammar","vocabulary"]){
          const cell=s.byLevelSkill[level]?.[skill];
          if(cell?.[1]){const ratio=cell[0]/cell[1],screenScore=Math.round(30+ratio*40);profile[skill]=fresh?screenScore:Math.round((profile[skill]||35)*.75+screenScore*.25)}
        }
        if(fresh){profile.writing=35;profile.speaking=35}
      }
    }
    state.level=rec;if(state.chatPrefs)state.chatPrefs.level=rec;if(window.NEAdaptive){const p=NEAdaptive.ensure(state);p.startLevel=rec}
    state.placement={level:rec,recommendedStart:rec,scope:"receptive_screening",byLevel:rat,byLevelSkill:s.byLevelSkill,date:new Date().toISOString()};saveState();
    shell('<section class="card" style="max-width:720px;margin:35px auto;text-align:center"><div class="eyebrow">Результат входного скрининга</div><h1>Начать материалы с '+rec+'</h1><p class="muted">A1 '+Math.round(rat.A1*100)+'% · A2 '+Math.round(rat.A2*100)+'% · B1 '+Math.round(rat.B1*100)+'% · B2 '+Math.round(rat.B2*100)+'%</p><div class="notice"><b>Это не означает, что уровень '+rec+' подтверждён.</b> Скрининг не проверял письмо и речь. Нора начнёт с '+rec+' и уточнит профиль по реальным ответам; при пробелах автоматически вернёт нужный материал.</div><br><button class="btn" onclick="navigate(\'teacher\')">Начать с Норой</button></section>',"home");
  }

  renderTests=function(){
    shell('<div class="screen-head"><button class="back" onclick="navigate(\'home\')">←</button><div><div class="eyebrow">Контроль знаний</div><h2 style="margin:0">Адаптивные тесты</h2></div></div><div class="notice">Каждый запуск создаёт новый набор заданий и усиливает твои слабые навыки. Есть чтение, грамматика, словарь, аудирование, письмо и речь.</div><section class="grid" style="margin-top:14px">'+LEVELS.map(l=>{const t=lastTest(l);return '<article class="card"><div style="font-size:34px;font-weight:950">'+l+'</div><p class="muted">'+levelDesc(l)+'</p><div class="metric"><span>Последний результат</span><strong>'+(t?t.score+"%":"—")+'</strong></div><button class="btn" onclick="navigate(\'test\',\''+l+'\')">'+(t?"Новый вариант":"Начать тест")+'</button></article>'}).join("")+'</section>',"tests");
  };
  startTest=async function(level){
    touchStudy();if(window.NEAdaptive)NEAdaptive.ensure(state);
    const previousLevel=state.level,profile=state.learningV8?.levelSkills?.[level]||{},adaptiveWeak=Object.keys(profile).sort((a,b)=>(profile[a]||0)-(profile[b]||0)).slice(0,3);
    shell('<section class="card loading-card"><div class="spinner"></div><h2>Создаю диагностику '+level+'</h2><p class="muted">Проверяю навыки отдельно. Текущий учебный маршрут не изменится только из-за запуска теста.</p></section>',"tests");
    const revision=window.neScreenRevision;
    const topic="Разные бытовые и общественные темы уровня "+level,r=await apiPost("/api/generate",{kind:"test",level,topic,goal:"диагностика чтения, аудирования, письма, речи, грамматики и словаря",weakSkills:adaptiveWeak,mastery:profile,reviewWords:reinforcementWordList(15),teacherMode:true});
    if(revision!==window.neScreenRevision)return;
    let qs=[];
    if(r.ok&&Array.isArray(r.data.questions)){
      qs=r.data.questions.map(q=>({type:q.type==="listening"?"listen":q.type||"mc",subskill:q.type,text:q.q,context:q.context||"",audio:q.audio||"",opts:q.opts,correct:Number(q.correct)||0}));
      qs.push({type:"free",mode:"writing",subskill:"writing",text:r.data.writing||"Напиши связный текст по знакомой теме."});
      qs.push({type:"free",mode:"speaking",subskill:"speaking",text:r.data.speaking||"Выскажись по знакомой теме."});
    }else qs=buildTest(level).map(q=>({...q,subskill:q.type==="listen"?"listening":q.type==="free"?(q.mode||"writing"):q.type==="reading"?"reading":q.type==="vocabulary"?"vocabulary":"grammar"}));
    testSession={level,previousLevel,questions:qs,i:0,correct:0,freeScores:[],skillEvidence:{reading:[],listening:[],writing:[],speaking:[],grammar:[],vocabulary:[]}};saveState();renderTest();
  };
  answerTest=function(i){
    const s=testSession,q=s?.questions[s.i];if(!q||s.locked||!Number.isInteger(i)||i<0||i>=q.opts.length)return;s.locked=true;const ok=i===q.correct;if(ok)s.correct++;
    const sk=SKILLS.includes(q.subskill)?q.subskill:(q.type==="listen"?"listening":q.type==="reading"?"reading":q.type==="vocabulary"?"vocabulary":"grammar"),score=ok?100:30;
    s.skillEvidence=s.skillEvidence||{};(s.skillEvidence[sk]||(s.skillEvidence[sk]=[])).push(score);updateSkill(sk,score);if(!ok)rememberError(sk);
    if(window.NEAdaptive)NEAdaptive.recordAttempt(state,{level:s.level,skill:sk,score,moduleId:s.level+"-diagnostic",source:"level_test",transfer:true});
    document.querySelectorAll(".choice").forEach((b,j)=>{b.disabled=true;if(j===q.correct)b.classList.add("good");if(j===i&&!ok)b.classList.add("bad")});
    document.getElementById("testFb").innerHTML='<div class="feedback '+(ok?"good":"bad")+'">'+(ok?"✓ Верно":"Неверно")+'</div>';
    saveState();neAdvance(()=>{s.locked=false;testNext()},900);
  };
  answerTestFree=async function(){
    const s=testSession,q=s?.questions[s.i],a=document.getElementById("testFree")?.value.trim();if(!q||!a||s.locked)return;s.locked=true;const b=document.getElementById("testFb");b.innerHTML='<div class="feedback">Оцениваю…</div>';
    const mode=q.mode||"writing",field=document.getElementById("testFree"),skill=mode==="speaking"&&field?.dataset.fromVoice!=="true"?"writing":mode,r=await aiEvaluate({answer:a,question:q.text,goal:q.text,level:testSession.level,mode:"test_"+skill});
    if(!b.isConnected||testSession!==s){s.locked=false;return}
    if(r.ok){
      const pts=Math.max(0,Math.min(1,(r.data.score||0)/100)),score=Math.round(pts*100);testSession.freeScores.push(pts);testSession.skillEvidence=testSession.skillEvidence||{};(testSession.skillEvidence[skill]||(testSession.skillEvidence[skill]=[])).push(score);updateSkill(skill,score);updateSkill("grammar",r.data.breakdown?.grammar??score);updateSkill("vocabulary",r.data.breakdown?.vocabulary??score);rememberError(r.data.error_tag);
      if(window.NEAdaptive)NEAdaptive.recordAttempt(state,{level:testSession.level,skill,score,moduleId:testSession.level+"-diagnostic",source:mode==="speaking"&&skill==="writing"?"level_test_typed":"level_test_free",errorTag:r.data.error_tag||"",transfer:true});
      saveState();b.innerHTML='<div class="feedback '+(pts>=.55?"good":"bad")+'"><b>'+score+'/100</b> · '+esc(r.data.explanation_ru||"Оценено.")+(r.data.corrected?'<br><b>Лучше:</b> '+esc(r.data.corrected):"")+'</div>';
      neAdvance(()=>{s.locked=false;testNext()},900);
    }else{
      testSession.freeScores.push(null);b.innerHTML='<div class="feedback bad">AI недоступен; ответ не войдёт в процент.</div>';neAdvance(()=>{s.locked=false;testNext()},900);
    }
  };

  renderExamHome=function(){
    const bands=["A1-A2","A2-B1","B1-B2"];
    shell('<div class="screen-head"><button class="back" onclick="navigate(\'hub\')">←</button><div><div class="eyebrow">Тренировочный Norskprøven</div><h2 style="margin:0">Четыре отдельные части</h2></div></div><div class="notice"><b>Учебная симуляция:</b> чтение и аудирование адаптируются внутри приложения; письмо и устная речь выбираются по диапазону. Задания оригинальные, не официальные.</div>'+
    '<section class="grid" style="margin-top:14px"><article class="card"><h2>📖 Чтение</h2><p class="muted">До 75 минут. Сначала пробный блок, затем сложность меняется по результату.</p><button class="btn" onclick="startExamPart(\'reading\')">Начать адаптивное чтение</button></article><article class="card"><h2>🎧 Аудирование</h2><p class="muted">Тренировочно 45 минут. На A1–B1 аудио можно услышать дважды; высокий блок — один раз.</p><button class="btn" onclick="startExamPart(\'listening\')">Начать адаптивное аудирование</button></article></section>'+
    '<div class="section-title"><h2>✍️ Письмо</h2></div><section class="grid3">'+bands.map(b=>'<article class="card"><span class="level-badge">'+b+'</span><p class="muted">'+(b==="B1-B2"?"120 минут · 2 задания":"90 минут · 3 задания")+'</p><button class="btn secondary" onclick="startExamPart(\'writing\',\''+b+'\')">Письмо '+b+'</button></article>').join("")+'</section>'+
    '<div class="section-title"><h2>🎤 Устная речь</h2></div><section class="grid3">'+bands.map(b=>'<article class="card"><span class="level-badge">'+b+'</span><p class="muted">Около 20–25 минут. Индивидуальные задания; разговорная часть здесь имитируется без второго кандидата.</p><button class="btn secondary" onclick="startExamPart(\'speaking\',\''+b+'\')">Речь '+b+'</button></article>').join("")+'</section>',"exam");
  };
  function startExamPart(part,band=null){
    touchStudy();
    if(part==="reading"||part==="listening"){
      const src=EXAM_BANK["A2-B1"][part];examV3={part,band:null,phase:"pre",i:0,correct:0,total:0,preCorrect:0,items:src.map(x=>part==="reading"?{context:x[0],q:x[1],opts:x[2],correct:x[3]}:{audio:x[0],q:"Выбери наиболее точный смысл.",opts:x[1],correct:x[2]}),remaining:(part==="reading"?75:45)*60};startTimerV3();return renderExamObjective();
    }
    const items=EXAM_BANK[band][part].map(q=>({q}));examV3={part,band,i:0,items,scores:[],remaining:(part==="writing"?EXAM_CONFIG.writing[band]:25)*60};startTimerV3();renderExamProductive();
  }
  function startTimerV3(){stopTimer();timerHandle=setInterval(()=>{if(!examV3)return;examV3.remaining--;updateTimerV3();if(examV3.remaining<=0)finishExamV3()},1000)}
  function updateTimerV3(){const e=document.getElementById("timer");if(!e||!examV3)return;const m=Math.floor(examV3.remaining/60),s=examV3.remaining%60;e.textContent=String(m).padStart(2,"0")+":"+String(s).padStart(2,"0")}
  function renderExamObjective(){
    const s=examV3,it=s.items[s.i];if(!it){
      if(s.phase==="pre"){
        const high=s.preCorrect>=3;s.phase="main";s.band=high?"B1-B2":"A1-A2";s.i=0;
        s.items=EXAM_BANK[s.band][s.part].map(x=>s.part==="reading"?{context:x[0],q:x[1],opts:x[2],correct:x[3]}:{audio:x[0],q:"Выбери наиболее точный смысл.",opts:x[1],correct:x[2]});return renderExamObjective();
      }
      return finishExamV3();
    }
    const listen=s.part==="listening",limit=s.phase==="main"&&s.band==="B1-B2"?1:2;it.plays=it.plays||0;
    shell('<div class="screen-head"><button class="back" onclick="exitExamV3()">←</button><div style="flex:1"><div class="eyebrow">'+(listen?"Аудирование":"Чтение")+' · '+(s.phase==="pre"?"адаптивный пробный блок":"основной блок "+s.band)+'</div><h2 style="margin:0">Задание '+(s.i+1)+'/'+s.items.length+'</h2></div><span id="timer" class="pill timer"></span></div><section class="exercise"><article class="card">'+(it.context?'<div class="translation">'+esc(it.context)+'</div><br>':"")+(listen?'<div class="notice">AI-голос. Доступно прослушиваний: '+limit+'.</div><br><button id="examAudioBtn" class="btn" onclick="playExamAudio()">▶ Прослушать</button><br><br>':"")+'<div class="prompt">'+esc(it.q)+'</div><div class="choice-list">'+it.opts.map((x,i)=>'<button class="choice" onclick="answerExamObjectiveV3('+i+')">'+esc(x)+'</button>').join("")+'</div></article></section>',"exam");updateTimerV3();
  }
  async function playExamAudio(){
    const s=examV3,it=s?.items[s.i];if(!it)return;const limit=s.phase==="main"&&s.band==="B1-B2"?1:2;if(it.plays>=limit)return;
    const b=document.getElementById("examAudioBtn");it.plays++;await speakText(it.audio,.9,b);if(b?.isConnected&&examV3===s&&s.items[s.i]===it&&it.plays>=limit)b.disabled=true;
  }
  function answerExamObjectiveV3(i){
    const s=examV3,it=s.items[s.i],ok=i===it.correct;s.total++;if(ok)s.correct++;if(s.phase==="pre"&&ok)s.preCorrect++;
    updateSkill(s.part,ok?100:20);if(!ok)rememberError(s.part);s.i++;renderExamObjective();
  }
  function wordHint(band,i){
    if(band==="A1-A2")return i===0?"короткое сообщение":i===1?"примерно 50–80 слов":"примерно 80 слов или больше";
    if(band==="A2-B1")return i===0?"примерно 80–100 слов":i===1?"примерно 80–200 слов":"примерно 80 слов или больше";
    return i===0?"примерно 80 слов или больше":"примерно 250–350 слов";
  }
  function renderExamProductive(){
    const s=examV3,it=s.items[s.i];if(!it)return finishExamV3();const sp=s.part==="speaking";
    shell('<div class="screen-head"><button class="back" onclick="exitExamV3()">←</button><div style="flex:1"><div class="eyebrow">'+(sp?"Устная речь":"Письмо")+' · '+s.band+'</div><h2 style="margin:0">Задание '+(s.i+1)+'/'+s.items.length+'</h2></div><span id="timer" class="pill timer"></span></div><section class="exercise"><article class="card">'+(!sp?'<div class="tag">Ориентир: '+wordHint(s.band,s.i)+'</div>':'<div class="notice">Говори самостоятельно. Приложение оценивает распознанный текст; фонетическая точность отдельно не оценивается.</div>')+'<div class="prompt">'+esc(it.q)+'</div><textarea id="examFreeV3" class="input" oninput="this.dataset.fromVoice=&#39;false&#39;" placeholder="'+(sp?"Нажми микрофон и говори по-норвежски…":"Напиши ответ по-норвежски…")+'"></textarea><div class="row" style="margin-top:10px">'+(sp?'<button id="micBtn" class="btn secondary" onclick="toggleMic(\'examFreeV3\')">🎤 Записать ответ</button>':'')+'<button class="btn" onclick="submitExamProductive()">Сдать ответ</button></div><div id="examFbV3"></div></article></section>',"exam");updateTimerV3();
  }
  async function submitExamProductive(){
    const s=examV3,field=document.getElementById("examFreeV3"),a=field?.value.trim();if(!a||!s||s.locked)return;if(s.part==="speaking"&&field.dataset.fromVoice!=="true"){document.getElementById("examFbV3").innerHTML='<div class="feedback bad">Для проверки устной речи запиши ответ через микрофон. Напечатанный ответ не доказывает навык говорения.</div>';return}s.locked=true;const b=document.getElementById("examFbV3"),q=s.items[s.i].q;b.innerHTML='<div class="feedback">Оцениваю…</div>';
    const r=await aiEvaluate({answer:a,question:q,goal:q,level:s.band.split("-")[1],mode:"exam_"+s.part});
    if(!b.isConnected||examV3!==s){s.locked=false;return}
    if(!r.ok){s.locked=false;b.innerHTML='<div class="feedback bad">AI не ответил. Попробуй отправить ответ ещё раз.</div>';return}
    const score=Number(r.data.score||0);s.scores.push(score);updateSkill(s.part,score);updateSkill("grammar",r.data.breakdown?.grammar??score);updateSkill("vocabulary",r.data.breakdown?.vocabulary??score);rememberError(r.data.error_tag);
    b.innerHTML='<div class="feedback '+(score>=55?"good":"bad")+'"><b>'+score+'/100</b> · '+esc(r.data.explanation_ru||"")+'</div>';neAdvance(()=>{s.locked=false;nextExamProductive()},1000);
  }
  function nextExamProductive(){examV3.i++;renderExamProductive()}
  function finishExamV3(){
    stopTimer();const s=examV3;let score=0,detail="";
    if(s.part==="reading"||s.part==="listening"){score=pct(s.correct,s.total);detail="Адаптивная ветка: "+(s.band||"—")+" · "+s.correct+"/"+s.total+" правильных."}
    else{score=s.scores.length?Math.round(s.scores.reduce((a,b)=>a+b,0)/s.scores.length):0;detail=(s.part==="speaking"?"AI оценивал содержание распознанной речи, грамматику и словарь; не фонетику.":"AI оценивал выполнение задания, структуру, грамматику и словарь.")}
    state.examHistory.push({part:s.part,band:s.band||"adaptive",score,date:new Date().toISOString()});saveState();
    shell('<section class="card" style="max-width:720px;margin:35px auto;text-align:center"><div class="score-ring" style="--pct:'+score+'%"><b>'+score+'%</b></div><br><div class="eyebrow">Результат тренировки</div><h1>'+({reading:"Чтение",listening:"Аудирование",writing:"Письмо",speaking:"Устная речь"}[s.part])+'</h1><p class="muted">'+esc(detail)+'</p><div class="notice">Это внутренняя учебная метрика, не официальный балл Norskprøven.</div><br><button class="btn" onclick="navigate(\'exam\')">К экзамену</button></section>',"exam");examV3=null;
  }
  function exitExamV3(){if(confirm("Завершить эту тренировку без результата?")){examV3=null;navigate("exam")}}


  const CHAT_SCENARIOS={
    butikk:"Магазин: собеседник — продавец, ученик — покупатель.",
    lege:"Врач: собеседник — сотрудник регистратуры или врач.",
    jobb:"Работа: собеседник — работодатель или коллега.",
    intervju:"Собеседование: собеседник — работодатель.",
    kommune:"Коммуна: собеседник — сотрудник servicetorg.",
    skole:"Школа/курс: собеседник — преподаватель или сотрудник школы.",
    transport:"Транспорт: собеседник — сотрудник или попутчик.",
    nabo:"Сосед: бытовой разговор и договорённости.",
    kafé:"Кафе: собеседник — официант.",
    tilfeldig:"Случайная жизненная ситуация в Норвегии."
  };
  const CHAT_TOPICS=["Работа","Семья","Норвегия","Путешествия","Еда","Здоровье","Хобби","Погода","Новости","Технологии","Учёба","Планы"];

  function renderChat(){
    const p=state.chatPrefs,h=state.chatHistory;
    shell('<div class="screen-head"><button class="back" onclick="navigate(\'home\')">←</button><div><div class="eyebrow">Samtale · норвежский собеседник</div><h2 style="margin:0">Свободная практика '+esc(p.level)+'</h2></div></div>'+
    '<section class="chat-layout"><aside class="card chat-settings"><div class="eyebrow">Настройки разговора</div><label class="field-label">Уровень</label><div class="row">'+LEVELS.map(l=>'<button class="btn '+(p.level===l?"":"ghost")+'" onclick="setChatPref(\'level\',\''+l+'\')">'+l+'</button>').join("")+'</div>'+
    '<label class="field-label">Режим</label><select class="input compact" onchange="setChatPref(\'mode\',this.value)"><option value="free" '+(p.mode==="free"?"selected":"")+'>Свободный разговор</option><option value="corrections" '+(p.mode==="corrections"?"selected":"")+'>Исправляй мои ошибки</option><option value="exam" '+(p.mode==="exam"?"selected":"")+'>Как на устной практике</option><option value="roleplay" '+(p.mode==="roleplay"?"selected":"")+'>Ролевая ситуация</option></select>'+
    '<label class="field-label">Тема — любая</label><input id="chatTopic" class="input compact" value="'+esc(p.topic||"")+'" placeholder="Например: работа, машины, жизнь в Норвегии…" onchange="setChatPref(\'topic\',this.value)">'+
    '<div class="topic-chips">'+CHAT_TOPICS.map(t=>'<button onclick="setChatTopic(\''+escJs(t)+'\')">'+esc(t)+'</button>').join("")+'</div>'+
    '<div id="roleScenario" style="'+(p.mode==="roleplay"?"":"display:none")+'"><label class="field-label">Ролевая ситуация</label><select class="input compact" onchange="setChatPref(\'scenario\',this.value)">'+Object.entries(CHAT_SCENARIOS).map(([k,v])=>'<option value="'+k+'" '+(p.scenario===k?"selected":"")+'>'+esc(v.split(":")[0])+'</option>').join("")+'</select></div>'+
    '<label class="switch-row"><input type="checkbox" '+(p.autoSpeak?"checked":"")+' onchange="setChatPref(\'autoSpeak\',this.checked)"> Автоматически озвучивать ответы</label>'+
    '<div class="row"><button class="btn secondary" onclick="startChat()">Начать новый разговор</button><button class="btn ghost" onclick="clearChat()">Очистить</button></div></aside>'+
    '<div class="chat-main card"><div id="chatMessages" class="chat-messages">'+(h.length?renderChatMessages(h):'<div class="chat-empty"><div class="chat-avatar">N</div><h2>Hei!</h2><p>Выбери уровень и тему. Можно написать первую фразу самому или нажать «Начать новый разговор» — собеседник заговорит первым.</p></div>')+'</div>'+
    '<div class="chat-composer"><textarea id="chatInput" class="input" rows="2" placeholder="Напиши по-норвежски или нажми микрофон…" oninput="this.dataset.fromVoice=false"></textarea><div class="row"><button id="chatMicBtn" class="btn secondary" onclick="toggleMic(\'chatInput\')">🎤 Говорить</button><button id="chatSendBtn" class="btn" onclick="sendChat()">Отправить →</button></div><small>AI-собеседник. В режиме речи микрофон сначала превращает твою речь в текст, затем собеседник отвечает.</small></div></div></section>',"chat");
    setTimeout(()=>{const box=document.getElementById("chatMessages");if(box)box.scrollTop=box.scrollHeight},0);
  }
  function renderChatMessages(h){
    return h.map((m,i)=>{
      if(m.role==="user")return '<div class="chat-row user"><div class="chat-bubble user-bubble">'+esc(m.text)+'</div></div>';
      const meta=m.meta||{};
      return '<div class="chat-row assistant"><div class="chat-avatar">N</div><div class="chat-stack"><div class="chat-bubble ai-bubble">'+esc(m.text)+'</div><div class="chat-actions"><button onclick="speakText(\''+escJs(m.text)+'\',.9,this)">🔊 Слушать</button>'+(meta.translation_ru?'<button onclick="toggleChatTranslation('+i+')">RU перевод</button>':'')+'</div>'+(meta.translation_ru?'<div id="chatTr'+i+'" class="chat-translation" style="display:none">'+esc(meta.translation_ru)+'</div>':'')+(meta.corrected?'<div class="chat-correction"><b>Лучше сказать:</b> '+esc(meta.corrected)+(meta.explanation_ru?'<br><small>'+esc(meta.explanation_ru)+'</small>':'')+'</div>':'')+(meta.score!==undefined?'<small class="chat-score">Учебная оценка ответа: '+meta.score+'/100</small>':'')+'</div></div>';
    }).join("");
  }
  function setChatPref(key,value){
    state.chatPrefs[key]=value;saveState();renderChat();
  }
  function setChatTopic(topic){state.chatPrefs.topic=topic;saveState();renderChat()}
  function toggleChatTranslation(i){const e=document.getElementById("chatTr"+i);if(e)e.style.display=e.style.display==="none"?"block":"none"}
  function clearChat(){if(!state.chatHistory.length||confirm("Очистить историю этого разговора?")){state.chatHistory=[];saveState();renderChat()}}
  function noraLearningContext(){
    const memory=state.noraMemory||{};
    return {introduced:memory.introduced===true,conversationCount:Math.min(100000,Number(memory.conversationCount)||0),previousTopic:String(memory.lastTopic||"").slice(0,120),lastPracticeDate:String(memory.lastPracticeDate||"").slice(0,20)};
  }
  async function startChat(){
    state.chatHistory=[];state.chatMemories=state.chatMemories||{};saveState();renderChat();
    const box=document.getElementById("chatMessages");if(box)box.innerHTML='<div class="chat-thinking">Нора начинает разговор…</div>';
    const p=state.chatPrefs;if(window.NEAdaptive)NEAdaptive.ensure(state);const mastery=state.learningV8?.levelSkills?.[p.level]||{},errorPatterns=window.NEAdaptive?NEAdaptive.errors(state):[];
    const r=await apiPost("/api/chat",{start:true,message:"",level:p.level,mode:p.mode,topic:p.topic,scenario:p.sceneContext||CHAT_SCENARIOS[p.scenario]||"",history:[],practiceWords:reinforcementWordList(15),mastery,errorPatterns,learnerContext:noraLearningContext(),teacherMode:true});
    if(!r.ok){if(box)box.innerHTML='<div class="feedback bad">Собеседник временно недоступен: '+esc(r.error)+'</div>';return}
    const d=r.data;state.chatHistory=[{role:"assistant",text:d.reply_no,meta:d}];
    state.noraMemory.conversationCount=(Number(state.noraMemory.conversationCount)||0)+1;
    state.noraMemory.lastTopic=String(p.topic||p.conversationTitle||"").slice(0,120);
    saveState();if(!window.neChatVisible||neChatVisible()){renderChat();if(p.autoSpeak&&d.reply_no)speakText(d.reply_no);}
  }
  async function sendChat(){
    const input=document.getElementById("chatInput"),btn=document.getElementById("chatSendBtn"),msg=input?.value.trim();if(!msg)return;
    const p=state.chatPrefs,wasVoice=chatInputWasVoice&&input?.dataset.fromVoice==="true";chatInputWasVoice=false;
    state.chatMemories=state.chatMemories||{};const memoryKey=state.chatThreadId||"general";
    if(!state.chatMemories[memoryKey])state.chatMemories[memoryKey]=[];
    const memory=state.chatMemories[memoryKey];if(memory.length<8){
      state.chatMemories[memoryKey]=[...state.chatHistory.map(x=>({role:x.role,text:x.text})),{role:'user',text:msg}].slice(0,8);
    }
    state.chatHistory.push({role:"user",text:msg,voice:wasVoice});state.chatHistory=state.chatHistory.slice(-40);saveState();renderChat();
    const box=document.getElementById("chatMessages");if(box){box.insertAdjacentHTML("beforeend",'<div class="chat-thinking">Нора думает…</div>');box.scrollTop=box.scrollHeight}
    const hist=state.chatHistory.slice(0,-1).slice(-32).map(x=>({role:x.role,text:x.text}));
    if(window.NEAdaptive)NEAdaptive.ensure(state);const mastery=state.learningV8?.levelSkills?.[p.level]||{},errorPatterns=window.NEAdaptive?NEAdaptive.errors(state):[];
    const r=await apiPost("/api/chat",{message:msg,level:p.level,mode:p.mode,topic:p.topic,scenario:p.sceneContext||CHAT_SCENARIOS[p.scenario]||"",history:hist,context:state.chatMemories[memoryKey].map(x=>(x.role==="user"?"Ученик: ":"Nora: ")+x.text).join("\n"),practiceWords:reinforcementWordList(15),mastery,errorPatterns,learnerContext:noraLearningContext(),teacherMode:true});
    if(!r.ok){state.chatHistory.push({role:"assistant",text:"Beklager, jeg fikk et teknisk problem. Prøv igjen.",meta:{translation_ru:"Извините, произошла техническая ошибка. Попробуйте ещё раз."}});saveState();if(!window.neChatVisible||neChatVisible())return renderChat();return;}
    const d=r.data;state.chatHistory.push({role:"assistant",text:d.reply_no,meta:d});state.chatHistory=state.chatHistory.slice(-40);
    state.noraMemory.introduced=true;
    state.noraMemory.lastTopic=String(p.topic||p.conversationTitle||"").slice(0,120);
    state.noraMemory.lastPracticeDate=new Date().toISOString().slice(0,10);
    updateSkill(wasVoice?"speaking":"writing",d.score_valid?d.score:50);if(d.error_tag){rememberError(d.error_tag);updateSkill("grammar",Math.max(20,(d.score_valid?d.score:50)-8))}
    if(window.NEAdaptive&&d.score_valid===true)NEAdaptive.recordAttempt(state,{level:p.level,skill:wasVoice?"speaking":"writing",score:d.score,moduleId:p.level.toLowerCase()+"-conversation",source:"conversation",errorTag:d.error_tag||"",transfer:false});
    // A conversation alone is insufficient evidence for a CEFR level change; the course gate controls promotion.
    saveState();if(!window.neChatVisible||neChatVisible()){renderChat();if(p.autoSpeak&&d.reply_no)speakText(d.reply_no);}
  }

  renderProgress=function(){
    const t=state.testHistory.slice(-8).reverse(),e=state.examHistory.slice(-8).reverse(),errs=Object.entries(state.errors||{}).sort((a,b)=>b[1]-a[1]).slice(0,8),adaptive=window.NEAdaptive&&state.learningV8;
    const levelCards=LEVELS.map(level=>{
      if(!adaptive)return '<article class="card"><div class="row"><span class="level-badge">'+level+'</span><strong>'+levelProgress(level)+'%</strong></div><div class="progress"><i style="width:'+levelProgress(level)+'%"></i></div></article>';
      const gate=NEAdaptive.levelGate(state,level),p=state.learningV8.levelSkills?.[level]||{},labels={listening:"Слух",reading:"Чтение",writing:"Письмо",speaking:"Речь"};
      return '<article class="card"><div class="row"><span class="level-badge">'+level+'</span><strong>'+(gate.pass?'Подтверждён':'В работе')+'</strong></div><div class="metric"><span>Профиль уровня</span><strong>'+gate.avg+'%</strong></div><div class="progress"><i style="width:'+gate.avg+'%"></i></div>'+["listening","reading","writing","speaking"].map(s=>'<div class="metric"><span>'+labels[s]+'</span><strong>'+Math.round(p[s]||0)+'%</strong></div>').join("")+'<small class="muted">Модули '+gate.mastered+'/'+gate.total+' · перенос '+gate.transferScore+'% · отложенные проверки '+gate.delayed+'/4</small></article>';
    }).join("");
    shell('<div class="screen-head"><button class="back" onclick="navigate(\'home\')">←</button><div><div class="eyebrow">Освоение, а не активность</div><h2 style="margin:0">Что уже держится без подсказки</h2></div></div>'+
    '<div class="notice"><b>Уровень не выдаётся за просмотр уроков.</b> Здесь учитываются отдельные навыки, новые контексты и повторные проверки после паузы. Это внутренняя учебная оценка, не официальный результат Norskprøven.</div>'+
    '<section class="grid3" style="margin-top:14px"><div class="kpi"><small>Доказательств навыка</small><strong>'+(state.learningV8?.attempts?.length||0)+'</strong></div><div class="kpi"><small>Повторить сейчас</small><strong>'+(adaptive?NEAdaptive.dueReviews(state).length:dueWords().length)+'</strong></div><div class="kpi"><small>Серия</small><strong>'+state.streak+' дн.</strong></div></section>'+
    '<div class="section-title"><h2>A1–B2 по отдельным навыкам</h2></div><section class="grid">'+levelCards+'</section>'+
    '<div class="section-title"><h2>Повторяющиеся ошибки</h2></div><section class="card">'+(errs.length?errs.map(([k,v])=>'<div class="metric"><span>'+esc(k)+'</span><strong>'+v+'</strong></div>').join(""):'<div class="empty">Пока недостаточно данных.</div>')+'</section>'+
    '<div class="section-title"><h2>История контрольных</h2></div><section class="card">'+(t.length?'<table class="table"><tr><th>Уровень</th><th>Результат</th><th>Дата</th></tr>'+t.map(x=>'<tr><td>'+x.level+'</td><td>'+x.score+'%</td><td>'+new Date(x.date).toLocaleDateString("ru-RU")+'</td></tr>').join("")+'</table>':'<div class="empty">Контрольных пока нет.</div>')+'</section>'+
    '<div class="section-title"><h2>Тренировочные экзамены</h2></div><section class="card">'+(e.length?'<table class="table"><tr><th>Часть</th><th>Диапазон</th><th>Результат</th></tr>'+e.map(x=>'<tr><td>'+esc(x.part||"полный")+'</td><td>'+esc(x.band||"—")+'</td><td>'+x.score+'%</td></tr>').join("")+'</table>':'<div class="empty">Результатов пока нет.</div>')+'</section>'+
    '<div class="section-title"><h2>Резервная копия</h2></div><section class="card"><p class="muted">Прогресс можно сохранить и перенести без превращения XP в доказательство уровня.</p><div class="row"><button class="btn secondary" onclick="exportProgress()">Скачать прогресс</button><label class="btn ghost file-btn">Восстановить<input type="file" accept="application/json" onchange="importProgressFile(this.files[0])"></label></div></section>',"progress");
  };
  function exportProgress(){
    const blob=new Blob([JSON.stringify({version:3,exportedAt:new Date().toISOString(),state},null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="norsk-eventyr-progress.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }
  async function importProgressFile(file){
    if(!file)return;try{const d=JSON.parse(await file.text());if(!validProgressState(d.state))throw new Error("BAD_STATE");const restored={...state,...d.state};localStorage.setItem("ne2_state_before_import",JSON.stringify(state));localStorage.setItem("ne2_state",JSON.stringify(restored));alert("Прогресс восстановлен.");location.reload()}catch{alert("Файл прогресса повреждён или не подходит.")}
  }

  Object.assign(window,{startTopic,renderDaily,generateDailyPack,startDailyPractice,checkDailyTask,nextDailyTask,renderDictionary,filterDictionary,setDictionaryPos,renderChat,setChatPref,setChatTopic,toggleChatTranslation,clearChat,startChat,sendChat,renderReview,startReview,answerReview,renderPlacement,startPlacement,answerPlacement,checkGrammar,startExamPart,playExamAudio,answerExamObjectiveV3,submitExamProductive,nextExamProductive,exitExamV3,exportProgress,importProgressFile,neApiPost:apiPost,neWeakSkills:weakSkills,neReinforcementWords:reinforcementWordList,neUpdateSkill:updateSkill,neRememberError:rememberError,neDueWords:dueWords,neLocalDate:localDateKey});
  ensureSession().catch(()=>{});
  renderHome();
})();
