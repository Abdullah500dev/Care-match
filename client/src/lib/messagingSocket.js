import { io } from "socket.io-client";
import { getAuthToken } from "../services/api";

const API_BASE_URL = import.meta.env.VITE_REACT_APP_API_BASE_URL || "";

let socket = null;

export function getMessagingSocket() {
  if (!socket) {
    socket = io(API_BASE_URL, {
      path: "/socket.io",
      autoConnect: false,
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function connectMessagingSocket() {
  const instance = getMessagingSocket();
  const token = getAuthToken();
  if (!token) return instance;
  instance.auth = { token };
  if (!instance.connected) instance.connect();
  return instance;
}

export function disconnectMessagingSocket() {
  if (socket?.connected) socket.disconnect();
}
