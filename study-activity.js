// Foreground study-time estimate. Only with the learner's explicit opt-in.
// No lesson answers, audio, transcripts, navigation paths or IP are logged.
(() => {
 'use strict';
 const ENDPOINT='/api/session',WINDOW_MS=90000;
 let lastHuman=0,pending=0,userId='',initialized=false,postingPromise=null,queuedSeconds=0,ephemeralConsent=null;
 const access=()=>window.NEAccess;
 const info=()=>access()?.info?.();
 const consentKey=()=> 'ne_activity_consent_v1:'+String(info()?.user_id||'');
 function consent(){
  if(ephemeralConsent!==null)return ephemeralConsent;
  try{return localStorage.getItem(consentKey())||''}catch{return ''}
 }
 function setConsent(enabled){
  const choice=enabled?'yes':'no';ephemeralConsent=choice;
  try{localStorage.setItem(consentKey(),choice)}catch{}
  document.getElementById('neStudyActivityNotice')?.remove();
  if(!enabled){lastHuman=0;pending=0;initialized=false;eraseStudyHistory()}
  else humanActivity();
 }
 window.NEStudyActivity={consent,setConsent};
 const canShow=()=>!document.hidden&&!document.getElementById('app')?.hidden&&
  access()?.allowed?.()===true&&info()?.owner!==true&&!!info()?.user_id;
 const eligible=()=>canShow()&&consent()==='yes';
 function headers(){return {'Content-Type':'application/json',...(access()?.headers?.()||{})}}
 async function send(seconds){
  if(!userId)return;
  if(postingPromise){
   queuedSeconds=Math.min(60,queuedSeconds+seconds);
   return postingPromise;
  }
  postingPromise=(async()=>{
   let amount=seconds;
   do{
    try{await fetch(ENDPOINT,{method:'POST',credentials:'same-origin',cache:'no-store',
     headers:headers(),body:JSON.stringify({action:'study_heartbeat',seconds:amount}),keepalive:true})}catch{}
    amount=queuedSeconds;
    queuedSeconds=0;
   }while(amount>0);
  })();
  try{await postingPromise}finally{postingPromise=null}
 }
 async function eraseStudyHistory(){
  // Finish any in-flight heartbeat before requesting deletion, so a delayed
  // heartbeat cannot resurrect an opted-out learner's activity records.
  if(postingPromise)await postingPromise;
  try{await fetch(ENDPOINT,{method:'POST',credentials:'same-origin',cache:'no-store',
   headers:headers(),body:JSON.stringify({action:'study_opt_out'})})}catch{}
 }
 function maybeStart(){
  if(!eligible())return false;
  const id=String(info()?.user_id||'');
  if(id!==userId){userId=id;pending=0;initialized=false;lastHuman=0}
  if(!initialized){initialized=true;send(0)}
  return true;
 }
 function humanActivity(){
  if(!maybeStart())return;
  lastHuman=Date.now();
 }
 function showNotice(){
  if(!canShow()||consent()||document.getElementById('neStudyActivityNotice'))return;
  const box=document.createElement('aside');
  box.id='neStudyActivityNotice';box.className='ne-study-notice';
  box.setAttribute('role','region');box.setAttribute('aria-label','Учёт активности');
  const title=document.createElement('strong');title.textContent='Статистика времени занятий';
  const text=document.createElement('p');
  text.textContent='Владелец программы сможет видеть, когда вы занимались и приблизительное время активной работы за день. Тексты и записи ответов не передаются в эту статистику. Учёт работает только при открытом приложении и ваших действиях. Выбор можно изменить в личном кабинете.';
  const controls=document.createElement('div');controls.className='row';
  const yes=document.createElement('button');yes.className='btn';yes.textContent='Разрешить';
  const no=document.createElement('button');no.className='btn secondary';no.textContent='Не учитывать';
  yes.onclick=()=>setConsent(true);no.onclick=()=>setConsent(false);
  controls.append(yes,no);box.append(title,text,controls);document.body.append(box);
 }
 document.addEventListener('pointerdown',humanActivity,{passive:true,capture:true});
 document.addEventListener('keydown',humanActivity,{passive:true,capture:true});
 document.addEventListener('touchstart',humanActivity,{passive:true,capture:true});
 document.addEventListener('wheel',humanActivity,{passive:true,capture:true});
 let ticks=0;
 setInterval(()=>{
  showNotice();
  if(!eligible()){if(pending){const n=pending;pending=0;send(n)}return}
  if(maybeStart()&&lastHuman&&Date.now()-lastHuman<=WINDOW_MS)pending=Math.min(60,pending+1);
  ticks++;
  if(ticks%30===0&&pending){const n=pending;pending=0;send(n)}
 },1000);
 const finish=()=>{if(pending){const n=pending;pending=0;send(n)}};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)finish()});
 window.addEventListener('pagehide',finish);
})();
