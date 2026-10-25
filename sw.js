// Haze Squad's service worker (GitHub Pages only): the game works offline once it has been opened.
// The page is network-first (so updates arrive), icons are cache-first, music is cached the first time it plays,
// and the leaderboard is always fetched fresh when online.
const V = 'haze-squad-d2f8d311ff';
const CORE = ['./', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('haze-squad-') && k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request, u = new URL(req.url);
  if (req.method !== 'GET' || u.origin !== location.origin) return;
  if (u.pathname.endsWith('/leaderboard.json')) { e.respondWith(fetch(req).catch(() => caches.match(req, { ignoreSearch: true }))); return; }
  if (u.pathname.includes('/music/')) { e.respondWith(music(req)); return; }
  if (req.mode === 'navigate') {
    // always check for a newer page, so an update reaches players straight away
    e.respondWith(fetch(new Request(req.url, { cache: 'no-cache', credentials: 'same-origin' })).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(V).then((c) => c.put('./', cp)); } return res; })
      .catch(() => caches.match('./')));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok && res.status === 200) { const cp = res.clone(); caches.open(V).then((c) => c.put(req, cp)); }
    return res;
  })));
});
// audio asks for byte ranges; serve them from the cached whole file, or fetch and cache the whole file in the background
async function music(req) {
  const cache = await caches.open(V), url = req.url.split('?')[0], hit = await cache.match(url);
  if (!hit) {
    fetch(url).then((r) => { if (r.ok && r.status === 200) cache.put(url, r); }).catch(() => {});
    return fetch(req);
  }
  const range = req.headers.get('range');
  if (!range) return hit;
  const buf = await hit.arrayBuffer(), size = buf.byteLength, m = /bytes=(\d*)-(\d*)/.exec(range);
  const start = m && m[1] ? +m[1] : 0, end = m && m[2] ? Math.min(+m[2], size - 1) : size - 1;
  return new Response(buf.slice(start, end + 1), { status: 206, headers: { 'Content-Type': 'audio/mpeg', 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' } });
}
