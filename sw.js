self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open('ll-tn-dyn-v1').then(c=>c.addAll([
    './','./index.html','./styles.css','./app.js','./manifest.json'
  ])));
});
self.addEventListener('fetch', (e)=>{
  e.respondWith(caches.match(e.request).then(resp=> resp || fetch(e.request)));
});
