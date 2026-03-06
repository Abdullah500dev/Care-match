import React, { useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarDays,
  MessageSquare,
  BarChart2,
  Settings,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/residents", label: "Leads", icon: Users },
  { to: "/dashboard/communities", label: "Facilities", icon: Building2 },
  { to: "/dashboard/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/dashboard/messages", label: "Messages", icon: MessageSquare },
  { to: "/dashboard/analytics", label: "Analytics", icon: BarChart2 },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
];

function NavContent({ onNavClick }) {
  return (
    <nav className="flex w-full flex-1 flex-col space-y-1 px-[10%] text-base">
      {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => (
        <NavLink
          key={to}
          to={to}
          end={exact}
          onClick={onNavClick}
          className="group flex w-full items-center gap-3 rounded-lg py-2.5 font-bold transition-colors hover:bg-slate-50 hover:text-slate-900"
        >
          {({ isActive }) => (
            <>
              <span
                className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5"
                style={
                  isActive
                    ? { backgroundColor: "#ECFEFF", color: "#00B8DB" }
                    : { color: "#62748E" }
                }
              >
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

