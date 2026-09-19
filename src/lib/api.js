import axios from "axios";
import { safeStorage } from "../utils/storage";

export const API = "/api";

export function normalizeApiUrl(url) {
  if (!url || typeof url !== 'string') return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  
  let clean = url.trim();
  while (clean.startsWith('/')) {
    clean = clean.substring(1);
  }
  if (clean.startsWith('api/')) {
    clean = clean.substring(4);
  }
  while (clean.startsWith('/')) {
    clean = clean.substring(1);
  }
  return `/api/${clean}`;
}

export const api = axios.create({
  baseURL: "",
  withCredentials: true,
  timeout: 30000,
});

const getCache = new Map();

export const clearApiCache = () => {
  getCache.clear();
};

// Override api.get to implement lightweight in-memory caching
const originalGet = api.get;
api.get = async function(url, config) {
  const normalizedUrl = normalizeApiUrl(url);

  // Allow bypassing cache if explicitly requested
  if (config?.bypassCache || config?.useCache === false) {
    return originalGet.call(this, normalizedUrl, config);
  }

  const cacheKey = normalizedUrl + (config ? JSON.stringify(config) : '');
  const cached = getCache.get(cacheKey);
  const now = Date.now();

  // Keep cache valid for 10 seconds
  if (cached && (now - cached.timestamp < 10000)) {
    return cached.promise;
  }

  const promise = originalGet.call(this, normalizedUrl, config);
  getCache.set(cacheKey, {
    promise,
    timestamp: now,
  });

  // If the promise fails, delete it from the cache immediately
  promise.catch(() => {
    getCache.delete(cacheKey);
  });

  return promise;
};

// Interceptor to normalize URL, attach Bearer token & auto-clear cache on mutations
api.interceptors.request.use((config) => {
  if (config.url) {
    config.url = normalizeApiUrl(config.url);
    config.baseURL = "";
  }

  // If request contains FormData or multipart payload (e.g. large video deliverables), extend timeout to 10 minutes
  const isMultipart = (typeof FormData !== 'undefined' && config.data instanceof FormData) || 
    (config.headers && (
      (config.headers['Content-Type'] && String(config.headers['Content-Type']).includes('multipart')) ||
      (config.headers['content-type'] && String(config.headers['content-type']).includes('multipart'))
    ));
  
  if (isMultipart) {
    if (!config.timeout || config.timeout === 15000) {
      config.timeout = 600000; // 10 minutes for video & file uploads
    }
  }

  // Extend timeout for AI generation endpoints (Gemini long-form generation can take 20-60s)
  const isAiRoute = config.url && (
    config.url.includes('/admin/blog/generate') ||
    config.url.includes('/ai/') ||
    config.url.includes('generate-ai') ||
    config.url.includes('/ai-') ||
    config.url.includes('predict-roi') ||
    config.url.includes('profile-suggestions')
  );

  if (isAiRoute) {
    if (!config.timeout || config.timeout === 15000) {
      config.timeout = 120000; // 2 minutes for AI generation
    }
  }

  try {
    const t = safeStorage.getItem("ybex_token");
    if (t) config.headers.Authorization = `Bearer ${t}`;
  } catch (e) {
    console.error("Error accessing token in request interceptor:", e);
  }

  // Clear cache on write operations
  const method = config.method?.toLowerCase();
  if (method && ["post", "put", "delete", "patch"].includes(method)) {
    clearApiCache();
  }

  return config;
});

export default api;

api.interceptors.response.use(
  (response) => {
    if (typeof response.data === 'string' && response.data.trim().startsWith('<')) {
      console.warn("Received HTML instead of JSON for API URL:", response.config?.url);
      const isGet = (response.config?.method || 'get').toLowerCase() === 'get';
      // If it's a GET request, fallback to empty array/null to prevent UI crash, but for mutations (POST/PUT/DELETE) reject properly
      if (!isGet) {
        const err = new Error("API endpoint returned HTML instead of JSON");
        err.response = {
          ...response,
          status: 404,
          data: { detail: "API endpoint returned an unexpected HTML response", code: "INVALID_RESPONSE" }
        };
        return Promise.reject(err);
      }
      return { ...response, data: [] };
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    // Retry once on transient network errors if not already retried
    // GET only. Retrying a POST after a network error can double-submit — a second escrow
    // hold, a duplicate message — because the first request may well have reached the
    // server and only the response was lost. GETs are safe to repeat; nothing else is.
    const isIdempotent = String(originalRequest?.method || "get").toLowerCase() === "get";
    const isTransientNetwork =
      error.message === "Network Error" || error.code === "ERR_NETWORK" || error.code === "ECONNABORTED";
    if (isTransientNetwork && isIdempotent && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
        return await api(originalRequest);
      } catch (retryErr) {
        console.warn("API Network Error retry failed:", originalRequest.url);
        return Promise.reject(retryErr);
      }
    }
    if (error.response && typeof error.response.data === 'string' && error.response.data.trim().startsWith('<')) {
      console.warn("Received HTML error response instead of JSON for URL:", error.config?.url);
      error.response.data = {
        detail: `Server returned an error (${error.response.status}). Please try again.`,
        error: error.response.statusText || "Server error",
        code: "SERVER_ERROR"
      };
    }
    return Promise.reject(error);
  }
);
