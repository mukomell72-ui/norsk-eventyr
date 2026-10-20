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
// Fix only the confirmed semantic confusion: ei klokke is a clock/watch,
// whereas "klokka åtte" means "at eight o'clock".
function correctTranslation(word,translation){
 const lemma=key(word).replace(/^(?:en|ei|et)\s+/,'');
 const ru=String(translation||'').trim();
 return ['klokke','klokka','klokken','klokker','klokkene'].includes(lemma)&&
  /^в\s+.{0,30}час(?:а|ов)?(?:\s|$)/iu.test(ru)
  ?'часы':ru;
}
function repairTranslations(s,p){
 let changed=false;
 const fix=(entry,wordField,translationField)=>{
  if(!entry||typeof entry!=='object')return;
  const corrected=correctTranslation(entry[wordField],entry[translationField]);
  if(corrected!==entry[translationField]){entry[translationField]=corrected;changed=true}
 };
 for(const w of p.active)fix(w,'word','translation');
 for(const record of Object.values(p.days)){
  if(!record||typeof record!=='object')continue;
  for(const w of record.active||[])fix(w,'word','translation');
  for(const w of record.newWords||[])fix(w,'word','translation');
 }
 for(const entry of Object.values(s.dailyDictionary||{})){
  if(entry){const corrected=correctTranslation(entry.lemma||entry.word,entry.translation_ru);if(corrected!==entry.translation_ru){entry.translation_ru=corrected;changed=true}}
 }
 for(const entry of Object.values(s.srs||{}))fix(entry,'word','translation');
 for(const pack of Object.values(s.dailyPacks||{})){
  for(const w of pack?.words||[]){const corrected=correctTranslation(w.lemma||w.word,w.translation_ru);if(corrected!==w.translation_ru){w.translation_ru=corrected;changed=true}}
 }
 if(changed)save();
}
function isWord(w){return !!(w&&typeof w.word==='string'&&w.word.trim()&&typeof w.translation==='string'&&w.translation.trim())}
function snapshot(){
 const s=getState();if(!s)return null;
 s.learningV8=s.learningV8&&typeof s.learningV8==='object'?s.learningV8:{};
 let p=s.learningV8.livingVocabulary;
 if(!p||typeof p!=='object'||Array.isArray(p))s.learningV8.livingVocabulary=p={active:[],days:{}};
 p.days=p.days&&typeof p.days==='object'&&!Array.isArray(p.days)?p.days:{};
 p.active=Array.isArray(p.active)?p.active.filter(isWord).slice(-MAX):[];
 repairTranslations(s,p);
 return p;
}
function candidates(level,moduleId){
 const out=[],seen=new Set(),add=(name,ru,metadata={})=>{const k=key(name);if(!k||!ru||seen.has(k))return;seen.add(k);out.push({word:String(name).trim(),translation:correctTranslation(name,ru),key:k,...metadata})};
 const catalog=window.NECurated;
 const ids=[moduleId,...(window.NECurriculum?.modules(level)||[]).map(x=>x.id)];
 for(const id of [...new Set(ids.filter(Boolean))]){
  const item=catalog?.get?.(id);for(const pair of item?.vocab||[])if(Array.isArray(pair))add(pair[0],pair[1]);
 }
 return out;
}
function fromDictionary(s,level){
 const entries=Object.values(s.dailyDictionary||{}).filter(x=>x&&(x.level===level||!x.level)&&((x.lemma||x.word)&&x.translation_ru)).map(x=>({
  word:String(x.lemma||x.word),translation:correctTranslation(x.lemma||x.word,x.translation_ru),key:key(x.lemma||x.word),pos:x.pos||'',gender:x.gender||'',
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
 const add=(word,translation,metadata={})=>{const k=key(word);if(!k||!translation||added.has(k)||newWords.length>=PER_DAY)return;added.add(k);newWords.push({word:String(word),translation:correctTranslation(word,translation),key:k,newToday:true,pos:metadata.pos||'',gender:metadata.gender||''})};
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
  cardQueue:active.map((_,i)=>i),cardDraft:'',cardFeedback:null,formPractice:null,cardAttempted:{},deferredWords:[],miniRound:null,miniRounds:{},
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
 if(variants.some(x=>ruNorm(x)===value))return true;
 // Only a short, explicitly curated set of clearly equivalent Russian translations.
 // Do not infer new synonyms from spelling or let AI silently grade vocabulary recall.
 const synonyms={'машина':['автомобиль'],'автомобиль':['машина'],
  'друг':['приятель'],'приятель':['друг']};
 return variants.some(x=>(synonyms[ruNorm(x)]||[]).includes(value));
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
 if(retry&&(!d.cardFeedback.correct||d.formPractice?.hadMistake))cardQueue(d).push(card.idx);
 d.cardsSeen++;d.cardFeedback=null;d.formPractice=null;d.cardDraft='';d.revealed=false;d.feedback='';
 const engine=window.NEMiniPath;
 if(engine&&d.cardsSeen<=d.active.length&&engine.boundaries(d.active.length).includes(d.cardsSeen)){
  d.miniRounds=d.miniRounds&&typeof d.miniRounds==='object'?d.miniRounds:{};
  if(!d.miniRounds[String(d.cardsSeen)])d.miniRound=engine.build(d,d.cardsSeen);
 }
 save();render();return true;
}
function feedbackNote(record){
 return record.feedback?'<div class="notice" role="status">'+esc(record.feedback)+'</div>':'';
}
function wrapper(content,record){
 const count=record.active.length,newCount=record.newWords.length;
 const p=window.NEMiniPath?.progress?.(record);
 const road=p?'<div class="card" style="margin:12px 0;padding:14px">'+
  '<div class="row" style="justify-content:space-between;align-items:center"><b>Твой путь: короткие этапы</b><small>'+p.seen+' / '+p.total+' слов</small></div>'+
  '<div class="progress" role="progressbar" aria-label="Прогресс активных слов" aria-valuemin="0" aria-valuemax="'+Math.max(1,p.total)+'" aria-valuenow="'+p.seen+'"><i style="width:'+p.percent+'%"></i></div>'+
  '<div class="row" style="gap:6px;flex-wrap:wrap">'+p.stages.map(x=>
    '<span class="tag" style="opacity:'+(x.done?'1':'.8')+'">'+(x.done?'✓ ':'')+'Этап '+x.number+': '+x.start+'–'+x.end+'</span>').join('')+'</div>'+
  '</div>':'';
 window.shell('<section class="card" style="max-width:760px;margin:auto">'+
  '<div class="eyebrow">Norsk Eventyr · начало занятия</div><h1>Сначала вспомним слова</h1>'+
  '<p>Активных слов: <b>'+count+' / '+MAX+'</b> · Новых сегодня: <b>'+newCount+' / '+PER_DAY+'</b>. Остальные выученные слова не удаляются и остаются для повторения.</p>'+
  road+content+feedbackNote(record)+
  '<button class="btn ghost" onclick="navigate(\'home\')">← На главную · сохранить прогресс</button></section>','home');
}

function progress(){
 const state=getState(),date=window.NELivingDay?.details?.(false)?.date;
 const record=date&&state?.learningV8?.livingVocabulary?.days?.[date];
 return record&&window.NEMiniPath?.progress?.(record)||null;
}
function renderMiniRound(d){
 const checkpoint=d.miniRound,engine=window.NEMiniPath;
 if(!checkpoint||!engine)return false;
 const boundaries=engine.boundaries(d.active.length),roundIndex=boundaries.indexOf(checkpoint.boundary)+1;
 const heading='Мини-этап '+roundIndex+' из '+boundaries.length;
 if(checkpoint.phase==='quiz'){
  const q=checkpoint.questions?.[checkpoint.index];
  if(!q){checkpoint.phase='break';save();return renderMiniRound(d)}
  const item=d.active[q.wordIndex];
  if(!item){checkpoint.phase='break';save();return renderMiniRound(d)}
  const prompt=q.audio&&!q.revealed
   ?'<h2>Послушай слово и выбери перевод</h2><button class="btn secondary" onclick="NELivingWords.listenMini()">▶ Прослушать слово</button>'+
    '<button class="btn ghost" onclick="NELivingWords.revealMiniWord()">Показать слово, если нет звука</button>'
   :'<h2 lang="nb">'+esc(item.word)+'</h2>'+
    (q.audio?'<button class="btn secondary" onclick="NELivingWords.listenMini()">▶ Ещё раз прослушать</button>':'');
  const choices=q.options.map((label,i)=>
   '<button class="btn secondary" style="text-align:left;width:100%;margin-top:8px" onclick="NELivingWords.answerMini('+i+')">'+
    (i+1)+'. '+esc(label)+'</button>').join('');
  return wrapper(
   '<div class="eyebrow">'+esc(heading)+' · Быстрая проверка</div>'+
   '<div class="progress" role="progressbar" aria-valuenow="'+checkpoint.index+'" aria-valuemin="0" aria-valuemax="'+checkpoint.questions.length+'"><i style="width:'+Math.round(checkpoint.index/checkpoint.questions.length*100)+'%"></i></div>'+
   '<p class="muted">Вопрос '+(checkpoint.index+1)+' из '+checkpoint.questions.length+'. Выбери перевод. Ошибку можно исправить без штрафов.</p>'+
   '<div class="card" style="padding:20px">'+prompt+choices+
    (checkpoint.note?'<p class="notice" role="status">'+esc(checkpoint.note)+'</p>':'')+
   '</div>',d);
 }
 const done=window.NEMiniPath?.progress?.(d);
 const next=checkpoint.boundary<d.active.length
  ?'Перейти к следующим словам →'
  :d.cardsSeen<cardQueue(d).length?'Повторить трудные слова →':'Продолжить занятие с Норой →';
 return wrapper(
  '<div class="eyebrow">'+esc(heading)+' · Завершён</div>'+
  '<div class="card" style="padding:24px">'+
  '<h2>Хороший этап: '+Math.min(5,checkpoint.boundary-(roundIndex-1)*5)+' слов!</h2>'+
  '<p>Ты перевёл слова, использовал их в норвежских предложениях и прошёл короткую проверку.</p>'+
  '<p class="muted">Быстрая проверка: '+checkpoint.questions.length+' заданий; ошибок: '+checkpoint.mistakes+'. Затруднения сохранены для повторения.</p>'+
  '<div class="progress" role="progressbar" aria-label="Прогресс словарной практики" aria-valuemin="0" aria-valuemax="'+d.active.length+'" aria-valuenow="'+done.seen+'"><i style="width:'+done.percent+'%"></i></div>'+
  '<p><b>'+done.seen+' из '+done.total+' активных слов</b> · мини-этапов завершено '+Math.min(done.rounds,Math.max(done.completed,roundIndex))+' из '+done.rounds+'</p>'+
  '<button class="btn" onclick="NELivingWords.continueMini()">'+esc(next)+'</button>'+
  '<button class="btn ghost" onclick="navigate(\'home\')">Остановиться сейчас · прогресс сохранится</button>'+
  '</div>',d);
}
function answerMini(choice){
 const d=ensure(),mini=d?.miniRound,engine=window.NEMiniPath;
 if(!d||d.stage!=='cards'||!mini||mini.phase!=='quiz'||!engine)return false;
 const r=engine.evaluate(mini,choice);
 if(!r.valid)return false;
 if(!r.correct&&r.firstMiss){
  const word=d.active[r.wordIndex];
  if(word){
   markWrong(d,{idx:r.wordIndex,word});
   const future=cardQueue(d).slice(d.cardsSeen);
   if(!future.includes(r.wordIndex))cardQueue(d).push(r.wordIndex);
  }
 }
 if(r.done){
  d.miniRounds=d.miniRounds&&typeof d.miniRounds==='object'?d.miniRounds:{};
  d.miniRounds[String(mini.boundary)]={done:true,mistakes:mini.mistakes,
   completedAt:new Date().toISOString()};
 }
 save();render();return r.correct;
}
function listenMini(){
 const d=ensure(),mini=d?.miniRound,q=mini?.questions?.[mini.index];
 const word=q&&d.active[q.wordIndex];
 if(!word||mini.phase!=='quiz')return false;
 const text=window.NECardGrammar?.describe?.(word)?.headword||word.word;
 window.speakText?.(text,.9);return true;
}
function revealMiniWord(){
 const d=ensure(),q=d?.miniRound?.questions?.[d.miniRound.index];
 if(!q||d.miniRound.phase!=='quiz')return false;
 q.revealed=true;save();render();return true;
}
function continueMini(){
 const d=ensure(),mini=d?.miniRound;
 if(!d||!mini||mini.phase!=='break')return false;
 if(!d.miniRounds?.[String(mini.boundary)]){
  d.miniRounds=d.miniRounds||{};
  d.miniRounds[String(mini.boundary)]={done:true,mistakes:mini.mistakes,completedAt:new Date().toISOString()};
 }
 d.miniRound=null;save();render();return true;
}

// Render each Russian word as an accessible inline target, with feedback
// adjacent to the tapped word rather than in a separate hint panel.
function russianTokens(sentence){return String(sentence||'').match(/[А-Яа-яЁё]+/gu)||[]}
function tappedPrompt(task,practice){
 const sentence=String(task?.russianSentence||''),parts=sentence.match(/[А-Яа-яЁё]+|[^А-Яа-яЁё]+/gu)||[];
 let index=0;
 return parts.map(part=>{
  if(!/^[А-Яа-яЁё]+$/u.test(part))return esc(part);
  const slot=index++,selected=practice?.wordTap?.index===slot,detail=selected?practice.wordTap:null;
  let pop='';
  if(detail){
   if(detail.status==='loading')pop='<span role="status" style="display:inline-block;margin:3px 5px;padding:6px;border:1px solid #6595ad;border-radius:9px;font-size:.85em">Ищу перевод…</span>';
   else if(detail.status==='error')pop='<span role="status" style="display:inline-block;margin:3px 5px;padding:6px;border:1px solid #a98577;border-radius:9px;font-size:.85em">Для этого слова нет подтверждённого перевода в предложении. Ничего не сохранено.</span>';
   else if(detail.status==='unavailable')pop='<span role="status" style="display:inline-block;margin:3px 5px;padding:6px;border:1px solid #a98577;border-radius:9px;font-size:.85em">Онлайн-перевод временно недоступен. Повтори нажатие позже. Ничего не сохранено.</span>';
   else if(detail.status==='ready'){
    const word=detail.entry;
    pop='<span role="status" style="display:inline-block;margin:3px 5px;padding:7px;border:1px solid #66c8bc;border-radius:9px;background:rgba(13,90,92,.22);font-size:.85em">'+
     '<b lang="nb">'+esc(word.form_no)+'</b> — '+esc(word.source_ru||part.toLocaleLowerCase('ru-RU'))+
     (word.lemma_no!==word.form_no?' · <b lang="nb">'+esc(word.lemma_no)+'</b> — '+esc(word.translation_ru):
      ' · '+esc(word.translation_ru))+
     (word.grammar_ru?' · '+esc(word.grammar_ru):'')+
     ' · <b>В словаре</b> <button type="button" class="btn ghost" onclick="NELivingWords.listenTappedWord()" aria-label="Послушать '+esc(word.form_no)+'" style="padding:4px 8px">▶</button></span>';
   }
  }
  return '<button type="button" lang="ru" aria-label="Перевести слово '+esc(part)+'" aria-pressed="'+(selected?'true':'false')+'" onclick="NELivingWords.tapUnknownWord('+slot+')" style="display:inline;color:inherit;background:transparent;border:0;border-bottom:2px dotted #80c5dc;padding:0 1px;font:inherit;font-weight:inherit;cursor:pointer">'+esc(part)+'</button>'+pop;
 }).join('');
}
function resetTappedPrompt(practice){practice.wordTap=null;practice.wordTapHints={};practice.noraExplanation=null}
function rememberTappedWord(record,entry){
 const source=getState(),lemma=String(entry?.lemma_no||'').trim(),
  form=String(entry?.form_no||'').trim(),ru=String(entry?.translation_ru||'').trim();
 if(!source||!lemma||!form||!ru||lemma.length>75||form.length>75||ru.length>120||
   /[А-Яа-яЁё]/u.test(lemma+form)||!/[А-Яа-яЁё]/u.test(ru))return false;
 const k=key(lemma),now=Date.now();
 if(!k)return false;
 source.dailyDictionary=source.dailyDictionary||{};
 source.srs=source.srs||{};
 source.wordPracticeQueue=source.wordPracticeQueue||{};
 const old=source.dailyDictionary[k]||{},prior=source.srs[k]||{};
 source.dailyDictionary[k]={...old,lemma:old.lemma||lemma,
  translation_ru:old.translation_ru||ru,level:old.level||record.level,
  firstDate:old.firstDate||record.date,lastSeen:record.date,
  exposures:(Number(old.exposures)||0)+1,strength:old.strength??20,nextDue:now,
  source:old.source||'tapped_word'};
 source.srs[k]={stage:0,seen:0,correct:0,...prior,word:prior.word||lemma,
  translation:prior.translation||ru,level:prior.level||record.level,due:now};
 source.wordPracticeQueue[k]=now;
 return true;
}


function noraExplainPanel(p){
 const e=p?.noraExplanation;
 if(!e?.open)return '';
 const heading='<div style="font-weight:750;margin-bottom:8px">Нора объясняет</div>';
 if(e.status==='loading')return '<section class="notice" role="status" aria-live="polite" style="margin-top:12px">'+heading+
  '<p>Разбираю правило и подбираю пример для твоего уровня…</p></section>';
 const steps=Array.isArray(e.steps_ru)?e.steps_ru.slice(0,3).map(t=>'<li>'+esc(t)+'</li>').join(''):'';
 const example=e.example_no?'<p><b>Другой пример:</b> <span lang="nb">'+esc(e.example_no)+'</span>'+
  (e.example_ru?' — '+esc(e.example_ru):'')+'</p>':'';
 return '<section class="notice" role="region" aria-label="Объяснение Норы" style="margin-top:12px">'+heading+
  (e.offline?'<p class="muted">Сейчас доступна краткая подсказка без ИИ. Индивидуальный разбор появится после восстановления связи.</p>':'')+
  (e.explanation_ru?'<p>'+esc(e.explanation_ru)+'</p>':'')+
  (e.rule_ru?'<p><b>Правило:</b> '+esc(e.rule_ru)+'</p>':'')+
  (steps?'<ol style="padding-left:22px">'+steps+'</ol>':'')+example+
  (e.next_step_ru?'<p><b>Твоя очередь:</b> '+esc(e.next_step_ru)+'</p>':'')+
  '<p class="muted">Объяснение не засчитывает задание. Ответ нужно написать самостоятельно.</p></section>';
}
function offlineNoraExplanation(task){
 const isPerfect=/perfekt|перфект/iu.test(String(task?.label||''));
 return {
  status:'ready',open:true,offline:true,
  explanation_ru:(task?.lemma==='kunne'?'Сравни формы: kan — могу (настоящее), kunne — мог/мог бы, har kunnet — имел возможность. После kan/kunne следующий глагол без å. ':'')+(isPerfect?'Перфект показывает уже совершившееся действие или прошлый опыт, связанный с настоящим. В русском языке отдельной формы перфекта нет.':'Определи смысл русского предложения, затем выбери нужную грамматическую форму норвежского слова.'),
  rule_ru:isPerfect?'Перфект в Bokmål: har + причастие прошедшего времени (perfektum partisipp).':'Сначала найди подлежащее и сказуемое, затем проверь время и порядок слов.',
  steps_ru:isPerfect?['Определи, кто выполняет действие.','После подлежащего поставь har.','Выбери причастие нужного глагола и дополни смысл.']:['Найди основное действие в предложении.','Вспомни нужное время и форму.','Проверь порядок слов и смысл всего предложения.'],
  example_no:isPerfect?'Jeg har jobbet.':'Jeg lærer norsk.',
  example_ru:isPerfect?'Я поработал.':'Я учу норвежский.',
  next_step_ru:'Теперь самостоятельно выполни текущее задание — пример выше относится к другой ситуации.'
 };
}
async function explainForm(){
 const d=ensure(),p=d?.formPractice,card=d&&currentCard(d);
 if(!d||d.stage!=='cards'||!card||!p?.started||p.done||formBusy)return false;
 const attempted=Number(p.misses||0)>0;
 if(p.noraExplanation?.status==='loading')return false;
 if(p.noraExplanation?.status==='ready'&&p.noraExplanation.afterAttempt===attempted){
  p.noraExplanation.open=!p.noraExplanation.open;save();render();return true;
 }
 // Preserve text even if the learner clicked before the last input event.
 const input=document.getElementById('livingFormAnswer');
 if(input&&typeof input.value==='string')p.draft=input.value.slice(0,280);
 const task=p.task;
 p.noraExplanation={status:'loading',open:true,afterAttempt:attempted};
 save();render();
 let detail=null;
 try{
  const result=typeof window.aiEvaluate==='function'?await window.aiEvaluate({
   action:'explain_task',level:d.level,topic:window.NELivingDay?.details?.().title||'',
   task:{russianSentence:task.russianSentence||'',prompt:task.prompt||'',label:task.label||'',
    word:task.word||card.word.word,lemma:task.lemma||'',reference_no:task.modelAnswer||''},
   attempts:Math.min(10,Math.max(0,Number(p.misses)||0)),
   learner_answer:attempted?String(p.draft||'').slice(0,280):''
  }):{ok:false};
  if(result?.ok&&result.data?.kind==='explain_task'&&typeof result.data.explanation_ru==='string'&&result.data.explanation_ru.trim()){
   const info=result.data;
   detail={status:'ready',open:true,offline:false,afterAttempt:attempted,
    explanation_ru:String(info.explanation_ru).slice(0,700),
    rule_ru:String(info.rule_ru||'').slice(0,350),
    steps_ru:Array.isArray(info.steps_ru)?info.steps_ru.slice(0,3).map(x=>String(x).slice(0,180)):[],
    example_no:String(info.example_no||'').slice(0,180),example_ru:String(info.example_ru||'').slice(0,180),
    next_step_ru:String(info.next_step_ru||'').slice(0,250)};
  }
 }catch{}
 // A slow response must never attach an old task's help to a new exercise.
 if(ensure()!==d||d.stage!=='cards'||d.formPractice!==p||p.task!==task||p.done)return false;
 p.noraExplanation=detail||{...offlineNoraExplanation(task),afterAttempt:attempted};
 save();render();return !!detail;
}

function render(){
 const d=ensure();if(!d)return;
 if(d.ready)return window.NELivingDay?.open?.();
 if(d.stage==='cards'&&d.miniRound)return renderMiniRound(d);
 if(d.stage==='cards'){
  const queue=cardQueue(d),card=currentCard(d);
  if(!card){d.stage='cloze';d.feedback='';save();return render()}
  const word=card.word,feedback=d.cardFeedback,review=d.cardsSeen>=d.active.length;
  const kind=word.newToday?'<span class="tag">Новое слово</span>':'<span class="tag">Повторение</span>';
  // Existing saved exercises from the previous release asked for a single form.
  // Upgrade the CURRENT task in place, preserving the student's translation and retries.
  const oldPractice=d.formPractice;
  const refreshedTasks=oldPractice?.started?window.NECardFormPractice?.taskList?.(word)||[]:[];
  // Repair the misleading legacy clock wording even for an in-progress card.
  // Preserve the learner's draft, attempts and current exercise index.
  if(oldPractice?.started&&!oldPractice.done&&
     oldPractice.task?.russianSentence==='У меня есть наручные часы.'&&
     oldPractice.task?.modelAnswer==='Jeg har ei klokke.'){
    const corrected=refreshedTasks.find(t=>t.index===oldPractice.task.index&&
      t.russianSentence==='У меня есть часы.');
    if(corrected){
      oldPractice.task=corrected;
      resetTappedPrompt(oldPractice);
      oldPractice.note='Уточнён перевод: «У меня есть часы». Начатый ответ сохранён.';
      save();
    }
  }
  // Keep an already-started card, but replace an old unverified free-writing
  // prompt when a newly verified paradigm and specific translation now exist.
  const staleVerifiedTask=oldPractice?.task?.kind==='sentence'&&
   oldPractice.task.requiredForm==null&&refreshedTasks.some(t=>!!t.requiredForm);
  if(oldPractice?.started&&(oldPractice.task?.kind==='form'||staleVerifiedTask||
     (oldPractice.task?.kind==='sentence'&&!('russianSentence' in oldPractice.task)))){
   const tasks=refreshedTasks;
   const replacement=tasks.find(t=>t.index===oldPractice.task.index)||tasks[0];
   if(replacement){
    oldPractice.task=replacement;oldPractice.done=false;resetTappedPrompt(oldPractice);
    oldPractice.note=replacement.russianSentence?'Обновление задания: переведи предложенное русское предложение на норвежский.':'Обновление задания: напиши целое предложение на норвежском.';
    save();
   }
  }
  const stageLabel='<div class="eyebrow" role="status">'+
   (feedback?'ШАГ 2 ИЗ 2 · ПРИМЕНИ СЛОВО В ПРЕДЛОЖЕНИИ':'ШАГ 1 ИЗ 2 · НАПИШИ ПЕРЕВОД НА РУССКОМ')+'</div>';
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
  const practice=d.formPractice;
  // A saved failed lookup can now have a verified, offline translation.
  // Clear only the stale error bubble: require a new word tap and preserve
  // the learner's answer, review history and other hint state.
  if(practice?.wordTap?.status==='error'){
    const failedToken=russianTokens(practice.task?.russianSentence)[practice.wordTap.index];
    if(failedToken&&window.NECardFormPractice?.tappedWordGloss?.(practice.task,failedToken)){
      practice.wordTap=null;
      save();
    }
  }
  // Previous builds stored a separate expanded translation panel. Remove its
  // obsolete state once, without discarding the learner's draft or help score.
  if(practice?.helpOpen){
    practice.helpOpen=false;
    if(String(practice.note||'').startsWith('Подсказка открыта:'))practice.note='';
    save();
  }
  const practiceHtml=practice?.started&&!practice.done
   ?'<div class="card" style="margin-top:14px;padding:16px">'+
    '<div class="eyebrow">Шаг 2 · Закрепление и понимание слова</div>'+
    '<p><b>'+(practice.task.russianSentence?'Переведи на норвежский:':'Задание:')+'</b></p>'+    (practice.task.russianSentence?'<p lang="ru" class="notice" style="font-size:1.16rem;font-weight:650">'+tappedPrompt(practice.task,practice)+'</p><p class="muted">Нажми на любое незнакомое слово: перевод откроется рядом, а слово попадёт в словарь.</p>':'<p><b>'+esc(practice.task.prompt)+'</b></p>')+    (practice.task.requiredForm?'<p class="muted"><b>Нужная форма:</b> '+esc(practice.task.label)+'. '+(practice.task.russianSentence?'Сохрани смысл русского предложения.':'Составь самостоятельное предложение с этой формой.')+'</p>':'')+
    '<p class="muted">'+(practice.task.russianSentence?'Переведи предложение целиком. Нора проверит смысл, порядок слов и нужную форму слова.':'Напиши целое осмысленное предложение по-норвежски. Нора проверит значение, ситуацию и грамматику.')+'</p>'+
    '<label class="field-label" for="livingFormAnswer">'+(practice.task.russianSentence?'Твой перевод на норвежский':'Твоё предложение на норвежском')+'</label>'+
    '<input class="input" id="livingFormAnswer" lang="nb" maxlength="280" autocomplete="off" value="'+esc(practice.draft||'')+
    '" placeholder="Например: Jeg ..." oninput="NELivingWords.draftForm(this.value)" onkeydown="if(event.key===\'Enter\'){event.preventDefault();NELivingWords.checkForm()}">'+
    '<div class="row"><button class="btn" onclick="NELivingWords.checkForm()">Проверить предложение</button>'+
    '<button class="btn secondary" type="button" onclick="NELivingWords.explainForm()">Нора, объясни мне</button>'+
    '<button class="btn secondary" onclick="NELivingWords.recordForm()">🎤 Сказать предложение</button></div>'+
    noraExplainPanel(practice)+
    (practice.note?'<div class="notice" role="status">'+esc(practice.note)+'</div>':'')+
    (practice.misses>=2?'<div class="row"><button class="btn secondary" onclick="NELivingWords.reviewFormError()">'+
      (practice.task.modelAnswer&&practice.task.russianSentence?
        'Разобрать ошибку и получить новое задание':'Сменить ситуацию без готового ответа')+
      '</button></div>':'')+
    (practice.misses>0?'<p class="muted">Исправь ответ. После двух ошибок можно изучить образец и попробовать новую ситуацию; ответ не зачтётся автоматически.</p>':'')+
    '</div>':'';
  const fields=feedback
   ?(practice?.done
     ?'<div class="notice" role="status">Ты правильно применил слово в предложении. Можно продолжать.</div>'+
       '<button class="btn" onclick="NELivingWords.nextCard()">'+(review?'Продолжить повтор →':'Следующая карточка →')+'</button>'
     :practice?.started?practiceHtml:
       '<p>Русский перевод слова проверен. Теперь переведи предложение на норвежский, используя нужную форму слова.</p>'+
       '<button class="btn" onclick="NELivingWords.beginCardPractice()">Задание с этим словом →</button>')
   :'<p class="muted">Сначала напиши, что означает слово по-русски. Только после этого откроется задание на его применение.</p>'+ 
    '<label class="field-label" for="livingTranslate">Шаг 1. Напиши перевод слова на русский</label>'+
    '<input id="livingTranslate" class="input" lang="ru" autocomplete="off" maxlength="200" value="'+esc(d.cardDraft||'')+
    '" placeholder="Напиши перевод здесь" oninput="NELivingWords.draftTranslation(this.value)" onkeydown="if(event.key===\'Enter\'){event.preventDefault();NELivingWords.checkTranslation()}">'+
    '<div class="row"><button class="btn" onclick="NELivingWords.checkTranslation()">Проверить перевод</button>'+
    '<button class="btn secondary" onclick="NELivingWords.recordTranslation()">🎤 Ответить голосом</button>'+
    '<button class="btn ghost" onclick="NELivingWords.reveal()">Не знаю · показать</button></div>'+
    '<p class="muted">После голосового ответа проверь распознанный текст в поле. При ошибке слово повторится позже.</p>';
  return wrapper('<p class="muted">'+(review?'Повторяем трудные слова · ':'Карточки · ')+
   (d.cardsSeen+1)+' из '+queue.length+'</p>'+
   '<div class="card" style="padding:24px"><div class="muted">'+esc(grammar.typeRu)+'</div>'+kind+
   '<h2 lang="nb" style="text-align:center">'+esc(grammar.headword)+'</h2>'+
   '<button class="btn secondary" onclick="NELivingWords.listenCard()">▶ Послушать слово</button>'+stageLabel+
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
function nextCard(){
 const d=ensure();if(!d||d.stage!=='cards'||!d.cardFeedback||!d.formPractice?.done)return false;
 return advanceCard(true);
}
function deferCard(){
 const d=ensure(),card=d&&currentCard(d);
 if(!d||d.stage!=='cards'||!card||d.cardFeedback?.correct!==false||!d.formPractice?.done)return false;
 // Learner may defer a difficult translation only after completing word-form practice.
 d.deferredWords.push(key(card.word.word));return advanceCard(false);
}

function beginCardPractice(){
 const d=ensure(),card=d&&currentCard(d);
 if(!d||d.stage!=='cards'||!card||!d.cardFeedback||d.formPractice?.started)return false;
 const provider=window.NECardFormPractice;
 if(!provider?.choose){
  d.feedback='Модуль упражнений ещё загружается. Открой карточку повторно.';
  save();render();return false;
 }
 d.formPractice={started:true,done:false,task:provider.choose(card.word),
  draft:'',note:'',misses:0,hadMistake:false,needsAnother:false,answers:[],taskCount:1};
 d.feedback='';save();render();return true;
}
function draftForm(value){
 const d=ensure(),p=d?.formPractice;
 if(d?.stage==='cards'&&p?.started&&!p.done){p.draft=String(value||'').slice(0,280);save()}
}
async function tapUnknownWord(index){
 const d=ensure(),card=d&&currentCard(d),p=d?.formPractice,task=p?.task;
 if(!d||d.stage!=='cards'||!card||!p?.started||p.done||formBusy||
   !task?.russianSentence||!task?.modelAnswer)return false;
 const token=russianTokens(task.russianSentence)[index];
 if(!token)return false;
 const lower=token.toLocaleLowerCase('ru-RU'),cached=p.wordTapHints?.[lower];
 if(cached){
  p.wordTap={index,status:'ready',entry:cached};save();render();return true;
 }
 if(p.wordTap?.index===index&&p.wordTap?.status==='loading')return false;
 p.wordTap={index,status:'loading'};save();render();
 let result=window.NECardFormPractice?.tappedWordGloss?.(task,token)||null;
 let failure='error';
 if(!result){
  try{
   const response=await fetch('/api/evaluate',{method:'POST',credentials:'same-origin',
    headers:{'Content-Type':'application/json',...(window.NEAccess?.headers?.()||{})},
    body:JSON.stringify({action:'word_lookup',selected_word:token,
     sentence_ru:task.russianSentence,reference_no:task.modelAnswer,level:d.level})
   });
   const data=await response.json().catch(()=>({}));
   if(response.ok&&data?.ok===true)result=data;
   else if(!response.ok&&response.status!==422)failure='unavailable';
  }catch{failure='unavailable'}
 }
 if(ensure()!==d||d.formPractice!==p||p.task!==task||p.done||d.stage!=='cards')return false;
 const valid=result&&rememberTappedWord(d,result);
 if(valid){
  p.wordTapHints=p.wordTapHints||{};
  p.wordTapHints[lower]={lemma_no:result.lemma_no,form_no:result.form_no,
   translation_ru:result.translation_ru,grammar_ru:result.grammar_ru||'',source_ru:result.source_ru||''};
  // Help must not be silently counted as independent mastery.
  p.hadMistake=true;p.needsAnother=true;
 }
 if(p.wordTap?.index===index){
  p.wordTap=valid?{index,status:'ready',entry:p.wordTapHints[lower]}:{index,status:failure};
 }
 save();render();return !!valid;
}
function listenTappedWord(){
 const p=ensure()?.formPractice,entry=p?.wordTap?.entry;
 if(!p?.started||p.done||p.wordTap?.status!=='ready'||!entry?.form_no)return false;
 window.speakText?.(entry.form_no,.88);
 return true;
}

function showFormHint(){return explainForm()}
// After repeated failures, show only a verified example, then require a NEW
// independently solved task. Revealed answers never count as correct work.
function reviewFormError(){
 const d=ensure(),card=d&&currentCard(d),p=d?.formPractice,engine=window.NECardFormPractice;
 if(!d||d.stage!=='cards'||!card||!p?.started||p.done||p.misses<2||
    formBusy||!engine?.choose)return false;
 const old=p.task;
 const verified=!!(old.russianSentence&&old.modelAnswer);
 const explanation=verified
   ?'Разбор предыдущего задания: «'+old.russianSentence+'» — «'+old.modelAnswer+
    '». Это пример для изучения, а не засчитанный ответ.'
   :'Для предыдущего задания нет заранее проверенного примера: готовый ответ не придумываем.';
 const next=engine.choose(card.word,old.index);
 if(!next||next.index===old.index)return false;
 p.task=next;p.taskCount=(Number(p.taskCount)||1)+1;p.misses=0;
 p.draft='';p.needsAnother=false;p.helpOpen=false;p.hadMistake=true;p.done=false;resetTappedPrompt(p);
 p.note=explanation+' Теперь выполни другое задание самостоятельно. Ошибки остаются в повторении.';
 save();render();return true;
}
let formBusy=false;
async function checkForm(){
 const d=ensure(),card=d&&currentCard(d),p=d?.formPractice;
 if(!d||d.stage!=='cards'||!card||!p?.started||p.done||formBusy)return false;
 const answer=String(document.getElementById('livingFormAnswer')?.value||p.draft||'').trim();
 const engine=window.NECardFormPractice;
 const fail=message=>{
  p.misses++;p.hadMistake=true;p.needsAnother=true;markWrong(d,card);
  p.note='Пока неверно. '+message;
  save();render();return false;
 };
 if(!answer){
  p.note='Напиши предложение по-норвежски или произнеси его через микрофон.';
  save();render();return false;
 }
 p.draft=answer;
 if(/[а-яё]/i.test(answer)){
  // Wrong input language is a format problem, not evidence that a word was forgotten.
  p.note='Здесь нужно предложение на норвежском. Русский перевод уже проверен на шаге 1.';
  save();render();return false;
 }
 if(answer.trim().split(/\s+/).length<2){
  // Full sentences in Norwegian may be short: "Det regner." / "Jeg sover."
  p.note='Напиши законченное предложение. Два слова могут быть достаточны, если мысль понятна.';
  save();render();return false;
 }
 const precise=engine?.diagnoseErrors?.(p.task,answer,card.word)||'';
 if(precise)return fail(precise);
 if(!engine?.containsWord?.(p.task,answer,card.word)){
  return fail('Не найдена форма «'+String(p.task.requiredForm||p.task.word||card.word.word)+'». '+
   (engine?.hint?.(p.task,p.misses+1)||'Проверь форму слова.')+ ' Если написана другая грамматическая конструкция, Нора пока не может подтвердить её автоматически.');
 }
 // A translation prompt requires the same meaning, so repeating the previous
 // answer is allowed. The no-repeat rule applies only to free-writing tasks.
 const spelling=engine?.spellingHint?.(p.task,answer);
 if(spelling)return fail(spelling);
 if(!p.task.russianSentence&&p.answers.some(previous=>engine.norm(previous)===engine.norm(answer))){
  return fail('Ты уже использовал это предложение. Напиши другое со словом в заданной форме.');
 }
 formBusy=true;
 p.note=p.task.russianSentence?'Нора проверяет перевод русского предложения…':'Нора проверяет, правильно ли ты применил слово…';
 save();render();
 let correct=false,explanation='';
 try{
  const topic=window.NELivingDay?.details?.().title||'Повседневная жизнь';
  const rubric=(p.task.russianSentence?'Нужно перевести предложенное русское предложение на естественный Bokmål, сохранив его смысл. Русское предложение: «'+p.task.russianSentence+'». Эталон для проверки смысла (не требовать дословного совпадения): «'+p.task.modelAnswer+'». Допускай любые грамматически корректные эквиваленты, которые полностью передают смысл и правильную форму; отвергай только реальные смысловые/грамматические ошибки. ':'Нужно ОДНО самостоятельно придуманное, естественное норвежское предложение. ')+
    'Проверь, что слово «'+String(card.word.word)+'» (словарная форма: «'+String(p.task.word)+
    '», русский смысл: «'+String(card.word.translation)+'») использовано по смыслу и грамматически верно. '+
    (p.task.requiredForm?'Требуемая грамматическая форма: '+p.task.label+' («'+p.task.requiredForm+'»). ':'')+
    'Проверь порядок слов, уместность, время, род/число и наличие законченной мысли. '+
    'Нельзя засчитывать одно слово, случайный набор слов или смысловую ошибку. '+
    'Уровень '+d.level+'. Тема: '+topic+'. При ошибке в explanation_ru укажи конкретный ошибочный фрагмент из ответа в кавычках, правильную форму и короткое правило. Если ошибок несколько, объясни каждую, максимум три. Не пиши шаблонные замечания вроде «проверь число и артикль» и не утверждай, что предложение неполное, когда в нём есть подлежащее и сказуемое. Не придумывай ошибки в допустимых вариантах Bokmål.';
  const response=typeof window.aiEvaluate==='function'?await window.aiEvaluate({
   answer,question:p.task.prompt,goal:rubric,level:d.level,mode:'writing'
  }):{ok:false};
  if(ensure()!==d||d.formPractice!==p||d.stage!=='cards')return false;
  if(!response?.ok){
   p.note='Проверка Норы сейчас недоступна. Твоё предложение сохранено. Повтори проверку позже.';
   save();render();return false;
  }
  const data=response.data||{};
  correct=data.accepted===true&&Number(data.score)>=70;
  explanation=String(data.explanation_ru||data.improvements_ru?.[0]||'Проверь смысл, форму и порядок слов.').slice(0,450);
 }catch{
  if(ensure()===d&&d.formPractice===p){
   p.note='Связь с проверкой Норы прервалась. Твой ответ сохранён, попробуй снова.';
   save();render();
  }
  return false;
 }finally{formBusy=false}
 if(!correct){
  return fail(explanation+' '+(engine?.hint?.(p.task,p.misses+1)||'Исправь предложение, чтобы продолжить.'));
 }
 p.answers.push(answer);
 if(p.needsAnother){
  p.task=engine.choose(card.word,p.task.index);
  p.taskCount++;p.misses=0;p.draft='';p.needsAnother=false;p.helpOpen=false;resetTappedPrompt(p);
  p.note=p.task.russianSentence?'Исправление принято! Теперь переведи другое русское предложение с тем же словом.':'Исправление принято! Теперь составь другое предложение с тем же словом.';
  save();render();return true;
 }
 p.done=true;p.note=p.task.russianSentence?'Перевод принят! Ты правильно применил слово в предложении.':'Смысл и употребление слова закреплены. Предложение принято.';
 save();render();return true;
}
let formRecognition=null;
function recordForm(){
 const d=ensure(),card=d&&currentCard(d),p=d?.formPractice;
 if(!d||d.stage!=='cards'||!card||!p?.started||p.done||formRecognition)return false;
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!SR){p.note='Распознавание норвежской речи недоступно. Напиши ответ самостоятельно.';save();render();return false}
 try{
  const rec=new SR(),session=d,slot=d.cardsSeen,task=p.task;
  rec.lang='nb-NO';rec.interimResults=false;rec.continuous=false;
  formRecognition=rec;p.note='Слушаю ответ по-норвежски…';save();render();
  rec.onresult=e=>{
   if(ensure()!==session||session.stage!=='cards'||session.cardsSeen!==slot||session.formPractice!==p||p.task!==task)return;
   const spoken=Array.from(e.results||[]).filter(x=>x.isFinal)
    .map(x=>x?.[0]?.transcript||'').join(' ').trim();
   if(spoken){p.draft=spoken.slice(0,280);p.note='Проверь распознанный текст и нажми «Проверить форму».';save()}
  };
  rec.onerror=()=>{
   if(ensure()===session&&session.formPractice===p){p.note='Не удалось распознать речь. Попробуй ещё раз или напиши ответ.';save()}
  };
  rec.onend=()=>{formRecognition=null;if(ensure()===session&&session.formPractice===p)render()};
  rec.start();return true;
 }catch{formRecognition=null;p.note='Микрофон не запустился. Проверь разрешение браузера.';save();render();return false}
}
function listenCard(){const d=ensure(),card=d&&currentCard(d);if(card)window.speakText?.(window.NECardGrammar?.describe?.(card.word)?.headword||card.word.word,.9)}
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
window.NELivingWords=Object.freeze({ensure,isReady,render,reveal,nextCard,deferCard,draftTranslation,checkTranslation,recordTranslation,listenCard,beginCardPractice,draftForm,showFormHint,explainForm,tapUnknownWord,listenTappedWord,reviewFormError,checkForm,recordForm,checkCloze,draft,checkWriting,recordSpeech,checkSpeaking,clozeSet,acceptedTranslation,progress,answerMini,listenMini,revealMiniWord,continueMini});
})();
