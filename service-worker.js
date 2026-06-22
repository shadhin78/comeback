const CACHE_NAME = 'daily-routine-tracker-v1';
const RUNTIME_CACHE = 'daily-routine-tracker-runtime-v1';
const URLS_TO_CACHE = [
  '/',
  '/daily_routine_tracker.html',
  '/manifest.json'
];

// Install event
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching core files');
        return cache.addAll(URLS_TO_CACHE).catch(err => {
          console.log('[Service Worker] Cache addAll error (non-critical):', err);
        });
      })
      .catch(err => {
        console.log('[Service Worker] Install error:', err);
      })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .catch(err => {
        console.log('[Service Worker] Activate error:', err);
      })
  );
  self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', event => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle CDN resources
  if (request.url.includes('cdn.tailwindcss.com') || 
      request.url.includes('unpkg.com') ||
      request.url.includes('cdnjs')) {
    event.respondWith(
      caches.open(RUNTIME_CACHE)
        .then(cache => {
          return fetch(request)
            .then(response => {
              if (response && response.status === 200) {
                cache.put(request, response.clone());
              }
              return response;
            })
            .catch(() => {
              return cache.match(request);
            });
        })
        .catch(() => {
          return fetch(request);
        })
    );
    return;
  }

  // Handle local resources
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          return response;
        }

        return fetch(request)
          .then(response => {
            if (!response || response.status !== 200) {
              return response;
            }

            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE)
              .then(cache => {
                cache.put(request, responseClone);
              })
              .catch(err => {
                console.log('[Service Worker] Cache put error:', err);
              });

            return response;
          })
          .catch(err => {
            console.log('[Service Worker] Fetch error for', request.url, err);
            return caches.match(request);
          });
      })
      .catch(err => {
        console.log('[Service Worker] Match error:', err);
        return fetch(request);
      })
  );
});
