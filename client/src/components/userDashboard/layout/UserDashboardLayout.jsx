import React from "react";
import { Outlet } from "react-router-dom";
import DashboardLayout from "../../dashboard/layout/DashboardLayout";

// Reuse the base dashboard shell and swap page content by route.
export default function UserDashboardLayout() {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}

