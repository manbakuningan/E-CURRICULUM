// ============================================================
// SERVICE WORKER - Sistem Administrasi Guru
// ============================================================
// Penting:
// - Cache HANYA app shell (HTML, CSS, JS, font) supaya app bisa dibuka offline
// - JANGAN pernah cache request ke API_URL (Google Apps Script)
// - Jika API_URL berubah (deploy baru), service worker otomatis skip cache untuk API
// ============================================================

const CACHE_NAME = 'sag-cache-v7'; // naikkan versi jika ada update app shell
const API_HOST = 'script.google.com'; // host backend, JANGAN di-cache

// File app shell yang di-cache untuk offline
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  'https://iili.io/C13PuVa.png', // favicon / app icon
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.1/jspdf.plugin.autotable.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.5/JsBarcode.all.min.js'
];

// INSTALL: cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache satu per satu, abaikan yang gagal (mis. font offline)
      return Promise.allSettled(
        APP_SHELL.map((url) => cache.add(url).catch(() => {}))
      );
    })
  );
  self.skipWaiting(); // aktifkan SW baru segera
});

// ACTIVATE: hapus cache lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim(); // ambil kontrol langsung
});

// FETCH: strategi cache
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // PENTING: JANGAN pernah intercept/cache request ke API backend
  // Biarkan request langsung ke network supaya selalu dapat data terbaru
  if (url.hostname === API_HOST) {
    return; // skip, biarkan browser handle langsung
  }

  // Untuk request lain (app shell, gambar, dll): Network First, fallback ke cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache response sukses (hanya GET)
        if (event.request.method === 'GET' && response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone).catch(() => {});
          });
        }
        return response;
      })
      .catch(() => {
        // Offline: ambil dari cache
        return caches.match(event.request).then((cached) => {
          return cached || caches.match('./index.html');
        });
      })
  );
});

// MESSAGE: handler untuk force update dari client
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
