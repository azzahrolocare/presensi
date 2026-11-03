const CACHE_NAME = 'presensi-azzahro-v1.0.8';
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwCXbDTuaFkN7GlcXJxaFgDaKPEp2G9vySF1IKfWxUCTuEOCYt39nMmlEmI25pz4PSd/exec';
const REKAP_URL = 'https://azzahrolocare.github.io/rekapitulasi-presensi-siswa/';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './logo-smp-azzahro.png',
  './logo-smk-azzahro.png',
  './notification/Notif01.mp3',
  './icon-presensi.png',
  // Pustaka eksternal (CDN)
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/lucide@latest',
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,400&display=swap'
];

// 1. INSTALL: Simpan aset dengan aman (menggunakan try-catch agar tidak gagalkan instalasi jika ada CDN yang error)
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of ASSETS_TO_CACHE) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn('Gagal cache aset (diabaikan agar SW tetap terpasang):', asset, err);
        }
      }
    })
  );
});

// 2. ACTIVATE: Bersihkan cache lama
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  return self.clients.claim();
});

// 3. FETCH: Proxy Cache (Mendukung file lokal & CDN eksternal saat offline)
self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('script.google.com')) return;
  
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).then((networkResponse) => {
        return networkResponse;
      }).catch(() => {
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// 4. SYNC: Jalankan pengiriman data saat internet kembali tersedia
self.addEventListener('sync', (e) => {
  if (e.tag === 'sinkron-presensi') {
    console.log('SW: Sinkronisasi latar belakang dimulai...');
    e.waitUntil(kirimDataDariIndexedDB());
  }
});

// 5. LOGIKA PENGIRIMAN DATA MASSAL (STABIL)
async function kirimDataDariIndexedDB() {
  const dbPromise = new Promise((resolve) => {
    const request = indexedDB.open("PresensiOfflineDB", 1);
    request.onsuccess = () => resolve(request.result);
  });

  const db = await dbPromise;
  if (!db || !db.objectStoreNames.contains("antrean")) return;

  const transaction = db.transaction(["antrean"], "readwrite");
  const store = transaction.objectStore("antrean");
  const dataAntrean = await new Promise(resolve => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
  });

  if (dataAntrean && dataAntrean.length > 0) {
    let suksesCount = 0;
    let gagalCount = 0;

    for (const item of dataAntrean) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); 

        await fetch(`${SCRIPT_URL}?nama=${encodeURIComponent(item.nama)}&keterangan=${encodeURIComponent(item.keterangan)}`, { 
          method: 'GET', 
          mode: 'no-cors',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        suksesCount++;
        
        const deleteTx = db.transaction(["antrean"], "readwrite");
        deleteTx.objectStore("antrean").delete(item.id);
        
        await new Promise(r => setTimeout(r, 300));
        
      } catch (err) {
        console.error("SW: Gagal kirim satu item, lanjut berikutnya.", err);
        gagalCount++;
      }
    }
    
    if (suksesCount > 0) {
      showNotification(
        `Sinkronisasi Selesai`, 
        `${suksesCount} data berhasil terkirim. ${gagalCount > 0 ? gagalCount + ' tertunda.' : 'Klik untuk rekap.'}`
      );
    }
  }
}

// 6. NOTIFIKASI SISTEM
function showNotification(title, body) {
  if (self.registration.showNotification) {
    self.registration.showNotification(title, {
      body: body,
      icon: './icon-presensi.png',
      badge: './icon-presensi.png',
      vibrate: [200, 100, 200],
      tag: 'sync-notification',
      data: { url: REKAP_URL },
      requireInteraction: true 
    });
  }
}

// 7. HANDLING KLIK NOTIFIKASI
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url === REKAP_URL && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(REKAP_URL);
      }
    })
  );
});
