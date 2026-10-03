const CACHE="norsk-eventyr-v7-2-scenes";
const ASSETS=["/","/index.html","/styles.css","/v7.css","/v8.css","/ui-v8.js","/data.js","/app.js","/voice-pack.js","/v3.js","/lexicon.js","/elite.js","/story-data.js","/story.js","/ui-v6.js","/ui-v7.js","/manifest.json","/icon.svg","/offline.html","/assets/fjord.jpg","/assets/nora.jpg","/assets/nora-v8.webp","/assets/fjordvik-v8.webp"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
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
    e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put("/index.html",copy));return r}).catch(()=>caches.match("/index.html").then(r=>r||caches.match("/offline.html"))));
    return;
  }
  e.respondWith(caches.match(e.request).then(hit=>{
    const net=fetch(e.request).then(r=>{if(r&&r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy))}return r}).catch(()=>hit);
    return hit||net;
  }));
});
