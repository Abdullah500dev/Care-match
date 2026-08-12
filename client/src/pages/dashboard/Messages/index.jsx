import React, { useEffect, useRef, useState } from "react";
import { Bot, Circle, MessageSquare, Search, Send, User } from "lucide-react";
import { toast } from "sonner";

import SEO from "@/components/common/SEO";
import { sendChatMessages } from "@/services/chatService";

const CARRIE_WELCOME =
  "Hi — I’m Carrie. I’ll ask a few tailored questions (care level, must-have amenities, budget, location and visits, and lifestyle), then show ranked communities from your directory with clear ✓ reasons. I’ll vary how I ask so it doesn’t feel repetitive.";

const THREADS = [
  {
    id: "carrie",
    name: "Carrie",
    subtitle: "CareMatch AI assistant",
    preview: "OpenAI-powered — sign in required",
    time: "Live",
    unread: 0,
    color: "#00B8DB",
    isAi: true,
    messages: [],
  },
  {
    id: 1,
    name: "Sunrise Villa",
    subtitle: "Facility Partner",
    preview: "We've confirmed 2 new tours for next week.",
    time: "5m ago",
    unread: 3,
    color: "#00B8DB",
    messages: [
      { from: "them", text: "Hi! We've confirmed 2 new tours for next week.", time: "9:41 AM" },
      { from: "me", text: "Great, thanks for confirming. Please make sure the intake forms are ready.", time: "9:43 AM" },
      { from: "them", text: "Will do. One client prefers memory care — should we prioritize that wing?", time: "9:45 AM" },
    ],
  },
  {
    id: 2,
    name: "Golden Years",
    subtitle: "Facility Partner",
    preview: "Can we update our amenities listing?",
    time: "1h ago",
    unread: 1,
    color: "#8b5cf6",
    messages: [
      { from: "them", text: "Can we update our amenities listing on the platform?", time: "8:20 AM" },
      { from: "me", text: "Sure, log in to your facility dashboard and edit the listing directly.", time: "8:30 AM" },
      { from: "them", text: "Got it, thank you!", time: "8:32 AM" },
    ],
  },
  {
    id: 3,
    name: "Sarah Johnson",
    subtitle: "Lead / Family",
    preview: "My father needs memory care urgently.",
    time: "3h ago",
    unread: 0,
    color: "#f59e0b",
    messages: [
      { from: "them", text: "My father needs memory care urgently. Can you help?", time: "7:10 AM" },
      { from: "me", text: "Absolutely. We have matched him with 3 facilities. I'll send the details now.", time: "7:15 AM" },
    ],
  },
  {
    id: 4,
    name: "Robert Miller",
    subtitle: "Lead / Family",
    preview: "Tour at Sunrise Villa went well!",
    time: "Yesterday",
    unread: 0,
    color: "#10b981",
    messages: [
      { from: "them", text: "Tour at Sunrise Villa went really well! We're very interested.", time: "Yesterday 3:00 PM" },
      { from: "me", text: "Excellent! I'll follow up with the intake coordinator on your behalf.", time: "Yesterday 3:10 PM" },
    ],
  },
];

