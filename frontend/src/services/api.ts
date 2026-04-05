import axios, { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL, buildApiUrl, normalizeApiPath } from "@/lib/apiConfig";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

type QueueItem = {
  resolve: (token: string | null) => void;
  reject: (error: unknown) => void;
};

const setAuthorizationHeader = (config: InternalAxiosRequestConfig, token: string) => {
  const headers = AxiosHeaders.from(config.headers);
  headers.set("Authorization", `Bearer ${token}`);
  config.headers = headers;
};

api.interceptors.request.use((config) => {
  if (config.url) {
    config.url = normalizeApiPath(config.url);
  }

  const token = localStorage.getItem("token");
  if (token) {
    setAuthorizationHeader(config, token);
  }
  return config;
});

let isRefreshing = false;
let failedQueue: QueueItem[] = [];

const clearStoredAuth = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("role");
  localStorage.removeItem("user");
};

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise<string | null>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (!token) {
              return Promise.reject(error);
            }

            setAuthorizationHeader(originalRequest, token);
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        const refreshUrl = buildApiUrl("/auth/refresh");
        const response = await axios.post(refreshUrl, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = response.data;
        localStorage.setItem("token", accessToken);
        if (newRefreshToken) localStorage.setItem("refreshToken", newRefreshToken);

        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        setAuthorizationHeader(originalRequest, accessToken);

        processQueue(null, accessToken);
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        clearStoredAuth();
        window.location.href = "/login";
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
