const CACHE_NAME = 'nagorody-57ompbr-v61';
const APP_SHELL = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './offline.html'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return key !== CACHE_NAME; })
          .map(function (key) { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;

  if (req.method !== 'GET') return;

  // API-запити (Google Apps Script) — завжди йдемо в мережу, без кешування
  if (req.url.indexOf('script.google.com') !== -1) {
    event.respondWith(
      fetch(req).catch(function () {
        return new Response(
          JSON.stringify({ ok: false, error: 'offline' }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // Навігаційні запити (відкриття сторінки/застосунку) — мережа спочатку,
  // офлайн-сторінка як резерв. cache:'no-store' — щоб браузерний HTTP-кеш
  // теж не підсовував стару версію index.html, навіть якщо GitHub Pages
  // віддає його з дозволяючими кешування заголовками.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req, { cache: 'no-store' }).catch(function () {
        return caches.match('./offline.html');
      })
    );
    return;
  }

  // Статичні файли app shell — кеш спочатку, мережа як резерв
  event.respondWith(
    caches.match(req).then(function (cached) {
      return cached || fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var resClone = res.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(req, resClone);
          });
        }
        return res;
      }).catch(function () {
        // для зображень немає окремого резерву
      });
    })
  );
});
