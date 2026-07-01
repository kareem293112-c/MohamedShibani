const CACHE_NAME = 'accounting-app-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg'
];

// Install Event - Caches core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching App Shell and static assets...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activate Event - Clears old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch Event - Serves from cache, caches new assets on demand
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bypass API requests or chrome-extensions
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh in background to update cache (Stale-While-Revalidate pattern)
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, networkResponse);
            });
          }
        }).catch(() => {/* Ignore network errors offline */});

        return cachedResponse;
      }

      // If not in cache, fetch from network and cache
      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Offline Fallback for HTML
        if (request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});

// Background Sync API implementation
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-accounting-data') {
    console.log('[Service Worker] Triggering background sync queue...');
    event.waitUntil(syncLocalDataToServer());
  }
});

// Handle push notification or messaging if needed
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Mock sync runner to server
async function syncLocalDataToServer() {
  // In a real production backend, the service worker would query IndexedDB here,
  // fetch the sync queue, and transmit it to the API server.
  // We notify any active windows of the background sync execution.
  const clientsList = await self.clients.matchAll();
  clientsList.forEach((client) => {
    client.postMessage({
      type: 'BACKGROUND_SYNC_COMPLETED',
      timestamp: new Date().toISOString()
    });
  });
}
