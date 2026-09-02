// ConecktOS service worker — makes the app installable and adds a resilient
// offline experience. Conservative by design: never caches API/auth traffic.
const VERSION = "conecktos-v5";
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

// Minimal shell precached on install so the app can boot offline.
const PRECACHE = [
  "/offline.html",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

const isStaticAsset = (url) =>
  /\.(?:js|css|woff2?|ttf|otf|png|jpg|jpeg|svg|webp|ico|gif)$/i.test(url.pathname) ||
  url.pathname.startsWith("/assets/") ||
  url.pathname.startsWith("/_build/");

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Only handle same-origin requests; never touch Supabase / third-party / API calls.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api")) return;

  // Navigations: network-first, fall back to cached page, then the offline shell.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/offline.html")),
        ),
    );
    return;
  }

  // Static assets: cache-first with background refresh (stale-while-revalidate).
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches.open(RUNTIME_CACHE).then((c) => c.put(request, copy));
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});
