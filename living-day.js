// A continuous teaching day built on the existing evidence-gated Norsk Eventyr curriculum.
// Three related full Nora lessons replace the former five separate mandatory destinations.
// Timing is a pedagogical estimate, not a measured clock or proof of level attainment.
(function(){
'use strict';
const LEVELS=['A1','A2','B1','B2'],SCENES=3;
const SCENE_LABELS=['Разбираемся в ситуации','Пробуем в новом разговоре','Говорим и действуем самостоятельно'];
const esc=value=>typeof window.esc==='function'?window.esc(String(value??'')):String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const localDay=()=>new Date().toLocaleDateString('sv-SE');
const learner=()=>window.neLearnerState;
const persist=()=>window.saveState?.();
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
 scene:0,scores:[],plannedMinutes:estimate(s),finished:false,feedback:'',startedAt:new Date().toISOString()};
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
 scores:d.scores.slice()};
}
function lessonPending(s){
 const id=s?.activeLesson?.id;
 return id&&s?.generatedLessons?.[id]||null;
}
function open(){
 const s=learner(),d=current();
 if(!d)return window.navigate?.('teacher');
 if(!d.finished&&window.NELivingWords&&!window.NELivingWords.isReady())return window.NELivingWords.render();
 const info=details(),module=window.NECurriculum?.moduleById(d.moduleId);
 const pending=lessonPending(s);
 // One tap resumes the saved *same* lesson rather than creating another copy.
 if(pending?._adaptive?.livingDayId===d.id&&pending._adaptive?.livingScene===d.scene)
  return window.startLesson?.(pending.id);
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
 '<section class="card" style="max-width:740px;margin:0 auto">'+
 '<div class="eyebrow">'+esc(d.level)+' · Твой учебный день</div>'+
 '<h1>'+esc(info.title)+'</h1>'+
 '<p><b>Цель:</b> '+esc(info.objective)+'</p>'+
 '<p>'+esc(intro)+'</p>'+
 '<div class="progress" aria-label="Прогресс сегодняшнего занятия"><i style="width:'+Math.round(d.scene/SCENES*100)+'%"></i></div>'+
 '<p><b>'+(complete?'Занятие завершено':esc(SCENE_LABELS[d.scene]))+'</b> · '+d.scene+' из '+SCENES+' ситуаций отработано</p>'+
 '<p class="muted">Можно заниматься короткими заходами и продолжить позже. Полный учебный день ориентировочно '+(d.plannedMinutes||60)+' мин; фактическое время не измеряется. Переход зависит от понимания и самостоятельных ответов.</p>'+
 (d.feedback?'<div class="notice">'+esc(d.feedback)+'</div>':'')+
 '<p class="muted">'+esc(hint)+'</p>'+action+
 (complete?'<button class="btn secondary" onclick="navigate(\'course\',\''+esc(d.level)+'\')">К программе уровня</button>':'')+
 '<button class="btn ghost" onclick="navigate(\'home\')">← Вернуться на главную</button>'+
 '</section>','home');
}
function resumeOlder(){
 const s=learner(),pending=lessonPending(s);
 return pending?window.startLesson?.(pending.id):open();
}
function begin(){
 const s=learner(),d=current();
 if(!s||!d||d.finished||d.scene>=SCENES)return false;
 if(window.NELivingWords&&!window.NELivingWords.isReady())return window.NELivingWords.render();
 const pending=lessonPending(s);
 if(pending){
  if(pending._adaptive?.livingDayId===d.id&&pending._adaptive?.livingScene===d.scene)
   return window.startLesson?.(pending.id);
  return resumeOlder();
 }
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
 d.scene++;
 if(d.scene===SCENES){d.finished=true;d.completedAt=new Date().toISOString()}
 d.feedback='';
 persist();
 return {advanced:true,finished:d.finished,reason:d.finished?'Учебный день пройден.':'Переходим к следующей ситуации той же темы.'};
}
window.NELivingDay=Object.freeze({open,begin,resumeOlder,details,onLessonFinished,estimate});
})();