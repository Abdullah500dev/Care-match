import React from "react";
import { NavLink } from "react-router-dom";
import { Bell, Menu, User } from "lucide-react";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", exact: true },
  { to: "/dashboard/residents", label: "Leads" },
  { to: "/dashboard/communities", label: "My Facilities" },
  { to: "/dashboard/snf-partners", label: "SNF Partners" },
];

export default function DashboardHeader({ onMenuClick }) {
  return (
    <header className="border-b border-slate-200 bg-white" style={{ paddingLeft: "max(1.5rem, 5vw)", paddingRight: "max(1.5rem, 5vw)" }}>
      <div className="mx-auto flex h-14 min-w-0 max-w-[1800px] items-center justify-between gap-4 px-2 sm:h-16 sm:px-4 min-[1280px]:gap-6">
        {/* Burger (mobile) + Logo + brand */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2">
            <img
              src="/assets/images/favicon/favicon.svg"
              alt="CareMatch AI"
              className="h-7 w-7 sm:h-8 sm:w-8"
            />
            <span className="text-sm font-semibold text-slate-900 sm:text-base">
              CareMatch AI
            </span>
          </div>
        </div>
        <div className="flex min-w-0 shrink items-center gap-4 sm:gap-6 min-[1280px]:gap-8">
          {/* Center nav (desktop) */}
          <nav className="hidden items-center gap-4 text-xs text-[#45556C] font-bold sm:flex sm:text-sm">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  [
                    "relative px-1 transition-colors",
                    isActive ? "text-[#00B8DB]" : "hover:text-slate-900",
                  ].join(" ")
                }
              >
                {({ isActive }) => (
                  <>
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-[#00B8DB]" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Right-side actions */}
          <div className="flex min-w-0 shrink items-center gap-2 sm:gap-3">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#45556C]"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="flex min-w-[6.5rem] items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 sm:min-w-0 sm:px-2"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00B8DB] text-xs font-semibold text-white">
              <User className="hidden h-3.5 w-3.5 text-white sm:inline" />
              </span>
              <span className=" text-[#45556C] font-bold">Provider</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

