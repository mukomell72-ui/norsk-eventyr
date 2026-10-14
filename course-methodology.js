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
 const stageIndex=Math.min(STAGES.length-1,Math.floor(completed/Math.max(1,Math.ceil(base.daysPerModule/STAGES.length))));
 const stage=STAGES[stageIndex];
 const objective=stageIndex===0?module.canDo?.[0]:stageIndex===1?module.canDo?.[1]:stageIndex===2?module.canDo?.[2]:module.canDo?.[0];
 return {id:module.id,level:module.level,stageKey:stage.key,stageIndex,stageTitle:stage.title,stageInstruction:stage.instruction,objective:objective||module.title,
  lessonNumber:completed+1,studyDaysGuide:base.daysPerModule,grammar:module.grammar,lexicon:module.lexicon,canDo:module.canDo?.slice()||[]};
}
window.NECourseMethod=Object.freeze({source:'NTNU LearnNoW structure + HK-dir Læreplan + CEFR 2020; original authored activities',
 levelWeeks:LEVEL_WEEKS,levels:['A1','A2','B1','B2'],stages:STAGES,levelPlan,courseEstimate,dailyPlan,modulePlan});
})();