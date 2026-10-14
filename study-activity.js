// Foreground study-time estimate: only after a human interaction within 90 s.
// No answer text, transcripts, clicks, URLs or IP addresses are collected here.
(() => {
 'use strict';
 const ENDPOINT='/api/session',WINDOW_MS=90000;
 let lastHuman=0,pending=0,ownerId='',initialized=false,posting=false;
 const access=()=>window.NEAccess;
 const eligible=()=>{
  const a=access(),info=a?.info?.();
  return !document.hidden&&!document.getElementById('app')?.hidden&&
   a?.allowed?.()===true&&info?.owner!==true&&!!info?.user_id;
 };
 function headers(){return {'Content-Type':'application/json',...(access()?.headers?.()||{})}}
 async function send(seconds){
  if(posting||!ownerId)return;
  posting=true;
  try {
   const r=await fetch(ENDPOINT,{method:'POST',credentials:'same-origin',cache:'no-store',
    headers:headers(),body:JSON.stringify({action:'study_heartbeat',seconds}),
    keepalive:true});
   // Monitoring is optional. A missing migration must never block study.
   if(!r.ok&&r.status!==404&&r.status!==400&&r.status!==503)console.warn('Study time not recorded');
  } catch {} finally {posting=false}
 }
 function maybeStart(){
  if(!eligible())return false;
  const id=String(access().info()?.user_id||'');
  if(id!==ownerId){ownerId=id;pending=0;initialized=false;lastHuman=0}
  if(!initialized){initialized=true;send(0)}
  return true;
 }
 function humanActivity(){
  if(!maybeStart())return;
  lastHuman=Date.now();
 }
 document.addEventListener('pointerdown',humanActivity,{passive:true,capture:true});
 document.addEventListener('keydown',humanActivity,{passive:true,capture:true});
 document.addEventListener('touchstart',humanActivity,{passive:true,capture:true});
 document.addEventListener('wheel',humanActivity,{passive:true,capture:true});
 let ticks=0;
 setInterval(()=>{
  if(!eligible()){if(pending){const n=pending;pending=0;send(n)}return}
  if(maybeStart()&&lastHuman&&Date.now()-lastHuman<=WINDOW_MS)pending=Math.min(60,pending+1);
  ticks++;
  if(ticks%30===0&&pending){const n=pending;pending=0;send(n)}
 },1000);
 const finish=()=>{if(pending){const n=pending;pending=0;send(n)}};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)finish()});
 window.addEventListener('pagehide',finish);
})();
