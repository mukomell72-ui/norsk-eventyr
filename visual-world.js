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
 const actorVoices=Object.freeze({nora:'marin',ingrid:'coral',mari:'sage',erik:'cedar'});
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
 // An explicit word tap opens the same ungraded Nora explanation.
 // Preserve the original sentence and do not invent word meanings.
 function tapWords(text){
  const parts=String(text||'').match(/[\p{L}]+(?:['’\-][\p{L}]+)*|[^\p{L}]+/gu)||[];
  return parts.map(part=>/^[a-zæøå]{2,}(?:['’\-][a-zæøå]+)*$/iu.test(part)
   ?'<button type="button" class="ne-world-word" data-ne-word="'+e(part)+'" onclick="NEVisualWorld.inspectWord(this)" aria-label="'+e(part)+' — спросить у Норы о значении">'+e(part)+'</button>':e(part)).join('');
 }
 function inspectWord(button){
  const word=String(button?.dataset?.neWord||'').trim();
  if(!/^[a-zæøå]{2,}(?:['’\-][a-zæøå]+)*$/iu.test(word)||word.length>45)return false;
  const session=window.neLessonSession,lesson=session?.lesson,progress=session?.guidedSpeech;
  const scene=window.NEGuidedSpeaking?.definition?.(lesson);
  const input=document.getElementById('neWorldHelpInput');
  if(!lesson||!scene||!progress||!input?.isConnected)return false;
  const details=document.querySelector?.('.ne-world-help');if(details)details.open=true;
  if(helpPending.has(progress)){helpStatus('Нора уже отвечает на вопрос. Твой выбор сохранён.');return false}
  input.value='Объясни слово «'+word+'» в реплике собеседника: короткий перевод, значение здесь и пример на Bokmål.';
  if(input.dataset)input.dataset.neFromSpeech='false';
  void askHelp();return true;
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
  const replayEnabled=Array.isArray(progress.freeChat)&&progress.freeChat.some(turn=>turn?.role==='assistant'&&String(turn.text||'').trim());
  return '<section class="ne-world ne-world-'+theme(lesson,scene)+'" aria-label="Анимированная жизненная ситуация">'+
   '<div class="ne-world-sky" aria-hidden="true"><span class="ne-world-cloud"></span><span class="ne-world-window"></span><span class="ne-world-lamp"></span></div>'+
   '<div class="ne-world-top"><span class="ne-world-tag">Твоя жизнь в Норвегии · '+e(lesson.level||'A1')+'</span>'+
   '<span class="ne-world-scene-counter">Ситуация '+(progress.index+1)+' / '+scene.steps.length+'</span></div>'+
   '<h3 class="ne-world-location">'+e(scene.scene)+'</h3>'+
   '<div class="ne-world-stage">'+
     '<div class="ne-world-character ne-world-coach" data-ne-role="coach"><div class="ne-world-portrait-wrap" data-ne-face="nora"><img src="'+portraits.nora+'" alt="Нора, виртуальная преподавательница" class="ne-world-portrait" loading="lazy">'+mouthSvg+'</div>'+
     '<div class="ne-world-name">Нора <span>помогает</span></div></div>'+
     '<div class="ne-world-character ne-world-partner" data-ne-role="partner" data-ne-reaction="'+reactionTone(last)+'"><div class="ne-world-portrait-wrap" data-ne-face="'+partner+'"><img src="'+actorPortrait+'" alt="'+e(who)+'" class="ne-world-portrait" loading="lazy">'+mouthSvg+'</div>'+
     '<div class="ne-world-name">'+e(who)+'</div></div>'+
     '<div class="ne-world-character ne-world-self" data-ne-role="self"><div class="ne-world-portrait-wrap" data-ne-face="'+currentAvatar+'"><img id="neWorldSelfImage" src="'+portraits[currentAvatar]+'" alt="Твой учебный аватар" class="ne-world-portrait" loading="lazy">'+mouthSvg+'</div>'+
     '<div class="ne-world-name">Ты <span>отвечаешь</span></div></div>'+
   '</div>'+
   '<div class="ne-world-dialogue" aria-label="Текущий разговор">'+
     '<div class="ne-world-line ne-world-line-partner"><span>'+e(who)+'</span><p lang="nb" aria-label="Слова в реплике можно нажать для перевода">'+tapWords(last)+'</p></div>'+
     '<div class="ne-world-line ne-world-line-self" aria-live="off"><span>Твой ответ</span><p id="neWorldOwnWords" lang="nb">'+e(progress.pending?.answer||'Твои слова появятся здесь…')+'</p></div>'+
     '<div class="ne-world-next" id="neWorldReaction" aria-live="polite" hidden></div>'+
   '</div>'+
   '<div class="ne-world-coaching"><div class="ne-world-coach-head">Нора · твоя задача сейчас</div>'+
      '<p id="neWorldTask">'+e(step.task)+'</p>'+
      '<div class="ne-world-actions">'+
        '<button type="button" class="ne-world-audio" onclick="NEVisualWorld.speakPartner()">Слушать собеседника</button>'+
        '<button type="button" class="ne-world-audio" onclick="NEVisualWorld.speakTask()">Нора объясняет вслух</button>'+
      '</div><p class="ne-world-voice-status" id="neWorldVoiceStatus" role="status"></p>'+
      '<details class="ne-world-help"><summary>Спросить Нору · по-русски или по-норвежски</summary>'+
       '<p>Забыл слово, не понял вопрос или хочешь узнать другую форму? Спроси здесь, даже смешивая языки. Исходная реплика и твой ответ останутся на месте.</p>'+
       '<div class="ne-world-help-log" id="neWorldHelpLog" role="log" aria-live="polite">'+
       (Array.isArray(progress.helpChat)?progress.helpChat.slice(-8).map(turn=>
        '<div class="ne-world-help-turn"><strong>'+(turn.role==='assistant'?'Нора':'Ты')+'</strong><p>'+e(String(turn.text||'').slice(0,1200))+'</p></div>').join(''):'')+
       '</div>'+
       '<label for="neWorldHelpInput">Твой вопрос Норе</label>'+
       '<textarea id="neWorldHelpInput" class="input" maxlength="420" rows="2" placeholder="Jeg ... забыл, как будет «живу» ... i Norge?" oninput="this.dataset.neFromSpeech=\'false\'"></textarea>'+
       '<div class="ne-world-help-controls"><button type="button" class="btn secondary" onclick="NEVisualWorld.dictateHelp(\'ru\')">🎤 Русский</button>'+
       '<button type="button" class="btn secondary" onclick="NEVisualWorld.dictateHelp(\'nb\')">🎤 Norsk</button>'+
       '<button type="button" class="btn" id="neWorldHelpSend" onclick="NEVisualWorld.askHelp()">Спросить Нору</button></div>'+
       '<small id="neWorldHelpStatus" role="status" aria-live="polite">Подсказки не оцениваются. Для AI-ответа нужен интернет. Смешанная устная речь распознаётся не всегда точно — можно исправить текст перед отправкой.</small>'+
       '</details>'+
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
     '<textarea id="neWorldFreeInput" maxlength="350" rows="2" class="input" placeholder="Что ты хочешь сказать?" oninput="this.dataset.neFromSpeech=\'false\'"></textarea>'+
     '<div class="ne-world-free-controls"><button type="button" class="btn secondary" id="neWorldFreeMic" onclick="NEVisualWorld.dictateFree()">🎤 Произнести</button>'+
     '<button type="button" class="btn secondary" id="neWorldFreeSend" onclick="NEVisualWorld.sendFree()">Отправить реплику</button>'+
     '<button type="button" class="btn secondary" id="neWorldFreeReplay" onclick="NEVisualWorld.speakLastFree()"'+(replayEnabled?'':' disabled')+'>Слушать последний ответ</button></div>'+
     '<small id="neWorldFreeStatus" role="status" aria-live="polite">До '+freeTurnLimit(lesson.level)+' свободных реплик за урок. Микрофон использует распознавание речи устройства: проверь текст перед отправкой. Для ответа AI необходим интернет.</small>'+
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
   el.removeAttribute?.('data-ne-viseme');
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
 // Presentational cues reflect punctuation and familiar conversational language,
 // not emotion recognition, a judgement of the learner, or scoring evidence.
 function reactionTone(reply){
  const line=String(reply||'').trim().toLowerCase();
  if(/[?？]\s*$/u.test(line))return 'curious';
  if(/\b(?:takk|bra|flott|klart|hyggelig)\b|selvfølgelig/u.test(line))return 'warm';
  if(/\b(?:kanskje|beklager|ikke|dessverre|usikker)\b/u.test(line))return 'thoughtful';
  return 'neutral';
 }
 function reactPartner(reply){
  const actor=talkingTarget('partner');
  if(!actor)return false;
  actor.setAttribute?.('data-ne-reaction',reactionTone(reply));
  return animate('partner');
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
  // Never leave an old speaking character animated when a scene disappears.
  activeSpeech?.stop?.();clearSpeechVisual();
  const el=talkingTarget(role);if(!el)return false;
  const name=role==='guide'?'ne-world-guide-talking':'ne-world-talking';
  const words=String(utterance.text||'');
  const rate=Number.isFinite(utterance.rate)?Math.max(.6,Math.min(1.5,utterance.rate)):1;
  let timer=null,anchorAt=Date.now(),charAt=0,wordLength=0,hasBoundary=false,finished=false,paused=false,started=false;
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
   if(activeSpeech!==ticket||finished||started)return;
   started=true;paused=false;anchorAt=Date.now();charAt=0;
   el.classList.add(name);setMouth('mid');
   if(words&&timer===null&&typeof window.setInterval==='function')timer=window.setInterval(tick,88);
  };
  const boundary=event=>{
   if(activeSpeech!==ticket||finished||paused||!started)return;
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
   if(!started)return;
   if(timer!==null&&typeof window.clearInterval==='function')window.clearInterval(timer);
   timer=null;el.classList?.remove(name);el.setAttribute?.('data-ne-viseme','closed');
  };
  const onResume=()=>{
   if(activeSpeech!==ticket||finished)return;
   paused=false;
   if(!started)return;
   anchorAt=Date.now();el.classList.add(name);
   if(words&&timer===null&&typeof window.setInterval==='function')timer=window.setInterval(tick,88);
   tick();
  };
  utterance.addEventListener('start',onStart);
  utterance.addEventListener('boundary',boundary);
  utterance.addEventListener('pause',onPause);
  utterance.addEventListener('resume',onResume);
  utterance.addEventListener('end',finish);
  utterance.addEventListener('error',finish);
  // The synth may queue speech. Animate only after its real start event.
  return true;
 }
 // Use the actual decoded audio's energy envelope for the main AI TTS
 // playback. This is sound-driven mouth opening, not phonemic lip-sync.
 let expectedSpokenAudio=null,pcmSpeech=null;
 function onAudioStop(){
  if(!pcmSpeech)return false;
  const job=pcmSpeech;pcmSpeech=null;
  if(job.timer!==null&&typeof window.clearInterval==='function')window.clearInterval(job.timer);
  job.el?.classList?.remove('ne-world-talking');
  job.el?.removeAttribute?.('data-ne-viseme');
  return true;
 }
 function onAudioStart({text,buffer,context,startTime,rate}={}){
  onAudioStop();
  if(!expectedSpokenAudio||expectedSpokenAudio.text!==String(text||'')||!lipSyncEnabled())return false;
  const el=talkingTarget(expectedSpokenAudio.role);
  if(!el||typeof buffer?.getChannelData!=='function'||!Number.isFinite(buffer.sampleRate)||
     !Number.isFinite(buffer.duration)||buffer.duration<=0||typeof window.setInterval!=='function')return false;
  // A stereo voice may be silent in one channel. Measure both channels
  // rather than assuming the first channel contains the speaker.
  let channels;
  try{
   const count=Math.max(1,Math.min(2,Math.floor(Number(buffer.numberOfChannels)||1)));
   channels=Array.from({length:count},(_,i)=>buffer.getChannelData(i)).filter(samples=>samples?.length);
  }catch{return false}
  if(!channels.length)return false;
  const started=Number.isFinite(startTime)?startTime:Number(context?.currentTime)||0;
  const speed=Math.max(.5,Math.min(2,Number(rate)||1));
  const job={el,timer:null};pcmSpeech=job;
  el.classList?.add('ne-world-talking');
  const tick=()=>{
   if(pcmSpeech!==job||!lipSyncEnabled()){onAudioStop();return}
   const position=Math.max(0,(Number(context?.currentTime||0)-started)*speed);
   if(position>=buffer.duration){onAudioStop();return}
   const center=Math.max(0,Math.floor(position*buffer.sampleRate));
   const half=Math.min(360,Math.max(24,Math.floor(buffer.sampleRate*.009)));
   let sum=0,count=0;
   for(const samples of channels){
    const at=Math.min(samples.length-1,center);
    for(let i=Math.max(0,at-half);i<=Math.min(samples.length-1,at+half);i+=6){
     sum+=samples[i]*samples[i];count++;
    }
   }
   const rms=Math.sqrt(sum/Math.max(1,count));
   // Sound envelope shapes are not precise Norwegian phonemes.
   el.setAttribute?.('data-ne-viseme',rms<.012?'closed':rms<.045?'mid':rms<.11?'wide':'round');
  };
  tick();job.timer=window.setInterval(tick,70);
  return true;
 }
 function sayPartner(text,rate){
  if(typeof window.speakText!=='function')return false;
  try{
   const scene=window.NEGuidedSpeaking?.definition?.(window.neLessonSession?.lesson);
   const voice=actorVoices[actorKey(scene?.actor)]||'marin';
   expectedSpokenAudio={text:String(text||''),role:'partner'};
   const utterance=window.speakText(text,rate,null,voice);
   if(!utterance)return false;
   // Audio playback and optional mouth animation are independent.
   // Web Speech fallback has boundaries. AI audio has real PCM events.
   if(utterance&&typeof utterance.addEventListener==='function')bindSpeech(utterance,'partner');
   else if(utterance&&typeof utterance.catch==='function')utterance.catch(()=>{});
   return true;
  }catch{return false}
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
  const index=progress.index,text=('Твоя задача: '+String(task)).slice(0,600);
  if(typeof window.speakText!=='function'){status('Озвучка недоступна. Задание показано на экране.');return}
  expectedSpokenAudio={text,role:'coach'};
  status('Нора готовит объяснение на русском…');
  try{Promise.resolve(window.speakText(text,.92,null,'marin','ru-RU')).then(result=>{
   if(window.neLessonSession?.lesson!==lesson||progress.index!==index)return;
   status(['ai','human','device'].includes(result?.source)?'Нора объясняет задание.':'Звук недоступен — задание написано на экране.');
  }).catch(()=>{if(progress.index===index)status('Не удалось воспроизвести объяснение. Задание видно на экране.')})}
  catch{status('Звук сейчас недоступен. Задание видно на экране.')}
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
  reactPartner(reply);
 }

 // Optional contextual teacher assistance within a guided speaking turn.
 // It never calls grading, changes the assessed answer or advances a stage.
 const helpPending=new WeakSet();
 let helpRecognition=null;
 function helpStatus(message){
  const node=typeof document!=='undefined'&&document.getElementById('neWorldHelpStatus');
  if(node)node.textContent=String(message||'');
 }
 function appendHelp(role,body){
  const log=document.getElementById('neWorldHelpLog');
  if(!log||typeof document.createElement!=='function')return;
  const div=document.createElement('div'),strong=document.createElement('strong'),p=document.createElement('p');
  div.className='ne-world-help-turn';
  strong.textContent=role==='assistant'?'Нора':'Ты';
  p.textContent=String(body||'');
  div.append(strong,p);log.append(div);
 }
 // Recognize an explicit Russian request for help inside the assessed answer box.
 // Ordinary Bokmål questions remain valid assessed dialogue answers.
 function helpFromGuidedAnswer(text,source){
  const raw=String(text||'').trim();
  if(!/[\u0400-\u04ff]/u.test(raw)||
     !/(?:не\s+(?:знаю|помню|понимаю|понял|поняла)|забыл(?:а)?|как\s+(?:сказать|будет|перевести)|что\s+(?:значит|означает)|подскажи|помоги|объясни|переведи|повтори|медленнее)/iu.test(raw))return false;
  const helpField=document.getElementById('neWorldHelpInput');
  const progress=window.neLessonSession?.guidedSpeech;
  if(!helpField?.isConnected||!progress)return false;
  const details=document.querySelector?.('.ne-world-help');
  if(details)details.open=true;
  if(helpPending.has(progress)){
   helpStatus('Нора уже отвечает на предыдущий вопрос. Дождись ответа или исправь запрос.');
   return true;
  }
  helpField.value=raw.slice(0,420);
  if(helpField.dataset)helpField.dataset.neFromSpeech=['true','recognition'].includes(String(source?.dataset?.fromVoice||''))?'true':'false';
  // Do not erase the learner's unfinished Bokmål answer, or produce a grade.
  void askHelp();
  return true;
 }
 async function askHelp(){
  const session=window.neLessonSession,progress=session?.guidedSpeech,lesson=session?.lesson;
  const scene=window.NEGuidedSpeaking?.definition?.(lesson);
  const input=document.getElementById('neWorldHelpInput');
  const button=document.getElementById('neWorldHelpSend');
  const question=String(input?.value||'').trim();
  if(!session||!lesson||!progress||!scene||!Number.isInteger(progress.index)||
     !input?.isConnected||helpPending.has(progress)||!question)return false;
  if(question.length>420){helpStatus('Вопрос должен быть не длиннее 420 символов.');return false}
  if(typeof window.neApiPost!=='function'){helpStatus('Для ответа Норы нужен интернет. Сам урок доступен.');return false}
  const turn=progress.index,step=scene.steps[turn];
  if(!step)return false;
  const mainAnswer=document.getElementById('freeAnswer');
  const draft=String(mainAnswer?.value||'').trim().slice(0,420);
  const history=Array.isArray(progress.helpChat)?progress.helpChat.slice(-6).map(t=>({
   role:t.role==='assistant'?'assistant':'user',text:String(t.text||'').slice(0,1200)
  })):[];
  const context='Текущая сцена: '+String(scene.scene||'').slice(0,160)+
   '. Собеседник: '+String(scene.actor||'').slice(0,90)+
   '. Последняя реплика собеседника: '+sceneLine(scene,progress).slice(0,380)+
   '. Задание: '+String(step.task||'').slice(0,400)+
   '. Черновик ответа ученика (ещё не проверен): '+draft;
  helpPending.add(progress);if(button)button.disabled=true;
  helpStatus('Нора разбирает твой вопрос. Текущий ответ не изменяется…');
  try{
   const result=await window.neApiPost('/api/chat',{
    mode:'explain',scenario:'guided_help',message:question,
    topic:String(scene.scene||'Норвежский диалог').slice(0,130),
    level:['A1','A2','B1','B2'].includes(lesson.level)?lesson.level:'A1',
    history,context,inputSource:input.dataset?.neFromSpeech==='true'?'voice_transcript':'typed_text'
   });
   if(window.neLessonSession!==session||session.guidedSpeech!==progress||
      progress.index!==turn||!input.isConnected)return false;
   if(input.value.trim()!==question){
    helpStatus('Ты изменил вопрос, пока Нора отвечала. Новый текст остался в поле — отправь его отдельно.');
    return false;
   }
   const answer=String(result?.data?.explanation_ru||'').trim();
   if(!result?.ok||!answer||answer.length>3000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(answer)){
    helpStatus('Нора не смогла ответить. Вопрос и основной ответ не потеряны; попробуй позже.');
    return false;
   }
   progress.helpChat=[...history,{role:'user',text:question},{role:'assistant',text:answer}].slice(-8);
   window.NEWordTrays?.recordTutorWord?.({question,explanation:answer,lesson});
   // A hint about the current turn means the next answer is guided practice,
   // not independent evidence of mastery, even when it is fully correct.
   if(!progress.aidedTurns||typeof progress.aidedTurns!=='object'||Array.isArray(progress.aidedTurns))progress.aidedTurns={};
   progress.aidedTurns[String(turn)]=true;
   try{window.persistLessonCheckpoint?.()}catch{}
   appendHelp('user',question);appendHelp('assistant',answer);
   input.value='';if(input.dataset)input.dataset.neFromSpeech='false';
   helpStatus('Нора объяснила. Вернись к своему ответу: задание осталось тем же. Подсказка не засчитана.');
   return true;
  }catch{
   if(window.neLessonSession===session&&session.guidedSpeech===progress&&progress.index===turn)
    helpStatus('Нет ответа от AI. Текущий вопрос и исходное задание сохранены.');
   return false;
  }finally{
   helpPending.delete(progress);if(button?.isConnected)button.disabled=false;
  }
 }
 function dictateHelp(lang){
  const session=window.neLessonSession,input=document.getElementById('neWorldHelpInput');
  const code=lang==='ru'?'ru-RU':lang==='nb'?'nb-NO':null;
  if(!code||!session?.guidedSpeech||!input?.isConnected)return false;
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(typeof SR!=='function'){helpStatus('Распознавание речи недоступно. Напиши вопрос в поле.');return false}
  try{helpRecognition?.abort?.()}catch{}
  let recognition;
  try{recognition=new SR()}catch{helpStatus('Не удалось открыть микрофон.');return false}
  const original=input.value,progress=session.guidedSpeech,turn=progress.index;
  helpRecognition=recognition;recognition.lang=code;recognition.interimResults=false;recognition.maxAlternatives=1;
  recognition.onresult=event=>{
   if(helpRecognition!==recognition||window.neLessonSession!==session||
      session.guidedSpeech!==progress||progress.index!==turn||!input.isConnected)return;
   if(input.value!==original){helpStatus('Ты уже изменил вопрос: распознанная речь не заменит твой текст.');return}
   const phrase=String(event.results?.[0]?.[0]?.transcript||'').trim();
   if(!phrase)return;
   input.value=[original.trim(),phrase].filter(Boolean).join(' ').slice(0,420);
   if(input.dataset)input.dataset.neFromSpeech='true';
   helpStatus('Проверь распознанный вопрос и нажми «Спросить Нору».');
  };
  recognition.onerror=()=>{
   if(helpRecognition===recognition)helpStatus('Не получилось распознать речь. Напиши вопрос вручную.');
  };
  recognition.onend=()=>{if(helpRecognition===recognition)helpRecognition=null};
  try{recognition.start();helpStatus('Слушаю вопрос ('+(lang==='ru'?'русский':'норвежский')+')…');return true}
  catch{if(helpRecognition===recognition)helpRecognition=null;helpStatus('Микрофон не запустился.');return false}
 }
 const freeTurnLimit=level=>level==='B2'||level==='B1'?12:level==='A2'?10:8;
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
   if(freeRecognition!==speech||window.neLessonSession!==lessonSession||!field.isConnected)return;
   const raw=String(event?.results?.[0]?.[0]?.transcript||'').trim();
   if(!raw)return;
   // Preserve text entered after microphone activation. Never silently erase it.
   const current=field.value.trim();
   field.value=current?current+' '+raw:raw;
   if(field.dataset)field.dataset.neFromSpeech='true';
   freeStatus('Распознано. Проверь текст, затем отправь реплику.');
  };
  speech.onerror=()=>{if(freeRecognition===speech&&window.neLessonSession===lessonSession&&field.isConnected)
   freeStatus('Распознавание не завершилось. Попробуй ещё раз или напиши текст.');};
  speech.onend=()=>{
   if(freeRecognition!==speech)return;
   freeRecognition=null;
   if(window.neLessonSession===lessonSession&&field.isConnected)
    document.getElementById('neWorldFreeMic')?.setAttribute?.('aria-pressed','false');
  };
  try{speech.start();return true}
  catch{freeRecognition=null;if(btn)btn.setAttribute?.('aria-pressed','false');
   freeStatus('Не получилось начать запись. Проверь разрешение микрофона.');return false;}
 }
 function freeStatus(message){
  const node=typeof document!=='undefined'&&document.getElementById('neWorldFreeStatus');
  if(node)node.textContent=String(message||'');
 }
 function speakLastFree(){
  const history=window.neLessonSession?.guidedSpeech?.freeChat;
  if(!Array.isArray(history))return false;
  const last=[...history].reverse().find(turn=>turn?.role==='assistant'&&typeof turn.text==='string'&&turn.text.trim());
  if(!last)return false;
  const spoken=sayPartner(last.text,.85);
  freeStatus(spoken?'Повторяю последнюю реплику собеседника.':'Озвучка на этом устройстве недоступна. Текст сохранён в истории.');
  return spoken;
 }
 // Contextual recycling only: draw existing Bokmål words from the active lesson.
 // This does not create a vocabulary grade or mark an item mastered.
 function sceneWords(lesson){
  const source=Array.isArray(lesson?.vocab)?lesson.vocab:[];
  const seen=new Set(),result=[];
  for(const entry of source){
   const raw=Array.isArray(entry)?entry[0]:(entry?.no||entry?.word||entry?.lemma);
   const word=String(raw||'').trim();
   if(!/^[A-Za-zÆØÅæøå][A-Za-zÆØÅæøå\s-]{1,39}$/u.test(word))continue;
   const id=word.toLocaleLowerCase('nb-NO');if(seen.has(id))continue;
   seen.add(id);result.push(word);if(result.length>=5)break;
  }
  return result;
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
  if(!session||!progress||!scene||!field||freePending.has(progress))return false;
  const history=Array.isArray(progress.freeChat)?progress.freeChat:[];
  // Pruning the visible history must not reset the real conversation limit.
  const already=Math.max(Number(progress.freeTurnsUsed)||0,history.filter(t=>t?.role==='user').length);
  const limit=freeTurnLimit(lesson.level);
  if(already>=limit){freeStatus('Лимит '+limit+' свободных реплик использован. Продолжи основной урок.');return false}
  if(!message)return false;
  if(message.length>350){freeStatus('Не больше 350 символов за реплику.');return false}
  if(typeof window.neApiPost!=='function'){freeStatus('Свободный диалог требует подключения к AI. Основной урок доступен.');return false}
  const turnIndex=progress.index;
  freePending.add(progress);if(button)button.disabled=true;
  freeStatus('Собеседник слушает и думает над ответом…');
  const transcript=[{role:'assistant',text:String(scene.opening||'').slice(0,300)},
   ...history.slice(-10).filter(x=>x&&(x.role==='assistant'||x.role==='user')).map(x=>({role:x.role,text:String(x.text||'').slice(0,350)}))];
  try{
   const response=await window.neApiPost('/api/chat',{
    message,level:['A1','A2','B1','B2'].includes(lesson.level)?lesson.level:'A1',
    mode:'scene_practice',teacherMode:false,inputSource:field?.dataset?.neFromSpeech==='true'?'voice_transcript':'typed_text',
    topic:String(scene.scene||'Норвегия').slice(0,130),
    scenario:'Свободная необязательная практика без баллов и без экзамена. Место: '+String(scene.scene||'').slice(0,180)+
      '. Ты реальный человек в роли '+String(scene.actor||'норвежского собеседника').slice(0,100)+
      '. Ответь ПО-НОРВЕЖСКИ Bokmål естественно и кратко (1–2 предложения). По возможности задай один неожиданный, но уместный вопрос. Не отвечай за ученика. Не меняй сюжет оценочного урока. Не обещай действительных записей, цен, услуг или встреч.',
    history:transcript,practiceWords:sceneWords(lesson)
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
   const updated=[...history.filter(t=>t.role==='user'||t.role==='assistant').slice(-10),
    {role:'user',text:message},{role:'assistant',text:raw}].slice(-12);
   progress.freeChat=updated;
   progress.freeTurnsUsed=already+1;
   try{window.persistLessonCheckpoint?.()}catch{}
   appendFree('user',message,'Ты');
   appendFree('assistant',raw,String(scene.actor||'Собеседник').slice(0,70));
   field.value='';
   if(field.dataset)field.dataset.neFromSpeech='false';
   const replay=document.getElementById('neWorldFreeReplay');
   if(replay)replay.disabled=false;
   reactPartner(raw);
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
  const message=text=>{if(feedback?.isConnected!==false&&feedback)feedback.textContent=text};
  const text=field?.textContent?.trim();if(!text)return;
  if(typeof window.speakText!=='function'){message('Голос Норы недоступен. Прочитай инструкцию на экране.');return}
  expectedSpokenAudio={text,role:'guide'};
  message('Нора готовит инструкцию на русском…');
  try{Promise.resolve(window.speakText(text,.92,null,'marin','ru-RU')).then(result=>{
   if(!field?.isConnected)return;
   message(['ai','human','device'].includes(result?.source)?'Нора произносит инструкцию.':'Звук недоступен. Прочитай текст на экране.');
  }).catch(()=>message('Инструкция доступна текстом.'))}
  catch{message('Голос недоступен. Инструкция написана на экране.')}
 }
 window.NEVisualWorld=Object.freeze({freeTurnLimit,tapWords,inspectWord,render,guide,speakStage,onAudioStart,onAudioStop,updateOwn,chooseAvatar,animate,speakPartner,speakTask,practice,askHelp,dictateHelp,helpFromGuidedAnswer,dictateFree,sendFree,speakLastFree,bindSpeech,visemeAt,toggleLipSync,lipPreference,accepted,theme});
})();