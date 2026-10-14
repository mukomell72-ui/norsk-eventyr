// Original course scaffolding inspired by publicly documented NTNU teaching
// sequences and the HK-dir/CEFR skill framework; no third-party course texts.
(function(){
'use strict';
const LEVEL_WEEKS=Object.freeze({A1:16,A2:20,B1:28,B2:36});
const DAY_PARTS=[
 ['Повторение через интервалы',10],
 ['Новая тема и грамматика',15],
 ['Аудирование и понимание',15],
 ['Разговор с Норой',15],
 ['Письмо и выводы',5]
];
const STAGES=[
 {key:'introduce',title:'1. Знакомство с ситуацией',instruction:'Разбери ситуацию, ключевые фразы и грамматическую основу. Дай опору, затем проверь понимание, не показывая готовый ответ.'},
 {key:'understand',title:'2. Осмысленное понимание',instruction:'Верни знакомые конструкции в новом диалоге и тексте. Проверь главную мысль и детали, не угадывание по совпадающим словам.'},
 {key:'produce',title:'3. Самостоятельная практика',instruction:'Попроси самостоятельно сформулировать ответ устно и письменно, исправь ошибки с коротким объяснением. Опирайся на ту же цель модуля.'},
 {key:'transfer',title:'4. Применение без подсказок',instruction:'Создай новую жизненную ситуацию с теми же коммуникативными целями. Проверь независимое применение, а не повтор ранее показанного образца.'}
];
const HOURS=Object.freeze(Object.fromEntries(Object.entries(LEVEL_WEEKS).map(([level,weeks])=>[level,weeks*6])));
function dailyPlan(minutes=60){
 const chosen=Number.isFinite(Number(minutes))?Math.round(Number(minutes)):60;
 const total=Math.max(20,Math.min(90,chosen));
 const points=DAY_PARTS.map((p,i)=>({label:p[0],minutes:i===4?0:Math.floor(p[1]*total/60)}));
 points[4].minutes=total-points.slice(0,4).reduce((sum,x)=>sum+x.minutes,0);
 return {minutes:total,daysPerWeek:6,parts:points};
}
function levelPlan(level){
 const weeks=LEVEL_WEEKS[level]||LEVEL_WEEKS.A1;
 return {level:LEVEL_WEEKS[level]?level:'A1',weeks,hours:weeks*6,moduleCount:8,expectedStudyDays:weeks*6,daysPerModule:Math.round(weeks*6/8)};
}
function courseEstimate(minutes=60){
 const plan=dailyPlan(minutes),hours=Object.values(HOURS).reduce((s,n)=>s+n,0);
 const hoursPerWeek=plan.minutes*plan.daysPerWeek/60;
 return {dailyMinutes:plan.minutes,hoursPerWeek,coreHours:hours,approxWeeks:Math.ceil(hours/hoursPerWeek)};
}
function modulePlan(module,state){
 if(!module||!LEVEL_WEEKS[module.level])return null;
 const base=levelPlan(module.level);
 const completed=Math.max(0,Number(state?.learningV8?.modules?.[module.id]?.completions)||0);
 const passed=state?.learningV8?.modules?.[module.id]?.courseV2?.passedStages;
 // Modern courses advance on verified learning stages; completion counts are
 // retained as a read-only compatibility path for legacy learners only.
 const stageIndex=Array.isArray(passed)?Math.min(STAGES.length-1,passed.length):Math.min(STAGES.length-1,Math.floor(completed/Math.max(1,Math.ceil(base.daysPerModule/STAGES.length))));
 const stage=STAGES[stageIndex];
 const objective=stageIndex===0?module.canDo?.[0]:stageIndex===1?module.canDo?.[1]:stageIndex===2?module.canDo?.[2]:module.canDo?.[0];
 return {id:module.id,level:module.level,stageKey:stage.key,stageIndex,stageTitle:stage.title,stageInstruction:stage.instruction,objective:objective||module.title,
  lessonNumber:completed+1,studyDaysGuide:base.daysPerModule,verifiedStages:Array.isArray(passed)?passed.length:null,graduated:Array.isArray(passed)&&passed.length===STAGES.length,
  grammar:module.grammar,lexicon:module.lexicon,canDo:module.canDo?.slice()||[]};
}
function verifyStage(state,moduleId,meta,sessionScore){
 const p=state?.learningV8,m=p?.modules?.[moduleId],c=m?.courseV2;
 if(!c||!Array.isArray(c.passedStages)||meta?.kind!=='learn')return null;
 const stage=STAGES[c.passedStages.length];
 if(!stage)return null;
 const score=Number(sessionScore),start=meta?.startedAt;
 const validStart=typeof start==='string'&&Number.isFinite(Date.parse(start));
 const attempts=validStart?(p.attempts||[]).filter(a=>a.moduleId===moduleId&&!a.diagnostic&&a.date>=start):[];
 const voiceSources=new Set(['dialogue_voice','lesson_free','lesson_free_transfer']);
 const passed=(skill,min=65,transfer=false)=>attempts.some(a=>a.skill===skill&&a.score>=min&&(!transfer||a.transfer===true)&&(skill!=='speaking'||voiceSources.has(a.source)));
 const skills=new Set(attempts.filter(a=>a.score>=55).map(a=>a.skill));
 const today=new Date().toLocaleDateString('sv-SE');
 let ok=false,why='';
 if(!validStart||meta.courseStage!==stage.key)why='Этап не подтверждён: нет достоверных ответов текущего занятия.';
 else if(!Number.isFinite(score)||score<75)why='Средняя оценка занятия должна быть не ниже 75/100.';
 else if(stage.key==='introduce'){
  ok=skills.size>=3;
  if(!ok)why='Нужны проверенные ответы хотя бы по трём навыкам.';
 }else if(stage.key==='understand'){
  ok=passed('listening')&&passed('reading');
  if(!ok)why='Нужно подтвердить аудирование и понимание текста.';
 }else if(stage.key==='produce'){
  ok=passed('writing',70)&&passed('speaking',70);
  if(!ok)why='Для перехода нужны проверенные письмо и речь через микрофон (не менее 70/100 каждое).';
 }else if(stage.key==='transfer'){
  ok=score>=80&&c.startedOn<today&&passed('writing',75,true)&&passed('speaking',75,true);
  if(!ok)why='Нужны новые устный и письменный ответы от 75/100 после паузы хотя бы в один день, а также 80/100 за занятие.';
 }
 if(ok)c.passedStages.push(stage.key);
 c.lastFeedback={stage:stage.key,passed:ok,reason:ok?'Этап освоен и подтверждён практикой.':why,at:new Date().toISOString()};
 return{advanced:ok,reason:c.lastFeedback.reason,completedPhases:c.passedStages.length,totalPhases:STAGES.length};
}
window.NECourseMethod=Object.freeze({source:'NTNU LearnNoW structure + HK-dir Læreplan + CEFR 2020; original authored activities',
 levelWeeks:LEVEL_WEEKS,levels:['A1','A2','B1','B2'],stages:STAGES,levelPlan,courseEstimate,dailyPlan,modulePlan,verifyStage});
})();