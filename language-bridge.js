// Språkbro 2.1 — gradual Russian-to-Bokmål transition through securely learned words.
// Never change test questions, answers or unlearned vocabulary; taps queue review.
(() => {
 'use strict';
 // High-confidence invariant translations; every term is activated ONLY if its
 // Norwegian lemma is actually mastered in this learner's own dictionary/SRS.
 const FIXED=Object.freeze([
  ['сегодня','i dag'],['завтра','i morgen'],['вчера','i går'],
  ['сейчас','nå'],['потом','etterpå'],['позже','senere'],['раньше','før'],
  ['часто','ofte'],['всегда','alltid'],['иногда','noen ganger'],['никогда','aldri'],
  ['уже','allerede'],['скоро','snart'],['вместе','sammen'],['тоже','også'],
  ['здесь','her'],['там','der'],['дома','hjemme'],['домой','hjem'],
  ['спасибо','takk'],['привет','hei'],['извините','unnskyld'],
  ['утром','om morgenen'],['вечером','om kvelden'],['ночью','om natten'],
  ['сегодня вечером','i kveld'],['вчера вечером','i går kveld'],
  ['следующая неделя','neste uke'],['в понедельник','på mandag'],
  ['семья','familie'],['дом','hus'],['работа','jobb'],['друг','venn'],
  ['школа','skole'],['хлеб','brød'],['молоко','melk'],['слово','ord'],
  ['врач','lege'],['магазин','butikk'],['время','tid'],['книга','bok'],
  ['автобус','buss'],['город','by'],['машина','bil'],['квартира','leilighet'],
  ['документ','dokument'],['заявление','søknad'],['срок','frist'],
  ['письмо','brev'],['встреча','møte'],['курс','kurs'],['учитель','lærer'],
  ['неделя','uke'],['день','dag'],['час','time'],['язык','språk'],
  ['кофе','kaffe'],['вода','vann'],['еда','mat'],['ребёнок','barn'],
  ['завтрак','frokost'],['вечер','kveld'],['ночь','natt'],['утро','morgen'],
  ['зима','vinter'],['лето','sommer'],['осень','høst'],['весна','vår'],
  // Vetted conjugated forms: only activate if the learner knows the base verb.
  // This deliberately avoids guessing arbitrary conjugations from a dictionary.
  ['начать','å begynne','begynne'],['начинать','å begynne','begynne'],
  ['начинаю','begynner','begynne'],['начинает','begynner','begynne'],
  ['закончить','å slutte','slutte'],['заканчивать','å slutte','slutte'],
  ['заканчиваю','slutter','slutte'],['заканчивает','slutter','slutte'],
  ['работать','å jobbe','jobbe'],['работаю','jobber','jobbe'],['работает','jobber','jobbe'],
  ['учить','å lære','lære'],['изучать','å lære','lære'],
  ['учу','lærer','lære'],['изучаю','lærer','lære'],['изучает','lærer','lære'],
  ['говорить','å snakke','snakke'],['говорю','snakker','snakke'],['говорит','snakker','snakke'],
  ['говори','snakk','snakke'],['ответь','svar','svare'],['скажи','si','si'],
  ['работаешь','jobber','jobbe'],['можешь','kan','kunne'],
  ['встретиться','møtes','møtes'],['вслух','høyt','høyt'],
  ['читать','å lese','lese'],['читаю','leser','lese'],['читает','leser','lese'],
  ['писать','å skrive','skrive'],['пишу','skriver','skrive'],['пишет','skriver','skrive'],
  ['жить','å bo','bo'],['живу','bor','bo'],['живёт','bor','bo'],
  ['понимать','å forstå','forstå'],['понимаю','forstår','forstå'],
  ['могу','kan','kunne'],['может','kan','kunne'],
  ['хочу','vil','ville'],['хочет','vil','ville'],
  ['собираюсь','skal','skulle']
 ]);
 const TERMS=FIXED.map(([ru,no,lemma])=>({ru,no,lemma:lemma||no,translation:ru}));
 // Switch the whole clause only when every Norwegian component is mastered.
 // Distinct buttons preserve individual translation and review for each word.
 const PHRASES=Object.freeze([
  {ru:'сегодня ты работаешь',pieces:[['i dag','i dag','сегодня'],['jobber','jobbe','работаешь'],['du','du','ты']]},
  {ru:'завтра ты работаешь',pieces:[['i morgen','i morgen','завтра'],['jobber','jobbe','работаешь'],['du','du','ты']]},
  {ru:'ты работаешь',pieces:[['du','du','ты'],['jobber','jobbe','работаешь']]},
  {ru:'можешь встретиться',pieces:[['kan','kunne','можешь'],['møtes','møtes','встретиться']]}
 ]);
 const getState=()=>window.neLearnerState||null;
 const normNo=x=>String(x||'').normalize('NFKC').toLocaleLowerCase('nb-NO').trim()
  .replace(/^(?:å|en|ei|et)\s+/,'').replace(/[.,!?;:"'()[\]{}]/g,'').replace(/\s+/g,' ');
 const normRu=x=>String(x||'').normalize('NFKC').toLocaleLowerCase('ru-RU').trim().replace(/\s+/g,' ');
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const cap=(x,min,max)=>Math.max(min,Math.min(max,Number(x)||0));
 const enabled=()=>getState()?.learningV8?.languageBridgeEnabled!==false;
 // A learner who remembers more words sees more Bokmål, but difficult recent
 // lookups automatically reduce substitutions without adding any new exercises.
 function recentPeeks(){
  const cutoff=Date.now()-7*86400000,events=getState()?.learningV8?.bridgeLookupEvents;
  return Array.isArray(events)?events.filter(t=>Number.isFinite(t)&&t>=cutoff&&t<=Date.now()).length:0;
 }
 function density(text=''){
  const count=knownWords().length,cap=({A1:6,A2:9,B1:12,B2:18})[getState()?.level]||6;
  const pressure=recentPeeks()>=6?2:recentPeeks()>=3?1:0;
  const numberOfWords=String(text).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1,Math.min(cap,1+Math.floor(count/5)-pressure,Math.max(1,Math.ceil(numberOfWords*.75))));
 }
 let root=null,observer=null,busy=false;
 const processed=new WeakMap();

 function isMastered(dictionary,srs){
  const goodDict=dictionary&&Number(dictionary.correct)>=2&&Number(dictionary.exposures)>=2&&
   Number(dictionary.correct)>Number(dictionary.wrong||0);
  const strongDict=dictionary&&Number(dictionary.correct)>=1&&Number(dictionary.exposures)>=2&&
   Number(dictionary.strength)>=65&&Number(dictionary.correct)>=Number(dictionary.wrong||0);
  const goodSrs=srs&&Number(srs.stage)>=2&&Number(srs.correct)>=2;
  return !!(goodDict||strongDict||goodSrs);
 }
 function knownWords(){
  const s=getState(),dict=s?.dailyDictionary||{},reps=s?.srs||{},map=new Map();
  for(const item of Object.values(dict)){
   if(!item||typeof item!=='object')continue;
   const key=normNo(item.lemma||item.word);if(!key)continue;
   map.set(key,{...map.get(key),dictionary:item});
  }
  for(const item of Object.values(reps)){
   if(!item||typeof item!=='object')continue;
   const key=normNo(item.word);if(!key)continue;
   map.set(key,{...map.get(key),srs:item});
  }
  return [...map.entries()].filter(([_,value])=>isMastered(value.dictionary,value.srs))
   .map(([key,value])=>({key,...value}));
 }
 function extractTranslation(record){
  const translation=String(record.translation_ru||record.translation||'').trim().toLocaleLowerCase('ru-RU');
  // Never guess conjugated Russian/Norwegian forms from a translation with disjunctions.
  const first=translation.split(/\s*[,;/|]\s*/)[0].replace(/\s*\([^)]*\)\s*$/,'').trim();
  return /^[а-яё]+(?:\s+[а-яё]+){0,2}$/u.test(first)?first:'';
 }
 function dynamicTerm(item){
  const d=item.dictionary||{},s=item.srs||{};
  const raw=String(d.lemma||d.word||s.word||'').trim();
  const no=item.key,translation=extractTranslation(Object.keys(d).length?d:s);
  if(!translation||!no||!raw)return null;
  // Only words for which the Russian citation form does not require a
  // grammatical transformation. Avoid infinitives, adjectives, pronouns,
  // ambiguous prepositions, and Russian words with inflected endings.
  const pos=String(d.pos||d.part_of_speech||'').toLowerCase();
  const noun=/^(?:en|ei|et)\s+\S+/i.test(raw)||/\b(?:noun|substantiv|subst|существ)\b/i.test(pos);
  const invariant=/\b(?:adverb|adv|interjection|interj|нареч|междомет)\b/i.test(pos);
  if(!noun&&!invariant)return null;
  if(noun&&(!/^[а-яё]+$/u.test(translation)||!/^[a-zæøå]+$/iu.test(no)))return null;
  if(invariant&&(!/^[a-zæøå]+(?:\s+[a-zæøå]+){0,2}$/iu.test(no)))return null;
  // RU noun endings in obvious declined forms aren't safe to map by lemmas.
  if(noun&&/(?:а|я|ы|и|е|у|ю|ом|ем|ами|ями|ах|ях)$/u.test(translation)&&
     !/^(?:семья|работа|школа|книга|машина|вода|еда|неделя|улица|квартира)$/u.test(translation)){
   // Nominative words ending in these letters can of course be valid; use only
   // the fixed vetted set for them.
   return null;
  }
  return {ru:translation,no,translation,lemma:raw,source:'dictionary'};
 }
 function entries(){
  const known=knownWords(),allowed=new Set(known.map(x=>x.key)),byKey=new Map(known.map(x=>[x.key,x]));
  const list=TERMS.filter(x=>allowed.has(normNo(x.lemma))).map(x=>({...x,
   lemma:String(byKey.get(normNo(x.lemma))?.dictionary?.lemma||byKey.get(normNo(x.lemma))?.srs?.word||x.lemma),
   source:'fixed'}));
  for(const phrase of PHRASES){
   if(phrase.pieces.every(p=>allowed.has(normNo(p[1])))){
    list.push({ru:phrase.ru,no:phrase.pieces.map(p=>p[0]).join(' '),pieces:phrase.pieces,
     translation:phrase.ru,lemma:phrase.pieces[0][1],source:'phrase'});
   }
  }
  const russian=new Set(list.map(x=>normRu(x.ru)));
  for(const w of known){
   const term=dynamicTerm(w);
   if(term&&!russian.has(normRu(term.ru))){
    list.push(term);russian.add(normRu(term.ru));
   }
  }
  // Longest-first: "сегодня вечером" wins over "сегодня".
  return list.sort((a,b)=>b.ru.length-a.ru.length||a.ru.localeCompare(b.ru,'ru'));
 }
 const letter=c=>!!c&&/[\p{L}\p{M}]/u.test(c);
 function findNext(text,start,terms){
  const folded=text.toLocaleLowerCase('ru-RU');let best=null;
  for(const term of terms){
   let i=folded.indexOf(normRu(term.ru),start);
   while(i>=0){
    const end=i+term.ru.length;
    if(!letter(text[i-1])&&!letter(text[end])){
     if(!best||i<best.start||(i===best.start&&end>best.end))best={term,start:i,end};
     break;
    }
    i=folded.indexOf(normRu(term.ru),i+1);
   }
  }
  return best;
 }
 function segments(text,terms,limit){
  const out=[];let from=0,used=0;
  while(used<limit){
   const hit=findNext(text,from,terms.filter(t=>(t.pieces?.length||1)<=limit-used));if(!hit)break;
   if(hit.start>from)out.push({text:text.slice(from,hit.start)});
   if(hit.term.pieces){
    hit.term.pieces.forEach(([no,lemma,ru],i)=>{
     if(i)out.push({text:' '});
     const upper=i===0&&/^[А-ЯЁ]/u.test(text[hit.start]);
     out.push({no:upper?no[0].toLocaleUpperCase('nb-NO')+no.slice(1):no,lemma,ru,source:ru});
    });
    used+=hit.term.pieces.length;
   }else{
    const capFirst=/^[А-ЯЁ]/u.test(text[hit.start]);
    const rendered=capFirst?hit.term.no[0].toLocaleUpperCase('nb-NO')+hit.term.no.slice(1):hit.term.no;
    out.push({no:rendered,ru:hit.term.translation,lemma:hit.term.lemma||hit.term.no,
     source:text.slice(hit.start,hit.end)});
    used++;
   }
   from=hit.end;
  }
  if(from<text.length)out.push({text:text.slice(from)});
  return out.length?out:[{text}];
 }
 function queueForgotten(no){
  const state=getState(),key=normNo(no),now=Date.now();
  if(!state||!key)return false;
  const dict=Object.values(state.dailyDictionary||{}).find(x=>normNo(x?.lemma||x?.word)===key);
  const review=Object.values(state.srs||{}).find(x=>normNo(x?.word)===key);
  if(!dict&&!review)return false;
  state.wordPracticeQueue=state.wordPracticeQueue||{};
  state.wordPracticeQueue[key]=now;
  if(dict){dict.nextDue=now;dict.lastBridgeLookup=new Date(now).toISOString();
   dict.bridgeLookups=(Number(dict.bridgeLookups)||0)+1;}
  if(review)review.due=now;
  state.learningV8=state.learningV8||{};
  const cutoff=now-7*86400000,prior=Array.isArray(state.learningV8.bridgeLookupEvents)?state.learningV8.bridgeLookupEvents:[];
  state.learningV8.bridgeLookupEvents=[...prior.filter(t=>Number.isFinite(t)&&t>=cutoff),now].slice(-30);
  window.saveState?.();return true;
 }
 const skipContext='form,details,button,a,input,textarea,select,[contenteditable],'+
  '.feedback,.prompt,.question,.quiz,.test,.exam,.applied-sheet,.applied-prompt,'+
  '.choice-list,.translation,.lesson-question,'+
  '.nq-decision-scene,.nq-choice,.lesson-choices,.daily-word-card,'+
  '[data-no-bridge],[lang="nb"],[lang="no"],[role="alert"]';
 function eligibleBlock(block){
  if(!block.closest('.shell'))return false;
  const instruction=block.matches('[data-bridge-instruction],.dialogue-task-v83 p,.dialogue-scene-v83 p');
  if(instruction){
   if(block.closest('form,details,button,a,[data-no-bridge],[data-bridge-exclude],.test,.exam,.quiz,.translation,.feedback,[lang="nb"],[lang="no"]'))return false;
  }else if(block.closest(skipContext))return false;
  if(block.closest('.lesson-exercise-v6,.exercise')&&!instruction&&!block.closest('.ne-lesson-coach'))return false;
  if(block.querySelector('button,a,input,textarea,select,[contenteditable]'))return false;
  // Do not rewrite text already tagged as Norwegian or Russian translations of
  // graded Norwegian examples. Keep study directions stable.
  if(block.closest('[data-bridge-exclude]'))return false;
  if(block.closest('.ne-lesson-coach')&&block.closest('.ne-coach-result,.ne-coach-feedback'))return false;
  return true;
 }
 function apply(block,terms){
  if(processed.has(block)||!eligibleBlock(block))return;
  const limit=density(block.textContent||''),nodes=[],walker=document.createTreeWalker(block,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){
   const n=walker.currentNode,p=n.parentElement;
   if(p&&!p.closest('button,a,code,pre,kbd,[data-no-bridge],[lang="nb"],.ne-bridge-word'))nodes.push(n);
  }
  let used=0;
  for(const n of nodes){
   if(used>=limit)break;
   const parts=segments(n.nodeValue||'',terms,limit-used);
   if(!parts.some(x=>x.no))continue;
   const replacement=document.createDocumentFragment();
   if(!processed.has(block))processed.set(block,block.innerHTML);
   for(const part of parts){
    if(!part.no){replacement.appendChild(document.createTextNode(part.text));continue}
    const btn=document.createElement('button');btn.type='button';btn.className='ne-bridge-word';
    btn.lang='nb';btn.textContent=part.no;btn.dataset.neWord=part.lemma||part.no;
    btn.dataset.neTranslation=part.ru;
    btn.setAttribute('aria-label',part.no+' — показать перевод и повторить');
    btn.setAttribute('aria-expanded','false');replacement.appendChild(btn);used++;
   }
   n.parentNode.replaceChild(replacement,n);
  }
 }
 const selectors='.shell p,.shell li,.shell .ne-coach-hint,.shell .nq-nora-note,.shell .nq-nora-reaction p,.shell [data-bridge-instruction]';
 function process(){
  if(busy||!root||!enabled())return;
  const terms=entries();if(!terms.length)return;
  busy=true;try{for(const block of root.querySelectorAll(selectors))apply(block,terms);}
  finally{busy=false}
 }
 function restore(){
  if(!root)return;
  for(const block of root.querySelectorAll(selectors)){
   if(processed.has(block)){block.innerHTML=processed.get(block);processed.delete(block)}
  }
 }
 function toggle(){
  const s=getState();if(!s)return;
  s.learningV8=s.learningV8||{};s.learningV8.languageBridgeEnabled=!enabled();
  window.saveState?.();
  if(enabled())process();else restore();
  const button=document.getElementById('neLanguageBridgeToggle');
  if(button){
   button.textContent=enabled()?'Выключить языковой мост':'Включить языковой мост';
   button.setAttribute('aria-pressed',String(enabled()));
  }
 }
 function controlHtml(){
  const known=knownWords().length,covered=entries().length,on=enabled();
  return '<section class="card ne-bridge-settings" data-no-bridge>'+
   '<h3>Språkbro 2.0 · Языковой мост</h3>'+
   '<p>Знакомые слова постепенно переходят на норвежский в объяснениях и инструкциях Норы. Нажми на слово, чтобы увидеть русский перевод и добавить его в повторение. Подсказки не меняют контрольные тесты.</p>'+
   '<p class="muted">Подтверждено слов: <b>'+known+'</b>. Безопасных замен: <b>'+covered+'</b>. Уровень: <b>'+esc(getState()?.level||'A1')+'</b>. '+
   (covered?'Замены появляются там, где встречается подходящее русское слово.':'По мере закрепления слов доступные замены появятся автоматически.')+'</p>'+
   '<button id="neLanguageBridgeToggle" type="button" class="btn secondary" aria-pressed="'+on+'" onclick="NELanguageBridge.toggle()">'+
   (on?'Выключить языковой мост':'Включить языковой мост')+'</button></section>';
 }
 function onClick(event){
  const button=event.target?.closest?.('.ne-bridge-word');
  if(!button||!root?.contains(button))return;
  const wasOpen=button.getAttribute('aria-expanded')==='true';
  for(const current of root.querySelectorAll('.ne-bridge-word[aria-expanded="true"]')){
   current.setAttribute('aria-expanded','false');
   if(current.nextElementSibling?.classList.contains('ne-bridge-gloss'))current.nextElementSibling.remove();
  }
  if(wasOpen)return;
  const queued=queueForgotten(button.dataset.neWord);
  const gloss=document.createElement('span');gloss.className='ne-bridge-gloss';
  gloss.setAttribute('role','status');gloss.lang='ru';
  gloss.textContent=(button.dataset.neWord!==button.textContent?button.dataset.neWord+' — ':'')+
   button.dataset.neTranslation+(queued?' · добавлено в повторение':'');
  button.insertAdjacentElement('afterend',gloss);
  button.setAttribute('aria-expanded','true');
 }
 function mount(){
  root=document.getElementById('app');
  if(!root||typeof MutationObserver!=='function')return;
  root.addEventListener('click',onClick);
  observer=new MutationObserver(()=>process());observer.observe(root,{subtree:true,childList:true});
  process();
 }
 window.NELanguageBridge=Object.freeze({controlHtml,toggle,process,segments,queueForgotten,
  entries,knownWords,extractTranslation,dynamicTerm,isMastered,density,recentPeeks,eligibleBlock});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
})();