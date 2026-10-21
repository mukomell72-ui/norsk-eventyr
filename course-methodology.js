// Original course scaffolding inspired by publicly documented NTNU teaching
// sequences and the HK-dir/CEFR skill framework; no third-party course texts.
(function(){
'use strict';
const LEVEL_WEEKS=Object.freeze({A1:16,A2:20,B1:28,B2:36});
const DAY_PARTS=[
 ['Повторение через интервалы',10],
 ['Новая тема и грамматика',12],
 ['Аудирование, чтение и понимание',13],
 ['Разговор с Норой и обратная связь',20],
 ['Письмо и выводы',5]
];
const STAGES=[
 {key:'introduce',title:'1. Знакомство с ситуацией',instruction:'Разбери ситуацию, ключевые фразы и грамматическую основу. Дай короткую опору на русском, затем попроси ученика ответить вслух простой полезной фразой и изменить её для себя. Не показывай готовый ответ в проверке.'},
 {key:'understand',title:'2. Осмысленное понимание',instruction:'Верни знакомые конструкции в новом диалоге и тексте. Проверь главную мысль и детали, затем попроси ученика устно уточнить информацию или ответить собеседнику. Подсказки давай только после самостоятельной попытки.'},
 {key:'produce',title:'3. Самостоятельная практика',instruction:'Проведи связанный разговор в роли реального собеседника: ученик самостоятельно отвечает, задаёт уточняющий вопрос и перефразирует мысль, затем пишет короткий ответ. Исправь главную ошибку и попроси повторить исправленную мысль в новом контексте.'},
 {key:'transfer',title:'4. Применение без подсказок',instruction:'Создай неожиданную, но жизненную ситуацию с той же целью. Потребуй самостоятельную устную реакцию, уточнение и поддержание разговора без шаблона, а затем короткий письменный итог. Проверяй перенос навыка после паузы, не узнавание готового образца.'}
];
const HOURS=Object.freeze(Object.fromEntries(Object.entries(LEVEL_WEEKS).map(([level,weeks])=>[level,weeks*6])));
function dailyPlan(minutes=60,skillProfile=null){
 const chosen=Number.isFinite(Number(minutes))?Math.round(Number(minutes)):60;
 const total=Math.max(20,Math.min(90,chosen));
 const points=DAY_PARTS.map((p,i)=>({label:p[0],minutes:i===4?0:Math.floor(p[1]*total/60)}));
 points[4].minutes=total-points.slice(0,4).reduce((sum,x)=>sum+x.minutes,0);
 const mapping={vocabulary:0,grammar:1,listening:2,reading:2,speaking:3,writing:4};
 const scores=Object.keys(mapping).map(k=>({skill:k,score:Number(skillProfile?.[k])}));
 // Do not personalize a cold-start learner on arbitrary default 35/100 scores:
 // only shift time when one skill is clearly behind the others.
 if(scores.every(x=>Number.isFinite(x.score)&&x.score>=0&&x.score<=100)){
  scores.sort((a,b)=>a.score-b.score);
  const weak=scores[0],runnerUp=scores[1];
  if(runnerUp.score-weak.score>=8){
   const target=mapping[weak.skill],donor=target===1?2:target===4?2:1;
   const requested=weak.skill==='speaking'?4:weak.skill==='writing'?2:3;
   const reserve=donor===1?Math.max(3,Math.round(total*0.12)):Math.max(4,Math.round(total*0.15));
   const shifted=Math.max(0,Math.min(requested,points[donor].minutes-reserve));
   points[donor].minutes-=shifted;points[target].minutes+=shifted;
  }
 }
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
 // The transfer check must happen on a later calendar day than the
 // *previously passed production phase*, not merely after module enrolment.
 // Existing courseV2 records are kept intact. For older records missing
 // a reliable pass timestamp, start a new waiting period on first transfer.
 const passedDay=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))
  ?new Date(value).toLocaleDateString('sv-SE'):'';
 let transferAfterDay='';
 if(stage.key==='transfer'){
  const recordedPass=passedDay(c.lastPassedAt);
  const legacyPass=c.lastFeedback?.passed===true&&c.lastFeedback?.stage==='produce'
   ?passedDay(c.lastFeedback.at):'';
  if(!recordedPass&&!legacyPass&&!c.transferBaselineOn)c.transferBaselineOn=today;
  transferAfterDay=recordedPass||legacyPass||c.transferBaselineOn||'';
 }
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
  ok=score>=80&&transferAfterDay<today&&!!transferAfterDay&&passed('writing',75,true)&&passed('speaking',75,true);
  if(!ok)why='Нужны новые устный и письменный ответы от 75/100 после паузы хотя бы в один день, а также 80/100 за занятие.';
 }
 if(ok){
  c.passedStages.push(stage.key);
  c.lastPassedAt=new Date().toISOString();
 }
 c.lastFeedback={stage:stage.key,passed:ok,reason:ok?'Этап освоен и подтверждён практикой.':why,at:new Date().toISOString()};
 return{advanced:ok,reason:c.lastFeedback.reason,completedPhases:c.passedStages.length,totalPhases:STAGES.length};
}
window.NECourseMethod=Object.freeze({source:'NTNU LearnNoW structure + HK-dir Læreplan + CEFR 2020; original authored activities',
 levelWeeks:LEVEL_WEEKS,levels:['A1','A2','B1','B2'],stages:STAGES,levelPlan,courseEstimate,dailyPlan,modulePlan,verifyStage});
})();