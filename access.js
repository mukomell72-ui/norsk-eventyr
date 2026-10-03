// Access is established by the server before any learning screen is loaded.
(() => {
 const scripts=['data.js','app.js','voice-pack.js','v3.js','lexicon.js','elite.js','story-data.js','story.js','ui-v6.js','ui-v7.js','ui-v8.js','updates.js'];
 const app=document.getElementById('app'),gate=document.createElement('main');gate.id='accessGate';gate.className='access-gate';document.body.append(gate);
 let installPrompt=null,identity=null,loaded=false,loadedUser=null,loadedCount=0,busy=false,checking=null,register=false;
 const safe=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const messages={LOGIN_FAILED:'Не удалось войти. Проверь адрес, пароль и подтверждение почты.',REGISTRATION_FAILED:'Не удалось зарегистрироваться. Попробуй позже. Если письмо не приходит, сообщи владельцу.',ACCESS_UNAVAILABLE:'Не удалось проверить доступ. Проверь подключение и попробуй ещё раз.',BAD_CREDENTIALS:'Введи корректный адрес и пароль от 10 до 128 символов.',CONFIRMATION_FAILED:'Ссылка подтверждения недействительна или уже использована.',RATE_LIMIT:'Слишком много попыток. Попробуй позже.'};
 async function call(action,params={}){
  const response=await fetch('/api/access',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...params}),cache:'no-store'});
  const data=await response.json();if(!response.ok){const e=new Error(messages[data.error]||'Не удалось выполнить действие. Попробуй позже.');e.code=data.error;throw e}return data;
 }
 function view(html){app.hidden=true;gate.hidden=false;gate.innerHTML='<section class="card"><div class="eyebrow">Norsk Eventyr</div>'+html+'<p id="accessMessage" role="status" aria-live="polite"></p></section>'}
 function message(text){const e=document.getElementById('accessMessage');if(e)e.textContent=text}
 function login(){view('<h1>Вход в приложение</h1><p>Для обучения нужно одобрение владельца. Сначала войди или создай свою учётную запись.</p><form id="accessLogin"><label>Электронная почта<input id="accessEmail" type="email" autocomplete="email" required maxlength="254"></label><label>Пароль<input id="accessPassword" type="password" autocomplete="'+(register?'new-password':'current-password')+'" required minlength="10" maxlength="128"></label><button class="btn" type="submit">'+(register?'Создать учётную запись':'Войти')+'</button></form><button class="btn secondary" id="accessToggle">'+(register?'Уже есть учётная запись':'Создать учётную запись')+'</button>');
  document.getElementById('accessToggle').onclick=()=>{register=!register;login()};
  document.getElementById('accessLogin').onsubmit=e=>{e.preventDefault();act(async()=>{const out=await call(register?'register':'login',{email:document.getElementById('accessEmail').value,password:document.getElementById('accessPassword').value});document.getElementById('accessPassword').value='';if(out.confirmEmail)message('Подтверди адрес по письму, затем вернись сюда и войди. Если письмо не приходит, сообщи владельцу.');else await status()})};
 }
 function waiting(){const labels={pending:'Заявка ожидает одобрения',denied:'Владелец отказал в доступе',revoked:'Доступ отозван владельцем'};view('<h1>'+safe(labels[identity.status]||'Запросить доступ')+'</h1><p>'+safe(identity.email)+'</p>'+(identity.status==='unrequested'?'<p>Представься, чтобы владелец узнал тебя.</p><form id="accessRequest"><label>Твоё имя<input id="accessName" autocomplete="name" required maxlength="80"></label><button class="btn" type="submit">Отправить заявку владельцу</button></form>':'<p>Обучение и установка из приложения станут доступны после одобрения.</p>')+'<div class="row"><button class="btn secondary" id="accessCheck">Проверить доступ</button><button class="btn ghost" id="accessLogout">Выйти</button></div>');
  if(identity.status==='unrequested')document.getElementById('accessRequest').onsubmit=e=>{e.preventDefault();act(async()=>{await call('request',{name:document.getElementById('accessName').value});await status()})};
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
  if(!loaded){if(!loadedUser){scopeStorage();loadedUser=identity.user_id}for(const name of scripts.slice(loadedCount)){await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='/'+name+'?v=7.3.0';s.onload=resolve;s.onerror=reject;document.body.append(s)}) ;loadedCount++}await new Promise(resolve=>setTimeout(resolve,250));loaded=true}
  gate.hidden=true;app.hidden=false;
 }
 async function status(){
  if(checking)return checking;
  checking=(async()=>{
   try{identity=await call('status');if(identity.status==='approved')await load();else waiting();return identity.status==='approved'}
   catch(e){identity=null;if(e.code==='LOGIN_REQUIRED')login();else{view('<h1>Проверка доступа недоступна</h1><p>Для проверки одобрения нужно подключение к интернету.</p><button class="btn" id="accessRetry">Повторить</button>');message(e.message);document.getElementById('accessRetry').onclick=()=>act(status)}return false}
  })();try{return await checking}finally{checking=null}
 }
 async function logout(){await act(async()=>{if(loaded&&typeof saveState==='function')saveState();await call('logout');location.reload()})}
 async function panel(){
  view('<h1>Доступ к приложению</h1><p>'+safe(identity?.email)+'</p><div class="row"><button class="btn secondary" id="accessBack">К обучению</button><button class="btn ghost" id="accessLogout">Выйти</button></div>'+(identity?.owner?'<h2>Заявки и пользователи</h2><p>Одобренные пользователи учатся со своим прогрессом. Доступ можно отозвать.</p><button class="btn secondary" id="accessRefreshList">Обновить список</button><div id="accessList">Загрузка…</div>':'<p>Твой доступ одобрен владельцем.</p>'));
  document.getElementById('accessBack').onclick=()=>act(status);document.getElementById('accessLogout').onclick=logout;
  if(!identity?.owner)return;
  async function list(){try{const out=await call('list');const box=document.getElementById('accessList');if(!box)return;box.replaceChildren();for(const item of out.requests){const card=document.createElement('article');card.className='card';const title=document.createElement('h3');title.textContent=item.display_name;const info=document.createElement('p');info.textContent=item.email+' · '+({pending:'Ожидает',approved:'Одобрен',denied:'Отказано',revoked:'Отозван'}[item.status]||item.status);card.append(title,info);const row=document.createElement('div');row.className='row';for(const [value,label] of [['approved','Одобрить'],['denied','Отказать'],['revoked','Отозвать доступ']]){if(value===item.status)continue;const button=document.createElement('button');button.className='btn secondary';button.textContent=label;button.onclick=()=>act(async()=>{await call('decide',{user_id:item.user_id,status:value});await list()});row.append(button)}card.append(row);box.append(card)}if(!out.requests.length)box.textContent='Заявок пока нет.'}catch(e){message(e.message)}}
  document.getElementById('accessRefreshList').onclick=()=>act(list);await list();
 }
 async function install(){
  if(!await status())return;
  if(installPrompt){await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null}
  else alert('Открой меню браузера и выбери «Установить приложение» или «Добавить на главный экран». Если приложение уже установлено, открой его значок.');
 }
 window.NEAccess={status,panel,logout,install,ready:()=>loaded,allowed:()=>identity?.status==='approved'};
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e});
 window.addEventListener('appinstalled',()=>{installPrompt=null});
 window.addEventListener('focus',()=>{if(loaded&&!gate.querySelector('#accessList'))status()});
 setInterval(()=>{if(loaded&&!document.hidden&&!busy&&!checking&&!gate.querySelector('#accessList'))status()},60000);
 view('<h1>Проверяем доступ…</h1>');
 (async()=>{const params=new URLSearchParams(location.search);if(params.has('token_hash')){const hash=params.get('token_hash'),type=params.get('type');history.replaceState(null,'',location.pathname);try{await call('confirm',{token_hash:hash,type})}catch(e){login();message(e.message);return}}await status()})();
})();
