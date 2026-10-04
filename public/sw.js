/* Perez Tours — service worker.
 *
 * Estrategia simple y segura para un sitio con contenido dinámico (D1):
 *
 * - Navegaciones (HTML): network-first con fallback a caché. Si no hay
 *   internet y no hay copia, se muestra la home cacheada.
 * - Estáticos (`/_next/static`, `/img`, fuentes, iconos, manifiesto):
 *   cache-first (inmutables o versionados).
 * - API y actions: solo red (nunca cachear reservas ni sesiones).
 *
 * No se cachea nada con cookies/auth para no filtrar datos entre usuarios.
 */
const VERSION = "prz-v1";
const STATIC_CACHE = `${VERSION}-static`;
const PAGES_CACHE = `${VERSION}-pages`;

const PRECACHE = ["/en", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGES_CACHE);
      await cache.addAll(PRECACHE).catch(() => {});
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("prz-") && k !== STATIC_CACHE && k !== PAGES_CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/img/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/favicon.ico"
  );
}

function isApi(url) {
  return url.pathname.startsWith("/api/");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API y Server Actions: siempre red, sin caché.
  if (isApi(url)) return;

  event.respondWith(
    (async () => {
      // Estáticos: caché primero.
      if (isStaticAsset(url)) {
        const cached = await caches.match(request, { cacheName: STATIC_CACHE });
        if (cached) return cached;
        try {
          const fresh = await fetch(request);
          if (fresh.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, fresh.clone());
          }
          return fresh;
        } catch {
          const fallback = await caches.match(request);
          if (fallback) return fallback;
          throw new Error("offline");
        }
      }

      // Navegaciones y resto: red primero, caché después.
      try {
        const fresh = await fetch(request);
        if (fresh.ok && (request.mode === "navigate" || request.destination === "")) {
          const cache = await caches.open(PAGES_CACHE);
          cache.put(request, fresh.clone()).catch(() => {});
        }
        return fresh;
      } catch {
        const cached =
          (await caches.match(request)) ?? (await caches.match("/en"));
        if (cached) return cached;
        return Response.error();
      }
    })(),
  );
});
