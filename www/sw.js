const CACHE_NAME = 'solar-terms-v2';
const ASSETS_TO_CACHE = [
  '/projects/solar-terms-game/',
  '/projects/solar-terms-game/index.html',
  '/projects/solar-terms-game/css/style.css',
  '/projects/solar-terms-game/js/solarTerms.js',
  '/projects/solar-terms-game/js/world.js',
  '/projects/solar-terms-game/js/weather.js',
  '/projects/solar-terms-game/js/player.js',
  '/projects/solar-terms-game/js/entities.js',
  '/projects/solar-terms-game/js/farming.js',
  '/projects/solar-terms-game/js/ui.js',
  '/projects/solar-terms-game/js/mobile.js',
  '/projects/solar-terms-game/js/main.js',
  '/projects/solar-terms-game/manifest.json',
  'https://unpkg.com/three@0.160.0/build/three.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[SW] Cache addAll partial:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        const fetchPromise = fetch(event.request).then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
          }
          return response;
        }).catch(() => cached);
        return cached;
      }
      return fetch(event.request).then((response) => {
        if (!response.ok) return response;
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/projects/solar-terms-game/index.html');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});
