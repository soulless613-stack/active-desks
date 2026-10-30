/**
 * @file sw.js
 * @description Progressive Web App Service Worker for Active Desks v3.0.
 * Pre-caches shell assets for offline startup while allowing Firebase Firestore
 * to manage its own multi-tab IndexedDB replication natively.
 */

const CACHE_NAME = 'active-desks-v3-1.0.4';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './qrious.min.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './js/app.js',
  './js/firebase.js',
  './js/state.js',
  './js/anchors.js',
  './js/settings-modal.js',
  './js/desks/desk-manager.js',
  './js/desks/reading.js',
  './js/desks/kitchen.js',
  './js/desks/gaming.js',
  './js/desks/fiber.js',
  './js/desks/tech.js',
  './js/captures/capture-dock.js',
  './js/captures/drawer.js',
  './js/captures/taxonomy.js'
];

const BYPASS_HOSTS = [
  'firestore.googleapis.com',
  'firebaseinstallations.googleapis.com',
  'identitytoolkit.googleapis.com',
  'generativelanguage.googleapis.com',
  'api.github.com'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
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
  const url = new URL(event.request.url);

  // Bypass cloud APIs, Firestore live streams, and non-GET requests
  if (event.request.method !== 'GET' || BYPASS_HOSTS.some(host => url.hostname.includes(host))) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Stale-while-revalidate for local assets
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {/* Offline fallback */});
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        return response;
      });
    })
  );
});
