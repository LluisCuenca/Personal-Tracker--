/* Personal Tracker — Service Worker
   Da soporte offline: cachea el "app shell" y los recursos estáticos (Chart.js,
   LZ-String, fuentes). Nunca intercepta las llamadas de Firebase/Google para que
   la sincronización y el login sigan necesitando red. */

var CACHE = 'pt-cache-v4';
var APP_SHELL = [
  './',
  './index.html',
  './webapp.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function(c){ return c.addAll(APP_SHELL).catch(function(){}); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return; // nunca cachear escrituras (Firestore, etc.)
  var url = new URL(req.url);

  // No interceptar Firebase / Google APIs: necesitan red para datos y auth.
  if(/firestore|firebaseio|identitytoolkit|googleapis\.com\/(calendar|oauth2|identitytoolkit)|accounts\.google\.com|recaptcha/.test(url.href)){
    return;
  }

  // Navegación: red primero; offline, devuelve la página pedida cacheada
  // (landing o web app) y, si no, la web app como respaldo principal.
  if(req.mode === 'navigate'){
    e.respondWith(
      fetch(req).catch(function(){
        return caches.match(req).then(function(r){
          return r || caches.match('./webapp.html') || caches.match('./index.html');
        });
      })
    );
    return;
  }

  // Resto de estáticos (mismo origen + CDN + fuentes): stale-while-revalidate.
  e.respondWith(
    caches.match(req).then(function(cached){
      var fetched = fetch(req).then(function(res){
        if(res && (res.status === 200 || res.type === 'opaque')){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
        }
        return res;
      }).catch(function(){ return cached; });
      return cached || fetched;
    })
  );
});
