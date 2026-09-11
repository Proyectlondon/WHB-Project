const CACHE_NAME = 'whb-shell-v4';
const SHELL = ['./', './index.html', './styles.css', './app.js', './content/catalog.json', './manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const isMedia = /\.(?:mp3|mp4|webm|ogg|m4a)$/i.test(url.pathname);
  if (isMedia || event.request.headers.has('range') || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  const isShellRequest = event.request.mode === 'navigate' || /\.(?:html?|css|js|json|webmanifest)$/i.test(url.pathname);
  if (!isShellRequest) return;

  // HTML, CSS, JS y catálogo priorizan red: así una visita posterior a una
  // publicación recibe la versión nueva y el caché solo protege una caída real.
  event.respondWith((async () => {
    try {
      const response = await fetch(event.request);
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(event.request, response.clone());
      }
      return response;
    } catch {
      const cached = await caches.match(event.request);
      return cached || new Response('Sin conexión. Intenta de nuevo cuando recuperes internet.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  })());
});

