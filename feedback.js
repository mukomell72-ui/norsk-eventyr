// In-app public rating, comments, private suggestions, and owner review list.
(() => {
 const allowed=()=>Boolean(window.NEAccess?.allowed());
 async function call(action,params={}){
  const response=await fetch('/api/session',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...params}),cache:'no-store'});
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
   const text=data.error==='RATE_LIMIT'?'Слишком много отправок. Попробуй позже.':
    data.error==='APPROVAL_REQUIRED'?'Сначала нужно войти в Norsk Eventyr.':'Не удалось выполнить действие. Попробуй позже.';
   const error=new Error(text);error.code=data.error;throw error
  }
  return data;
 }
 function stars(value){const n=Math.max(0,Math.min(5,Math.round(Number(value)||0)));return '★'.repeat(n)+'☆'.repeat(5-n)}
 function dateText(value){const date=new Date(value);return Number.isNaN(date.getTime())?'':date.toLocaleDateString('ru-RU')}
 async function mountPublic(id,limit=3){
  const box=document.getElementById(id);if(!box)return false;
  box.textContent='Загружаем рейтинг…';
  try{
   const out=await call('feedback_public'),data=out.feedback||{},items=Array.isArray(data.items)?data.items:[],count=Math.max(0,Number(data.count)||0),average=Number(data.average)||0;
   box.replaceChildren();
   const summary=document.createElement('div');summary.className='feedback-public-summary';
   const score=document.createElement('div');score.className='feedback-public-score';score.textContent=count?average.toLocaleString('ru-RU',{maximumFractionDigits:1})+'/5':'—/5';
   const row=document.createElement('div');row.className='feedback-public-stars';row.textContent=stars(average);
   const countNode=document.createElement('div');countNode.className='feedback-help';countNode.textContent=count?count+' оценок':'Оценок пока нет';
   summary.append(score,row,countNode);box.append(summary);
   const visible=items.slice(0,Math.max(0,Number(limit)||0));
   if(visible.length){
    const list=document.createElement('div');list.className='feedback-public-list';
    for(const item of visible){
     const card=document.createElement('article');card.className='feedback-public-card';
     const meta=document.createElement('div');meta.className='feedback-owner-meta';
     const who=document.createElement('span');who.textContent='Пользователь Norsk Eventyr';
     const when=document.createElement('time');when.textContent=dateText(item.created_at);meta.append(who,when);
     const rating=document.createElement('div');rating.className='feedback-owner-rating';rating.textContent=stars(item.rating);
     const comment=document.createElement('p');comment.textContent=String(item.comment||'');
     card.append(meta,rating,comment);list.append(card)
    }
    box.append(list)
   }else{
    const empty=document.createElement('p');empty.className='feedback-help';empty.textContent='Комментариев пока нет.';box.append(empty)
   }
   return {count,average,items}
  }catch(error){box.textContent=error.message;return false}
 }
 function openPublic(){
  shell('<div class="screen-head"><button class="back" onclick="navigate(\'settings\')" aria-label="Назад">←</button><div><h2>Рейтинг и комментарии</h2><p class="muted">Оценки пользователей Norsk Eventyr.</p></div></div><section class="card"><div id="feedbackPublicFull">Загрузка…</div></section>','hub');
  mountPublic('feedbackPublicFull',50);
 }
 function open(){
  if(!allowed()){alert('Сначала войди в Norsk Eventyr.');return}
  shell('<div class="screen-head"><button class="back" onclick="navigate(\'settings\')" aria-label="Назад">←</button><div><h2>Оценка и пожелания</h2><p class="muted">Помоги сделать Norsk Eventyr удобнее.</p></div></div><section class="card"><form class="feedback-form" id="feedbackForm"><div><b>Как тебе приложение?</b><div class="feedback-stars" id="feedbackStars" role="radiogroup" aria-label="Оценка от 1 до 5">'+[1,2,3,4,5].map(value=>'<button type="button" role="radio" aria-label="'+value+' из 5" aria-checked="false" data-rating="'+value+'">★</button>').join('')+'</div></div><div class="feedback-field"><label for="feedbackComment">Комментарий</label><textarea id="feedbackComment" maxlength="1200" placeholder="Что понравилось или что можно улучшить?"></textarea><span class="feedback-help">Комментарий будет виден всем пользователям · до 1200 символов</span></div><div class="feedback-field"><label for="feedbackSuggestion">Что добавить в приложение?</label><textarea id="feedbackSuggestion" maxlength="1200" placeholder="Уроки, темы, упражнения или другие идеи"></textarea><span class="feedback-help">Это предложение увидит только владелец · необязательно</span></div><button class="btn" type="submit">Отправить оценку</button><p id="feedbackMessage" role="status" aria-live="polite"></p></form></section><section class="card"><h3>Рейтинг пользователей</h3><div id="feedbackPublicAfterForm">Загрузка…</div></section>','hub');
  let rating=0;
  const buttons=[...document.querySelectorAll('#feedbackStars button')],form=document.getElementById('feedbackForm'),message=document.getElementById('feedbackMessage');
  function setRating(value){rating=value;for(const button of buttons){const selected=Number(button.dataset.rating)<=rating;button.classList.toggle('selected',selected);button.setAttribute('aria-checked',String(Number(button.dataset.rating)===rating))}}
  for(const button of buttons)button.addEventListener('click',()=>setRating(Number(button.dataset.rating)));
  form.addEventListener('submit',async event=>{event.preventDefault();if(!rating){message.textContent='Выбери оценку от 1 до 5 звёзд.';return}
   const submit=form.querySelector('button[type="submit"]');submit.disabled=true;message.textContent='Отправляем…';
   try{await call('feedback_submit',{rating,comment:document.getElementById('feedbackComment').value,suggestion:document.getElementById('feedbackSuggestion').value});form.reset();setRating(0);message.textContent='Спасибо! Оценка сохранена. Комментарий появился в общем рейтинге.';await mountPublic('feedbackPublicAfterForm',10)}
   catch(error){message.textContent=error.message}
   finally{submit.disabled=false}
  });
  mountPublic('feedbackPublicAfterForm',10);
 }
 async function ownerList(){
  const box=document.getElementById('feedbackList');if(!box)return false;
  box.textContent='Загружаем отзывы…';
  try{
   const out=await call('feedback_list'),data=out.feedback||{},items=Array.isArray(data.items)?data.items:[],rawCount=Number(data.count),total=Number.isFinite(rawCount)?Math.max(0,Math.floor(rawCount)):items.length;
   box.replaceChildren();
   const summary=document.createElement('p');summary.className='feedback-help';summary.textContent='Всего: '+String(total)+' · средняя оценка: '+(Number.isFinite(Number(data.average))?Number(data.average).toLocaleString('ru-RU'):'—')+'/5';box.append(summary);
   if(!items.length){const empty=document.createElement('p');empty.textContent='Отзывов пока нет.';box.append(empty);return total}
   const list=document.createElement('div');list.className='feedback-owner-list';
   for(const item of items){
    const card=document.createElement('article');card.className='feedback-owner-card';
    const meta=document.createElement('div');meta.className='feedback-owner-meta';
    const who=document.createElement('span');who.textContent=String(item.email||'Пользователь');
    const when=document.createElement('time');when.textContent=dateText(item.created_at);meta.append(who,when);
    const score=document.createElement('div');score.className='feedback-owner-rating';score.textContent=stars(item.rating)+' · '+String(Math.max(0,Math.min(5,Number(item.rating)||0)))+'/5';card.append(meta,score);
    if(item.comment){const comment=document.createElement('p');comment.textContent='Публичный комментарий: '+String(item.comment);card.append(comment)}
    if(item.suggestion){const suggestion=document.createElement('p');suggestion.textContent='Личное предложение: '+String(item.suggestion);card.append(suggestion)}
    list.append(card)
   }
   box.append(list);return total
  }catch(error){box.textContent=error.message;return false}
 }
 window.NEFeedback={open,openPublic,mountPublic,ownerList};
})();