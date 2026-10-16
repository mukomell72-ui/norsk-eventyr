// Guided study day: one persistent, sequenced route; planning time is not a stopwatch.
(function(){
'use strict';
const LEVELS=['A1','A2','B1','B2'];
const BLOCKS=[
 {id:'vocab',title:'Вспоминаем нужные слова',description:'Слова текущей темы и употребление в контексте.',share:14,skill:'vocabulary'},
 {id:'grammar',title:'Разбираем грамматику',description:'Правило и проверка на практической фразе.',share:14,skill:'grammar'},
 {id:'listening',title:'Слушаем и понимаем',description:'Несколько коротких записей с вопросами по смыслу.',share:20,skill:'listening'},
 {id:'reading',title:'Читаем и проверяем смысл',description:'Текст текущей темы и самостоятельный ответ.',share:16,skill:'reading'},
 {id:'teacher',title:'Применяем с Норой',description:'Разговор, письмо, исправление ошибок и проверка этапа курса.',share:36,skill:'speaking'}
];
const clean=s=>typeof window.esc==='function'?window.esc(String(s??'')):String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>new Date().toLocaleDateString('sv-SE');
const learner=()=>window.neLearnerState||state;
const learnerSave=()=>window.saveState?.();
function duration(){
 const raw=Number(learner().elite?.dailyMinutes)||60;
 return Math.min(90,Math.max(45,Math.round(raw)));
}
function minutes(){
 const total=duration(),parts=BLOCKS.map((x,i)=>i===4?0:Math.floor(total*x.share/100));
 parts[4]=total-parts.slice(0,4).reduce((a,b)=>a+b,0);return parts;
}
function subject(){
 const s=learner(),A=window.NEAdaptive,C=window.NECurriculum;
 if(!A||!C)return null;
 A.ensure(s);
 let level=LEVELS.includes(s.level)?s.level:'A1',index=LEVELS.indexOf(level);
 const unlocked=A.highestUnlockedLevel(s);
 if(index>LEVELS.indexOf(unlocked))level=unlocked;
 if(A.levelGate(s,level).pass&&index<LEVELS.length-1&&LEVELS.indexOf(unlocked)>LEVELS.indexOf(level))
  level=LEVELS[LEVELS.indexOf(level)+1];
 const chapters=C.modules(level),module=chapters.find(m=>A.moduleMastery(s,m.id)<78)||chapters.at(-1);
 return module||null;
}
function readSession(){
 const s=learner(),p=s.learningV8||{},d=p.dailyCourse;
 return d&&d.version===1&&LEVELS.includes(d.level)&&typeof d.moduleId==='string'&&
  Array.isArray(d.done)&&Number.isInteger(d.item)&&d.item>=0?d:null;
}
function session(create=true){
 const s=learner(),old=readSession();
 if(old&&(!old.finished||old.date===today()))return old;
 if(!create)return null;
 const module=subject();if(!module)return null;
 const plan=window.NECourseMethod?.modulePlan(module,s),p=s.learningV8;
 const d={version:1,date:today(),moduleId:module.id,level:module.level,stageKey:plan?.stageKey||'introduce',
  done:[],item:0,misses:0,startedAt:new Date().toISOString(),finished:false,feedback:'',planned:duration()};
 p.dailyCourse=d;learnerSave();return d;
}
function exercises(d){
 const source=window.NECurated?.variant?.(d.moduleId,Number(d.date?.replaceAll('-',''))||0)||
  window.NECurated?.get?.(d.moduleId);
 if(!source)return null;
 const vocab=Array.isArray(source.vocab)?source.vocab.filter(x=>Array.isArray(x)&&x.length>=2&&x[0]&&x[1]):[];
 const count=d.level==='A1'?3:d.level==='A2'?4:Math.min(6,vocab.length);
 const words=vocab.slice(0,count).map(([word,meaning],i)=>{
  const pool=[meaning,...vocab.filter((v,j)=>j!==i&&v[1]!==meaning).slice(0,3).map(x=>x[1])];
  const distinct=[...new Set(pool)].slice(0,4);
  const shift=i%Math.max(1,distinct.length);
  const opts=distinct.slice(shift).concat(distinct.slice(0,shift));
  return {q:'Что означает «'+word+'»?',opts,correct:opts.indexOf(meaning),hint:'Вспомни, где это слово встречается в ситуации урока.'};
 });
 const sets=Array.isArray(source.listeningSets)&&source.listeningSets.length?source.listeningSets:
  [{audio:source.listeningAudio,q:source.listeningQ,opts:source.listeningOpts,correct:source.listeningCorrect}];
 return {
  source,words,
  grammar:[{q:source.grammarQ,opts:source.grammarOpts,correct:source.grammarCorrect,hint:source.grammarRuleRu}],
  listening:sets.map(x=>({q:x.q,opts:x.opts,correct:x.correct,audio:x.audio})),
  reading:[{q:source.q,opts:source.opts,correct:source.correct,read:source.read}]
 };
}
function stageIndex(d){return Math.min(d.done.length,BLOCKS.length);}
function summary(){
 const d=session(),m=minutes();
 if(!d)return null;
 const complete=d.finished===true;
 const index=stageIndex(d);
 return {date:d.date,moduleId:d.moduleId,level:d.level,stageKey:d.stageKey,done:index,total:5,
  planned:d.planned||duration(),finished:complete,steps:BLOCKS.map((b,i)=>({...b,mins:m[i],done:i<index,locked:i>index,sub:b.description})),
  mins:complete?0:m.slice(index).reduce((a,b)=>a+b,0)};
}
function view(){
 const d=session();if(!d)return;
 const s=learner(),module=window.NECurriculum?.moduleById(d.moduleId),plan=window.NECourseMethod?.modulePlan(module,s);
 const part=stageIndex(d),time=minutes(),lessons=exercises(d);
 const route=BLOCKS.map((block,i)=>{
  const done=i<part,active=i===part;
  return '<div class="metric" style="opacity:'+(i>part?'.65':'1')+';gap:10px"><span><b>'+(done?'✓ ':active?'→ ':'○ ')+clean(block.title)+'</b><small style="display:block">'+clean(block.description)+'</small></span><strong>'+time[i]+' мин</strong></div>';
 }).join('');
 let activity='';
 if(d.finished){
  activity='<div class="notice"><h3>Учебный день завершён</h3><p>Проверенный этап курса пройден. Новый учебный день откроется завтра; до этого можно повторять материал.</p><button class="btn secondary" onclick="navigate(\'course\',\''+clean(d.level)+'\')">Посмотреть маршрут</button></div>';
 }else if(!lessons){
  activity='<div class="notice">Подготовленный материал этого модуля временно недоступен. Переход не засчитывается.</div>';
 }else if(part===4){
  const outcome=String(d.feedback||'');
  activity='<div class="card"><h3>'+clean(BLOCKS[4].title)+'</h3><p>Теперь пройди полноценный урок Норы с проверкой аудирования, письма и устной речи. Этап будет засчитан только при подтверждённых результатах, не за сам факт посещения.</p>'+
  '<p class="muted">Этап: '+clean(d.stageKey)+'. Цель: '+clean(plan?.objective||module?.canDo?.[0]||'Общение по теме')+'</p>'+
  (outcome?'<div class="notice">'+clean(outcome)+'</div>':'')+
  '<button class="btn" onclick="NEDailyCourse.beginTeacher()">Начать / продолжить урок Норы →</button></div>';
 }else {
  const names=['words','grammar','listening','reading'],items=lessons[names[part]]||[];
  const item=items[d.item]||items[0],audio=part===2&&item?.audio;
  if(!item||!Array.isArray(item.opts)||item.opts.length<2||!Number.isInteger(Number(item.correct))){
   activity='<div class="notice">Нет проверенного задания для этого блока. Он не будет засчитан автоматически.</div>';
  }else {
   const choices=item.opts.map((v,i)=>'<button class="btn secondary" style="width:100%;text-align:left;margin:4px 0" onclick="NEDailyCourse.answer('+i+')">'+clean(v)+'</button>').join('');
   const intro=part===0?'<p>Вспомни значения слов. При необходимости открой учебную подсказку.</p>':
    part===1?'<p><b>Грамматика:</b> '+clean(module?.grammar||'')+'</p>':
    part===2?'<p>Сначала прослушай запись, затем ответь на вопрос. Текст записи заранее не показывается.</p>':
    '<div class="notice" lang="nb">'+clean(item.read||'')+'</div>';
   activity='<div class="card"><h3>'+clean(BLOCKS[part].title)+'</h3><small>Задание '+(d.item+1)+' из '+items.length+'</small>'+intro+
    (audio?'<p><button class="btn secondary" onclick="NEDailyCourse.listen()">▶ Прослушать</button></p>':'')+
    '<p lang="'+(part===0?'ru':'nb')+'"><b>'+clean(item.q)+'</b></p>'+choices+
    (item.hint?'<details><summary>Подсказка к правилу</summary><p>'+clean(item.hint)+'</p></details>':'')+
    (d.feedback?'<div class="feedback bad">'+clean(d.feedback)+'</div>':'')+'</div>';
  }
 }
 window.shell('<section class="card"><div class="eyebrow">Твой учебный день · '+clean(d.level)+'</div>'+
  '<h1>Последовательный курс с Норой</h1><h2>'+clean(module?.title||d.moduleId)+'</h2>'+
  '<p>План '+(d.planned||duration())+' минут (не меньше 45). Время ориентировочное: программа проверяет знания, а не нахождение экрана открытым. Незавершённый день сохраняется даже после полуночи.</p>'+
  '<div class="notice">Урок '+(d.finished?'завершён':(part+1)+' из 5')+' · '+clean(d.stageKey)+'. Новый модуль откроется только после подтверждения предыдущего.</div>'+
  route+'</section><section style="margin:16px 0">'+activity+'</section>'+
  '<button class="btn ghost" onclick="navigate(\'home\')">← На главную (прогресс сохранится)</button>','home');
}
function answer(index){
 const d=session(false);if(!d||d.finished)return false;
 const phase=stageIndex(d);if(phase>=4)return false;
 const set=exercises(d),group=['words','grammar','listening','reading'][phase],items=set?.[group],item=items?.[d.item];
 if(!item||!Number.isInteger(index)||index<0||index>=item.opts.length)return false;
 if(index!==item.correct){d.misses++;d.feedback='Ответ пока не принят. Разбери правило или текст и попробуй ещё раз.';learnerSave();view();return false}
 if(window.NEAdaptive){
  const score=d.misses?70:100,skill=BLOCKS[phase].skill;
  window.NEAdaptive.recordAttempt(learner(),{level:d.level,moduleId:d.moduleId,skill,score,source:'daily_guided_'+BLOCKS[phase].id});
 }
 d.feedback='';d.misses=0;d.item++;
 if(d.item>=items.length){d.done.push(BLOCKS[phase].id);d.item=0;}
 learnerSave();view();return true;
}
function listen(){
 const d=session(false);if(!d||stageIndex(d)!==2)return;
 const item=exercises(d)?.listening?.[d.item];
 if(item?.audio&&typeof window.speakText==='function')window.speakText(item.audio,.85);
}
function beginTeacher(){
 const d=session(false),s=learner();if(!d||d.finished||stageIndex(d)!==4)return;
 const ongoing=s.activeLesson?.id&&s.generatedLessons?.[s.activeLesson.id];
 if(ongoing&&ongoing?._adaptive?.moduleId!==d.moduleId){
  d.feedback='Сначала заверши ранее начатый урок, чтобы не потерять его прогресс.';learnerSave();view();return;
 }
 const mission=window.NEAdaptive?.moduleMission(s,d.moduleId);
 if(!mission||mission.blocked){d.feedback='Следующий модуль пока заблокирован предыдущими результатами.';learnerSave();view();return;}
 if(ongoing)return window.startLesson(ongoing.id);
 if(typeof window.teacherStartDailyModule==='function')return window.teacherStartDailyModule(d.moduleId,d.stageKey);
 d.feedback='Занятие Норы сейчас недоступно. Повтори попытку позже.';learnerSave();view();
}
function onLessonFinish(lesson,outcome,score){
 const d=session(false);
 if(!d||d.finished||stageIndex(d)!==4||lesson?._adaptive?.moduleId!==d.moduleId)return;
 const advanced=outcome?.advanced===true&&lesson?._adaptive?.courseStage===d.stageKey;
 if(advanced){d.done.push('teacher');d.finished=true;d.finishedAt=new Date().toISOString();d.score=Number(score)||0;d.feedback='';}
 else d.feedback=outcome?.reason||'Этап ещё не подтверждён. Попрактикуйся и повтори проверку.';
 learnerSave();
}
window.NEDailyCourse=Object.freeze({open:view,summary,answer,listen,beginTeacher,onLessonFinish});
})();
