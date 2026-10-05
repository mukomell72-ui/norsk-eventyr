(function(){
'use strict';
const CORE=['listening','reading','writing','speaking'];
const ALL=['listening','reading','writing','speaking','grammar','vocabulary'];
const LABEL={listening:'Аудирование',reading:'Чтение',writing:'Письмо',speaking:'Речь',grammar:'Грамматика',vocabulary:'Словарь'};
const REVIEW_STEPS=[1,3,7,14,30,60];
function clamp(x){return Math.max(0,Math.min(100,Math.round(Number(x)||0)))}
function dayKey(date=new Date()){return date.toLocaleDateString('sv-SE')}
function addDays(iso,days){const d=iso?new Date(iso+'T12:00:00'):new Date();d.setDate(d.getDate()+days);return d.toLocaleDateString('sv-SE')}
function ensure(state){
 if(!state.learningV8||typeof state.learningV8!=='object'||Array.isArray(state.learningV8))state.learningV8={};
 const p=state.learningV8;
 p.version='8.0-method-1';p.skills=p.skills||{};p.modules=p.modules||{};p.reviews=p.reviews||{};p.errorPatterns=p.errorPatterns||{};p.assessments=Array.isArray(p.assessments)?p.assessments:[];p.attempts=Array.isArray(p.attempts)?p.attempts:[];
 for(const s of ALL)if(!Number.isFinite(p.skills[s]))p.skills[s]=Number.isFinite(state.skills?.[s])?clamp(state.skills[s]):35;
 return p;
}
function moduleState(p,id){return p.modules[id]||(p.modules[id]={skills:{},attempts:0,mastery:0,lastSeen:null,transferPasses:0})}
function skillForStep(step,mode){
 if(mode==='writing'||mode==='speaking')return mode;
 return ({0:'speaking',1:'vocabulary',2:'listening',3:'reading',4:'writing',5:'speaking'})[Number(step)]||'vocabulary';
}
function recordAttempt(state,input={}){
 const p=ensure(state),skill=ALL.includes(input.skill)?input.skill:'vocabulary',score=clamp(input.score),weight=input.transfer?0.28:0.18;
 const old=clamp(p.skills[skill]);p.skills[skill]=clamp(old*(1-weight)+score*weight);
 const id=String(input.moduleId||input.lessonId||'general').slice(0,90),m=moduleState(p,id),mo=Number.isFinite(m.skills[skill])?m.skills[skill]:old;
 m.skills[skill]=clamp(mo*(1-weight)+score*weight);m.attempts=(m.attempts||0)+1;m.lastSeen=dayKey();
 if(input.transfer&&score>=80)m.transferPasses=(m.transferPasses||0)+1;
 const vals=Object.values(m.skills).filter(Number.isFinite);m.mastery=vals.length?clamp(vals.reduce((a,b)=>a+b,0)/vals.length):0;
 const tag=String(input.errorTag||'').slice(0,50);if(tag&&score<80)p.errorPatterns[tag]=(p.errorPatterns[tag]||0)+1;
 p.attempts.push({date:new Date().toISOString(),skill,score,moduleId:id,source:String(input.source||'practice').slice(0,40),errorTag:tag,transfer:!!input.transfer});
 p.attempts=p.attempts.slice(-500);
 scheduleReview(p,id,skill,score);
 return p.skills[skill];
}
function scheduleReview(p,moduleId,skill,score){
 const key=moduleId+':'+skill,r=p.reviews[key]||{stage:0,due:dayKey(),lastScore:null};
 if(score<60)r.stage=0;else if(score>=85)r.stage=Math.min(REVIEW_STEPS.length-1,(r.stage||0)+1);
 else r.stage=Math.max(0,r.stage||0);
 const wait=score<60?1:REVIEW_STEPS[r.stage]||7;r.lastScore=score;r.due=addDays(dayKey(),wait);p.reviews[key]=r;
}
function dueReviews(state){
 const p=ensure(state),today=dayKey();
 return Object.entries(p.reviews).filter(([,r])=>r&&r.due&&r.due<=today).map(([key,r])=>{const cut=key.lastIndexOf(':');return{key,moduleId:key.slice(0,cut),skill:key.slice(cut+1),...r}}).sort((a,b)=>(a.lastScore||0)-(b.lastScore||0));
}
function moduleMastery(state,id){return clamp(ensure(state).modules[id]?.mastery||0)}
function levelModules(level){return window.NECurriculum?.modules(level)||[]}
function levelGate(state,level){
 const p=ensure(state),mods=levelModules(level),transfer=mods.at(-1),scores=CORE.map(s=>clamp(p.skills[s])),avg=scores.reduce((a,b)=>a+b,0)/scores.length;
 const mastered=mods.filter(m=>moduleMastery(state,m.id)>=78).length,transferScore=transfer?moduleMastery(state,transfer.id):0;
 const delayed=Object.values(p.reviews).filter(r=>r&&r.stage>=2&&(r.lastScore||0)>=80).length;
 const pass=avg>=80&&Math.min(...scores)>=70&&clamp(p.skills.grammar)>=70&&clamp(p.skills.vocabulary)>=70&&mastered>=Math.max(1,mods.length-2)&&transferScore>=80&&delayed>=4;
 return{pass,avg:clamp(avg),minCore:Math.min(...scores),mastered,total:mods.length,transferScore,delayed};
}
function weakestSkill(state){const p=ensure(state);return ALL.slice().sort((a,b)=>p.skills[a]-p.skills[b])[0]}
function nextModule(state,level){
 const mods=levelModules(level);if(!mods.length)return null;
 return mods.find(m=>moduleMastery(state,m.id)<78)||mods.at(-1);
}
function nextMission(state){
 const p=ensure(state),level=['A1','A2','B1','B2'].includes(state.level)?state.level:'A1',due=dueReviews(state);
 if(due.length){
  const d=due[0],m=window.NECurriculum?.moduleById(d.moduleId)||nextModule(state,level);
  return{kind:'review',level,module:m,skill:d.skill,reason:'Пора проверить, сохранился ли материал после паузы.',reviewKey:d.key};
 }
 const skill=weakestSkill(state),module=nextModule(state,level);
 return{kind:'learn',level,module,skill,reason:'Сейчас это самое слабое звено в твоём профиле навыков.'};
}
function assessment(state,level,score,skillScores={}){
 const p=ensure(state),s=clamp(score);
 for(const skill of CORE)recordAttempt(state,{skill,score:skillScores[skill]??s,moduleId:level+'-assessment',source:'level_test',transfer:true});
 p.assessments.push({date:new Date().toISOString(),level,score:s,skills:skillScores});p.assessments=p.assessments.slice(-50);
}
function completeLesson(state,lesson){
 const p=ensure(state),id=lesson?._adaptive?.moduleId||lesson?.id||'lesson',m=moduleState(p,id);m.lastCompleted=dayKey();m.completions=(m.completions||0)+1;if(lesson?._adaptive)p.lastSessionDate=dayKey();
 if(lesson?._adaptive?.kind==='review'&&lesson._adaptive.reviewKey&&p.reviews[lesson._adaptive.reviewKey])p.reviews[lesson._adaptive.reviewKey].completedAt=new Date().toISOString();
}
function errors(state){return Object.entries(ensure(state).errorPatterns).sort((a,b)=>b[1]-a[1]).slice(0,6).map(x=>x[0])}
function reviewWords(state){if(typeof window.neReinforcementWords==='function')return window.neReinforcementWords(12);return[]}
function bars(state){
 const p=ensure(state);return ALL.map(s=>'<div class="metric"><span>'+LABEL[s]+'</span><strong>'+clamp(p.skills[s])+'%</strong></div><div class="progress"><i style="width:'+clamp(p.skills[s])+'%"></i></div>').join('');
}
function startAdaptiveTeacher(){
 ensure(state);const mission=nextMission(state),gate=levelGate(state,state.level),p=state.learningV8,attempts=p.attempts.length;
 const m=mission.module,reason=mission.reason+(m?' Цель: '+m.canDo[0]+'.':'');
 shell('<div class="screen-head"><button class="back" onclick="navigate(\'home\')">←</button><div><div class="eyebrow">Адаптивный преподаватель · '+esc(state.level)+'</div><h2 style="margin:0">Нора ведёт занятие</h2></div></div>'+
 '<section class="grid"><article class="card"><div class="eyebrow">Следующий шаг</div><h2>'+esc(m?.title||'Диагностика')+'</h2><p>'+esc(reason)+'</p><div class="row"><span class="tag">'+esc(LABEL[mission.skill]||mission.skill)+'</span><span class="tag">'+(mission.kind==='review'?'Повторение':'Новый материал')+'</span></div><br><button class="btn" onclick="teacherStartMission()">Начать занятие</button></article>'+
 '<article class="card"><div class="eyebrow">Допуск к '+esc(state.level)+'</div><h2>'+gate.avg+'% профиль</h2><p class="muted">Уровень не засчитывается по одному тесту. Нужны четыре навыка, перенос в новой ситуации и отложенная проверка.</p><div class="metric"><span>Освоено модулей</span><strong>'+gate.mastered+'/'+gate.total+'</strong></div><div class="metric"><span>Отложенных подтверждений</span><strong>'+gate.delayed+'/4</strong></div><div class="metric"><span>Статус</span><strong>'+(gate.pass?'Пройден':'Есть работа')+'</strong></div></article></section>'+
 '<div class="section-title"><h2>Профиль навыков</h2></div><section class="card">'+bars(state)+'</section>'+
 (attempts<8?'<section class="notice" style="margin-top:14px"><b>Пока мало данных.</b> Пройди контроль уровня: после нескольких ответов преподаватель будет выбирать задания точнее. <button class="btn secondary" style="margin-top:10px" onclick="navigate(\'test\',\''+escJs(state.level)+'\')">Диагностика '+esc(state.level)+'</button></section>':'')+
 '<section class="card" style="margin-top:14px"><h3>Как работает преподаватель</h3><p class="muted">Не переводит дальше только за факт прохождения. Он собирает доказательства по аудированию, чтению, письму, речи, грамматике и словарю; возвращает ошибки через интервалы; усложняет контекст; требует самостоятельного ответа и переноса навыка.</p></section>','home');
}
async function teacherStartMission(){
 const mission=nextMission(state),m=mission.module;if(!m)return;
 shell('<section class="card loading-card"><div class="spinner"></div><h2>Нора готовит занятие</h2><p class="muted">Цель — '+esc(m.canDo[0])+'. Задания будут подстроены под слабые места, а не случайно сгенерированы.</p></section>','home');
 const p=ensure(state),payload={kind:'lesson',level:mission.level,topic:m.contexts,goal:m.canDo.join('; '),moduleId:m.id,skillFocus:mission.skill,canDo:m.canDo,grammarFocus:m.grammar,lexiconFocus:m.lexicon,mastery:{...p.skills},errorPatterns:errors(state),weakSkills:ALL.filter(s=>p.skills[s]<65),reviewWords:reviewWords(state),teacherMode:true,reviewMode:mission.kind==='review'};
 try{
  const r=typeof neApiPost==='function'?await neApiPost('/api/generate',payload):await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(async x=>({ok:x.ok,data:await x.json()}));
  if(!r.ok||!r.data)throw new Error(r.error||'GENERATION');
  const lesson={...r.data,id:'adaptive-'+m.id+'-'+Date.now(),level:mission.level,title:r.data.title||m.title,_adaptive:{moduleId:m.id,skill:mission.skill,kind:mission.kind,reviewKey:mission.reviewKey||'',canDo:m.canDo}};
  state.generatedLessons=state.generatedLessons||{};state.generatedLessons[lesson.id]=lesson;saveState();lessonSession={lesson,step:0,locked:false};renderLesson();
 }catch(e){shell('<section class="card"><h2>Занятие не создано</h2><p class="muted">Не засчитываю ничего без полноценного задания. Проверь соединение и повтори.</p><button class="btn" onclick="startAdaptiveTeacher()">Назад</button></section>','home')}
}
window.NEAdaptive={ensure,recordAttempt,assessment,completeLesson,dueReviews,nextMission,levelGate,moduleMastery,skillForStep,errors};
Object.assign(window,{startAdaptiveTeacher,teacherStartMission});
})();