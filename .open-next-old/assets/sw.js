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

// ─────────────────────────── Notificaciones push ───────────────────────────
// El navegador guarda la suscripción; el Worker envía el push con la VAPID
// pública que entrega /api/push/public-key.

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    if (event.data) payload = event.data.json() ?? {};
  } catch {
    payload = { title: "Perez Tours", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Perez Tours";
  const options = {
    body: payload.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: payload.tag || "prz",
    data: { url: payload.url || "/" },
    lang: payload.lang || "es",
  };

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, options);
      // Si el usuario tiene la app abierta, actualiza la campana en vivo.
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clients) {
        client.postMessage({ type: "prz-push", payload });
      }
    })(),
  );
});

// Al pulsar la notificación: enfoca la pestaña o abre la URL.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of all) {
        if (client.url.includes(target) && "focus" in client) {
          await client.focus();
          return;
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(target);
    })(),
  );
});

self.addEventListener("message", (event) => {
  // "skipWaiting" desde la UI (botón de actualizar).
  if (event.data === "skip-waiting") self.skipWaiting();
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
