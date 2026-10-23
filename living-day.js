// A continuous teaching day built on the existing evidence-gated Norsk Eventyr curriculum.
// Three related full Nora lessons replace the former five separate mandatory destinations.
// A 60-minute teaching target is not a proficiency score; only active visible lesson time is counted.
(function(){
'use strict';
const LEVELS=['A1','A2','B1','B2'],SCENES=3;
const SCENE_LABELS=['Разбираемся в ситуации','Пробуем в новом разговоре','Говорим и действуем самостоятельно'];
const esc=value=>typeof window.esc==='function'?window.esc(String(value??'')):String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const localDay=()=>new Date().toLocaleDateString('sv-SE');
const learner=()=>window.neLearnerState;
const persist=()=>window.saveState?.();
const IDLE_MS=180000;
let lastPulse=0,lastActivity=0,lastSaved=0,clockJob=null;
function activeScreen(){
 return typeof document!=='undefined'&&!document.hidden&&
  !!document.querySelector('.lesson-head-v6,.guided-speaking,[data-ne-living-day]');
}
function clockPulse(){
 const now=Date.now(),d=learner()?.learningV8?.livingDay;
 if(lastPulse&&valid(d)&&!d.finished&&activeScreen()){
  const elapsed=Math.max(0,Math.min(15000,now-lastPulse));
  const allowed=Math.max(0,Math.min(elapsed,lastActivity+IDLE_MS-(now-elapsed)));
  if(allowed>0){
   d.activeMs=(Math.max(0,Number(d.activeMs)||0))+allowed;
   if(now-lastSaved>30000){persist();lastSaved=now}
  }
 }
 lastPulse=now;
 if(typeof document!=='undefined'){
  const node=document.getElementById('neLivingActiveMinutes');
  if(node&&valid(d))node.textContent=Math.floor((Number(d.activeMs)||0)/60000)+' мин';
 }
}
function clockStart(){
 if(typeof document==='undefined'||typeof setInterval!=='function')return;
 if(clockJob===null){
  const activity=()=>{clockPulse();lastActivity=Date.now()};
  document.addEventListener('pointerdown',activity,{passive:true});
  document.addEventListener('keydown',activity,{passive:true});
  document.addEventListener('visibilitychange',()=>{clockPulse();lastPulse=Date.now()});
  if(typeof window.addEventListener==='function')window.addEventListener('pagehide',()=>{clockPulse();persist()});
  clockJob=setInterval(clockPulse,5000);
 }
 lastActivity=Date.now();lastPulse=Date.now();
}
function archiveRecords(s){return Array.isArray(s?.learningV8?.lessonArchive)?s.learningV8.lessonArchive:[]}
function saveArchive(s,d){
 const entries=archiveRecords(s),title=window.NECurriculum?.moduleById(d.moduleId)?.title||'Урок с Норой';
 if(!entries.some(x=>x.id===d.id)){
  entries.unshift({id:d.id,date:d.date,level:d.level,moduleId:d.moduleId,title,
   scores:d.scores.slice(),lessonIds:(d.lessonIds||[]).slice(),stageKey:d.stageKey,
   plannedMinutes:d.plannedMinutes,activeMs:Math.max(0,Math.round(Number(d.activeMs)||0)),
   completedAt:d.completedAt});
 }
 s.learningV8.lessonArchive=entries.slice(0,180);
}
function archive(){
 const s=learner(),items=archiveRecords(s),pending=lessonPending(s);
 const lines=items.slice(0,60).map(d=>{
  const avg=d.scores?.length?Math.round(d.scores.reduce((a,b)=>a+b,0)/d.scores.length):0;
  const refs=(d.lessonIds||[]).filter(id=>s.generatedLessons?.[id]);
  const links=refs.map((id,i)=>'<button class="btn secondary" onclick="NELivingDay.replay(\''+esc(id)+'\')">Повторить часть '+(i+1)+'</button>').join(' ');
  return '<article class="card" style="margin-top:12px"><div class="eyebrow">'+esc(d.date)+' · '+esc(d.level)+'</div>'+
   '<h3>'+esc(d.title)+'</h3><p>Оценка самостоятельных ответов: '+avg+'/100 · Учтено активной работы: '+
   Math.floor((Number(d.activeMs)||0)/60000)+' мин</p><div class="row">'+
   (links||'<small class="muted">Исходные задания больше не доступны, история результатов сохранена.</small>')+'</div></article>';
 }).join('');
 window.shell('<section style="max-width:740px;margin:0 auto"><h1>Архив уроков</h1>'+
  '<p class="muted">Завершённые темы сохраняются для повторения. Повтор не открывает следующий уровень сам по себе. Время считается только при активной работе в открытом занятии.</p>'+
  (pending?'<div class="notice">Есть незаконченный урок: сначала заверши или продолжи его.</div>':'')+
  (lines||'<section class="card">Пока нет завершённых учебных дней.</section>')+
  '<button class="btn ghost" onclick="navigate(\'livingday\')">← Сегодняшний урок</button></section>','home');
}
function replay(id){
 const s=learner(),pending=lessonPending(s);
 if(pending)return window.startLesson?.(pending.id);
 const source=s?.generatedLessons?.[id],record=archiveRecords(s).find(x=>x.lessonIds?.includes(id));
 if(!source||!record)return archive();
 const lesson=JSON.parse(JSON.stringify(source));
 lesson.id='review-'+Date.now()+'-'+Math.floor(Math.random()*100000);
 lesson.title='Повторение: '+String(source.title||record.title).slice(0,100);
 // Isolate replay evidence from original module and prevent stage or level unlocking.
 lesson._adaptive={...source._adaptive,moduleId:'archive:'+id,kind:'archive_replay',
  courseStage:'',reviewKey:'',livingDayId:'',livingScene:null,startedAt:new Date().toISOString()};
 s.generatedLessons[lesson.id]=lesson;
 persist();return window.startLesson?.(lesson.id);
}
function estimate(state){
 const pref=Number(state?.elite?.dailyMinutes);
 return Math.max(45,Math.min(90,Number.isFinite(pref)&&pref>0?Math.round(pref):60));
}
function chosenModule(state){
 const adaptive=window.NEAdaptive,curriculum=window.NECurriculum;
 if(!adaptive||!curriculum||!state)return null;
 adaptive.ensure(state);
 const unlocked=adaptive.highestUnlockedLevel(state);
 let level=LEVELS.includes(state.level)?state.level:'A1';
 if(LEVELS.indexOf(level)>LEVELS.indexOf(unlocked))level=unlocked;
 if(adaptive.levelGate(state,level).pass&&LEVELS.indexOf(level)<LEVELS.indexOf(unlocked))level=unlocked;
 const modules=curriculum.modules(level)||[];
 return modules.find(m=>adaptive.moduleMastery(state,m.id)<78)||modules.at(-1)||null;
}
function valid(record){
 return record&&record.version===1&&typeof record.id==='string'&&
 LEVELS.includes(record.level)&&typeof record.moduleId==='string'&&
 typeof record.stageKey==='string'&&Number.isInteger(record.scene)&&
 record.scene>=0&&record.scene<=SCENES&&Array.isArray(record.scores);
}
function current(create=true){
 const s=learner();
 if(!s||!window.NEAdaptive)return null;
 window.NEAdaptive.ensure(s);
 const previous=s.learningV8.livingDay;
 if(valid(previous)&&(!previous.finished||previous.date===localDay()))return previous;
 if(!create)return null;
 const module=chosenModule(s),plan=module&&window.NECourseMethod?.modulePlan(module,s);
 if(!module||!plan)return null;
 const start={version:1,id:localDay()+':'+module.id+':'+plan.stageKey,
 date:localDay(),moduleId:module.id,level:module.level,stageKey:plan.stageKey,
 scene:0,scores:[],lessonIds:[],activeMs:0,plannedMinutes:estimate(s),finished:false,feedback:'',startedAt:new Date().toISOString()};
 s.learningV8.livingDay=start;persist();return start;
}
function details(create=true){
 const s=learner(),d=current(create);
 if(!d)return null;
 const module=window.NECurriculum?.moduleById(d.moduleId);
 return {id:d.id,date:d.date,moduleId:d.moduleId,level:d.level,title:module?.title||'Норвежский с Норой',
 objective:module?.canDo?.[0]||module?.title||'',description:module?.contexts||'',
 stageKey:d.stageKey,scene:d.scene,total:SCENES,finished:d.finished===true,
 plannedMinutes:d.plannedMinutes||60,feedback:d.feedback||'',sceneTitle:SCENE_LABELS[Math.min(d.scene,SCENES-1)],
 scores:d.scores.slice(),activeMinutes:Math.floor((Number(d.activeMs)||0)/60000)};
}
function lessonPending(s){
 const id=s?.activeLesson?.id;
 return id&&s?.generatedLessons?.[id]||null;
}
function open(){
 const s=learner(),d=current();clockStart();clockPulse();
 if(!d)return window.navigate?.('teacher');
 const pending=lessonPending(s);
 // A saved checkpoint takes precedence over a fresh vocabulary warm-up.
 if(pending?._adaptive?.livingDayId===d.id&&pending._adaptive?.livingScene===d.scene)
  return window.startLesson?.(pending.id);
 if(!pending&&!d.finished&&window.NELivingWords&&!window.NELivingWords.isReady())
  return window.NELivingWords.render();
 const info=details(),module=window.NECurriculum?.moduleById(d.moduleId),pacing=window.NECourseMethod?.dailyPlan?.(d.plannedMinutes,s.learningV8?.levelSkills?.[d.level]);
 const complete=d.finished===true,oldWork=pending&&pending._adaptive?.livingDayId!==d.id;
 const intro=complete
 ?'На сегодня цель выполнена. Следующий учебный день продолжит маршрут с учётом проверенных навыков.'
 :'Сначала короткие мини-этапы со словами и быстрой проверкой. Затем Нора поможет применить их в связанных жизненных ситуациях, диалогах, аудировании и речи. Прогресс сохраняется после каждого этапа.';
 const action=complete?'':oldWork
 ?'<button class="btn" onclick="NELivingDay.resumeOlder()">Завершить начатый ранее урок →</button>'
 :'<button class="btn" onclick="NELivingDay.begin()">Продолжить занятие с Норой →</button>';
 const hint=complete?'Результаты сохранены. Дополнительная практика доступна в курсе.':
 oldWork?'Незаконченный урок из прежней версии сохранён; сначала продолжи его.':
 'Продолжение открывается только после подтверждённого результата. Не нужно ждать окончания таймера.';
 window.shell(
 '<section class="card" data-ne-living-day="1" style="max-width:740px;margin:0 auto">'+
 '<div class="eyebrow">'+esc(d.level)+' · Твой учебный день</div>'+
 '<h1>'+esc(info.title)+'</h1>'+
 '<p><b>Цель:</b> '+esc(info.objective)+'</p>'+
 '<p>'+esc(intro)+'</p>'+
 '<div class="progress" aria-label="Прогресс сегодняшнего занятия"><i style="width:'+Math.round(d.scene/SCENES*100)+'%"></i></div>'+
 '<p><b>'+(complete?'Занятие завершено':esc(SCENE_LABELS[d.scene]))+'</b> · '+d.scene+' из '+SCENES+' ситуаций отработано</p>'+
 '<p class="muted">Цель: '+(d.plannedMinutes||60)+' мин активной работы. Учтено на экране занятия: <b id="neLivingActiveMinutes">'+Math.floor((Number(d.activeMs)||0)/60000)+' мин</b>. Неактивность более 3 минут и закрытая вкладка не учитываются. Прогресс зависит от самостоятельных ответов, а не от таймера.</p>'+
 (pacing?'<details class="card" style="margin:12px 0"><summary>Личный план занятия · '+pacing.minutes+' мин</summary>'+pacing.parts.map(part=>'<div class="metric"><span>'+esc(part.label)+'</span><strong>'+part.minutes+' мин</strong></div>').join('')+'<small class="muted">Время распределено по текущему профилю навыков; это план, а не гарантированная длительность.</small></details>':'')+
 (d.feedback?'<div class="notice">'+esc(d.feedback)+'</div>':'')+
 '<p class="muted">'+esc(hint)+'</p>'+action+
 (complete?'<button class="btn secondary" onclick="navigate(\'course\',\''+esc(d.level)+'\')">К программе уровня</button>':'')+
 '<button class="btn secondary" onclick="NELivingDay.archive()">Архив и повторение уроков →</button>'+
 '<button class="btn ghost" onclick="navigate(\'home\')">← Вернуться на главную</button>'+
 '</section>','home');
}
function resumeOlder(){
 const s=learner(),pending=lessonPending(s);
 return pending?window.startLesson?.(pending.id):open();
}
function begin(){
 const s=learner(),d=current();clockStart();clockPulse();
 if(!s||!d||d.finished||d.scene>=SCENES)return false;
 const pending=lessonPending(s);
 if(pending){
  if(pending._adaptive?.livingDayId===d.id&&pending._adaptive?.livingScene===d.scene)
   return window.startLesson?.(pending.id);
  return resumeOlder();
 }
 if(window.NELivingWords&&!window.NELivingWords.isReady())return window.NELivingWords.render();
 const mission=window.NEAdaptive?.moduleMission(s,d.moduleId);
 if(!mission||mission.blocked||mission.module?.id!==d.moduleId){
  d.feedback='Сначала нужно подтвердить предыдущий модуль или уровень.';
  persist();open();return false;
 }
 const stage=window.NECourseMethod?.modulePlan(mission.module,s);
 if(d.scene===0&&stage?.stageKey!==d.stageKey){
  d.feedback='Промежуточные результаты изменились. Заверши уже начатую проверку модуля, прежде чем продолжать.';
  persist();open();return false;
 }
 if(typeof window.teacherStartLivingScene!=='function'){
  d.feedback='Нора пока недоступна. Дневной прогресс сохранён.';
  persist();open();return false;
 }
 d.feedback='';persist();
 return window.teacherStartLivingScene(d.moduleId,d.id,d.scene,d.stageKey);
}
function verifiedProduction(s,lesson){
 const from=Date.parse(lesson?._adaptive?.startedAt||'');
 if(!Number.isFinite(from))return false;
 const attempts=s.learningV8?.attempts||[];
 const recent=attempts.filter(a=>a.moduleId===lesson._adaptive.moduleId&&!a.diagnostic&&Date.parse(a.date)>=from);
 const written=recent.some(a=>a.skill==='writing'&&Number(a.score)>=65);
 const spoken=recent.some(a=>a.skill==='speaking'&&Number(a.score)>=65&&
  ['dialogue_voice','lesson_free','lesson_free_transfer'].includes(a.source));
 return written&&spoken;
}
function onLessonFinished(lesson,outcome,average){
 clockPulse();
 const s=learner(),d=current(false),meta=lesson?._adaptive;
 if(!s||!d||d.finished||!meta||meta.livingDayId!==d.id||meta.livingScene!==d.scene||meta.moduleId!==d.moduleId)
  return null;
 const score=Number(average);
 // The first episode is the verified teaching stage; other episodes are
 // new practice within the SAME module, never silent mastery/unlocks.
 const pass=d.scene===0
  ?meta.courseStage===d.stageKey&&outcome?.advanced===true
  :meta.kind==='review'&&Number.isFinite(score)&&score>=75&&verifiedProduction(s,lesson);
 if(!pass){
  d.feedback=d.scene===0?(outcome?.reason||'Этап ещё не освоен. Нора предложит другой пример и повторную проверку.'):
   'В этой ситуации нужны самостоятельные письменный и устный ответы не ниже 65/100 и общая оценка от 75/100. Повтори практику.';
  persist();return {advanced:false,finished:false,reason:d.feedback};
 }
 d.scores.push(Math.round(score));
 d.lessonIds=Array.isArray(d.lessonIds)?d.lessonIds:[];
 if(!d.lessonIds.includes(lesson.id))d.lessonIds.push(lesson.id);
 d.scene++;
 if(d.scene===SCENES){d.finished=true;d.completedAt=new Date().toISOString();saveArchive(s,d)}
 d.feedback='';
 persist();
 return {advanced:true,finished:d.finished,reason:d.finished?'Учебный день пройден.':'Переходим к следующей ситуации той же темы.'};
}
window.NELivingDay=Object.freeze({open,begin,resumeOlder,details,onLessonFinished,estimate,archive,replay,clockPulse});
})();