// Three-stage learner vocabulary: new words, yesterday's recall, and older reviews.
// User-private, offline, deterministic. No XP/CEFR credit for looking up a word.
(() => {
 'use strict';
 const LIMIT=5,DAY=86400000;
 const getState=()=>window.neLearnerState;
 const save=()=>window.saveState?.();
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const lemma=v=>String(v||'').normalize('NFKC').toLocaleLowerCase('nb-NO').trim()
  .replace(/^(?:en|ei|et|å)\s+/u,'').replace(/[.,!?;:()[\]{}]/gu,'').replace(/\s+/gu,' ');
 const valid=(no,ru)=>/^[a-zæøå]+(?:[\s'-][a-zæøå]+)*$/iu.test(String(no||''))&&
  /[\u0400-\u04FF]/u.test(String(ru||''))&&String(no).length<=65&&String(ru).length<=120;
 const localDate=(date=new Date())=>date.toLocaleDateString('sv-SE');
 const offset=(date,days)=>{
  const [year,month,day]=date.split('-').map(Number);
  const d=new Date(year,month-1,day,12);d.setDate(d.getDate()+days);
  return localDate(d);
 };
 function db(){
  const s=getState();if(!s)return null;
  s.learningV8=s.learningV8&&typeof s.learningV8==='object'&&!Array.isArray(s.learningV8)?s.learningV8:{};
  let t=s.learningV8.lessonWordTrays;
  if(!t||typeof t!=='object'||Array.isArray(t))t=s.learningV8.lessonWordTrays={days:{}};
  if(!t.days||typeof t.days!=='object'||Array.isArray(t.days))t.days={};
  return t;
 }
 function sourceWords(lesson){
  const out=[],seen=new Set(),put=(no,ru,origin)=>{
   no=String(no||'').trim();ru=String(ru||'').trim();
   const id=lemma(no);if(!valid(no,ru)||seen.has(id))return;
   seen.add(id);out.push({word:no,ru,id,origin});
  };
  const state=getState()||{},date=localDate();
  for(const w of state.dailyPacks?.[date]?.words||[])put(w.lemma||w.word,w.translation_ru,'daily-pack');
  for(const w of lesson?.vocab||[])if(Array.isArray(w))put(w[0],w[1],'lesson');
  const moduleId=lesson?._adaptive?.moduleId;
  for(const w of window.NECurated?.get?.(moduleId)?.vocab||[])
   if(Array.isArray(w))put(w[0],w[1],'curated');
  // Use words from the same CEFR level only; never pad with fabricated vocabulary.
  if(typeof COURSE!=='undefined'&&Array.isArray(COURSE))
   for(const item of COURSE.filter(x=>x.level===(lesson?.level||state.level)))
    for(const w of item.vocab||[])if(Array.isArray(w))put(w[0],w[1],'course');
  return out;
 }
 function snapshotFor(date){
  const t=db();return t?.days?.[date]||null;
 }
 function olderDictionaryWords(today,level,exclude){
  const s=getState()||{},records=[];
  for(const w of Object.values(s.dailyDictionary||{})){
   const word=String(w.lemma||w.word||''),ru=String(w.translation_ru||w.translation||'');
   const first=String(w.firstDate||'');
   const id=lemma(word);
   if(!valid(word,ru)||exclude.has(id)||(w.level&&w.level!==level)||!first||first>=today)continue;
   const due=(Number(w.nextDue)||0)>0&&Number(w.nextDue)<=Date.now();
   const miss=(Number(w.wrong)||0)>=(Number(w.correct)||0)+1;
   records.push({word,ru,id,origin:'history',first,priority:(due?10:0)+(miss?7:0)});
  }
  records.sort((a,b)=>b.priority-a.priority||a.first.localeCompare(b.first));
  return records;
 }
 function ensure(lesson,date=localDate()){
  const s=getState(),t=db();
  if(!s||!t||!lesson||!['A1','A2','B1','B2'].includes(lesson.level))return null;
  const existing=t.days[date];
  if(existing&&Array.isArray(existing.today)&&existing.level===lesson.level)return existing;
  const before=new Set();
  for(const [k,row] of Object.entries(t.days)){
   if(k<date)for(const w of row.today||[])before.add(lemma(w.word));
  }
  for(const w of Object.values(s.dailyDictionary||{})){
   if(!w||typeof w!=='object')continue;
   if(!w.firstDate||String(w.firstDate)<date)before.add(lemma(w.lemma||w.word));
  }
  const fromDay=(dateKey)=>{
   const record=snapshotFor(dateKey);
   return Array.isArray(record?.today)?record.today.filter(w=>valid(w.word,w.ru)):[];
  };
  const dictionaryByDate=(key)=>{
   const candidates=[];
   for(const w of Object.values(s.dailyDictionary||{})){
    if(!w||w.level&&w.level!==lesson.level||String(w.firstDate||'')!==key)continue;
    const word=String(w.lemma||w.word||''),ru=String(w.translation_ru||w.translation||'');
    if(valid(word,ru))candidates.push({word,ru,id:lemma(word)});
   }
   return candidates;
  };
  const yesterday=fromDay(offset(date,-1)).length?fromDay(offset(date,-1)):
   dictionaryByDate(offset(date,-1));
  const old=fromDay(offset(date,-2)).length?fromDay(offset(date,-2)):
   dictionaryByDate(offset(date,-2));
  const fromDictionary=olderDictionaryWords(date,lesson.level,new Set([...yesterday,...old].map(x=>lemma(x.word))));
  const reviewed=[...old,...fromDictionary].filter(w=>!yesterday.some(y=>lemma(y.word)===lemma(w.word)));
  const newCandidates=sourceWords(lesson).filter(x=>!before.has(x.id));
  const today=newCandidates.slice(0,LIMIT);
  const unique=(rows,blocked=[])=>{
   const used=new Set(blocked.map(x=>lemma(x.word))),out=[];
   for(const w of rows){const id=lemma(w.word);
    if(!id||used.has(id)||!valid(w.word,w.ru))continue;
    used.add(id);out.push({word:w.word,ru:w.ru,id});if(out.length===LIMIT)break;
   }
   return out;
  };
  const record={date,level:lesson.level,today:unique(today),
   yesterday:unique(yesterday),older:unique(reviewed,yesterday),relearning:[]};
  t.days[date]=record;
  // Keep one year's day snapshots, never purge the dictionary or review scores.
  for(const key of Object.keys(t.days).sort().slice(0,Math.max(0,Object.keys(t.days).length-366)))
   delete t.days[key];
  save();return record;
 }
 function slots(lesson,date=localDate()){
  const d=ensure(lesson,date);if(!d)return null;
  const promoted=(d.relearning||[]).filter(w=>valid(w.word,w.ru));
  const used=new Set(promoted.map(w=>lemma(w.word)));
  const recent=[...promoted];
  for(const w of d.today||[]){
   if(used.has(lemma(w.word)))continue;
   recent.push(w);used.add(lemma(w.word));
  }
  const current=recent.slice(0,LIMIT);
  const previous=(d.yesterday||[]).filter(w=>!used.has(lemma(w.word))).slice(0,LIMIT);
  const aging=(d.older||[]).filter(w=>!used.has(lemma(w.word))).slice(0,LIMIT);
  return {date:d.date,level:d.level,today:current,yesterday:previous,older:aging,
    queuedNew:recent.length>LIMIT?recent.length-LIMIT:0};
 }
 function markOldForgotten(no,date=localDate()){
  const t=db(),record=t?.days?.[date],id=lemma(no);
  if(!record||!id)return false;
  const found=(record.older||[]).find(w=>lemma(w.word)===id);
  if(!found)return false;
  record.relearning=record.relearning||[];
  if(!record.relearning.some(w=>lemma(w.word)===id))record.relearning.unshift({...found,relearn:true});
  record.relearning=record.relearning.slice(0,LIMIT);
  const s=getState();
  if(s){
   s.wordPracticeQueue=s.wordPracticeQueue||{};
   s.wordPracticeQueue[id]=Date.now();
   const dict=Object.values(s.dailyDictionary||{}).find(w=>lemma(w?.lemma||w?.word)===id);
   if(dict){dict.nextDue=Date.now();dict.bridgeLookups=(Number(dict.bridgeLookups)||0)+1;}
   const srs=Object.values(s.srs||{}).find(w=>lemma(w?.word)===id);
   if(srs)srs.due=Date.now();
  }
  save();return true;
 }
 function info(w,shown){
  const row=window.NECardGrammar?.describe?.({word:w.word,translation:w.ru})||null;
  const forms=row?.verified&&Array.isArray(row.forms)?row.forms.slice(0,6):[];
  const formRows=forms.map(x=>'<li><b>'+esc(x.label)+'</b>: <span lang="nb">'+esc(x.form)+'</span>'+
   (x.translationRu?' — '+esc(x.translationRu):'')+'</li>').join('');
  return '<div class="ne-tray-info" data-no-bridge>'+
   '<p><b lang="nb">'+esc(row?.headword||w.word)+'</b> — '+esc(w.ru)+'</p>'+
   (formRows?'<details'+(shown?' open':'')+'><summary>Формы ('+forms.length+')</summary><ul>'+formRows+'</ul></details>':
    '<small>Полные проверенные формы пока отсутствуют; их нельзя угадывать.</small>')+
   (row?.verified&&row.example?.no?'<p class="ne-tray-example"><span lang="nb">'+esc(row.example.no)+
    '</span> — '+esc(row.example.ru||'')+'</p>':'')+
   (row?.url?'<small><a href="'+esc(row.url)+'" target="_blank" rel="noopener noreferrer">Bokmålsordboka</a></small>':'')+
   '</div>';
 }
 function render(lesson){
  const s=slots(lesson);if(!s)return '';
  const columns=[['today','Новые / переучиваемые',s.today],['yesterday','Вчера',s.yesterday],['older','Позавчера и трудные',s.older]];
  const entries=(kind,words)=>words.map(w=>
   '<div class="ne-tray-item"><button type="button" class="ne-tray-word" data-ne-tray-word="'+esc(w.word)+'" data-ne-tray-kind="'+kind+'" '+
   'onclick="NEWordTrays.reveal(this)"><span lang="nb">'+esc(w.word)+'</span><small>'+(kind==='today'?'перевод и формы':'перевод по нажатию')+'</small></button>'+
   (kind==='today'?info(w,true):'<div class="ne-tray-reveal" hidden></div>')+'</div>').join('');
  return '<section class="ne-vocab-trays" data-ne-tray-date="'+esc(s.date)+'" data-no-bridge>'+
   '<div class="ne-tray-heading"><b>15 слов в живой речи</b><small>Используй подходящие слова в собственных фразах. Не обязательно все сразу.</small></div>'+
   '<div class="ne-tray-panels">'+columns.map(([kind,title,words])=>
    '<section class="ne-tray-panel" data-ne-tray-column="'+kind+'"><b>'+esc(title)+'</b><small>'+words.length+'/'+LIMIT+'</small>'+
    (words.length?entries(kind,words):'<p class="ne-tray-empty">Пока нет слов за этот период</p>')+'</section>').join('')+'</div>'+
   (s.queuedNew?'<small>Ещё '+s.queuedNew+' новых слов останутся в истории и вернутся позднее.</small>':'')+
   '<small class="ne-tray-footer">Формы показаны только по проверенному словарю. Нажатие не засчитывает слово выученным.</small></section>';
 }
 function reveal(button){
  const group=button?.closest?.('.ne-tray-panel'),root=button?.closest?.('.ne-vocab-trays'),
   word=button?.dataset.neTrayWord,kind=button?.dataset.neTrayKind;
  const date=root?.dataset.neTrayDate;
  const t=db(),record=t?.days?.[date];
  if(!group||!root||!word||!record||!['older','yesterday'].includes(kind))return false;
  const row=(record[kind]||[]).find(w=>lemma(w.word)===lemma(word));
  const panel=button.parentElement?.querySelector('.ne-tray-reveal');
  if(!row||!panel)return false;
  panel.innerHTML=info(row,false);
  panel.hidden=false;
  const s=getState();
  if(s&&kind==='yesterday'){
   // Translation peek is an uncertainty signal, not proof of a wrong answer.
   s.learningV8=s.learningV8||{};
   const events=s.learningV8.wordTrayLookups||[];
   events.push({word:row.word,date,at:Date.now()});
   s.learningV8.wordTrayLookups=events.slice(-100);
   save();
  }
  if(kind==='older'&&markOldForgotten(word,date)){
   panel.insertAdjacentHTML('beforeend','<p class="ne-tray-promoted">Забытое слово перенесено в первую группу и назначено на повторение.</p>');
   // Do not re-render the whole lesson while the student is typing a response.
   const fresh=slots(window.neLessonSession?.lesson,date);
   const top=root.querySelector('[data-ne-tray-column="today"]');
   if(fresh&&top){
    top.innerHTML='<b>Новые / переучиваемые</b><small>'+fresh.today.length+'/'+LIMIT+'</small>'+
     fresh.today.map(w=>'<div class="ne-tray-item"><button type="button" class="ne-tray-word" data-ne-tray-word="'+esc(w.word)+'">'+esc(w.word)+'</button>'+info(w,true)+'</div>').join('');
   }
  }
  return true;
 }
 function focus(lesson){
  const s=slots(lesson);if(!s)return [];
  return [...s.today.map(x=>({...x,stage:'new'})),...s.yesterday.map(x=>({...x,stage:'yesterday'})),
   ...s.older.map(x=>({...x,stage:'review'}))]
   .slice(0,15).map(x=>({word:x.word,ru:x.ru,stage:x.stage}));
 }
 function styles(){
  if(typeof document==='undefined'||document.getElementById('ne-vocab-trays-style'))return;
  const el=document.createElement('style');el.id='ne-vocab-trays-style';
  el.textContent='.ne-vocab-trays{margin:14px 0;padding:12px 0;max-width:100%}.ne-tray-heading{display:flex;flex-direction:column;gap:4px;margin-bottom:10px}.ne-tray-heading b{font-weight:800}.ne-tray-heading small,.ne-tray-footer{color:var(--muted,#647687)}.ne-tray-panels{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.ne-tray-panel{min-width:0;padding:10px;border-radius:13px;border:1px solid #adc6ce;background:#f0f6f7;color:#163543;display:flex;flex-direction:column;gap:6px}.ne-tray-panel>b{font-size:14px}.ne-tray-panel>small{opacity:.76}.ne-tray-item{border-top:1px solid #c5d9de;padding-top:6px}.ne-tray-word{display:flex;flex-direction:column;align-items:flex-start;gap:3px;border:0;background:transparent;color:#133b55;cursor:pointer;width:100%;text-align:left;padding:6px 3px;font-weight:700;overflow-wrap:anywhere}.ne-tray-word small{font-size:11px;font-weight:400}.ne-tray-info{font-size:12px;line-height:1.4;overflow-wrap:anywhere}.ne-tray-info p{margin:5px 0}.ne-tray-info summary{cursor:pointer;font-weight:600}.ne-tray-info ul{padding-left:16px}.ne-tray-info li{margin:3px 0}.ne-tray-info a{color:#155f85}.ne-tray-empty{font-size:12px}.ne-tray-promoted{font-size:12px;font-weight:700;color:#006242}.ne-tray-footer{display:block;padding-top:10px;font-size:11px}@media(max-width:700px){.ne-tray-panels{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:10px;padding-bottom:10px;overscroll-behavior-x:contain}.ne-tray-panel{flex:0 0 min(81vw,295px);scroll-snap-align:start;padding:13px}.ne-vocab-trays{overflow:hidden}.ne-tray-panel>b{font-size:15px}}';
  document.head.appendChild(el);
 }
 styles();
 window.NEWordTrays=Object.freeze({ensure,slots,render,reveal,focus,markOldForgotten,lemma,localDate,offset});
})();
