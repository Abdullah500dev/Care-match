import { apiClient } from "./api";

/**
 * @param {{ role: "user" | "assistant"; content: string }[]} messages
 */
export function sendChatMessages(messages) {
  return apiClient.post("/api/chat", { messages });
}
