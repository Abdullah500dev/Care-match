import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot, Circle, MessageSquare, Plus, Search, Send, User, X } from "lucide-react";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useMessagingSocket } from "@/contexts/MessagingSocketContext";
import {
  fetchConversationMessages,
  fetchConversations,
  fetchMessageDirectory,
  fetchScannedSnfContacts,
  markConversationRead,
  startConversation,
} from "@/services/messageService";
import { sendChatMessages } from "@/services/chatService";

const CARRIE_WELCOME =
  "Hi — I’m Carrie. I’ll ask a few tailored questions (care level, must-have amenities, budget, location and visits, and lifestyle), then show ranked communities from your directory with clear ✓ reasons.";

const THREAD_COLORS = ["#00B8DB", "#8b5cf6", "#f59e0b", "#10b981", "#6366f1", "#ec4899"];

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const diff = now - date;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return date.toLocaleDateString();
}

function peerColor(id = "") {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash + id.charCodeAt(i)) % THREAD_COLORS.length;
  return THREAD_COLORS[hash];
}

function appendMessage(prev, message) {
  if (!message?.id) return prev;
  if (prev.some((row) => row.id === message.id)) return prev;
  return [...prev, message];
}

function mergeConversationRow(existing, incoming, myUserId) {
  if (!incoming) return existing;
  const merged = { ...existing, ...incoming };
  if (
    merged.peer?.id === myUserId &&
    existing?.peer?.id &&
    existing.peer.id !== myUserId
  ) {
    merged.peer = existing.peer;
  }
  return merged;
}

