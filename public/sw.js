const CACHE_NAME = "interliga-v3";
const PRECACHE = [
  "/",
  "/icon.svg",
  "/manifest.json",
  "/data/officialPlayers.json",
  "/data/officialFixtures.json",
  "/data/officialEvaluatedMatches.json",
  "/data/officialEvaluatedPredictions.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll(PRECACHE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Only same-origin requests are handled. Cross-origin resources (crests in
// a.espncdn.com / r2.thesportsdb.com / crests.football-data.org) must go
// straight to the network: re-fetching them from a service worker fails with
// net::ERR_FAILED and every club logo renders broken.
const isSameOrigin = (url) => url.origin === self.location.origin;

// Immutable, content-hashed assets: safe to serve from cache first.
const isImmutable = (url) =>
  url.pathname.startsWith("/_next/static/") ||
  url.pathname.startsWith("/logos/") ||
  url.pathname.endsWith(".woff2");

// Data bundles are rewritten every 30 min by the cron: network first, cache
// only as offline fallback (cache-first froze results for returning users).
const isData = (url) => url.pathname.startsWith("/data/");

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;

  const url = new URL(e.request.url);
  if (!isSameOrigin(url)) return;

  if (isImmutable(url)) {
    e.respondWith(
      caches.match(e.request).then(
        (cached) =>
          cached ||
          fetch(e.request).then((r) => {
            if (r.ok) {
              const clone = r.clone();
              caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
            }
            return r;
          })
      )
    );
    return;
  }

  if (isData(url)) {
    e.respondWith(
      fetch(e.request)
        .then((r) => {
          if (r.ok) {
            const clone = r.clone();
            caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
          }
          return r;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Network-first for HTML pages and everything else same-origin.
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.ok) {
          const clone = r.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
        }
        return r;
      })
      .catch(() => caches.match(e.request))
  );
});
