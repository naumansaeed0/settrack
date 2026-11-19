const version = "c0087e8d5079";
const files = ["/settrack/assets/hero-tip2G_vI.webp","/settrack/assets/index-BhOm8yco.js","/settrack/assets/index-CMOjBpuE.css","/settrack/icon-192.png","/settrack/icon-512.png","/settrack/index.html","/settrack/manifest.webmanifest","/settrack/mark.svg"];
const prefix = `settrack-shell:${self.registration.scope}:`;
const cacheName = `${prefix}${version}`;
const shell = new URL('index.html', self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(files.map((file) => new Request(new URL(file, self.registration.scope), { cache: 'reload' })))));
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith(prefix) && key !== cacheName) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || !request.url.startsWith(self.registration.scope)) return;
  const navigation = request.mode === 'navigate';
  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);
  if (navigation && url.pathname !== scope.pathname && url.href.split('?')[0] !== shell) return;
  event.respondWith(caches.open(cacheName).then(async (cache) =>
    (await cache.match(navigation ? shell : request)) ?? fetch(request)));
});
