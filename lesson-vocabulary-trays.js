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

 function studiedHistory(date,level,blocked){
  const st=getState()||{},archive=db()?.days||{},items=new Map(),now=Date.now();
  const insert=(word,ru,first,stats={})=>{
   word=String(word||'').trim();ru=String(ru||'').trim();
   const id=lemma(word);
   if(!valid(word,ru)||blocked.has(id)||first>=date)return;
   const due=Number(stats.nextDue||stats.due||0);
   const importance=(due>0&&due<=now?10:0)+Math.max(0,Number(stats.wrong||0)-Number(stats.correct||0));
   if(!items.has(id)||importance>items.get(id).priority)
    items.set(id,{word,ru,id,origin:'review-backlog',first:String(first||''),priority:importance});
  };
  for(const [day,snap] of Object.entries(archive)){
   if(day>=date||snap?.level!==level)continue;
   for(const w of snap.today||[])insert(w.word,w.ru,day,w);
  }
  for(const w of Object.values(st.dailyDictionary||{})){
   if(!w||w.level&&w.level!==level)continue;
   if(!w.firstDate&&!w.lastDate)continue;
   insert(w.lemma||w.word,w.translation_ru||w.translation,String(w.firstDate||w.lastDate),w);
  }
  for(const w of Object.values(st.srs||{})){
   if(!w||w.level&&w.level!==level||!(Number(w.seen)>0||Number(w.correct)>0))continue;
   insert(w.word||w.lemma,w.translation||w.translation_ru,String(w.firstDate||w.createdDate||''),w);
  }
  return [...items.values()].sort((a,b)=>b.priority-a.priority||a.first.localeCompare(b.first)||a.id.localeCompare(b.id));
 }
 function composedSlots(d){
  const promoted=(d.relearning||[]).filter(w=>valid(w.word,w.ru));
  const used=new Set(promoted.map(w=>lemma(w.word))),recent=[...promoted];
  for(const w of d.today||[]){
   if(used.has(lemma(w.word)))continue;
   recent.push(w);used.add(lemma(w.word));
  }
  const today=recent.slice(0,LIMIT);
  const yesterday=(d.yesterday||[]).filter(w=>!used.has(lemma(w.word))).slice(0,LIMIT);
  const older=(d.older||[]).filter(w=>!used.has(lemma(w.word))&&!yesterday.some(y=>lemma(y.word)===lemma(w.word))).slice(0,LIMIT);
  const blocked=new Set([...today,...yesterday,...older].map(w=>lemma(w.word)));
  // Full new-word days stay compact; supplement reviews only on review-only days.
  const backfill=today.length?[]:studiedHistory(d.date,d.level,blocked).slice(0,Math.max(0,LIMIT-yesterday.length));
  return {date:d.date,level:d.level,today,yesterday:[...yesterday,...backfill],older,
   queuedNew:recent.length>LIMIT?recent.length-LIMIT:0};
 }
 function slots(lesson,date=localDate()){
  const d=ensure(lesson,date);return d?composedSlots(d):null;
 }
 function markOldForgotten(no,date=localDate()){
  const t=db(),record=t?.days?.[date],id=lemma(no);
  if(!record||!id)return false;
  const found=(record.older||[]).find(w=>lemma(w.word)===id);
  if(!found)return false;
  record.relearning=Array.isArray(record.relearning)?record.relearning:[];
  // Idempotence: multiple taps are one observation, not multiple failures.
  if(record.relearning.some(w=>lemma(w.word)===id))return false;
  record.relearning.unshift({...found,relearn:true});
  record.relearning=record.relearning.slice(0,LIMIT);
  const s=getState(),now=Date.now();
  if(s){
   s.wordPracticeQueue=s.wordPracticeQueue||{};
   s.dailyDictionary=s.dailyDictionary||{};
   s.srs=s.srs||{};
   s.wordPracticeQueue[id]=now;
   let dict=Object.values(s.dailyDictionary).find(w=>lemma(w?.lemma||w?.word)===id);
   // Some older words exist only in a saved daily snapshot. Enqueueing alone
   // does not make them available to the SRS engine; register them safely.
   if(!dict){
    const earliest=Object.entries(t.days).filter(([dateKey,row])=>
     dateKey<=date&&(row.today||[]).some(w=>lemma(w.word)===id))
     .map(([dateKey])=>dateKey).sort()[0];
    dict=s.dailyDictionary[id]={lemma:found.word,translation_ru:found.ru,
     level:record.level,firstDate:String(found.first||earliest||date),source:'relearned_vocabulary',
     correct:0,wrong:0,exposures:1,strength:0};
   }
   dict.nextDue=now;
   dict.bridgeLookups=(Number(dict.bridgeLookups)||0)+1;
   let srs=Object.values(s.srs).find(w=>lemma(w?.word)===id);
   if(!srs)srs=s.srs[id]={word:found.word,translation:found.ru,
    level:record.level,stage:0,seen:0,correct:0};
   srs.due=now;
  }
  save();return true;
 }
 // A word asked about during a lesson should reappear, but never become
 // a fabricated error or an independent CEFR/XP observation.
 function recordTutorWord({question,explanation,lesson}={}){
  const q=String(question||'').trim(),answer=String(explanation||'').trim();
  if(!lesson||!['A1','A2','B1','B2'].includes(lesson.level)||q.length>1800||answer.length>3000||
     !/(?:не\s+(?:знаю|помню)|забыл(?:а)?|как\s+(?:сказать|будет)|что\s+(?:значит|означает)|hva\s+betyr|hvordan\s+sier)/iu.test(q))return null;
  const candidates=sourceWords(lesson).filter(w=>lemma(w.word).length>=3||/^å\s+[a-zæøå]{2}$/iu.test(w.word));
  const normalize=value=>String(value||'').normalize('NFKC').toLocaleLowerCase('nb-NO');
  const escaped=x=>Array.from(x).map(c=>/[\\^$.*+?()[\]{}|]/.test(c)?'\\'+c:c).join('');
  const no=normalize(answer);
  const found=candidates.find(w=>{
   const word=normalize(w.word),bare=normalize(lemma(w.word));
   return new RegExp('(?:^|[^\\p{L}])'+escaped(word)+'(?=$|[^\\p{L}])','iu').test(no)||
    (q.toLocaleLowerCase('ru-RU').includes(bare)&&new RegExp('(?:^|[^\\p{L}])'+escaped(bare)+'(?=$|[^\\p{L}])','iu').test(no));
  });
  if(!found)return null;
  const state=getState(),id=lemma(found.word),now=Date.now(),tomorrow=now+DAY;
  if(!state||!id)return null;
  db(); // Initialize private learningV8 if tutor is used before a tray render.
  state.dailyDictionary=state.dailyDictionary||{};
  state.wordPracticeQueue=state.wordPracticeQueue||{};
  state.srs=state.srs||{};
  let record=Object.values(state.dailyDictionary).find(x=>lemma(x?.lemma||x?.word)===id);
  if(!record)record=state.dailyDictionary[id]={lemma:found.word,translation_ru:found.ru,
   level:lesson.level,firstDate:localDate(),source:'tutor_word_review',correct:0,wrong:0,
   exposures:0,strength:0};
  const date=localDate(),flags=state.learningV8?.tutorWordQueries||{},unique=date+'|'+id;
  if(flags[unique])return found.word; // Repeating the same question is not an extra failure.
  const lastDue=Number(record.nextDue)||0;
  record.nextDue=lastDue>now&&lastDue<tomorrow?lastDue:tomorrow;
  state.wordPracticeQueue[id]=record.nextDue;
  if(!state.srs[id])state.srs[id]={word:found.word,translation:found.ru,level:lesson.level,
   stage:0,seen:0,correct:0,due:tomorrow};
  else if(Number(state.srs[id].due||0)>tomorrow)state.srs[id].due=tomorrow;
  state.learningV8.tutorWordQueries={...flags,[unique]:true};
  const keys=Object.keys(state.learningV8.tutorWordQueries).sort();
  for(const old of keys.slice(0,Math.max(0,keys.length-100)))delete state.learningV8.tutorWordQueries[old];
  save();return found.word;
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
   (window.NEWordMeanings?.render?.({word:w.word,translation:w.ru},{compact:true,expanded:shown})||'')+
   (row?.url?'<small><a href="'+esc(row.url)+'" target="_blank" rel="noopener noreferrer">Bokmålsordboka</a></small>':'')+
   '</div>';
 }

 let displayedLesson=null;
 function entries(kind,words){
  return words.map(w=>'<div class="ne-tray-item">'+(kind==='today'?
   '<div class="ne-tray-new-word"><b lang="nb">'+esc(w.word)+'</b><span>'+esc(w.ru)+'</span></div>'+
   '<details class="ne-tray-details"><summary>Значения и формы</summary>'+info(w,false)+'</details>':
   '<button type="button" class="ne-tray-word" data-ne-tray-word="'+esc(w.word)+'" data-ne-tray-kind="'+kind+'" aria-expanded="false" onclick="NEWordTrays.reveal(this)">'+
   '<span lang="nb">'+esc(w.word)+'</span><small>'+(w.origin==='review-backlog'?'из изученного ранее':'перевод по нажатию')+'</small></button>'+
   '<div class="ne-tray-reveal" hidden></div>')+'</div>').join('');
 }
 function panelHeader(title,count){
  return '<div class="ne-tray-panel-head"><b>'+esc(title)+'</b><span class="ne-tray-count">'+count+'/'+LIMIT+'</span></div>';
 }
 function render(lesson){
  const d=slots(lesson);if(!d)return '';
  displayedLesson=lesson;
  const groups=[['today','Новые и трудные',d.today],['yesterday','Вчера и повторение',d.yesterday],['older','Позавчера и трудные',d.older]];
  const count=d.today.length+d.yesterday.length+d.older.length;
  return '<section class="ne-vocab-trays" data-ne-tray-date="'+esc(d.date)+'" data-no-bridge>'+
   '<div class="ne-tray-heading"><b>Слова для живой речи</b><small>'+count+' из 15 слов. Используй подходящие слова в своих фразах — не обязательно все сразу.</small></div>'+
   '<div class="ne-tray-tabs" role="group" aria-label="Группы слов">'+groups.map(([kind,title,words],i)=>
    '<button type="button" class="ne-tray-tab'+(i===0?' is-active':'')+'" data-ne-tray-tab="'+kind+'" aria-pressed="'+(i===0?'true':'false')+'" onclick="NEWordTrays.select(this)">'+
    ['Новые','Повторить','Трудные'][i]+' <small>'+words.length+'</small></button>').join('')+'</div>'+
   '<div class="ne-tray-panels">'+groups.map(([kind,title,words],i)=>
    '<section class="ne-tray-panel'+(i===0?' is-active':'')+'" data-ne-tray-column="'+kind+'">'+
    panelHeader(title,words.length)+(words.length?entries(kind,words):'<p class="ne-tray-empty">В истории пока нет подходящих слов. Они появятся по мере обучения.</p>')+
    '</section>').join('')+'</div>'+
   (d.queuedNew?'<small>Ещё '+d.queuedNew+' новых слов запланированы на дальнейшее повторение.</small>':'')+
   '<small class="ne-tray-footer">Формы показаны только по проверенному словарю. Просмотр не засчитывает слово выученным.</small></section>';
 }
 function select(button){
  const root=button?.closest?.('.ne-vocab-trays'),kind=button?.dataset.neTrayTab;
  if(!root||!['today','yesterday','older'].includes(kind))return false;
  for(const tab of root.querySelectorAll('[data-ne-tray-tab]')){
   const active=tab.dataset.neTrayTab===kind;
   tab.classList.toggle('is-active',active);tab.setAttribute('aria-pressed',String(active));
  }
  for(const panel of root.querySelectorAll('[data-ne-tray-column]'))
   panel.classList.toggle('is-active',panel.dataset.neTrayColumn===kind);
  return true;
 }
 function reveal(button){
  const group=button?.closest?.('.ne-tray-panel'),root=button?.closest?.('.ne-vocab-trays'),
   word=button?.dataset.neTrayWord,kind=button?.dataset.neTrayKind;
  const date=root?.dataset.neTrayDate;
  const t=db(),record=t?.days?.[date];
  if(!group||!root||!word||!record||!['older','yesterday'].includes(kind))return false;
  const row=(kind==='yesterday'?composedSlots(record).yesterday:record.older||[]).find(w=>lemma(w.word)===lemma(word));
  const panel=button.parentElement?.querySelector('.ne-tray-reveal');
  if(!row||!panel)return false;
  panel.innerHTML=info(row,false);
  panel.hidden=false;
  button.setAttribute('aria-expanded','true');
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
   const fresh=slots(window.neLessonSession?.lesson||displayedLesson,date);
   const top=root.querySelector('[data-ne-tray-column="today"]');
   if(fresh&&top)top.innerHTML=panelHeader('Новые и трудные',fresh.today.length)+entries('today',fresh.today);
  }
  return true;
 }
 function focus(lesson,date=localDate()){
  const s=slots(lesson,date);if(!s)return [];
  return [...s.today.map(x=>({...x,stage:'new'})),...s.yesterday.map(x=>({...x,stage:x.origin==='review-backlog'?'review':'yesterday'})),
   ...s.older.map(x=>({...x,stage:'review'}))]
   .slice(0,15).map(x=>({word:x.word,ru:x.ru,stage:x.stage}));
 }
 function styles(){
  if(typeof document==='undefined'||document.getElementById('ne-vocab-trays-style'))return;
  const el=document.createElement('style');el.id='ne-vocab-trays-style';
  el.textContent="\n.ne-vocab-trays{margin:18px 0;padding:18px;max-width:100%;border:1px solid #d8e8ee;border-radius:23px;background:linear-gradient(140deg,#f8fcfe,#eaf3f7);color:#183b4c;box-shadow:0 12px 25px #13374e16}\n.ne-tray-heading{display:flex;flex-direction:column;gap:5px;margin-bottom:14px}\n.ne-tray-heading b{font-size:20px;letter-spacing:-.025em;color:#153a4b}\n.ne-tray-heading small,.ne-tray-footer{font-size:12px;line-height:1.5;color:#536f80}\n.ne-tray-panels{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;align-items:start}\n.ne-tray-tabs{display:none}\n.ne-tray-panel{display:flex;flex-direction:column;min-width:0;gap:0;padding:14px 14px 6px;border:1px solid #d7e5eb;border-top:4px solid #249b82;border-radius:17px;background:#fff;box-shadow:0 5px 15px #1945560c}\n.ne-tray-panel[data-ne-tray-column=\"yesterday\"]{border-top-color:#3394c9}\n.ne-tray-panel[data-ne-tray-column=\"older\"]{border-top-color:#dfa449}\n.ne-tray-panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:9px;padding-bottom:13px}\n.ne-tray-panel-head b{color:#193b4c;font-size:15px;line-height:1.3}\n.ne-tray-count{flex:none;border-radius:15px;padding:4px 9px;background:#e8f2f6;color:#366176;font-size:12px;font-weight:800}\n.ne-tray-item{border-top:1px solid #e2ebf0;padding:13px 0}\n.ne-tray-new-word{display:flex;flex-direction:column;gap:4px}\n.ne-tray-new-word b,.ne-tray-word span{font-size:18px;line-height:1.25;font-weight:800;color:#133c55;overflow-wrap:anywhere}\n.ne-tray-new-word>span{font-size:13px;line-height:1.45;color:#526b7a}\n.ne-tray-word{display:flex;flex-direction:column;gap:4px;align-items:flex-start;width:100%;min-height:42px;padding:5px 0;border:0;background:transparent;text-align:left;cursor:pointer}\n.ne-tray-word small{font-size:12px;font-weight:500;color:#56758b}\n.ne-tray-details{margin-top:8px}\n.ne-tray-details summary{font-size:12px;color:#176986;font-weight:750;cursor:pointer}\n.ne-tray-details[open],.ne-tray-reveal:not([hidden]){border-radius:12px;padding:9px;margin-top:8px;background:#f1f7fa}\n.ne-tray-info{font-size:12px;line-height:1.55;overflow-wrap:anywhere;color:#244b61}\n.ne-tray-info p{margin:6px 0}\n.ne-tray-info summary{cursor:pointer;font-weight:650}\n.ne-tray-info ul{padding-left:17px}.ne-tray-info li{margin:4px 0}\n.ne-tray-info a{color:#126e99}\n.ne-tray-empty{font-size:13px;line-height:1.5;color:#5c7585}\n.ne-tray-promoted{font-size:12px;font-weight:800;color:#006e51}\n.ne-tray-footer{display:block;padding-top:13px}\n.ne-tray-tab:focus-visible,.ne-tray-word:focus-visible,.ne-tray-details summary:focus-visible{outline:3px solid #2e89c4;outline-offset:2px}\n@media(max-width:700px){\n .ne-vocab-trays{margin:14px 0;padding:15px;border-radius:19px;overflow:visible}\n .ne-tray-heading b{font-size:19px}\n .ne-tray-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin:13px 0;padding:5px;border-radius:14px;background:#dceaf2}\n .ne-tray-tab{min-width:0;padding:10px 3px;border:0;border-radius:10px;background:transparent;color:#4a6878;font-size:12px;font-weight:800;cursor:pointer}\n .ne-tray-tab small{opacity:.8}\n .ne-tray-tab.is-active{background:#fff;color:#0b5573;box-shadow:0 2px 7px #123b5520}\n .ne-tray-panels{display:block}\n .ne-tray-panel{display:none;padding:15px 16px 5px}\n .ne-tray-panel.is-active{display:flex}\n .ne-tray-panel-head b{font-size:16px}\n .ne-tray-new-word b,.ne-tray-word span{font-size:19px}\n}\n";
  document.head.appendChild(el);
 }
 styles();
 window.NEWordTrays=Object.freeze({ensure,slots,render,select,reveal,focus,markOldForgotten,recordTutorWord,lemma,localDate,offset});
})();
