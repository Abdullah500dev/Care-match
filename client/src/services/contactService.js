import { apiClient } from "./api";

export function postContactForm(payload) {
  return apiClient.post("/api/contact", payload);
}
