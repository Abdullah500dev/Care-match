import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarDays,
  MessageSquare,
  BarChart2,
  Settings,
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

export default function DashboardSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-100 bg-white md:flex">
      <div className="flex h-full w-full flex-col py-4">
        <nav className="flex w-full flex-1 flex-col space-y-1 text-base px-[10%]">
          {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className="group flex w-full items-center gap-3 rounded-lg py-2.5 font-bold transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              {({ isActive }) => (
                <>
                  <span
                    className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 "
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
      </div>
    </aside>
  );
}

