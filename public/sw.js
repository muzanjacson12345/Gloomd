/* GLOOMD offline app-shell cache.
 * Bump CACHE_NAME whenever the static app shell changes in a release.
 * The simulation and saved worlds remain local to IndexedDB in the browser.
 */
const CACHE_NAME = "gloomd-shell-v1";
const APP_ROOT = new URL("./", self.registration.scope).toString();
const APP_MANIFEST = new URL("./manifest.webmanifest", self.registration.scope).toString();
const APP_ICON = new URL("./gloomd-icon.svg", self.registration.scope).toString();

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll([APP_ROOT, APP_MANIFEST, APP_ICON]);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith("gloomd-shell-") && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.put(APP_ROOT, response.clone());
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        return (await cache.match(request)) ||
          (await cache.match(APP_ROOT)) ||
          new Response("GLOOMD is not available offline yet. Open it once while connected to cache the app.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" }
          });
      }
    })());
    return;
  }

  // Cache only same-origin static GET responses. IndexedDB and user save data
  // are deliberately not handled here; they remain in browser storage.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(request);
      if (response.ok && response.type === "basic") {
        await cache.put(request, response.clone());
      }
      return response;
    } catch {
      return (await cache.match(request)) || Response.error();
    }
  })());
});
