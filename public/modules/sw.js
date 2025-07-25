

const CACHE_NAME = 'adapt-cache-v3'; // Bump version to force update
const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  // Key assets will be cached on first visit by the fetch handler
];

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(APP_SHELL_URLS);
      })
      .catch(error => {
        console.error('Failed to cache app shell during install:', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});


self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignore non-http requests (e.g., chrome-extension://) and non-GET requests
  if (!request.url.startsWith('http') || request.method !== 'GET') {
    return;
  }

  // Strategy: Stale-While-Revalidate for all assets (JS, CSS, fonts, etc.)
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          // If we get a valid response, update the cache
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(err => {
          // Handle navigation fetch failures for offline SPA support
          if (request.mode === 'navigate') {
            console.log('Service Worker: Fetch failed for navigation. Returning app shell.');
            return caches.match('/index.html');
          }
          console.error('Service Worker: Fetch failed for asset.', err);
        });

        // Return the cached response immediately if available, otherwise wait for the network
        return cachedResponse || fetchPromise;
      });
    })
  );
});