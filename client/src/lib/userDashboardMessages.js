/** Shared message-thread seed + localStorage sync for user dashboard. */

export const MESSAGES_STORAGE_KEY = "carematch_user_message_threads_v1";

export const DEFAULT_MESSAGE_THREADS = [
  {
    id: 1,
    name: "Carrie — AI Advisor",
    subtitle: "CareMatch Assistant",
    preview: "OpenAI-powered — sign in required",
    time: "Live",
    unread: 0,
    color: "#00B8DB",
    isAi: true,
    messages: [],
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
      {
        from: "them",
        text: "Hello! We have one suite available starting next month.",
        time: "8:20 AM",
      },
      {
        from: "me",
        text: "Great! Can we schedule a tour this week?",
        time: "8:30 AM",
      },
      {
        from: "them",
        text: "Yes — Thursday at 10 AM or Friday at 2 PM works for us.",
        time: "8:32 AM",
      },
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
      {
        from: "them",
        text: "Welcome to CareMatch! Your account has been verified and you're all set.",
        time: "Yesterday 10:00 AM",
      },
      {
        from: "me",
        text: "Thank you! Looking forward to finding the right care.",
        time: "Yesterday 10:15 AM",
      },
    ],
  },
];

export function loadMessageThreads() {
  if (typeof window === "undefined") return DEFAULT_MESSAGE_THREADS;
  try {
    const raw = localStorage.getItem(MESSAGES_STORAGE_KEY);
    if (!raw) return DEFAULT_MESSAGE_THREADS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_MESSAGE_THREADS;
    }
    return parsed;
  } catch {
    return DEFAULT_MESSAGE_THREADS;
  }
}

export function saveMessageThreads(threads) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(threads));
  } catch {
    /* ignore quota / private mode */
  }
}

export function unreadMessageCount(threads = loadMessageThreads()) {
  return threads.reduce((sum, t) => sum + (Number(t.unread) || 0), 0);
}
