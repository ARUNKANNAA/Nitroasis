const CACHE_NAME = 'nitroasis-v1.0.0';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './stl_viewer.js',
  './hardware.jpg',
  './transmitter_top.stl',
  './transmitter_bottom.stl',
  './lib/three.min.js',
  './lib/OrbitControls.js',
  './lib/STLLoader.js',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
