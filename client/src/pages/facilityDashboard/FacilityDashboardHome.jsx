import React, { useEffect, useState } from "react";
import { Eye, MailOpen, MessageSquare, Users } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SEO from "@/components/common/SEO";
import { apiClient } from "@/services/api";
import { toast } from "sonner";
import FacilityImagesManager from "@/components/facilityDashboard/FacilityImagesManager";

const formatShortDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export default function FacilityDashboardHome() {
  const [facility, setFacility] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await apiClient.get("/api/facilities/me");
        setFacility(data?.facility || null);
      } catch (error) {
        setFacility(null);
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

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setAnalyticsLoading(true);
        const { data } = await apiClient.get("/api/email/analytics/me");
        setAnalytics(data || null);
      } catch (error) {
        setAnalytics(null);
        if (error?.response?.status !== 403 && error?.response?.status !== 404) {
          toast.error("Unable to load reach analytics", {
            description: error?.response?.data?.message || "Please try again.",
          });
        }
      } finally {
        setAnalyticsLoading(false);
      }
    };
    loadAnalytics();
  }, []);

  const units = facility?.units ?? 0;
  const occupancy = facility?.occupancy ?? 0;
  const peopleReached =
    analytics?.summary?.peopleReached ?? analytics?.summary?.userVisited ?? 0;
  const inquiriesSent = analytics?.summary?.inquiriesSent ?? 0;
  const emailsOpened = analytics?.summary?.emailsOpened ?? 0;
  const recent = Array.isArray(analytics?.recent) ? analytics.recent : [];

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
            <CardDescription>Care Levels</CardDescription>
            <CardTitle className="text-lg">
              {facility?.care_levels?.length ? facility.care_levels[0] : "Not set"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-[#B6EBF5] bg-[#F0FDFF]">
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5 text-[#0E7490]">
              <Users className="h-3.5 w-3.5" />
              People reached
            </CardDescription>
            <CardTitle className="text-[#0E7490]">
              {analyticsLoading ? "…" : peopleReached}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Reach analytics</h2>
          <p className="text-sm text-slate-500">
            How many people contacted your facility from Care Explorer — same metrics as admin.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <Eye className="h-4 w-4 text-[#00B8DB]" />
              <span className="text-xs font-bold uppercase tracking-wide">User visited</span>
            </div>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {analyticsLoading ? "…" : peopleReached}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Contact / interest clicks on your listing
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <MessageSquare className="h-4 w-4 text-[#00B8DB]" />
              <span className="text-xs font-bold uppercase tracking-wide">Sent inquiries</span>
            </div>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {analyticsLoading ? "…" : inquiriesSent}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Inquiry emails generated for your facility
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <MailOpen className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-bold uppercase tracking-wide">Emails opened</span>
            </div>
            <p className="mt-2 text-3xl font-bold text-emerald-600">
              {analyticsLoading ? "…" : emailsOpened}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Notify emails opened by facility contacts
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            Recent people who reached out
          </p>
          {analyticsLoading ? (
            <p className="py-4 text-sm text-slate-500">Loading recent activity…</p>
          ) : recent.length === 0 ? (
            <p className="py-4 text-sm text-slate-500">
              No one has contacted your facility yet. Leads appear when a user clicks Contact on
              Care Explorer.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((row) => (
                <li key={row.id} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{row.name}</p>
                    <p className="truncate text-xs text-slate-500">{row.email}</p>
                    {row.createdAt ? (
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {formatShortDate(row.createdAt)}
                      </p>
                    ) : null}
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                    {row.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
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
