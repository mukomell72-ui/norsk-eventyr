// Access is established by the server before any learning screen is loaded.
(() => {
 const TERMS_VERSION='2026-10-08-v2',PRIVACY_VERSION='2026-10-08-v4';
 const ASSET_REV='8.0.1-access-r1',scripts=['data.js','curriculum-v8.js','adaptive-teacher.js','app.js','voice-pack.js','v3.js','lexicon.js','elite.js','story-data.js','story.js','ui-v6.js','ui-v7.js','ui-v8.js','updates.js','feedback.js'];
 const app=document.getElementById('app'),gate=document.createElement('main');gate.id='accessGate';gate.className='access-gate';document.body.append(gate);
 let installPrompt=null,identity=null,loaded=false,loadedUser=null,loadedCount=0,busy=false,checking=null,register=false,confirmationEmail=null,installSeenSent=false,errorReportBusy=false,growthActivityDateSent='';
 const safe=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function deviceId(){
  const key='ne_device_id_v1';
  try{
   let value=localStorage.getItem(key);
   if(value&&/^[A-Za-z0-9_-]{16,80}$/.test(value))return value;
   const raw=crypto?.randomUUID?.()||([Date.now(),Math.random().toString(36).slice(2),Math.random().toString(36).slice(2)].join('-'));
   value=('d_'+raw).replace(/[^A-Za-z0-9_-]/g,'').slice(0,80);
   localStorage.setItem(key,value);return value;
  }catch{return 'd_'+String(Date.now())+'_'+Math.random().toString(36).slice(2,14)}
 }
 function deviceName(){
  const ua=String(navigator.userAgent||'');
  const platform=String(navigator.userAgentData?.platform||navigator.platform||(/Android/i.test(ua)?'Android':/iPhone|iPad|iPod/i.test(ua)?'iOS':'Web')).slice(0,50);
  const browser=/Edg//.test(ua)?'Edge':/OPR//.test(ua)?'Opera':/Chrome//.test(ua)?'Chrome':/Firefox//.test(ua)?'Firefox':/Safari//.test(ua)?'Safari':'Browser';
  return (platform+' · '+browser).slice(0,120);
 }
 function deviceHeaders(){return {'x-ne-device-id':deviceId(),'x-ne-device-name':deviceName()}}

 const messages={LOGIN_FAILED:'Не удалось войти. Проверь адрес и пароль.',EMAIL_NOT_CONFIRMED:'Почта ещё не подтверждена. Отправь новое письмо подтверждения.',REGISTRATION_FAILED:'Не удалось зарегистрироваться. Попробуй позже.',ACCESS_UNAVAILABLE:'Не удалось проверить доступ. Проверь подключение и попробуй ещё раз.',BAD_CREDENTIALS:'Введи корректный адрес и пароль от 10 до 128 символов.',BAD_EMAIL:'Проверь адрес электронной почты.',EMAIL_DELIVERY_FAILED:'Не удалось отправить письмо подтверждения. Попробуй ещё раз позже.',PASSWORD_RESET_UNAVAILABLE:'Не удалось отправить письмо восстановления. Попробуй ещё раз позже.',RECOVERY_FAILED:'Ссылка восстановления недействительна или устарела. Запроси новое письмо.',BAD_NEW_PASSWORD:'Новый пароль должен содержать от 10 до 128 символов.',PASSWORD_UPDATE_FAILED:'Не удалось изменить пароль. Запроси новую ссылку восстановления.',CONFIRMATION_FAILED:'Ссылка подтверждения недействительна. Запроси новое письмо подтверждения.',CONFIRMATION_EXPIRED:'Эта ссылка уже использована или устарела. Отправь новое письмо подтверждения.',RATE_LIMIT:'Слишком много попыток. Подожди немного и попробуй снова.',TERMS_VERSION_MISMATCH:'Условия обновились. Открой страницу ещё раз и подтверди актуальную версию.',BAD_REFERRAL:'Ссылка приглашения повреждена.',TERMS_REQUIRED:'Сначала нужно принять пользовательское соглашение и уведомление о данных.',DEVICE_REQUIRED:'Не удалось определить это устройство. Обнови страницу и попробуй снова.',DEVICE_LIMIT:'Для аккаунта уже зарегистрировано 2 устройства. Попроси владельца сбросить список устройств.',CONCURRENT_DEVICE:'Этот аккаунт сейчас используется на другом устройстве. Закрой его там или подожди около 3 минут.',BAD_PROMO:'Проверь промокод.',PROMO_UNAVAILABLE:'Промокод недействителен, отключён или закончились активации.',PROMO_ALREADY_USED:'Этот промокод уже использован на данном аккаунте.'};
 function referralKey(){return 'ne_pending_referral'}
 function storeReferral(code){
  code=String(code||'').trim().toUpperCase();if(!/^[A-Z0-9]{12,32}$/.test(code))return;
  try{localStorage.setItem(referralKey(),JSON.stringify({code,at:Date.now()}))}catch{}
 }
 function pendingReferral(){
  try{const value=JSON.parse(localStorage.getItem(referralKey())||'null');if(!value||!/^[A-Z0-9]{12,32}$/.test(String(value.code||''))||Date.now()-Number(value.at||0)>14*86400000){localStorage.removeItem(referralKey());return null}return String(value.code)}catch{return null}
 }
 function clearPendingReferral(){try{localStorage.removeItem(referralKey())}catch{}}
 function acquisitionKey(){return 'ne_acquisition_first_touch'}
 function cleanCampaignTag(value,max){return String(value||'').trim().toLowerCase().replace(/[^a-z0-9_.-]/g,'').slice(0,max)}
 function captureAcquisition(params){
  try{
   if(localStorage.getItem(acquisitionKey()))return;
   const source=cleanCampaignTag(params.get('utm_source')||(params.get('ref')?'referral':''),40);
   const campaign=cleanCampaignTag(params.get('utm_campaign'),80);
   const medium=cleanCampaignTag(params.get('utm_medium'),40);
   localStorage.setItem(acquisitionKey(),JSON.stringify({source:source||'direct',campaign,medium,at:Date.now()}));
  }catch{}
 }
 function acquisitionData(){
  try{
   const value=JSON.parse(localStorage.getItem(acquisitionKey())||'null')||{};
   return {utm_source:cleanCampaignTag(value.source||'direct',40),utm_campaign:cleanCampaignTag(value.campaign,80),utm_medium:cleanCampaignTag(value.medium,40)};
  }catch{return {utm_source:'direct',utm_campaign:'',utm_medium:''}}
 }
 async function markFirstVisit(){
  const key='ne_growth_first_visit_recorded';
  try{if(localStorage.getItem(key)==='1')return}catch{}
  try{await call('growth_first_visit');try{localStorage.setItem(key,'1')}catch{}}catch{}
 }
 async function markGrowthActivity(){
  if(!identity?.user_id||identity?.owner===true)return;
  const now=new Date(),today=String(now.getFullYear())+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');if(growthActivityDateSent===today)return;
  growthActivityDateSent=today;
  try{await call('growth_activity')}catch{growthActivityDateSent=''}
 }
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
  const response=await fetch('/api/session',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',...deviceHeaders()},body:JSON.stringify({action,...params}),cache:'no-store'});
  const data=await response.json().catch(()=>({}));if(!response.ok){const e=new Error(messages[data.error]||'Не удалось выполнить действие. Попробуй позже.');e.code=data.error;throw e}return data;
 }
 async function reportClientError(code,error){
  if(errorReportBusy||!identity?.user_id)return;
  const messageText=String(error?.message||error||'').trim();if(!messageText)return;
  errorReportBusy=true;
  try{
   await fetch('/api/session',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',...deviceHeaders()},body:JSON.stringify({
    action:'client_error',code:String(code||'CLIENT_ERROR').slice(0,80),message:messageText.slice(0,500),
    path:String(location.pathname||'/').slice(0,300),app_version:'8.0.1',user_agent:String(navigator.userAgent||'').slice(0,250)
   }),cache:'no-store'});
  }catch{}finally{setTimeout(()=>{errorReportBusy=false},1500)}
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
 function view(html){app.hidden=true;gate.hidden=false;gate.classList.remove('admin-host');gate.innerHTML='<section class="card"><div class="eyebrow">Norsk Eventyr</div>'+html+'<p id="accessMessage" role="status" aria-live="polite"></p></section><section class="card access-public-rating"><h2>Рейтинг Norsk Eventyr</h2><div id="publicRatingGate">Загрузка…</div></section>';renderPublicRatingGate()}
 function message(text){const e=document.getElementById('accessMessage');if(e)e.textContent=text}
 function login(){
  const invited=!!pendingReferral();
  const title=invited&&register?'Вас пригласили в Norsk Eventyr':'Вход в приложение';
  const intro=invited&&register?'Укажите свою электронную почту и придумайте пароль. Вам придёт письмо подтверждения. После подтверждения и принятия условий начнутся 5 бесплатных дней.':'После подтверждения почты и принятия условий доступен пробный период 5 дней. После его окончания обучение продолжится после одобрения владельца.';
  const forgot=register?'':'<button class="btn ghost" id="accessForgot" type="button">Забыли пароль?</button>';
  view('<h1>'+title+'</h1><p>'+intro+'</p><form id="accessLogin"><label>Электронная почта<input id="accessEmail" type="email" inputmode="email" autocomplete="email" required maxlength="254"></label><label>Пароль<input id="accessPassword" type="password" autocomplete="'+(register?'new-password':'current-password')+'" required minlength="10" maxlength="128"></label><button class="btn" type="submit">'+(register?'Создать учётную запись':'Войти')+'</button></form>'+forgot+'<button class="btn secondary" id="accessToggle">'+(register?'Уже есть учётная запись':'Создать учётную запись')+'</button>');
  document.getElementById('accessToggle').onclick=()=>{register=!register;login()};
  const forgotButton=document.getElementById('accessForgot');if(forgotButton)forgotButton.onclick=passwordResetRequest;
  document.getElementById('accessLogin').onsubmit=e=>{e.preventDefault();act(async()=>{
   const email=document.getElementById('accessEmail').value.trim().toLowerCase(),password=document.getElementById('accessPassword').value;
   if(/@gmail\.con$/i.test(email)){message('Проверь адрес: вероятно, нужно gmail.com, а не gmail.con.');return}
   let out;
   try{out=await call(register?'register':'login',{email,password,...(register&&pendingReferral()?{referral_code:pendingReferral()}:{}),...(register?acquisitionData():{})})}
   catch(error){document.getElementById('accessPassword').value='';if(error.code==='EMAIL_NOT_CONFIRMED'){confirmationEmail=email;confirmationPending(email);message('Почта ещё не подтверждена. Отправь новое письмо и используй только последнюю ссылку.');return}throw error}
   document.getElementById('accessPassword').value='';
   if(out.confirmEmail){confirmationEmail=email;confirmationPending(email)}else await status()
  })};
 }
 function passwordResetRequest(){
  register=false;
  view('<h1>Восстановление пароля</h1><p>Укажи электронную почту своего аккаунта Norsk Eventyr. Если аккаунт существует, на неё придёт письмо со ссылкой для создания нового пароля.</p><form id="passwordResetRequest"><label>Электронная почта<input id="passwordResetEmail" type="email" inputmode="email" autocomplete="email" required maxlength="254"></label><button class="btn" type="submit">Отправить ссылку</button></form><button class="btn ghost" id="passwordResetBack" type="button">Назад ко входу</button>');
  document.getElementById('passwordResetBack').onclick=login;
  document.getElementById('passwordResetRequest').onsubmit=e=>{e.preventDefault();act(async()=>{
   const email=document.getElementById('passwordResetEmail').value.trim().toLowerCase();
   await call('password_reset_request',{email});
   confirmationEmail=email;passwordResetSent(email)
  })};
 }
 function passwordResetSent(email){
  confirmationEmail=String(email||'').trim().toLowerCase();
  view('<h1>Проверь почту</h1><p>Если аккаунт с адресом <b>'+safe(confirmationEmail)+'</b> существует, мы отправили ссылку для восстановления пароля.</p><p class="muted">Проверь также папку «Спам». Используй только последнее письмо восстановления.</p><button class="btn" id="passwordResetOpenMail" type="button">Открыть почту</button><button class="btn ghost" id="passwordResetBack" type="button">Назад ко входу</button>');
  document.getElementById('passwordResetOpenMail').onclick=openConfirmationMail;
  document.getElementById('passwordResetBack').onclick=login;
 }
 function resetPassword(){
  view('<h1>Новый пароль</h1><p>Придумай новый пароль для своего аккаунта Norsk Eventyr.</p><form id="passwordResetForm"><label>Новый пароль<input id="newPassword" type="password" autocomplete="new-password" required minlength="10" maxlength="128"></label><label>Повтори пароль<input id="newPasswordConfirm" type="password" autocomplete="new-password" required minlength="10" maxlength="128"></label><button class="btn" type="submit">Сохранить новый пароль</button></form>');
  document.getElementById('passwordResetForm').onsubmit=e=>{e.preventDefault();act(async()=>{
   const password=document.getElementById('newPassword').value,confirm=document.getElementById('newPasswordConfirm').value;
   if(password.length<10||password.length>128){message(messages.BAD_NEW_PASSWORD);return}
   if(password!==confirm){message('Пароли не совпадают.');return}
   await call('update_password',{password});
   history.replaceState(null,'',location.pathname);
   await status()
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
  view('<h1>'+(continuing?'Обновлено уведомление о данных':'Условия использования')+'</h1><div class="access-terms"><h2>Пользовательское соглашение</h2><p>Norsk Eventyr — учебное приложение. Оно не является официальным сервисом Norskprøven, не присваивает официальный уровень и не гарантирует результат экзамена. Автоматические и AI-объяснения могут содержать ошибки, поэтому важную информацию следует перепроверять.</p><p>Пробный доступ действует 5 дней после первого принятия условий. Один успешно активированный приглашённый пользователь может один раз добавить пригласившему ещё 5 дней. После пробного периода доступ может продолжаться как бесплатный бонус, по промокоду, вручную владельцем или как подтверждённый платный период. Одноразовая отметка готовности оформить подписку может дать 30 дополнительных бесплатных дней. При злоупотреблении или нарушении правил владелец может отказать или отозвать доступ.</p><h2>Уведомление о данных</h2><p>Для работы учётной записи обрабатываются адрес электронной почты, идентификатор аккаунта, имя в заявке, статус доступа, даты принятия условий и сведения о приглашении. При установке приложения также сохраняются время установки или первого запуска установленной версии и тип платформы, чтобы владелец видел использование приложения и срок пробного доступа.</p><p>Поставленная оценка и текст комментария могут быть показаны всем пользователям Norsk Eventyr. Поле «Что добавить в приложение?» остаётся доступным только владельцу. Для управления пробным, бесплатным и платным доступом сохраняются источник перехода, общий счётчик активных дней, идентификатор и краткое название доверенного устройства, даты его использования, промокоды и значимые события учётной записи (например, подтверждение email, принятие условий, установка, окончание trial и запрос платного продолжения), а после подключения оплаты — статус подписки, сумма, комиссия, оплаченный период, продление, ошибка или возврат. Номера банковских карт в Norsk Eventyr не сохраняются. До регистрации первое открытие учитывается только как агрегированный счётчик без email и без сохранения IP в базе Norsk Eventyr. Прогресс хранится локально и передаётся в облако только через функцию синхронизации. Техническая инфраструктура может создавать служебные журналы запросов и ошибок.</p><p>Не отправляй в отзывы, задания или чат пароли, BankID, платёжные данные и другие секреты.</p><details class="access-legal-info" id="legalInfo"><summary>Юридическая информация</summary><p><b>Ответственный за обработку данных:</b> <span id="legalController">Открой раздел для загрузки данных.</span></p><p>Эти сведения показываются только в юридическом разделе и не используются в публичном профиле, рейтингах, комментариях или обычном интерфейсе приложения.</p></details></div><form id="accessTerms"><label class="access-check"><input id="acceptTerms" type="checkbox" required><span>Я принимаю Пользовательское соглашение '+safe(TERMS_VERSION)+'.</span></label><label class="access-check"><input id="acceptPrivacy" type="checkbox" required><span>Я ознакомился с уведомлением об обработке данных '+safe(PRIVACY_VERSION)+'.</span></label><button class="btn" type="submit">'+(continuing?'Принять и продолжить':'Принять и начать 5 дней')+'</button></form><button class="btn ghost" id="accessLogout">Выйти</button>');
  document.getElementById('accessLogout').onclick=logout;
  const legal=document.getElementById('legalInfo');
  if(legal)legal.ontoggle=async()=>{if(!legal.open||legal.dataset.loaded==='1')return;legal.dataset.loaded='1';const target=document.getElementById('legalController');try{const info=await call('legal_info');if(target)target.textContent=String(info.controller||'Недоступно')}catch{legal.dataset.loaded='0';if(target)target.textContent='Юридические данные временно недоступны.'}};
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
  const showInterest=identity.status==='expired'||identity.status==='pending';
  const interest=showInterest?'<section class="purchase-interest"><h2>Продолжить обучение</h2><p><b>99 NOK за 30 дней</b></p><p class="feedback-help">Оплата пока не списывается. Первое нажатие покажет владельцу готовность оформить подписку и один раз добавит 30 бесплатных дней.</p><button class="btn" id="purchaseInterest">Готов оформить подписку · +30 дней</button><p id="purchaseInterestMessage" class="feedback-help"></p></section>':'';
  const promo=showInterest?'<section class="purchase-interest"><h2>Есть промокод?</h2><form id="promoRedeem"><label>Промокод<input id="promoCode" autocomplete="off" maxlength="32" placeholder="Например FRIEND30"></label><button class="btn secondary" type="submit">Активировать промокод</button></form></section>':'';
  view('<h1>'+safe(labels[identity.status]||'Доступ к приложению')+'</h1><p>'+safe(identity.email||'')+'</p><p>'+safe(text)+'</p>'+feedback+interest+promo+(canRequest?'<form id="accessRequest"><label>Твоё имя<input id="accessName" autocomplete="name" required maxlength="80"></label><button class="btn" type="submit">Отправить заявку владельцу</button></form>':'')+'<div class="row"><button class="btn secondary" id="accessCheck">Проверить доступ</button><button class="btn ghost" id="accessLogout">Выйти</button></div>');
  if(askFeedback){
   let rating=0;const buttons=[...document.querySelectorAll('#trialFeedbackStars button')];
   const setRating=value=>{rating=value;for(const button of buttons){button.classList.toggle('selected',Number(button.dataset.rating)<=rating);button.setAttribute('aria-checked',String(Number(button.dataset.rating)===rating))}};
   for(const button of buttons)button.onclick=()=>setRating(Number(button.dataset.rating));
   document.getElementById('trialFeedbackSubmit').onclick=()=>act(async()=>{if(!rating){message('Выбери оценку от 1 до 5 звёзд.');return}await call('feedback_submit',{rating,comment:document.getElementById('trialFeedbackComment').value,suggestion:''});identity.feedback_submitted=true;identity.feedback_prompt_due=false;await status()});
   document.getElementById('trialFeedbackLater').onclick=()=>{document.querySelector('.trial-feedback-prompt')?.remove()};
  }
  if(canRequest)document.getElementById('accessRequest').onsubmit=e=>{e.preventDefault();act(async()=>{await call('request',{name:document.getElementById('accessName').value});await status()})};
  if(showInterest){
   const button=document.getElementById('purchaseInterest'),msg=document.getElementById('purchaseInterestMessage');
   if(button)button.onclick=()=>act(async()=>{const out=await call('purchase_interest',{price_nok:99});if(msg)msg.textContent=out.bonus_granted?'Готовность сохранена. Добавлено 30 бесплатных дней.':'Готовность сохранена. Бесплатный бонус уже выдавался ранее.';await status()});
  }
  const promoForm=document.getElementById('promoRedeem');if(promoForm)promoForm.onsubmit=e=>{e.preventDefault();act(async()=>{const code=document.getElementById('promoCode').value.trim().toUpperCase();await call('promo_redeem',{code});await status()})};
  document.getElementById('accessCheck').onclick=()=>act(status);document.getElementById('accessLogout').onclick=logout;
 }
 async function act(fn){if(busy)return;busy=true;gate.querySelectorAll('button').forEach(b=>b.disabled=true);try{await fn()}catch(e){message(e.message||messages.ACCESS_UNAVAILABLE);if(!e.code||e.code==='ACCESS_UNAVAILABLE')reportClientError(e.code||'ACTION_ERROR',e)}finally{busy=false;gate.querySelectorAll('button').forEach(b=>b.disabled=false)}}
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
  if(!loaded){if(!loadedUser){scopeStorage();loadedUser=identity.user_id}for(const name of scripts.slice(loadedCount)){await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='/'+name+'?v='+encodeURIComponent(ASSET_REV);s.onload=resolve;s.onerror=reject;document.body.append(s)}) ;loadedCount++}await new Promise(resolve=>setTimeout(resolve,250));loaded=true}
  gate.hidden=true;app.hidden=false;
  if(isInstalled())markInstalled('standalone');
  markGrowthActivity();
 }
 async function status(){
  if(checking)return checking;
  checking=(async()=>{
   try{
    identity=await call('status');
    if(identity.status==='terms_required'||(!identity.owner&&identity.accepted_privacy_version&&identity.accepted_privacy_version!==PRIVACY_VERSION)){terms();return false}
    clearPendingReferral();
    if(identity.access_granted===true){await load();return true}
    waiting();return false;
   }catch(e){identity=null;if(e.code==='LOGIN_REQUIRED')login();else if(['DEVICE_LIMIT','CONCURRENT_DEVICE','DEVICE_REQUIRED'].includes(e.code)){view('<h1>Доступ с этого устройства ограничен</h1><p>'+safe(e.message)+'</p><div class="row"><button class="btn" id="accessRetry">Проверить снова</button><button class="btn ghost" id="accessLogout">Выйти</button></div>');document.getElementById('accessRetry').onclick=()=>act(status);document.getElementById('accessLogout').onclick=logout}else{view('<h1>Проверка доступа недоступна</h1><p>Для проверки доступа нужно подключение к интернету.</p><button class="btn" id="accessRetry">Повторить</button>');message(e.message);document.getElementById('accessRetry').onclick=()=>act(status)}return false}
  })();try{return await checking}finally{checking=null}
 }
 async function logout(){await act(async()=>{if(loaded&&typeof saveState==='function')saveState();await call('logout');location.reload()})}
 function formatTrial(value){if(!value)return '';try{return new Date(value).toLocaleString('ru-RU',{dateStyle:'medium',timeStyle:'short'})}catch{return String(value)}}
 async function panel(){
  const userStatus=identity?.status==='trial'?'<p>Пробный доступ активен до <b>'+safe(formatTrial(identity.trial_ends_at))+'</b>.</p>':identity?.status==='free'?'<p>Бесплатный доступ активен до <b>'+safe(formatTrial(identity.free_access_until))+'</b>.</p>':identity?.status==='paid'?'<p>Платный доступ активен до <b>'+safe(formatTrial(identity.paid_until))+'</b>.</p>':identity?.owner?'<p>Учётная запись владельца.</p>':'<p>Доступ сейчас не активен.</p>';
  if(identity?.owner){
   app.hidden=true;gate.hidden=false;gate.classList.add('admin-host');gate.innerHTML='<div id="adminDashboardRoot"></div><p id="accessMessage" role="status" aria-live="polite"></p>';
   const root=document.getElementById('adminDashboardRoot');
   if(!window.NEAdminDashboard?.mount){view('<h1>Админ-панель недоступна</h1><p>Не удалось загрузить модуль Admin Dashboard.</p><button class="btn" id="accessRetry">Повторить</button>');document.getElementById('accessRetry').onclick=()=>location.reload();return}
   window.NEAdminDashboard.mount(root,{onBack:()=>act(status),onLogout:logout});
   return
  }
  view('<h1>Доступ к приложению</h1><p>'+safe(identity?.email)+'</p>'+userStatus+'<form id="panelPromo"><label>Промокод<input id="panelPromoCode" autocomplete="off" maxlength="32" placeholder="Промокод для бесплатного продления"></label><button class="btn secondary" type="submit">Активировать</button></form><div class="row"><button class="btn secondary" id="accessBack">К обучению</button><button class="btn ghost" id="accessLogout">Выйти</button></div><p>Для одного аккаунта разрешено до двух доверенных устройств.</p>');
  const panelPromo=document.getElementById('panelPromo');if(panelPromo)panelPromo.onsubmit=e=>{e.preventDefault();act(async()=>{await call('promo_redeem',{code:document.getElementById('panelPromoCode').value.trim().toUpperCase()});await status()})};
  document.getElementById('accessBack').onclick=()=>act(status);document.getElementById('accessLogout').onclick=logout;
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
 window.NEAccess={status,panel,logout,install,isInstalled,shareInfo,headers:deviceHeaders,deviceId,ready:()=>loaded,allowed:()=>identity?.access_granted===true,isOwner:()=>identity?.owner===true,notificationCount,ownerMarkFeedbackSeen:markFeedbackSeen,info:()=>identity?{...identity}:null};
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e});
 window.addEventListener('appinstalled',()=>{installPrompt=null;markInstalled('appinstalled')});
 window.addEventListener('error',event=>{reportClientError('WINDOW_ERROR',event.error||event.message)});
 window.addEventListener('unhandledrejection',event=>{reportClientError('UNHANDLED_REJECTION',event.reason)});
 window.addEventListener('focus',()=>{if(loaded&&!gate.querySelector('#accessList')){markGrowthActivity();status()}});
 setInterval(()=>{if(loaded&&!document.hidden&&!busy&&!checking&&!gate.querySelector('#accessList'))status()},60000);
 view('<h1>Проверяем доступ…</h1>');
 (async()=>{
  const params=new URLSearchParams(location.search),hashParams=new URLSearchParams(location.hash.replace(/^#/,''));
  const ref=params.get('ref');captureAcquisition(params);markFirstVisit();if(ref)storeReferral(ref);
  if(pendingReferral())register=true;
  const hashError=hashParams.get('error_code')||hashParams.get('error');
  if(hashError){
   history.replaceState(null,'',location.pathname);login();message('Ссылка восстановления недействительна или устарела. Запроси новое письмо.');return
  }
  if(hashParams.get('type')==='recovery'&&hashParams.get('access_token')&&hashParams.get('refresh_token')){
   const access_token=hashParams.get('access_token'),refresh_token=hashParams.get('refresh_token');
   history.replaceState(null,'',location.pathname);
   try{await call('recovery_session',{access_token,refresh_token});resetPassword();return}catch(e){login();message(e.message);return}
  }
  if(params.has('token_hash')){
   const hash=params.get('token_hash'),type=params.get('type');history.replaceState(null,'',location.pathname);
   try{
    const out=await call('confirm',{token_hash:hash,type});confirmationEmail=null;
    if(type==='recovery'||out.recovery){resetPassword();return}
   }catch(e){
    login();
    message((type==='recovery'?messages.RECOVERY_FAILED:e.message)+' '+(type==='recovery'?'Запроси новое письмо восстановления.':'Отправь новое письмо подтверждения и используй только последнюю ссылку.'));
    return
   }
  }else if(params.has('password_recovery')){
   history.replaceState(null,'',location.pathname);login();message('Ссылка восстановления не содержит действующей сессии. Запроси новое письмо.');return
  }else if(params.has('ref'))history.replaceState(null,'',location.pathname);
  await status();
 })();
})();
