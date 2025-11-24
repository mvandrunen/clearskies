const CACHE_NAME = "clearskies-shell-v1";
const SHELL_ASSETS = ["/"]; // you can add more paths later if you like

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) =>
          key === CACHE_NAME ? null : caches.delete(key)
        )
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req).catch(() => {
        if (req.mode === "navigate") {
          return caches.match("/");
        }
      });
    })
  );
});
