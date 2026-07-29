import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SEO from "@/components/common/SEO";
import { apiClient } from "@/services/api";
import { toast } from "sonner";
import FacilityImagesManager from "@/components/facilityDashboard/FacilityImagesManager";

export default function FacilityDashboardHome() {
  const [facility, setFacility] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await apiClient.get("/api/facilities/me");
        setFacility(data?.facility || null);
      } catch (error) {
        setFacility(null);
        // New facility accounts may still be finishing profile setup.
        if (error?.response?.status !== 404) {
          toast.error("Unable to load facility dashboard", {
            description: error?.response?.data?.message || "Please contact admin support.",
          });
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const units = facility?.units ?? 0;
  const occupancy = facility?.occupancy ?? 0;
  const activeLeads = facility?.active_leads ?? 0;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <SEO title="Facility Dashboard – CareMatch AI" />
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Facility Dashboard</h1>
        <p className="text-slate-500">
          {facility?.name
            ? `Manage onboarding, leads, and operations for ${facility.name}.`
            : "Manage onboarding, leads, and operations for your community."}
        </p>
      </div>
      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          Loading facility metrics...
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200">
          <CardHeader>
            <CardDescription>Units</CardDescription>
            <CardTitle>{units}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-slate-200">
          <CardHeader>
            <CardDescription>Occupancy</CardDescription>
            <CardTitle>{occupancy}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-slate-200">
          <CardHeader>
            <CardDescription>Active Leads</CardDescription>
            <CardTitle>{activeLeads}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-slate-200">
          <CardHeader>
            <CardDescription>Care Levels</CardDescription>
            <CardTitle className="text-lg">
              {facility?.care_levels?.length ? facility.care_levels[0] : "Not set"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {!loading && facility ? (
        <FacilityImagesManager
          facility={facility}
          onFacilityUpdated={setFacility}
        />
      ) : null}
    </div>
  );
}
