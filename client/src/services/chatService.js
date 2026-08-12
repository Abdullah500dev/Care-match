import { apiClient } from "./api";

/**
 * @param {{ role: "user" | "assistant"; content: string }[]} messages
 */
export function sendChatMessages(messages) {
  return apiClient.post("/api/chat", { messages });
}

export function transcribeAudioBlob(audioBlob) {
  const formData = new FormData();
  const mimeType = audioBlob?.type || "audio/webm";
  formData.append("file", audioBlob, "voice-input.webm");
  formData.append("mimeType", mimeType);
  return apiClient.post("/api/chat/transcribe", formData);
}
