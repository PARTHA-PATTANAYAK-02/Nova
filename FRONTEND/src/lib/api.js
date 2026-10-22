import axios from "axios";

const defaultApiUrl = `${window.location.protocol}//${window.location.hostname}:8000`;

export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || defaultApiUrl
).replace(/\/$/, "");

export const apiUrl = (path) => `${API_BASE_URL}${path}`;

// Global Axios configuration
axios.defaults.withCredentials = true;

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Response interceptor for automatic silent token renewal
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    const isAuthEndpoint =
      originalRequest.url?.includes("/api/v1/user/refresh-token") ||
      originalRequest.url?.includes("/api/v1/user/login") ||
      originalRequest.url?.includes("/api/v1/user/register") ||
      originalRequest.url?.includes("/api/v1/user/password");

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => axios(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await axios.post(
          apiUrl("/api/v1/user/refresh-token"),
          {},
          { withCredentials: true },
        );
        processQueue(null);
        return axios(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr);
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

