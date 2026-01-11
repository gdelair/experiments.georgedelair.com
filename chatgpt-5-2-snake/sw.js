/* NEON_SNAKE PWA Service Worker
   - Offline-first for app shell
   - Navigation fallback to cached index.html
*/
const CACHE_VERSION = "v1.0.1";
const APP_CACHE = `neon-snake-${CACHE_VERSION}`;
const RUNTIME_CACHE = `neon-snake-runtime-${CACHE_VERSION}`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./sw.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.map((key) => {
        if (![APP_CACHE, RUNTIME_CACHE].includes(key)) return caches.delete(key);
      })
    );
    await self.clients.claim();
  })());
});

// Helper: cache-first
async function cacheFirst(req) {
  const cache = await caches.open(APP_CACHE);
  const cached = await cache.match(req, {ignoreSearch:true});
  if (cached) return cached;
  const res = await fetch(req);
  if (res && res.ok) cache.put(req, res.clone());
  return res;
}

// Helper: stale-while-revalidate (runtime)
async function staleWhileRevalidate(req) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req).then((res) => {
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => null);

  return cached || (await fetchPromise) || new Response("Offline.", {status: 503});
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin
  if (url.origin !== self.location.origin) return;

  // Navigation requests: serve cached index on failure (offline)
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        // Update cache with freshest index
        const cache = await caches.open(APP_CACHE);
        cache.put("./index.html", fresh.clone());
        return fresh;
      } catch (e) {
        const cache = await caches.open(APP_CACHE);
        return (await cache.match("./index.html")) || (await cache.match("./")) || new Response("Offline.", {status:503});
      }
    })());
    return;
  }

  // App shell: cache-first
  if (APP_SHELL.some(p => url.pathname.endsWith(p.replace("./","")))) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Everything else: stale-while-revalidate
  event.respondWith(staleWhileRevalidate(req));
});