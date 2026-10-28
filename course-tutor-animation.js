// Lightweight animated tutor across all active lesson activities.
// Does not change grading, lesson state, speech recognition or navigation.
(()=>{
 'use strict';
 let scheduled=false;
 const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
 const css=`
.ne-course-tutor{display:flex;align-items:center;gap:14px;padding:12px 16px;margin:12px 0;border-radius:18px;background:linear-gradient(115deg,#e6f6f6,#fff2e5);border:1px solid #9dcdd0;color:#163b46}
.ne-course-tutor-figure{position:relative;flex:none;width:94px;height:112px;border-radius:22px;overflow:hidden;border:3px solid #fff;box-shadow:0 8px 18px #17415b33;transform-origin:bottom center;animation:ne-tutor-idle 3.4s ease-in-out infinite}
.ne-course-tutor-figure img{width:100%;height:100%;display:block;object-fit:cover;object-position:center 24%}
.ne-course-tutor-figure:after{content:'';position:absolute;bottom:5px;left:18px;width:60px;height:8px;border-radius:50%;background:#102e3b22}
.ne-course-tutor-title{font-weight:750;font-size:1rem}
.ne-course-tutor-copy{font-size:.9rem;line-height:1.45;margin:5px 0 8px}
.ne-course-tutor-say{padding:7px 12px;border-radius:12px;background:#145b70;color:white;border:0;font:inherit;cursor:pointer}
.ne-course-tutor-speaking .ne-course-tutor-figure{animation:ne-tutor-talk .42s ease-in-out infinite alternate;box-shadow:0 0 0 4px #2096a544}
.ne-course-tutor-speaking .ne-course-tutor-figure:before{content:'';position:absolute;left:47%;top:48%;width:11px;height:5px;border-radius:50%;background:#542d30;z-index:2;animation:ne-tutor-mouth .25s ease-in-out infinite alternate}
@keyframes ne-tutor-idle{0%,100%{transform:translateY(0) rotate(-1.5deg)}50%{transform:translateY(-8px) rotate(1.5deg)}}
@keyframes ne-tutor-talk{from{transform:translateY(-2px) rotate(-2deg)}to{transform:translateY(-9px) rotate(2deg)}}
@keyframes ne-tutor-mouth{from{height:3px}to{height:11px}}
@media(max-width:500px){.ne-course-tutor{gap:10px;padding:10px}.ne-course-tutor-figure{width:74px;height:94px}.ne-course-tutor-copy{font-size:.84rem}}
@media(prefers-reduced-motion:reduce){.ne-course-tutor-figure,.ne-course-tutor-speaking .ne-course-tutor-figure,.ne-course-tutor-speaking .ne-course-tutor-figure:before{animation:none!important}}
`;
 const style=document.createElement('style');style.textContent=css;document.head.append(style);
 function render(){
  scheduled=false;
  const app=document.getElementById('app');
  const session=window.neLessonSession;
  const active=!!session?.lesson&&app&&app.children.length>0;
  const old=document.getElementById('neCourseTutor');
  if(!active){old?.remove();return}
  // Avoid duplication when the speaking activity already shows a full character stage.
  if(app.querySelector('.ne-world-stage')){old?.remove();return}
  const anchor=app.querySelector('.guided-speaking,.ne-world-guide,.card,main')||app.firstElementChild;
  if(!anchor)return;
  if(old?.isConnected)return;
  const box=document.createElement('aside');
  box.id='neCourseTutor';box.className='ne-course-tutor';
  box.setAttribute('aria-label','Анимированная преподавательница Нора');
  box.innerHTML='<div class="ne-course-tutor-figure"><img src="/assets/nora-v8.webp" alt="Нора"></div><div><div class="ne-course-tutor-title">Нора с тобой</div><p class="ne-course-tutor-copy">Я рядом на каждом этапе урока. Нажми, чтобы услышать подсказку.</p><button type="button" class="ne-course-tutor-say">Нора, подскажи</button></div>';
  box.querySelector('button').addEventListener('click',async()=>{
   const button=box.querySelector('button');
   const line='Продолжай урок в своём темпе. Если слово непонятно, попроси объяснение.';
   if(typeof window.speakText!=='function'){button.textContent='Подсказка: продолжай в своём темпе';return}
   box.classList.add('ne-course-tutor-speaking');button.textContent='Нора говорит…';
   try{await window.speakText(line,.92,null,'marin','ru-RU')}catch{}
   finally{box.classList.remove('ne-course-tutor-speaking');button.textContent='Нора, подскажи'}
  });
  anchor.parentNode?.insertBefore(box,anchor);
 }
 const queue=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(render)};
 const start=()=>{const app=document.getElementById('app');if(!app)return;
  const observer=new MutationObserver(queue);observer.observe(app,{childList:true,subtree:true});queue();
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();