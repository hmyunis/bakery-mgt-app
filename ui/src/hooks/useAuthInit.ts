import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { clearAuthTokens, getAuthToken, getRefreshToken } from "../lib/apiClient";
import { setSession, clearSession } from "../store/authSlice";
import { isValidRole, PAGE_PERMISSIONS, type PagePermission } from "../constants/roles";

/**
 * Hook to initialize auth state from stored token on app load
 */
export function useAuthInit() {
    const dispatch = useDispatch();

    useEffect(() => {
        const handleUnauthorized = () => {
            dispatch(clearSession());
        };

        window.addEventListener("auth:unauthorized", handleUnauthorized);
        return () => {
            window.removeEventListener("auth:unauthorized", handleUnauthorized);
        };
    }, [dispatch]);

    useEffect(() => {
        const token = getAuthToken();
        const refreshToken = getRefreshToken();
        if (token) {
            try {
                // Decode JWT to get user info
                const tokenParts = token.split(".");
                if (tokenParts.length === 3) {
                    const payload = JSON.parse(atob(tokenParts[1]));
                    const exp = payload.exp * 1000; // Convert to milliseconds

                    // Check if token is expired
                    if (Date.now() >= exp) {
                        // If refresh token exists, keep session; interceptor will refresh on first 401.
                        if (!refreshToken) {
                            clearAuthTokens();
                            dispatch(clearSession());
                            return;
                        }
                    }

                    const userRole = isValidRole(payload.role) ? payload.role : undefined;
                    const permissions = Array.isArray(payload.permissions)
                        ? payload.permissions.filter((permission: string) =>
                              PAGE_PERMISSIONS.includes(permission as PagePermission)
                          )
                        : [];
                    dispatch(
                        setSession({
                            isAuthenticated: true,
                            roles: userRole ? [userRole] : [],
                            user: {
                                id: Number(payload.user_id),
                                name: payload.full_name || payload.username,
                                email: payload.email,
                                avatar: payload.avatar,
                                role: userRole,
                                permissions,
                                pushNotificationsEnabled:
                                    payload.push_notifications_enabled ?? false,
                            },
                        })
                    );
                }
            } catch (error) {
                console.error("Failed to decode token", error);
                if (refreshToken) {
                    dispatch(setSession({ isAuthenticated: true }));
                } else {
                    clearAuthTokens();
                    dispatch(clearSession());
                }
            }
        } else if (refreshToken) {
            dispatch(setSession({ isAuthenticated: true }));
        }
    }, [dispatch]);
}
