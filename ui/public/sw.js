/// <reference lib="webworker" />

const sw = self;
const CACHE_NAME = "siro-app-__BUILD_ID__";
const APP_SHELL = [
    "/",
    "/icons/favicon-32x32.png",
    "/icons/pwa-192x192.png",
    "/icons/pwa-512x512.png",
    "__PRECACHE_ASSETS__",
];

sw.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => sw.skipWaiting())
    );
});

sw.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((names) =>
                Promise.all(
                    names
                        .filter((name) => name.startsWith("siro-app-") && name !== CACHE_NAME)
                        .map((name) => caches.delete(name))
                )
            )
            .then(() => sw.clients.claim())
    );
});

sw.addEventListener("fetch", (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // API and cross-origin responses always go directly to the network.
    if (
        request.method !== "GET" ||
        url.origin !== sw.location.origin ||
        url.pathname.startsWith("/api/")
    ) {
        return;
    }

    if (request.mode === "navigate") {
        event.respondWith(fetch(request, { cache: "no-store" }).catch(() => caches.match("/")));
        return;
    }

    if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/")) {
        event.respondWith(
            caches.match(request).then(
                (cached) =>
                    cached ||
                    fetch(request).then((response) => {
                        if (response.ok) {
                            const copy = response.clone();
                            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                        }
                        return response;
                    })
            )
        );
    }
});

sw.addEventListener("push", (event) => {
    if (!event.data) return;

    try {
        const data = event.data.json();
        const { title, body, icon, badge, data: notificationData } = data;
        event.waitUntil(
            sw.registration.showNotification(title, {
                body,
                icon: icon || "/icons/pwa-192x192.png",
                badge: badge || "/icons/badge-96x96.png",
                data: notificationData,
                vibrate: [100, 50, 100],
                actions: [{ action: "open", title: "View Details" }],
            })
        );
    } catch {
        // Ignore malformed push payloads.
    }
});

sw.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const urlToOpen = event.notification.data?.url || "/";

    event.waitUntil(
        sw.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
            for (const client of clients) {
                if (client.url.startsWith(sw.location.origin) && "focus" in client) {
                    if ("navigate" in client) client.navigate(urlToOpen);
                    return client.focus();
                }
            }
            return sw.clients.openWindow?.(urlToOpen);
        })
    );
});
