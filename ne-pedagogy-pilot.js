/* Norsk Eventyr — account-scoped A1 pedagogical pilot, preview integration.
   Separate from native lessonSession, XP, grades and CEFR gates. No network endpoints.
   Load only after NEAccess has approved loading the ordinary app scripts. */
(()=>{
 'use strict';
 const SCHEMA_KEY='nePedagogyPilotA1';
 const LESSON=window.NEPedagogyLesson,FACTORY=window.NEPedagogyEngine;
 if(!LESSON||!FACTORY)return;
 const ASSET='/assets/ne-pilot/';
 const actors={anna:['Анна','anna.webp'],nora:['Нора','nora.webp'],erik:['Эрик','erik.webp'],ingrid:['Ингрид','anna.webp'],self:['Ты','self-male.webp']};
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let modal=null,engine=null,tab='lesson',voiceDraft=false,storageFailed=false,recognition=null,reviewFeedback=null,accountId=null,accessTimer=null,ownSpeech=null;
 function state(){return window.neLearnerState||null}
 function accessAllowed(){
   const access=window.NEAccess,a=access?.info?.();
   return !!state()&&!!a?.user_id&&a.access_granted===true&&access.allowed?.()===true;
  }
  function authorized(){
   const valid=accessAllowed()&&accountId===window.NEAccess.info().user_id;
   if(!valid&&modal?.open)close();
   return valid;
  }
  function cancelMedia(){recognition?.abort?.();recognition=null;if(ownSpeech){window.speechSynthesis?.cancel();ownSpeech=null}}
  function flushDraft(){
   if(!engine||!modal||!authorized())return false;
   const field=modal.querySelector('#npAnswer');
   return field?engine.saveDraft(field.value,{source:voiceDraft?'voice':'typed'}):engine.save();
  }
  function choiceOrder(t){
   const choices=t.choices.map((choice,index)=>({choice,index}));
   // Stable display order preserves original saved answer indices across reloads.
   const shift=[...t.id].reduce((sum,c)=>sum+c.charCodeAt(0),1)%choices.length;
   return choices.slice(shift).concat(choices.slice(0,shift));
  }
 function storeFor(s){
  return {
   getItem(k){if(k!==SCHEMA_KEY)return null;const v=s.learningV8?.pedagogyPilotA1;return v&&typeof v==='object'?JSON.stringify(v):null},
   setItem(k,raw){if(k!==SCHEMA_KEY)return;const value=JSON.parse(raw);
    if(!s.learningV8||typeof s.learningV8!=='object')s.learningV8={};
    const prior=s.learningV8.pedagogyPilotA1;
    s.learningV8.pedagogyPilotA1=value;
    try{if(typeof window.saveState==='function'&&window.saveState()===false)throw Error('saveState returned false');storageFailed=false}
    catch(e){storageFailed=true;s.learningV8.pedagogyPilotA1=prior;throw e}
   }
  }
 }
 function init(){const s=state();engine=FACTORY.createEngine({lesson:LESSON,storage:storeFor(s),key:SCHEMA_KEY});
  // Only first-time setup inherits the avatar that is already selected in the app.
  if(!s.learningV8?.pedagogyPilotA1){const selected=s.learningV8?.visualWorld?.gender;
   if(['female','male'].includes(selected))engine.setAvatar(selected)}
 }
 const asset=(speaker)=>ASSET+(actors[speaker]?.[1]||actors.nora[1]);
 const name=id=>actors[id]?.[0]||'Собеседник';
 function say(text,speaker='anna',onFinished){
   if(!authorized())return false;
  if(!('speechSynthesis'in window)){message('Озвучка недоступна на устройстве.');return false}
  try{window.speechSynthesis.cancel();const s=new SpeechSynthesisUtterance(String(text).slice(0,400));ownSpeech=s;
   s.lang=speaker==='nora'&&/[а-яё]/iu.test(text)?'ru-RU':'nb-NO';s.rate=speaker==='nora'?.9:.86;
   const options=window.speechSynthesis.getVoices().filter(v=>v.lang?.toLowerCase().startsWith(s.lang.slice(0,2).toLowerCase()));
   if(options.length)s.voice=options[speaker==='anna'||speaker==='ingrid'?Math.min(1,options.length-1):0];
   s.onend=()=>{if(ownSpeech!==s)return;ownSpeech=null;if(authorized()&&typeof onFinished==='function')onFinished()};
   s.onerror=()=>message('Звук не воспроизведён. При необходимости выбери текстовый вариант.');
   window.speechSynthesis.speak(s);return true;
  }catch{message('Не удалось воспроизвести реплику.');return false}
 }
 function message(v){const el=modal?.querySelector('[data-pilot-message]');if(el)el.textContent=String(v||'')}
 function header(v){return `<header class="np-head"><div><strong>Norsk Eventyr</strong><small>Учебный пилот A1 · без баллов XP</small></div><button type="button" data-np="close" aria-label="Закрыть урок">×</button></header>`}
 function bar(v){return `<div class="np-progress"><div><b>Этап ${v.stageNumber} / ${v.stageTotal}</b><span>${v.progress.done} / ${v.progress.total} заданий</span></div><div class="np-bar"><i style="width:${v.progress.percent}%"></i></div></div>`}
 function picture(id,avatar){return ASSET+(id==='self'?'self-'+avatar+'.webp':(actors[id]?.[1]||'nora.webp'))}
 function group(t){if(!t.group?.length)return '';return `<section class="np-group"><b>Сначала послушай других</b>${t.group.map((g,i)=>`<div class="np-group-line"><img src="${picture(g.speaker)}" alt=""/><div><small>${escape(name(g.speaker))} → ${escape(name(g.to))}</small><p lang="nb">${escape(g.text)}</p><button type="button" data-np="tts-group" data-i="${i}">🔊 Слушать</button></div></div>`).join('')}</section>`}
 function character(t){const label=name(t.speaker),r=engine.getView().record;return `<div class="np-line"><div class="np-person"><img src="${picture(t.speaker)}" alt="${escape(label)}, портрет"/><b>${escape(label)}</b><small>→ ${t.to==='self'?'тебе':escape(name(t.to))}</small></div><div class="np-speech"><p lang="nb">${t.hideSpeech&&!r.readingFallback?'Нажми «Слушать». Вопрос будет показан только при выборе текстового варианта.':escape(t.spoken)}</p><button type="button" data-np="tts">🔊 ${t.hideSpeech?'Прослушать до конца':'Слушать'}</button>${t.hideSpeech?`<button type="button" data-np="reading-fallback">Нет звука — читать текст</button>`:''}</div></div>`}
 function advice(t){return `<details class="np-advice" data-np-advice><summary>Нора объясняет задание</summary><div class="np-coach"><img src="${picture('nora')}" alt="Нора"/><p data-pilot-explanation>Нора разберёт это задание на понятном примере.</p></div><button type="button" data-np="hint">Объясни по-другому</button><div data-pilot-hint role="status"></div><small>Открытие объяснения учитывается как подсказка. Самостоятельный ответ проверяется до подсказок.</small></details>`}
 function answer(t){if(t.kind==='choice')return `<div class="np-choices">${choiceOrder(t).map(({choice:c,index:i})=>`<button type="button" data-np="choice" data-i="${i}">${escape(c[0])}</button>`).join('')}</div>`;
  return `<div class="np-input"><label for="npAnswer">Твоя реплика</label><textarea id="npAnswer" rows="2" maxlength="500" placeholder="Напиши по-норвежски…"></textarea><div class="np-actions"><button type="button" data-np="mic">🎤 Говорить</button><button type="button" class="np-primary" data-np="check">✓ Ответить</button></div><small>Текст с микрофона не подтверждает качество произношения. Можно отвечать текстом.</small></div>`}
 function feedback(v){const r=v.record,f=v.feedback||r.feedback;if(!f)return '';
  let own='';if(f.accepted&&r.lastAnswer){const wording=v.task.kind==='choice'?(v.task.choices[Number(r.lastAnswer)]?.[0]||''):r.lastAnswer;
   own=`<div class="np-line np-own"><div class="np-person"><img src="${picture('self',v.avatar)}" alt="Твой аватар анфас"/><b>${escape(v.name||'Ты')}</b><small>→ ${v.task.kind==='choice'?'Норе · проверка понимания':escape(name(v.task.speaker))}</small></div><div class="np-speech"><p lang="nb">${escape(wording)}</p></div></div>`}
  return own+(f.accepted?`<section class="np-feedback np-good"><b>✓ Задание выполнено</b><span>${f.firstTry?'Самостоятельно':'После практики'}</span><p>${escape(f.explanation)}</p><button type="button" data-np="next">Следующая реплика →</button></section>`:
   `<section class="np-feedback np-bad"><b>Нора объясняет ошибку</b><p>${escape(f.explanation)}</p>${f.missing?.length?`<small>Не хватает: ${escape(f.missing.join(', '))}</small>`:''}</section>`)
 }
 function lesson(){const v=engine.getView();if(v.finished)return `<h1>Урок завершён</h1><p>Теперь важно повторить слова и проверить себя через несколько дней.</p>${report()}<button type="button" data-np="review">Перейти к повторению</button>`;
  const t=v.task;return `<h1>${escape(LESSON.title)}</h1>${bar(v)}<p class="np-stage"><b>${escape(v.stage.title)}</b><span>${escape(v.stage.goal)}</span><small>Ориентир: ${v.stage.minutes} минут. Без ограничения по таймеру.</small></p>${group(t)}${character(t)}<div class="np-goal"><b>${t.to==='self'?'Твой ход':'Проверь, кому адресован вопрос'}</b><p>${escape(t.goal)}</p></div>${advice(t)}${v.record.accepted?'':answer(t)}<div class="np-response" data-np-response role="status">${feedback(v)}</div><details class="np-words"><summary>Слова этого задания (${(t.words||[]).length})</summary>${(t.words||[]).map(w=>`<span>${escape(w)} — ${escape(LESSON.wordGlossary[w]||'см. объяснение')}</span>`).join('')}</details>`}
 function report(){const r=engine.report();const labels={speaking:'Диалоги (смысл ответа)',listening:'Аудирование',reading:'Чтение',writing:'Письмо'};
  return `<section class="np-report"><div class="np-stats"><div><strong>${r.independent}</strong><small>Без помощи</small></div><div><strong>${r.assisted}</strong><small>После помощи</small></div><div><strong>${r.skipped}</strong><small>Пропущено</small></div></div><p>Выполнено ${r.done} из ${r.total}. Это учебный результат, не уровень Norskprøven.</p>${Object.entries(labels).map(([k,label])=>{const p=r.skills[k]||{};return `<p><b>${label}:</b> самостоятельно ${p.independent||0}, с помощью ${p.assisted||0}.</p>`}).join('')}<p><b>Повторение:</b> ${r.retention.tested} попыток вспомнить перевод, ${r.retention.remembered} верных ответов без показанного перевода.</p><p><b>Аудирование:</b> ${r.sourceEvidence.listeningPlayback} заданий после воспроизведения; ${r.sourceEvidence.listeningTextFallback} — заменены чтением (не считаются подтверждённым аудированием).</p><p><b>Ответы ученика:</b> ${r.sourceEvidence.voiceTranscripts} распознанных голосовых фраз и ${r.sourceEvidence.typedDialogues} письменных ответов в диалогах.</p><p>Произношение не оценивалось. Это внутренние учебные данные, не сертификат Norskprøven. Оценок и XP основной курс не получает.</p></section>`}
 function reviews(){const due=engine.dueWords();return `<h1>Проверка запоминания</h1><p>Вспомни значение без подсказки и напиши его по-русски. Это самостоятельная проверка, а не кнопка самооценки.</p>`+
  (reviewFeedback?`<div class="np-recall-notice" role="status"><b>${reviewFeedback.correct?'Верно — вспомнил самостоятельно.':'Ответ пока не подтверждён.'}</b><p>${reviewFeedback.correct?'Следующее повторение: '+escape(reviewFeedback.nextDue):'Ожидаемое значение: '+escape(reviewFeedback.expected)+'. Повторим завтра.'}</p></div>`:'')+
  (due.length?due.map((w,i)=>`<div class="np-review"><b lang="nb">${escape(w.word)}</b><label for="npRecall${i}">Что означает это слово в данном уроке?</label><input id="npRecall${i}" data-np-recall-input="${i}" autocomplete="off" maxlength="160" placeholder="Введи перевод…"><div><button type="button" data-np="recall-check" data-word="${escape(w.word)}" data-i="${i}">✓ Проверить</button><button type="button" data-np="recall-give-up" data-word="${escape(w.word)}">Не знаю — показать ответ</button></div><small>Разные значения слова могут требовать дополнительных примеров. Необычные правильные варианты пока могут не распознаваться.</small></div>`).join(''):'<p>На сегодня назначенных слов нет. Следующее повторение появится по расписанию.</p>')}
 function profile(){const v=engine.getView();return `<h1>Мой персонаж</h1><p>Выбери внешний вид аватара. Это не влияет на сложность или оценивание.</p><div class="np-avatars">${[['male','Мужской'],['female','Женский']].map(([g,label])=>`<button type="button" data-np="avatar" data-gender="${g}" aria-pressed="${g===v.avatar}"><img src="${picture('self',g)}" alt=""/>${label}</button>`).join('')}</div><label for="npName">Имя (необязательно)</label><input id="npName" maxlength="40" value="${escape(v.name||'')}"/><button type="button" data-np="save-name">Сохранить имя</button>`}
 function render(){if(!modal||!authorized())return;
  const html=tab==='lesson'?lesson():tab==='review'?reviews():tab==='profile'?profile():report();
  modal.querySelector('.np-content').innerHTML=html;
  modal.querySelectorAll('[data-np-tab]').forEach(b=>b.setAttribute('aria-current',String(b.dataset.npTab===tab)));
  const warn=modal.querySelector('[data-pilot-save]');warn.textContent=storageFailed?'Не удалось сохранить занятие. Проверь подключение и не закрывай страницу.':'';
   const field=modal.querySelector('#npAnswer'),record=engine.getView().record;
   if(field){field.value=record?.draft??'';voiceDraft=record?.draftSource==='voice'}
   wire();
 }
 function check(choiceIndex){if(!authorized())return;const t=engine.getView().task;if(!t)return;const field=modal.querySelector('#npAnswer'),text=field?.value||'';
  const result=engine.submit(text,{source:voiceDraft?'voice':'typed',choiceIndex});voiceDraft=false;
  if(!result.ok){message(result.message||'Ответ не принят.');return}
  render();const f=modal.querySelector('#npAnswer');if(!result.accepted&&f&&t.kind!=='choice')f.value=text;
  modal.querySelector('[data-np-response]')?.scrollIntoView({block:'nearest',behavior:'smooth'});
 }
 function listen(){if(!authorized())return;const taskId=engine.getView().task?.id;const ctor=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!ctor){message('Распознавание речи недоступно; введи текст вручную.');return}
  recognition?.abort?.();const r=new ctor();recognition=r;r.lang='nb-NO';r.interimResults=false;r.maxAlternatives=1;
  const btn=modal.querySelector('[data-np="mic"]');if(btn)btn.disabled=true;
  r.onresult=event=>{if(!modal?.open||recognition!==r||!authorized()||engine.getView().task?.id!==taskId)return;const f=modal.querySelector('#npAnswer');if(f){f.value=String(event.results?.[0]?.[0]?.transcript||'').slice(0,500);voiceDraft=true;flushDraft();f.focus()}};
   r.onerror=event=>{if(recognition===r&&authorized())message('Ошибка микрофона: '+String(event.error||'неизвестно'))};
  r.onend=()=>{if(btn?.isConnected)btn.disabled=false};try{r.start()}catch{if(btn)btn.disabled=false;message('Микрофон недоступен.')}
 }
 function wire(){if(!modal)return;const t=engine.getView().task;
  modal.querySelector('[data-np="tts"]')?.addEventListener('click',()=>{const taskId=t.id;const onDone=t.hideSpeech?()=>{if(!authorized()||engine?.getView().task?.id!==taskId)return;engine.markHeard();render();message('Прослушивание завершено. Теперь ответь на вопрос.')}:null;say(t.spoken,t.speaker,onDone)});
  modal.querySelector('[data-np="reading-fallback"]')?.addEventListener('click',()=>{if(!authorized())return;if(engine.useReadingFallback()){render();message('Включён текстовый вариант. Он не засчитывается как аудирование.')}});
  modal.querySelectorAll('[data-np="tts-group"]').forEach(b=>b.addEventListener('click',()=>{const g=t?.group?.[Number(b.dataset.i)];if(g)say(g.text,g.speaker)}));
  modal.querySelector('[data-np="check"]')?.addEventListener('click',()=>check(undefined));
  modal.querySelectorAll('[data-np="choice"]').forEach(b=>b.addEventListener('click',()=>check(Number(b.dataset.i))));
  modal.querySelector('[data-np="mic"]')?.addEventListener('click',listen);
  modal.querySelector('#npAnswer')?.addEventListener('input',()=>{voiceDraft=false;flushDraft();const warn=modal.querySelector('[data-pilot-save]');warn.textContent=storageFailed?'Не удалось сохранить ответ. Не закрывай страницу.':''});
  const words=modal.querySelector('.np-words');
   words?.addEventListener('toggle',()=>{if(!authorized()||!words.open||words.dataset.npUsed)return;words.dataset.npUsed='1';engine.askHelp()});
   const advice=modal.querySelector('[data-np-advice]');advice?.addEventListener('toggle',()=>{if(!authorized()||!advice.open||advice.dataset.npUsed==='1')return;advice.dataset.npUsed='1';const h=engine.askHelp(),p=modal.querySelector('[data-pilot-explanation]');if(p)p.textContent=h?.text||''});
  modal.querySelector('[data-np="hint"]')?.addEventListener('click',()=>{if(!authorized())return;const h=engine.askHelp(),p=modal.querySelector('[data-pilot-hint]');if(p)p.textContent=h?.text||''});
  modal.querySelector('[data-np="next"]')?.addEventListener('click',()=>{if(!authorized()||!flushDraft())return;cancelMedia();if(engine.next()){voiceDraft=false;render();modal.querySelector('.np-scroll').scrollTop=0}});
  modal.querySelector('[data-np="review"]')?.addEventListener('click',()=>{if(!authorized()||!flushDraft())return;cancelMedia();tab='review';render()});
  modal.querySelectorAll('[data-np="recall-check"],[data-np="recall-give-up"]').forEach(b=>b.addEventListener('click',()=>{if(!authorized())return;const giveUp=b.dataset.np==='recall-give-up';const field=modal.querySelector(`[data-np-recall-input="${b.dataset.i}"]`);const result=engine.testRecall(b.dataset.word,field?.value||'',{giveUp});if(!result.ok){message(result.message||'Ответ пока не проверен.');return}reviewFeedback=result;render()}));
  modal.querySelectorAll('[data-np="avatar"]').forEach(b=>b.addEventListener('click',()=>{if(!authorized())return;const gender=b.dataset.gender;
    if(!engine.setAvatar(gender)){render();return}
    if(window.NEVisualWorld?.chooseGender){window.NEVisualWorld.chooseGender(gender)}
    render()}));
  modal.querySelector('[data-np="save-name"]')?.addEventListener('click',()=>{if(!authorized())return;const saved=engine.setName(modal.querySelector('#npName')?.value||'');message(saved?'Имя сохранено.':'Не удалось сохранить имя. Не закрывай страницу.')});
 }
 function open(){if(!accessAllowed())return false;
  if(modal?.open){if(!authorized())return false;modal.focus();return true}accountId=window.NEAccess.info().user_id;init();
  modal=document.createElement('dialog');const dialog=modal;modal.className='ne-pilot';modal.setAttribute('aria-label','Учебный пилот Norsk Eventyr');
  modal.innerHTML=header()+`<div class="np-scroll"><main class="np-content"></main><p data-pilot-save role="status" class="np-error"></p><p data-pilot-message role="status" class="np-message"></p></div>`+
   `<nav class="np-nav" aria-label="Разделы учебного пилота"><button data-np-tab="lesson">Урок</button><button data-np-tab="review">Повторение</button><button data-np-tab="progress">Прогресс</button><button data-np-tab="profile">Аватар</button></nav>`;
  document.body.appendChild(modal);
  modal.querySelector('[data-np="close"]').addEventListener('click',close);
  modal.querySelectorAll('[data-np-tab]').forEach(b=>b.addEventListener('click',()=>{if(!authorized()||!flushDraft())return;cancelMedia();tab=b.dataset.npTab;voiceDraft=false;render();modal.querySelector('.np-scroll').scrollTop=0}));
  modal.addEventListener('cancel',event=>{event.preventDefault();close()});
  modal.addEventListener('close',()=>{if(modal===dialog)dispose()});
  modal.showModal();accessTimer=setInterval(authorized,2000);render();return true
 }
 function dispose(){
  cancelMedia();clearInterval(accessTimer);accessTimer=null;
  modal?.remove();modal=null;engine=null;accountId=null;tab='lesson';voiceDraft=false;reviewFeedback=null;
 }
 function close(){if(!modal)return;
   // Never persist an old account's draft into a newly selected account.
   const sameAccount=accountId===window.NEAccess?.info?.()?.user_id;
   if(sameAccount&&accessAllowed()&&!flushDraft()){
    message('Ответ пока не сохранён. Освободи место и попробуй закрыть урок ещё раз.');return false;
   }
   modal.close();dispose();return true;
  }
  window.addEventListener('pagehide',()=>{if(modal?.open&&accessAllowed()&&accountId===window.NEAccess.info().user_id)flushDraft()});
 window.NEPedagogyPilot=Object.freeze({open,close,isOpen:()=>!!modal?.open,lessonId:LESSON.id});
})();
