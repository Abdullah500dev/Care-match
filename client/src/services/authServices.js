import { apiClient } from "./api";

// Server mounts router at /api/auth
const AUTH_BASE = "/api/auth";

export const authServices = {
  register: (payload) => apiClient.post(`${AUTH_BASE}/register`, payload),
  activate: (payload) => apiClient.post(`${AUTH_BASE}/activate-user`, payload),
  login: (payload) => apiClient.post(`${AUTH_BASE}/login`, payload),
  resendVerificationCode: (payload) =>
    apiClient.post(`${AUTH_BASE}/request/token/new`, payload),
  forgotPassword: (payload) =>
    apiClient.post(`${AUTH_BASE}/password/reset`, payload),
  resetPassword: ({ token, ...payload }) =>
    apiClient.post(`${AUTH_BASE}/password/reset/${token}`, payload),
  logout: () => apiClient.get(`${AUTH_BASE}/logout`),
  me: () => apiClient.get(`${AUTH_BASE}/me`),
  updateUserInfo: (payload) => apiClient.put(`${AUTH_BASE}/update-user-info`, payload),
  updateUserPassword: (payload) =>
    apiClient.put(`${AUTH_BASE}/update-user-password`, payload),
};

export const persistAuthTokens = ({ accessToken, refreshToken }) => {
  if (accessToken) localStorage.setItem("access_token", accessToken);
  if (refreshToken) localStorage.setItem("refresh_token", refreshToken);
};

export const clearPersistedAuthTokens = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
};

