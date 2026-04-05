const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

export const API_BASE_URL = trimTrailingSlash(configuredApiUrl || "/api");

export const BACKEND_ORIGIN = configuredApiUrl
  ? API_BASE_URL.replace(/\/api$/, "")
  : "";

export const normalizeApiPath = (path: string) => {
  if (!path) return path;

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return normalizedPath.replace(/^\/api(?=\/|$)/, "");
};

export const buildApiUrl = (path: string) => `${API_BASE_URL}${normalizeApiPath(path)}`;
