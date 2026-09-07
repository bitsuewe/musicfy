const CACHE_NAME = 'musicfy-app-v3';

const STATIC_CORE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg'
];

// 1. Service Worker Installation: Precache core shell and dynamically discovered asset bundles
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Precache known static core
      await cache.addAll(STATIC_CORE).catch((err) => {
        console.warn('SW precache static core error:', err);
      });

      // Discover and precache active scripts & stylesheets referenced in /index.html
      try {
        const indexRes = await fetch('/index.html', { cache: 'no-cache' });
        if (indexRes && indexRes.ok) {
          const htmlText = await indexRes.text();
          const discoveredAssets = [];

          // Extract <script ... src="(...)">
          const scriptMatches = htmlText.matchAll(/<script[^>]+src=["']([^"']+)["']/gi);
          for (const m of scriptMatches) {
            const src = m[1];
            if (src && !src.startsWith('http://') && !src.startsWith('https://')) {
              discoveredAssets.push(src);
            }
          }

          // Extract <link ... href="(...)"> (stylesheets, preloads)
          const linkMatches = htmlText.matchAll(/<link[^>]+href=["']([^"']+)["']/gi);
          for (const m of linkMatches) {
            const href = m[1];
            if (
              href &&
              !href.startsWith('http://') &&
              !href.startsWith('https://') &&
              !href.endsWith('.json') &&
              !href.endsWith('.svg')
            ) {
              discoveredAssets.push(href);
            }
          }

          if (discoveredAssets.length > 0) {
            await Promise.allSettled(
              discoveredAssets.map((assetUrl) => cache.add(assetUrl))
            );
          }
        }
      } catch (e) {
        console.warn('SW dynamic asset discovery error:', e);
      }

      return self.skipWaiting();
    })()
  );
});

// 2. Service Worker Activation: Purge stale caches & immediately claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
      return self.clients.claim();
    })()
  );
});

// Helper: Attempt to match from cache with flexible fallbacks
async function matchFromCache(request, url) {
  const cache = await caches.open(CACHE_NAME);

  // 1. Exact request match
  let cached = await cache.match(request);
  if (cached) return cached;

  // 2. Match ignoring search params (crucial for Vite query hashes ?v=..., ?t=...)
  cached = await cache.match(request, { ignoreSearch: true });
  if (cached) return cached;

  // 3. Match pathname directly
  if (url && url.pathname) {
    cached = await cache.match(url.pathname, { ignoreSearch: true });
    if (cached) return cached;
  }

  return null;
}

// 3. Fetch Interception
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Pass through backend APIs and media streaming to IndexedDB & browser audio engine
  if (url.pathname.startsWith('/api/') || url.pathname.includes('/music/stream/')) {
    return;
  }

  // Handle SPA Navigation Requests (e.g., refreshing on /, /library, /discover, /profile, etc.)
  const isNavigation =
    request.mode === 'navigate' ||
    (request.headers.get('accept') && request.headers.get('accept').includes('text/html'));

  if (isNavigation) {
    event.respondWith(
      (async () => {
        // Try network first with a rapid timeout
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Network timeout')), 1800)
          );
          const networkResponse = await Promise.race([fetch(request), timeoutPromise]);
          if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put('/index.html', networkResponse.clone()).catch(() => {});
            return networkResponse;
          }
        } catch (e) {
          // Network failed or offline — fall through to cache
        }

        // Return cached HTML app shell
        const cache = await caches.open(CACHE_NAME);
        const cachedHtml =
          (await cache.match('/index.html')) ||
          (await cache.match('/')) ||
          (await cache.match(request, { ignoreSearch: true }));

        if (cachedHtml) {
          return cachedHtml;
        }

        return new Response(
          `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Musicfy Offline</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="background:#09090B;color:#FAFAFA;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;margin:0"><div style="text-align:center"><h2 style="color:#10B981;font-size:24px;margin-bottom:8px">Musicfy Offline</h2><p style="color:#A1A1AA;font-size:14px">Please reconnect to load web features, or access your saved offline music.</p><button onclick="window.location.reload()" style="margin-top:16px;padding:10px 20px;border-radius:12px;background:#10B981;border:none;color:#000;font-weight:bold;cursor:pointer">Reload Page</button></div></body></html>`,
          { status: 200, headers: { 'Content-Type': 'text/html' } }
        );
      })()
    );
    return;
  }

  // Handle Static Assets (Scripts, Styles, Images, Fonts, JSON)
  event.respondWith(
    (async () => {
      // 1. Try cache match first
      const cached = await matchFromCache(request, url);
      if (cached) {
        // Update in background if online (Stale-While-Revalidate)
        if (self.navigator.onLine) {
          fetch(request)
            .then(async (fresh) => {
              if (fresh && fresh.status === 200) {
                const cache = await caches.open(CACHE_NAME);
                cache.put(request, fresh);
              }
            })
            .catch(() => {});
        }
        return cached;
      }

      // 2. Fetch from network
      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.status === 200) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone()).catch(() => {});
        }
        return networkResponse;
      } catch (err) {
        // Offline Fallback for non-cached assets to avoid breaking the page
        if (request.destination === 'script' || url.pathname.endsWith('.js') || url.pathname.endsWith('.jsx')) {
          // Check if any matching script exists in cache
          const cache = await caches.open(CACHE_NAME);
          const keys = await cache.keys();
          const jsKey = keys.find((k) => k.url.endsWith('.js') && !k.url.includes('sw.js'));
          if (jsKey) {
            const fallbackJs = await cache.match(jsKey);
            if (fallbackJs) return fallbackJs;
          }
          return new Response('/* Musicfy offline script fallback */', {
            status: 200,
            headers: { 'Content-Type': 'application/javascript' }
          });
        }

        if (request.destination === 'style' || url.pathname.endsWith('.css')) {
          return new Response('/* Musicfy offline style fallback */', {
            status: 200,
            headers: { 'Content-Type': 'text/css' }
          });
        }

        if (request.destination === 'image' || url.pathname.endsWith('.svg') || url.pathname.endsWith('.png')) {
          return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>',
            { status: 200, headers: { 'Content-Type': 'image/svg+xml' } }
          );
        }

        return new Response('Offline asset unavailable', { status: 503, statusText: 'Offline' });
      }
    })()
  );
});
