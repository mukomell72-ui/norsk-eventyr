// Norsk Eventyr visual conversation world. Presentation-only by design:
// course assessment, audio provenance and CEFR mastery remain in guided-speaking.
(()=>{
 'use strict';
 const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 const portraits=Object.freeze({
  nora:'/assets/nora-v8.webp',
  ingrid:'/assets/characters/ingrid.svg',
  mari:'/assets/characters/mari.svg',
  erik:'/assets/characters/erik.svg'
 });
 const actors={
  ingrid:'ingrid',ida:'ingrid',anna:'ingrid',sofie:'mari',mari:'mari',sara:'mari',maja:'mari',
  nora:'nora',anders:'erik',erik:'erik',henrik:'erik',nils:'erik',
  ola:'erik',knut:'erik',thomas:'erik'
 };

 function actorKey(label){
  const key=String(label||'').toLowerCase().replace(/[^a-zæøå]+/g,' ').trim().split(/\s+/)[0];
  return actors[key]||'ingrid';
 }
 function theme(lesson,scene){
  const raw=String(lesson?._adaptive?.moduleId||lesson?.id||'')+' '+String(scene?.scene||'');
  if(/transport|mobility|travel|buss|tog|stasjon|holdeplass|reise|toget|автобус|остановк|поезд/.test(raw.toLowerCase()))return 'street';
  if(/shop|kafe|butikk|restaurant|restaurant|store|кафе|магазин|продавец/.test(raw.toLowerCase()))return 'cafe';
  if(/health|lege|helse|doctor|врач|медицин/.test(raw.toLowerCase()))return 'clinic';
  if(/home|service|formal|digital|kommune|søknad|квартира|документ/.test(raw.toLowerCase()))return 'town';
  if(/work|school|job|office|arbeid|intervju|работ|собесед/.test(raw.toLowerCase()))return 'office';
  return 'town';
 }
 const learner=()=>window.neLearnerState;
 function preference(){
  const p=learner()?.learningV8?.visualWorld;
  return p&&['erik','ingrid','mari'].includes(p.avatar)?p.avatar:'erik';
 }
 function personName(scene,index,moduleId){
  if(moduleId==='a1-foundation'&&index<3&&/Erik/i.test(scene.actor||''))return 'Сотрудник';
  return String(scene.actor||'Собеседник').slice(0,80);
 }
 function sceneLine(scene,progress){
  const index=progress.index;
  if(index===0)return scene.opening;
  return String(progress.turns[index-1]?.reply||scene.steps[index-1]?.reply||scene.opening);
 }
 function render({lesson,scene,progress,step,moduleId}){
  if(!scene||!step||!progress)return '';
  const currentAvatar=preference();
  const who=personName(scene,progress.index,moduleId);
  const partner=actorKey(who);
  const last=sceneLine(scene,progress);
  const spoken=progress.turns.filter(x=>x.spoken).length;
  const total=progress.turns.length;
  const actorPortrait=portraits[partner];
  return '<section class="ne-world ne-world-'+theme(lesson,scene)+'" aria-label="Анимированная жизненная ситуация">'+
   '<div class="ne-world-sky" aria-hidden="true"><span class="ne-world-cloud"></span><span class="ne-world-window"></span><span class="ne-world-lamp"></span></div>'+
   '<div class="ne-world-top"><span class="ne-world-tag">Твоя жизнь в Норвегии · '+e(lesson.level||'A1')+'</span>'+
   '<span class="ne-world-scene-counter">Ситуация '+(progress.index+1)+' / '+scene.steps.length+'</span></div>'+
   '<h3 class="ne-world-location">'+e(scene.scene)+'</h3>'+
   '<div class="ne-world-stage">'+
     '<div class="ne-world-character ne-world-coach" data-ne-role="coach"><div class="ne-world-portrait-wrap"><img src="'+portraits.nora+'" alt="Нора, виртуальная преподавательница" class="ne-world-portrait" loading="lazy"></div>'+
     '<div class="ne-world-name">Нора <span>помогает</span></div></div>'+
     '<div class="ne-world-character ne-world-partner" data-ne-role="partner"><div class="ne-world-portrait-wrap"><img src="'+actorPortrait+'" alt="'+e(who)+'" class="ne-world-portrait" loading="lazy"></div>'+
     '<div class="ne-world-name">'+e(who)+'</div></div>'+
     '<div class="ne-world-character ne-world-self" data-ne-role="self"><div class="ne-world-portrait-wrap"><img id="neWorldSelfImage" src="'+portraits[currentAvatar]+'" alt="Твой учебный аватар" class="ne-world-portrait" loading="lazy"></div>'+
     '<div class="ne-world-name">Ты <span>отвечаешь</span></div></div>'+
   '</div>'+
   '<div class="ne-world-dialogue" aria-label="Текущий разговор">'+
     '<div class="ne-world-line ne-world-line-partner"><span>'+e(who)+'</span><p lang="nb">'+e(last)+'</p></div>'+
     '<div class="ne-world-line ne-world-line-self" aria-live="off"><span>Твой ответ</span><p id="neWorldOwnWords" lang="nb">'+e(progress.pending?.answer||'Твои слова появятся здесь…')+'</p></div>'+
     '<div class="ne-world-next" id="neWorldReaction" aria-live="polite" hidden></div>'+
   '</div>'+
   '<div class="ne-world-coaching"><div class="ne-world-coach-head">Нора · твоя задача сейчас</div>'+
      '<p id="neWorldTask">'+e(step.task)+'</p>'+
      '<div class="ne-world-actions">'+
        '<button type="button" class="ne-world-audio" onclick="NEVisualWorld.speakPartner()">Слушать собеседника</button>'+
        '<button type="button" class="ne-world-audio" onclick="NEVisualWorld.speakTask()">Нора объясняет вслух</button>'+
      '</div><p class="ne-world-voice-status" id="neWorldVoiceStatus" role="status"></p></div>'+
   '<details class="ne-world-avatar-picker"><summary>Изменить свой аватар</summary>'+
     '<div class="ne-world-avatar-options" role="group" aria-label="Учебный аватар">'+
     [['erik','Алекс'],['ingrid','Ингрид'],['mari','Мари']].map(([id,name])=>
       '<button type="button" aria-pressed="'+(currentAvatar===id)+'" onclick="NEVisualWorld.chooseAvatar(\''+id+'\')" data-ne-avatar="'+id+'"><img src="'+portraits[id]+'" alt="" loading="lazy"><span>'+e(name)+'</span></button>').join('')+
     '</div><small>Это вымышленный аватар, не твоя фотография.</small></details>'+
   '<div class="ne-world-footnote">В реальной беседе допустимы разные ответы. Главное — передать смысл, спросить или уточнить по ситуации. '+
   (total?'Ты уже сказал '+spoken+' из '+total+' реплик голосом.':'Попробуй сначала ответить голосом.')+'</div>'+
   '</section>';
 }
 function updateOwn(value){
  const node=typeof document!=='undefined'&&document.getElementById('neWorldOwnWords');
  if(!node)return;
  node.textContent=String(value||'').trim()||'Твои слова появятся здесь…';
 }
 function chooseAvatar(id){
  if(!Object.prototype.hasOwnProperty.call(portraits,id)||id==='nora')return false;
  const s=learner();if(!s)return false;
  if(!s.learningV8||typeof s.learningV8!=='object')s.learningV8={};
  const old=s.learningV8.visualWorld;
  s.learningV8.visualWorld={...(old||{}),avatar:id};
  let saved=true;
  try{if(typeof window.saveState==='function')saved=window.saveState()!==false}catch{saved=false}
  if(!saved){s.learningV8.visualWorld=old;return false}
  const pic=document.getElementById('neWorldSelfImage');
  if(pic)pic.src=portraits[id];
  document.querySelectorAll?.('[data-ne-avatar]').forEach(b=>b.setAttribute('aria-pressed',String(b.getAttribute('data-ne-avatar')===id)));
  return true;
 }
 function animate(role){
  const el=typeof document!=='undefined'&&document.querySelector('.ne-world [data-ne-role="'+role+'"]');
  if(!el)return;
  el.classList.remove('ne-world-talking');
  // Force the short visual animation to restart without scheduling a timer.
  void el.offsetWidth;
  el.classList.add('ne-world-talking');
 }
 function status(text){
  const el=document.getElementById('neWorldVoiceStatus');if(el)el.textContent=String(text||'');
 }
 function speakPartner(){
  const lesson=window.neLessonSession?.lesson,progress=window.neLessonSession?.guidedSpeech;
  const scene=window.NEGuidedSpeaking?.definition?.(lesson);
  if(!lesson||!progress||!scene)return;
  const text=sceneLine(scene,progress);
  if(typeof window.speakText==='function'){animate('partner');window.speakText(text,.88);status('Слушай живую норвежскую реплику.')}
  else status('На этом устройстве нет доступной озвучки. Реплика показана на экране.');
 }
 function speakTask(){
  const lesson=window.neLessonSession?.lesson,progress=window.neLessonSession?.guidedSpeech;
  const scene=window.NEGuidedSpeaking?.definition?.(lesson);
  const task=scene?.steps?.[progress?.index]?.task;
  if(!task)return;
  const synth=window.speechSynthesis,Utter=window.SpeechSynthesisUtterance;
  if(!synth||typeof Utter!=='function'){status('Русская озвучка недоступна. Задание Норы написано под персонажами.');return}
  const voices=synth.getVoices?.()||[];
  const voice=voices.find(x=>/^ru(-|_)/i.test(x.lang||''));
  if(!voice){status('На устройстве нет русского голоса. Читай подсказку Норы на экране.');return}
  try{
   synth.cancel();
   const u=new Utter('Твоя задача: '+String(task).slice(0,420));
   u.lang='ru-RU';u.voice=voice;u.rate=.95;
   animate('coach');synth.speak(u);status('Нора озвучивает задание.');
  }catch{status('Озвучка сейчас недоступна. Задание показано на экране.')}
 }
 function accepted(answer,reply){
  updateOwn(answer);
  const el=document.getElementById('neWorldReaction');
  if(el){el.hidden=false;el.textContent='Собеседник: '+String(reply||'').slice(0,320)}
  animate('self');animate('partner');
 }
 function guide(brief){
  if(!brief)return '';
  const text=[brief.activity,brief.stage?.note].filter(Boolean).join('. ').slice(0,380);
  return '<div class="ne-world-guide" aria-label="Нора сопровождает занятие">'+
    '<img class="ne-world-guide-portrait" src="'+portraits.nora+'" alt="Нора" loading="lazy">'+
    '<div class="ne-world-guide-copy"><strong>Нора рядом</strong><p id="neWorldGuideTask">'+e(text)+'</p>'+
    '<button type="button" class="ne-world-guide-speak" onclick="NEVisualWorld.speakStage()">Послушать инструкцию</button>'+
    '<small id="neWorldGuideStatus" role="status"></small></div></div>';
 }
 function speakStage(){
  const field=document.getElementById('neWorldGuideTask');
  const feedback=document.getElementById('neWorldGuideStatus');
  const message=(text)=>{if(feedback)feedback.textContent=text};
  const text=field?.textContent?.trim();
  if(!text)return;
  const synth=window.speechSynthesis,Utter=window.SpeechSynthesisUtterance;
  if(!synth||typeof Utter!=='function'){message('На устройстве нет русского голосового синтеза. Текст уже показан рядом.');return}
  const voice=(synth.getVoices?.()||[]).find(x=>/^ru(-|_)/i.test(x.lang||''));
  if(!voice){message('Русский голос не установлен. Задание можно прочитать на экране.');return}
  try{
   synth.cancel();
   const u=new Utter(text);u.voice=voice;u.lang='ru-RU';u.rate=.95;
   const img=document.querySelector('.ne-world-guide-portrait');
   if(img){img.classList.remove('ne-world-guide-talking');void img.offsetWidth;img.classList.add('ne-world-guide-talking')}
   synth.speak(u);message('Нора объясняет задание.');
  }catch{message('Озвучка недоступна. Задание написано на экране.')}
 }
 window.NEVisualWorld=Object.freeze({render,guide,speakStage,updateOwn,chooseAvatar,animate,speakPartner,speakTask,accepted,theme});
})();