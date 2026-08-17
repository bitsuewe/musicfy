// Musicfy Background Audio & PWA Service Worker
const CACHE_NAME = 'musicfy-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let network requests pass through natively
  // This service worker ensures the PWA is recognized as a standalone app with background capability
});
