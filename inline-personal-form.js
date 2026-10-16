/* In-lesson Norwegian form for contextual A1 writing (not an official document).
   Keeps the four sentences learner-authored and delegates evaluation to existing AI.
   No entered personal details are added to state, storage, or analytics. */
(function(){
 'use strict';
 const nativeFree=window.freeEx;
 if(typeof nativeFree!=='function')return;
 const FIELDS=[
  {key:'name',label:'Navn · Имя',hint:'Назови имя',stem:'jeg heter'},
  {key:'country',label:'Land · Страна происхождения',hint:'Назови страну',stem:'jeg kommer fra'},
  {key:'city',label:'Bosted · Город проживания',hint:'Назови город',stem:'jeg bor'},
  {key:'language',label:'Språk · Язык',hint:'Назови язык, на котором говоришь',stem:'jeg snakker'}
 ];
 function escapeHtml(text){return String(text??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
 function isCardTask(l,mode,task){
  if(mode!=='writing'||l?.level!=='A1'||!task||window.neLessonSession?.remediation)return false;
  const t=String(task).toLocaleLowerCase('ru');
  const cues=['jeg heter','jeg kommer fra','jeg bor','jeg snakker'].filter(word=>t.includes(word)).length;
  const card=/личн.{0,25}(карточк|данн)|карточк|personkort|personopplysninger|personal\s+(?:card|information)/i.test(t);
  return cues===4||(card&&cues>=2);
 }
 function render(l,task){
  const inputs=FIELDS.map(({key,label,hint,stem},i)=>
   '<div class="ne-card-field"><label for="ne-card-'+key+'">'+(i+1)+'. '+escapeHtml(label)+'</label>'+
    '<p class="ne-card-stem">Используй: <span lang="nb">'+escapeHtml(stem)+'</span> …</p>'+
    '<textarea id="ne-card-'+key+'" data-ne-person-card="'+key+'" rows="2" maxlength="180" class="input ne-card-input" autocomplete="off" autocapitalize="sentences" spellcheck="true" placeholder="Напиши полное предложение по-норвежски" oninput="neInlineCardSync()"></textarea>'+
    '<small>'+escapeHtml(hint)+'</small></div>'
  ).join('');
  return '<article class="card ne-lesson-personal-card">'+
   '<div class="eyebrow">Письмо · учебный бланк</div>'+
   '<h2 class="ne-card-title" lang="nb">PERSONKORT</h2>'+
   '<p class="ne-card-subtitle">Личная карточка · '+escapeHtml(l.level)+'</p>'+
   '<div class="prompt ne-card-instruction">'+escapeHtml(task)+'</div>'+
   '<div class="ne-card-notice">Заполни все 4 поля <b>полными предложениями на норвежском</b>. Можно использовать вымышленные имя и город. Это учебная форма, а не настоящий документ. После нажатия «Проверить AI» текст отправится на проверку.</div>'+
   '<div class="ne-card-paper">'+inputs+'</div>'+
   '<textarea id="freeAnswer" class="ne-card-composed" aria-hidden="true" tabindex="-1" readonly></textarea>'+
   '<div id="neCardValidation" class="ne-card-validation" role="status" aria-live="polite"></div>'+
   '<div class="row" style="margin-top:12px"><button type="button" class="btn" onclick="neInlineCardSubmit()">🧠 Проверить AI</button></div>'+
   '<div id="freeFb" aria-live="polite"></div>'+
   '</article>';
 }
 function values(){
  return FIELDS.map(f=>String(document.getElementById('ne-card-'+f.key)?.value||'').trim());
 }
 function sync(){
  const answer=document.getElementById('freeAnswer');if(!answer)return;
  const entries=values();answer.value=entries.filter(Boolean).join('\n');
  const validation=document.getElementById('neCardValidation');
  if(validation)validation.textContent='';
 }
 function submit(){
  const answer=document.getElementById('freeAnswer');if(!answer)return;
  const entries=values(),missing=entries.findIndex(x=>!x);
  const validation=document.getElementById('neCardValidation');
  if(missing>=0){
   if(validation)validation.textContent='Заполни все 4 поля. Сейчас не заполнено: '+FIELDS[missing].label+'.';
   document.getElementById('ne-card-'+FIELDS[missing].key)?.focus();
   return;
  }
  sync();
  if(typeof window.checkFree==='function')window.checkFree('writing');
 }
 window.freeEx=function(l,mode){
  const s=window.neLessonSession;
  const p=typeof window.lessonFreeTask==='function'?
   window.lessonFreeTask(l,mode,null,s?.speakingFollowup===true):
   (mode==='writing'?l?.writing:l?.speaking);
  return isCardTask(l,mode,p)?render(l,p):nativeFree(l,mode);
 };
 Object.assign(window,{neInlineCardSync:sync,neInlineCardSubmit:submit,
  neInlineCardEligible:isCardTask});
})();
