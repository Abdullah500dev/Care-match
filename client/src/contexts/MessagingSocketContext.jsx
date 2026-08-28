import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { getUser } from "@/store/auth/authSlice";
import {
  connectMessagingSocket,
  disconnectMessagingSocket,
  getMessagingSocket,
} from "@/lib/messagingSocket";
import { fetchUnreadMessageCount } from "@/services/messageService";

const MessagingSocketContext = createContext(null);

export function MessagingSocketProvider({ children }) {
  const { token, isAuthenticated } = useSelector(getUser);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socketReady, setSocketReady] = useState(false);

  const refreshUnread = useCallback(async () => {
    if (!token) {
      setUnreadCount(0);
      return;
    }
    try {
      const { data } = await fetchUnreadMessageCount();
      setUnreadCount(Number(data?.count) || 0);
    } catch {
      // ignore transient errors
    }
  }, [token]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setSocketReady(false);
      setUnreadCount(0);
      disconnectMessagingSocket();
      return undefined;
    }

    const socket = connectMessagingSocket();
    const onConnect = () => setSocketReady(true);
    const onDisconnect = () => setSocketReady(false);
    const onNotification = (payload) => {
      if (payload?.preview && payload?.senderName) {
        toast.message(`Message from ${payload.senderName}`, {
          description: payload.preview,
        });
      }
      refreshUnread();
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("notification:message", onNotification);

    refreshUnread();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("notification:message", onNotification);
      disconnectMessagingSocket();
    };
  }, [isAuthenticated, token, refreshUnread]);

  const value = useMemo(
    () => ({
      socket: getMessagingSocket(),
      socketReady,
      unreadCount,
      refreshUnread,
      setUnreadCount,
    }),
    [socketReady, unreadCount, refreshUnread],
  );

  return (
    <MessagingSocketContext.Provider value={value}>
      {children}
    </MessagingSocketContext.Provider>
  );
}

export function useMessagingSocket() {
  const ctx = useContext(MessagingSocketContext);
  if (!ctx) {
    throw new Error("useMessagingSocket must be used within MessagingSocketProvider");
  }
  return ctx;
}
