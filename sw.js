const CACHE_NAME = "z1tech-attendance-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./style.css",
  "./manifest.json",
  "./models/tiny_face_detector_model-shard1",
  "./models/tiny_face_detector_model-weights_manifest.json",
  "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js"
];

// Install — cache all assets
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — delete old caches
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network first, fallback to cache
self.addEventListener("fetch", e => {
  const url = e.request.url;

  // Google Script API calls — network only (no cache for attendance data)
  if (url.includes("script.google.com")) {
    e.respondWith(
      fetch(e.request).catch(() => {
        // Offline — return special offline marker for app.js to detect
        return new Response(JSON.stringify({ offline: true }), {
          headers: { "Content-Type": "application/json" }
        });
      })
    );
    return;
  }

  // Everything else — cache first, then network
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(response => {
        // Cache new resources
        if (response.ok) {
          let clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      });
    })
  );
});

// Background sync for offline attendance
self.addEventListener("sync", e => {
  if (e.tag === "sync-attendance") {
    e.waitUntil(syncOfflineAttendance());
  }
});

async function syncOfflineAttendance() {
  // Open IndexedDB and get pending records
  const db = await openDB();
  const records = await getAllPending(db);

  for (let record of records) {
    try {
      let res = await fetch(
        "https://script.google.com/a/macros/z1tech.com/s/AKfycbyrfqxx5f20yUAQWWEf8ittksQQmEeFqt9dttcQ7fDZqxB1mvrmpEEsJZCDxsudTAcGwg/exec",
        {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(record.data)
        }
      );
      if (res.ok) {
        await deletePending(db, record.id);
        console.log("Synced offline record:", record.data.name);
      }
    } catch (e) {
      console.log("Sync failed for:", record.data.name);
    }
  }
}

// Simple IndexedDB helpers
function openDB() {
  return new Promise((resolve, reject) => {
    let req = indexedDB.open("z1tech-offline", 1);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore("pending", { keyPath: "id", autoIncrement: true });
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

function getAllPending(db) {
  return new Promise((resolve, reject) => {
    let tx = db.transaction("pending", "readonly");
    let req = tx.objectStore("pending").getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function deletePending(db, id) {
  return new Promise((resolve, reject) => {
    let tx = db.transaction("pending", "readwrite");
    let req = tx.objectStore("pending").delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
