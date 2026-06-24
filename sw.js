// Lingua service worker — network-first so deploys are picked up; cache fallback for offline
const CACHE='lingua-v1';
self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>{e.waitUntil((async()=>{const ks=await caches.keys();await Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim();})());});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  // only handle same-origin; let Supabase/CDN calls go straight to network
  if(url.origin!==location.origin)return;
  e.respondWith((async()=>{
    try{const fresh=await fetch(req);const c=await caches.open(CACHE);c.put(req,fresh.clone());return fresh;}
    catch(err){const cached=await caches.match(req);return cached||caches.match('/');}
  })());
});
