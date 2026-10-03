// Update the application without interrupting an exercise or an unsent answer.
(() => {
  if(!('serviceWorker' in navigator))return;
  let registration=null,approved=false,changed=false,reloading=false;
  const initiallyControlled=!!navigator.serviceWorker.controller;
  function busy(){
    if(document.querySelector('.lesson-head-v6,.story-scene,#timer,#dictAnswer,#dailyAnswer,#testFb,#grammarGuideFeedback,#grammarLabFb,#listenQfb,.spinner,.chat-thinking'))return true;
    if([...document.querySelectorAll('textarea,input')].some(e=>!e.readOnly&&!e.disabled&&e.type!=='hidden'&&String(e.value||'').trim()))return true;
    return [...document.querySelectorAll('button')].some(e=>/Слушаю|Распознаю|■/.test(e.textContent));
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
    try{localStorage.setItem('ne2_state',JSON.stringify(state))}catch{document.getElementById('neUpdateText').textContent='Сначала сохрани резервную копию прогресса: на устройстве не хватает места.';return;}
    reloading=true;location.reload();
  }
  async function apply(){
    if(busy()){document.getElementById('neUpdateText').textContent='Сначала закончи задание или отправь введённый ответ. Затем нажми «Обновить приложение».';return;}
    if(changed)return reload();
    if(!registration?.waiting){await check();return;}
    approved=true;registration.waiting.postMessage('SKIP_WAITING');
  }
  async function check(){
    if(!navigator.onLine||!registration)return;
    try{await registration.update();if(registration.waiting)banner()}catch{}
  }
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
