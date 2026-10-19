// Check the running page, active installed PWA and online release separately.
// Never remove caches or restart a learner's unfinished exercise automatically.
(() => {
  let registration=null,approved=false,changed=false,reloading=false,checking=false;
  const swSupported='serviceWorker' in navigator;
  const initiallyControlled=swSupported&&!!navigator.serviceWorker.controller;
  const buildFromCache=cache=>{
    const match=String(cache||'').match(/^norsk-eventyr-v(\d+)-(\d+)-(\d+)([-\w]*)$/);
    return match?match[1]+'.'+match[2]+'.'+match[3]+match[4]:null;
  };
  function runningBuild(){
    const script=[...document.scripts].find(el=>{
      try{return new URL(el.src,location.href).pathname==='/access.js'}catch{return false}
    });
    if(!script)return null;
    try{return new URL(script.src,location.href).searchParams.get('v')}catch{return null}
  }
  function paint(id,message){
    const node=document.getElementById(id);
    if(node)node.textContent=message;
  }
  async function activeCache(){
    if(!swSupported||!navigator.serviceWorker.controller||typeof MessageChannel==='undefined')return null;
    return new Promise(resolve=>{
      const channel=new MessageChannel();
      let completed=false;
      const finish=value=>{
        if(completed)return;
        completed=true;
        clearTimeout(timeout);
        channel.port1.close();
        resolve(value);
      };
      const timeout=setTimeout(()=>finish(null),1300);
      channel.port1.onmessage=event=>finish(
        event.data?.type==='NE_VERSION'&&typeof event.data.cache==='string'?event.data.cache:null
      );
      try{navigator.serviceWorker.controller.postMessage({type:'NE_GET_VERSION'},[channel.port2])}
      catch{finish(null)}
    });
  }
  async function remoteCache(){
    // A unique URL and cache:no-store bypass the installed SW's old cache-first
    // response. Do not use the page's displayed '8.3.0' as a release identifier.
    const response=await fetch('/sw.js?ne_version_check='+Date.now(),{
      cache:'no-store',credentials:'same-origin'
    });
    if(!response.ok)throw Error('HTTP '+response.status);
    const source=await response.text();
    const match=source.match(/^const CACHE="(norsk-eventyr-v[\w-]+)";/m);
    if(!match)throw Error('Версия не указана сервером');
    return match[1];
  }
  async function refreshInfo(){
    const running=runningBuild();
    paint('neBuildCurrent','Запущенная сборка: '+(running||'не определена'));
    const active=await activeCache();
    paint('neBuildCache','Активный кеш: '+(buildFromCache(active)||'нет данных (или нет Service Worker)'));
    return {running,active};
  }
  function visible(element){
    if(element.hidden||element.getAttribute('aria-hidden')==='true'||element.closest('[hidden],[aria-hidden="true"]'))return false;
    const style=getComputedStyle(element);
    return style.display!=='none'&&style.visibility!=='hidden'&&element.getClientRects().length>0;
  }
  function busy(){
    const active='.lesson-head-v6,.story-scene,#timer,#dictAnswer,#dailyAnswer,#testFb,#grammarGuideFeedback,#grammarLabFb,#listenQfb,.spinner,.chat-thinking';
    if([...document.querySelectorAll(active)].some(visible))return true;
    if([...document.querySelectorAll('textarea,input')].some(e=>visible(e)&&!e.readOnly&&!e.disabled&&e.type!=='hidden'&&String(e.value||'').trim()))return true;
    return [...document.querySelectorAll('button')].some(e=>visible(e)&&/Слушаю|Распознаю|■/.test(e.textContent));
  }
  function banner(){
    if(document.getElementById('neUpdateNotice'))return;
    const notice=document.createElement('aside');notice.id='neUpdateNotice';notice.className='update-notice';notice.setAttribute('role','status');
    const text=document.createElement('p');text.id='neUpdateText';text.textContent='Доступно обновление приложения. Твой прогресс сохранится.';
    const button=document.createElement('button');button.className='btn';button.textContent='Обновить приложение';button.onclick=apply;
    notice.append(text,button);document.body.append(notice);
  }
  function reload(){
    if(reloading)return;
    if(busy()){approved=false;banner();return;}
    try{localStorage.setItem('ne2_state',JSON.stringify(state))}
    catch{
      const text=document.getElementById('neUpdateText');
      if(text)text.textContent='Сначала сохрани резервную копию прогресса: на устройстве не хватает места.';
      return;
    }
    reloading=true;location.reload();
  }
  async function apply(){
    if(busy()){
      const text=document.getElementById('neUpdateText');
      if(text)text.textContent='Сначала закончи задание или отправь введённый ответ. Затем нажми «Обновить приложение».';
      return;
    }
    if(changed)return reload();
    if(!registration?.waiting){await check();return;}
    approved=true;registration.waiting.postMessage('SKIP_WAITING');
  }
  async function check(){
    if(!swSupported||!navigator.onLine||!registration)return;
    try{await registration.update();if(registration.waiting)banner()}catch{}
  }
  async function checkNow(){
    if(checking)return;
    checking=true;
    paint('neBuildCheck','Проверяю версию сервера и кеш устройства…');
    try{
      const {running,active}=await refreshInfo();
      if(!navigator.onLine){
        paint('neBuildCheck','Нет подключения к интернету. Текущую сборку видно, но сравнение с сервером недоступно.');
        return;
      }
      let latest;
      try{latest=await remoteCache()}
      catch{
        paint('neBuildCheck','Не удалось получить номер сборки с сервера. Проверь интернет и повтори.');
        return;
      }
      const serverBuild=buildFromCache(latest);
      paint('neBuildServer','На сервере: '+(serverBuild||'неизвестно'));
      if(!serverBuild){
        paint('neBuildCheck','Версию сервера определить не удалось.');
        return;
      }
      if(swSupported){
        try{const reg=registration||await navigator.serviceWorker.getRegistration();
          if(reg){registration=reg;await reg.update();if(reg.waiting)banner()}
        }catch{}
      }
      const activeAfter=await activeCache();
      paint('neBuildCache','Активный кеш: '+(buildFromCache(activeAfter)||'нет данных (или нет Service Worker)'));
      if(running===serverBuild&&(!activeAfter||activeAfter===latest)){
        paint('neBuildCheck',activeAfter
          ?'Установлена актуальная сборка. Версии страницы, кеша и сервера совпадают.'
          :'Страница соответствует серверу. Активный кеш проверить не удалось.');
      }else if(running!==serverBuild){
        paint('neBuildCheck','Доступна другая сборка. Заверши задание и обнови приложение через уведомление, если оно появилось.');
      }else{
        paint('neBuildCheck','Версия страницы актуальна, но активный кеш отличается. Дождись установки обновления и перезапусти приложение.');
      }
    }finally{checking=false}
  }
  window.NEUpdates=Object.freeze({checkNow,refreshInfo,runningBuild,buildFromCache});
  if(!swSupported)return;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(!initiallyControlled&&!approved)return;
    changed=true;if(approved)reload();else banner();
  });
  navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(reg=>{
    registration=reg;if(reg.waiting)banner();
    reg.addEventListener('updatefound',()=>{
      const worker=reg.installing;if(!worker)return;
      worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)banner()});
    });
    check();
  }).catch(()=>{});
  window.addEventListener('online',check);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check()});
  setInterval(check,15*60*1000);
})();