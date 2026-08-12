const CACHE_NAME = "protocol-grid-offline-v1";
const APP_ROOT = new URL("./", self.registration.scope).href;
const CORE_ASSETS = [
  "./",
  "manifest.webmanifest",
  "favicon.svg",
  "pwa-icon-192.png",
  "pwa-icon-512.png",
  "tactical-map.jpg",
  "protocol-sprite-atlas.png",
  "protocol-expansion-atlas.png",
  "protocol-expansion-atlas-2.png",
  "protocol-expansion-portraits-2-v2.png",
  "protocol-skill-icons-v2.png",
  "weapon-icons/classic.png",
  "weapon-icons/sheriff.png",
  "weapon-icons/bucky.png",
  "weapon-icons/spectre.png",
  "weapon-icons/bulldog.png",
  "weapon-icons/outlaw.png",
  "weapon-icons/judge.png",
  "weapon-icons/phantom.png",
  "weapon-icons/vandal.png",
  "weapon-icons/operator.png"
];

async function cacheResponse(cache, url, response) {
  if (response.ok && (response.type === "basic" || response.type === "default")) {
    await cache.put(url, response.clone());
  }
  return response;
}

async function cacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  const rootUrl = new URL("./", self.registration.scope);
  const rootResponse = await fetch(rootUrl, { cache: "reload" });
  if (!rootResponse.ok) throw new Error(`App shell request failed: ${rootResponse.status}`);
  await cacheResponse(cache, rootUrl, rootResponse);
  const html = await rootResponse.clone().text();
  const linkedAssets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => new URL(match[1], APP_ROOT))
    .filter((url) => url.origin === self.location.origin && url.href.startsWith(APP_ROOT));
  await Promise.all(linkedAssets.map(async (url) => {
    const response = await fetch(url, { cache: "reload" });
    if (!response.ok) throw new Error(`Linked app asset request failed: ${response.status}`);
    return cacheResponse(cache, url, response);
  }));
  await Promise.allSettled(CORE_ASSETS.slice(1).map(async (path) => {
    const url = new URL(path, self.registration.scope);
    const response = await fetch(url, { cache: "reload" });
    return cacheResponse(cache, url, response);
  }));
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheAppShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames
      .filter((name) => name.startsWith("protocol-grid-offline-") && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    await cacheResponse(cache, request, response);
    return response;
  } catch {
    return (await cache.match(request, { ignoreSearch: true }))
      ?? (request.mode === "navigate" ? cache.match(APP_ROOT) : undefined)
      ?? Response.error();
  }
}

async function staleWhileRevalidate(event) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(event.request, { ignoreSearch: true });
  const update = fetch(event.request)
    .then((response) => cacheResponse(cache, event.request, response))
    .catch(() => cached ?? Response.error());
  if (cached) {
    event.waitUntil(update);
    return cached;
  }
  return update;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(APP_ROOT)) return;
  if (request.mode === "navigate" || ["document", "script", "style"].includes(request.destination)) {
    event.respondWith(networkFirst(request));
    return;
  }
  event.respondWith(staleWhileRevalidate(event));
});
