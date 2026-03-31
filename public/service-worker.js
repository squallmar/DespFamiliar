const CACHE_NAME = 'despfamiliar-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/offline.html',
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((error) => {
        console.warn('Cache addAll failed:', error);
      });
    })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const requestUrl = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip unsupported schemes (e.g. chrome-extension://)
  if (!['http:', 'https:'].includes(requestUrl.protocol)) {
    return;
  }

  // Skip cross-origin requests
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  // Skip API requests and external URLs
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return new Response(
            JSON.stringify({ error: 'Offline' }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        });
      })
    );
    return;
  }

  // Network first strategy for assets
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok && response.type === 'basic') {
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clonedResponse).catch(() => {
              // Ignore cache write errors for non-cacheable requests
            });
          });
        }

        return response;
      })
      .catch(() => {
        // Return cached response or offline page
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return caches.match('/').then((fallbackResponse) => {
            if (fallbackResponse) return fallbackResponse;
            return new Response('Offline', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            });
          });
        });
      })
  );
});

// Handle push notifications
self.addEventListener('push', (event) => {
  const options = {
    badge: '/next.svg',
    icon: '/next.svg',
    vibrate: [100, 50, 100],
    tag: 'desp-notification',
    requireInteraction: false,
  };

  if (event.data) {
    const data = event.data.json();
    options.title = data.title || 'DespFamiliar';
    options.body = data.body || '';
    options.data = data.data || {};
  } else {
    options.title = 'DespFamiliar';
    options.body = 'Nova notificação';
  }

  event.waitUntil(self.registration.showNotification(options.title, options));
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
