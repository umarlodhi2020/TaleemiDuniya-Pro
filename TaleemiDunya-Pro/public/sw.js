// Self-destroying Service Worker to purge all old caches and unregister
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => caches.delete(cache))
      );
    }).then(() => {
      return self.clients.matchAll({ type: "window" }).then((clients) => {
        for (let client of clients) {
          client.navigate(client.url);
        }
      });
    }).then(() => self.registration.unregister())
  );
});