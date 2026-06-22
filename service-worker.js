const CACHE_NAME = 'daily-routine-tracker-v1';
const RUNTIME_CACHE = 'daily-routine-tracker-runtime-v1';
const URLS_TO_CACHE = [
  './',
  './daily_routine_tracker.html',
  './manifest.json'
];

// Install event - cache core files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(URLS_TO_CACHE).catch(err => {
        console.log('Cache addAll error:', err);
        // Continue even if caching fails
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first with fallback to cache
self.addEventListener('fetch', event => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // For CDN resources (Tailwind, React, Babel)
  if (request.url.includes('cdn.tailwindcss.com') || 
      request.url.includes('unpkg.com')) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(cache => {
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
    );
    return;
  }

  // For local resources
  event.respondWith(
    caches.match(request).then(response => {
      if (response) {
        return response;
      }

      return fetch(request).then(response => {
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        const responseClone = response.clone();
        caches.open(RUNTIME_CACHE).then(cache => {
          cache.put(request, responseClone);
        });

        return response;
      }).catch(() => {
        // Return offline page or cached response
        return caches.match(request);
      });
    })
  );
});

// Background sync for future offline tracking (optional)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-routines') {
    event.waitUntil(
      // Sync routine data when connection is restored
      Promise.resolve()
    );
  }
});
