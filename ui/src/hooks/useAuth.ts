import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { authService, type LoginCredentials } from "../services/authService";
import { clearSession, setSession } from "../store/authSlice";
import { setAuthToken } from "../lib/apiClient";
import { isValidRole } from "../constants/roles";

export const useAuth = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const loginMutation = useMutation({
        mutationFn: async (credentials: LoginCredentials) => {
            const response = await authService.login(credentials);

            // Decode JWT to get user info (basic decode, no verification needed for display)
            const accessToken = response.access;
            if (accessToken && typeof accessToken === "string") {
                try {
                    const tokenParts = accessToken.split(".");
                    if (tokenParts.length === 3) {
                        const payload = JSON.parse(atob(tokenParts[1]));
                        const userRole = isValidRole(payload.role) ? payload.role : undefined;
                        dispatch(
                            setSession({
                                isAuthenticated: true,
                                roles: userRole ? [userRole] : [],
                                user: {
                                    id: payload.user_id?.toString(),
                                    name: payload.full_name || payload.username || "User",
                                    email: payload.email,
                                    avatar: payload.avatar,
                                    role: userRole,
                                },
                            })
                        );
                    }
                } catch (e) {
                    console.error("Failed to decode token", e);
                    // Still set session as authenticated even if token decode fails
                    // The token is valid, we just couldn't extract user info
                    dispatch(
                        setSession({
                            isAuthenticated: true,
                            roles: [],
                            user: null,
                        })
                    );
                }
            } else {
                // If no access token, still try to set session (might have user data in response)
                dispatch(
                    setSession({
                        isAuthenticated: true,
                        roles: [],
                        user: null,
                    })
                );
            }

            return response;
        },
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: ["currentUser"] });

            // Determine redirect path based on role
            let redirectPath = "/app/dashboard";

            // Try to get role from response or token
            let role = response.user?.role;
            if (!role && response.access) {
                try {
                    const tokenParts = response.access.split(".");
                    if (tokenParts.length === 3) {
                        const payload = JSON.parse(atob(tokenParts[1]));
                        role = payload.role;
                    }
                } catch (e) {
                    console.error("Failed to decode token for redirect", e);
                }
            }

            if (role) {
                switch (role) {
                    case "cashier":
                        redirectPath = "/app/sales";
                        break;
                    case "chef":
                        redirectPath = "/app/production";
                        break;
                    case "storekeeper":
                        redirectPath = "/app/inventory";
                        break;
                    case "admin":
                    default:
                        redirectPath = "/app/dashboard";
                        break;
                }
            }

            // Navigate after a brief delay to ensure Redux state is persisted
            setTimeout(() => {
                navigate(redirectPath, { replace: true });
            }, 100);
        },
        onError: (error: any) => {
            const message =
                error.response?.data?.non_field_errors?.[0] ||
                error.response?.data?.detail ||
                error.message ||
                "Login failed. Please check your credentials.";
            toast.error(message);
        },
    });

    const logoutMutation = useMutation({
        mutationFn: async () => {
            await authService.logout();
        },
        onSuccess: () => {
            dispatch(clearSession());
            queryClient.clear();
            navigate("/");
            toast.success("Logged out successfully");
        },
    });

    const {
        data: currentUser,
        isLoading: isLoadingUser,
        error: currentUserError,
    } = useQuery({
        queryKey: ["currentUser"],
        queryFn: () => authService.getCurrentUser(),
        enabled: !!localStorage.getItem("bakery_auth_token"),
        retry: false,
    });

    // Update auth state when currentUser is fetched
    useEffect(() => {
        if (currentUser) {
            const fullName = currentUser.fullName || "";

            dispatch(
                setSession({
                    user: {
                        id: currentUser.id.toString(),
                        name: fullName || currentUser.username,
                        email: currentUser.email,
                        avatar: currentUser.avatar || undefined,
                        role: isValidRole(currentUser.role) ? currentUser.role : undefined,
                    },
                })
            );
        }
    }, [currentUser, dispatch]);

    // Handle query errors (onError is deprecated in TanStack Query v5)
    useEffect(() => {
        if (currentUserError) {
            setAuthToken(null);
            dispatch(clearSession());
        }
    }, [currentUserError, dispatch]);

    const updateProfileMutation = useMutation({
        mutationFn: authService.updateProfile,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["currentUser"] });
        },
    });

    const changePasswordMutation = useMutation({
        mutationFn: authService.changePassword,
    });

    return {
        login: loginMutation.mutateAsync,
        logout: logoutMutation.mutateAsync,
        isLoggingIn: loginMutation.isPending,
        isLoggingOut: logoutMutation.isPending,
        user: currentUser,
        currentUser,
        isLoadingUser,
        updateProfile: updateProfileMutation.mutateAsync,
        isUpdatingProfile: updateProfileMutation.isPending,
        changePassword: changePasswordMutation.mutateAsync,
        isChangingPassword: changePasswordMutation.isPending,
    };
};
