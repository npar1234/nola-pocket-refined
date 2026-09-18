const CACHE='nola-refined-20260918-v4';
const ASSETS=['./','./index.html','./itinerary.html','./manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png','./quarter.jpg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith('nola-refined-')&&k!==CACHE)await caches.delete(k);await self.clients.claim();for(const c of await self.clients.matchAll({type:'window'}))c.postMessage({type:'shell-updated'});})()));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);if(u.origin!==location.origin||!u.pathname.startsWith(new URL(self.registration.scope).pathname))return;
 if(e.request.mode==='navigate'){e.respondWith((async()=>{const c=await caches.open(CACHE);try{const r=await fetch(e.request);if(r.ok)await c.put(e.request,r.clone());return r;}catch{ return await c.match(e.request)||await c.match('./index.html')||Response.error();}})());}
 else e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request)));
});