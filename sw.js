/**
 * @file sw.js
 * @description Service Worker for Active Desks v2.0.
 * Implements the Network-First with Cache Fallback strategy from the Offline Cookbook
 * to guarantee instantaneous offline availability of the app shell while ensuring
 * online clients immediately receive fresh updates.
 */

const CACHE_NAME = 'active-desks-v2-1.0.1';

/**
 * Static assets pre-cached during service worker installation.
 * Relative paths ensure portability across localhost, sub-paths, and custom domains.
 */
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './assets/icons/icon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './js/app.js',
  './js/db.js',
  './js/state.js',
  './js/importer.js',
  './js/settings-modal.js',
  './js/desks/desk-manager.js',
  './js/desks/anchors.js',
  './js/desks/reading.js',
  './js/desks/kitchen.js',
  './js/desks/gaming.js',
  './js/desks/fiber.js',
  './js/desks/tech.js',
  './js/captures/capture-dock.js',
  './js/captures/drawer.js',
  './js/captures/intake.js',
  './js/captures/taxonomy.js',
  './js/sync/sync-manager.js',
  './js/sync/export-provider.js',
  './js/sync/drive-provider.js',
  './js/sync/p2p-provider.js'
];

/**
 * Domains and schemes explicitly bypassed from cache storage.
 */
const BYPASS_HOSTS = [
  'generativelanguage.googleapis.com',
  'googleapis.com',
  'accounts.google.com',
  'apis.google.com'
];

/**
 * Service Worker Installation: Pre-caches critical app shell assets.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn('⚠️ Pre-caching encountered an issue:', err);
      })
  );
});

/**
 * Service Worker Activation: Purges outdated cache versions and claims active clients.
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('active-desks-') && name !== CACHE_NAME)
            .map((staleName) => {
              console.log('🧹 Purging outdated service worker cache:', staleName);
              return caches.delete(staleName);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

/**
 * Fetch Strategy: Network-First with Cache Fallback for App Shell.
 * Always attempts live network fetch first to load the freshest bundle.
 * Falls back to IndexedDB/Cache upon offline status or network failure.
 */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. Only intercept GET requests
  if (req.method !== 'GET') {
    return;
  }

  // 2. Bypass external APIs, authentication endpoints, and non-HTTP protocols
  if (!url.protocol.startsWith('http') || BYPASS_HOSTS.some(host => url.hostname.includes(host))) {
    return;
  }

  // 3. Network-First with Cache Fallback
  event.respondWith(
    fetch(req)
      .then((networkResponse) => {
        // Cache valid local responses
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, responseToCache));
        }
        return networkResponse;
      })
      .catch(() => {
        // Network unavailable: consult local cache
        return caches.match(req).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If HTML navigation failed while offline, fallback to root index.html
          if (req.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('Network offline and asset not pre-cached.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' })
          });
        });
      })
  );
});
