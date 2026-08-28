import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import DashboardSidebar from "./Sidebar";
import DashboardHeader from "./DashboardHeader";
import { MessagingSocketProvider } from "@/contexts/MessagingSocketContext";

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <MessagingSocketProvider>
      <div className="flex h-[calc(100vh-2.5rem)] flex-col bg-slate-50 sm:h-[calc(100vh-3rem)]">
      {/* Dashboard header spans full width, including above sidebar */}
      <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />

      {/* Content row: sidebar + main content */}
      <div className="flex min-h-0 flex-1">
        <DashboardSidebar
          isMobileOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
    </MessagingSocketProvider>
  );
}

