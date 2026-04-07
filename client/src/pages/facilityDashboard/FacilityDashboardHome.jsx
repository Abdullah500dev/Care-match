import React from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SEO from "@/components/common/SEO";

export default function FacilityDashboardHome() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <SEO title="Facility Dashboard – CareMatch AI" />
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Facility Dashboard</h1>
        <p className="text-slate-500">Manage onboarding, leads, and operations for your community.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200"><CardHeader><CardDescription>Units</CardDescription><CardTitle>120</CardTitle></CardHeader></Card>
        <Card className="border-slate-200"><CardHeader><CardDescription>Occupancy</CardDescription><CardTitle>87%</CardTitle></CardHeader></Card>
        <Card className="border-slate-200"><CardHeader><CardDescription>Active Leads</CardDescription><CardTitle>24</CardTitle></CardHeader></Card>
        <Card className="border-slate-200"><CardHeader><CardDescription>Avg Response Time</CardDescription><CardTitle>2.1h</CardTitle></CardHeader></Card>
      </div>
    </div>
  );
}

