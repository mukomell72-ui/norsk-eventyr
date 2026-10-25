const APP_VERSION="8.3.0";
const DEFAULT_STATE={level:"A1",xp:0,completed:{},testHistory:[],examHistory:[],streak:1,lastStudy:null};
let state=loadState(),lessonSession=null,testSession=null,examSession=null,speechRec=null,timerHandle=null,lessonDraftTimer=null;

function validProgressState(value){
 if(!value||typeof value!=="object"||Array.isArray(value))return false;
 if(!["A1","A2","B1","B2"].includes(value.level))return false;
 for(const key of ["testHistory","examHistory","chatHistory"])if(key in value&&!Array.isArray(value[key]))return false;
 for(const key of ["completed","skills","srs","errors","elite","story","chatPrefs","dailyDictionary","dailyPacks","dailyProgress","generatedLessons","completedTopics","lexicalCandidates","chatThreads","chatMemories","wordFavorites","learningV8","gamification","noraMemory","functionalPractice"]){if(key in value&&(!value[key]||typeof value[key]!=="object"||Array.isArray(value[key])))return false;}
 for(const key of ["xp","streak"])if(key in value&&(!Number.isFinite(value[key])||value[key]<0))return false;
 for(const key of ["srs","dailyDictionary","dailyPacks","dailyProgress","generatedLessons","lexicalCandidates"]){if(key in value&&Object.values(value[key]).some(item=>!item||typeof item!=="object"||Array.isArray(item)))return false;}
 if(value.skills&&Object.values(value.skills).some(score=>!Number.isFinite(score)))return false;
 for(const key of ["testHistory","examHistory","chatHistory"]){if(value[key]?.some(item=>!item||typeof item!=="object"||Array.isArray(item)))return false;}
 if(value.chatThreads&&Object.values(value.chatThreads).some(thread=>!Array.isArray(thread)))return false;
 if("activeLesson" in value&&value.activeLesson!==null&&(typeof value.activeLesson!=="object"||Array.isArray(value.activeLesson)))return false;
 return true;
}
function loadState(){try{return {...DEFAULT_STATE,...JSON.parse(localStorage.getItem("ne2_state")||"{}")}}catch{return {...DEFAULT_STATE}}}
let storageWarningShown=false;
function saveState(){try{localStorage.setItem("ne2_state",JSON.stringify(state));storageWarningShown=false;return true}catch{if(!storageWarningShown){storageWarningShown=true;alert("Не удалось сохранить прогресс на устройстве. Освободи место и скачай резервную копию в разделе «Прогресс».")}return false}}
function ensureLearningStartLevel(){
 const levels=["A1","A2","B1","B2"];state.learningV8=state.learningV8&&typeof state.learningV8==="object"&&!Array.isArray(state.learningV8)?state.learningV8:{};
 if(!levels.includes(state.learningV8.startLevel)){
  const seed=state.placement?.recommendedStart||state.placement?.level||state.level||"A1";
  state.learningV8.startLevel=levels.includes(seed)?seed:"A1";saveState();
 }
}
ensureLearningStartLevel();
function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function escJs(s=""){return String(s).replace(/\\/g,"\\\\").replace(/'/g,"\\'").replace(/\n/g," ")}
function shuffle(a){return [...a].sort(()=>Math.random()-.5)}
function pct(n,d){return d?Math.round(n/d*100):0}
function lessons(level){return COURSE.filter(x=>x.level===level)}
function completed(level){return lessons(level).filter(x=>state.completed[x.id]).length}
function levelProgress(level){return pct(completed(level),lessons(level).length)}
function totalProgress(){return pct(Object.keys(state.completed).length,COURSE.length)}
function lastTest(level){return [...state.testHistory].reverse().find(x=>x.level===level)}
function levelDesc(l){return {A1:"База: знакомство, дом, покупки, транспорт и здоровье.",A2:"Самостоятельная повседневная жизнь: работа, услуги, планы и мнение.",B1:"Связная речь: работа, официальные обращения, новости и аргументы.",B2:"Точная и нюансированная речь: формальный стиль, дискуссия и презентации."}[l]}
function touchStudy(){const t=new Date().toISOString().slice(0,10);if(state.lastStudy!==t){if(state.lastStudy){const d=Math.round((new Date(t)-new Date(state.lastStudy))/86400000);state.streak=d===1?(state.streak||0)+1:1}else state.streak=1;state.lastStudy=t;const g=ensureGamification();g.bestStreak=Math.max(0,Number(g.bestStreak)||0,Number(state.streak)||0);saveState()}}
const XP_REWARDS=[
 {"xp":100,"id":"cafe","title":"Кафе Fjordvik","description":"Закажи еду и напиток без готовых фраз.","goals_no":"Bestill mat og drikke på en kafé.","goals_ru":"Закажи еду и напитки в кафе.","steps_no":["Be om menyen.","Spør om prisen.","Bestill og betal."]},
 {"xp":250,"id":"shopping","title":"Покупка без подсказок","description":"Размер, цвет, цена и возврат в одном разговоре.","goals_no":"Kjøp en vare og spør om bytte.","goals_ru":"Купи товар и уточни условия обмена.","steps_no":["Spør om størrelse og farge.","Spør om prisen.","Forklar at du vil bytte varen."]},
 {"xp":500,"id":"work","title":"Первый рабочий день","description":"Объясни задачу, график и попроси помощь по-норвежски.","goals_no":"Snakk med en kollega på jobben.","goals_ru":"Поговори с коллегой на работе.","steps_no":["Fortell hva du skal gjøre.","Spør når du skal begynne.","Be om hjelp på en høflig måte."]},
 {"xp":1000,"id":"port","title":"Испытание в порту","description":"Билет, багаж, время отправления и изменение плана.","goals_no":"Planlegg en fergetur.","goals_ru":"Спланируй поездку на пароме.","steps_no":["Spør om avgangstiden.","Kjøp riktig billett.","Forklar at du må endre planen."]},
 {"xp":1400,"id":"doctor","title":"У врача","description":"Объясни самочувствие, уточни время и следующие действия.","goals_no":"Bestill en legetime og forklar hva du trenger.","goals_ru":"Запишись к врачу и объясни, что тебе нужно.","steps_no":["Be om en time.","Beskriv et enkelt symptom.","Spør hva du skal gjøre videre."],"scene":"На приёме у семейного врача. Нора — сотрудница регистратуры, затем врач. Это учебная языковая ситуация, а не медицинская консультация."},
 {"xp":1900,"id":"kommune","title":"Разговор в kommune","description":"Уточни документ, встречу и дальнейший порядок действий.","goals_no":"Still spørsmål på kommunekontoret.","goals_ru":"Задай вопросы в муниципалитете.","steps_no":["Forklar hvorfor du er der.","Spør hvilke dokumenter du trenger.","Bekreft neste avtale."],"scene":"В муниципалитете Fjordvik. Нора — работница службы обслуживания населения; ведёт обычный учебный разговор и не даёт правовых заключений."},
 {"xp":2500,"id":"phone","title":"Звонок работодателю","description":"Сообщи о ситуации и договорись об изменении рабочего времени.","goals_no":"Ring arbeidsgiveren din og avtal en tid.","goals_ru":"Позвони работодателю и согласуй время.","steps_no":["Presenter deg på telefon.","Forklar hvorfor du ringer.","Gjenta og bekreft avtalen."],"scene":"Телефонный разговор с работодателем. Нора — руководитель смены. Обсуди график, рабочие задачи и согласование времени."},
 {"xp":3200,"id":"interview","title":"Собеседование","description":"Расскажи о навыках, опыте и задай вопросы о работе.","goals_no":"Øv på et jobbintervju.","goals_ru":"Потренируйся проходить собеседование.","steps_no":["Presenter deg selv.","Fortell om arbeidserfaringen din.","Still et spørsmål om stillingen."],"scene":"Реалистичное собеседование в компании Fjordvik. Нора — представитель работодателя. Не оценивай реальные шансы на трудоустройство."},
 {"xp":4000,"id":"complaint","title":"Решение проблемы","description":"Вежливо объясни проблему и предложи решение.","goals_no":"Forklar et problem og foreslå en løsning.","goals_ru":"Объясни проблему и предложи решение.","steps_no":["Beskriv problemet tydelig.","Forklar hva du ønsker.","Avtal hva som skjer videre."],"scene":"Клиентская служба Fjordvik. Нора — сотрудница, помогающая решить бытовую проблему или вопрос по услуге; говори естественно и вежливо."},
 {"xp":5000,"id":"discussion","title":"Обсуждение и аргументы","description":"Вырази мнение, объясни причину, корректно возрази.","goals_no":"Si meningen din og begrunn den.","goals_ru":"Выскажи мнение и обоснуй его.","steps_no":["Fortell hva du mener.","Gi minst én begrunnelse.","Svar høflig på et motargument."],"scene":"Нора и ученик обсуждают повседневную тему — транспорт, работу или учёбу. Задавай по одному вопросу и подстраивай формулировки под уровень ученика."}
];
function ensureGamification(){
 const good=state.gamification&&typeof state.gamification==="object"&&!Array.isArray(state.gamification);
 const g=good?state.gamification:(state.gamification={});
 g.lessonAwards=g.lessonAwards&&typeof g.lessonAwards==="object"&&!Array.isArray(g.lessonAwards)?g.lessonAwards:{};
 g.lastAward=g.lastAward&&typeof g.lastAward==="object"&&!Array.isArray(g.lastAward)?g.lastAward:null;
 return g;
}
function trackLessonScore(score,meta={}){
 const n=Number(score);if(!lessonSession||!Number.isFinite(n))return;
 const value=Math.max(0,Math.min(100,Math.round(n)));
 lessonSession.xpScores=Array.isArray(lessonSession.xpScores)?lessonSession.xpScores:[];
 lessonSession.xpScores.push(value);
 lessonSession.feedbackItems=Array.isArray(lessonSession.feedbackItems)?lessonSession.feedbackItems:[];
 const labels=lessonSession?.lesson?lessonSteps(lessonSession.lesson):[];
 lessonSession.feedbackItems.push({
  score:value,
  label:String(meta.label||labels[lessonSession.step]||"Этап"),
  explanation:String(meta.explanation||""),
  strength:String(meta.strength||""),
  improvement:String(meta.improvement||""),
  corrected:String(meta.corrected||""),
  rule:String(meta.rule||""),
  scoreReason:String(meta.scoreReason||"")
 });
}
function clearerTaskPrompt(prompt){
 const value=String(prompt||"");
 // A Russian statement in quotes is a translation request, not a question to answer.
 if(/^Ответь(?:те)? по-норвежски\s*:\s*[«"“]/i.test(value)&&!/[?？]/.test(value))return value.replace(/^Ответь(?:те)? по-норвежски\s*:/i,"Переведите на норвежский:");
 return value;
}
function aiLessonFeedbackHtml(d,title){
 const score=Math.max(0,Math.min(100,Math.round(Number(d?.score)||0))),strengths=Array.isArray(d?.strengths_ru)?d.strengths_ru.filter(Boolean).slice(0,2):[],improvements=Array.isArray(d?.improvements_ru)?d.improvements_ru.filter(Boolean).slice(0,2):[];
 const verdict=d?.feedback_status==="incorrect"?"Неправильно":d?.feedback_status==="partial"?"Частично правильно":"Правильно";
 const detail=[
  '<br><b>Проверка:</b> '+verdict,
  d?.error_fragment_ru?'<br><b>Где ошибка:</b> '+esc(d.error_fragment_ru):"",
  strengths.length?'<br><b>Что хорошо:</b> '+strengths.map(esc).join("; "):"",
  improvements.length?'<br><b>Что улучшить:</b> '+improvements.map(esc).join("; "):"",
  d?.explanation_ru?'<br><b>Комментарий Норы:</b> '+esc(d.explanation_ru):"",
  d?.score_reason_ru?'<br><b>Почему '+score+'/100:</b> '+esc(d.score_reason_ru):"",
  d?.corrected?'<br><b>Естественнее:</b> '+esc(d.corrected):"",
  d?.micro_rule_ru?'<br><b>Правило:</b> '+esc(d.micro_rule_ru):""
 ].join("");
 return '<div class="feedback good"><b>'+title+' · '+score+'/100</b>'+detail+'</div>';
}
function lessonFeedbackSummary(reward){
 const items=Array.isArray(lessonSession?.feedbackItems)?lessonSession.feedbackItems:[],lower=items.filter(x=>Number(x.score)<100);
 if(reward.avg>=100)return '<div class="notice" style="margin-top:14px"><b>Почему 100/100:</b> все оценённые этапы выполнены без снижения балла.</div>';
 const shown=(lower.length?lower:items).slice(-6);
 const rows=shown.map(x=>{
  const why=x.scoreReason||x.improvement||x.explanation||x.rule||"Причина снижения не установлена. Оценка предварительная.";
  return '<div style="margin-top:9px"><b>'+esc(x.label)+' · '+x.score+'/100</b><br><small>'+esc(why)+'</small>'+(x.corrected?'<br><small><b>Естественнее:</b> '+esc(x.corrected)+'</small>':"")+'</div>';
 }).join("");
 return '<div class="notice" style="margin-top:14px"><b>Почему '+reward.avg+'/100</b>'+(rows||'<br><small>Один или несколько этапов были оценены ниже 100.</small>')+'</div>';
}
function xpRewardCatalog(){return XP_REWARDS.map(x=>({...x,steps_no:[...(x.steps_no||[])]}))}
function xpRewardStatus(xp=state.xp||0){
 const total=Math.max(0,Number(xp)||0),unlocked=XP_REWARDS.filter(r=>total>=r.xp),next=XP_REWARDS.find(r=>total<r.xp)||null;
 const floor=unlocked.at(-1)?.xp||0,progress=next?Math.max(0,Math.min(100,Math.round((total-floor)/(next.xp-floor)*100))):100;
 return{xp:total,unlocked,next,progress,toNext:next?Math.max(0,next.xp-total):0};
}
function awardLessonXp(l){
 const g=ensureGamification(),scores=Array.isArray(lessonSession?.xpScores)?lessonSession.xpScores:[],avg=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):60;
 let base=avg>=90?40:avg>=75?32:avg>=60?24:16;
 const reviewBonus=l?._adaptive?.kind==="review"&&avg>=80?10:0;base+=reviewBonus;
 const day=new Date().toLocaleDateString("sv-SE"),key=String(l?._adaptive?.moduleId||l?.id||"lesson"),dayMap=g.lessonAwards[day]&&typeof g.lessonAwards[day]==="object"?g.lessonAwards[day]:(g.lessonAwards[day]={}),repeat=Number(dayMap[key]||0);
 const earned=repeat===0?base:repeat===1?Math.max(4,Math.round(base*.25)):0,before=Math.max(0,Number(state.xp)||0);dayMap[key]=repeat+1;state.xp=before+earned;
 Object.keys(g.lessonAwards).sort().slice(0,-14).forEach(k=>delete g.lessonAwards[k]);
 const newlyUnlocked=XP_REWARDS.filter(r=>before<r.xp&&state.xp>=r.xp);
 g.lastAward={date:new Date().toISOString(),lessonKey:key,earned,avg,repeat,reviewBonus,newlyUnlocked:newlyUnlocked.map(r=>r.id)};
 return{earned,avg,repeat,reviewBonus,newlyUnlocked};
}

function nav(active){const a=[["home","⌂","Главная"],["course","▤","Курс"],["tests","✓","Тесты"],["exam","★","Экзамен"],["progress","↗","Прогресс"]];return `<nav class="nav">${a.map(x=>`<button class="${active===x[0]?"active":""}" onclick="navigate('${x[0]}')"><b>${x[1]}</b>${x[2]}</button>`).join("")}</nav>`}
function shell(content,active="home"){flushLessonDraft();document.getElementById("app").innerHTML=`<div class="shell"><header class="topbar"><div class="brand"><span class="brand-mark">N</span>Norsk Eventyr</div><div class="row"><span class="pill">${esc(state.level)}</span><span class="pill">${state.xp} XP</span></div></header>${content}${nav(active)}</div>`}
function navigate(view,data){stopTimer();if(view==="home")renderHome();if(view==="course")renderCourse(data||state.level);if(view==="lesson")startLesson(data);if(view==="tests")renderTests();if(view==="test")startTest(data||state.level);if(view==="exam")renderExamHome();if(view==="examrun")startExam(data||"A1-A2");if(view==="progress")renderProgress();if(view==="teacher")startAdaptiveTeacher();scrollTo({top:0,behavior:"smooth"})}

function renderHome(){
 const next=COURSE.find(x=>x.level===state.level&&!state.completed[x.id])||lessons(state.level)[0],last=state.examHistory.at(-1);
 shell(`<section class="hero"><div class="card hero-main"><div class="eyebrow">Норвежский Bokmål · A1–B2</div><h1>Учись по тому, что реально ещё не умеешь.</h1><p class="muted">Адаптивный преподаватель проверяет шесть компонентов языка, возвращает забываемое и не открывает следующий уровень без устойчивого результата в новых ситуациях.</p><div class="row"><button class="btn" onclick="navigate('teacher')">Начать с преподавателем</button><button class="btn ghost" onclick="navigate('lesson','${next.id}')">Обычный урок: ${esc(next.title)}</button></div></div>
 <div class="card"><div class="metric"><span>Общий прогресс</span><strong>${totalProgress()}%</strong></div><div class="progress"><i style="width:${totalProgress()}%"></i></div><div class="metric"><span>Серия</span><strong>${state.streak} дн.</strong></div><div class="metric"><span>Уроки</span><strong>${Object.keys(state.completed).length}/${COURSE.length}</strong></div><div class="metric"><span>Последний экзамен</span><strong>${last?last.score+"%":"—"}</strong></div></div></section>
 ${window.NELanguageBridge?.controlHtml?.()||''}
 <div class="section-title"><div><div class="eyebrow">Маршрут</div><h2>Уровни</h2></div></div>
 <section class="grid">${LEVELS.map(l=>`<article class="card level-card"><div class="row"><span class="level-badge">${l}</span><span class="tag">${completed(l)}/${lessons(l).length} уроков</span></div><div class="big">${l}</div><p class="muted">${levelDesc(l)}</p><div class="progress"><i style="width:${levelProgress(l)}%"></i></div><br><button class="btn secondary" onclick="state.level='${l}';saveState();navigate('course','${l}')">Открыть уровень</button></article>`).join("")}</section>
 <div class="section-title"><h2>Форматы практики</h2></div><section class="grid3"><article class="card mode-card"><div class="big">🧠</div><h3>AI-проверка</h3><p class="muted">Смысл, грамматика, словарь, связность и исправленный вариант.</p></article><article class="card mode-card"><div class="big">🎧</div><h3>Аудирование</h3><p class="muted">Норвежская речь и задания на понимание.</p></article><article class="card mode-card"><div class="big">🎤</div><h3>Устная речь</h3><p class="muted">Микрофон распознаёт ответ, AI оценивает содержание языка.</p></article></section>`,"home")
}

function renderCourse(level=state.level){
 state.level=level;saveState();const ls=lessons(level);
 shell(`<div class="screen-head"><button class="back" onclick="navigate('home')">←</button><div><div class="eyebrow">Курс ${level}</div><h2 style="margin:0">${levelDesc(level)}</h2></div></div>
 <div class="row">${LEVELS.map(l=>`<button class="btn ${l===level?"":"ghost"}" onclick="renderCourse('${l}')">${l}</button>`).join("")}</div>
 <div class="card" style="margin-top:14px"><div class="metric"><span>Прогресс</span><strong>${levelProgress(level)}%</strong></div><div class="progress"><i style="width:${levelProgress(level)}%"></i></div></div>
 <div class="section-title"><h2>Уроки</h2><span class="tag">6 заданий каждый</span></div><section class="lesson-list">${ls.map((x,i)=>`<article class="card lesson-card ${state.completed[x.id]?"done":""}"><div class="lesson-num">${state.completed[x.id]?"✓":i+1}</div><div><h3>${x.icon} ${esc(x.title)}</h3><div class="meta">${esc(x.grammar)} · словарь · аудирование · чтение · письмо · речь</div></div><button class="btn ${state.completed[x.id]?"secondary":""}" onclick="navigate('lesson','${x.id}')">${state.completed[x.id]?"Повторить":"Начать"}</button></article>`).join("")}</section>`,"course")
}


function lessonDraftKey(session,mode){
 if(!session?.lesson||!["dialogue","writing","speaking"].includes(mode))return "";
 const stage=mode==="dialogue"?
  [session.dialogueIndex||0,session.introReview===true,session.introReviewVariant||0].join(":"):
  [session.speakingFollowup===true,session.remediation?.mode===mode?String(session.remediation.prompt||"").slice(0,350):""].join(":");
 // Every guided-speaking turn is a separate task, even within one lesson step.
 // Keeping the turn index in the key prevents the previous answer from reappearing.
 const turn=mode==="speaking"&&session.guidedSpeech?.lessonId===session.lesson.id&&
  Number.isInteger(session.guidedSpeech.index)?session.guidedSpeech.index:null;
 return [session.lesson.id,session.step,mode,stage].join("|")+(turn===null?"":"|turn:"+turn);
}
function flushLessonDraft(){
 if(lessonDraftTimer!==null){clearTimeout(lessonDraftTimer);lessonDraftTimer=null;persistLessonCheckpoint();}
}
function saveLessonDraft(mode,field){
 const session=lessonSession;
 if(!session?.lesson||!field)return;
 const currentKey=lessonDraftKey(session,mode);
 // An Android keyboard can dispatch its last input event after a turn advances.
 // Never let an editor from the previous turn save under the next turn's key.
 const mountedKey=field.dataset?.draftKey;
 if(mountedKey&&mountedKey!==currentKey)return;
 const key=mountedKey||currentKey;
 if(!key)return;
 session.answerDrafts=session.answerDrafts&&typeof session.answerDrafts==="object"&&!Array.isArray(session.answerDrafts)?session.answerDrafts:{};
 const value=String(field.value||"").slice(0,6000);
 if(value)session.answerDrafts[key]=value;
 else delete session.answerDrafts[key];
 const keys=Object.keys(session.answerDrafts);
 for(const stale of keys.slice(0,Math.max(0,keys.length-24)))delete session.answerDrafts[stale];
 if(lessonDraftTimer!==null)clearTimeout(lessonDraftTimer);
 lessonDraftTimer=setTimeout(()=>{lessonDraftTimer=null;persistLessonCheckpoint();},250);
}
function restoreLessonDraft(session){
 const dialogue=document.getElementById("dialogAnswer"),free=document.getElementById("freeAnswer");
 const editor=dialogue||free;
 if(!editor||!session?.lesson)return;
 const mode=dialogue?"dialogue":editor.closest?.(".guided-speaking")?"speaking":
  session.step===(hasAdaptiveGrammar(session.lesson)?6:5)?"speaking":"writing";
 const key=lessonDraftKey(session,mode);
 editor.dataset.draftMode=mode;
 editor.dataset.draftKey=key;
 let saved=session.answerDrafts?.[key];
 if(mode==="speaking"&&key.includes("|turn:")){
  const legacyKey=key.slice(0,key.lastIndexOf("|turn:"));
  const completed=session.guidedSpeech?.turns||[];
  const normalized=value=>String(value||"").normalize("NFKC").trim().replace(/\s+/gu," ").toLowerCase();
  // A shared pre-fix draft is ambiguous once any turn has been completed.
  // Only the very first turn may adopt it; otherwise discard it safely.
  if(completed.length){
   if(session.answerDrafts)delete session.answerDrafts[legacyKey];
  }else if(typeof saved!=="string"&&typeof session.answerDrafts?.[legacyKey]==="string"){
   saved=session.answerDrafts[legacyKey];
   session.answerDrafts[key]=saved;
   delete session.answerDrafts[legacyKey];
  }
  if(typeof saved==="string"&&completed.some(turn=>normalized(turn.answer)===normalized(saved))){
   if(session.answerDrafts)delete session.answerDrafts[key];
   saved=undefined;
  }
 }
 // Explicitly clear the browser field before restoring a CURRENT-turn draft.
 // Old DOM values and completed turns may never populate a new question.
 editor.value=typeof saved==="string"?saved.slice(0,6000):"";
 editor.addEventListener("input",()=>saveLessonDraft(mode,editor));
}
function discardAcceptedGuidedDraft(session){
 if(!session||session!==lessonSession)return;
 const key=lessonDraftKey(session,"speaking");
 if(!key.includes("|turn:"))return;
 if(session.answerDrafts){
  delete session.answerDrafts[key];
  delete session.answerDrafts[key.slice(0,key.lastIndexOf("|turn:"))];
 }
 const field=document.getElementById("freeAnswer");
 if(field?.dataset?.draftKey===key){field.value="";field.dataset.fromVoice="false";}
}
if(typeof window!=="undefined"&&typeof window.addEventListener==="function")window.addEventListener("pagehide",flushLessonDraft);
if(typeof document!=="undefined"&&typeof document.addEventListener==="function")document.addEventListener("visibilitychange",()=>{if(document.hidden)flushLessonDraft();});

function persistLessonCheckpoint(){
 const session=lessonSession;
 if(!session?.lesson)return;
 state.activeLesson={id:session.lesson.id,step:session.step,dialogueIndex:session.dialogueIndex||0,vocabIndex:session.vocabIndex||0,remediation:session.remediation||null,proposedRemediation:session.proposedRemediation||null,choiceMiss:session.choiceMiss===true,listeningIndex:session.listeningIndex||0,speakingFollowup:session.speakingFollowup===true,guidedSpeech:session.guidedSpeech||null,coach:session.coach||null,firstGraded:session.firstGraded||{},xpScores:session.xpScores||[],feedbackItems:session.feedbackItems||[],answerDrafts:session.answerDrafts||{},introReview:session.introReview===true,introReviewVariant:session.introReviewVariant||0,savedAt:new Date().toISOString()};
 saveState();
}
function startLesson(id){
 flushLessonDraft();
 const l=COURSE.find(x=>x.id===id)||state.generatedLessons?.[id];
 if(!l)return navigate("course");
 if(l.id==="a1-1"&&!Number.isInteger(state.introVariant))state.introVariant=Math.floor(Math.random()*3);
 state.level=l.level;touchStudy();
 const saved=state.activeLesson?.id===l.id?state.activeLesson:null;
 const max=l._adaptive?lessonSteps(l).length:7;
 const introReview=l.id==='a1-1'?(saved?saved.introReview===true:(state.noraMemory?.introduced===true||state.completed?.[l.id]===true)):false;
 lessonSession={lesson:l,coach:saved?.coach||null,introReview,introReviewVariant:saved?.introReviewVariant??(Number(state.introVariant)||0),step:saved&&Number.isInteger(saved.step)&&saved.step>=0&&saved.step<max?saved.step:0,
  dialogueIndex:saved?.dialogueIndex||0,vocabIndex:saved?.vocabIndex||0,remediation:saved?.remediation||null,proposedRemediation:saved?.proposedRemediation||null,
  locked:false,choiceMiss:saved?.choiceMiss===true,listeningIndex:saved?.listeningIndex||0,speakingFollowup:saved?.speakingFollowup===true,guidedSpeech:saved?.guidedSpeech||null,firstGraded:saved?.firstGraded&&typeof saved.firstGraded==='object'&&!Array.isArray(saved.firstGraded)?saved.firstGraded:{},xpScores:Array.isArray(saved?.xpScores)?saved.xpScores:[],feedbackItems:Array.isArray(saved?.feedbackItems)?saved.feedbackItems:[],answerDrafts:saved?.answerDrafts&&typeof saved.answerDrafts==='object'&&!Array.isArray(saved.answerDrafts)?saved.answerDrafts:{}};
 persistLessonCheckpoint();renderLesson();
}
function hasAdaptiveGrammar(l){return !!(l?._adaptive&&Array.isArray(l.grammarOpts)&&l.grammarOpts.length===4&&Number.isInteger(Number(l.grammarCorrect)))}
function lessonSteps(l){return hasAdaptiveGrammar(l)?["Фраза","Словарь","Грамматика","Аудирование","Чтение","Письмо","Речь"]:["Фраза","Словарь","Аудирование","Чтение","Письмо","Речь"]}
function renderLesson(){const s=lessonSession,l=s.lesson,n=lessonSteps(l),g=hasAdaptiveGrammar(l);let b="";if(s.step===0)b=lessonIntro(l);if(s.step===1)b=vocabEx(l);if(g&&s.step===2)b=grammarEx(l);if(s.step===(g?3:2))b=listenEx(l);if(s.step===(g?4:3))b=readEx(l);if(s.step===(g?5:4))b=freeEx(l,"writing");if(s.step===(g?6:5))b=freeEx(l,"speaking");
 shell(`<div class="lesson-head-v6"><button class="back-v6" onclick="navigate('course','${l.level}')">←</button><div><small>${l.level} · ${esc(l.title)}</small><b>${n[s.step]||""}</b></div><span>${s.step+1}/${n.length}</span></div><div class="progress lesson-progress-v6" aria-label="Продвижение по занятию"><i style="width:${pct(s.step+1,n.length)}%"></i></div>${window.NEExperience?.lessonHeader?.(l,s,n.length)||""}<section class="exercise lesson-exercise-v6">${b}</section>`,"course");
 restoreLessonDraft(s);
 const speechText=s.step===0?currentDialogueTurn(l).phrase:s.step===(g?3:2)?(l.listeningAudio||l.phrase):"";
 if(speechText)window.nePrimeSpeech?.(speechText,l.level);
}
const INTRODUCTION_OPENERS=[
 "Hei! Jeg heter Nora. Hva heter du?",
 "Hei! Jeg er Nora. Hva heter du?",
 "God dag! Jeg heter Nora. Hva heter du?"
];
const INTRODUCTION_DIALOGUE=[
 {phrase:"Hei! Jeg heter Nora. Hva heter du?",ru:"Привет! Меня зовут Нора. Как тебя зовут?",goal:"Поздоровайся и назови своё имя."},
 {phrase:"Hyggelig å møte deg! Hvor kommer du fra?",ru:"Приятно познакомиться! Откуда ты?",goal:"Скажи, из какой страны или города ты родом."},
 {phrase:"Hvor bor du nå?",ru:"Где ты сейчас живёшь?",goal:"Скажи, где ты сейчас живёшь."},
 {phrase:"Hva gjør du til daglig? Jobber du, eller lærer du norsk?",ru:"Чем ты занимаешься каждый день? Работаешь или учишь норвежский?",goal:"Расскажи о работе или изучении норвежского. Оба варианта допустимы."},
 {phrase:"Nå er det din tur. Still meg et spørsmål for å bli kjent med meg.",ru:"Теперь твоя очередь. Задай мне вопрос, чтобы познакомиться со мной.",goal:"Задай собеседнице один простой вопрос о её имени, происхождении, месте жительства или работе."}
];
const INTRODUCTION_RETURN_DIALOGUES=[
 [
  {phrase:"Hei igjen! Hvordan har dagen din vært?",ru:"Снова привет! Как прошёл твой день?",goal:"Расскажи, как прошёл день."},
  {phrase:"Hva har du gjort på jobb eller på kurset i dag?",ru:"Что ты делал сегодня на работе или на курсах?",goal:"Расскажи об одном сегодняшнем деле."},
  {phrase:"Hva skal du gjøre i morgen?",ru:"Что ты собираешься делать завтра?",goal:"Назови план на завтра."},
  {phrase:"Hvilket sted i Norge liker du å besøke?",ru:"Какое место в Норвегии тебе нравится посещать?",goal:"Назови место и объясни почему."},
  {phrase:"Still meg ett spørsmål om dagen min.",ru:"Задай мне один вопрос о моём дне.",goal:"Задай собеседнице свой вопрос."}
 ],
 [
  {phrase:"Godt å se deg igjen! Hva trenger du å øve på i dag?",ru:"Рада снова тебя видеть! Что ты хочешь потренировать?",goal:"Назови тему для практики."},
  {phrase:"Når begynner du vanligvis på jobb eller skole?",ru:"Когда обычно начинается твой рабочий или учебный день?",goal:"Расскажи о своём расписании."},
  {phrase:"Hva gjør du når du ikke forstår en beskjed?",ru:"Что ты делаешь, когда не понимаешь сообщение?",goal:"Объясни, как просишь уточнить."},
  {phrase:"Hva trenger du å kjøpe denne uken?",ru:"Что тебе нужно купить на этой неделе?",goal:"Расскажи об одной-двух покупках."},
  {phrase:"Spør meg om en avtale som passer denne uken.",ru:"Спроси меня о времени для встречи.",goal:"Предложи время для встречи."}
 ],
 [
  {phrase:"Hei igjen! Hva er planen din denne uken?",ru:"Снова привет! Какие планы на неделю?",goal:"Расскажи об одном плане."},
  {phrase:"Kan du fortelle om noe som gikk bra i går?",ru:"Расскажи о чём-то хорошем, что произошло вчера.",goal:"Расскажи о вчерашнем событии."},
  {phrase:"Hvordan kommer du deg vanligvis til jobb eller skole?",ru:"Как ты обычно добираешься до работы или учёбы?",goal:"Опиши свой маршрут."},
  {phrase:"Hva gjør du hvis bussen er forsinket?",ru:"Что ты делаешь, если автобус опаздывает?",goal:"Объясни своё решение."},
  {phrase:"Still meg et spørsmål om planene mine.",ru:"Задай мне вопрос о моих планах.",goal:"Задай вопрос без подсказки."}
 ]
];
// Every phrase requires a real interlocutor, scene and answer task.
// Old generated lessons without these fields are upgraded at render time.
function situatedDialogueTurn(l){
 const phrase=String(l.phrase||"").trim();
 if(/^Hyggelig å møte deg[.!?]?$/i.test(phrase)){
  return {
   phrase,ru:l.ru||"Приятно познакомиться!",
   scene:"Первый день на работе. Ты знакомишься с новой коллегой Ингрид.",
   speaker:"Ингрид · новая коллега",lead:"Hei! Jeg heter Ingrid.",
   task:"Ответь Ингрид по-норвежски: скажи, что тебе тоже приятно познакомиться, и назови своё имя.",
   goal:"В реальном знакомстве ответь Ингрид: вырази взаимную радость и представься. Не ограничивайся безадресным повторением фразы.",
   dialogueLabel:"Первый день на работе · знакомство",
   vocab:[["hyggelig","приятно"],["å møte","встретить"],["deg","тебя"],["også","тоже"],["jeg heter","меня зовут"],["en kollega","коллега"]]
  };
 }
 const scene=String(l.dialogueScene||"").trim()||("Практическая ситуация: "+String(l.title||"общение по-норвежски"));
 const speaker=String(l.dialogueSpeaker||"").trim()||"Нора · собеседница";
 const task=String(l.dialogueTask||"").trim()||String(l.speaking||"").trim()||
  "Объясни собеседнице своими словами по-норвежски, как эта фраза относится к тебе.";
 const lead=String(l.dialogueIntro||"").trim();
 return {phrase,ru:l.ru,scene,speaker,lead,task,goal:task,dialogueLabel:"Разговор в ситуации"};
}
function currentDialogueTurn(l){
 if(l.id!=="a1-1")return situatedDialogueTurn(l);
 const i=lessonSession.dialogueIndex||0,returnVisit=lessonSession.introReview===true;
 const turns=returnVisit?INTRODUCTION_RETURN_DIALOGUES[(lessonSession.introReviewVariant||0)%INTRODUCTION_RETURN_DIALOGUES.length]:INTRODUCTION_DIALOGUE;
 return {...turns[i],...(!returnVisit&&i===0?{phrase:INTRODUCTION_OPENERS[(state.introVariant||0)%INTRODUCTION_OPENERS.length]}:{}),dialogueLabel:(returnVisit?"Практика с Норой":"Знакомство с Норой")+" · "+(i+1)+"/"+turns.length,scene:"Ты разговариваешь с Норой. Она знакомится с тобой и задаёт вопросы.",speaker:"Нора · собеседница",task:turns[i].goal};
}
function firstGrade(session,key,score,record){
 session.firstGraded=session.firstGraded&&typeof session.firstGraded==='object'?session.firstGraded:{};
 if(Object.prototype.hasOwnProperty.call(session.firstGraded,key))return false;
 // First grade is immutable even after a reload, while free retries are formative.
 session.firstGraded[key]=Math.max(0,Math.min(100,Math.round(Number(score)||0)));
 record();
 persistLessonCheckpoint();
 return true;
}
function retryCoachFeedback(d,ok){
 const score=Math.max(0,Math.min(100,Math.round(Number(d?.score)||0)));
 const issues=Array.isArray(d?.issues)?d.issues:[];
 const perfect=ok&&score===100&&issues.length===0;
 const title=perfect?'Новый ответ принят без замечаний.':ok?'Новый ответ принят, но есть что улучшить.':'Ответ пока требует исправления.';
 const explanation=perfect?'Ты выполнил задачу. Дополнительных исправлений не требуется.':
  (d?.explanation_ru||'Проверь смысл и форму, затем попробуй снова.');
 return '<div class="feedback '+(ok?'good':'bad')+'"><b>'+title+'</b>'+
 '<p><b>Оценка этого исправления: '+score+'/100.</b> Первая оценка и XP не пересчитываются.</p>'+
 '<p>'+esc(explanation)+'</p>'+
 (!perfect&&d?.micro_rule_ru&&d.micro_rule_ru!==explanation?'<p><b>Правило:</b> '+esc(d.micro_rule_ru)+'</p>':'')+
 (!perfect&&d?.corrected?'<p><b>Естественный вариант:</b> '+esc(d.corrected)+'</p>':'')+'</div>';
}
function firstGradeNote(session,key){
 const score=session.firstGraded?.[key];
 return score===undefined?'':'<p class="ne-first-grade"><b>Первая оценка: '+esc(score)+'/100.</b> Она сохранена для прогресса. Исправления можно проверять повторно; их результат показывается отдельно, без повторного начисления XP.</p>';
}
function reviseCheckedAnswer(mode){
 const s=lessonSession;if(!s)return;
 const dialogue=mode==="dialogue",input=document.getElementById(dialogue?"dialogAnswer":"freeAnswer"),
  box=document.getElementById(dialogue?"dialogFb":"freeFb");
 if(!input||!box)return;
 if(!dialogue&&s.lastFreeAccepted?.mode===mode){
  s.remediation=s.lastFreeAccepted.remediation;
  s.speakingFollowup=s.lastFreeAccepted.speakingFollowup;
 }
 s.locked=false;
 box.innerHTML='<div class="feedback">Измени текст или скажи ответ ещё раз, затем нажми «Проверить». Первая оценка и XP останутся прежними.</div>';
 input.focus();
}
function lessonIntro(l){
 const turn=currentDialogueTurn(l),shown={...l,...turn};
 const words=turn.vocab||l.vocab||[];
 const scene=turn.scene||"Ты беседуешь с Норой.";
 const speaker=turn.speaker||"Нора · собеседница";
 const task=turn.task||turn.goal||"Ответь на реплику собеседницы по-норвежски.";
 const lead=turn.lead?'<div class="dialogue-lead-v83">'+esc(turn.lead)+'</div>':"";
 return `<article class="card lesson-intro-v6">
 <div class="dialogue-scene-v83"><small>СИТУАЦИЯ · ${esc(l.level)}</small><p>${esc(scene)}</p><b>${esc(speaker)}</b></div>
 <div class="phrase-v6"><small>${esc(turn.dialogueLabel||"Реплика собеседника")}</small>${lead}<div class="prompt" lang="nb">${esc(shown.phrase)}</div>
 <div class="phrase-actions-v6"><button onclick="speakText('${escJs(shown.phrase)}',.82,this)">🔊 Прослушать</button><button onclick="toggle('tr')">RU Перевод</button></div>
 <div id="tr" class="translation compact-translation-v6" style="display:none">${esc(shown.ru)}</div></div>
 ${window.NELanguageBridge?.taskDirection?.("dialogue",l.level)||""}<div class="dialogue-task-v83"><b>Твоё задание</b><p data-bridge-instruction="true">${esc(task)}</p></div>
 <div class="lesson-words-v6">${words.slice(0,8).map(v=>`<span><b>${esc(v[0])}</b><small>${esc(v[1])}</small></span>`).join("")}</div>
 <div class="answer-label-v6"><b>Твой ответ</b><span>текстом или голосом</span></div>
 <textarea id="dialogAnswer" class="input lesson-answer-v6" rows="2" placeholder="Ответь собеседнику по-норвежски…" oninput="this.dataset.fromVoice='false'"></textarea>
 <small class="muted">Черновик сохраняется автоматически, даже если проверка временно недоступна.</small>
 <div class="lesson-actions-v6"><button id="micBtn" class="btn secondary" onclick="toggleMic('dialogAnswer','','${escJs(shown.phrase)}')">🎤 Сказать</button><button class="btn" onclick="checkDialogue()">✓ Проверить</button></div>
 <div id="dialogFb"></div>
 ${window.NEWordTrays?.render?.({...l,vocab:[...(turn.vocab||[]),...(l.vocab||[])]})||""}
 <details class="grammar-fold-v6"><summary>Грамматика</summary><p>${esc(l.grammar)}</p></details></article>`;
}
function continueCheckedDialogue(){
 const s=lessonSession,l=s?.lesson;if(!s||!l)return;
 if(l.id==="a1-1"&&(s.dialogueIndex||0)<INTRODUCTION_DIALOGUE.length-1){
  if((s.dialogueIndex||0)===0){
   state.noraMemory=state.noraMemory||{};
   state.noraMemory.introduced=true;
   state.noraMemory.lastPracticeDate=new Date().toISOString().slice(0,10);
  }
  s.dialogueIndex=(s.dialogueIndex||0)+1;s.locked=false;persistLessonCheckpoint();renderLesson();
 }else lessonNext(10);
}
async function checkDialogue(){
 const s=lessonSession,input=document.getElementById("dialogAnswer"),a=input?.value.trim();if(!a||s.locked)return;
 const l=s.lesson,turn=currentDialogueTurn(l),b=document.getElementById("dialogFb"),spoken=input.dataset.fromVoice==="true";saveLessonDraft("dialogue",input);flushLessonDraft();s.locked=true;
 b.innerHTML='<div class="feedback">Проверяю…</div>';
 const gradeKey="dialogue:"+String(s.dialogueIndex||0)+":"+String(s.introReview===true);
 const previous=s.dialogueSuggestion?.key===gradeKey?s.dialogueSuggestion.text:"";
 const r=await aiEvaluate({answer:a,question:(turn.scene||"Ситуация знакомства")+". "+(turn.speaker||"Собеседница")+" говорит: "+(turn.lead?turn.lead+" ":"")+turn.phrase,goal:turn.goal||turn.task,level:l.level,mode:"dialogue",previous_suggestion:previous});
 if(!b.isConnected||lessonSession!==s){s.locked=false;return;}
 if(input.value.trim()!==a){s.locked=false;b.innerHTML='<div class="feedback">Ответ изменён во время проверки. Проверь обновлённый текст ещё раз.</div>';return;}
 if(!r.ok){s.locked=false;b.innerHTML='<div class="feedback bad">'+esc(evaluationErrorMessage(r.error))+verifiedNorwegianHintsHtml(r.verifiedHints)+'</div>';return;}
 const d=r.data,ok=d.accepted===true&&(d.score??70)>=55;
 if(typeof d.corrected==="string"&&d.corrected.trim())s.dialogueSuggestion={key:gradeKey,text:d.corrected.trim()};
 const firstAttempt=firstGrade(s,gradeKey,d.score??(ok?70:40),()=>{trackLessonScore(d.score??(ok?70:40),{label:"Диалог",strength:Array.isArray(d.strengths_ru)&&d.strengths_ru[0]||"",improvement:Array.isArray(d.improvements_ru)&&d.improvements_ru[0]||"",explanation:d.explanation_ru||"",corrected:d.corrected||"",rule:d.micro_rule_ru||"",scoreReason:d.score_reason_ru||""});if(window.NEAdaptive)NEAdaptive.recordAttempt(state,{level:l.level,skill:spoken?"speaking":"writing",score:d.score??(ok?70:40),moduleId:l?._adaptive?.moduleId||l.id,source:spoken?"dialogue_voice":"dialogue_text",errorTag:d.error_tag||"",targetErrorTag:l?._adaptive?.errorTag||"",transfer:!!l?._adaptive?.transfer,reviewKey:l?._adaptive?.reviewKey||""});});
 
 if(ok){
  b.innerHTML=(window.NEExperience?.response?.(true,"dialogue")||"")+firstGradeNote(s,gradeKey)+(firstAttempt?aiLessonFeedbackHtml(d,"✓ Задача выполнена"):retryCoachFeedback(d,true))+'<button type="button" class="btn secondary" onclick="reviseCheckedAnswer(\'dialogue\')">Исправить ещё</button><button class="btn lesson-next-v8" onclick="continueCheckedDialogue()">Дальше →</button>';
  return;
 }
 s.locked=false;b.innerHTML=(window.NEExperience?.response?.(false,"dialogue")||"")+firstGradeNote(s,gradeKey)+'<div class="feedback bad"><b>Исправь одну главную вещь и ответь снова</b><br>'+esc(d.explanation_ru||"Исправь ответ и проверь снова.")+(d.micro_rule_ru?'<br><b>Правило:</b> '+esc(d.micro_rule_ru):"")+(d.corrected?'<br><b>Естественнее:</b> '+esc(d.corrected):"")+(d.retry_prompt_no?'<br><small>После исправления попробуй также: '+esc(d.retry_prompt_no)+'</small>':"")+'</div>';input.focus();
}

function adaptiveVocabItems(l){
 if(!lessonSession.vocabItems){
  const words=l.vocab||[],n=words.length,passes=Number(state.learningV8?.modules?.[l._adaptive?.moduleId]?.completions)||0,start=n?(3*passes)%n:0;
  lessonSession.vocabItems=n?[...words.slice(start),...words.slice(0,start)].slice(0,3):[];
 }
 return lessonSession.vocabItems;
}
function normalizeVocabAnswer(s=""){return String(s).normalize("NFKC").toLowerCase().trim().replace(/[.!?,;:]+$/,"").replace(/\s+/g," ")}
function vocabEx(l){
 if(l?._adaptive){
  const items=adaptiveVocabItems(l),idx=Math.min(lessonSession.vocabIndex||0,Math.max(0,items.length-1)),t=items[idx]||["",""];
  return `<article class="card"><div class="eyebrow">Словарь · активное вспоминание</div>${window.NELanguageBridge?.taskDirection?.("vocabulary",l.level)||""}<div class="metric"><span>Слово</span><strong>${idx+1}/${items.length}</strong></div><p class="ne-task-direction" data-bridge-instruction="true">Вспомни изученное слово. Затем напиши ответ сам.</p><div class="prompt">Напиши по-норвежски: «${esc(t[1])}»</div><input id="adaptiveVocabAnswer" class="input" autocomplete="off" autocapitalize="none" placeholder="Норвежское слово или выражение"><div class="row" style="margin-top:10px"><button class="btn" onclick="checkAdaptiveVocab()">Проверить</button></div><div id="fb"></div><small class="muted">Без вариантов ответа: сначала попробуй вспомнить сам.</small></article>`;
 }
 const t=l.vocab[0],pool=COURSE.filter(x=>x.level===l.level).flatMap(x=>x.vocab.map(v=>v[1])).filter(x=>x!==t[1]),o=shuffle([t[1],...shuffle(pool).slice(0,3)]),c=o.indexOf(t[1]);return `<article class="card"><div class="eyebrow">Словарь</div><p class="ne-task-direction" data-bridge-instruction="true">Сначала вспомни значение. Потом выбери ответ.</p><div class="prompt">Что значит «${esc(t[0])}»?</div><div class="choice-list">${o.map((x,i)=>`<button class="choice" onclick="lessonChoice(this,${i},${c},'${escJs(t[0]+" = "+t[1])}','vocabulary')">${esc(x)}</button>`).join("")}</div><div id="fb"></div></article>`
}
function checkAdaptiveVocab(){
 const l=lessonSession?.lesson;if(!l?._adaptive||lessonSession.locked)return;
 const items=adaptiveVocabItems(l),idx=lessonSession.vocabIndex||0,t=items[idx];if(!t)return lessonNext(5);
 const input=document.getElementById("adaptiveVocabAnswer"),answer=input?.value||"";if(!answer.trim())return;
 const ok=normalizeVocabAnswer(answer)===normalizeVocabAnswer(t[0]);trackLessonScore(ok?100:30,{label:"Словарь",explanation:ok?"Слово вспомнено самостоятельно.":"Правильный ответ: "+t[0]});
 if(window.NEAdaptive){NEAdaptive.recordAttempt(state,{level:l.level,skill:"vocabulary",score:ok?100:30,moduleId:l._adaptive.moduleId||l.id,source:"vocab_recall",transfer:!!l._adaptive.transfer,reviewKey:l._adaptive.reviewKey||""});saveState()}
 const fb=document.getElementById("fb");
 if(ok){fb.innerHTML='<div class="feedback good"><b>✓ Вспомнил сам</b></div>'}else{fb.innerHTML='<div class="feedback bad"><b>Нужно закрепить.</b> Правильно: '+esc(t[0])+'</div>'}
 lessonSession.locked=true;
 fb.insertAdjacentHTML("beforeend",'<button class="btn lesson-next-v8" onclick="continueAdaptiveVocab('+(ok?"true":"false")+')">Дальше →</button>');
}
function continueAdaptiveVocab(ok){
 const l=lessonSession?.lesson;if(!l)return;
 const items=adaptiveVocabItems(l),idx=lessonSession.vocabIndex||0;
 lessonSession.locked=false;lessonSession.vocabIndex=idx+1;
 persistLessonCheckpoint();
 if(lessonSession.vocabIndex<items.length)renderLesson();
 else{lessonSession.vocabIndex=0;lessonSession.vocabItems=null;lessonNext(ok?12:6)}
}
function grammarPrompt(l){const q=String(l?.grammarQ||"").trim();if(/^(?:velg|choose|выбери(?:те)?)\s+(?:riktig(?:e)?|korrekt(?:e)?|correct|правильн\w*)\s+(?:setning(?:en)?|alternativ(?:et)?|sentence|предложен\w*|вариант\w*)[.!?]?$/i.test(q))return "Выберите грамматически правильное предложение.";return q||l?.grammarTitle||"Выберите грамматически правильный вариант."}
function grammarEx(l){const c=Number(l.grammarCorrect)||0;return (window.NELessonCoach?.render(l)||'')+`<article class="card"><div class="eyebrow">Грамматика · применение</div>${window.NELanguageBridge?.taskDirection?.("grammar",l.level)||""}<div class="prompt" data-bridge-instruction="true">${esc(grammarPrompt(l))}</div><div class="choice-list">${l.grammarOpts.map((x,i)=>`<button class="choice" onclick="lessonChoice(this,${i},${c},'${escJs(l.grammarRuleRu||l.grammar||"Проверь правило и попробуй снова.")}','grammar')">${esc(x)}</button>`).join("")}</div><details class="grammar-fold-v6"><summary>Короткое правило</summary><p>${esc(l.grammarRuleRu||l.grammar||"")}</p></details><div id="fb"></div></article>`}
function listenEx(l){
 if(l?._adaptive&&typeof l.listeningAudio==="string"&&Array.isArray(l.listeningOpts)&&l.listeningOpts.length===4){
  const sets=Array.isArray(l.listeningSets)&&l.listeningSets.length?l.listeningSets:null,
        idx=Math.max(0,Math.min((lessonSession.listeningIndex||0),(sets?.length||1)-1)),
        source=sets?.[idx]||{audio:l.listeningAudio,q:l.listeningQ,opts:l.listeningOpts,correct:l.listeningCorrect},
        c=Number(source.correct)||0,parts=sets?.length||1;
  return `<article class="card"><div class="eyebrow">Аудирование · понимание смысла ${parts>1?' · часть '+(idx+1)+'/'+parts:''}</div>${window.NELanguageBridge?.taskDirection?.("listening",l.level)||""}<div class="prompt">${esc(source.q||"Что главное в сообщении?")}</div><button class="btn" onclick="speakText('${escJs(source.audio)}',.9,this,'${['marin','cedar','sage'][idx%3]}')">▶ Прослушать</button><button class="btn secondary" onclick="speakText('${escJs(source.audio)}',.73,this,'${['marin','cedar','sage'][idx%3]}')">▶ Медленнее</button><small class="muted">Сначала слушай без текста. Запись ${idx+1} из ${parts}; отвечай по смыслу, не угадывай по отдельным словам. Текст записи можно открыть после правильного ответа; звук сгенерирован AI, не является записью носителя языка.</small><div class="choice-list">${source.opts.map((x,i)=>`<button class="choice" onclick="lessonChoice(this,${i},${c},'Прослушай ещё раз и ищи смысл или важную деталь.','listening')">${esc(x)}</button>`).join("")}</div><div id="fb"></div></article>`;
 }
 const d=shuffle(COURSE.filter(x=>x.level===l.level&&x.id!==l.id)).slice(0,3).map(x=>x.phrase),o=shuffle([l.phrase,...d]),c=o.indexOf(l.phrase);return `<article class="card"><div class="eyebrow">Аудирование</div>${window.NELanguageBridge?.taskDirection?.("listening",l.level)||""}<div class="prompt" data-bridge-instruction="true">Прослушай и выбери точную фразу.</div><button class="btn" onclick="speakText('${escJs(l.phrase)}',.78,this)">▶ Прослушать</button><div class="choice-list">${o.map((x,i)=>`<button class="choice" onclick="lessonChoice(this,${i},${c},'${escJs(l.ru)}','listening')">${esc(x)}</button>`).join("")}</div><div id="fb"></div></article>`;
}
function readEx(l){return `<article class="card"><div class="eyebrow">Чтение</div>${window.NELanguageBridge?.taskDirection?.("reading",l.level)||""}<div class="translation">${esc(l.read)}</div><div class="prompt">${esc(l.q)}</div><div class="choice-list">${l.opts.map((x,i)=>`<button class="choice" onclick="lessonChoice(this,${i},${l.correct},'Ответ находится в тексте.','reading')">${esc(x)}</button>`).join("")}</div><div id="fb"></div></article>`}

function listeningTranscriptFeedback(){
 const s=lessonSession,l=s?.lesson;
 if(!l?._adaptive)return '';
 const sets=l.listeningSets,index=Math.max(0,Math.min(Number(s.listeningIndex)||0,(sets?.length||1)-1));
 const transcript=sets?.[index]?.audio||l.listeningAudio;
 if(!transcript)return '';
 // Never show the answer text until the learner completes the question.
 return '<details class="grammar-fold listening-transcript-v8"><summary>Показать текст записи после ответа</summary><p lang="nb">'+esc(transcript)+'</p><small>Текст для AI-озвучки, не подтверждённая запись носителя языка.</small></details>';
}
function lessonChoice(btn,i,c,note,skillHint=""){if(lessonSession.locked)return;const ok=i===c,labels={grammar:"Грамматика",listening:"Аудирование",reading:"Чтение",vocabulary:"Словарь"},label=labels[skillHint]||"Задание",firstAttempt=lessonSession.choiceMiss!==true;if(firstAttempt)trackLessonScore(ok?100:35,{label,explanation:ok?note:"Первый ответ был неверным. "+note});if(window.NEAdaptive&&firstAttempt){const l=lessonSession.lesson,skill=skillHint||NEAdaptive.skillForStep(lessonSession.step);NEAdaptive.recordAttempt(state,{level:l.level,skill,score:ok?100:35,moduleId:l?._adaptive?.moduleId||l?.id,source:"lesson_choice",transfer:!!l?._adaptive?.transfer,reviewKey:l?._adaptive?.reviewKey||""});saveState()}const buttons=[...(btn.closest("article.card")?.querySelectorAll(".choice")||[])];if(ok){lessonSession.locked=true;buttons.forEach((b,j)=>{b.disabled=true;if(j===c)b.classList.add("good")});document.getElementById("fb").innerHTML='<div class="feedback good"><b>'+(firstAttempt?'✓ Верно · 100/100':'✓ Теперь верно · первая попытка 35/100')+'</b><br><small>'+esc(note)+'</small></div>'+(skillHint==="listening"?listeningTranscriptFeedback():"")+'<button class="btn lesson-next-v8" onclick="'+(skillHint==="listening"&&lessonSession.lesson?.listeningSets&&(lessonSession.listeningIndex||0)<lessonSession.lesson.listeningSets.length-1?'continueListeningStep()':'lessonNext(15)')+'">'+(skillHint==="listening"&&lessonSession.lesson?.listeningSets&&(lessonSession.listeningIndex||0)<lessonSession.lesson.listeningSets.length-1?'Следующая запись →':'Дальше →')+'</button>';return}lessonSession.choiceMiss=true;persistLessonCheckpoint();btn.classList.add("bad");btn.disabled=true;document.getElementById("fb").innerHTML='<div class="feedback bad"><b>Неверно · 35/100.</b> '+esc(note)+'<br><small>Выбери другой вариант.</small></div>';lessonSession.locked=false}
function continueListeningStep(){
 const session=lessonSession,items=session?.lesson?.listeningSets;
 if(!session||!Array.isArray(items)||(session.listeningIndex||0)>=items.length-1)return;
 session.listeningIndex=(session.listeningIndex||0)+1;
 session.choiceMiss=false;session.locked=false;
 persistLessonCheckpoint();renderLesson();
}
function continueSpeakingFollowup(){
 const session=lessonSession;
 if(!session?.speakingFollowup||!session.locked)return;
 session.locked=false;persistLessonCheckpoint();renderLesson();
}
function lessonFreeTask(l,mode,rem,followup=false){
 const task=rem?.prompt||(mode==="speaking"?(followup&&l.speakingFollowUp?l.speakingFollowUp:l.speaking):l.writing);
 // Keep an in-progress curated A1 lesson consistent after an app update,
 // even when its older wording was saved in the learner's progress.
 const oldKeyTask="Spør hvor nøkkelen ligger, og forklar hvor du har lett.";
 if(mode==="speaking"&&!rem&&!followup&&l.level==="A1"&&
   (l.id==="a1-home"||l._adaptive?.moduleId==="a1-home")&&task===oldKeyTask){
  return window.NECurated?.get?.("a1-home")?.speaking||"Spør hvor nøkkelen er. Si hvor du leter etter den.";
 }
 return task;
}
function speakingTaskHelp(l,mode,rem,followup,task){
 if(mode!=="speaking"||rem||followup||l.level!=="A1"||
   !(l.id==="a1-home"||l._adaptive?.moduleId==="a1-home"))return null;
 const curated=window.NECurated?.get?.("a1-home");
 if(task!==curated?.speaking)return null;
 return curated.speakingSupport||l.speakingSupport||null;
}
function freeEx(l,mode){
 const sp=mode==="speaking",rem=l?._adaptive&&lessonSession.remediation?.mode===mode?lessonSession.remediation:null,
  followup=lessonSession.speakingFollowup===true,p=lessonFreeTask(l,mode,rem,followup),
  support=speakingTaskHelp(l,mode,rem,followup,p);
 return `<article class="card"><div class="eyebrow">${sp?"Устная речь":"Письмо"} · ${rem?"перенос исправления":"AI"}</div>${rem?'<div class="notice"><b>Новая ситуация.</b> Примени исправление сам, без копирования готового ответа.'+(rem.rule?'<br><small>'+esc(rem.rule)+'</small>':'')+'</div><br>':""}${window.NELanguageBridge?.taskDirection?.(sp?"speaking":"writing",l.level)||""}<div class="prompt" data-bridge-instruction="true">${esc(clearerTaskPrompt(p))}</div><p class="ne-task-direction" data-bridge-instruction="true">Попробуй ответить своими словами. После проверки исправь ошибки — первая оценка останется прежней.</p>${window.NELanguageBridge?.lessonWordReminder?.(l)||""}${support?'<details class="grammar-fold a1-task-support" data-translation="on-request"><summary>Перевести задание</summary><div class="notice"><b>Перевод задания:</b> '+esc(support.ru)+'<br><small>'+esc(support.hint)+'</small></div></details>':""}${sp?'<div class="notice">Нажми микрофон и говори по-норвежски. Текстовый ответ проверяется как письмо, а не как устная речь.</div>':""}<textarea id="freeAnswer" class="input" autocomplete="off" placeholder="Ответ по-норвежски…" oninput="this.dataset.fromVoice='false'"></textarea><small class="muted">Черновик сохраняется автоматически, даже если проверка временно недоступна.</small><div class="row ${sp?'speech-actions-v831':''}" style="margin-top:10px">${sp?'<button id="micBtn" class="btn secondary" onclick="toggleMic()">🎤 Говорить</button>':""}<button class="btn" onclick="checkFree('${mode}')">🧠 Проверить AI</button></div><div id="freeFb"></div>${window.NEWordTrays?.render?.(l)||""}</article>`
}

function openFreeTransfer(){
 if(!lessonSession)return;
 if(lessonSession.proposedRemediation){
  lessonSession.remediation=lessonSession.proposedRemediation;
  lessonSession.proposedRemediation=null;
 }else if(!lessonSession.remediation)return;
 // The learner explicitly chose a NEW context. Corrections to the original
 // response remain ungraded after its very first attempt.
 lessonSession.locked=false;persistLessonCheckpoint();renderLesson();
}
function deferFreeRemediation(){
 if(!lessonSession)return;lessonSession.remediation=null;lessonSession.locked=false;lessonNext(4);
}
async function checkFree(mode){
 const s=lessonSession,input=document.getElementById("freeAnswer"),a=input?.value.trim();if(!a||!s||s.locked)return;
 const l=s.lesson,rem=l?._adaptive&&s.remediation?.mode===mode?s.remediation:null,p=lessonFreeTask(l,mode,rem,s.speakingFollowup===true),b=document.getElementById("freeFb"),spoken=mode==="speaking"&&input.dataset.fromVoice==="true";saveLessonDraft(mode,input);flushLessonDraft();
 s.locked=true;b.innerHTML='<div class="feedback">Проверяю…</div>';
 const r=await aiEvaluate({answer:a,question:p,goal:p,level:l.level,mode:rem?(spoken?"speaking_transfer":"writing_transfer"):(spoken?"speaking":"writing")});
 if(!b.isConnected||lessonSession!==s){s.locked=false;return}
 if(input.value.trim()!==a){s.locked=false;b.innerHTML='<div class="feedback">Ответ был изменён во время проверки. Проверь новый текст ещё раз.</div>';return}
 if(!r.ok){s.locked=false;b.innerHTML='<div class="feedback bad">'+esc(evaluationErrorMessage(r.error))+verifiedNorwegianHintsHtml(r.verifiedHints)+'</div>';return}
 const d=r.data,ok=d.accepted===true&&(d.score??70)>=55,skill=spoken?"speaking":"writing",isTransfer=!!rem||!!l?._adaptive?.transfer,
 evidenceScore=ok?Math.max(0,Math.min(100,Math.round(Number(d.score)||0))):Math.min(40,Math.max(0,Math.round(Number(d.score)||0)));
 const gradeKey="free:"+mode+":"+s.step+(rem?":transfer:"+String(rem.retries||0):""),firstAttempt=firstGrade(s,gradeKey,evidenceScore,()=>{trackLessonScore(evidenceScore,{label:spoken?"Речь":"Письмо",strength:Array.isArray(d.strengths_ru)&&d.strengths_ru[0]||"",improvement:Array.isArray(d.improvements_ru)&&d.improvements_ru[0]||"",explanation:d.explanation_ru||"",corrected:d.corrected||"",rule:d.micro_rule_ru||"",scoreReason:d.score_reason_ru||""});if(window.NEAdaptive){NEAdaptive.recordAttempt(state,{level:l.level,skill,score:evidenceScore,moduleId:l?._adaptive?.moduleId||l?.id,source:mode==="speaking"&&!spoken?"lesson_free_text":rem?"lesson_free_transfer":"lesson_free",errorTag:d.error_tag||"",targetErrorTag:rem?.errorTag||l?._adaptive?.errorTag||"",transfer:isTransfer,reviewKey:l?._adaptive?.reviewKey||""});saveState()}});
 const humanFeedback=(window.NEExperience?.response?.(ok,mode)||"")+firstGradeNote(s,gradeKey);
 if(ok){
  s.lastFreeAccepted={mode,remediation:rem?{...rem}:null,speakingFollowup:s.speakingFollowup===true};
  s.remediation=null;s.proposedRemediation=null;s.locked=true;
  if(mode==="speaking"&&l.speakingFollowUp&&!s.speakingFollowup){
   s.speakingFollowup=true;persistLessonCheckpoint();
   b.innerHTML=humanFeedback+(firstAttempt?aiLessonFeedbackHtml(d,"✓ Первая часть разговора выполнена"):retryCoachFeedback(d,true))+'<button type="button" class="btn secondary" onclick="reviseCheckedAnswer(\'speaking\')">Исправить ещё</button><button class="btn lesson-next-v8" onclick="continueSpeakingFollowup()">Ответить на уточнение →</button>';
   return;
  }
  b.innerHTML=humanFeedback+(firstAttempt?aiLessonFeedbackHtml(d,"✓ "+(rem?"Исправление перенесено в новую ситуацию":"Коммуникативная задача выполнена")):retryCoachFeedback(d,true))+'<button type="button" class="btn secondary" onclick="reviseCheckedAnswer(\''+mode+'\')">Исправить ещё</button><button class="btn lesson-next-v8" onclick="lessonNext('+(rem?25:20)+')">Дальше →</button>';
  return;
 }
 const explanation=esc(d.explanation_ru||"Исправь ответ и проверь снова."),rule=d.micro_rule_ru?'<br><b>Правило:</b> '+esc(d.micro_rule_ru):"",corrected=d.corrected?'<br><b>Естественнее:</b> '+esc(d.corrected):"";
 if(l?._adaptive&&d.retry_prompt_no){
  if(!rem){
   s.proposedRemediation={mode,prompt:d.retry_prompt_no,rule:d.micro_rule_ru||"",retries:0,errorTag:d.error_tag||""};s.locked=false;persistLessonCheckpoint();
   b.innerHTML=humanFeedback+'<div class="feedback bad"><b>Исправь главную ошибку.</b><br>'+explanation+rule+corrected+'<br><br><b>Теперь проверь перенос:</b> новый вопрос будет другим.<br><button class="btn secondary" style="margin-top:10px" onclick="openFreeTransfer()">Применить в новой ситуации →</button></div>';return;
  }
  rem.retries=(rem.retries||0)+1;
  if(rem.retries<2){
   rem.prompt=d.retry_prompt_no;rem.rule=d.micro_rule_ru||rem.rule||"";s.locked=false;
   b.innerHTML=humanFeedback+'<div class="feedback bad"><b>Пока неустойчиво.</b><br>'+explanation+rule+corrected+'<br><button class="btn secondary" style="margin-top:10px" onclick="openFreeTransfer()">Ещё одна новая ситуация →</button></div>';return;
  }
  s.locked=false;
  b.innerHTML=humanFeedback+'<div class="feedback bad"><b>Эту ошибку Нора вернёт позже.</b><br>'+explanation+rule+'<br><small>Не зацикливаемся: повторение уже запланировано интервальной системой.</small><br><button class="btn secondary" style="margin-top:10px" onclick="deferFreeRemediation()">Продолжить урок →</button></div>';return;
 }
 s.locked=false;b.innerHTML=humanFeedback+'<div class="feedback bad"><b>Исправь главную ошибку и попробуй снова</b><br>'+explanation+rule+corrected+'</div>';input?.focus()
}
function lessonNext(xp=0){lessonSession.step++;lessonSession.choiceMiss=false;lessonSession.locked=false;if(lessonSession.step>=lessonSteps(lessonSession.lesson).length)return finishLesson();persistLessonCheckpoint();renderLesson()}
function finishLesson(){flushLessonDraft();const l=lessonSession.lesson,reward=awardLessonXp(l),feedback=lessonFeedbackSummary(reward);if(state.activeLesson?.id===l.id)delete state.activeLesson;state.completed[l.id]=true;const courseOutcome=window.NEAdaptive?NEAdaptive.completeLesson(state,l,reward.avg):null;const livingOutcome=window.NELivingDay?.onLessonFinished?.(l,courseOutcome,reward.avg)||null;const today=new Date().toLocaleDateString("sv-SE");state.guidedJourney=state.guidedJourney||{lessonDates:{},reviewDates:{}};state.guidedJourney.lessonDates=state.guidedJourney.lessonDates||{};if(l?._adaptive?.kind!=='archive_replay')state.guidedJourney.lessonDates[today]=l.id;const xp=xpRewardStatus();saveState();const humanEnd=window.NEExperience?.endNote?.(l,courseOutcome?.advanced===true)||"";const unlocked=reward.newlyUnlocked.length?'<div class="xp-unlock-v8"><b>Открыто:</b> '+reward.newlyUnlocked.map(x=>esc(x.title)).join(", ")+'</div>':"",repeat=reward.repeat===1?'<small class="muted">Повтор этого модуля сегодня: начислено 25% обычных XP.</small>':reward.repeat>1?'<small class="muted">За этот модуль сегодня XP уже получены.</small>':"",next=xp.next?'<div class="xp-next-v8"><span>До награды «'+esc(xp.next.title)+'»</span><b>'+xp.toNext+' XP</b><i><em style="width:'+xp.progress+'%"></em></i></div>':'<div class="xp-next-v8"><b>Все текущие XP-миссии открыты</b></div>';shell(`<section class="card guided-finish-v61"><div class="guided-finish-mark-v61">✓</div><div class="eyebrow">${l.level} · ${livingOutcome?(livingOutcome.finished?'Учебный день завершён':'Продолжаем учебный день'):'готово на сегодня'}</div><h1>${esc(l.title)}</h1>${humanEnd}<p class="muted">${livingOutcome?(livingOutcome.advanced?'Ты освоил эту ситуацию. Следующая будет продолжением той же темы.':'Нора проверила ответы. Продолжим закрепление темы.'):'Урок засчитан в сегодняшний маршрут.'}</p><div class="xp-award-v8"><strong>+${reward.earned} XP</strong><span>Оценка занятия Норы: ${reward.avg}/100${reward.reviewBonus?" · +10 за отложенное повторение":""}</span></div>${courseOutcome?'<section class="notice" style="margin:12px 0"><b>'+(courseOutcome.advanced?'Этап подтверждён':'Этап пока не подтверждён')+'</b> · '+courseOutcome.completedPhases+'/'+courseOutcome.totalPhases+' этапов курса.<br>'+esc(courseOutcome.reason)+'</section>':''}<details class="ne-lesson-assessment"><summary>Подробный разбор оценок и исправлений</summary>${feedback}</details>${livingOutcome?'<div class="notice">'+esc(livingOutcome.reason)+'</div>':''}${repeat}${unlocked}${next}<button class="btn" onclick="navigate('${livingOutcome?'livingday':'home'}')">${livingOutcome?(livingOutcome.finished?'Результаты учебного дня →':'Продолжить эту тему →'):'Продолжить день →'}</button>${window.NEExperience?'<button type="button" class="btn secondary ne-lesson-followup" onclick="NEExperience.openFollowup()">Поговорить с Норой об этой ситуации →</button>':''}<button class="btn ghost" onclick="navigate('course','${l.level}')">К курсу</button></section>`,"home")}

function renderTests(){shell(`<div class="screen-head"><button class="back" onclick="navigate('hub')">←</button><div><div class="eyebrow">Контроль знаний</div><h2 style="margin:0">Тесты по уровням</h2></div></div><div class="notice">Лексика, грамматика, чтение и аудирование, плюс отдельные свободные задания на письмо и устную речь с AI-проверкой.</div><section class="grid" style="margin-top:14px">${LEVELS.map(l=>{const t=lastTest(l);return `<article class="card"><div style="font-size:34px;font-weight:950">${l}</div><p class="muted">${levelDesc(l)}</p><div class="metric"><span>Последний результат</span><strong>${t?t.score+"%":"—"}</strong></div><button class="btn" onclick="navigate('test','${l}')">${t?"Пройти снова":"Начать тест"}</button></article>`}).join("")}</section>`,"tests")}
function buildTest(level){const all=lessons(level),q=[],ls=shuffle(all).slice(0,Math.min(2,all.length));ls.forEach(l=>q.push({type:"reading",text:l.q,context:l.read,opts:l.opts,correct:l.correct}));shuffle(GRAMMAR[level]||[]).slice(0,2).forEach(g=>q.push({type:"grammar",text:g[0],opts:g.slice(1,5),correct:g[5],note:g[6]}));const vocab=shuffle(all.flatMap(l=>l.vocab||[]));vocab.slice(0,2).forEach(t=>{const distract=shuffle(vocab.filter(v=>v[0]!==t[0]).map(v=>v[1])).slice(0,3),opts=shuffle([t[1],...distract]);if(opts.length===4)q.push({type:"vocabulary",text:"Что значит «"+t[0]+"»?",opts,correct:opts.indexOf(t[1])})});shuffle(all).slice(0,Math.min(2,all.length)).forEach(l=>{const pool=shuffle(all.filter(x=>x.id!==l.id).map(x=>x.phrase)).slice(0,3),opts=shuffle([l.phrase,...pool]);if(opts.length===4)q.push({type:"listen",text:"Прослушай и выбери точную фразу.",audio:l.phrase,opts,correct:opts.indexOf(l.phrase)})});const l=all[Math.floor(Math.random()*all.length)];q.push({type:"free",mode:"writing",text:l.writing});q.push({type:"free",mode:"speaking",text:l.speaking});return q}
function startTest(level){touchStudy();testSession={level,previousLevel:state.level,questions:buildTest(level),i:0,correct:0,freeScores:[],skillEvidence:{reading:[],listening:[],writing:[],speaking:[],grammar:[],vocabulary:[]}};saveState();renderTest()}
function renderTest(){const s=testSession,q=s.questions[s.i];if(!q)return finishTest();const obj=q.type!=="free";shell(`<div class="screen-head"><button class="back" onclick="navigate('tests')">←</button><div><div class="eyebrow">Тест ${s.level}</div><h2 style="margin:0">Вопрос ${s.i+1}/${s.questions.length}</h2></div></div><div class="progress"><i style="width:${pct(s.i,s.questions.length)}%"></i></div><section class="exercise"><article class="card">${q.context?`<div class="translation">${esc(q.context)}</div><br>`:""}<div class="prompt">${esc(q.text)}</div>${q.type==="listen"?`<button class="btn" onclick="speakText('${escJs(q.audio)}',.8,this)">▶ Прослушать</button>`:""}${obj?`<div class="choice-list">${q.opts.map((x,i)=>`<button class="choice" onclick="answerTest(${i})">${esc(x)}</button>`).join("")}</div>`:`<div class="eyebrow">${q.mode==="speaking"?"Устная речь":"Письмо"} · свободный ответ</div><textarea id="testFree" class="input" oninput="this.dataset.fromVoice='false'" placeholder="${q.mode==="speaking"?"Скажи ответ в микрофон или введи текст…":"Напиши ответ по-норвежски…"}"></textarea><div class="row" style="margin-top:10px">${q.mode==="speaking"?'<button id="micBtn" class="btn secondary" onclick="toggleMic(\'testFree\')">🎤 Ответить голосом</button>':""}<button class="btn" onclick="answerTestFree()">🧠 Проверить мой ответ</button></div>`}<div id="testFb"></div></article></section>`,"tests")}
function answerTest(i){const q=testSession.questions[testSession.i],ok=i===q.correct;if(ok)testSession.correct++;const skill=q.type==="listen"?"listening":q.type==="grammar"?"grammar":q.type==="vocabulary"?"vocabulary":"reading";testSession.skillEvidence=testSession.skillEvidence||{};(testSession.skillEvidence[skill]||(testSession.skillEvidence[skill]=[])).push(ok?100:0);if(window.NEAdaptive){NEAdaptive.recordAttempt(state,{level:testSession.level,skill,score:ok?100:30,moduleId:testSession.level+"-diagnostic",source:"level_test",transfer:true});saveState()}document.querySelectorAll(".choice").forEach((b,j)=>{b.disabled=true;if(j===q.correct)b.classList.add("good");if(j===i&&!ok)b.classList.add("bad")});document.getElementById("testFb").innerHTML='<div class="feedback '+(ok?"good":"bad")+'">'+(ok?"✓ Верно":"Неверно")+(q.note?" · "+esc(q.note):"")+'</div>';neAdvance(()=>testNext(),ok?380:900)}
async function answerTestFree(){const q=testSession.questions[testSession.i],field=document.getElementById("testFree"),a=field.value.trim();if(!a)return;const skill=q.mode==="speaking"&&field.dataset.fromVoice!=="true"?"writing":(q.mode||"writing");const b=document.getElementById("testFb");b.innerHTML='<div class="feedback">Оцениваю…</div>';const r=await aiEvaluate({answer:a,question:q.text,goal:q.text,level:testSession.level,mode:"test_"+skill});if(r.ok){const pts=Math.max(0,Math.min(1,(r.data.score||0)/100));testSession.freeScores.push(pts);testSession.skillEvidence=testSession.skillEvidence||{};(testSession.skillEvidence[skill]||(testSession.skillEvidence[skill]=[])).push(Math.round(pts*100));if(window.NEAdaptive){NEAdaptive.recordAttempt(state,{level:testSession.level,skill,score:Math.round(pts*100),moduleId:testSession.level+"-diagnostic",source:"level_test_free",errorTag:r.data.error_tag||"",transfer:true});saveState()}b.innerHTML='<div class="feedback '+(pts>=.55?"good":"bad")+'">'+esc(r.data.explanation_ru||"Оценено.")+(r.data.corrected?'<br><b>Лучше:</b> '+esc(r.data.corrected):"")+'</div>';neAdvance(()=>testNext(),pts>=.55?500:1100)}else{testSession.freeScores.push(null);b.innerHTML='<div class="feedback bad">AI недоступен; ответ не учитывается.</div>';neAdvance(()=>testNext(),900)}}
function testNext(){testSession.i++;renderTest()}
function finishTest(){const ev=testSession.skillEvidence||{},avg=a=>Array.isArray(a)&&a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length):null,skillScores={reading:avg(ev.reading),listening:avg(ev.listening),writing:avg(ev.writing),speaking:avg(ev.speaking),grammar:avg(ev.grammar),vocabulary:avg(ev.vocabulary)},present=Object.values(skillScores).filter(Number.isFinite),score=present.length?Math.round(present.reduce((a,b)=>a+b,0)/present.length):0,core=["reading","listening","writing","speaking"],complete=core.every(s=>Number.isFinite(skillScores[s])),minCore=complete?Math.min(...core.map(s=>skillScores[s])):0;state.testHistory.push({level:testSession.level,score,skillScores,complete,date:new Date().toISOString()});saveState();const m=!complete?"Диагностика неполная":score>=80&&minCore>=65?"Сильный результат, но уровень ещё нужно подтвердить":score>=60?"Рабочая база, есть пробелы":"Нужно укрепить основные навыки";const labels={reading:"Чтение",listening:"Аудирование",writing:"Письмо",speaking:"Речь",grammar:"Грамматика",vocabulary:"Словарь"};shell(`<section class="card" style="max-width:680px;margin:40px auto;text-align:center"><div class="score-ring" style="--pct:${score}%"><b>${score}%</b></div><br><div class="eyebrow">Диагностика ${testSession.level}</div><h1>${m}</h1><div style="text-align:left;margin:18px 0">${Object.entries(skillScores).map(([s,v])=>`<div class="metric"><span>${labels[s]}</span><strong>${Number.isFinite(v)?v+"%":"не проверено"}</strong></div>`).join("")}</div><p class="muted">Каждый компонент имеет отдельный вес. Высокий результат по грамматике или чтению не скрывает слабую речь или аудирование. Это внутренняя учебная диагностика, не официальный результат Norskprøven.</p><div class="row" style="justify-content:center"><button class="btn" onclick="navigate('teacher')">К преподавателю</button><button class="btn secondary" onclick="navigate('tests')">Все тесты</button></div></section>`,"tests")}

function renderExamHome(){const c=[["A1-A2","Базовый диапазон"],["A2-B1","Средний диапазон"],["B1-B2","Продвинутый диапазон"]];shell(`<div class="screen-head"><button class="back" onclick="navigate('home')">←</button><div><div class="eyebrow">Тренировочный экзамен</div><h2 style="margin:0">Симулятор Norskprøven</h2></div></div><div class="notice"><b>Важно:</b> это учебный симулятор, не официальный экзамен. Он тренирует четыре части: чтение, аудирование, письмо и устную речь.</div><section class="grid" style="margin-top:14px">${c.map(x=>`<article class="card"><span class="level-badge">${x[0]}</span><h2>${x[1]}</h2><div class="row"><span class="tag">📖 Чтение</span><span class="tag">🎧 Аудирование</span><span class="tag">✍️ Письмо</span><span class="tag">🎤 Речь</span></div><br><button class="btn" onclick="navigate('examrun','${x[0]}')">Начать экзамен</button></article>`).join("")}</section><p class="muted" style="margin-top:14px">Официальная Norskprøven имеет четыре отдельные части; чтение и аудирование адаптивны, а для письма и устной части выбирается диапазон уровня. Здесь используется уменьшенная тренировочная модель, а не копия официальных заданий.</p>`,"exam")}
function startExam(band){touchStudy();const b=EXAM_BANK[band];examSession={band,section:0,i:0,objScore:0,objTotal:0,ai:[],remaining:3600,sections:[{name:"Чтение",type:"objective",items:b.reading.map(x=>({context:x[0],q:x[1],opts:x[2],correct:x[3]}))},{name:"Аудирование",type:"listening",items:b.listening.map(x=>({audio:x[0],q:"Выбери наиболее точный смысл.",opts:x[1],correct:x[2]}))},{name:"Письмо",type:"writing",items:b.writing.map(q=>({q}))},{name:"Устная речь",type:"speaking",items:b.speaking.map(q=>({q}))}]};startTimer();renderExam()}
function renderExam(){const s=examSession,sec=s.sections[s.section];if(!sec)return finishExam();const it=sec.items[s.i];if(!it){s.section++;s.i=0;return renderExam()}const obj=sec.type==="objective"||sec.type==="listening";shell(`<div class="screen-head"><button class="back" onclick="exitExam()">←</button><div style="flex:1"><div class="eyebrow">${s.band} · симулятор</div><h2 style="margin:0">${sec.name} ${s.i+1}/${sec.items.length}</h2></div><span id="timer" class="pill timer"></span></div><div class="exam-stepper">${s.sections.map((x,i)=>`<span class="exam-step ${i===s.section?"active":""}">${i+1}. ${x.name}</span>`).join("")}</div><section class="exercise"><article class="card">${it.context?`<div class="translation">${esc(it.context)}</div><br>`:""}${sec.type==="listening"?`<button class="btn" onclick="speakText('${escJs(it.audio)}',.86,this)">▶ Прослушать</button><br><br>`:""}<div class="prompt">${esc(it.q)}</div>${obj?`<div class="choice-list">${it.opts.map((x,i)=>`<button class="choice" onclick="answerExamObj(${i})">${esc(x)}</button>`).join("")}</div>`:`<textarea id="examFree" class="input" placeholder="Ответ по-норвежски…"></textarea><div class="row" style="margin-top:10px">${sec.type==="speaking"?'<button id="micBtn" class="btn secondary" onclick="toggleMic(\'examFree\')">🎤 Говорить</button>':""}<button class="btn" onclick="answerExamFree('${sec.type}')">Сдать ответ</button></div>`}<div id="examFb"></div></article></section>`,"exam");updateTimer()}
function answerExamObj(i){const s=examSession,it=s.sections[s.section].items[s.i];s.objTotal++;if(i===it.correct)s.objScore++;s.i++;renderExam()}
async function answerExamFree(mode){const a=document.getElementById("examFree").value.trim();if(!a)return;const s=examSession,it=s.sections[s.section].items[s.i],b=document.getElementById("examFb");b.innerHTML='<div class="feedback">🧠 Экзаменационная AI-оценка…</div>';const r=await aiEvaluate({answer:a,question:it.q,goal:it.q,level:s.band.split("-")[1],mode:"exam_"+mode}),score=r.ok?Math.max(0,Math.min(100,r.data.score||0)):0;s.ai.push(score);b.innerHTML=`<div class="feedback ${score>=55?"good":"bad"}">${r.ok?`<b>${score}/100</b> · ${esc(r.data.explanation_ru||"")}`:"AI не ответил; задание не оценено."}</div><button class="btn" style="width:100%;margin-top:10px" onclick="examNext()">Следующее →</button>`}
function examNext(){examSession.i++;renderExam()}
function finishExam(){stopTimer();const s=examSession,obj=pct(s.objScore,s.objTotal),ai=s.ai.length?Math.round(s.ai.reduce((a,b)=>a+b,0)/s.ai.length):0,score=Math.round(obj*.5+ai*.5),m=score>=80?"Высокая учебная готовность":score>=65?"Средняя учебная готовность":"Нужно продолжить подготовку";state.examHistory.push({band:s.band,score,obj,ai,date:new Date().toISOString()});saveState();shell(`<section class="card" style="max-width:760px;margin:28px auto"><div class="eyebrow">${s.band} · результат симулятора</div><div class="grid"><div><div class="score-ring" style="--pct:${score}%"><b>${score}%</b></div></div><div><h1 style="font-size:34px">${m}</h1><p class="muted">Не официальный балл и не присвоение уровня.</p><div class="metric"><span>Чтение + аудирование</span><strong>${obj}%</strong></div><div class="metric"><span>Письмо + речь (AI)</span><strong>${ai}%</strong></div></div></div><hr><div class="row"><button class="btn" onclick="navigate('exam')">Другой экзамен</button><button class="btn secondary" onclick="navigate('course','${s.band.split("-")[1]}')">Тренироваться</button></div></section>`,"exam")}
function exitExam(){if(confirm("Завершить экзамен без результата?"))navigate("exam")}

function renderProgress(){
 const t=state.testHistory.slice(-8).reverse(),e=state.examHistory.slice(-6).reverse(),adaptive=window.NEAdaptive&&state.learningV8,attempts=state.learningV8?.attempts?.length||0,due=adaptive?NEAdaptive.dueReviews(state).length:0;
 const levelCards=LEVELS.map(l=>{
  if(!adaptive)return `<article class="card"><div class="row"><span class="level-badge">${l}</span><strong>${levelProgress(l)}%</strong></div><br><div class="progress"><i style="width:${levelProgress(l)}%"></i></div></article>`;
  const gate=NEAdaptive.levelGate(state,l),p=state.learningV8.levelSkills?.[l]||{},core=["listening","reading","writing","speaking"],labels={listening:"Слух",reading:"Чтение",writing:"Письмо",speaking:"Речь"};
  return `<article class="card"><div class="row"><span class="level-badge">${l}</span><strong>${gate.pass?"Подтверждён":"В работе"}</strong></div><div class="metric"><span>Профиль уровня</span><strong>${gate.avg}%</strong></div><div class="progress"><i style="width:${gate.avg}%"></i></div><div style="margin-top:10px">${core.map(s=>`<div class="metric"><span>${labels[s]}</span><strong>${Math.round(p[s]||0)}%</strong></div>`).join("")}</div><small class="muted">Модули: ${gate.mastered}/${gate.total} · перенос: ${gate.transferScore}% · отложенные подтверждения: ${gate.delayed}/4</small></article>`;
 }).join("");
 shell(`<div class="screen-head"><button class="back" onclick="navigate('hub')">←</button><div><div class="eyebrow">Реальное освоение</div><h2 style="margin:0">Что язык уже выдерживает без подсказки</h2></div></div>
 <div class="notice"><b>Здесь нет «уровня за просмотр уроков».</b> Профиль строится по ответам, переносу навыка в новые ситуации и повторной проверке после паузы. Это внутренняя учебная оценка, не официальный результат Norskprøven.</div>
 <section class="grid3" style="margin-top:14px"><div class="kpi"><small>Учебных попыток</small><strong>${attempts}</strong></div><div class="kpi"><small>Повторить сейчас</small><strong>${due}</strong></div><div class="kpi"><small>Серия занятий</small><strong>${state.streak} дн.</strong></div></section>
 <div class="section-title"><h2>По уровням A1–B2</h2></div><section class="grid">${levelCards}</section>
 <div class="section-title"><h2>История контрольных</h2></div><section class="card">${t.length?`<table class="table"><tr><th>Уровень</th><th>Результат</th><th>Дата</th></tr>${t.map(x=>`<tr><td>${x.level}</td><td>${x.score}%</td><td>${new Date(x.date).toLocaleDateString("ru-RU")}</td></tr>`).join("")}</table>`:'<div class="empty">Контрольных пока нет.</div>'}</section>
 <div class="section-title"><h2>Тренировочные экзамены</h2></div><section class="card">${e.length?`<table class="table"><tr><th>Диапазон</th><th>Итог</th><th>Дата</th></tr>${e.map(x=>`<tr><td>${x.band}</td><td>${x.score}%</td><td>${new Date(x.date).toLocaleDateString("ru-RU")}</td></tr>`).join("")}</table>`:'<div class="empty">Экзаменов пока нет.</div>'}</section>
 <button class="btn red" onclick="resetProgress()">Сбросить прогресс</button>`,"progress")
}
function resetProgress(){if(confirm("Удалить весь прогресс?")){localStorage.setItem("ne2_state_before_reset",JSON.stringify(state));localStorage.removeItem("ne2_state");localStorage.removeItem("ne_cloud_link");location.reload()}}

function evaluationErrorMessage(error){
 const code=String(error||"").trim();
 const messages={
  NETWORK:"Нет соединения с сервером проверки. Проверь интернет и повтори попытку.",
  SESSION_REQUIRED:"Сессия истекла. Скопируй ответ перед повторным входом в приложение.",
  APPROVAL_REQUIRED:"Проверка требует подтверждённого доступа к приложению.",
  AI_NOT_CONFIGURED:"Проверка не настроена на сервере. Администратору нужно проверить подключение AI.",
  AI_QUOTA_UNAVAILABLE:"Сервис контроля лимитов проверки не отвечает. Администратору нужно проверить сервер.",
  AI_QUOTA_EXCEEDED:"Лимит запросов к AI достигнут. Попробуй позднее.",
  RATE_LIMIT:"Слишком много запросов подряд. Попробуй позднее.",
  FEEDBACK_NOT_VERIFIED:"Нора не смогла подтвердить замечания по тексту. Повтори проверку: оценка не выставлена.",
  model_not_found:"Модель AI для проверки недоступна на сервере. Администратору нужно проверить настройки.",
  invalid_model:"Модель AI для проверки недоступна на сервере. Администратору нужно проверить настройки.",
  insufficient_quota:"На сервере исчерпан лимит оплаты AI. Администратору нужно проверить баланс."
 };
 const safeCode=code.replace(/[^a-zA-Z0-9_.-]/g,"").slice(0,60);
 return (messages[code]||("Сервис не выполнил проверку"+(safeCode?" (код: "+safeCode+")":"")+". Попробуй позднее."))+
  " Твой ответ остался в поле; оценка и XP не изменены.";
}
function verifiedNorwegianHintsHtml(hints){
 if(!Array.isArray(hints)||!hints.length)return "";
 const rows=hints.slice(0,3).filter(x=>x&&typeof x==="object"&&
   typeof x.source_fragment==="string"&&typeof x.corrected_fragment==="string"&&
   typeof x.explanation_ru==="string"&&x.source_fragment.length<=250&&
   x.corrected_fragment.length<=250&&x.explanation_ru.length<=500);
 if(!rows.length)return "";
 return '<div class="notice" style="margin-top:10px"><b>Разбор конкретных фрагментов без оценки:</b>'+
  rows.map(x=>'<p><span lang="nb">'+esc(x.source_fragment)+'</span> → <b lang="nb">'+
   esc(x.corrected_fragment)+'</b><br>'+esc(x.explanation_ru)+'</p>').join('')+
  '<small class="muted">Это подсказки по языку, а не результат проверки всего задания. XP и уровень не изменены.</small></div>';
}
async function aiEvaluate(payload){try{const r=await fetch("/api/evaluate",{method:"POST",headers:{"Content-Type":"application/json",...(window.NEAccess?.headers?.()||{})},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));return r.ok?{ok:true,data:d}:{ok:false,error:d.code||d.error||("HTTP "+r.status),verifiedHints:d.verified_hints||[]}}catch{return {ok:false,error:"NETWORK"}}}
function speakText(text,rate=.85){if(!("speechSynthesis" in window))return alert("Синтез речи не поддерживается.");speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang="nb-NO";u.rate=rate;const v=speechSynthesis.getVoices().find(x=>/^nb|no/i.test(x.lang));if(v)u.voice=v;speechSynthesis.speak(u)}
function toggleMic(target="freeAnswer"){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return alert("Распознавание речи недоступно. Используй Chrome и разреши микрофон.");if(speechRec){speechRec.stop();return}speechRec=new SR();speechRec.lang="nb-NO";speechRec.interimResults=true;const btn=document.getElementById(target==="chatInput"?"chatMicBtn":"micBtn"),f=document.getElementById(target),status=target==="chatInput"?document.getElementById("chatVoiceStatus"):null;speechRec.onstart=()=>{if(btn)btn.textContent="■ Слушаю…";if(status)status.textContent="Нора слушает…"};speechRec.onresult=e=>{let t="";for(let i=e.resultIndex;i<e.results.length;i++)t+=e.results[i][0].transcript;if(f){f.value=t;if(f.dataset.draftMode){f.dataset.fromVoice="true";saveLessonDraft(f.dataset.draftMode,f)}}};speechRec.onerror=e=>{if(status)status.textContent="Не удалось распознать речь.";alert("Ошибка микрофона: "+e.error)};speechRec.onend=()=>{speechRec=null;if(btn)btn.textContent="🎤 Говорить";if(status)status.textContent=f?.value?.trim()?"Готово — можно отправлять.":""};speechRec.start()}
function toggle(id){const e=document.getElementById(id);e.style.display=e.style.display==="none"?"block":"none"}
function startTimer(){stopTimer();timerHandle=setInterval(()=>{if(!examSession)return;examSession.remaining--;updateTimer();if(examSession.remaining<=0)finishExam()},1000)}
function updateTimer(){const e=document.getElementById("timer");if(!e||!examSession)return;const m=Math.floor(examSession.remaining/60),s=examSession.remaining%60;e.textContent=String(m).padStart(2,"0")+":"+String(s).padStart(2,"0")}
function stopTimer(){if(timerHandle){clearInterval(timerHandle);timerHandle=null}}

Object.assign(window,{neDiscardAcceptedGuidedDraft:discardAcceptedGuidedDraft,nePersistCoach:persistLessonCheckpoint,navigate,renderCourse,lessonNext,lessonChoice,checkDialogue,continueCheckedDialogue,continueAdaptiveVocab,checkFree,continueListeningStep,continueSpeakingFollowup,speakText,toggle,toggleMic,answerTest,answerTestFree,testNext,answerExamObj,answerExamFree,examNext,exitExam,resetProgress,xpRewardStatus,xpRewardCatalog});
Object.defineProperties(window,{neLessonSession:{get:()=>lessonSession},neLearnerState:{get:()=>state}});
renderHome();
// Service worker registration and update notices are handled by updates.js.