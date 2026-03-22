const CACHE_NAME = 'liero-web-v42';
const ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './js/main.js',
    './js/config.js',
    './js/game.js',
    './js/renderer.js',
    './js/terrain.js',
    './js/player.js',
    './js/weapons.js',
    './js/projectile.js',
    './js/physics.js',
    './js/rope.js',
    './js/bot.js',
    './js/input.js',
    './js/network.js',
    './js/audio.js',
    './js/particles.js',
    './js/ui.js',
    './js/utils.js',
    './js/sprites.js',
    './js/touch.js',
    './assets/sprites.png',
    './assets/icons/icon-192.png',
    './assets/icons/icon-512.png',
    './manifest.json',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Skip WebSocket and non-GET requests
    if (event.request.url.startsWith('ws') || event.request.method !== 'GET') return;

    // Network-first: try network, fallback to cache
    event.respondWith(
        fetch(event.request).then((response) => {
            if (response.ok) {
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
        }).catch(() => {
            return caches.match(event.request);
        })
    );
});
