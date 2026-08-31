import React from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Bell, Menu, User } from "lucide-react";
import { getUser } from "../../../store/auth/authSlice";
import { useMessagingSocket } from "@/contexts/MessagingSocketContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Top nav matches admin mock: Dashboard / Leads / My Facilities. */
const ADMIN_NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", exact: true },
  { to: "/admin/residents", label: "Leads" },
  { to: "/admin/communities", label: "My Facilities" },
];

const PORTAL_NAV_ITEMS = [{ to: "/admin", label: "Dashboard", exact: true }];

function headerAccountLabel(userData) {
  const name = userData?.name?.trim();
  if (userData?.role === "user") {
    return name || "User";
  }
  if (userData?.role === "snf") {
    return name || "SNF Partner";
  }
  if (["superadmin", "super_admin", "admin"].includes(userData?.role)) {
    return "Super Admin";
  }
  return "Provider";
}

function formatNoticeTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return date.toLocaleDateString();
}

export default function DashboardHeader({ onMenuClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { userData } = useSelector(getUser);
  const { unreadCount, notifications } = useMessagingSocket();
  const isUserDashboard = location.pathname.startsWith("/portal");
  const isFacilityDashboard = location.pathname.startsWith("/facility");
  const isSnfDashboard = location.pathname.startsWith("/snf");
  const basePath = isUserDashboard
    ? "/portal"
    : isFacilityDashboard
      ? "/facility"
      : isSnfDashboard
        ? "/snf"
        : "/admin";
  const NAV_ITEMS =
    isUserDashboard || isFacilityDashboard || isSnfDashboard
      ? PORTAL_NAV_ITEMS
      : ADMIN_NAV_ITEMS;
  const messagesPath = `${basePath}/messages`;

  const openConversation = (conversationId) => {
    navigate(`${messagesPath}?conversation=${encodeURIComponent(conversationId)}`);
  };

  return (
    <header
      className="border-b border-slate-200 bg-white"
      style={{ paddingLeft: "max(1.5rem, 5vw)", paddingRight: "max(1.5rem, 5vw)" }}
    >
      <div className="mx-auto flex h-14 min-w-0 max-w-[1800px] items-center justify-between gap-4 px-2 sm:h-16 sm:px-4 min-[1280px]:gap-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <Link
            to="/"
            className="flex items-center gap-2 text-slate-900 transition-opacity hover:opacity-90"
            aria-label="CareMatch AI – go to main website"
          >
            <img
              src="/assets/images/favicon/favicon.svg"
              alt="CareMatch AI"
              className="h-7 w-7 sm:h-8 sm:w-8"
            />
            <span className="text-sm font-semibold sm:text-base">CareMatch AI</span>
          </Link>
        </div>
        <div className="flex min-w-0 shrink items-center gap-4 sm:gap-6 min-[1280px]:gap-8">
          <nav className="hidden items-center gap-4 text-xs font-bold text-[#45556C] sm:flex sm:text-sm">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to.replace("/admin", basePath)}
                end={item.exact}
                className={({ isActive }) =>
                  [
                    "px-1 transition-colors",
                    isActive ? "text-[#00B8DB]" : "hover:text-slate-900",
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex min-w-0 shrink items-center gap-2 sm:gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="relative flex h-8 w-8 items-center justify-center rounded-full text-[#45556C] transition-colors hover:bg-slate-100 hover:text-slate-900"
                  aria-label={
                    unreadCount > 0
                      ? `${unreadCount} unread message${unreadCount === 1 ? "" : "s"}`
                      : "Notifications"
                  }
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#00B8DB] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  ) : null}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-0">
                <div className="border-b border-slate-100 px-3 py-2.5">
                  <p className="text-sm font-bold text-slate-900">Notifications</p>
                  <p className="text-[11px] text-slate-400">
                    {unreadCount > 0
                      ? `${unreadCount} unread message${unreadCount === 1 ? "" : "s"}`
                      : "You're all caught up"}
                  </p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-3 py-6 text-center text-sm text-slate-400">
                      No new messages
                    </p>
                  ) : (
                    notifications.map((notice) => (
                      <DropdownMenuItem
                        key={notice.conversationId}
                        className="cursor-pointer items-start gap-3 rounded-none px-3 py-2.5 focus:bg-cyan-50"
                        onSelect={() => openConversation(notice.conversationId)}
                      >
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#00B8DB]" />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-semibold text-slate-900">
                              {notice.senderName}
                            </span>
                            <span className="shrink-0 text-[10px] text-slate-400">
                              {formatNoticeTime(notice.createdAt)}
                            </span>
                          </span>
                          {notice.accountLabel ? (
                            <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">
                              {notice.accountLabel}
                            </span>
                          ) : null}
                          <span className="mt-0.5 line-clamp-2 block text-xs text-slate-500">
                            {notice.preview || "New message"}
                          </span>
                        </span>
                      </DropdownMenuItem>
                    ))
                  )}
                </div>
                <DropdownMenuSeparator className="m-0" />
                <DropdownMenuItem
                  className="cursor-pointer justify-center rounded-none py-2.5 text-sm font-semibold text-[#00B8DB] focus:bg-cyan-50 focus:text-[#0E7490]"
                  onSelect={() => navigate(messagesPath)}
                >
                  View all messages
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link
              to={`${basePath}/settings`}
              className="flex min-w-[6.5rem] items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 sm:min-w-0 sm:px-2"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00B8DB] text-xs font-semibold text-white">
                <User className="hidden h-3.5 w-3.5 text-white sm:inline" />
              </span>
              <span className="max-w-[10rem] truncate font-bold text-[#45556C] sm:max-w-[14rem]">
                {headerAccountLabel(userData)}
              </span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
