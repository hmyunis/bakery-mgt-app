import { apiClient } from "../lib/apiClient";
import { setAuthToken } from "../lib/apiClient";
import type { ApiResponse, ApiError } from "../types/api";

export interface LoginCredentials {
    username?: string;
    phoneNumber?: string;
    password: string;
}

export interface LoginResponse {
    access: string;
    refresh: string;
    user?: {
        id: number;
        username: string;
        email?: string;
        phoneNumber?: string;
        role: string;
        fullName?: string;
        avatar?: string;
    };
}

export interface UserProfile {
    id: number;
    username: string;
    fullName?: string;
    email?: string;
    phoneNumber?: string;
    role: string;
    avatar?: string;
    pushNotificationsEnabled?: boolean;
}

class AuthService {
    async login(credentials: LoginCredentials): Promise<LoginResponse> {
        const payload: Record<string, string> = {
            password: credentials.password,
        };

        if (credentials.username) {
            payload.username = credentials.username;
        } else if (credentials.phoneNumber) {
            payload.phone_number = credentials.phoneNumber;
        } else {
            throw new Error("Either username or phone number is required");
        }

        try {
            const response = await apiClient.post<
                ApiResponse<LoginResponse> | LoginResponse | Record<string, unknown>
            >("/users/auth/login/", payload);

            // Check for error responses first
            if (response.status < 200 || response.status >= 300) {
                throw new Error(`Login failed with status ${response.status}`);
            }

            // Handle different response structures:
            // 1. Direct JWT response: { access: "...", refresh: "..." }
            // 2. Wrapped response: { success: true, message: "...", data: { access: "...", refresh: "..." } }
            // 3. CamelCase: { accessToken: "...", refreshToken: "..." }
            let loginData: LoginResponse | null = null;

            const data = response.data as Record<string, unknown>;

            // Check for wrapped response first (custom renderer format)
            if (data?.data && data.data.access) {
                loginData = data.data;
            }
            // Check for direct access token (snake_case)
            else if (data?.access) {
                loginData = data as LoginResponse;
            }
            // Check for camelCase access token
            else if (data?.accessToken) {
                loginData = {
                    access: data.accessToken,
                    refresh: data.refreshToken || data.refresh,
                } as LoginResponse;
            }
            // Check if it's an error response
            else if (data?.errors || data?.nonFieldErrors || data?.non_field_errors) {
                const errorMsg =
                    data.errors?.nonFieldErrors?.[0] ||
                    data.errors?.non_field_errors?.[0] ||
                    data.nonFieldErrors?.[0] ||
                    data.non_field_errors?.[0] ||
                    data.message ||
                    "Login failed";
                throw new Error(errorMsg);
            }
            // Fallback: try response.data directly
            else {
                loginData = data as LoginResponse;
            }

            const accessToken = loginData?.access;

            if (!accessToken || typeof accessToken !== "string") {
                console.error("No valid access token in response:", {
                    loginData,
                    accessToken,
                    fullResponse: response.data,
                });
                throw new Error("No access token received from server");
            }

            // Save token to localStorage
            setAuthToken(accessToken);

            // Verify it was saved
            const savedToken = localStorage.getItem("bakery_auth_token");
            if (!savedToken || savedToken !== accessToken) {
                console.error("Token save verification failed:", {
                    accessToken,
                    savedToken,
                });
                throw new Error("Failed to save authentication token");
            }

            return loginData as LoginResponse;
        } catch (error: unknown) {
            console.error("Login error:", error);
            const err = error as ApiError;
            // Re-throw with better error message
            if (err.response?.data) {
                const errorData = err.response.data;
                const errorMsg =
                    (errorData.errors as Record<string, string[]>)?.nonFieldErrors?.[0] ||
                    (errorData.errors as Record<string, string[]>)?.non_field_errors?.[0] ||
                    (errorData.nonFieldErrors as string[])?.[0] ||
                    (errorData.non_field_errors as string[])?.[0] ||
                    errorData.message ||
                    err.message ||
                    "Login failed. Please check your credentials.";
                throw new Error(errorMsg);
            }
            throw error;
        }
    }

    async logout(): Promise<void> {
        setAuthToken(null);
    }

    async getCurrentUser(): Promise<UserProfile> {
        const response = await apiClient.get<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >("/users/me/");
        // Handle camelCase response wrapper: { success, message, data: { ... } }
        const userData =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);

        // Normalize field names (handle both camelCase and snake_case)
        const normalized: UserProfile = {
            id: userData.id as number,
            username: userData.username as string,
            fullName: (userData.fullName || userData.full_name) as string,
            email: userData.email as string,
            phoneNumber: (userData.phoneNumber || userData.phone_number) as string,
            role: userData.role as string,
            avatar: userData.avatar as string,
            // Handle both camelCase (from API response) and snake_case (from DB)
            pushNotificationsEnabled: (userData.pushNotificationsEnabled ??
                userData.push_notifications_enabled ??
                false) as boolean,
        };

        return normalized;
    }

    async refreshToken(refreshToken: string): Promise<{ access: string }> {
        const response = await apiClient.post<{ access: string }>("/users/auth/refresh/", {
            refresh: refreshToken,
        });

        if (response.data.access) {
            setAuthToken(response.data.access);
        }

        return response.data;
    }

    async updateProfile(data: {
        userData: Partial<UserProfile>;
        avatar?: File | null;
    }): Promise<UserProfile> {
        const formData = new FormData();

        if (data.userData.fullName !== undefined)
            formData.append("full_name", data.userData.fullName || "");
        if (data.userData.email !== undefined) formData.append("email", data.userData.email || "");
        if (data.userData.phoneNumber !== undefined)
            formData.append("phone_number", data.userData.phoneNumber || "");
        if (data.userData.username !== undefined)
            formData.append("username", data.userData.username || "");
        if (data.userData.pushNotificationsEnabled !== undefined)
            formData.append(
                "push_notifications_enabled",
                String(data.userData.pushNotificationsEnabled)
            );

        // Handle avatar: File = upload, null = remove
        if (data.avatar === null) {
            formData.append("avatar_clear", "true");
        } else if (data.avatar instanceof File) {
            formData.append("avatar", data.avatar);
        }

        const response = await apiClient.patch<
            ApiResponse<Record<string, unknown>> | Record<string, unknown>
        >("/users/me/", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });

        const userData =
            (response.data as ApiResponse<Record<string, unknown>>).data ||
            (response.data as Record<string, unknown>);
        // Normalize the response (handle both camelCase and snake_case)
        return {
            id: userData.id as number,
            username: userData.username as string,
            fullName: (userData.fullName || userData.full_name) as string,
            email: userData.email as string,
            phoneNumber: (userData.phoneNumber || userData.phone_number) as string,
            role: userData.role as string,
            avatar: userData.avatar as string,
            // Handle both camelCase (from API response) and snake_case (from DB)
            pushNotificationsEnabled: (userData.pushNotificationsEnabled ??
                userData.push_notifications_enabled ??
                false) as boolean,
        };
    }

    async changePassword(data: { old_password: string; new_password: string }): Promise<void> {
        await apiClient.post("/users/change_password/", {
            old_password: data.old_password,
            new_password: data.new_password,
            confirm_new_password: data.new_password,
        });
    }

    async factoryReset(data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
        const response = await apiClient.post<ApiResponse<unknown>>("/users/factory_reset/", data);
        return response.data;
    }
}

export const authService = new AuthService();