export default function AdminMessages() {
  const [threads, setThreads] = useState(THREADS);
  const [activeId, setActiveId] = useState("carrie");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [aiMessages, setAiMessages] = useState([
    { role: "assistant", content: CARRIE_WELCOME },
  ]);
  const [aiSending, setAiSending] = useState(false);
  const aiScrollContainerRef = useRef(null);

  const activeThread = threads.find((t) => t.id === activeId) ?? threads[0];

  useEffect(() => {
    if (activeThread.isAi) {
      const container = aiScrollContainerRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [activeThread.isAi, aiMessages, aiSending]);

  const filteredThreads = threads.filter(
    (t) =>
      !search.trim() ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.preview.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectThread = (id) => {
    setActiveId(id);
    setThreads((prev) =>
      prev.map((t) => (t.id === id ? { ...t, unread: 0 } : t))
    );
  };

  const handleSend = () => {
    if (activeThread.isAi) return;
    const text = message.trim();
    if (!text) return;
    setThreads((prev) =>
      prev.map((t) =>
        t.id === activeId
          ? {
              ...t,
              preview: text,
              time: "Just now",
              messages: [...t.messages, { from: "me", text, time: "Just now" }],
            }
          : t
      )
    );
    setMessage("");
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
      if (reply?.content) {
        setAiMessages((prev) => [...prev, reply]);
      } else {
        toast.error("No reply from assistant");
      }
    } catch (err) {
      const desc =
        err?.response?.data?.message || err?.message || "Chat request failed.";
      toast.error("Carrie couldn’t respond", { description: desc });
      setAiMessages((prev) => prev.slice(0, -1));
      setMessage(text);
    } finally {
      setAiSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (activeThread.isAi) handleAiSend();
      else handleSend();
    }
  };

  return (
    <div
      className="mx-auto w-full min-w-0 max-w-6xl space-y-6"
      style={{ fontFamily: "Rethink Sans, sans-serif" }}
    >
      <SEO title="Messages – Admin | CareMatch AI" />
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl md:text-3xl">
          Messages
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Carrie AI assistant (OpenAI) and sample partner threads. Requires login.
        </p>
      </div>

      {/* Chat panel */}
      <div
        className="grid h-[calc(100vh-11rem)] min-h-[36rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        style={{ gridTemplateColumns: "300px 1fr" }}
      >
        {/* ── Thread list ── */}
        <aside className="flex min-h-0 flex-col border-r border-slate-100">
          {/* Search */}
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

          {/* Thread rows */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {filteredThreads.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-slate-400">No conversations found.</p>
            ) : (
              filteredThreads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => handleSelectThread(thread.id)}
                  className={`w-full border-b border-slate-50 px-4 py-3 text-left transition-colors last:border-none ${
                    activeId === thread.id
                      ? "bg-cyan-50/80"
                      : "hover:bg-slate-50"
                  }`}
                >
                    <div className="flex items-start gap-3">
                    {/* Avatar */}
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
                        {thread.unread > 0 && (
                          <span className="ml-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#00B8DB] text-[10px] font-bold text-white">
                            {thread.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* ── Message pane ── */}
        <section className="flex min-h-0 min-w-0 flex-col">
          {/* Pane header */}
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: activeThread.color }}
            >
              {activeThread.isAi ? (
                <Bot className="h-4 w-4 text-white" aria-hidden />
              ) : (
                activeThread.name.slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">{activeThread.name}</p>
              <p className="flex items-center gap-1 text-[11px] text-slate-400">
                <Circle className="h-2 w-2 fill-emerald-400 text-emerald-400" />
                {activeThread.subtitle}
              </p>
            </div>
          </div>

          {/* Message bubbles */}
          {activeThread.isAi ? (
            <div
              ref={aiScrollContainerRef}
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
              {aiSending && (
                <div className="flex gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#00B8DB] text-white">
                    <Bot className="h-3.5 w-3.5 animate-pulse" />
                  </div>
                  <div className="rounded-2xl rounded-bl-sm border border-cyan-100 bg-cyan-50/50 px-3.5 py-2 text-sm text-slate-500">
                    Thinking…
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-5 py-4">
              {activeThread.messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                      msg.from === "me"
                        ? "rounded-br-sm bg-[#00B8DB] text-white"
                        : "rounded-bl-sm bg-slate-100 text-slate-800"
                    }`}
                  >
                    <p>{msg.text}</p>
                    <p
                      className={`mt-1 text-[10px] ${
                        msg.from === "me" ? "text-white/70" : "text-slate-400"
                      }`}
                    >
                      {msg.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-slate-100 p-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 shrink-0 text-slate-300" />
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  activeThread.isAi
                    ? `Ask ${userName || "CareMatch"}… (Enter to send)`
                    : "Type a message… (Enter to send)"
                }
                disabled={activeThread.isAi && aiSending}
                className="h-10 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B8DB]/40 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={activeThread.isAi ? handleAiSend : handleSend}
                disabled={!message.trim() || (activeThread.isAi && aiSending)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#00B8DB] text-white shadow-sm transition hover:opacity-90 disabled:opacity-40"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
