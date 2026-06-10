import axios from "axios";
import { BASE_URL } from "./constants";

const axiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: { "Content-Type": "application/json" },
});

// Attach access token to every request
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => Promise.reject(error)
);

// On 401 → try refresh token, then retry once
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
    failedQueue = [];
};

axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config;
        if (error.response?.status === 401 && !original._retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then((token) => {
                    original.headers.Authorization = `Bearer ${token}`;
                    return axiosInstance(original);
                });
            }
            original._retry = true;
            isRefreshing = true;
            const refreshToken = localStorage.getItem("refreshToken");
            if (!refreshToken) {
                localStorage.clear();
                window.location.href = "/login";
                return Promise.reject(error);
            }
            try {
                const { data } = await axios.post(`${BASE_URL}/refresh-token`, { refreshToken });
                localStorage.setItem("token", data.accessToken);
                processQueue(null, data.accessToken);
                original.headers.Authorization = `Bearer ${data.accessToken}`;
                return axiosInstance(original);
            } catch (refreshError) {
                processQueue(refreshError, null);
                localStorage.clear();
                window.location.href = "/login";
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
