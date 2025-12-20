import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../lib/apiClient";
import type { ApiError } from "../types/api";
import { toast } from "sonner";
import { useAuth } from "./useAuth";

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
    // Remove PEM header/footer if present
    const cleanBase64 = base64String
        .replace(/-----BEGIN PUBLIC KEY-----/g, "")
        .replace(/-----END PUBLIC KEY-----/g, "")
        .replace(/[\n\r\s]/g, "");

    const padding = "=".repeat((4 - (cleanBase64.length % 4)) % 4);
    const base64 = (cleanBase64 + padding).replace(/-/g, "+").replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }

    // If the key is in SPKI format (91 bytes for P-256), strip the 26-byte header
    // to get the raw 65-byte uncompressed key (starting with 0x04)
    if (outputArray.length === 91 && outputArray[0] === 0x30) {
        return outputArray.slice(26);
    }

    return outputArray;
}

// Helper to convert ArrayBuffer to URL-safe Base64
function arrayBufferToUrlSafeBase64(buffer: ArrayBuffer): string {
    const binary = String.fromCharCode(...new Uint8Array(buffer));
    return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function usePushNotifications() {
    const { user, updateProfile } = useAuth();
    const [isSupported, setIsSupported] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>("default");
    const [isLoading, setIsLoading] = useState(false);

    const checkSubscription = useCallback(async () => {
        if (!("serviceWorker" in navigator)) {
            return;
        }

        try {
            // Check both browser subscription and backend subscription
            const registration = await navigator.serviceWorker.ready;
            const browserSubscription = await registration.pushManager.getSubscription();

            // Also check backend to see if user has active subscriptions
            let backendHasSubscription = false;
            let subs: Record<string, unknown>[] = [];
            try {
                const response = await apiClient.get<
                    Record<string, unknown> | Record<string, unknown>[]
                >("/notifications/subscriptions/");
                const responseData = response.data as Record<string, unknown>;
                // Handle different response formats: paginated or direct array
                if (responseData?.data) {
                    // Custom renderer format: { success: true, data: [...] or { results: [...] } }
                    if (Array.isArray(responseData.data)) {
                        subs = responseData.data as Record<string, unknown>[];
                    } else if (
                        responseData.data &&
                        typeof responseData.data === "object" &&
                        "results" in (responseData.data as object)
                    ) {
                        subs = (responseData.data as { results: Record<string, unknown>[] })
                            .results;
                    }
                } else if (Array.isArray(responseData)) {
                    subs = responseData as Record<string, unknown>[];
                } else if (responseData?.results) {
                    subs = responseData.results as Record<string, unknown>[];
                }
                backendHasSubscription = subs.some(
                    (s) => s.isActive === true || s.is_active === true
                );
            } catch {
                // Silently handle backend check errors
            }
            const userEnabled = user?.pushNotificationsEnabled ?? false;

            // User is subscribed if they have browser subscription AND backend subscription AND user setting is enabled
            const subscribed = !!(browserSubscription && backendHasSubscription && userEnabled);
            setIsSubscribed(subscribed);
        } catch {
            setIsSubscribed(false);
        }
    }, [user]);

    // Check support on mount and when user changes
    useEffect(() => {
        if ("serviceWorker" in navigator && "PushManager" in window) {
            setIsSupported(true);
            setPermission(Notification.permission);
            checkSubscription();
        }
    }, [user, checkSubscription]);

    const subscribeToPush = useCallback(async () => {
        if (!isSupported) {
            toast.error("Push notifications are not supported in this browser");
            return;
        }

        setIsLoading(true);
        try {
            // 1. Request Permission
            const permissionResult = await Notification.requestPermission();
            setPermission(permissionResult);

            if (permissionResult !== "granted") {
                toast.error("Permission denied for push notifications");
                return;
            }

            // 2. Get Service Worker Registration
            const registration = await navigator.serviceWorker.ready;

            // 3. Fetch VAPID Key from backend
            let vapidKey: string | null = null;
            try {
                const response = await apiClient.get(
                    "/notifications/preferences/vapid-public-key/"
                );
                // Handle nested response structure: { success: true, data: { key: "..." } }
                if (response.data?.data?.key) {
                    vapidKey = response.data.data.key;
                } else if (response.data?.key) {
                    vapidKey = response.data.key;
                }
            } catch {
                throw new Error("Failed to get VAPID public key from backend");
            }

            if (!vapidKey || vapidKey.includes("REPLACE_WITH_REAL_KEY")) {
                throw new Error(
                    "Invalid VAPID public key. Please configure VAPID keys in backend."
                );
            }

            // 4. Subscribe
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey),
            });

            // 5. Manually construct payload to ensure correctness
            const p256dh = subscription.getKey("p256dh");
            const auth = subscription.getKey("auth");

            if (!p256dh || !auth) {
                throw new Error("Failed to generate subscription keys");
            }

            // Follow guide format: send p256dh and auth as direct fields (not nested in keys)
            // This avoids CamelCase parser transformation issues
            const payload = {
                endpoint: subscription.endpoint,
                p256dh: arrayBufferToUrlSafeBase64(p256dh),
                auth: arrayBufferToUrlSafeBase64(auth),
            };

            await apiClient.post("/notifications/subscriptions/", payload);

            // 6. Update user profile setting
            await updateProfile({
                userData: { pushNotificationsEnabled: true },
            });

            // 7. Optimistically set subscription status since we know it's active
            // The user object will update via query refetch, but we set it now for immediate UI update
            setIsSubscribed(true);

            // Also re-check after a short delay to ensure everything is in sync
            setTimeout(() => {
                checkSubscription();
            }, 500);

            toast.success("Successfully subscribed to notifications!");
        } catch (error: unknown) {
            const apiError = error as ApiError;
            const msg =
                apiError?.response?.data?.message || apiError.message || "Failed to subscribe";
            toast.error(msg);

            // If subscription failed on backend, try to unsubscribe from browser to stay in sync
            try {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();
                if (subscription) await subscription.unsubscribe();
            } catch {
                /* ignore */
            }

            setIsSubscribed(false);
        } finally {
            setIsLoading(false);
        }
    }, [isSupported, updateProfile, checkSubscription]);

    const unsubscribeFromPush = useCallback(async () => {
        setIsLoading(true);
        try {
            // FIRST: Update user profile setting to false
            // This prevents any re-subscription logic and ensures user object is updated
            await updateProfile({
                userData: { pushNotificationsEnabled: false },
            });

            // THEN: Unsubscribe from browser and backend
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                // Try to find the subscription ID from backend to properly unsubscribe
                try {
                    const response = await apiClient.get("/notifications/subscriptions/");
                    const data = response.data?.data || response.data;
                    const subs = (Array.isArray(data) ? data : data?.results || []) as Record<
                        string,
                        unknown
                    >[];
                    const match = subs.find((s) => s.endpoint === subscription.endpoint);

                    if (match) {
                        await apiClient.post(
                            `/notifications/subscriptions/${match.id}/unsubscribe/`
                        );
                    }
                } catch {
                    // Silently handle backend unsubscribe errors
                }

                // Unsubscribe from browser
                await subscription.unsubscribe();
            }

            // Optimistically set subscription status since we know it's disabled
            setIsSubscribed(false);

            // Wait longer for the user query to refetch with updated data
            setTimeout(() => {
                checkSubscription();
            }, 1000);

            toast.success("Notifications disabled");
        } catch {
            toast.error("Failed to disable notifications");
        } finally {
            setIsLoading(false);
        }
    }, [updateProfile, checkSubscription]);

    return {
        isSupported,
        // Return isSubscribed directly - it's set optimistically after subscribe/unsubscribe
        // and checkSubscription() ensures it's correct based on browser + backend + user setting
        isSubscribed: !!isSubscribed,
        permission,
        isLoading,
        subscribeToPush,
        unsubscribeFromPush,
    };
}
