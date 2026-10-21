// Språkbro: safely bridge Russian explanatory prose to mastered Norwegian words.
// This never changes questions, answers, accessible button labels, or CEFR scores.
(() => {
 'use strict';
 const TERMS=Object.freeze([
  {ru:'сегодня',no:'i dag',translation:'сегодня'},
  {ru:'завтра',no:'i morgen',translation:'завтра'},
  {ru:'вчера',no:'i går',translation:'вчера'},
  {ru:'спасибо',no:'takk',translation:'спасибо'},
  {ru:'работа',no:'jobb',translation:'работа'},
  {ru:'помощь',no:'hjelp',translation:'помощь'},
  {ru:'школа',no:'skole',translation:'школа'},
  {ru:'друг',no:'venn',translation:'друг'},
  {ru:'хлеб',no:'brød',translation:'хлеб'},
  {ru:'молоко',no:'melk',translation:'молоко'},
  {ru:'слово',no:'ord',translation:'слово'},
  {ru:'дом',no:'hjem',translation:'дом'}
 ]);
 const roots=new WeakMap();
 let root=null,observer=null,busy=false;
 const escapeHtml=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;'}[c]));
 const key=x=>String(x||'').trim().normalize('NFKC').toLocaleLowerCase('nb-NO')
  .replace(/^(?:å|en|ei|et)\s+/,'').replace(/[.,!?;:"'()[\]{}]/g,'').replace(/\s+/g,' ');
 const getState=()=>window.neLearnerState||null;
 const enabled=()=>getState()?.learningV8?.languageBridgeEnabled!==false;
 function entries(){
  const s=getState();if(!s)return [];
  const dictionary=Object.values(s.dailyDictionary||{});
  const srs=Object.values(s.srs||{});
  return TERMS.filter(term=>{
   const k=key(term.no);
   const d=dictionary.find(x=>key(x?.lemma||x?.word)===k);
   const sr=srs.find(x=>key(x?.word)===k);
   const provenByDictionary=d&&Number(d.correct)>=2&&Number(d.exposures)>=2&&Number(d.correct)>Number(d.wrong||0);
   const provenByReview=sr&&Number(sr.stage)>=2&&Number(sr.correct)>=2;
   return provenByDictionary||provenByReview;
  }).sort((a,b)=>b.ru.length-a.ru.length);
 }
 const letter=c=>!!c&&/[\p{L}\p{M}]/u.test(c);
 function findNext(text,from,terms){
  const folded=text.toLocaleLowerCase('ru-RU');let found=null;
  for(const term of terms){
   let at=folded.indexOf(term.ru,from);
   while(at!==-1){
    const end=at+term.ru.length;
    if(!letter(text[at-1])&&!letter(text[end])){
     if(!found||at<found.start||(at===found.start&&term.ru.length>found.term.ru.length))
      found={term,start:at,end};
     break;
    }
    at=folded.indexOf(term.ru,at+1);
   }
  }
  return found;
 }
 // Exposed as pure logic for regression tests; only vetted forms may be replaced.
 function segments(text,terms,limit){
  const out=[];let pos=0,used=0;
  while(used<limit){
   const hit=findNext(text,pos,terms);if(!hit)break;
   if(hit.start>pos)out.push({text:text.slice(pos,hit.start)});
   out.push({no:hit.term.no,ru:hit.term.translation,source:text.slice(hit.start,hit.end)});
   used++;pos=hit.end;
  }
  if(pos<text.length)out.push({text:text.slice(pos)});
  return out.length?out:[{text}];
 }
 function queueForgotten(no){
  const s=getState(),k=key(no),now=Date.now();if(!s||!k)return false;
  const daily=Object.values(s.dailyDictionary||{}).find(x=>key(x?.lemma||x?.word)===k);
  const record=Object.values(s.srs||{}).find(x=>key(x?.word)===k);
  if(!daily&&!record)return false; // Never invent vocabulary records from UI prose.
  s.wordPracticeQueue=s.wordPracticeQueue||{};
  s.wordPracticeQueue[k]=now;
  if(daily){daily.nextDue=now;daily.lastBridgeLookup=new Date(now).toISOString();
   daily.bridgeLookups=(Number(daily.bridgeLookups)||0)+1;}
  if(record){record.due=now;}
  window.saveState?.();
  return true;
 }
 function skip(element){
  if(!element.closest('.shell'))return true;
  if(element.closest('form,details,.feedback,.choice-list,.translation,.prompt,[data-no-bridge]'))return true;
  if(element.closest('.exercise,.lesson-exercise-v6')&&!element.closest('.ne-lesson-coach'))return true;
  if(element.querySelector('input,textarea,button,select,[contenteditable],a'))return true;
  return false;
 }
 function apply(block,terms){
  if(roots.has(block)||skip(block))return;
  const limit=({A1:1,A2:2,B1:3,B2:4})[getState()?.level]||1;
  const walker=document.createTreeWalker(block,NodeFilter.SHOW_TEXT);
  const texts=[];while(walker.nextNode()){
   const node=walker.currentNode;
   if(!node.parentElement?.closest('button,a,code,pre,kbd,[data-no-bridge],.ne-bridge-word'))texts.push(node);
  }
  let count=0;
  for(const node of texts){
   if(count>=limit)break;
   const parts=segments(node.nodeValue||'',terms,limit-count);
   if(!parts.some(x=>x.no))continue;
   if(!roots.has(block))roots.set(block,block.innerHTML);
   const fragment=document.createDocumentFragment();
   for(const part of parts){
    if(!part.no){fragment.appendChild(document.createTextNode(part.text));continue}
    const button=document.createElement('button');
    button.type='button';button.className='ne-bridge-word';button.lang='nb';
    button.textContent=part.no;
    button.dataset.neWord=part.no;button.dataset.neTranslation=part.ru;
    button.setAttribute('aria-label',part.no+' — показать русский перевод');
    button.setAttribute('aria-expanded','false');
    fragment.appendChild(button);count++;
   }
   node.parentNode.replaceChild(fragment,node);
  }
 }
 function process(){
  if(busy||!root||!enabled())return;
  const terms=entries();if(!terms.length)return;
  busy=true;
  try{for(const p of root.querySelectorAll('.shell p'))apply(p,terms);}
  finally{busy=false}
 }
 function restore(){
  if(!root)return;
  for(const block of root.querySelectorAll('.shell p')){
   if(roots.has(block)){block.innerHTML=roots.get(block);roots.delete(block)}
  }
 }
 function toggle(){
  const s=getState();if(!s)return;
  s.learningV8=s.learningV8||{};
  s.learningV8.languageBridgeEnabled=!enabled();
  window.saveState?.();
  if(!enabled())restore();else process();
  const control=document.getElementById('neLanguageBridgeToggle');
  if(control){
   control.textContent=enabled()?'Выключить языковой мост':'Включить языковой мост';
   control.setAttribute('aria-pressed',String(enabled()));
  }
 }
 function controlHtml(){
  return '<section class="card ne-bridge-settings"><h3>Språkbro · Языковой мост</h3>'+
   '<p>Знакомые слова постепенно появляются по-норвежски в объяснениях. Нажми на забытое слово — перевод откроется, а слово вернётся в повторение.</p>'+
   '<button id="neLanguageBridgeToggle" type="button" class="btn secondary" aria-pressed="'+enabled()+'" onclick="NELanguageBridge.toggle()">'+
   (enabled()?'Выключить языковой мост':'Включить языковой мост')+'</button>'+
   '</section>';
 }
 function onClick(event){
  const button=event.target?.closest?.('.ne-bridge-word');
  if(!button||!root?.contains(button))return;
  const wasOpen=button.getAttribute('aria-expanded')==='true';
  for(const b of root.querySelectorAll('.ne-bridge-word[aria-expanded="true"]')){
   b.setAttribute('aria-expanded','false');b.nextElementSibling?.classList?.contains('ne-bridge-gloss')&&b.nextElementSibling.remove();
  }
  if(wasOpen)return;
  const remembered=queueForgotten(button.dataset.neWord);
  const gloss=document.createElement('span');gloss.className='ne-bridge-gloss';
  gloss.setAttribute('role','status');gloss.lang='ru';
  gloss.textContent=button.dataset.neTranslation+(remembered?' · добавлено в повторение':'');
  button.insertAdjacentElement('afterend',gloss);
  button.setAttribute('aria-expanded','true');
 }
 function mount(){
  root=document.getElementById('app');
  if(!root||typeof MutationObserver!=='function')return;
  root.addEventListener('click',onClick);
  observer=new MutationObserver(()=>process());
  observer.observe(root,{subtree:true,childList:true});
  process();
 }
 window.NELanguageBridge=Object.freeze({controlHtml,toggle,process,segments,queueForgotten,entries});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
})();