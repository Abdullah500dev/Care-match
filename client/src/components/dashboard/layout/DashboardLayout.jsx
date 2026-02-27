import React from "react";
import { Outlet } from "react-router-dom";
import DashboardSidebar from "./Sidebar";
import DashboardHeader from "./DashboardHeader";

export default function DashboardLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Dashboard header spans full width, including above sidebar */}
      <DashboardHeader />

      {/* Content row: sidebar + main content */}
      <div className="flex flex-1">
        <DashboardSidebar />
        <main className="flex-1 bg-slate-50 px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

