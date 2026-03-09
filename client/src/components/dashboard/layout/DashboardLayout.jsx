import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import DashboardSidebar from "./Sidebar";
import DashboardHeader from "./DashboardHeader";
import Footer from "../../client/Footer";

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Dashboard header spans full width, including above sidebar */}
      <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />

      {/* Content row: sidebar + main content */}
      <div className="flex flex-1">
        <DashboardSidebar
          isMobileOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="min-w-0 flex-1 overflow-x-hidden bg-slate-50 px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>

      {/* Thin white strip separating data from footer (matches sidebar white) */}
      <div className="h-12 w-full shrink-0 bg-white" aria-hidden />

      {/* Full-width footer at bottom */}
      <Footer />
    </div>
  );
}

