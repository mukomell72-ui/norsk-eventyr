// Vocabulary warm-up integrated into the continuous Nora lesson.
// 5 new lexical units per study date, 15 active at once. Never delete learned history.
(function(){
'use strict';
const MAX=15,PER_DAY=5,LEVELS=['A1','A2','B1','B2'];
const day=()=>new Date().toLocaleDateString('sv-SE');
const getState=()=>window.neLearnerState;
const save=()=>window.saveState?.();
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key=x=>String(x||'').trim().normalize('NFKC').toLocaleLowerCase('nb-NO').replace(/^å\s+/,'').replace(/[.,!?;:"'()[\]{}]/g,'').replace(/\s+/g,' ');
const norm=x=>key(x).replace(/[.!?]+$/,'');
function isWord(w){return !!(w&&typeof w.word==='string'&&w.word.trim()&&typeof w.translation==='string'&&w.translation.trim())}
function snapshot(){
 const s=getState();if(!s)return null;
 s.learningV8=s.learningV8&&typeof s.learningV8==='object'?s.learningV8:{};
 let p=s.learningV8.livingVocabulary;
 if(!p||typeof p!=='object'||Array.isArray(p))s.learningV8.livingVocabulary=p={active:[],days:{}};
 p.days=p.days&&typeof p.days==='object'&&!Array.isArray(p.days)?p.days:{};
 p.active=Array.isArray(p.active)?p.active.filter(isWord).slice(-MAX):[];
 return p;
}
function candidates(level,moduleId){
 const out=[],seen=new Set(),add=(name,ru,metadata={})=>{const k=key(name);if(!k||!ru||seen.has(k))return;seen.add(k);out.push({word:String(name).trim(),translation:String(ru).trim(),key:k,...metadata})};
 const catalog=window.NECurated;
 const ids=[moduleId,...(window.NECurriculum?.modules(level)||[]).map(x=>x.id)];
 for(const id of [...new Set(ids.filter(Boolean))]){
  const item=catalog?.get?.(id);for(const pair of item?.vocab||[])if(Array.isArray(pair))add(pair[0],pair[1]);
 }
 return out;
}
function fromDictionary(s,level){
 const entries=Object.values(s.dailyDictionary||{}).filter(x=>x&&(x.level===level||!x.level)&&((x.lemma||x.word)&&x.translation_ru)).map(x=>({
  word:String(x.lemma||x.word),translation:String(x.translation_ru),key:key(x.lemma||x.word),pos:x.pos||'',gender:x.gender||'',
  seen:String(x.firstDate||''),due:Number(x.nextDue)||0,wrong:Number(x.wrong)||0
 }));
 entries.sort((a,b)=>(b.due>0&&b.due<=Date.now()?1:0)-(a.due>0&&a.due<=Date.now()?1:0)||b.wrong-a.wrong||String(a.seen).localeCompare(String(b.seen)));
 return entries;
}
function choose(level,moduleId,date){
 const s=getState(),p=snapshot();if(!s||!p)return null;
 if(p.days[date]&&Array.isArray(p.days[date].active))return p.days[date];
 const existing=new Set([...p.active.map(x=>key(x.word)),...Object.values(s.dailyDictionary||{}).map(x=>key(x.lemma||x.word))]);
 const packed=(s.dailyPacks?.[date]?.words||[]).filter(x=>x&&(x.lemma||x.word)&&x.translation_ru);
 const newWords=[],added=new Set();
 const add=(word,translation,metadata={})=>{const k=key(word);if(!k||!translation||added.has(k)||newWords.length>=PER_DAY)return;added.add(k);newWords.push({word:String(word),translation:String(translation),key:k,newToday:true,pos:metadata.pos||'',gender:metadata.gender||''})};
 if(packed.length){
  // Today's generated daily pack is the canonical five; never silently add another five.
  for(const x of packed.slice(0,PER_DAY))add(x.lemma||x.word,x.translation_ru,{pos:x.pos,gender:x.gender});
 }else {
  for(const x of candidates(level,moduleId))if(!existing.has(x.key))add(x.word,x.translation,x);
 }
 // An exhausted curriculum does not imply that five new words were genuinely found.
 // Keep failed/due words in the active rotation before recent words.
 const previous=p.active.length?p.active:fromDictionary(s,level).slice(0,MAX);
 const newKeys=new Set(newWords.map(x=>x.key));
 const due=fromDictionary(s,level).filter(w=>{
  const k=key(w.word),stored=s.dailyDictionary?.[k],queued=s.wordPracticeQueue?.[k];
  return !newKeys.has(k)&&((Number(stored?.nextDue)||Infinity)<=Date.now()||queued);
 });
 const weak=previous.filter(w=>s.wordPracticeQueue?.[key(w.word)]||
  (Number(s.dailyDictionary?.[key(w.word)]?.wrong)||0)>0);
 const candidatesOld=[...weak,...due,...previous.slice().reverse(),...fromDictionary(s,level)];
 const used=new Set(),retained=[];
 for(const w of candidatesOld){
  const k=key(w.word);
  if(!k||newKeys.has(k)||used.has(k))continue;
  used.add(k);retained.push(w);
  if(retained.length>=MAX-newWords.length)break;
 }
 const current=retained.reverse();
 const active=[...current,...newWords].slice(-MAX);
 const record={date,level,moduleId,newWords,active,cardsSeen:0,revealed:false,stage:'cards',
  cardQueue:active.map((_,i)=>i),cardDraft:'',cardFeedback:null,cardAttempted:{},deferredWords:[],
  clozeIndex:0,clozeMisses:0,writingOK:false,speakingOK:false,ready:false,feedback:'',speechText:'',
  writingDraft:'',checkedCloze:[],completedAt:null};
 p.days[date]=record;p.active=active.map(x=>({word:x.word,translation:x.translation,key:key(x.word),pos:x.pos||'',gender:x.gender||''}));
 const now=Date.now();s.dailyDictionary=s.dailyDictionary||{};s.srs=s.srs||{};
 for(const w of newWords){
  const k=key(w.word),prior=s.dailyDictionary[k]||{};
  s.dailyDictionary[k]={...prior,lemma:w.word,translation_ru:w.translation,level,pos:w.pos||prior.pos||'',gender:w.gender||prior.gender||'',firstDate:prior.firstDate||date,
   lastSeen:date,exposures:(Number(prior.exposures)||0)+1,strength:prior.strength??20,nextDue:prior.nextDue||now+86400000};
  if(!s.srs[k])s.srs[k]={word:w.word,translation:w.translation,level,stage:0,due:now+86400000,seen:0,correct:0};
 }
 // Limit past daily-activity snapshots, not the learned dictionary itself.
 const keys=Object.keys(p.days).sort();while(keys.length>120)delete p.days[keys.shift()];
 save();return record;
}
function wordsForToday(){
 const info=window.NELivingDay?.details?.();if(!info)return null;
 const d=choose(info.level,info.moduleId,info.date);
 return d;
}
function ensure(){
 return wordsForToday();
}
function isReady(){
 return ensure()?.ready===true;
}
function clozeSet(level,date){
 const all=window.NEFunctionalPractice?.getCatalog?.().cloze?.filter(x=>x.level===level)||[];
 if(!all.length)return [];
 const n=Number(String(date).replaceAll('-',''))||0,shift=n%all.length;
 return [0,1,2].map((_,i)=>all[(shift+i)%all.length]);
}
// Answers are checked against the supplied Russian translation and listed synonyms.
// Arbitrary semantic synonyms need human review; never invent acceptance for them.
function ruNorm(value){
 return String(value||'').normalize('NFKC').toLocaleLowerCase('ru-RU').replace(/ё/g,'е')
  .replace(/[«»“”"'.!?]/g,' ').replace(/\s+/g,' ').trim();
}
function acceptedTranslation(answer,translation){
 const value=ruNorm(answer);
 if(!value)return false;
 const expected=String(translation||'');
 const variants=expected.split(/\s*(?:\/|;|\||,|\s+или\s+)\s*/i)
  .map(s=>s.replace(/\s*\([^)]*\)\s*/g,' ').trim())
  .filter(Boolean);
 return variants.some(x=>ruNorm(x)===value);
}
function cardQueue(d){
 if(!Array.isArray(d.cardQueue))d.cardQueue=d.active.map((_,i)=>i);
 if(!Number.isInteger(d.cardsSeen)||d.cardsSeen<0)d.cardsSeen=0;
 if(!d.cardAttempted||typeof d.cardAttempted!=='object')d.cardAttempted={};
 if(!Array.isArray(d.deferredWords))d.deferredWords=[];
 return d.cardQueue;
}
function currentCard(d){
 const queue=cardQueue(d),idx=queue[d.cardsSeen];
 return Number.isInteger(idx)?{idx,word:d.active[idx]}:null;
}
function markWrong(d,card){
 const s=getState(),k=key(card.word.word),entry=s?.dailyDictionary?.[k],now=Date.now();
 if(entry){entry.wrong=(Number(entry.wrong)||0)+1;entry.nextDue=now}
 if(s){
  s.wordPracticeQueue=s.wordPracticeQueue||{};
  s.wordPracticeQueue[k]=now;
  if(s.srs?.[k])s.srs[k].due=now;
 }
 d.cardAttempted[card.idx]=(Number(d.cardAttempted[card.idx])||0)+1;
}
function advanceCard(retry){
 const d=ensure(),card=d&&currentCard(d);
 if(!d||d.stage!=='cards'||!card||!d.cardFeedback)return false;
 if(retry&&!d.cardFeedback.correct)cardQueue(d).push(card.idx);
 d.cardsSeen++;d.cardFeedback=null;d.cardDraft='';d.revealed=false;d.feedback='';
 save();render();return true;
}
function feedbackNote(record){
 return record.feedback?'<div class="notice" role="status">'+esc(record.feedback)+'</div>':'';
}
function wrapper(content,record){
 const count=record.active.length,newCount=record.newWords.length;
 window.shell('<section class="card" style="max-width:760px;margin:auto">'+
  '<div class="eyebrow">Norsk Eventyr · начало занятия</div><h1>Сначала вспомним слова</h1>'+
  '<p>Активных слов: <b>'+count+' / '+MAX+'</b> · Новых сегодня: <b>'+newCount+' / '+PER_DAY+'</b>. Остальные выученные слова не удаляются и остаются для повторения.</p>'+
  content+feedbackNote(record)+
  '<button class="btn ghost" onclick="navigate(\'home\')">← На главную · сохранить прогресс</button></section>','home');
}
function render(){
 const d=ensure();if(!d)return;
 if(d.ready)return window.NELivingDay?.open?.();
 if(d.stage==='cards'){
  const queue=cardQueue(d),card=currentCard(d);
  if(!card){d.stage='cloze';d.feedback='';save();return render()}
  const word=card.word,feedback=d.cardFeedback,review=d.cardsSeen>=d.active.length;
  const grammar=window.NECardGrammar?.describe?.(word)||{headword:word.word,typeRu:'Слово',forms:[],help:'Формы не определены.',verified:false};
  const rows=(grammar.forms||[]).map(row=>'<tr><td>'+esc(row.label)+'</td><td lang="nb"><b>'+esc(row.form)+'</b></td></tr>').join('');
  const dictLink='<a href="'+esc(grammar.url||'https://ordbokene.no/')+'" target="_blank" rel="noopener noreferrer">Проверить в Bokmålsordboka ↗</a>';
  // Grammar is initially collapsed to encourage recall; answer feedback opens it.
  const morphology='<details class="card" style="margin-top:12px;padding:14px"'+(feedback?' open':'')+'>'+
   '<summary style="cursor:pointer;font-weight:600">'+esc(grammar.typeRu)+' · Начальная форма и склонение / времена</summary>'+
   (rows?'<table class="forms-table" style="margin-top:10px;width:100%"><tbody>'+rows+'</tbody></table>':
    '<p class="muted">Подтверждённых форм пока нет. Не будем придумывать окончания.</p>')+
   (grammar.example?'<p><b>В речи:</b> <span lang="nb">'+esc(grammar.example.no)+'</span></p><p class="muted">'+esc(grammar.example.ru)+'</p>':'')+
   '<p class="muted">'+esc(grammar.help||'')+'</p>'+dictLink+'</details>';
  const result=feedback?'<div class="notice" role="status"><b>'+
   (feedback.correct?'Верно!':'Нужно повторить.')+'</b> Правильный перевод: '+esc(word.translation)+
   (feedback.correct?'':' · Слово сохранено в повторении.')+'</div>':'';
  const fields=feedback
   ?'<button class="btn" onclick="NELivingWords.nextCard()">'+
    (review?'Продолжить повтор →':'Следующая карточка →')+'</button>'+
    (!feedback.correct?'<button class="btn secondary" onclick="NELivingWords.deferCard()">Отложить это слово до следующего занятия</button>':'')
   :'<label class="field-label" for="livingTranslate">Переведи слово на русский</label>'+
    '<input id="livingTranslate" class="input" lang="ru" autocomplete="off" maxlength="200" value="'+esc(d.cardDraft||'')+
    '" placeholder="Напиши перевод здесь" oninput="NELivingWords.draftTranslation(this.value)" onkeydown="if(event.key===\'Enter\'){event.preventDefault();NELivingWords.checkTranslation()}">'+
    '<div class="row"><button class="btn" onclick="NELivingWords.checkTranslation()">Проверить перевод</button>'+
    '<button class="btn secondary" onclick="NELivingWords.recordTranslation()">🎤 Ответить голосом</button>'+
    '<button class="btn ghost" onclick="NELivingWords.reveal()">Не знаю · показать</button></div>'+
    '<p class="muted">После голосового ответа проверь распознанный текст в поле. При ошибке слово повторится позже.</p>';
  return wrapper('<p class="muted">'+(review?'Повторяем трудные слова · ':'Карточки · ')+
   (d.cardsSeen+1)+' из '+queue.length+'</p>'+
   '<div class="card" style="padding:24px"><div class="muted">'+esc(grammar.typeRu)+'</div>'+
   '<h2 lang="nb" style="text-align:center">'+esc(grammar.headword)+'</h2>'+
   '<button class="btn secondary" onclick="NELivingWords.listenCard()">▶ Послушать слово</button>'+
   result+fields+morphology+'</div>',d);
 }
 if(d.stage==='cloze'){
  const tasks=clozeSet(d.level,d.date),task=tasks[d.clozeIndex];
  if(!task){d.stage='writing';d.feedback='';save();return render()}
  return wrapper('<p class="muted">Практическая грамматика · вопрос '+(d.clozeIndex+1)+' из '+tasks.length+'. Введи пропущенное слово самостоятельно.</p>'+
   '<h2 lang="nb">'+esc(task.sentence)+'</h2>'+
   '<label class="field-label" for="livingCloze">Пропущенное слово</label><input class="input" id="livingCloze" autocomplete="off" lang="nb" maxlength="90" placeholder="Напиши по-норвежски">'+
   '<button class="btn" onclick="NELivingWords.checkCloze()">Проверить</button>',d);
 }
 if(d.stage==='writing'){
  return wrapper('<h2>Составь собственное предложение</h2><p>Используй одно или несколько активных слов в новой жизненной ситуации. Не копируй готовый образец.</p>'+
   '<p><b>Тема:</b> '+esc(window.NELivingDay?.details?.().title||'Повседневная жизнь')+'</p>'+
   '<label class="field-label" for="livingWrite">Твоё предложение на норвежском</label>'+
   '<textarea class="input" id="livingWrite" rows="3" maxlength="900" lang="nb" oninput="NELivingWords.draft(this.value)">'+esc(d.writingDraft||'')+'</textarea>'+
   '<button class="btn" onclick="NELivingWords.checkWriting()">Проверить предложение</button>',d);
 }
 if(d.stage==='speaking'){
  return wrapper('<h2>Теперь составь предложение вслух</h2>'+
   '<p>Скажи <b>другое</b> предложение по той же теме. Нора проверит распознанную речь. Напечатанный ответ не считается устным.</p>'+
   '<p><b>Тема:</b> '+esc(window.NELivingDay?.details?.().title||'Повседневная жизнь')+'</p>'+
   '<button class="btn secondary" onclick="NELivingWords.recordSpeech()">🎤 Сказать предложение</button>'+
   (d.speechText?'<p lang="nb"><b>Распознано:</b> '+esc(d.speechText)+'</p>':'<p class="muted">Текст появится после распознавания.</p>')+
   '<button class="btn" '+(d.speechText?'':'disabled')+' onclick="NELivingWords.checkSpeaking()">Проверить устную речь</button>',d);
 }
}
function draftTranslation(value){
 const d=ensure();if(!d||d.stage!=='cards'||d.cardFeedback)return;
 d.cardDraft=String(value||'').slice(0,200);save();
}
function checkTranslation(){
 const d=ensure(),card=d&&currentCard(d);
 if(!d||d.stage!=='cards'||!card||d.cardFeedback)return false;
 const answer=String(document.getElementById('livingTranslate')?.value||d.cardDraft||'').trim();
 if(!answer){d.feedback='Напиши перевод или используй микрофон.';save();render();return false}
 d.cardDraft=answer;
 const correct=acceptedTranslation(answer,card.word.translation);
 if(!correct)markWrong(d,card);
 else{
  const s=getState(),entry=s?.dailyDictionary?.[key(card.word.word)];
  if(entry)entry.correct=(Number(entry.correct)||0)+1;
 }
 d.cardFeedback={correct,answer};
 d.feedback='';save();render();return correct;
}
function reveal(){
 const d=ensure(),card=d&&currentCard(d);
 if(!d||d.stage!=='cards'||!card||d.cardFeedback)return false;
 markWrong(d,card);d.cardFeedback={correct:false,answer:'',revealed:true};
 save();render();return true;
}
function nextCard(){return advanceCard(true)}
function deferCard(){
 const d=ensure(),card=d&&currentCard(d);
 if(!d||d.stage!=='cards'||!card||d.cardFeedback?.correct!==false)return false;
 // Wrong words stay due in SRS but do not trap the learner in an infinite loop.
 d.deferredWords.push(key(card.word.word));return advanceCard(false);
}
function listenCard(){const d=ensure(),card=d&&currentCard(d);if(card)window.speakText?.(card.word.word,.9)}
let translationRecognition=null;
function recordTranslation(){
 const d=ensure(),card=d&&currentCard(d);
 if(!d||d.stage!=='cards'||!card||d.cardFeedback)return false;
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!SR){d.feedback='Голосовой ввод недоступен в этом браузере. Перевод можно написать в поле.';save();render();return false}
 if(translationRecognition)return false;
 try{
  const rec=new SR(),session=d,cardIndex=d.cardsSeen;
  rec.lang='ru-RU';rec.interimResults=false;rec.continuous=false;
  translationRecognition=rec;d.feedback='Слушаю перевод по-русски…';save();render();
  rec.onresult=e=>{
   if(ensure()!==session||session.stage!=='cards'||session.cardsSeen!==cardIndex||session.cardFeedback)return;
   const words=Array.from(e.results||[]).filter(x=>x.isFinal).map(x=>x?.[0]?.transcript||'').join(' ').trim();
   if(words){
    session.cardDraft=words.slice(0,200);
    session.feedback='Проверь распознанный перевод и нажми «Проверить перевод».';
    save();
   }
  };
  rec.onerror=()=>{if(ensure()===session&&session.stage==='cards'&&session.cardsSeen===cardIndex){
   session.feedback='Не удалось распознать голос. Попробуй ещё раз или введи перевод вручную.';save()}};
  rec.onend=()=>{translationRecognition=null;
   if(ensure()===session&&session.stage==='cards'&&session.cardsSeen===cardIndex)render()};
  rec.start();return true;
 }catch{translationRecognition=null;d.feedback='Микрофон не запустился. Проверь разрешения браузера.';save();render();return false}
}
function checkCloze(){
 const d=ensure();if(!d||d.stage!=='cloze')return false;
 const task=clozeSet(d.level,d.date)[d.clozeIndex],value=norm(document.getElementById('livingCloze')?.value||'');
 if(!task||!value)return false;
 if(value!==norm(task.answer)){
  d.clozeMisses++;d.feedback='Пока неверно. '+task.rule+' Попробуй заполнить пропуск ещё раз.';
  save();render();return false;
 }
 d.checkedCloze.push(task.id);d.clozeIndex++;d.feedback='';d.clozeMisses=0;save();render();return true;
}
let busy=false;
async function assess(mode,answer){
 const d=ensure();if(!d||busy)return false;
 if(mode==='writing'&&d.stage!=='writing'||mode==='speaking'&&d.stage!=='speaking')return false;
 const raw=String(answer||'').trim();
 if(mode==='speaking'&&norm(raw)===norm(d.writingDraft)){
  d.feedback='Скажи новое предложение — устная практика не должна повторять написанное дословно.';
  save();render();return false;
 }
 if(raw.length<9||!/[a-zæøå]/i.test(raw)){d.feedback='Составь самостоятельное предложение на норвежском.';save();render();return false}
 const level=d.level,topic=window.NELivingDay?.details?.().title||'Учебная ситуация';
 busy=true;
 try{
  const r=typeof window.aiEvaluate==='function'?await window.aiEvaluate({
   answer:raw,question:'Составь своё предложение на норвежском по теме: '+topic,
   goal:'Свободное предложение по теме '+topic+' на уровне '+level+'. Не копировать образцы.',level,
   mode:mode==='speaking'?'speaking':'writing'}):{ok:false,error:'EVALUATOR_UNAVAILABLE'};
  if(ensure()!==d||d.stage!==mode)return false;
  if(!r.ok){
   d.feedback='Сервер проверки недоступен. Ответ сохранён, попробуй снова.';
   save();render();return false;
  }
  const data=r.data||{},score=Number(data.score)||0;
  if(data.accepted!==true||score<65){
   d.feedback='Исправь предложение: '+String(data.explanation_ru||data.improvements_ru?.[0]||'смысл и грамматика требуют доработки.').slice(0,450);
   save();render();return false;
  }
  const s=getState();
  if(mode==='writing'){d.writingDraft=raw;d.writingOK=true;d.stage='speaking'}
  else {d.speakingOK=true;d.stage='ready';d.ready=true;d.completedAt=new Date().toISOString()}
  d.feedback='';save();
  if(d.ready)return window.NELivingDay?.begin?.();
  render();return true;
 }finally{busy=false}
}
function draft(value){const d=ensure();if(d&&d.stage==='writing'){d.writingDraft=String(value||'').slice(0,900);save()}}
function checkWriting(){const d=ensure();return assess('writing',document.getElementById('livingWrite')?.value||d?.writingDraft||'')}
let recognizing=false;
function recordSpeech(){
 const d=ensure();if(!d||d.stage!=='speaking'||recognizing)return false;
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!SR){d.feedback='Распознавание норвежской речи недоступно. Для устного задания нужен браузер с поддержкой микрофона.';save();render();return false}
 try{
  const rec=new SR();rec.lang='nb-NO';rec.interimResults=false;rec.continuous=false;
  recognizing=true;d.speechText='';d.feedback='Слушаю…';
  rec.onresult=e=>{
   const results=Array.from(e.results||[]);
   const text=results.filter(x=>x.isFinal).map(x=>x?.[0]?.transcript||'').join(' ').trim();
   if(text&&ensure()===d&&d.stage==='speaking'){d.speechText=text.slice(0,900);d.feedback=''}
  };
  rec.onerror=()=>{if(ensure()===d){d.speechText='';d.feedback='Не удалось распознать речь. Попробуй ещё раз.'}};
  rec.onend=()=>{recognizing=false;save();if(ensure()===d)render()};
  rec.start();save();render();return true;
 }catch{recognizing=false;d.feedback='Микрофон не запустился. Проверь разрешение браузера.';save();render();return false}
}
function checkSpeaking(){const d=ensure();return d?.speechText?assess('speaking',d.speechText):false}
window.NELivingWords=Object.freeze({ensure,isReady,render,reveal,nextCard,deferCard,draftTranslation,checkTranslation,recordTranslation,listenCard,checkCloze,draft,checkWriting,recordSpeech,checkSpeaking,clozeSet,acceptedTranslation});
})();
