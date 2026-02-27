import React from "react";

export default function DashboardHome() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-900 md:text-2xl">
        Welcome to the CareMatch dashboard
      </h2>
      <p className="text-sm text-slate-600 md:text-base">
        This is the main overview page for internal analytics and management tools.
        Use the navigation on the left to switch between sections.
      </p>
    </div>
  );
}

