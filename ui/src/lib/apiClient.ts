import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

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
    return localStorage.getItem("bakery_auth_token");
};

export const setAuthToken = (token: string | null) => {
    if (token) {
        localStorage.setItem("bakery_auth_token", token);
    } else {
        localStorage.removeItem("bakery_auth_token");
    }
};

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
    // Always read fresh from localStorage to ensure we have the latest token
    const token = localStorage.getItem("bakery_auth_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        if (status === 401) {
            // bubble a logout event so auth flows can react
            setAuthToken(null);
            window.dispatchEvent(new CustomEvent("auth:unauthorized"));
        }
        return Promise.reject(error);
    }
);

export type ApiClient = typeof apiClient;
