/* Norsk Eventyr 8.2 — optional, evidence-aware second-stage placement.
 * Training guidance only; not an official CEFR assessment.
 */
(()=>{
 'use strict';
 const LEVELS=['A1','A2','B1','B2'];
 const TASKS={
  A1:[
   {skill:'writing',prompt:'Напиши по-норвежски 2–3 коротких предложения: как тебя зовут, где живёшь и что любишь.'},
   {skill:'speaking',prompt:'Ответь голосом по-норвежски: Hva heter du, og hvor bor du?'}
  ],
  A2:[
   {skill:'writing',prompt:'Напиши по-норвежски короткое сообщение коллеге: ты опоздаешь, объясни почему и предложи новое время.'},
   {skill:'speaking',prompt:'Ответь голосом: Fortell om en dag du hadde mye å gjøre. Hva gjorde du først, og hva gjorde du etterpå?'}
  ],
  B1:[
   {skill:'writing',prompt:'Напиши по-норвежски связное сообщение начальнику: опиши проблему на работе, её причину и предложи решение.'},
   {skill:'speaking',prompt:'Ответь голосом: Beskriv en utfordring på jobben eller i hverdagen. Hva skjedde, og hvordan løste du problemet?'},
   {skill:'speaking',prompt:'Ответь на дополнительный вопрос без подсказки: Hvorfor valgte du denne løsningen, og hva ville du gjort annerledes?'}
  ],
  B2:[
   {skill:'writing',prompt:'Напиши по-норвежски аргументированное обращение о цифровизации муниципальных услуг: позиция, преимущества, риск, контраргумент и вывод.'},
   {skill:'speaking',prompt:'Ответь голосом: Bør kommunale tjenester først og fremst være digitale? Drøft både fordeler og ulemper, og begrunn standpunktet ditt.'},
   {skill:'speaking',prompt:'Ответь голосом на возражение: En kollega mener at digitale løsninger alltid er mer effektive. Hva vil du svare, og hvilke forbehold vil du ta?'}
  ]
 };
 const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const clamp=x=>Math.max(0,Math.min(100,Math.round(Number(x)||0)));
 const mean=a=>Math.round(a.reduce((sum,x)=>sum+x,0)/Math.max(1,a.length));
 const validLevel=l=>LEVELS.includes(l)?l:'A1';
 const phrase={writing:'Письмо',speaking:'Говорение'};
 let busy=false;
 function placement(){
  if(!state.placement||typeof state.placement!=='object')return null;
  const p=state.placement;
  p.productive=p.productive&&typeof p.productive==='object'&&!Array.isArray(p.productive)?p.productive:{status:'pending',nextIndex:0,results:[]};
  p.productive.results=Array.isArray(p.productive.results)?p.productive.results:[];
  p.productive.nextIndex=Math.max(0,Math.min(TASKS[validLevel(p.recommendedStart||p.level)].length,Number(p.productive.nextIndex)||0));
  return p;
 }
 function beginner(){
  if(state.placement)return navigate('teacher');
  state.level='A1';
  state.placement={level:'A1',recommendedStart:'A1',scope:'beginner_choice',date:new Date().toISOString(),
   productive:{status:'postponed',nextIndex:0,results:[],date:null}};
  if(state.chatPrefs)state.chatPrefs.level='A1';
  if(window.NEAdaptive){const a=NEAdaptive.ensure(state);a.startLevel='A1';}
  saveState();navigate('teacher');
 }
 function postpone(){
  const p=placement();if(!p)return navigate('placement');
  if(p.productive.status!=='complete')p.productive.status='postponed';
  saveState();navigate('teacher');
 }
 function reset(){ // repeat without erasing existing learning evidence
  const p=placement();if(!p)return navigate('placement');
  p.productive={status:'pending',nextIndex:0,results:[]};
  saveState();render();
 }
 function stage(){
  const p=placement();if(!p)return null;
  const target=validLevel(p.recommendedStart||p.level);
  return{p,target,tasks:TASKS[target],index:p.productive.nextIndex};
 }
 function resultFor(results,skill){const scores=results.filter(x=>x.skill===skill&&Number.isFinite(x.score)).map(x=>x.score);return scores.length?mean(scores):null}
 function summarize(){
  const x=stage();if(!x)return navigate('placement');
  const {p,target}=x,results=p.productive.results,w=resultFor(results,'writing'),sp=resultFor(results,'speaking');
  const gaps=[['writing',w],['speaking',sp]].filter(([,n])=>n!==null&&n<50);
  const notes=gaps.length?gaps.map(([key])=>phrase[key].toLowerCase()).join(' и '):'письмо и говорение';
  shell('<section class="card" style="max-width:760px;margin:26px auto">'+
   '<div class="eyebrow">Индивидуальный маршрут · этап 2 завершён</div><h1>Нора уточнила твой профиль</h1>'+
   '<p>Предварительная стартовая ступень: <b>'+safe(target)+'</b>. Устный и письменный результаты оцениваются отдельно.</p>'+
   '<div class="metric"><span>Письмо · учебная оценка</span><strong>'+(w===null?'Не проверено':w+'/100')+'</strong></div>'+
   '<div class="metric"><span>Говорение по расшифровке · учебная оценка</span><strong>'+(sp===null?'Не проверено':sp+'/100')+'</strong></div>'+
   '<div class="notice"><b>Важно:</b> это не сертификат CEFR. Устная оценка относится к содержанию распознанной речи, а не к фонетике или беглости. Рекомендации по сложности ещё будут проверяться на новых заданиях.</div>'+
   '<p>Следующие занятия подбираются с учётом результатов. '+(gaps.length?'Особое внимание: '+safe(notes)+'.':'Нора продолжит проверять навыки на новых ситуациях.')+'</p>'+
   '<div class="row"><button class="btn" onclick="navigate(\'teacher\')">Начать индивидуальные занятия</button><button class="btn secondary" onclick="NECalibration.reset()">Проверить ещё раз</button></div></section>','home');
 }
 function render(){
  const x=stage();if(!x)return navigate('placement');
  if(x.index>=x.tasks.length||x.p.productive.status==='complete')return summarize();
  const task=x.tasks[x.index],isSpeaking=task.skill==='speaking';
  x.p.productive.status='in_progress';saveState();
  shell('<section class="card" style="max-width:760px;margin:26px auto">'+
   '<div class="eyebrow">Нора · индивидуальная диагностика · этап 2/2</div>'+
   '<h1>'+safe(phrase[task.skill])+' · '+safe(x.target)+'</h1>'+
   '<p class="muted">Задание '+(x.index+1)+' из '+x.tasks.length+'. Пиши и говори самостоятельно, без заученного образца.</p>'+
   '<div class="prompt">'+safe(task.prompt)+'</div>'+
   (isSpeaking?'<p class="muted">Для подтверждения говорения используй микрофон. Простое введение текста не является ответом голосом. Произношение здесь не оценивается.</p>':
    '<p class="muted">Напиши собственный ответ на Bokmål. Ошибки помогут определить, что нужно тренировать.</p>')+
   '<textarea id="calibrationAnswer" rows="5" class="input" maxlength="6000" placeholder="'+(isSpeaking?'Нажми микрофон и произнеси ответ…':'Твой ответ по-норвежски…')+'" oninput="this.dataset.fromVoice=\'false\'"></textarea>'+
   '<div class="row" style="margin-top:12px">'+
   (isSpeaking?'<button id="micBtn" class="btn secondary" onclick="toggleMic(\'calibrationAnswer\')">🎤 Записать ответ</button>':'')+
   '<button id="calibrationSubmit" class="btn" onclick="NECalibration.submit()">Проверить ответ</button>'+
   '<button class="btn ghost" onclick="NECalibration.postpone()">Продолжить позже</button></div>'+
   '<div id="calibrationFeedback" role="status" aria-live="polite"></div>'+
   '<p class="muted" style="margin-top:12px">Нора не изменит твой уровень только на основании одного ответа. Оценка предварительная и уточняется во время обучения.</p></section>','home');
 }
 async function submit(){
  if(busy)return;
  const x=stage();if(!x||x.index>=x.tasks.length)return;
  const task=x.tasks[x.index],input=document.getElementById('calibrationAnswer'),box=document.getElementById('calibrationFeedback');
  if(!input||!box)return;
  const answer=input.value.trim();if(!answer){box.innerHTML='<div class="feedback bad">Сначала дай ответ по-норвежски.</div>';return;}
  const voice=input.dataset.fromVoice==='true'||input.dataset.fromVoice==='recognition';
  if(task.skill==='speaking'&&!voice){
   box.innerHTML='<div class="feedback bad">Этот ответ введён вручную. Для оценки говорения нужна запись через микрофон. Можно продолжить позже.</div>';return;
  }
  busy=true;const btn=document.getElementById('calibrationSubmit');if(btn)btn.disabled=true;
  box.innerHTML='<div class="feedback">Нора проверяет ответ…</div>';
  let r;
  try{r=await aiEvaluate({answer,question:task.prompt,goal:task.prompt,level:x.target,mode:'test_'+task.skill});}
  catch{r={ok:false}}
  if(!r?.ok||!Number.isFinite(r.data?.score)){
   busy=false;if(btn?.isConnected)btn.disabled=false;
   if(box.isConnected)box.innerHTML='<div class="feedback bad">Оценивание временно недоступно. Ответ не засчитан. Повтори позже.</div>';
   return;
  }
  // A pending navigation or restart must not turn a stale response into new evidence.
  const now=stage();if(!now||now.p!==x.p||now.index!==x.index||now.p.productive.status!=='in_progress'||!box.isConnected){busy=false;return;}
  const score=r.data.accepted===false?Math.min(49,clamp(r.data.score)):clamp(r.data.score);
  x.p.productive.results.push({skill:task.skill,score,level:x.target,source:voice?'microphone_transcript':'typed_answer',date:new Date().toISOString()});
  if(window.NEAdaptive){
   const tracker=NEAdaptive.ensure(state);
   const before=tracker.levelSkills[x.target][task.skill];
   const authentic=tracker.attempts.filter(z=>z.level===x.target&&z.skill===task.skill&&z.diagnostic!==true).length;
   NEAdaptive.recordAttempt(state,{level:x.target,skill:task.skill,score,moduleId:x.target.toLowerCase()+'-placement2',source:voice?'placement2_voice':'placement2_written',errorTag:r.data.error_tag||'',transfer:false,diagnostic:true});
   // A fresh AI estimate can never erase substantial evidence from actual lessons.
   const profile=NEAdaptive.ensure(state).levelSkills[x.target];
   const previous=x.p.productive.results.filter(z=>z.skill===task.skill);
   const preliminary=clamp(30+mean(previous.map(z=>z.score))*.45);
   profile[task.skill]=authentic>=4?clamp(before*.8+preliminary*.2):authentic>0?clamp(before*.6+preliminary*.4):preliminary;
   if(state.level===x.target)state.learningV8.skills[task.skill]=profile[task.skill];
  }
  x.p.productive.nextIndex++;
  if(x.p.productive.nextIndex>=x.tasks.length){
   x.p.productive.status='complete';x.p.productive.finishedAt=new Date().toISOString();
   const index=LEVELS.indexOf(x.target),gaps={};
   for(const skill of ['writing','speaking']){
    const n=resultFor(x.p.productive.results,skill);
    if(n!==null&&n<50&&index>0)gaps[skill]={level:LEVELS[Math.max(0,index-(n<25?2:1))],done:false};
   }
   x.p.productive.remediation=gaps;
  }
  saveState();busy=false;render();
 }
 function banner(){
  const p=state.placement,prod=p?.productive;
  if(!p)return '<section class="card" id="placementEntryCard"><h3>С чего начать норвежский?</h3><p>Нора подберёт подходящую ступень A1–B2. Новичку не придётся проходить сложный тест.</p><div class="row"><button class="btn" onclick="navigate(\'placement\')">Я уже немного знаю</button><button class="btn secondary" onclick="NECalibration.beginner()">Начинаю с нуля</button></div><small class="muted">Входная проверка — ориентир, не официальный экзамен.</small></section>';
  if(prod?.status==='complete')return '';
  return '<section class="card" id="placementEntryCard"><h3>Уточнить индивидуальный маршрут</h3><p>Старт '+safe(validLevel(p.recommendedStart||p.level))+' выбран предварительно. '+(p.scope==='beginner_choice'?'Ты можешь сразу заниматься с Норой.':'Осталось проверить письмо и говорение отдельно.')+'</p><div class="row"><button class="btn secondary" onclick="navigate(\'calibration\')">Проверить письмо и речь</button></div><small class="muted">Можешь продолжать уроки и вернуться к этой проверке позднее.</small></section>';
 }
 function mountEntry(){
  const home=document.querySelector('.home-v7'),hub=document.querySelector('.hub-v7');
  const parent=home||hub;if(!parent||parent.querySelector('#placementEntryCard'))return;
  const markup=banner();if(!markup)return;
  const holder=document.createElement('div');holder.innerHTML=markup;
  const card=holder.firstElementChild;if(card)parent.insertBefore(card,parent.children[home?1:1]||null);
 }
 const originalNavigate=window.navigate;
 navigate=window.navigate=function(view,data){
  if(view==='calibration')return render();
  const out=originalNavigate(view,data);
  if(view==='home'||view==='hub')mountEntry();
  return out;
 };
 window.NECalibration={beginner,postpone,reset,render,submit,banner,mountEntry};
 mountEntry();
})();