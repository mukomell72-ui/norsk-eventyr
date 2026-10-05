// Access is established by the server before any learning screen is loaded.
(() => {
 const TERMS_VERSION='2026-10-05-v1',PRIVACY_VERSION='2026-10-05-v1';
 const scripts=['data.js','app.js','voice-pack.js','v3.js','lexicon.js','elite.js','story-data.js','story.js','ui-v6.js','ui-v7.js','ui-v8.js','updates.js','feedback.js'];
 const app=document.getElementById('app'),gate=document.createElement('main');gate.id='accessGate';gate.className='access-gate';document.body.append(gate);
 let installPrompt=null,identity=null,loaded=false,loadedUser=null,loadedCount=0,busy=false,checking=null,register=false,confirmationEmail=null;
 const safe=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const messages={LOGIN_FAILED:'Не удалось войти. Проверь адрес, пароль и подтверждение почты.',REGISTRATION_FAILED:'Не удалось зарегистрироваться. Попробуй позже.',ACCESS_UNAVAILABLE:'Не удалось проверить доступ. Проверь подключение и попробуй ещё раз.',BAD_CREDENTIALS:'Введи корректный адрес и пароль от 10 до 128 символов.',BAD_EMAIL:'Проверь адрес электронной почты.',EMAIL_DELIVERY_FAILED:'Не удалось отправить письмо подтверждения. Попробуй ещё раз позже.',CONFIRMATION_FAILED:'Ссылка подтверждения недействительна или уже использована. Запроси новое письмо подтверждения.',RATE_LIMIT:'Слишком много попыток. Подожди немного и попробуй снова.',TERMS_VERSION_MISMATCH:'Условия обновились. Открой страницу ещё раз и подтверди актуальную версию.',BAD_REFERRAL:'Ссылка приглашения повреждена.',TERMS_REQUIRED:'Сначала нужно принять пользовательское соглашение и уведомление о данных.'};
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
 function view(html){app.hidden=true;gate.hidden=false;gate.innerHTML='<section class="card"><div class="eyebrow">Norsk Eventyr</div>'+html+'<p id="accessMessage" role="status" aria-live="polite"></p></section>'}
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
   const out=await call(register?'register':'login',{email,password});document.getElementById('accessPassword').value='';
   if(out.confirmEmail){confirmationEmail=email;confirmationPending(email)}else await status()
  })};
 }
 function confirmationPending(email){
  confirmationEmail=String(email||'').trim().toLowerCase();
  view('<h1>Проверь почту</h1><p>Мы отправили письмо подтверждения на <b>'+safe(confirmationEmail)+'</b>.</p><p>Открой письмо и нажми кнопку подтверждения. После этого Norsk Eventyr откроется автоматически, а приглашение останется привязано к этому аккаунту.</p><p class="muted">Если письма нет, проверь «Спам». Повторную отправку можно запросить ниже.</p><div class="row"><button class="btn secondary" id="accessResend">Отправить письмо ещё раз</button><button class="btn ghost" id="accessBackLogin">Изменить email</button></div>');
  document.getElementById('accessResend').onclick=()=>act(async()=>{await call('resend_confirmation',{email:confirmationEmail});message('Новое письмо отправлено. Используй последнюю полученную ссылку.')});
  document.getElementById('accessBackLogin').onclick=()=>{register=true;login()};
 }
 function terms(){
  view('<h1>Условия использования</h1><p><b>Владелец и оператор:</b> Petro Vysochinenko.</p><div class="access-terms"><h2>Пользовательское соглашение</h2><p>Norsk Eventyr — учебное приложение. Оно не является официальным сервисом Norskprøven, не присваивает официальный уровень и не гарантирует результат экзамена. Автоматические и AI-объяснения могут содержать ошибки, поэтому важную информацию следует перепроверять.</p><p>Пробный доступ действует 5 дней после принятия этих условий. Один успешно активированный приглашённый пользователь может один раз добавить пригласившему ещё 5 дней. После окончания пробного срока доступ к обучению требует одобрения владельца. При злоупотреблении или нарушении правил владелец может отказать или отозвать доступ.</p><h2>Уведомление о данных</h2><p>Для работы учётной записи обрабатываются адрес электронной почты, идентификатор аккаунта, имя в заявке, статус доступа, даты принятия условий и сведения о приглашении. Прогресс хранится локально и передаётся в облако только через функцию синхронизации; отзывы и предложения сохраняются только при их отправке. Техническая инфраструктура может создавать служебные журналы запросов и ошибок.</p><p>Не отправляй в отзывы, задания или чат пароли, BankID, платёжные данные и другие секреты.</p></div><form id="accessTerms"><label class="access-check"><input id="acceptTerms" type="checkbox" required><span>Я принимаю Пользовательское соглашение '+safe(TERMS_VERSION)+'.</span></label><label class="access-check"><input id="acceptPrivacy" type="checkbox" required><span>Я ознакомился с уведомлением об обработке данных '+safe(PRIVACY_VERSION)+'.</span></label><button class="btn" type="submit">Принять и начать 5 дней</button></form><button class="btn ghost" id="accessLogout">Выйти</button>');
  document.getElementById('accessLogout').onclick=logout;
  document.getElementById('accessTerms').onsubmit=e=>{e.preventDefault();act(async()=>{await call('accept_terms',{terms_version:TERMS_VERSION,privacy_version:PRIVACY_VERSION,referral_code:pendingReferral()});clearPendingReferral();await status()})};
 }
 function waiting(){
  const requestStatus=identity.request_status||identity.status;
  const labels={pending:'Заявка ожидает одобрения',denied:'Владелец отказал в доступе',revoked:'Доступ отозван владельцем',expired:'Пробный период завершён'};
  const canRequest=identity.status==='expired'&&requestStatus==='unrequested';
  let text='Обучение недоступно.';
  if(identity.status==='expired')text=canRequest?'Пять пробных дней завершены. Отправь заявку владельцу, чтобы продолжить обучение.':'Пять пробных дней завершены. Заявка уже отправлена владельцу.';
  if(identity.status==='pending')text='Заявка отправлена. После одобрения обучение продолжится с сохранённого места.';
  if(identity.status==='denied')text='В доступе отказано владельцем.';
  if(identity.status==='revoked')text='Ранее выданный доступ отозван владельцем.';
  view('<h1>'+safe(labels[identity.status]||'Доступ к приложению')+'</h1><p>'+safe(identity.email||'')+'</p><p>'+safe(text)+'</p>'+(canRequest?'<form id="accessRequest"><label>Твоё имя<input id="accessName" autocomplete="name" required maxlength="80"></label><button class="btn" type="submit">Отправить заявку владельцу</button></form>':'')+'<div class="row"><button class="btn secondary" id="accessCheck">Проверить доступ</button><button class="btn ghost" id="accessLogout">Выйти</button></div>');
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
  if(!loaded){if(!loadedUser){scopeStorage();loadedUser=identity.user_id}for(const name of scripts.slice(loadedCount)){await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='/'+name+'?v=7.3.4';s.onload=resolve;s.onerror=reject;document.body.append(s)}) ;loadedCount++}await new Promise(resolve=>setTimeout(resolve,250));loaded=true}
  gate.hidden=true;app.hidden=false;
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
  view('<h1>Доступ к приложению</h1><p>'+safe(identity?.email)+'</p>'+userStatus+'<div class="row"><button class="btn secondary" id="accessBack">К обучению</button><button class="btn ghost" id="accessLogout">Выйти</button></div>'+(identity?.owner?'<h2>Заявки и пользователи</h2><p>После пробного периода пользователь может отправить заявку. Доступ можно одобрить, отклонить или отозвать.</p><button class="btn secondary" id="accessRefreshList">Обновить список</button><div id="accessList">Загрузка…</div><h2>Отзывы и идеи</h2><p>Оценки, комментарии и пожелания пользователей.</p><button class="btn secondary" id="feedbackRefresh">Обновить отзывы</button><div id="feedbackList">Загрузка…</div>':'<p>Приглашённый друг может один раз добавить тебе ещё 5 дней пробного доступа.</p>'));
  document.getElementById('accessBack').onclick=()=>act(status);document.getElementById('accessLogout').onclick=logout;
  if(!identity?.owner)return;
  async function list(){try{const out=await call('list');const box=document.getElementById('accessList');if(!box)return;box.replaceChildren();for(const item of out.requests){const card=document.createElement('article');card.className='card';const title=document.createElement('h3');title.textContent=item.display_name;const info=document.createElement('p');let extra=item.trial_ends_at?' · пробный до '+formatTrial(item.trial_ends_at):'';info.textContent=item.email+' · '+({pending:'Ожидает',approved:'Одобрен',denied:'Отказано',revoked:'Отозван'}[item.status]||item.status)+extra;card.append(title,info);const row=document.createElement('div');row.className='row';for(const [value,label] of [['approved','Одобрить'],['denied','Отказать'],['revoked','Отозвать доступ']]){if(value===item.status)continue;const button=document.createElement('button');button.className='btn secondary';button.textContent=label;button.onclick=()=>act(async()=>{await call('decide',{user_id:item.user_id,status:value});await list();await window.NEOwnerBadge?.refresh()});row.append(button)}card.append(row);box.append(card)}if(!out.requests.length)box.textContent='Заявок пока нет.'}catch(e){message(e.message)}}
  document.getElementById('accessRefreshList').onclick=()=>act(list);await list();
  async function refreshFeedback(){const total=await window.NEFeedback.ownerList();if(typeof total==='number')markFeedbackSeen(total);await window.NEOwnerBadge?.refresh()}
  document.getElementById('feedbackRefresh').onclick=()=>act(refreshFeedback);await refreshFeedback();
 }
 async function install(){
  if(!await status())return;
  if(installPrompt){await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null}
  else alert('Открой меню браузера и выбери «Установить приложение» или «Добавить на главный экран». Если приложение уже установлено, открой его значок.');
 }
 async function shareInfo(){return call('share_info')}
 window.NEAccess={status,panel,logout,install,shareInfo,ready:()=>loaded,allowed:()=>identity?.access_granted===true,isOwner:()=>identity?.owner===true,notificationCount,info:()=>identity?{...identity}:null};
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e});
 window.addEventListener('appinstalled',()=>{installPrompt=null});
 window.addEventListener('focus',()=>{if(loaded&&!gate.querySelector('#accessList'))status()});
 setInterval(()=>{if(loaded&&!document.hidden&&!busy&&!checking&&!gate.querySelector('#accessList'))status()},60000);
 view('<h1>Проверяем доступ…</h1>');
 (async()=>{
  const params=new URLSearchParams(location.search),ref=params.get('ref');if(ref)storeReferral(ref);
  if(pendingReferral())register=true;
  if(params.has('token_hash')){
   const hash=params.get('token_hash'),type=params.get('type');history.replaceState(null,'',location.pathname);
   try{await call('confirm',{token_hash:hash,type});confirmationEmail=null}catch(e){login();message(e.message);return}
  }else if(params.has('ref'))history.replaceState(null,'',location.pathname);
  await status();
 })();
})();
