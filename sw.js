/*************************************************************
 * SERVICE WORKER - App Shell Caching (Offline-First)
 * Menyimpan file HTML/CSS/JS/CDN di cache browser supaya
 * aplikasi tetap bisa DIBUKA walau tidak ada koneksi internet.
 * Data (via GAS API) tetap ditangani terpisah oleh localStorage
 * di index.html (lihat DB_PREFIX / dbGet / dbSet).
 *************************************************************/
const CACHE_NAME = 'sag-shell-v1';
const SHELL_FILES = [
  '/',
  '/index.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).catch(() => {})
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

// Strategi: Network first untuk request ke API (Google Apps Script) supaya data selalu fresh saat online.
// Cache first untuk file app shell (HTML/CSS/JS/CDN) supaya bisa dibuka instan & offline.
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Jangan cache request ke GAS API - biarkan logic offline-queue di index.html yang menangani
  if (url.includes('script.google.com')) {
    return; // biarkan browser handle langsung (fetch asli), fail natural kalau offline
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          // Simpan salinan ke cache utk dipakai offline nanti
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
          return response;
        })
        .catch(() => caches.match('/index.html')); // fallback offline
    })
  );
});
