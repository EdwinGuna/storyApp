import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import {
  NetworkFirst,
  CacheFirst,
  StaleWhileRevalidate,
} from "workbox-strategies";
import CONFIG from "./config";

precacheAndRoute(self.__WB_MANIFEST);

// Runtime caching
registerRoute(
  ({ url }) => {
    return (
      url.origin === "https://fonts.googleapis.com" ||
      url.origin === "https://fonts.gstatic.com"
    );
  },
  new CacheFirst({
    cacheName: "google-fonts",
  }),
);

registerRoute(
  ({ url }) => {
    return (
      url.origin === "https://cdnjs.cloudflare.com" ||
      url.origin.includes("fontawesome")
    );
  },
  new CacheFirst({
    cacheName: "fontawesome",
  }),
);

registerRoute(
  ({ url }) => {
    return url.origin === "https://ui-avatars.com";
  },
  new CacheFirst({
    cacheName: "avatars-api",
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  }),
);

registerRoute(
  ({ request, url }) => {
    const baseUrl = new URL(CONFIG.BASE_URL);
    return baseUrl.origin === url.origin && request.destination !== "image";
  },
  new NetworkFirst({
    cacheName: "story-api",
  }),
);

registerRoute(
  ({ request, url }) => {
    const baseUrl = new URL(CONFIG.BASE_URL);
    return baseUrl.origin === url.origin && request.destination === "image";
  },
  new StaleWhileRevalidate({
    cacheName: "story-api-images",
  }),
);

registerRoute(
  ({ url }) => {
    return url.origin.includes("maptiler");
  },
  new CacheFirst({
    cacheName: "maptiler-api",
  }),
);

self.addEventListener("push", (event) => {
  let p = {};
  try {
    p = event.data ? event.data.json() : {};
    // eslint-disable-next-line no-empty
  } catch {}

  const title = p.title || "Story berhasil dibuat";
  const body =
    p.options?.body ||
    (p.description
      ? `Anda telah membuat story baru dengan deskripsi: ${p.description}`
      : "Anda telah membuat story baru.");

  const id = p.storyId || p.id || p.data?.storyId || p.data?.id;
  const url =
    p.url ||
    p.data?.url ||
    (id ? `#/stories?focus=${encodeURIComponent(id)}&hl=1` : "#/stories");

  const options = {
    body,
    icon: "/icons/icon-192.png",
    tag: "story-created",
    renotify: true,
    data: { url },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const hashOrPath = event.notification.data?.url || "#/stories";

  const scopeURL = new URL(self.registration.scope);
  const targetURL = new URL(hashOrPath, scopeURL).href;

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      let client = allClients.find((c) =>
        c.url.startsWith(self.registration.scope),
      );
      if (!client) client = allClients[0];

      if (client) {
        try {
          // kalau hash beda, navigate; kalau sama, navigate bisa no-op
          await client.navigate(targetURL);
        } catch {
          // fallback: suruh app ganti hash sendiri
          client.postMessage({ type: "OPEN_DETAIL", url: targetURL });
        }
        await client.focus();
        return;
      }

      // Kalau belum ada tab, buka jendela baru
      await self.clients.openWindow(targetURL);
    })(),
  );
});
