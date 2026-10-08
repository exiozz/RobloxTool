/* Spawnpoint : le réseau d'abord, le cache seulement hors connexion. */
const C = 'spawnpoint-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(fetch(r).then(res => {
    if (res.ok) { const c = res.clone(); caches.open(C).then(x => x.put(r, c)); }
    return res;
  }).catch(() => caches.match(r).then(m => m || caches.match('./'))));
});
