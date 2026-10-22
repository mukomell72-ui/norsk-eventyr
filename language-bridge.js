// Språkbro 2.0 — learner-owned dictionary, conservative morphology, accessible on-tap review.
// Russian task instructions and assessed answers remain unchanged.
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
  ['читать','å lese','lese'],['читаю','leser','lese'],['читает','leser','lese'],
  ['писать','å skrive','skrive'],['пишу','skriver','skrive'],['пишет','skriver','skrive'],
  ['жить','å bo','bo'],['живу','bor','bo'],['живёт','bor','bo'],
  ['понимать','å forstå','forstå'],['понимаю','forstår','forstå'],
  ['могу','kan','kunne'],['может','kan','kunne'],
  ['хочу','vil','ville'],['хочет','vil','ville'],
  ['собираюсь','skal','skulle']
 ]);
 const TERMS=FIXED.map(([ru,no,lemma])=>({ru,no,lemma:lemma||no,translation:ru}));
 const getState=()=>window.neLearnerState||null;
 const normNo=x=>String(x||'').normalize('NFKC').toLocaleLowerCase('nb-NO').trim()
  .replace(/^(?:å|en|ei|et)\s+/,'').replace(/[.,!?;:"'()[\]{}]/g,'').replace(/\s+/g,' ');
 const normRu=x=>String(x||'').normalize('NFKC').toLocaleLowerCase('ru-RU').trim().replace(/\s+/g,' ');
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const cap=(x,min,max)=>Math.max(min,Math.min(max,Number(x)||0));
 const enabled=()=>getState()?.learningV8?.languageBridgeEnabled!==false;
 const density=()=>({A1:1,A2:2,B1:3,B2:4})[getState()?.level]||1;
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
   const hit=findNext(text,from,terms);if(!hit)break;
   if(hit.start>from)out.push({text:text.slice(from,hit.start)});
   out.push({no:hit.term.no,ru:hit.term.translation,lemma:hit.term.lemma||hit.term.no,
    source:text.slice(hit.start,hit.end)});
   from=hit.end;used++;
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
  window.saveState?.();return true;
 }
 const skipContext='form,details,button,a,input,textarea,select,[contenteditable],'+
  '.feedback,.prompt,.question,.quiz,.test,.exam,.applied-sheet,.applied-prompt,'+
  '.choice-list,.translation,.lesson-question,'+
  '.nq-decision-scene,.nq-choice,.lesson-choices,.daily-word-card,'+
  '[data-no-bridge],[lang="nb"],[lang="no"],[role="alert"]';
 function eligibleBlock(block){
  if(!block.closest('.shell')||block.closest(skipContext))return false;
  if(block.closest('.lesson-exercise-v6,.exercise')&&!block.closest('.ne-lesson-coach'))return false;
  if(block.querySelector('button,a,input,textarea,select,[contenteditable]'))return false;
  // Do not rewrite text already tagged as Norwegian or Russian translations of
  // graded Norwegian examples. Keep study directions stable.
  if(block.closest('[data-bridge-exclude]'))return false;
  if(block.closest('.ne-lesson-coach')&&block.closest('.ne-coach-result,.ne-coach-feedback'))return false;
  return true;
 }
 function apply(block,terms){
  if(processed.has(block)||!eligibleBlock(block))return;
  const limit=density(),nodes=[],walker=document.createTreeWalker(block,NodeFilter.SHOW_TEXT);
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
 const selectors='.shell p,.shell li,.shell .ne-coach-hint,.shell .nq-nora-note,.shell .nq-nora-reaction p';
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
   '<p>Знакомые слова из твоего настоящего словаря появляются по-норвежски в учебных объяснениях и историях. Нажми на слово для перевода и повторения.</p>'+
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
  entries,knownWords,extractTranslation,dynamicTerm,isMastered});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
})();