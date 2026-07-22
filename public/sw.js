const CACHE_NAME = "taleemi-dunya-cache-v6"; // Version 6: Network-First Strategy, Fixed Bug

// Zaroori files jo offline ke liye pehle se save honi chahiye
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json"
];

self.addEventListener("install", (event) => {
  self.skipWaiting(); // Naye version ko foran active karein
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache); // Purana cache delete karein
          }
        })
      );
    })
  );
});

self.addEventListener("fetch", (event) => {
  // Sirf GET requests ko cache karein
  if (event.request.method !== "GET") return;

  // 🔥 UPDATE: Localhost (development) par cache disable karein taake live changes nazar aayein
  if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
    return;
  }

  // Firebase database ki calls ko ignore karein (Firebase apna offline khud handle karega)
  if (event.request.url.includes("firestore.googleapis.com") || event.request.url.includes("google.com")) {
    return;
  }

  // 🔥 NETWORK-FIRST STRATEGY: Hamesha live version laye, offline hone par cache use kare
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Agar internet chal raha hai aur response theek hai, toh cache ko update kar lo
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Agar internet band hai (offline) ya request fail ho jaye, toh cache se data nikal lo
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;

        // Agar koi aur page (router link) open kare offline mein, toh main index.html file dikhao
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      })
  );
});