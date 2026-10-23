// Nora Experience 1.0 — a calm, continuous human-centered learning journey.
// Presentation and optional scenario preferences only. No grades or CEFR gates change.
(()=>{
 'use strict';
 const OPTIONS=Object.freeze([
  {id:'everyday',label:'Повседневная жизнь',scene:'дом, друзья, повседневные планы'},
  {id:'work',label:'Работа',scene:'коллеги, рабочие задачи, договорённости'},
  {id:'shopping',label:'Магазины и услуги',scene:'покупки, возвраты, общение с сервисами'},
  {id:'people',label:'Общение с людьми',scene:'знакомые, соседи, приглашения, просьбы'},
  {id:'travel',label:'Транспорт и поездки',scene:'дорога, билеты, задержки, планы'}
 ]);
 const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 const learner=()=>window.neLearnerState||(typeof state==='object'&&state?state:null);
 function settings(data=learner()){
  if(!data)return{focus:'everyday'};
  if(!data.learningV8||typeof data.learningV8!=='object'||Array.isArray(data.learningV8))data.learningV8={};
  const current=data.learningV8.noraExperience;
  if(!current||typeof current!=='object'||Array.isArray(current))
   data.learningV8.noraExperience={focus:'everyday'};
  const record=data.learningV8.noraExperience;
  if(!OPTIONS.some(x=>x.id===record.focus))record.focus='everyday';
  return record;
 }
 function focus(data=learner()){
  const item=OPTIONS.find(x=>x.id===settings(data).focus)||OPTIONS[0];
  return{...item};
 }
 function choose(id){
  if(!OPTIONS.some(x=>x.id===id))return false;
  const state=learner();if(!state)return false;
  settings(state).focus=id;
  if(typeof window.saveState==='function'&&!window.saveState())return false;
  const label=document.getElementById('neFocusCurrent');
  if(label)label.textContent=focus(state).label;
  document.querySelectorAll('[data-ne-focus]').forEach(b=>{
   b.setAttribute('aria-pressed',String(b.getAttribute('data-ne-focus')===id));
  });
  const note=document.getElementById('neFocusFeedback');
  if(note)note.textContent='Принято. Нора учтёт эту тему в следующих новых уроках. Начатый урок не изменится.';
  return true;
 }
 function homeChoice(data=learner()){
  if(!data)return'';
  const chosen=focus(data);
  return '<section class="ne-focus-card" aria-label="Личные интересы для следующих уроков">'+
   '<div class="ne-focus-top"><div><small>ТВОЙ ЖИВОЙ НОРВЕЖСКИЙ</small>'+
   '<h2>Где тебе нужен язык?</h2>'+
   '<p>Нора будет чаще выбирать такие ситуации для будущих новых уроков. Текущая тема и контроль уровня сохраняются.</p></div></div>'+
   '<details class="ne-focus-picker"><summary>Сейчас: <strong id="neFocusCurrent">'+safe(chosen.label)+'</strong> · изменить</summary>'+
   '<div class="ne-focus-options" role="group" aria-label="Темы интересов">'+
   OPTIONS.map(o=>'<button type="button" data-ne-focus="'+o.id+'" aria-pressed="'+(o.id===chosen.id)+
    '" onclick="NEExperience.choose(\''+o.id+'\')">'+safe(o.label)+'</button>').join('')+
   '</div><p id="neFocusFeedback" role="status" aria-live="polite"></p></details></section>';
 }
 // Four connected story acts, while retaining every underlying assessment.
 const ACTS=[
  {name:'Встречаемся',note:'Сначала поймём, кто говорит и зачем.'},
  {name:'Разбираемся',note:'Подготовим нужные слова и увидим, как устроена фраза.'},
  {name:'Слушаем и замечаем',note:'Слушаем и читаем так, как бывает в жизни.'},
  {name:'Действуем сами',note:'Теперь ты решаешь, что сказать и написать.'}
 ];
 function act(step,hasGrammar=false){
  const reading=hasGrammar?4:3,writing=hasGrammar?5:4;
  const index=step===0?0:step<reading?1:step<writing?2:3;
  return{index,...ACTS[index]};
 }
 function activity(step,hasGrammar=false){
  const names=hasGrammar?[
   'Ответь живому собеседнику','Вспомним нужные слова','Одно полезное правило',
   'Услышим ситуацию','Поймём сообщение','Напишем по делу','Скажем своими словами'
  ]:[
   'Ответь живому собеседнику','Вспомним нужные слова','Услышим ситуацию',
   'Поймём сообщение','Напишем по делу','Скажем своими словами'
  ];
  return names[Math.max(0,Math.min(names.length-1,Number(step)||0))];
 }
 function brief(lesson,session,total){
  const l=lesson||{},step=Math.max(0,Number(session?.step)||0),grammar=total===7;
  const stage=act(step,grammar);
  const goal=String(l?._adaptive?.courseObjective||l?._adaptive?.goal||l.title||'общаться по-норвежски').trim().slice(0,125);
  const scene=String(l.dialogueScene||'').trim().slice(0,165);
  return{stage,activity:activity(step,grammar),goal,scene,step,total};
 }
 function lessonHeader(lesson,session,total){
  const b=brief(lesson,session,total);
  const dots=ACTS.map((a,i)=>'<span class="'+(i<b.stage.index?'done':i===b.stage.index?'now':'')+
   '" title="'+safe(a.name)+'"></span>').join('');
  return '<section class="ne-mission-head" aria-label="Одна история, четыре действия">'+
   '<div class="ne-mission-overline">ТВОЯ СИТУАЦИЯ · '+safe(lesson?.level||'A1')+'</div>'+
   '<div class="ne-mission-main"><div><h2>'+safe(b.stage.name)+'</h2>'+
   '<p>'+safe(b.activity)+'. '+safe(b.stage.note)+'</p></div>'+
   '<button type="button" class="ne-pause-button" onclick="NEExperience.pause()">Пауза</button></div>'+
   (b.scene&&b.step>0?'<p class="ne-mission-story">В нашей истории: '+safe(b.scene)+'</p>':'')+
   '<div class="ne-mission-track" aria-label="Этап '+(b.stage.index+1)+' из 4">'+dots+'</div>'+
   '<details class="ne-mission-purpose"><summary>Зачем это нужно?</summary><p>'+safe(b.goal)+
   (b.scene?'<span> Ситуация: '+safe(b.scene)+'</span>':'')+'</p></details>'+
   '</section>';
 }
 function response(ok,kind){
  const subject=kind==='speaking'?'разговор':kind==='writing'?'письмо':kind==='dialogue'?'диалог':'задание';
  return ok
    ?'<p class="ne-human-response">Смысл передан. Двигаемся дальше: попробуем ту же идею в другой ситуации.</p>'
    :'<p class="ne-human-response">В этом '+subject+' есть что поправить. Разберём одну важную ошибку и попробуем ещё раз.</p>';
 }
 function endNote(lesson,verified){
  const title=safe(String(lesson?.title||'текущую тему').slice(0,90));
  return '<div class="ne-end-note"><h2>'+ (verified?'Ты применил язык в этой ситуации':'Ситуация пройдена — продолжаем закрепление')+'</h2>'+
    '<p>'+(verified?'Ты справился с учебными действиями по теме «'+title+'». Впереди — перенос навыка в другую обстановку.':
     'Ты прошёл тему «'+title+'», но часть ответов ещё требует практики. Нора вернёт трудные места в следующих занятиях.')+
    '</p></div>';
 }
 function openFollowup(){
  const lesson=typeof lessonSession==='object'&&lessonSession?.lesson;
  const data=learner();
  if(!lesson||!data||!['A1','A2','B1','B2'].includes(lesson.level))return false;
  const id='lesson:'+String(lesson.id||'unknown').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,70);
  data.chatThreads=data.chatThreads&&typeof data.chatThreads==='object'?data.chatThreads:{};
  data.chatThreads[data.chatThreadId||'general']=Array.isArray(data.chatHistory)?data.chatHistory:[];
  data.chatThreadId=id;
  data.chatHistory=Array.isArray(data.chatThreads[id])?data.chatThreads[id]:[];
  const title=String(lesson.title||'Жизненная ситуация').slice(0,120),
   scene=String(lesson.dialogueScene||'').slice(0,500);
  data.chatPrefs={...(data.chatPrefs||{}),mode:'roleplay',level:lesson.level,
   topic:title,conversationTitle:'Продолжение: '+title,
   sceneContext:'Новая короткая жизненная ситуация по изученной теме. '+
    (scene?scene+' ':'')+'Продолжи настоящую беседу, но не повторяй дословно пройденное задание. '+
    'Ученик сам выбирает реплику. Не сообщай готовый ответ.'};
  if(typeof window.saveState==='function'&&!window.saveState())return false;
  if(typeof window.navigate==='function')window.navigate('chat');
  if(!data.chatHistory.length&&typeof window.v7StartChat==='function')window.v7StartChat();
  return true;
 }
 function pause(){
  if(typeof window.persistLessonCheckpoint==='function')window.persistLessonCheckpoint();
  if(typeof window.navigate==='function')window.navigate('home');
 }
 window.NEExperience=Object.freeze({focus,settings,choose,homeChoice,brief,lessonHeader,response,endNote,pause,openFollowup,act,activity});
})();
