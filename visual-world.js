// Norsk Eventyr visual conversation world. Presentation-only by design:
// course assessment, audio provenance and CEFR mastery remain in guided-speaking.
(()=>{
 'use strict';
 const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 const portraits=Object.freeze({
  nora:'/assets/nora-v8.webp',
  ingrid:'/assets/characters/ingrid.webp',
  mari:'/assets/characters/mari.webp',
  erik:'/assets/characters/erik.webp'
 });
 const mouthSvg='<span class="ne-world-mouth" aria-hidden="true"><svg class="ne-world-mouth-svg" viewBox="0 0 72 42" focusable="false">'+
  '<ellipse class="ne-mouth-skin" cx="36" cy="21" rx="35" ry="20"/>'+
  '<ellipse class="ne-mouth-opening" cx="36" cy="23" rx="23" ry="9"/>'+
  '<path class="ne-mouth-upper" d="M13 22 Q24 16 36 19 Q48 16 59 22"/>'+
  '<path class="ne-mouth-lower" d="M14 26 Q36 40 58 26"/>'+
  '<path class="ne-mouth-teeth" d="M22 22 Q36 20 50 22 L48 25 Q36 27 24 25Z"/>'+
  '</svg></span>';
 const actors={
  ingrid:'ingrid',ida:'ingrid',anna:'ingrid',sofie:'mari',mari:'mari',sara:'mari',maja:'mari',
  nora:'nora',anders:'erik',erik:'erik',henrik:'erik',nils:'erik',
  ola:'erik',knut:'erik',thomas:'erik',jonas:'erik',lars:'erik',bjørn:'erik',
  kari:'ingrid',emma:'ingrid',liv:'ingrid',eva:'mari',hanna:'mari',sigrid:'ingrid',lege:'erik'
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
 function lipPreference(){return learner()?.learningV8?.visualWorld?.lipSync!==false}
 function lipSyncEnabled(){
  if(!lipPreference())return false;
  try{return !(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)}catch{return true}
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
  const partner=actorKey(scene.actor);
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
     '<div class="ne-world-character ne-world-coach" data-ne-role="coach"><div class="ne-world-portrait-wrap" data-ne-face="nora"><img src="'+portraits.nora+'" alt="Нора, виртуальная преподавательница" class="ne-world-portrait" loading="lazy">'+mouthSvg+'</div>'+
     '<div class="ne-world-name">Нора <span>помогает</span></div></div>'+
     '<div class="ne-world-character ne-world-partner" data-ne-role="partner"><div class="ne-world-portrait-wrap" data-ne-face="'+partner+'"><img src="'+actorPortrait+'" alt="'+e(who)+'" class="ne-world-portrait" loading="lazy">'+mouthSvg+'</div>'+
     '<div class="ne-world-name">'+e(who)+'</div></div>'+
     '<div class="ne-world-character ne-world-self" data-ne-role="self"><div class="ne-world-portrait-wrap" data-ne-face="'+currentAvatar+'"><img id="neWorldSelfImage" src="'+portraits[currentAvatar]+'" alt="Твой учебный аватар" class="ne-world-portrait" loading="lazy">'+mouthSvg+'</div>'+
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
      '</div><p class="ne-world-voice-status" id="neWorldVoiceStatus" role="status"></p>'+
      '<div class="ne-world-rescue" role="group" aria-label="Как выйти из затруднения в реальном разговоре">'+
      '<strong>Если не расслышал — попроси собеседника помочь.</strong>'+
      '<div class="ne-world-rescue-actions">'+
      '<button type="button" onclick="NEVisualWorld.practice(\'repeat\')">Повторить</button>'+
      '<button type="button" onclick="NEVisualWorld.practice(\'slow\')">Помедленнее</button>'+
      '<button type="button" onclick="NEVisualWorld.practice(\'think\')">Дать время</button>'+
      '</div><div id="neWorldPracticeFeedback" class="ne-world-practice" role="status" aria-live="polite" hidden></div>'+
      '<small>Произнеси фразу вслух. Это практика без оценки и без продвижения урока.</small></div></div>'+
   '<details class="ne-world-free"><summary>Свободный разговор · без оценки</summary>'+
     '<p>Попробуй сказать что-то неожиданное: спросить, возразить, уточнить или начать новую тему в этой ситуации. Персонаж ответит сам.</p>'+
     '<div class="ne-world-free-log" id="neWorldFreeLog" aria-live="polite">'+
      (Array.isArray(progress.freeChat)?progress.freeChat.slice(-12).map(turn=>
       '<div class="ne-world-free-turn ne-world-free-'+(turn.role==='assistant'?'actor':'user')+'"><strong>'+
       (turn.role==='assistant'?e(who):'Ты')+'</strong><p lang="nb">'+e(String(turn.text||'').slice(0,350))+'</p></div>').join(''):'')+
     '</div>'+
     '<label for="neWorldFreeInput">Твоя произвольная реплика по-норвежски</label>'+
     '<textarea id="neWorldFreeInput" maxlength="350" rows="2" class="input" placeholder="Что ты хочешь сказать?"></textarea>'+
     '<div class="ne-world-free-controls"><button type="button" class="btn secondary" id="neWorldFreeMic" onclick="NEVisualWorld.dictateFree()">🎤 Произнести</button>'+
     '<button type="button" class="btn secondary" id="neWorldFreeSend" onclick="NEVisualWorld.sendFree()">Отправить реплику</button></div>'+
     '<small id="neWorldFreeStatus" role="status" aria-live="polite">До 6 свободных реплик за урок. Микрофон использует распознавание речи устройства: проверь текст перед отправкой. Для ответа AI необходим интернет.</small>'+
     '<small>Дополнительная практика: баллы и экзаменационный результат не начисляются.</small></details>'+
   '<details class="ne-world-avatar-picker"><summary>Изменить свой аватар</summary>'+
     '<div class="ne-world-avatar-options" role="group" aria-label="Учебный аватар">'+
     [['erik','Алекс'],['ingrid','Ингрид'],['mari','Мари']].map(([id,name])=>
       '<button type="button" aria-pressed="'+(currentAvatar===id)+'" onclick="NEVisualWorld.chooseAvatar(\''+id+'\')" data-ne-avatar="'+id+'"><img src="'+portraits[id]+'" alt="" loading="lazy"><span>'+e(name)+'</span></button>').join('')+
     '</div><button type="button" class="ne-world-lip-toggle" id="neWorldLipToggle" aria-pressed="'+lipPreference()+'" onclick="NEVisualWorld.toggleLipSync()">Движение губ: '+(lipPreference()?'включено':'выключено')+'</button>'+
     '<small>Можно отключить движение губ. Если в телефоне включено уменьшение движения, анимация отключается автоматически. Это вымышленный аватар.</small></details>'+
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
  if(pic){pic.src=portraits[id];pic.parentElement?.setAttribute?.('data-ne-face',id)}
  document.querySelectorAll?.('[data-ne-avatar]').forEach(b=>b.setAttribute('aria-pressed',String(b.getAttribute('data-ne-avatar')===id)));
  return true;
 }
 function toggleLipSync(){
  const state=learner();if(!state)return false;
  if(!state.learningV8||typeof state.learningV8!=='object')state.learningV8={};
  const old=state.learningV8.visualWorld;
  const on=!lipPreference();
  state.learningV8.visualWorld={...(old||{}),lipSync:on};
  let saved=true;
  try{if(typeof window.saveState==='function')saved=window.saveState()!==false}catch{saved=false}
  if(!saved){state.learningV8.visualWorld=old;return false}
  const b=document.getElementById('neWorldLipToggle');
  if(b){b.setAttribute?.('aria-pressed',String(on));b.textContent='Движение губ: '+(on?'включено':'выключено')}
  if(!on)activeSpeech?.stop?.();
  return true;
 }
 let activeSpeech=null;
 function talkingTarget(role){
  if(typeof document==='undefined')return null;
  return role==='guide'?document.querySelector('.ne-world-guide-face'):
   ['coach','partner','self'].includes(role)?document.querySelector('.ne-world [data-ne-role="'+role+'"]'):null;
 }
 function clearSpeechVisual(){
  if(typeof document==='undefined')return;
  document.querySelectorAll?.('.ne-world-talking,.ne-world-guide-talking').forEach(el=>{
   el.classList?.remove('ne-world-talking');
   el.classList?.remove('ne-world-guide-talking');
  });
 }
 function animate(role){
  const el=talkingTarget(role);
  if(!el)return false;
  el.classList.remove('ne-world-reacting');
  void el.offsetWidth;
  el.classList.add('ne-world-reacting');
  return true;
 }

 // Approximate visemes. SpeechSynthesis boundary timing varies across voices:
 // use word/character boundaries when available and a rate-adjusted fallback otherwise.
 function visemeAt(text,index){
  // Approximate visual shapes from Bokmål orthography, not phoneme timings.
  const source=String(text||'').toLowerCase();
  const i=Math.min(Math.max(0,Number.isFinite(index)?Math.floor(index):0),Math.max(0,source.length-1));
  const chunk=source.slice(i,i+4),c=chunk.charAt(0);
  if(!c||/[\s.,!?;:–—-]/u.test(c))return 'closed';
  if(/^(skj|sj|kj|gj|ng)/u.test(chunk))return 'mid';
  if(/^(au|øy)/u.test(chunk))return 'round';
  if(/^ei/u.test(chunk))return 'wide';
  if(/[bmp]/u.test(c))return 'closed';
  if(/[oøuåyw]/u.test(c))return 'round';
  if(/[fv]/u.test(c))return 'teeth';
  if(/[aæei]/u.test(c))return 'wide';
  return 'mid';
 }
 function bindSpeech(utterance,role){
  if(!utterance||typeof utterance!=='object'||typeof utterance.addEventListener!=='function')return false;
  if(!lipSyncEnabled()){activeSpeech?.stop?.();clearSpeechVisual();return false}
  const el=talkingTarget(role);if(!el)return false;
  activeSpeech?.stop?.();clearSpeechVisual();
  const name=role==='guide'?'ne-world-guide-talking':'ne-world-talking';
  const words=String(utterance.text||'');
  const rate=Number.isFinite(utterance.rate)?Math.max(.6,Math.min(1.5,utterance.rate)):1;
  let timer=null,anchorAt=Date.now(),charAt=0,wordLength=0,hasBoundary=false,finished=false,paused=false;
  const ticket={stop(){finish()}};
  activeSpeech=ticket;
  const setMouth=shape=>{
   if(activeSpeech!==ticket||finished||paused)return;
   el.setAttribute?.('data-ne-viseme',shape);
  };
  const tick=()=>{
   if(activeSpeech!==ticket||finished||paused||!words)return;
   const elapsed=Math.max(0,Date.now()-anchorAt);
   const advance=Math.floor(elapsed*rate/88);
   const limit=hasBoundary&&wordLength>0?wordLength-1:Math.max(0,words.length-1-charAt);
   const at=Math.min(words.length-1,charAt+Math.min(advance,limit));
   setMouth(visemeAt(words,at));
  };
  function finish(){
   if(finished)return;finished=true;paused=false;
   if(timer!==null&&typeof window.clearInterval==='function')window.clearInterval(timer);
   timer=null;el.classList?.remove(name);el.removeAttribute?.('data-ne-viseme');
   if(activeSpeech===ticket)activeSpeech=null;
  }
  const onStart=()=>{
   if(activeSpeech!==ticket||finished)return;
   paused=false;anchorAt=Date.now();charAt=0;
   el.classList.add(name);setMouth('mid');
   if(words&&timer===null&&typeof window.setInterval==='function')timer=window.setInterval(tick,88);
  };
  const boundary=event=>{
   if(activeSpeech!==ticket||finished||paused)return;
   if(Number.isInteger(event?.charIndex)&&event.charIndex>=0){
    charAt=Math.min(Math.max(0,words.length-1),event.charIndex);anchorAt=Date.now();hasBoundary=true;
    wordLength=Number.isInteger(event.charLength)&&event.charLength>0?
     Math.min(event.charLength,Math.max(1,words.length-charAt)):
     Math.max(1,(words.slice(charAt).match(/^[^\s,.!?;:]*/u)?.[0]||'').length);
    tick();
   }
  };
  const onPause=()=>{
   if(activeSpeech!==ticket||finished)return;
   paused=true;
   if(timer!==null&&typeof window.clearInterval==='function')window.clearInterval(timer);
   timer=null;el.classList?.remove(name);el.setAttribute?.('data-ne-viseme','closed');
  };
  const onResume=()=>{
   if(activeSpeech!==ticket||finished)return;
   paused=false;anchorAt=Date.now();el.classList.add(name);
   if(words&&timer===null&&typeof window.setInterval==='function')timer=window.setInterval(tick,88);
   tick();
  };
  utterance.addEventListener('start',onStart);
  utterance.addEventListener('boundary',boundary);
  utterance.addEventListener('pause',onPause);
  utterance.addEventListener('resume',onResume);
  utterance.addEventListener('end',finish);
  utterance.addEventListener('error',finish);
  onStart();return true;
 }
 function sayPartner(text,rate){
  if(typeof window.speakText!=='function')return false;
  try{return bindSpeech(window.speakText(text,rate),'partner')}catch{return false}
 }
 function status(text){
  const el=document.getElementById('neWorldVoiceStatus');if(el)el.textContent=String(text||'');
 }
 function speakPartner(){
  const lesson=window.neLessonSession?.lesson,progress=window.neLessonSession?.guidedSpeech;
  const scene=window.NEGuidedSpeaking?.definition?.(lesson);
  if(!lesson||!progress||!scene)return;
  const text=sceneLine(scene,progress);
  if(typeof window.speakText==='function'){sayPartner(text,.88);status('Слушай живую норвежскую реплику.')}
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
   bindSpeech(u,'coach');synth.speak(u);status('Нора озвучивает задание.');
  }catch{status('Озвучка сейчас недоступна. Задание показано на экране.')}
 }
 const RESCUE=Object.freeze({
  repeat:{phrase:'Kan du gjenta det, vær så snill?',prefix:'Ja, selvfølgelig. ',rate:.85},
  slow:{phrase:'Kan du snakke litt saktere?',prefix:'Selvfølgelig. ',rate:.70},
  think:{phrase:'Kan jeg få litt tid til å tenke?',prefix:'Det går bra. Ta den tiden du trenger.',rate:.84}
 });
 function practice(kind){
  const option=Object.prototype.hasOwnProperty.call(RESCUE,kind)?RESCUE[kind]:null;
  if(!option)return false;
  const session=window.neLessonSession,progress=session?.guidedSpeech;
  const scene=window.NEGuidedSpeaking?.definition?.(session?.lesson);
  if(!scene||!progress||!Number.isInteger(progress.index))return false;
  const node=document.getElementById('neWorldPracticeFeedback');if(!node)return false;
  const reply=kind==='think'?option.prefix:option.prefix+sceneLine(scene,progress);
  node.textContent='Твоя фраза: «'+option.phrase+'» Возможный ответ собеседника: «'+reply+'»';
  node.hidden=false;
  status('Произнеси полезную фразу, затем продолжай исходное задание.');
  // The exercise is formative only: no score, no credit, no stage advancement,
  // no transcript mutation and no stored fake voice evidence.
  sayPartner(reply,option.rate);
  return true;
 }
 function accepted(answer,reply){
  updateOwn(answer);
  const el=document.getElementById('neWorldReaction');
  if(el){el.hidden=false;el.textContent='Собеседник: '+String(reply||'').slice(0,320)}
  animate('self');
 }
 const freePending=new WeakSet();
 let freeRecognition=null;
 function dictateFree(){
  const field=document.getElementById('neWorldFreeInput');
  if(!field)return false;
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(typeof Recognition!=='function'){
   freeStatus('Распознавание речи на этом устройстве недоступно. Можно написать ответ.');
   return false;
  }
  if(freeRecognition){
   try{freeRecognition.stop()}catch{}
   return false;
  }
  let speech;
  try{speech=new Recognition();speech.lang='nb-NO';speech.interimResults=false;speech.maxAlternatives=1;}catch{
   freeStatus('Микрофон сейчас недоступен. Напиши реплику.');
   return false;
  }
  const lessonSession=window.neLessonSession;
  freeRecognition=speech;
  const btn=document.getElementById('neWorldFreeMic');
  if(btn)btn.setAttribute?.('aria-pressed','true');
  freeStatus('Слушаю норвежскую реплику…');
  speech.onresult=event=>{
   if(window.neLessonSession!==lessonSession||!field.isConnected)return;
   const raw=String(event?.results?.[0]?.[0]?.transcript||'').trim();
   if(!raw)return;
   // Preserve text entered after microphone activation. Never silently erase it.
   const current=field.value.trim();
   field.value=current?current+' '+raw:raw;
   freeStatus('Распознано. Проверь текст, затем отправь реплику.');
  };
  speech.onerror=()=>freeStatus('Распознавание не завершилось. Попробуй ещё раз или напиши текст.');
  speech.onend=()=>{if(freeRecognition===speech)freeRecognition=null;
   const b=document.getElementById('neWorldFreeMic');b?.setAttribute?.('aria-pressed','false');};
  try{speech.start();return true}
  catch{freeRecognition=null;if(btn)btn.setAttribute?.('aria-pressed','false');
   freeStatus('Не получилось начать запись. Проверь разрешение микрофона.');return false;}
 }
 function freeStatus(message){
  const node=typeof document!=='undefined'&&document.getElementById('neWorldFreeStatus');
  if(node)node.textContent=String(message||'');
 }
 function appendFree(role,value,label){
  const root=document.getElementById('neWorldFreeLog');
  if(!root||typeof document.createElement!=='function')return;
  const div=document.createElement('div');
  div.className='ne-world-free-turn ne-world-free-'+(role==='assistant'?'actor':'user');
  const strong=document.createElement('strong'),p=document.createElement('p');
  strong.textContent=label;p.lang='nb';p.textContent=String(value||'');
  div.append(strong,p);root.append(div);
 }
 async function sendFree(){
  const session=window.neLessonSession,progress=session?.guidedSpeech,lesson=session?.lesson;
  const scene=window.NEGuidedSpeaking?.definition?.(lesson);
  const field=document.getElementById('neWorldFreeInput');
  const button=document.getElementById('neWorldFreeSend');
  const message=field?.value?.trim();
  if(!session||!progress||!scene||!message||freePending.has(progress))return false;
  if(message.length>350){freeStatus('Не больше 350 символов за реплику.');return false}
  const history=Array.isArray(progress.freeChat)?progress.freeChat:[];
  const already=history.filter(t=>t?.role==='user').length;
  if(already>=6){freeStatus('Шесть свободных реплик использованы. Продолжи основной урок.');return false}
  if(typeof window.neApiPost!=='function'){freeStatus('Свободный диалог требует подключения к AI. Основной урок доступен.');return false}
  const turnIndex=progress.index;
  freePending.add(progress);if(button)button.disabled=true;
  freeStatus('Собеседник слушает и думает над ответом…');
  const transcript=[{role:'assistant',text:String(scene.opening||'').slice(0,300)},
   ...history.slice(-10).filter(x=>x&&(x.role==='assistant'||x.role==='user')).map(x=>({role:x.role,text:String(x.text||'').slice(0,350)}))];
  try{
   const response=await window.neApiPost('/api/chat',{
    message,level:['A1','A2','B1','B2'].includes(lesson.level)?lesson.level:'A1',
    mode:'scene_practice',teacherMode:false,inputSource:'typed_text',
    topic:String(scene.scene||'Норвегия').slice(0,130),
    scenario:'Свободная необязательная практика без баллов и без экзамена. Место: '+String(scene.scene||'').slice(0,180)+
      '. Ты реальный человек в роли '+String(scene.actor||'норвежского собеседника').slice(0,100)+
      '. Ответь ПО-НОРВЕЖСКИ Bokmål естественно и кратко (1–2 предложения). По возможности задай один неожиданный, но уместный вопрос. Не отвечай за ученика. Не меняй сюжет оценочного урока. Не обещай действительных записей, цен, услуг или встреч.',
    history:transcript
   });
   if(window.neLessonSession!==session||session.guidedSpeech!==progress||progress.index!==turnIndex||!field?.isConnected)return false;
   if(field.value.trim()!==message){
    freeStatus('Текст изменился во время ответа собеседника. Новая реплика сохранена в поле — отправь её отдельно.');
    return false;
   }
   const raw=String(response?.data?.reply_no||'').trim();
   if(!response?.ok||raw.length<3||raw.length>320||/[<>\u0000-\u001f]/u.test(raw)||/[\u0400-\u04ff]/u.test(raw)){
    freeStatus('Не удалось получить безопасный ответ собеседника. Твоя реплика остаётся в поле; попробуй позже.');
    return false;
   }
   const updated=[...history.filter(t=>t.role==='user'||t.role==='assistant').slice(1),
    {role:'user',text:message},{role:'assistant',text:raw}].slice(-12);
   progress.freeChat=updated;
   try{window.persistLessonCheckpoint?.()}catch{}
   appendFree('user',message,'Ты');
   appendFree('assistant',raw,String(scene.actor||'Собеседник').slice(0,70));
   field.value='';
   freeStatus('Собеседник ответил. Ты можешь продолжить разговор или вернуться к заданию.');
   sayPartner(raw,.85);
   return true;
  }catch{
   if(window.neLessonSession===session&&session.guidedSpeech===progress&&progress.index===turnIndex)
    freeStatus('Соединение не удалось. Ответ не засчитан; введённый текст сохранён.');
   return false;
  }finally{
   freePending.delete(progress);if(button?.isConnected)button.disabled=false;
  }
 }
 function guide(brief){
  if(!brief)return '';
  const text=[brief.activity,brief.stage?.note].filter(Boolean).join('. ').slice(0,380);
  return '<div class="ne-world-guide" aria-label="Нора сопровождает занятие">'+
    '<span class="ne-world-guide-face" data-ne-face="nora"><img class="ne-world-guide-portrait" src="'+portraits.nora+'" alt="Нора" loading="lazy">'+mouthSvg+'</span>'+
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
   if(img)bindSpeech(u,'guide');
   synth.speak(u);message('Нора объясняет задание.');
  }catch{message('Озвучка недоступна. Задание написано на экране.')}
 }
 window.NEVisualWorld=Object.freeze({render,guide,speakStage,updateOwn,chooseAvatar,animate,speakPartner,speakTask,practice,dictateFree,sendFree,bindSpeech,visemeAt,toggleLipSync,lipPreference,accepted,theme});
})();