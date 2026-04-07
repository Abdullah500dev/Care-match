import React, { useState } from "react";
import { Search, Send, MessageSquare, Circle } from "lucide-react";
import SEO from "@/components/common/SEO";

const THREADS = [
  {
    id: 1,
    name: "Carrie — AI Advisor",
    subtitle: "CareMatch Assistant",
    preview: "I found 3 memory care facilities near you.",
    time: "2m ago",
    unread: 2,
    color: "#00B8DB",
    messages: [
      { from: "them", text: "Hi! Based on your intake form, I found 3 memory care facilities near you.", time: "9:41 AM" },
      { from: "me", text: "That's great! Can you compare their pricing?", time: "9:43 AM" },
      { from: "them", text: "Absolutely. Sunrise Villa starts at $4,500/mo, Golden Years at $3,900/mo, and Evergreen at $5,200/mo.", time: "9:44 AM" },
    ],
  },
  {
    id: 2,
    name: "Sunrise Care Community",
    subtitle: "Facility Partner",
    preview: "We have one suite available next month.",
    time: "1h ago",
    unread: 1,
    color: "#8b5cf6",
    messages: [
      { from: "them", text: "Hello! We have one suite available starting next month.", time: "8:20 AM" },
      { from: "me", text: "Great! Can we schedule a tour this week?", time: "8:30 AM" },
      { from: "them", text: "Yes — Thursday at 10 AM or Friday at 2 PM works for us.", time: "8:32 AM" },
    ],
  },
  {
    id: 3,
    name: "CareMatch Support",
    subtitle: "Support Team",
    preview: "Your account has been verified.",
    time: "Yesterday",
    unread: 0,
    color: "#10b981",
    messages: [
      { from: "them", text: "Welcome to CareMatch! Your account has been verified and you're all set.", time: "Yesterday 10:00 AM" },
      { from: "me", text: "Thank you! Looking forward to finding the right care.", time: "Yesterday 10:15 AM" },
    ],
  },
];

export default function UserDashboardMessages() {
  const [threads, setThreads] = useState(THREADS);
  const [activeId, setActiveId] = useState(THREADS[0].id);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const activeThread = threads.find((t) => t.id === activeId) ?? threads[0];

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

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className="mx-auto w-full min-w-0 max-w-6xl space-y-6"
      style={{ fontFamily: "Rethink Sans, sans-serif" }}
    >
      <SEO title="Messages – CareMatch AI" />
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl md:text-3xl">
          Messages
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Chat with Carrie, facility partners, and the CareMatch team.
        </p>
      </div>

      {/* Two-pane chat UI */}
      <div
        className="grid min-h-[72vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        style={{ gridTemplateColumns: "300px 1fr" }}
      >
        {/* ── Thread list ── */}
        <aside className="flex flex-col border-r border-slate-100">
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

          <div className="flex-1 overflow-y-auto">
            {filteredThreads.length === 0 ? (
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
                      {thread.name.slice(0, 2).toUpperCase()}
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
        <section className="flex min-w-0 flex-col">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: activeThread.color }}
            >
              {activeThread.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">{activeThread.name}</p>
              <p className="flex items-center gap-1 text-[11px] text-slate-400">
                <Circle className="h-2 w-2 fill-emerald-400 text-emerald-400" />
                {activeThread.subtitle}
              </p>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
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

          <div className="border-t border-slate-100 p-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 shrink-0 text-slate-300" />
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message… (Enter to send)"
                className="h-10 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B8DB]/40"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!message.trim()}
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
