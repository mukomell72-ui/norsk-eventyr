const CACHE="norsk-eventyr-v8-3-0-lesson25-listening1-translate4-wordhelp1-stamp1-tap1-watch1-taponly1-clock1-feedback2-explain1-ruforms2-skulle1-teacher2-coach6-fresh1-bridge7-audit3";
const ASSETS=["/access.js?v=8.3.0-lesson25-listening1-translate4-wordhelp1-stamp1-tap1-watch1-taponly1-clock1-feedback2-explain1-ruforms2-skulle1-teacher2-coach6-fresh1-bridge7-audit3","/access.css?v=8.3.0-lesson25","/admin-dashboard.js?v=8.3.0-lesson25","/admin-dashboard.css?v=8.3.0-lesson25","/study-activity.js?v=8.3.0-lesson25","/","/index.html","/styles.css?v=8.3.0","/v7.css?v=8.3.0-bridge7-audit3","/v8.css?v=8.3.0-lesson25","/nordic-quest.css?v=8.3.0-lesson25","/functional-practice.css?v=8.3.0","/lesson-coach.css?v=8.3.0-coach6","/language-bridge.css?v=8.3.0-coach6","/inline-personal-form.css?v=8.3.0","/ui-v8.js?v=8.3.0-translate4-stamp1","/placement-calibration.js?v=8.3.0","/updates.js?v=8.3.0-translate4-stamp1","/feedback.js?v=8.3.0","/data.js?v=8.3.0","/curriculum-v8.js?v=8.3.0","/course-methodology.js?v=8.3.0-lesson25-teacher2","/verified-learning-resources.js?v=8.3.0-lesson25","/practice-foundations.js?v=8.3.0","/cloze-coach.js?v=8.3.0-coach6","/functional-practice.js?v=8.3.0-coach6","/inline-personal-form.js?v=8.3.0","/foundation-extensions.js?v=8.3.0","/advanced-b1.js?v=8.3.0","/advanced-b2.js?v=8.3.0","/adaptive-teacher.js?v=8.3.0-lesson25-teacher2-fresh1-bridge7","/lesson-coach.js?v=8.3.0-coach6","/language-bridge.js?v=8.3.0-coach6-bridge7-audit3","/nora-experience.js?v=8.3.0-bridge7-audit3","/app.js?v=8.3.0-lesson25-teacher2-coach6-bridge7-audit3","/guided-speaking.js?v=8.3.0-lesson25-teacher2","/voice-pack.js?v=8.3.0","/v3.js?v=8.3.0-lesson25-bridge7","/lexicon.js?v=8.3.0","/norwegian-listening.js?v=8.3.0-lesson25-listening1","/elite.js?v=8.3.0-lesson25-listening1-bridge7","/story-data.js?v=8.3.0","/story.js?v=8.3.0","/ui-v6.js?v=8.3.0","/ui-v7.js?v=8.3.0-lesson25-translate4-teacher2-bridge7-audit3","/nordic-quest-play.js?v=8.3.0-lesson25","/nordic-quest.js?v=8.3.0-lesson25","/manifest.json","/icon.svg","/icon-180.png","/icon-192.png","/living-day.js?v=8.3.0-lesson25-teacher2-audit3","/card-grammar.js?v=8.3.0-lesson25-ruforms2-skulle1","/card-form-practice.js?v=8.3.0-lesson25-translate4-wordhelp1-tap1-watch1-taponly1-clock1-feedback2-skulle1","/mini-path.js?v=8.3.0-lesson25","/living-words.js?v=8.3.0-lesson25-translate4-wordhelp1-tap1-watch1-taponly1-clock1-feedback2-explain1-ruforms2-coach6","/icon-512.png","/offline.html","/assets/fjord.jpg","/assets/nora.jpg","/assets/nora-v8.webp","/assets/fjordvik-v8.webp"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("norsk-eventyr-")&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("message",e=>{
  if(e.data==="SKIP_WAITING")self.skipWaiting();
  else if(e.data?.type==="NE_GET_VERSION"&&e.ports?.[0])
    e.ports[0].postMessage({type:"NE_VERSION",cache:CACHE});
});
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=="GET")return;

  // Cache the two visual assets after first successful display so the installed PWA
  // keeps its Fjordvik atmosphere on weak or temporarily unavailable networks.
  if(u.hostname==="images.unsplash.com"){
    e.respondWith(caches.match(e.request).then(hit=>{
      const net=fetch(e.request).then(r=>{
        if(r&&(r.ok||r.type==="opaque"))caches.open(CACHE).then(c=>c.put(e.request,r.clone())).catch(()=>{});
        return r;
      }).catch(()=>hit);
      return hit||net;
    }));
    return;
  }

  if(u.origin!==location.origin||u.pathname.startsWith("/api/"))return;
  if(e.request.mode==="navigate"){
    e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put("/index.html",copy)).catch(()=>{})}return r}).catch(()=>caches.match("/index.html").then(r=>r||caches.match("/offline.html"))));
    return;
  }
  e.respondWith(caches.match(e.request).then(hit=>{
    const net=fetch(e.request).then(r=>{if(r&&r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy))}return r}).catch(()=>hit);
    return hit||net;
  }));
});
