/**
 * 田んぼ帳 - Service Worker
 *
 * Step 1 では「ホーム画面に追加できる」を主目的とする。
 * オフラインキャッシュは最小限(静的ファイルだけ)。
 * API レスポンスや画像はキャッシュしない(常に最新を取りに行く)。
 */

const CACHE_NAME = 'tambo-cho-v3';
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

  // GAS への通信はキャッシュしない
  if (url.host.includes('script.google.com')) return;

  // Drive 画像はキャッシュしない
  if (url.host.includes('googleusercontent.com') || url.host.includes('drive.google.com')) return;

  // 外部フォント(Google Fonts)は cache-first
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

  // 同一オリジンの静的ファイルは cache-first(オフラインでも開ける)
  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request).catch(() =>
        // フォールバック:ホーム画面
        caches.match('./index.html')
      )
    )
  );
});
