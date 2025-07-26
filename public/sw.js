const CACHE_NAME = 'adapt-cache-v3'; // Bump version to force update
const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  // Add other static assets here if needed (e.g., '/favicon.ico', '/logo.svg')
];

self.addEventListener('install', (event) => {
  console.log('SW: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Caching app shell');
      return cache.addAll(APP_SHELL_URLS);
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('SW: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('SW: Deleting old cache', cacheName);
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

  // Bypass caching for API calls, especially Firebase Functions, to avoid CORS and other issues.
  if (request.url.includes('cloudfunctions.net') || request.url.includes('/api/')) {
    // Just fetch from the network, don't try to cache.
    event.respondWith(fetch(request));
    return;
  }

  if (!request.url.startsWith('http') || request.method !== 'GET') return;

  // Always try cache first, then revalidate for app shell and static assets
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch((err) => {
            if (request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            console.error('SW fetch failed:', err);
          });

        return cachedResponse || fetchPromise;
      })
    )
  );
});