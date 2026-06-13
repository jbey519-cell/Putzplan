const CACHE_NAME = 'putzplan-nico-v7';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install: pre-cache the core app shell.
// WICHTIG: cache.addAll() bricht komplett ab, wenn AUCH NUR EINE Datei
// (z.B. ein fehlendes Icon) einen Fehler/404 liefert – dann wird der
// Service Worker NIE aktiv und die App ist nicht installierbar/offline-fähig.
// Daher hier jede Datei einzeln cachen und Fehler einzeln ignorieren.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(
        CORE_ASSETS.map(url =>
          cache.add(url).catch(err => console.warn('SW: konnte nicht cachen:', url, err))
        )
      )
    ).then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for the app shell, network-first (with cache fallback) for everything else
self.addEventListener('fetch', event => {
  const req = event.request;
  if(req.method !== 'GET') return;

  const url = new URL(req.url);
  const isCoreAsset = url.origin === self.location.origin;

  if(isCoreAsset){
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        return res;
      }).catch(() => cached))
    );
  } else {
    // External resources (fonts, html2pdf): try network, fall back to cache, ignore failures
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req))
    );
  }
});
