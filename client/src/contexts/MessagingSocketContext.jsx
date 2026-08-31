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
import { fetchConversations, fetchUnreadMessageCount } from "@/services/messageService";
import { playMessageNotificationSound } from "@/lib/messageNotificationSound";

const MessagingSocketContext = createContext(null);

function notificationFromPayload(payload, myUserId) {
  const senderId = String(payload?.senderId || payload?.message?.senderId || "");
  if (senderId && senderId === myUserId) return null;
  const conversationId = String(
    payload?.conversationId || payload?.conversation?.id || payload?.message?.conversationId || "",
  );
  if (!conversationId) return null;
  const peer = payload?.conversation?.peer;
  return {
    id: conversationId,
    conversationId,
    senderName: payload?.senderName || peer?.name || "Someone",
    preview: payload?.preview || payload?.message?.text || payload?.conversation?.lastMessageText || "",
    createdAt: payload?.message?.createdAt || payload?.conversation?.lastMessageAt || new Date().toISOString(),
    unread: Number(payload?.unread || payload?.conversation?.unread || 1),
    accountLabel: peer?.accountLabel || "",
  };
}

function notificationFromConversation(conversation) {
  if (!conversation?.id || !Number(conversation.unread)) return null;
  return {
    id: String(conversation.id),
    conversationId: String(conversation.id),
    senderName: conversation.peer?.name || "Someone",
    preview: conversation.lastMessageText || "",
    createdAt: conversation.lastMessageAt || conversation.updatedAt,
    unread: Number(conversation.unread) || 1,
    accountLabel: conversation.peer?.accountLabel || conversation.subtitle || "",
  };
}

function upsertNotification(list, item) {
  if (!item) return list;
  const without = list.filter((row) => row.conversationId !== item.conversationId);
  return [item, ...without].slice(0, 20);
}

export function MessagingSocketProvider({ children }) {
  const { token, isAuthenticated, userData } = useSelector(getUser);
  const myUserId = String(userData?.id || userData?._id || "");
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [onlineUserIds, setOnlineUserIds] = useState(() => new Set());
  const [socketReady, setSocketReady] = useState(false);

  const refreshUnread = useCallback(async () => {
    if (!token) {
      setUnreadCount(0);
      setNotifications([]);
      return;
    }
    try {
      const [{ data: countData }, { data: convData }] = await Promise.all([
        fetchUnreadMessageCount(),
        fetchConversations(),
      ]);
      setUnreadCount(Number(countData?.count) || 0);
      const next = (Array.isArray(convData?.conversations) ? convData.conversations : [])
        .map(notificationFromConversation)
        .filter(Boolean);
      setNotifications(next);
    } catch {
      // ignore transient errors
    }
  }, [token]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setSocketReady(false);
      setUnreadCount(0);
      setNotifications([]);
      setOnlineUserIds(new Set());
      disconnectMessagingSocket();
      return undefined;
    }

    const socket = connectMessagingSocket();
    const onConnect = () => setSocketReady(true);
    const onDisconnect = () => setSocketReady(false);
    const onNotification = (payload) => {
      const senderId = String(payload?.senderId || "");
      if (senderId && senderId !== myUserId) {
        playMessageNotificationSound();
        const item = notificationFromPayload(payload, myUserId);
        if (item) setNotifications((prev) => upsertNotification(prev, item));
      }
      if (payload?.preview && payload?.senderName && senderId !== myUserId) {
        toast.message(`Message from ${payload.senderName}`, {
          description: payload.preview,
        });
      }
      refreshUnread();
    };

    const onPresenceSync = ({ onlineUserIds: ids } = {}) => {
      setOnlineUserIds(new Set((Array.isArray(ids) ? ids : []).map(String)));
    };
    const onPresenceUpdate = ({ userId, online } = {}) => {
      const id = String(userId || "");
      if (!id) return;
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (online) next.add(id);
        else next.delete(id);
        return next;
      });
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("notification:message", onNotification);
    socket.on("presence:sync", onPresenceSync);
    socket.on("presence:update", onPresenceUpdate);

    refreshUnread();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("notification:message", onNotification);
      socket.off("presence:sync", onPresenceSync);
      socket.off("presence:update", onPresenceUpdate);
      disconnectMessagingSocket();
    };
  }, [isAuthenticated, token, refreshUnread, myUserId]);

  const isUserOnline = useCallback(
    (userId) => {
      const id = String(userId || "");
      return id ? onlineUserIds.has(id) : false;
    },
    [onlineUserIds],
  );

  const value = useMemo(
    () => ({
      socket: getMessagingSocket(),
      socketReady,
      unreadCount,
      notifications,
      onlineUserIds,
      isUserOnline,
      refreshUnread,
      setUnreadCount,
    }),
    [socketReady, unreadCount, notifications, onlineUserIds, isUserOnline, refreshUnread],
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