export default function DirectMessagesPanel({
  title = "Messages",
  description = "Live messaging with socket notifications.",
  showDirectory = false,
  showSupportShortcut = false,
  showScannedSnfs = false,
  carriePlaceholder = "Ask Carrie… (Enter to send)",
}) {
  const { socket, socketReady, refreshUnread } = useMessagingSocket();
  const { userData } = useSelector((state) => state.auth || {});
  const myUserId = String(userData?.id || userData?._id || "");
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedConversationId = String(searchParams.get("conversation") || "").trim();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(requestedConversationId || "carrie");
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [directoryUsers, setDirectoryUsers] = useState([]);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [scannedSnfsOpen, setScannedSnfsOpen] = useState(false);
  const [scannedSnfs, setScannedSnfs] = useState([]);
  const [scannedSnfsLoading, setScannedSnfsLoading] = useState(false);
  const [aiMessages, setAiMessages] = useState([
    { role: "assistant", content: CARRIE_WELCOME },
  ]);
  const [aiSending, setAiSending] = useState(false);
  const scrollRef = useRef(null);
  const aiScrollRef = useRef(null);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId),
    [conversations, activeId],
  );
  const isCarrie = activeId === "carrie";

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await fetchConversations();
      setConversations(Array.isArray(data?.conversations) ? data.conversations : []);
    } catch (error) {
      toast.error("Could not load conversations", {
        description: error?.response?.data?.message || "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!requestedConversationId) return;
    setActiveId(requestedConversationId);
  }, [requestedConversationId]);

  const loadMessages = useCallback(async (conversationId) => {
    if (!conversationId || conversationId === "carrie") return;
    setMessagesLoading(true);
    try {
      const { data } = await fetchConversationMessages(conversationId);
      setMessages(Array.isArray(data?.messages) ? data.messages : []);
      if (data?.conversation) {
        setConversations((prev) =>
          prev.map((c) => (c.id === conversationId ? { ...c, ...data.conversation, unread: 0 } : c)),
        );
      }
      await markConversationRead(conversationId);
      refreshUnread();
      socket?.emit("conversation:read", { conversationId });
    } catch (error) {
      toast.error("Could not load messages", {
        description: error?.response?.data?.message || "Please try again.",
      });
    } finally {
      setMessagesLoading(false);
    }
  }, [refreshUnread, socket]);

  useEffect(() => {
    if (!isCarrie && activeId) {
      loadMessages(activeId);
      socket?.emit("conversation:join", { conversationId: activeId });
      return () => socket?.emit("conversation:leave", { conversationId: activeId });
    }
    return undefined;
  }, [activeId, isCarrie, loadMessages, socket]);

  useEffect(() => {
    if (!socket) return undefined;
    const onNewMessage = (payload) => {
      const convId = payload?.message?.conversationId;
      if (!convId) return;
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === convId);
        const nextRow = payload.conversation || {
          id: convId,
          lastMessageText: payload.message?.text,
          lastMessageAt: payload.message?.createdAt,
        };
        if (!exists) return [nextRow, ...prev];
        return prev.map((c) =>
          c.id === convId ? mergeConversationRow(c, nextRow, myUserId) : c,
        );
      });
      if (convId === activeId) {
        setMessages((prev) => appendMessage(prev, payload.message));
      }
    };
    socket.on("message:new", onNewMessage);
    return () => socket.off("message:new", onNewMessage);
  }, [socket, activeId, myUserId]);

  useEffect(() => {
    const el = isCarrie ? aiScrollRef.current : scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, aiMessages, aiSending, isCarrie, messagesLoading]);

  const threadRows = useMemo(() => {
    const carrie = {
      id: "carrie",
      name: "Carrie",
      subtitle: "CareMatch AI assistant",
      preview: "OpenAI-powered assistant",
      time: "Live",
      unread: 0,
      color: "#00B8DB",
      isAi: true,
    };
    const direct = conversations.map((c) => ({
      id: c.id,
      name: c.peer?.name || "User",
      subtitle: c.peer?.accountLabel || c.subtitle || "User",
      preview: c.lastMessageText || "No messages yet",
      time: formatTime(c.lastMessageAt),
      unread: c.unread || 0,
      color: peerColor(c.peer?.id || c.id),
      isAi: false,
    }));
    return [carrie, ...direct];
  }, [conversations]);

  const filteredThreads = threadRows.filter(
    (t) =>
      !search.trim() ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.preview.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSelectThread = (id) => {
    setActiveId(id);
    if (id !== "carrie") {
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)),
      );
      setSearchParams({ conversation: id }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const handleSend = () => {
    const text = message.trim();
    if (!text || isCarrie || !activeId || sending) return;
    setSending(true);
    socket?.emit("message:send", { conversationId: activeId, text }, (response) => {
      setSending(false);
      if (!response?.success) {
        toast.error("Message failed", { description: response?.message || "Try again." });
        return;
      }
      if (response.message) {
        setMessages((prev) => appendMessage(prev, response.message));
      }
      if (response.conversation) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeId
              ? mergeConversationRow(c, response.conversation, myUserId)
              : c,
          ),
        );
      }
      setMessage("");
      refreshUnread();
    });
  };

  const handleAiSend = async () => {
    const text = message.trim();
    if (!text || aiSending) return;
    const history = [...aiMessages, { role: "user", content: text }];
    setAiMessages(history);
    setMessage("");
    setAiSending(true);
    try {
      const { data } = await sendChatMessages(history);
      const reply = data?.message;
      if (reply?.content) setAiMessages((prev) => [...prev, reply]);
      else toast.error("No reply from assistant");
    } catch (err) {
      toast.error("Carrie couldn’t respond", {
        description: err?.response?.data?.message || err?.message,
      });
      setAiMessages((prev) => prev.slice(0, -1));
      setMessage(text);
    } finally {
      setAiSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isCarrie) handleAiSend();
      else handleSend();
    }
  };

  const openDirectory = async () => {
    setDirectoryOpen(true);
    setDirectoryLoading(true);
    try {
      const { data } = await fetchMessageDirectory(directoryQuery);
      setDirectoryUsers(Array.isArray(data?.users) ? data.users : []);
    } catch (error) {
      toast.error("Could not load users", {
        description: error?.response?.data?.message || "Admin only.",
      });
    } finally {
      setDirectoryLoading(false);
    }
  };

  useEffect(() => {
    if (!directoryOpen || !showDirectory) return;
    const timer = window.setTimeout(async () => {
      setDirectoryLoading(true);
      try {
        const { data } = await fetchMessageDirectory(directoryQuery);
        setDirectoryUsers(Array.isArray(data?.users) ? data.users : []);
      } catch {
        setDirectoryUsers([]);
      } finally {
        setDirectoryLoading(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [directoryOpen, directoryQuery, showDirectory]);

  const pickUser = async (userId) => {
    try {
      const { data } = await startConversation({ recipientId: userId });
      const conversation = data?.conversation;
      if (!conversation) return;
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === conversation.id);
        if (exists) {
          return prev.map((c) => (c.id === conversation.id ? { ...c, ...conversation } : c));
        }
        return [conversation, ...prev];
      });
      setActiveId(conversation.id);
      setDirectoryOpen(false);
    } catch (error) {
      toast.error("Could not start conversation", {
        description: error?.response?.data?.message || "Try again.",
      });
    }
  };

  const startSupportChat = async () => {
    try {
      const { data } = await startConversation({ support: true });
      const conversation = data?.conversation;
      if (!conversation) return;
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === conversation.id);
        if (exists) {
          return prev.map((c) => (c.id === conversation.id ? { ...c, ...conversation } : c));
        }
        return [conversation, ...prev];
      });
      setActiveId(conversation.id);
    } catch (error) {
      toast.error("Could not open support chat", {
        description: error?.response?.data?.message || "Try again.",
      });
    }
  };

  const openScannedSnfs = async () => {
    setScannedSnfsOpen(true);
    setScannedSnfsLoading(true);
    try {
      const { data } = await fetchScannedSnfContacts();
      setScannedSnfs(Array.isArray(data?.contacts) ? data.contacts : []);
    } catch (error) {
      toast.error("Could not load scanned SNFs", {
        description: error?.response?.data?.message || "Try again.",
      });
      setScannedSnfs([]);
    } finally {
      setScannedSnfsLoading(false);
    }
  };

  const pickScannedSnf = async (contact) => {
    try {
      const { data } = await startConversation({
        snfPartnerId: contact.partnerId,
        recipientId: contact.id,
      });
      const conversation = data?.conversation;
      if (!conversation) return;
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === conversation.id);
        if (exists) {
          return prev.map((c) => (c.id === conversation.id ? { ...c, ...conversation } : c));
        }
        return [conversation, ...prev];
      });
      setActiveId(conversation.id);
      setScannedSnfsOpen(false);
    } catch (error) {
      toast.error("Could not start conversation", {
        description: error?.response?.data?.message || "Try again.",
      });
    }
  };

  const headerName = isCarrie ? "Carrie" : activeConversation?.peer?.name || "Conversation";
  const headerSubtitle = isCarrie
    ? "CareMatch AI assistant"
    : activeConversation?.peer?.accountLabel || "Direct message";

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl md:text-3xl">
            {title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {description}
            {socketReady ? "" : " · Connecting live socket…"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {showSupportShortcut ? (
            <button
              type="button"
              onClick={startSupportChat}
              className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Message CareMatch Support
            </button>
          ) : null}
          {showScannedSnfs ? (
            <button
              type="button"
              onClick={openScannedSnfs}
              className="inline-flex h-10 items-center rounded-xl border border-[#00B8DB]/30 bg-[#ECFEFF] px-4 text-sm font-semibold text-[#0E7490] hover:bg-[#CFFAFE]"
            >
              Message scanned SNF
            </button>
          ) : null}
          {showDirectory ? (
            <button
              type="button"
              onClick={() => {
                setDirectoryOpen(true);
                openDirectory();
              }}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#00B8DB] px-4 text-sm font-bold text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              New message
            </button>
          ) : null}
        </div>
      </div>

      <div
        className="grid h-[calc(100vh-11rem)] min-h-[36rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        style={{ gridTemplateColumns: "300px 1fr" }}
      >
        <aside className="flex min-h-0 flex-col border-r border-slate-100">
          <div className="border-b border-slate-100 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search conversations…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B8DB]/40"
              />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {loading ? (
              <p className="px-4 py-6 text-center text-xs text-slate-400">Loading…</p>
            ) : filteredThreads.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-slate-400">No conversations found.</p>
            ) : (
              filteredThreads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => handleSelectThread(thread.id)}
                  className={`w-full border-b border-slate-50 px-4 py-3 text-left transition-colors last:border-none ${
                    activeId === thread.id ? "bg-cyan-50/80" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: thread.color }}
                    >
                      {thread.isAi ? (
                        <Bot className="h-4 w-4 text-white" aria-hidden />
                      ) : (
                        thread.name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p
                          className={`truncate text-sm ${
                            activeId === thread.id
                              ? "font-bold text-[#00B8DB]"
                              : "font-semibold text-slate-900"
                          }`}
                        >
                          {thread.name}
                        </p>
                        <span className="shrink-0 text-[10px] text-slate-400">{thread.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">{thread.subtitle}</p>
                      <div className="mt-0.5 flex items-center justify-between gap-1">
                        <p className="truncate text-xs text-slate-500">{thread.preview}</p>
                        {thread.unread > 0 ? (
                          <span className="ml-1 flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-[#00B8DB] px-1 text-[10px] font-bold text-white">
                            {thread.unread}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{
                backgroundColor: isCarrie
                  ? "#00B8DB"
                  : peerColor(activeConversation?.peer?.id || activeId),
              }}
            >
              {isCarrie ? (
                <Bot className="h-4 w-4 text-white" aria-hidden />
              ) : (
                headerName.slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">{headerName}</p>
              <p className="flex items-center gap-1 text-[11px] text-slate-400">
                <Circle className="h-2 w-2 fill-emerald-400 text-emerald-400" />
                {headerSubtitle}
              </p>
            </div>
          </div>

          {isCarrie ? (
            <div
              ref={aiScrollRef}
              className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-5 py-4"
            >
              {aiMessages.map((m, i) => (
                <div
                  key={`${i}-${m.role}`}
                  className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      m.role === "user" ? "bg-slate-200 text-slate-600" : "bg-[#00B8DB] text-white"
                    }`}
                  >
                    {m.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                  </div>
                  <div
                    className={`max-w-[min(100%,28rem)] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "rounded-br-sm bg-[#00B8DB] text-white"
                        : "rounded-bl-sm border border-cyan-100 bg-cyan-50/70 text-slate-800"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {aiSending ? (
                <div className="flex gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#00B8DB] text-white">
                    <Bot className="h-3.5 w-3.5 animate-pulse" />
                  </div>
                  <div className="rounded-2xl rounded-bl-sm border border-cyan-100 bg-cyan-50/50 px-3.5 py-2 text-sm text-slate-500">
                    Thinking…
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div
              ref={scrollRef}
              className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-5 py-4"
            >
              {messagesLoading ? (
                <p className="text-center text-sm text-slate-400">Loading messages…</p>
              ) : messages.length === 0 ? (
                <p className="text-center text-sm text-slate-400">No messages yet. Say hello.</p>
              ) : (
                messages.map((msg) => {
                  const fromMe = String(msg.senderId) === myUserId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${fromMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                          fromMe
                            ? "rounded-br-sm bg-[#00B8DB] text-white"
                            : "rounded-bl-sm bg-slate-100 text-slate-800"
                        }`}
                      >
                        <p>{msg.text}</p>
                        <p
                          className={`mt-1 text-[10px] ${
                            fromMe ? "text-white/70" : "text-slate-400"
                          }`}
                        >
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          <div className="border-t border-slate-100 p-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 shrink-0 text-slate-300" />
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isCarrie ? carriePlaceholder : "Type a message… (Enter to send)"}
                disabled={(isCarrie && aiSending) || (!isCarrie && sending)}
                className="h-10 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B8DB]/40 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={isCarrie ? handleAiSend : handleSend}
                disabled={!message.trim() || (isCarrie && aiSending) || (!isCarrie && sending)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#00B8DB] text-white shadow-sm transition hover:opacity-90 disabled:opacity-40"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </div>

      {directoryOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setDirectoryOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900">Message a user</h2>
              <button type="button" onClick={() => setDirectoryOpen(false)} aria-label="Close">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <input
              type="text"
              value={directoryQuery}
              onChange={(e) => setDirectoryQuery(e.target.value)}
              placeholder="Search name or email…"
              className="mt-4 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B8DB]/40"
            />
            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
              {directoryLoading ? (
                <p className="py-6 text-center text-sm text-slate-400">Searching…</p>
              ) : directoryUsers.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">No users found.</p>
              ) : (
                directoryUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => pickUser(user.id)}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-left hover:bg-slate-50"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                    <span className="text-[10px] font-bold uppercase text-[#00B8DB]">
                      {user.accountLabel}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {scannedSnfsOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setScannedSnfsOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900">Message a scanned SNF</h2>
              <button type="button" onClick={() => setScannedSnfsOpen(false)} aria-label="Close">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Only skilled nursing partners you opened from a referral QR or link appear here.
            </p>
            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
              {scannedSnfsLoading ? (
                <p className="py-6 text-center text-sm text-slate-400">Loading…</p>
              ) : scannedSnfs.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">
                  No scanned SNFs yet. Scan a partner QR or open a referral link first.
                </p>
              ) : (
                scannedSnfs.map((contact) => (
                  <button
                    key={contact.partnerId || contact.id}
                    type="button"
                    onClick={() => pickScannedSnf(contact)}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-left hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {contact.name}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {contact.email || contact.accountLabel}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] font-bold uppercase text-[#00B8DB]">
                      SNF
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
