import React from "react";
import { Outlet } from "react-router-dom";
import DashboardLayout from "../../dashboard/layout/DashboardLayout";

export default function FacilityDashboardLayout() {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}

