/* Retire service workers left by applications previously served on this origin. */
self.addEventListener("install", () => {
  void self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(async (cacheName) => await caches.delete(cacheName)));
    await self.registration.unregister();
  })());
});
