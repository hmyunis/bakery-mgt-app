import { apiClient } from "../lib/apiClient";
import { setAuthToken } from "../lib/apiClient";

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
            const response = await apiClient.post<any>("/users/auth/login/", payload);

            console.log("Raw login response:", {
                status: response.status,
                statusText: response.statusText,
                data: response.data,
                dataType: typeof response.data,
                dataKeys: response.data ? Object.keys(response.data) : null,
                fullDataStringified: JSON.stringify(response.data, null, 2),
            });

            // Check for error responses first
            if (response.status < 200 || response.status >= 300) {
                throw new Error(`Login failed with status ${response.status}`);
            }

            // Handle different response structures:
            // 1. Direct JWT response: { access: "...", refresh: "..." }
            // 2. Wrapped response: { success: true, message: "...", data: { access: "...", refresh: "..." } }
            // 3. CamelCase: { accessToken: "...", refreshToken: "..." }
            let loginData: any;

            // Check for wrapped response first (custom renderer format)
            if (response.data?.data && response.data.data.access) {
                loginData = response.data.data;
                console.log("Using wrapped data:", loginData);
            }
            // Check for direct access token (snake_case)
            else if (response.data?.access) {
                loginData = response.data;
                console.log("Using direct response (snake_case):", loginData);
            }
            // Check for camelCase access token
            else if (response.data?.accessToken) {
                loginData = {
                    access: response.data.accessToken,
                    refresh: response.data.refreshToken || response.data.refresh,
                };
                console.log("Using camelCase tokens:", loginData);
            }
            // Check if it's an error response
            else if (
                response.data?.errors ||
                response.data?.nonFieldErrors ||
                response.data?.non_field_errors
            ) {
                const errorMsg =
                    response.data.errors?.nonFieldErrors?.[0] ||
                    response.data.errors?.non_field_errors?.[0] ||
                    response.data.nonFieldErrors?.[0] ||
                    response.data.non_field_errors?.[0] ||
                    response.data.message ||
                    "Login failed";
                throw new Error(errorMsg);
            }
            // Fallback: try response.data directly and log what we got
            else {
                loginData = response.data;
                console.warn("Using fallback response.data - structure unknown:", {
                    keys: Object.keys(response.data),
                    values: Object.values(response.data),
                });
            }

            const accessToken = loginData?.access;

            console.log("Parsed login data:", { loginData, accessToken });

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
                console.error("Token save verification failed:", { accessToken, savedToken });
                throw new Error("Failed to save authentication token");
            }

            return loginData;
        } catch (error: any) {
            console.error("Login error:", error);
            // Re-throw with better error message
            if (error.response?.data) {
                const errorData = error.response.data;
                const errorMsg =
                    errorData.errors?.nonFieldErrors?.[0] ||
                    errorData.errors?.non_field_errors?.[0] ||
                    errorData.nonFieldErrors?.[0] ||
                    errorData.non_field_errors?.[0] ||
                    errorData.message ||
                    error.message ||
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
        const response = await apiClient.get<any>("/users/me/");
        // Handle camelCase response wrapper: { success, message, data: { ... } }
        const userData = response.data.data || response.data;
        
        // Normalize field names (handle both camelCase and snake_case)
        return {
            id: userData.id,
            username: userData.username,
            fullName: userData.fullName || userData.full_name,
            email: userData.email,
            phoneNumber: userData.phoneNumber || userData.phone_number,
            role: userData.role,
            avatar: userData.avatar,
        };
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

    async updateProfile(data: { userData: Partial<UserProfile>; avatar?: File | null }): Promise<UserProfile> {
        const formData = new FormData();

        if (data.userData.fullName !== undefined) formData.append("full_name", data.userData.fullName || "");
        if (data.userData.email !== undefined) formData.append("email", data.userData.email || "");
        if (data.userData.phoneNumber !== undefined) formData.append("phone_number", data.userData.phoneNumber || "");
        if (data.userData.username !== undefined) formData.append("username", data.userData.username || "");

        // Handle avatar: File = upload, null = remove
        if (data.avatar === null) {
            formData.append("avatar_clear", "true");
        } else if (data.avatar instanceof File) {
            formData.append("avatar", data.avatar);
        }

        const response = await apiClient.patch<any>("/users/me/", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });

        const userData = response.data.data || response.data;
        return {
            id: userData.id,
            username: userData.username,
            fullName: userData.fullName || userData.full_name,
            email: userData.email,
            phoneNumber: userData.phoneNumber || userData.phone_number,
            role: userData.role,
            avatar: userData.avatar,
        };
    }

    async changePassword(data: { old_password: string; new_password: string }): Promise<void> {
        await apiClient.post("/users/change_password/", {
            old_password: data.old_password,
            new_password: data.new_password,
            confirm_new_password: data.new_password,
        });
    }
}

export const authService = new AuthService();
