// In-app rating and feature requests. User text is always rendered as text nodes.
(() => {
 const allowed=()=>Boolean(window.NEAccess?.allowed());
 async function call(action,params={}){
  const response=await fetch('/api/session',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...params}),cache:'no-store'});
  const data=await response.json().catch(()=>({}));
  if(!response.ok){const error=new Error(data.error==='RATE_LIMIT'?'Слишком много отправок. Попробуй позже.':data.error==='APPROVAL_REQUIRED'?'Сначала нужно получить одобрение владельца.':'Не удалось выполнить действие. Попробуй позже.');error.code=data.error;throw error}
  return data;
 }
 function open(){
  if(!allowed()){alert('Сначала войди и получи одобрение владельца.');return}
  shell('<div class="screen-head"><button class="back" onclick="navigate(\'settings\')" aria-label="Назад">←</button><div><h2>Оценка и пожелания</h2><p class="muted">Помоги сделать Norsk Eventyr удобнее.</p></div></div><section class="card"><form class="feedback-form" id="feedbackForm"><div><b>Как тебе приложение?</b><div class="feedback-stars" id="feedbackStars" role="radiogroup" aria-label="Оценка от 1 до 5">'+[1,2,3,4,5].map(value=>'<button type="button" role="radio" aria-label="'+value+' из 5" aria-checked="false" data-rating="'+value+'">★</button>').join('')+'</div></div><div class="feedback-field"><label for="feedbackComment">Комментарий</label><textarea id="feedbackComment" maxlength="1200" placeholder="Что понравилось или что можно улучшить?"></textarea><span class="feedback-help">Необязательно · до 1200 символов</span></div><div class="feedback-field"><label for="feedbackSuggestion">Что добавить в приложение?</label><textarea id="feedbackSuggestion" maxlength="1200" placeholder="Уроки, темы, упражнения или другие идеи"></textarea><span class="feedback-help">Необязательно · до 1200 символов</span></div><button class="btn" type="submit">Отправить отзыв</button><p id="feedbackMessage" role="status" aria-live="polite"></p></form></section>','hub');
  let rating=0;
  const buttons=[...document.querySelectorAll('#feedbackStars button')],form=document.getElementById('feedbackForm'),message=document.getElementById('feedbackMessage');
  function setRating(value){rating=value;for(const button of buttons){const selected=Number(button.dataset.rating)<=rating;button.classList.toggle('selected',selected);button.setAttribute('aria-checked',String(Number(button.dataset.rating)===rating))}}
  for(const button of buttons)button.addEventListener('click',()=>setRating(Number(button.dataset.rating)));
  form.addEventListener('submit',async event=>{event.preventDefault();if(!rating){message.textContent='Выбери оценку от 1 до 5.';return}
   const submit=form.querySelector('button[type="submit"]');submit.disabled=true;message.textContent='Отправляем…';
   try{await call('feedback_submit',{rating,comment:document.getElementById('feedbackComment').value,suggestion:document.getElementById('feedbackSuggestion').value});form.reset();setRating(0);message.textContent='Спасибо! Отзыв и пожелания отправлены владельцу.'}
   catch(error){message.textContent=error.message}
   finally{submit.disabled=false}
  });
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
    const when=document.createElement('time');const date=new Date(item.created_at);when.textContent=Number.isNaN(date.getTime())?'':date.toLocaleString('ru-RU');meta.append(who,when);
    const score=document.createElement('div');score.className='feedback-owner-rating';const stars=Math.max(0,Math.min(5,Number(item.rating)||0));score.textContent='★'.repeat(stars)+'☆'.repeat(5-stars)+' · '+String(stars)+'/5';card.append(meta,score);
    if(item.comment){const comment=document.createElement('p');comment.textContent='Комментарий: '+String(item.comment);card.append(comment)}
    if(item.suggestion){const suggestion=document.createElement('p');suggestion.textContent='Предложение: '+String(item.suggestion);card.append(suggestion)}
    list.append(card)
   }
   box.append(list);return total
  }catch(error){box.textContent=error.message;return false}
 }
 window.NEFeedback={open,ownerList};
})();