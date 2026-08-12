import axios from "axios";

// Backend base url (no trailing /api required in env)
// Example: http://localhost:5274
const API_BASE_URL =
  import.meta.env.VITE_REACT_APP_API_BASE_URL;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

export const getAuthToken = () => localStorage.getItem("access_token");

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) config.headers["access-token"] = token;
  if (typeof window !== "undefined" && window.location?.origin) {
    config.headers["x-client-base-url"] = window.location.origin;
  }

  // Let browser set multipart boundary for FormData requests.
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }

  return config;
});

