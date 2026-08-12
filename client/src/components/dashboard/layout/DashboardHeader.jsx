import React from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { Bell, Menu, User } from "lucide-react";
import { getUser } from "../../../store/auth/authSlice";

/** Top bar keeps Dashboard only — Leads / Facilities live in the sidebar. */
const NAV_ITEMS = [{ to: "/admin", label: "Dashboard", exact: true }];

function headerAccountLabel(userData) {
  const name = userData?.name?.trim();
  if (userData?.role === "user") {
    return name || "User";
  }
  if (["superadmin", "super_admin", "admin"].includes(userData?.role)) {
    return "Super Admin";
  }
  return "Provider";
}

export default function DashboardHeader({ onMenuClick }) {
  const location = useLocation();
  const { userData } = useSelector(getUser);
  const isUserDashboard = location.pathname.startsWith("/portal");
  const isFacilityDashboard = location.pathname.startsWith("/facility");
  const basePath = isUserDashboard
    ? "/portal"
    : isFacilityDashboard
      ? "/facility"
      : "/admin";

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
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#45556C]"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </button>
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
