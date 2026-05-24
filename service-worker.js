/**
 * 田んぼ帳 - Service Worker
 *
 * 戦略:
 *   - 同一オリジンの静的ファイルは「network-first, cache fallback」
 *     → 更新が即時反映される(スマホでも古いキャッシュに固定されない)
 *     → ネット切れ時はキャッシュ品を返す(オフラインでも開ける)
 *   - 外部フォントは cache-first(滅多に変わらないので)
 *   - GAS/Drive はキャッシュせず素通り
 */

const CACHE_NAME = 'tambo-cho-v6';
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

  // GAS への通信はキャッシュしない(SWで横取りしない、ブラウザ任せ)
  if (url.host.includes('script.google.com')) return;

  // Drive 画像はキャッシュしない
  if (url.host.includes('googleusercontent.com') || url.host.includes('drive.google.com')) return;

  // 外部フォント(Google Fonts)は cache-first(滅多に変わらない)
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

  // 同一オリジンの静的ファイルは「network-first, cache fallback」
  //   → 通常時は最新を取りに行き、キャッシュも更新
  //   → 通信失敗時のみキャッシュから返す
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
