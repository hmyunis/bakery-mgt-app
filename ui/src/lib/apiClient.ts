import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

let authToken = localStorage.getItem("bakery_auth_token");

export const setAuthToken = (token: string | null) => {
  authToken = token ?? null;
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
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
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
  },
);

export type ApiClient = typeof apiClient;

