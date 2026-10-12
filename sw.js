const CACHE="norsk-eventyr-v8-2-6";
const ASSETS=["/access.js?v=8.2.6","/access.css?v=8.2.6","/admin-dashboard.js?v=8.2.6","/admin-dashboard.css?v=8.2.6","/","/index.html","/styles.css?v=8.2.6","/v7.css?v=8.2.6","/v8.css?v=8.2.6","/ui-v8.js?v=8.2.6","/placement-calibration.js?v=8.2.6","/updates.js?v=8.2.6","/feedback.js?v=8.2.6","/data.js?v=8.2.6","/curriculum-v8.js?v=8.2.6","/practice-foundations.js?v=8.2.6","/foundation-extensions.js?v=8.2.6","/advanced-b1.js?v=8.2.6","/advanced-b2.js?v=8.2.6","/adaptive-teacher.js?v=8.2.6","/app.js?v=8.2.6","/voice-pack.js?v=8.2.6","/v3.js?v=8.2.6","/lexicon.js?v=8.2.6","/elite.js?v=8.2.6","/story-data.js?v=8.2.6","/story.js?v=8.2.6","/ui-v6.js?v=8.2.6","/ui-v7.js?v=8.2.6","/manifest.json","/icon.svg","/icon-180.png","/icon-192.png","/icon-512.png","/offline.html","/assets/fjord.jpg","/assets/nora.jpg","/assets/nora-v8.webp","/assets/fjordvik-v8.webp"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("norsk-eventyr-")&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("message",e=>{if(e.data==="SKIP_WAITING")self.skipWaiting()});
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
