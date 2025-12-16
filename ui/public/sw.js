/// <reference lib="webworker" />

// Cast self to ServiceWorkerGlobalScope to avoid TS errors
const sw = self;

// 1. Handle Installation: Force the new SW to activate immediately
sw.addEventListener("install", (event) => {
    // fast-forward to activate
    sw.skipWaiting();
});

// 2. Handle Activation: Claim clients immediately so you don't need a refresh
sw.addEventListener("activate", (event) => {
    event.waitUntil(sw.clients.claim());
});

// 3. Handle Fetch: NO CACHING - All requests pass through to network
sw.addEventListener("fetch", (event) => {
    // Always fetch from network, never use cache
    event.respondWith(fetch(event.request));
});

// 4. Handle Incoming Push Notifications
sw.addEventListener("push", (event) => {
    if (!event.data) return;

    try {
        const data = event.data.json();
        // Expecting backend to send: { title, body, icon, data: { url: '/app/inventory' } }
        const { title, body, icon, badge, data: notificationData } = data;
        const options = {
            body,
            icon: icon || "/logo.png",
            badge: badge || "/logo.png",
            data: notificationData, // This contains the URL info
            vibrate: [100, 50, 100],
            actions: [
                {
                    action: "open",
                    title: "View Details",
                },
            ],
        };

        event.waitUntil(sw.registration.showNotification(title, options));
    } catch (error) {
        // Silently handle push event errors
    }
});

// 5. Handle Notification Click (The Deep Linking Logic)
sw.addEventListener("notificationclick", (event) => {
    event.notification.close();

    // Get the specific URL from the payload, or default to root
    const urlToOpen = event.notification.data?.url || "/";

    event.waitUntil(
        sw.clients
            .matchAll({
                type: "window",
                includeUncontrolled: true,
            })
            .then((clientList) => {
                // 1. Check if the app is already open
                for (const client of clientList) {
                    // Check if client is visible and matches our origin
                    if (client.url.startsWith(sw.location.origin) && "focus" in client) {
                        // Navigate the existing tab to the correct URL
                        if ("navigate" in client) {
                            client.navigate(urlToOpen);
                        }
                        return client.focus();
                    }
                }

                // 2. If app is not open, open a new window with the specific URL
                if (sw.clients.openWindow) {
                    return sw.clients.openWindow(urlToOpen);
                }
            })
    );
});
