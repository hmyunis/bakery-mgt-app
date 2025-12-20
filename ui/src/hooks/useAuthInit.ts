import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { getAuthToken } from "../lib/apiClient";
import { setSession, clearSession } from "../store/authSlice";
import { isValidRole } from "../constants/roles";

/**
 * Hook to initialize auth state from stored token on app load
 */
export function useAuthInit() {
    const dispatch = useDispatch();

    useEffect(() => {
        const token = getAuthToken();
        if (token) {
            try {
                // Decode JWT to get user info
                const tokenParts = token.split(".");
                if (tokenParts.length === 3) {
                    const payload = JSON.parse(atob(tokenParts[1]));
                    const exp = payload.exp * 1000; // Convert to milliseconds

                    // Check if token is expired
                    if (Date.now() >= exp) {
                        // Token expired, clear it
                        dispatch(clearSession());
                        return;
                    }

                    const userRole = isValidRole(payload.role) ? payload.role : undefined;
                    dispatch(
                        setSession({
                            isAuthenticated: true,
                            roles: userRole ? [userRole] : [],
                            user: {
                                id: payload.user_id?.toString(),
                                name: payload.full_name || payload.username,
                                email: payload.email,
                                avatar: payload.avatar,
                                role: userRole,
                                pushNotificationsEnabled:
                                    payload.push_notifications_enabled ?? false,
                            },
                        })
                    );
                }
            } catch (error) {
                console.error("Failed to decode token", error);
                dispatch(clearSession());
            }
        }
    }, [dispatch]);
}
