import axios, { type InternalAxiosRequestConfig } from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";
const ACCESS_TOKEN_KEY = "bakery_auth_token";
const REFRESH_TOKEN_KEY = "bakery_refresh_token";
const LOGIN_PATH = "/users/auth/login/";
const REFRESH_PATH = "/users/auth/refresh/";

// Get base URL without /api/v1 for image URLs
export const getImageBaseUrl = () => {
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    if (envUrl) {
        return envUrl.replace(/\/api\/v1$/, "");
    }
    return "http://localhost:8001";
};

export const getAuthToken = () => {
    // Always read fresh from localStorage to ensure we have the latest value
    return localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const setAuthToken = (token: string | null) => {
    if (token) {
        localStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
};

export const getRefreshToken = () => {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const setRefreshToken = (token: string | null) => {
    if (token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, token);
    } else {
        localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
};

export const clearAuthTokens = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});

const refreshClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});

type RetryRequestConfig = InternalAxiosRequestConfig & {
    _retry?: boolean;
};

const extractTokenPair = (
    responseData: unknown
): {
    access: string | null;
    refresh: string | null;
} => {
    const responseObject =
        responseData && typeof responseData === "object"
            ? (responseData as Record<string, unknown>)
            : {};
    const maybeWrapped =
        responseObject.data && typeof responseObject.data === "object"
            ? (responseObject.data as Record<string, unknown>)
            : responseObject;

    const accessRaw = maybeWrapped.access ?? maybeWrapped.accessToken;
    const refreshRaw = maybeWrapped.refresh ?? maybeWrapped.refreshToken;

    return {
        access: typeof accessRaw === "string" ? accessRaw : null,
        refresh: typeof refreshRaw === "string" ? refreshRaw : null,
    };
};

const triggerUnauthorized = () => {
    clearAuthTokens();
    window.dispatchEvent(new CustomEvent("auth:unauthorized"));
};

const isAuthRoute = (url?: string) => {
    if (!url) return false;
    return url.includes(LOGIN_PATH) || url.includes(REFRESH_PATH);
};

let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;

    if (!refreshPromise) {
        refreshPromise = (async () => {
            try {
                const response = await refreshClient.post(REFRESH_PATH, {
                    refresh: refreshToken,
                });
                const tokens = extractTokenPair(response.data);
                if (!tokens.access) return null;

                setAuthToken(tokens.access);
                // Rotation can return a fresh refresh token; otherwise keep existing one.
                if (tokens.refresh) {
                    setRefreshToken(tokens.refresh);
                }
                return tokens.access;
            } catch {
                return null;
            } finally {
                refreshPromise = null;
            }
        })();
    }

    return refreshPromise;
};

apiClient.interceptors.request.use((config) => {
    // Always read fresh from localStorage to ensure we have the latest token
    const token = getAuthToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const status = error.response?.status;
        const originalRequest = error.config as RetryRequestConfig | undefined;

        if (status !== 401) {
            return Promise.reject(error);
        }

        // Never attempt refresh on auth endpoints themselves.
        if (!originalRequest || isAuthRoute(originalRequest.url)) {
            triggerUnauthorized();
            return Promise.reject(error);
        }

        // Prevent infinite loops.
        if (originalRequest._retry) {
            triggerUnauthorized();
            return Promise.reject(error);
        }

        originalRequest._retry = true;
        const newAccessToken = await refreshAccessToken();

        if (!newAccessToken) {
            triggerUnauthorized();
            return Promise.reject(error);
        }

        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
    }
);

export type ApiClient = typeof apiClient;
