import { apiClient } from "./api";

export function fetchConversations() {
  return apiClient.get("/api/messages/conversations");
}

export function fetchMessageDirectory(q = "") {
  return apiClient.get("/api/messages/directory", {
    params: q ? { q } : undefined,
  });
}

export function fetchScannedSnfContacts() {
  return apiClient.get("/api/messages/scanned-snf-contacts");
}

export function startConversation(payload) {
  return apiClient.post("/api/messages/conversations", payload);
}

export function fetchConversationMessages(conversationId) {
  return apiClient.get(`/api/messages/conversations/${encodeURIComponent(conversationId)}`);
}

export function markConversationRead(conversationId) {
  return apiClient.post(`/api/messages/conversations/${encodeURIComponent(conversationId)}/read`);
}

export function fetchUnreadMessageCount() {
  return apiClient.get("/api/messages/unread-count");
}
