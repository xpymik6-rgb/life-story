// Кладём приложение в кэш при установке — дальше оно работает без интернета.
const CACHE = 'lsg-v1';
const FILES = [
  '.', 'index.html', 'styles.css', 'fonts.css', 'questions.js', 'app.js',
  'manifest.json', 'icon-192.png', 'icon-512.png',
  'fonts/cormorant-garamond-500-cyrillic.woff2', 'fonts/cormorant-garamond-500-latin.woff2',
  'fonts/golos-text-400-cyrillic.woff2', 'fonts/golos-text-400-latin.woff2',
  'fonts/golos-text-500-cyrillic.woff2', 'fonts/golos-text-500-latin.woff2'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});
