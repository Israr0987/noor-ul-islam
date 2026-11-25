/* Noor-ul-Islam Service Worker — Created by Israr */
const CACHE_NAME = 'noor-ul-islam-v5';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './data.js',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Network-first for API calls (AlAdhan & AlQuran Cloud), fallback to cache
  if (url.origin.includes('api.aladhan.com') || url.origin.includes('api.alquran.cloud')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Do not cache large streaming audio MP3s aggressively in SW cache
  if (url.pathname.endsWith('.mp3')) {
    return;
  }

  // Cache-first for app shell & Google Fonts, updating in background
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // Stale-while-revalidate for same-origin files
        if (url.origin === self.location.origin) {
          fetch(request).then((response) => {
            if (response && response.ok) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, response));
            }
          }).catch(() => {});
        }
        return cached;
      }
      return fetch(request).then((response) => {
        if (response && response.ok && (url.origin === self.location.origin || url.origin.includes('fonts.g'))) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => {
        if (request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

async function notifyClientsStopAzan() {
  const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clientList) {
    client.postMessage({ type: 'STOP_AZAN' });
  }
  return clientList;
}

self.addEventListener('notificationclose', (event) => {
  event.waitUntil(notifyClientsStopAzan());
});

self.addEventListener('notificationclick', (event) => {
  const action = event.action;
  event.notification.close();

  event.waitUntil(
    notifyClientsStopAzan().then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          return;
        }
      }
      if (action !== 'stop-azan' && self.clients.openWindow) {
        return self.clients.openWindow('./index.html');
      }
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
