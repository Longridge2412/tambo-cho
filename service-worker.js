/**
 * 田んぼ帳 - Service Worker
 *
 * 戦略:
 *   - 同一オリジンの静的ファイルは「network-first, cache fallback」
 *   - 外部フォントは cache-first
 *   - GAS/Drive はキャッシュせず素通り
 */

const CACHE_NAME = 'tambo-cho-v12';
const STATIC_FILES = [
  './',
  './index.html',
  './manifest.json',
  './src/main.js',
  './src/config.js',
  './src/api.js',
  './src/utils.js',
  './src/pages/Home.js',
  './src/pages/Visit.js',
  './src/pages/Facility.js',
  './src/pages/Notes.js',
  './src/pages/History.js',
  './src/pages/Duty.js',
  './src/components/BottomNav.js',
  './src/components/Header.js',
  './src/styles.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.host.includes('script.google.com')) return;
  if (url.host.includes('googleusercontent.com') || url.host.includes('drive.google.com')) return;

  if (url.host.includes('fonts.googleapis.com') || url.host.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return res;
      }))
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(event.request).then(cached =>
          cached || caches.match('./index.html')
        )
      )
  );
});
