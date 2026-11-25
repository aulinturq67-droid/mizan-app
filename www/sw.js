/* MIZAN service worker — gabungan sw.js lama + perbaikan.
   Naikkan angka CACHE (mizan-web-v18, dst.) setiap merilis versi baru. */
const CACHE = 'mizan-web-v17';
const ASSETS = ['./', './index.html', './data.json', './manifest.json', './icon.svg'];

self.addEventListener('install', e => {
  /* tiap file dicoba sendiri-sendiri: kalau satu tidak ada (mis. data.json di folder www APK),
     service worker tetap terpasang */
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(ASSETS.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return; /* API, font, peta: langsung ke jaringan */
  e.respondWith((async () => {
    try {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 4000);
      /* no-store: lewati cache HTTP (GitHub Pages menahan file ±10 menit) supaya update langsung terlihat */
      const res = await fetch(req, { cache: 'no-store', signal: ctl.signal });
      clearTimeout(t);
      if (res && res.status === 200 && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    } catch (err) {
      return (await caches.match(req, { ignoreSearch: true }))
          || (req.mode === 'navigate' ? await caches.match('./index.html') : null)
          || Response.error();
    }
  })());
});
