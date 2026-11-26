const cachePrefix = 'expense-tracker-offline-';
// Increment this version when offline.html changes.
const cacheName = `${cachePrefix}v1`;
const offlineUrl = new URL('offline.html', self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.add(new Request(offlineUrl, { cache: 'reload' }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith(cachePrefix) && name !== cacheName)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Cache only the public fallback page. API calls and attachments go to the network.
  if (request.mode !== 'navigate' || request.method !== 'GET' ||
      new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(fetch(request).catch(async () => {
    const cache = await caches.open(cacheName);
    return (await cache.match(offlineUrl)) ?? Response.error();
  }));
});
