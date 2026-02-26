const CACHE_NAME = 'mantap-ksc-v1';
const urlsToCache = [
  '/MANTAP_Ver.001/',
  '/MANTAP_Ver.001/index.html',
  '/MANTAP_Ver.001/manifest.json',
  '/MANTAP_Ver.001/icon-192.png',
  '/MANTAP_Ver.001/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
