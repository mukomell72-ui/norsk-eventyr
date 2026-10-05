// Access is established by the server before any learning screen is loaded.
(() => {
 const TERMS_VERSION='2026-10-05-v1',PRIVACY_VERSION='2026-10-05-v1';
 const scripts=['data.js','app.js','voice-pack.js','v3.js','lexicon.js','elite.js','story-data.js','story.js','ui-v6.js','ui-v7.js','ui-v8.js','updates.js','feedback.js'];
 const app=document.getElementById('app'),gate=document.createElement('main');gate.id='accessGate';gate.className='access-gate';document.body.append(gate);
 let installPrompt=null,identity=null,loaded=false,loadedUser=null,loadedCount=0,busy=false,checking=null,register=false,confirmationEmail=null,installSeenSent=false;
 const safe=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const messages={LOGIN_FAILED:'Не удалось войти. Проверь адрес и пароль.',EMAIL_NOT_CONFIRMED:'Почта ещё не подтверждена. Отправь новое письмо подтверждения.',REGISTRATION_FAILED:'Не удалось зарегистрироваться. Попробуй позже.',ACCESS_UNAVAILABLE:'Не удалось проверить доступ. Проверь подключение и попробуй ещё раз.',BAD_CREDENTIALS:'Введи корректный адрес и пароль от 10 до 128 символов.',BAD_EMAIL:'Проверь адрес электронной почты.',EMAIL_DELIVERY_FAILED:'Не удалось отправить письмо подтверждения. Попробуй ещё раз позже.',CONFIRMATION_FAILED:'Ссылка подтверждения недействительна. Запроси новое письмо подтверждения.',CONFIRMATION_EXPIRED:'Эта ссылка уже использована или устарела. Отправь новое письмо подтверждения.',RATE_LIMIT:'Слишком много попыток. Подожди немного и попробуй снова.',TERMS_VERSION_MISMATCH:'Условия обновились. Открой страницу ещё раз и подтверди актуальную версию.',BAD_REFERRAL:'Ссылка приглашения повреждена.',TERMS_REQUIRED:'Сначала нужно принять пользовательское соглашение и уведомление о данных.'};
 function referralKey(){return 'ne_pending_referral'}
 function storeReferral(code){
  code=String(code||'').trim().toUpperCase();if(!/^[A-Z0-9]{12,32}$/.test(code))return;
  try{localStorage.setItem(referralKey(),JSON.stringify({code,at:Date.now()}))}catch{}
 }
 function pendingReferral(){
  try{const value=JSON.parse(localStorage.getItem(referralKey())||'null');if(!value||!/^[A-Z0-9]{12,32}$/.test(String(value.code||''))||Date.now()-Number(value.at||0)>14*86400000){localStorage.removeItem(referralKey());return null}return String(value.code)}catch{return null}
 }
 function clearPendingReferral(){try{localStorage.removeItem(referralKey())}catch{}}
 function feedbackSeenKey(){return 'ne_owner_feedback_seen:'+identity.user_id}
 function markFeedbackSeen(count){
  const total=Number(count);if(identity?.owner!==true||!Number.isFinite(total)||total<0)return false;
  try{localStorage.setItem(feedbackSeenKey(),String(Math.floor(total)));return true}catch{return false}
 }
 async function notificationCount(){
  if(identity?.owner!==true)return 0;
  const [requestsOut,feedbackOut]=await Promise.all([call('list'),call('feedback_list')]);
  const requests=Array.isArray(requestsOut.requests)?requestsOut.requests:[];
  const pending=requests.filter(item=>item.status==='pending').length;
  const feedback=feedbackOut.feedback||{},items=Array.isArray(feedback.items)?feedback.items:[];
  const rawCount=Number(feedback.count),total=Number.isFinite(rawCount)?Math.max(0,Math.floor(rawCount)):items.length;
  let seen=0;try{const stored=Number(localStorage.getItem(feedbackSeenKey())||0);seen=Number.isFinite(stored)?Math.max(0,Math.floor(stored)):0}catch{}
  return pending+Math.max(0,total-seen);
 }
 async function call(action,params={}){
  const response=await fetch('/api/session',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...params}),cache:'no-store'});
  const data=await response.json().catch(()=>({}));if(!response.ok){const e=new Error(messages[data.error]||'Не удалось выполнить действие. Попробуй позже.');e.code=data.error;throw e}return data;
 }
 function starText(value){const n=Math.max(0,Math.min(5,Math.round(Number(value)||0)));return '★'.repeat(n)+'☆'.repeat(5-n)}
 async function renderPublicRatingGate(){
  const box=document.getElementById('publicRatingGate');if(!box)return;
  try{
   const out=await call('feedback_public'),data=out.feedback||{},items=Array.isArray(data.items)?data.items:[],count=Math.max(0,Number(data.count)||0),average=Number(data.average)||0;
   box.replaceChildren();
   const summary=document.createElement('div');summary.className='feedback-public-summary';
   const score=document.createElement('div');score.className='feedback-public-score';score.textContent=count?average.toLocaleString('ru-RU',{maximumFractionDigits:1})+'/5':'—/5';
   const stars=document.createElement('div');stars.className='feedback-public-stars';stars.textContent=starText(average);
   const total=document.createElement('div');total.className='feedback-help';total.textContent=count?count+' оценок':'Оценок пока нет';
   summary.append(score,stars,total);box.append(summary);
   const addComment=item=>{const card=document.createElement('article');card.className='feedback-public-card';const meta=document.createElement('div');meta.className='feedback-owner-meta';const who=document.createElement('span');who.textContent='Пользователь Norsk Eventyr';const when=document.createElement('time');const date=new Date(item.created_at);when.textContent=Number.isNaN(date.getTime())?'':date.toLocaleDateString('ru-RU');meta.append(who,when);const rating=document.createElement('div');rating.className='feedback-owner-rating';rating.textContent=starText(item.rating);const comment=document.createElement('p');comment.textContent=String(item.comment||'');card.append(meta,rating,comment);box.append(card)};
   for(const item of items.slice(0,3))addComment(item);
   if(items.length>3){const more=document.createElement('button');more.className='btn secondary';more.textContent='Показать все комментарии';more.onclick=()=>{for(const item of items.slice(3))addComment(item);more.remove()};box.append(more)}
  }catch{box.textContent='Рейтинг временно недоступен.'}
 }
 function platformName(){
  return String(navigator.userAgentData?.platform||navigator.platform||(/Android/i.test(navigator.userAgent)?'Android':/iPhone|iPad|iPod/i.test(navigator.userAgent)?'iOS':'Web')).slice(0,80);
 }
 async function markInstalled(source){
  if(installSeenSent||!identity?.user_id)return;installSeenSent=true;
  try{await call('install_seen',{platform:platformName(),source:String(source||'unknown').slice(0,32)})}catch{installSeenSent=false}
 }
 function view(html){app.hidden=true;gate.hidden=false;gate.innerHTML='<section class="card"><div class="eyebrow">Norsk Eventyr</div>'+html+'<p id="accessMessage" role="status" aria-live="polite"></p></section><section class="card access-public-rating"><h2>Рейтинг Norsk Eventyr</h2><div id="publicRatingGate">Загрузка…</div></section>';renderPublicRatingGate()}
 function message(text){const e=document.getElementById('accessMessage');if(e)e.textContent=text}
 function login(){
  const invited=!!pendingReferral();
  const title=invited&&register?'Вас пригласили в Norsk Eventyr':'Вход в приложение';
  const intro=invited&&register?'Укажите свою электронную почту и придумайте пароль. Вам придёт письмо подтверждения. После подтверждения и принятия условий начнутся 5 бесплатных дней.':'После подтверждения почты и принятия условий доступен пробный период 5 дней. После его окончания обучение продолжится после одобрения владельца.';
  view('<h1>'+title+'</h1><p>'+intro+'</p><form id="accessLogin"><label>Электронная почта<input id="accessEmail" type="email" inputmode="email" autocomplete="email" required maxlength="254"></label><label>Пароль<input id="accessPassword" type="password" autocomplete="'+(register?'new-password':'current-password')+'" required minlength="10" maxlength="128"></label><button class="btn" type="submit">'+(register?'Создать учётную запись':'Войти')+'</button></form><button class="btn secondary" id="accessToggle">'+(register?'Уже есть учётная запись':'Создать учётную запись')+'</button>');
  document.getElementById('accessToggle').onclick=()=>{register=!register;login()};
  document.getElementById('accessLogin').onsubmit=e=>{e.preventDefault();act(async()=>{
   const email=document.getElementById('accessEmail').value.trim().toLowerCase(),password=document.getElementById('accessPassword').value;
   if(/@gmail\.con$/i.test(email)){message('Проверь адрес: вероятно, нужно gmail.com, а не gmail.con.');return}
   let out;
   try{out=await call(register?'register':'login',{email,password,...(register&&pendingReferral()?{referral_code:pendingReferral()}:{})})}
   catch(error){document.getElementById('accessPassword').value='';if(error.code==='EMAIL_NOT_CONFIRMED'){confirmationEmail=email;confirmationPending(email);message('Почта ещё не подтверждена. Отправь новое письмо и используй только последнюю ссылку.');return}throw error}
   document.getElementById('accessPassword').value='';
   if(out.confirmEmail){confirmationEmail=email;confirmationPending(email)}else await status()
  })};
 }
 function mailInboxUrl(email){
  const domain=String(email||'').split('@')[1]?.toLowerCase()||'';
  if(domain==='gmail.com'||domain==='googlemail.com')return 'https://mail.google.com/mail/u/0/#inbox';
  if(['outlook.com','hotmail.com','live.com','msn.com'].includes(domain))return 'https://outlook.live.com/mail/0/inbox';
  if(domain==='yahoo.com'||domain.endsWith('.yahoo.com'))return 'https://mail.yahoo.com/';
  if(domain==='icloud.com'||domain==='me.com'||domain==='mac.com')return 'https://www.icloud.com/mail/';
  return 'mailto:';
 }
 function openConfirmationMail(){
  const url=mailInboxUrl(confirmationEmail);
  if(url==='mailto:'){location.href=url;return}
  const opened=window.open(url,'_blank','noopener,noreferrer');
  if(!opened)location.href=url;
 }
 function confirmationPending(email){
  confirmationEmail=String(email||'').trim().toLowerCase();
  view('<h1>Подтверди почту</h1><p>Мы отправили письмо подтверждения на <b>'+safe(confirmationEmail)+'</b>.</p><p>Нажми «Подтвердить» — откроется твоя почта. Найди письмо от Norsk Eventyr и нажми ссылку подтверждения. После этого приложение откроется автоматически, а приглашение останется привязано к аккаунту.</p><button class="btn" id="accessOpenMail">Подтвердить</button><p class="muted">Если письма нет, проверь «Спам». Повторную отправку можно запросить ниже.</p><div class="row"><button class="btn secondary" id="accessResend">Отправить письмо ещё раз</button><button class="btn ghost" id="accessBackLogin">Изменить email</button></div>');
  document.getElementById('accessOpenMail').onclick=openConfirmationMail;
  document.getElementById('accessResend').onclick=()=>act(async()=>{await call('resend_confirmation',{email:confirmationEmail});message('Новое письмо отправлено. Нажми «Подтвердить» и используй последнюю полученную ссылку.')});
  document.getElementById('accessBackLogin').onclick=()=>{register=true;login()};
 }
 function terms(){
  const continuing=Boolean(identity?.trial_started_at);
  view('<h1>'+(continuing?'Обновлено уведомление о данных':'Условия использования')+'</h1><p><b>Владелец и оператор:</b> Petro Vysochinenko.</p><div class="access-terms"><h2>Пользовательское соглашение</h2><p>Norsk Eventyr — учебное приложение. Оно не является официальным сервисом Norskprøven, не присваивает официальный уровень и не гарантирует результат экзамена. Автоматические и AI-объяснения могут содержать ошибки, поэтому важную информацию следует перепроверять.</p><p>Пробный доступ действует 5 дней после первого принятия условий. Один успешно активированный приглашённый пользователь может один раз добавить пригласившему ещё 5 дней. После окончания пробного срока доступ к обучению требует одобрения владельца. При злоупотреблении или нарушении правил владелец может отказать или отозвать доступ.</p><h2>Уведомление о данных</h2><p>Для работы учётной записи обрабатываются адрес электронной почты, идентификатор аккаунта, имя в заявке, статус доступа, даты принятия условий и сведения о приглашении. При установке приложения также сохраняются время установки или первого запуска установленной версии и тип платформы, чтобы владелец видел использование приложения и срок пробного доступа.</p><p>Поставленная оценка и текст комментария могут быть показаны всем пользователям Norsk Eventyr. Поле «Что добавить в приложение?» остаётся доступным только владельцу. Прогресс хранится локально и передаётся в облако только через функцию синхронизации. Техническая инфраструктура может создавать служебные журналы запросов и ошибок.</p><p>Не отправляй в отзывы, задания или чат пароли, BankID, платёжные данные и другие секреты.</p></div><form id="accessTerms"><label class="access-check"><input id="acceptTerms" type="checkbox" required><span>Я принимаю Пользовательское соглашение '+safe(TERMS_VERSION)+'.</span></label><label class="access-check"><input id="acceptPrivacy" type="checkbox" required><span>Я ознакомился с уведомлением об обработке данных '+safe(PRIVACY_VERSION)+'.</span></label><button class="btn" type="submit">'+(continuing?'Принять и продолжить':'Принять и начать 5 дней')+'</button></form><button class="btn ghost" id="accessLogout">Выйти</button>');
  document.getElementById('accessLogout').onclick=logout;
  document.getElementById('accessTerms').onsubmit=e=>{e.preventDefault();act(async()=>{await call('accept_terms',{terms_version:TERMS_VERSION,privacy_version:PRIVACY_VERSION,referral_code:pendingReferral()});clearPendingReferral();await status()})};
 }
 function waiting(){
  const requestStatus=identity.request_status||identity.status;
  const labels={pending:'Заявка ожидает одобрения',denied:'Владелец отказал в доступе',revoked:'Доступ отозван владельцем',expired:'Пробный период завершён'};
  const canRequest=identity.status==='expired'&&requestStatus==='unrequested';
  const askFeedback=identity.feedback_prompt_due===true;
  let text='Обучение недоступно.';
  if(identity.status==='expired')text=canRequest?'Пять пробных дней завершены. Отправь заявку владельцу, чтобы продолжить обучение.':'Пять пробных дней завершены. Заявка уже отправлена владельцу.';
  if(identity.status==='pending')text='Заявка отправлена. После одобрения обучение продолжится с сохранённого места.';
  if(identity.status==='denied')text='В доступе отказано владельцем.';
  if(identity.status==='revoked')text='Ранее выданный доступ отозван владельцем.';
  const feedback=askFeedback?'<section class="trial-feedback-prompt"><h2>Оцени Norsk Eventyr</h2><p>Пробные 5 дней закончились. Поставь от 1 до 5 звёзд и, при желании, оставь комментарий.</p><div class="feedback-stars" id="trialFeedbackStars" role="radiogroup" aria-label="Оценка от 1 до 5">'+[1,2,3,4,5].map(value=>'<button type="button" role="radio" aria-label="'+value+' из 5" aria-checked="false" data-rating="'+value+'">★</button>').join('')+'</div><label>Комментарий<textarea id="trialFeedbackComment" maxlength="1200" placeholder="Что понравилось или что можно улучшить?"></textarea></label><p class="feedback-help">Комментарий будет виден всем пользователям.</p><div class="row"><button class="btn" id="trialFeedbackSubmit">Отправить оценку</button><button class="btn ghost" id="trialFeedbackLater">Не сейчас</button></div></section>':'';
  view('<h1>'+safe(labels[identity.status]||'Доступ к приложению')+'</h1><p>'+safe(identity.email||'')+'</p><p>'+safe(text)+'</p>'+feedback+(canRequest?'<form id="accessRequest"><label>Твоё имя<input id="accessName" autocomplete="name" required maxlength="80"></label><button class="btn" type="submit">Отправить заявку владельцу</button></form>':'')+'<div class="row"><button class="btn secondary" id="accessCheck">Проверить доступ</button><button class="btn ghost" id="accessLogout">Выйти</button></div>');
  if(askFeedback){
   let rating=0;const buttons=[...document.querySelectorAll('#trialFeedbackStars button')];
   const setRating=value=>{rating=value;for(const button of buttons){button.classList.toggle('selected',Number(button.dataset.rating)<=rating);button.setAttribute('aria-checked',String(Number(button.dataset.rating)===rating))}};
   for(const button of buttons)button.onclick=()=>setRating(Number(button.dataset.rating));
   document.getElementById('trialFeedbackSubmit').onclick=()=>act(async()=>{if(!rating){message('Выбери оценку от 1 до 5 звёзд.');return}await call('feedback_submit',{rating,comment:document.getElementById('trialFeedbackComment').value,suggestion:''});identity.feedback_submitted=true;identity.feedback_prompt_due=false;await status()});
   document.getElementById('trialFeedbackLater').onclick=()=>{document.querySelector('.trial-feedback-prompt')?.remove()};
  }
  if(canRequest)document.getElementById('accessRequest').onsubmit=e=>{e.preventDefault();act(async()=>{await call('request',{name:document.getElementById('accessName').value});await status()})};
  document.getElementById('accessCheck').onclick=()=>act(status);document.getElementById('accessLogout').onclick=logout;
 }
 async function act(fn){if(busy)return;busy=true;gate.querySelectorAll('button').forEach(b=>b.disabled=true);try{await fn()}catch(e){message(e.message||messages.ACCESS_UNAVAILABLE)}finally{busy=false;gate.querySelectorAll('button').forEach(b=>b.disabled=false)}}
 function scopeStorage(){
  const scoped=['ne2_state','ne2_state_before_import','ne2_state_before_reset','ne_cloud_link','ne_session'];
  const proto=Storage.prototype,get=proto.getItem,set=proto.setItem,remove=proto.removeItem;
  const prefix='ne_user_'+identity.user_id+':';
  if(identity.owner&&!get.call(localStorage,prefix+'migrated')){
   for(const key of scoped){const old=get.call(localStorage,key);if(old!==null&&get.call(localStorage,prefix+key)===null)set.call(localStorage,prefix+key,old)}
   set.call(localStorage,prefix+'migrated','1');
  }
  proto.getItem=function(key){return get.call(this,scoped.includes(String(key))?prefix+key:key)};
  proto.setItem=function(key,value){return set.call(this,scoped.includes(String(key))?prefix+key:key,value)};
  proto.removeItem=function(key){return remove.call(this,scoped.includes(String(key))?prefix+key:key)};
 }
 async function load(){
  if(loadedUser&&loadedUser!==identity.user_id){location.reload();return}
  if(!loaded){if(!loadedUser){scopeStorage();loadedUser=identity.user_id}for(const name of scripts.slice(loadedCount)){await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='/'+name+'?v=7.3.7';s.onload=resolve;s.onerror=reject;document.body.append(s)}) ;loadedCount++}await new Promise(resolve=>setTimeout(resolve,250));loaded=true}
  gate.hidden=true;app.hidden=false;
  if(isInstalled())markInstalled('standalone');
 }
 async function status(){
  if(checking)return checking;
  checking=(async()=>{
   try{
    identity=await call('status');
    if(identity.status==='terms_required'){terms();return false}
    clearPendingReferral();
    if(identity.access_granted===true){await load();return true}
    waiting();return false;
   }catch(e){identity=null;if(e.code==='LOGIN_REQUIRED')login();else{view('<h1>Проверка доступа недоступна</h1><p>Для проверки доступа нужно подключение к интернету.</p><button class="btn" id="accessRetry">Повторить</button>');message(e.message);document.getElementById('accessRetry').onclick=()=>act(status)}return false}
  })();try{return await checking}finally{checking=null}
 }
 async function logout(){await act(async()=>{if(loaded&&typeof saveState==='function')saveState();await call('logout');location.reload()})}
 function formatTrial(value){if(!value)return '';try{return new Date(value).toLocaleString('ru-RU',{dateStyle:'medium',timeStyle:'short'})}catch{return String(value)}}
 async function panel(){
  const userStatus=identity?.status==='trial'?'<p>Пробный доступ активен до <b>'+safe(formatTrial(identity.trial_ends_at))+'</b>.</p>':identity?.owner?'<p>Учётная запись владельца.</p>':'<p>Доступ одобрен владельцем.</p>';
  view('<h1>Доступ к приложению</h1><p>'+safe(identity?.email)+'</p>'+userStatus+'<div class="row"><button class="btn secondary" id="accessBack">К обучению</button><button class="btn ghost" id="accessLogout">Выйти</button></div>'+(identity?.owner?'<h2>Пользователи и пробный доступ</h2><p>Здесь видны регистрация, установка или первый запуск установленной версии, окончание пробного периода и статус заявки.</p><button class="btn secondary" id="accessRefreshList">Обновить список</button><div id="accessList">Загрузка…</div><h2>Отзывы и идеи</h2><p>Оценки, комментарии и пожелания пользователей.</p><button class="btn secondary" id="feedbackRefresh">Обновить отзывы</button><div id="feedbackList">Загрузка…</div>':'<p>Приглашённый друг может один раз добавить тебе ещё 5 дней пробного доступа.</p>'));
  document.getElementById('accessBack').onclick=()=>act(status);document.getElementById('accessLogout').onclick=logout;
  if(!identity?.owner)return;
  async function list(){try{const out=await call('list');const box=document.getElementById('accessList');if(!box)return;box.replaceChildren();for(const item of out.requests){const card=document.createElement('article');card.className='card owner-user-card';const title=document.createElement('h3');title.textContent=String(item.display_name||item.email||'Пользователь');const status=document.createElement('p');status.textContent=String(item.email||'')+' · '+({unrequested:'Заявка не отправлена',pending:'Ожидает одобрения',approved:'Одобрен',denied:'Отказано',revoked:'Отозван'}[item.status]||item.status);card.append(title,status);const facts=document.createElement('div');facts.className='owner-user-facts';const add=(label,value)=>{const p=document.createElement('p');p.textContent=label+': '+(value?formatTrial(value):'—');facts.append(p)};add('Регистрация',item.registered_at);add('Подтверждение почты',item.email_confirmed_at);add('Начало пробного периода',item.trial_started_at);add('Пробный период до',item.trial_ends_at);add('Установка / первый запуск',item.first_installed_at);if(item.first_installed_at&&item.install_platform){const p=document.createElement('p');p.textContent='Платформа: '+String(item.install_platform);facts.append(p)}card.append(facts);if(['pending','approved','denied','revoked'].includes(item.status)){const row=document.createElement('div');row.className='row';for(const [value,label] of [['approved','Одобрить'],['denied','Отказать'],['revoked','Отозвать доступ']]){if(value===item.status)continue;const button=document.createElement('button');button.className='btn secondary';button.textContent=label;button.onclick=()=>act(async()=>{await call('decide',{user_id:item.user_id,status:value});await list();await window.NEOwnerBadge?.refresh()});row.append(button)}card.append(row)}box.append(card)}if(!out.requests.length)box.textContent='Пользователей пока нет.'}catch(e){message(e.message)}}
  document.getElementById('accessRefreshList').onclick=()=>act(list);await list();
  async function refreshFeedback(){const total=await window.NEFeedback.ownerList();if(typeof total==='number')markFeedbackSeen(total);await window.NEOwnerBadge?.refresh()}
  document.getElementById('feedbackRefresh').onclick=()=>act(refreshFeedback);await refreshFeedback();
 }
 function isInstalled(){
  return window.matchMedia?.('(display-mode: standalone)')?.matches===true||window.navigator.standalone===true;
 }
 async function install(){
  if(!await status())return;
  if(isInstalled()){alert('Norsk Eventyr уже установлено на этом устройстве.');return}
  if(installPrompt){
   await installPrompt.prompt();
   const choice=await installPrompt.userChoice;
   if(choice?.outcome==='accepted')installPrompt=null;
   return;
  }
  const ua=String(navigator.userAgent||''),ios=/iPad|iPhone|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  if(ios){
   alert('На iPhone/iPad открой Norsk Eventyr в Safari, нажми «Поделиться» внизу экрана → «На экран Домой» → «Добавить».');
   return;
  }
  alert('Открой меню браузера ⋮ и выбери «Установить приложение» или «Добавить на главный экран».');
 }
 async function shareInfo(){return call('share_info')}
 window.NEAccess={status,panel,logout,install,isInstalled,shareInfo,ready:()=>loaded,allowed:()=>identity?.access_granted===true,isOwner:()=>identity?.owner===true,notificationCount,info:()=>identity?{...identity}:null};
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e});
 window.addEventListener('appinstalled',()=>{installPrompt=null;markInstalled('appinstalled')});
 window.addEventListener('focus',()=>{if(loaded&&!gate.querySelector('#accessList'))status()});
 setInterval(()=>{if(loaded&&!document.hidden&&!busy&&!checking&&!gate.querySelector('#accessList'))status()},60000);
 view('<h1>Проверяем доступ…</h1>');
 (async()=>{
  const params=new URLSearchParams(location.search),ref=params.get('ref');if(ref)storeReferral(ref);
  if(pendingReferral())register=true;
  if(params.has('token_hash')){
   const hash=params.get('token_hash'),type=params.get('type');history.replaceState(null,'',location.pathname);
   try{await call('confirm',{token_hash:hash,type});confirmationEmail=null}catch(e){login();message(e.message+' Отправь новое письмо подтверждения и используй только последнюю ссылку.');return}
  }else if(params.has('ref'))history.replaceState(null,'',location.pathname);
  await status();
 })();
})();
