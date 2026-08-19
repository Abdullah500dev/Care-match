import React, { useEffect, useState } from "react";
import { Copy, Download, Mail, MapPin, Phone, QrCode } from "lucide-react";
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

export default function SnfDashboardHome() {
  const [partner, setPartner] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await apiClient.get("/api/snf-partners/me");
        setPartner(data?.partner || null);
        setReferrals(Array.isArray(data?.referrals) ? data.referrals : []);
      } catch (error) {
        setPartner(null);
        setReferrals([]);
        if (error?.response?.status !== 404) {
          toast.error("Unable to load SNF dashboard", {
            description: error?.response?.data?.message || "Please contact admin support.",
          });
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const copyReferralLink = async () => {
    const link = partner?.referralLink;
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Referral link copied.");
    } catch {
      toast.error("Could not copy referral link.");
    }
  };

  const units = partner?.units ?? 0;
  const occupancy = partner?.occupancy ?? 0;
  const totalReferrals = partner?.totalReferrals ?? 0;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <SEO title="SNF Dashboard – CareMatch AI" />
      <div>
        <h1 className="text-2xl font-bold text-slate-900">SNF Dashboard</h1>
        <p className="text-slate-500">
          {partner?.name
            ? `Manage your skilled nursing profile, QR kit, and referrals for ${partner.name}.`
            : "Manage your skilled nursing profile, QR kit, and referrals."}
        </p>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          Loading SNF metrics...
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
              {partner?.care_levels?.length ? partner.care_levels[0] : "Skilled Nursing"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-[#B6EBF5] bg-[#F0FDFF]">
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5 text-[#0E7490]">
              <QrCode className="h-3.5 w-3.5" />
              Total referrals
            </CardDescription>
            <CardTitle className="text-[#0E7490]">
              {loading ? "…" : totalReferrals}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {partner ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
              style={{ backgroundColor: "#ECFEFF" }}
            >
              <img
                src="/assets/images/everGreenHealthCareIcon.svg"
                alt=""
                className="h-8 w-8 object-contain"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-slate-900">{partner.name}</h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {partner.address || "Skilled Nursing Partner"}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Direct line
              </p>
              <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Phone className="h-3.5 w-3.5 text-[#00B8DB]" />
                {partner.phone || "—"}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Email
              </p>
              <div className="mt-2 flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-900">
                <Mail className="h-3.5 w-3.5 shrink-0 text-[#00B8DB]" />
                <span className="truncate">{partner.email || "—"}</span>
              </div>
            </div>
          </div>

          <div
            className="mt-5 flex min-w-0 flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between"
            style={{ backgroundColor: "#1A1E2F" }}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white p-1">
                <img
                  src={partner.qrImageUrl}
                  alt="Referral QR Code"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">Active Referral Code</p>
                <p className="mt-0.5 truncate text-base font-bold text-slate-400">
                  {partner.referralCode || "—"}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={copyReferralLink}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#00B8DB] px-4 text-sm font-bold text-white"
              >
                <Copy className="h-4 w-4" />
                Copy link
              </button>
              <a
                href={partner.qrImageUrl}
                download={`${partner.referralCode || "snf"}-qr.png`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-600 px-4 text-sm font-bold text-white"
              >
                <Download className="h-4 w-4" />
                QR image
              </a>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          Recent referrals
        </p>
        {loading ? (
          <p className="py-4 text-sm text-slate-500">Loading recent activity…</p>
        ) : referrals.length === 0 ? (
          <p className="py-4 text-sm text-slate-500">
            No QR scans yet. Share your referral QR or link to start counting referrals.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {referrals.map((row) => (
              <li key={row.id} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {row.referralCode}
                  </p>
                  {row.checkedInAt ? (
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {formatShortDate(row.checkedInAt)}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                  {row.status || "Checked In"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!loading && partner ? (
        <FacilityImagesManager
          facility={partner}
          onFacilityUpdated={setPartner}
          updateUrl="/api/snf-partners/me"
          responseKey="partner"
          title="Change SNF images"
          description="Upload, replace, or remove photos for your skilled nursing facility (max 8)."
        />
      ) : null}
    </div>
  );
}
