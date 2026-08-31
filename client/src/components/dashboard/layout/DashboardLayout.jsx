import React, { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import DashboardSidebar from "./Sidebar";
import DashboardHeader from "./DashboardHeader";
import { MessagingSocketProvider } from "@/contexts/MessagingSocketContext";

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const isMessagesRoute = /\/messages$/.test(location.pathname);

  return (
    <MessagingSocketProvider>
      <div className="flex h-full min-h-0 flex-col bg-slate-50">
      {/* Dashboard header spans full width, including above sidebar */}
      <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />

      {/* Content row: sidebar + main content */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <DashboardSidebar
          isMobileOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main
          className={
            isMessagesRoute
              ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-slate-50 px-3 py-3 md:px-4 md:py-4 lg:px-6 lg:py-5"
              : "min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8"
          }
        >
          <Outlet />
        </main>
      </div>
    </div>
    </MessagingSocketProvider>
  );
}

