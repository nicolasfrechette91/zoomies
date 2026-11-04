// Offline support: network first (so updates show up right away), cache as a fallback.
const CACHE = 'zoomies-v2';
const CORE = [
  './',
  'index.html',
  'style.css',
  'manifest.webmanifest',
  'assets/ranchy-real.jpg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
  'src/main.js',
  'src/util.js',
  'src/loop.js',
  'src/view.js',
  'src/input.js',
  'src/storage.js',
  'src/audio.js',
  'src/room.js',
  'src/levels.js',
  'src/objects.js',
  'src/cat.js',
  'src/hazards.js',
  'src/pickups.js',
  'src/particles.js',
  'src/game.js',
  'src/ui.js',
  'src/art/draw.js',
  'src/art/ranchy.js',
  'src/art/items.js',
  'src/art/room.js',
  'src/art/props.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())),
      ),
  );
});
