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

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip API requests and external URLs
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(request);
      })
    );
    return;
  }

  // Network first strategy for assets
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Clone the response
        const clonedResponse = response.clone();

        // Store successful responses in cache
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, clonedResponse);
        });

        return response;
      })
      .catch(() => {
        // Return cached response or offline page
        return caches.match(request).then((cachedResponse) => {
          return cachedResponse || caches.match('/');
        });
      })
  );
});

// Handle push notifications
self.addEventListener('push', (event) => {
  const options = {
    badge: '/icon-192.png',
    icon: '/icon-192.png',
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
