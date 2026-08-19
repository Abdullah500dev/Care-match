import React, { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building2,
  Hospital,
  CalendarDays,
  MessageSquare,
  BarChart2,
  Settings,
  X,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";

import { authServices, clearPersistedAuthTokens } from "../../../services/authServices";
import { clearUser, getUser } from "../../../store/auth/authSlice";

const NAV_ITEMS = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/residents", label: "Leads", icon: Users },
  { to: "/admin/communities", label: "Facilities", icon: Building2 },
  { to: "/admin/snf-partners", label: "SNF Partners", icon: Hospital, adminOnly: true },
  { to: "/admin/snf", label: "SNF", icon: Hospital, userOnly: true },
  { to: "/admin/calendar", label: "Calendar", icon: CalendarDays, adminOnly: true },
  { to: "/admin/messages", label: "Messages", icon: MessageSquare },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart2 },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

function NavContent({ onNavClick }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  useSelector(getUser);
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
  const hideLeadsAndAnalytics = isUserDashboard || isFacilityDashboard || isSnfDashboard;
  const visibleItems = hideLeadsAndAnalytics
    ? NAV_ITEMS.filter(
        (item) =>
          item.label !== "Leads" &&
          item.label !== "Analytics" &&
          !item.adminOnly &&
          (!item.userOnly || isUserDashboard),
      )
    : NAV_ITEMS.filter((item) => !item.userOnly);
  const finalItems = visibleItems.map((item) => {
    if (isFacilityDashboard && item.label === "Facilities") {
      return { ...item, label: "Facility" };
    }
    if (isSnfDashboard && item.label === "Facilities") {
      return { ...item, label: "My SNF" };
    }
    return item;
  });

  const handleLogout = async () => {
    try {
      await authServices.logout();
    } catch {
      // ignore - still clear local session
    } finally {
      clearPersistedAuthTokens();
      dispatch(clearUser());
      toast.success("Signed out.");
      onNavClick?.();
      navigate("/signin");
    }
  };

  return (
    <nav className="flex w-full flex-1 flex-col space-y-1 px-[10%] text-base">
      {finalItems.map(({ to, label, icon: Icon, exact }) => (
        <NavLink
          key={to}
          to={to.replace("/admin", basePath)}
          end={exact}
          onClick={onNavClick}
          className="group flex w-full items-center gap-3 rounded-lg py-2.5 font-bold transition-colors hover:bg-slate-50 hover:text-slate-900"
        >
          {({ isActive }) => (
            <>
              <span
                className="relative flex w-full items-center gap-3 rounded-lg px-4 py-2.5"
                style={
                  isActive
                    ? { backgroundColor: "#ECFEFF", color: "#00B8DB" }
                    : { color: "#62748E" }
                }
              >
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full"
                    style={{ backgroundColor: "#00B8DB" }}
                    aria-hidden
                  />
                )}
                <span
                  className={
                    isActive
                      ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-transparent transition-colors"
                      : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white transition-colors group-hover:border-slate-300"
                  }
                  style={
                    isActive
                      ? {
                          backgroundColor: "rgba(0, 184, 219, 0.1)",
                          color: "#00B8DB",
                        }
                      : { color: "#94a3b8" }
                  }
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span>{label}</span>
              </span>
            </>
          )}
        </NavLink>
      ))}

      <button
        type="button"
        onClick={handleLogout}
        className="group flex w-full items-center gap-3 rounded-lg py-2.5 font-bold transition-colors hover:bg-red-50 hover:text-red-700"
      >
        <span className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-slate-500 group-hover:text-red-700">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white transition-colors group-hover:border-red-200 group-hover:bg-red-50 group-hover:text-red-700">
            <LogOut className="h-4 w-4 text-slate-400 group-hover:text-red-600" />
          </span>
          <span>Sign out</span>
        </span>
      </button>
    </nav>
  );
}

export default function DashboardSidebar({ isMobileOpen, onClose }) {
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileOpen]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-100 bg-white md:flex">
        <div className="flex h-full w-full flex-col py-4">
          <NavContent />
        </div>
      </aside>

      {/* Mobile overlay + drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/50 transition-opacity"
            aria-label="Close menu"
          />
          <aside
            className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-slate-100 bg-white shadow-xl animate-in slide-in-from-left-4 duration-200"
            aria-modal
            role="dialog"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <span className="text-sm font-semibold text-slate-900">Menu</span>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-1 flex-col overflow-y-auto py-4">
              <NavContent onNavClick={onClose} />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

