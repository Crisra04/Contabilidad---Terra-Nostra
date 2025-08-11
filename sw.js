const CACHE='tn-contab-v1_07';
const CORE=['./','./index.html','./styles.css','./app.js','./accounts.json','./manifest.json','./icon-48.png','./icon-72.png','./icon-96.png','./icon-128.png','./icon-180.png','./icon-192.png','./icon-384.png','./icon-512.png'];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE))); self.skipWaiting(); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch',e=>{ const req=e.request; if(req.method!=='GET') return;
  e.respondWith(caches.match(req).then(c=>c||fetch(req).then(res=>{const copy=res.clone(); caches.open(CACHE).then(cc=>cc.put(req,copy)); return res;}).catch(()=>caches.match('./index.html')))); });
