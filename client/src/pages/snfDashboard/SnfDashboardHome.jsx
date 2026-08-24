import React, { useEffect, useMemo, useState } from "react";
import { Copy, Download, Mail, MapPin, Phone, QrCode } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import SEO from "@/components/common/SEO";
import { apiClient } from "@/services/api";
import { toast } from "sonner";
import FacilityImagesManager from "@/components/facilityDashboard/FacilityImagesManager";
import {
  copyAuthenticatedImageToClipboard,
  copyImageToClipboard,
  downloadAuthenticatedImage,
  downloadImageFile,
} from "@/lib/qrShare";

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

function resolveSnfImageUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const base = import.meta.env.VITE_REACT_APP_API_BASE_URL || "";
  return `${String(base).replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

export default function SnfDashboardHome() {
  const [partner, setPartner] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [visitCodeInput, setVisitCodeInput] = useState("");
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkedInVisitor, setCheckedInVisitor] = useState(null);
  const [qrBusy, setQrBusy] = useState(false);

  const loadDashboard = async () => {
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

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    setActiveImage(0);
  }, [partner?.images]);

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

  const downloadQrImage = async () => {
    if (!partner?.qrDownloadPath && !partner?.qrImageUrl) return;
    setQrBusy(true);
    try {
      const filename = `${partner.referralCode || "snf"}-qr.png`;
      if (partner.qrDownloadPath) {
        await downloadAuthenticatedImage(partner.qrDownloadPath, filename);
      } else {
        await downloadImageFile(partner.qrImageUrl, filename);
      }
      toast.success("QR image downloaded.");
    } catch {
      toast.error("Could not download QR image", {
        description: "Try opening the QR in a new tab and saving it from there.",
      });
      if (partner.qrImageUrl) {
        window.open(partner.qrImageUrl, "_blank", "noopener,noreferrer");
      }
    } finally {
      setQrBusy(false);
    }
  };

  const copyQrImage = async () => {
    if (!partner?.qrDownloadPath && !partner?.qrImageUrl) return;
    setQrBusy(true);
    try {
      if (partner.qrDownloadPath) {
        await copyAuthenticatedImageToClipboard(partner.qrDownloadPath);
      } else {
        await copyImageToClipboard(partner.qrImageUrl);
      }
      toast.success("QR image copied.", {
        description: "Paste it into a message, email, or document.",
      });
    } catch {
      try {
        if (partner.referralLink) {
          await navigator.clipboard.writeText(partner.referralLink);
          toast.success("Copied referral link instead.", {
            description: "This browser could not copy the QR image.",
          });
        } else {
          throw new Error("no link");
        }
      } catch {
        toast.error("Could not copy QR image.");
      }
    } finally {
      setQrBusy(false);
    }
  };

  const handleVisitorCheckIn = async (e) => {
    e.preventDefault();
    const code = String(visitCodeInput || "").trim().toUpperCase();
    if (!code) {
      toast.error("Enter the visitor QR code");
      return;
    }
    setCheckingIn(true);
    try {
      const { data } = await apiClient.post("/api/snf-partners/visitor-check-in", {
        visitCode: code,
      });
      const visitor = data?.visitor || null;
      const referral = data?.referral || null;
      if (visitor) setCheckedInVisitor(visitor);
      if (referral) {
        setReferrals((prev) => [referral, ...prev.filter((row) => row.id !== referral.id)]);
        setSelectedReferral(referral);
      }
      setVisitCodeInput("");
      toast.success(data?.message || "Visitor checked in");
      loadDashboard();
    } catch (error) {
      toast.error("Could not check in visitor", {
        description: error?.response?.data?.message || "Check the visit QR code and try again.",
      });
    } finally {
      setCheckingIn(false);
    }
  };

  const units = partner?.units ?? 0;
  const occupancy = partner?.occupancy ?? 0;
  const totalReferrals = partner?.totalReferrals ?? 0;
  const imageUrls = useMemo(
    () =>
      (Array.isArray(partner?.images) ? partner.images : [])
        .map((path) => resolveSnfImageUrl(path))
        .filter(Boolean),
    [partner?.images],
  );

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

      <div className="rounded-2xl border border-slate-200 bg-[#0F172A] p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-[#00B8DB]">
              Visitor check-in
            </p>
            <h2 className="mt-1 text-lg font-bold text-white">Scan a visitor QR code</h2>
            <p className="mt-1 text-sm text-slate-400">
              Enter the family user&apos;s visit code from their CareMatch QR to record the visit
              and view their details.
            </p>
          </div>
          <form
            onSubmit={handleVisitorCheckIn}
            className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center"
          >
            <input
              type="text"
              value={visitCodeInput}
              onChange={(e) => setVisitCodeInput(e.target.value.toUpperCase())}
              placeholder="USR-XXXXXX"
              className="h-11 w-full rounded-xl border-0 bg-[#1E293B] px-4 font-mono text-sm text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-[#00B8DB]/50 sm:w-56"
            />
            <button
              type="submit"
              disabled={checkingIn || !partner}
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-[#00B8DB] px-5 text-sm font-bold text-white disabled:opacity-60"
            >
              {checkingIn ? "Checking in…" : "Check in visitor"}
            </button>
          </form>
        </div>
        {checkedInVisitor ? (
          <p className="mt-3 text-sm text-emerald-300">
            Last check-in: {checkedInVisitor.name || checkedInVisitor.email}
            {checkedInVisitor.email ? ` · ${checkedInVisitor.email}` : ""}
          </p>
        ) : null}
      </div>

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

      {imageUrls.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="relative aspect-[16/8] w-full bg-slate-100">
            <img
              src={imageUrls[Math.min(activeImage, imageUrls.length - 1)]}
              alt={partner?.name || "SNF photo"}
              className="h-full w-full object-cover"
            />
          </div>
          {imageUrls.length > 1 ? (
            <div className="flex flex-wrap gap-2 p-3">
              {imageUrls.map((src, index) => (
                <button
                  key={`${src}-${index}`}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  className={`h-16 w-16 overflow-hidden rounded-xl border-2 ${
                    index === activeImage ? "border-[#00B8DB]" : "border-transparent"
                  }`}
                  aria-label={`View photo ${index + 1}`}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : !loading ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
          No photos yet. Upload images below — they also appear on Care Explorer for families
          searching in your area.
        </div>
      ) : null}

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
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={copyReferralLink}
                disabled={qrBusy || !partner?.referralLink}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#00B8DB] px-4 text-sm font-bold text-white disabled:opacity-60"
              >
                <Copy className="h-4 w-4" />
                Copy link
              </button>
              <button
                type="button"
                onClick={copyQrImage}
                disabled={qrBusy || !partner?.qrImageUrl}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-500 px-4 text-sm font-bold text-white disabled:opacity-60"
              >
                <Copy className="h-4 w-4" />
                Copy QR
              </button>
              <button
                type="button"
                onClick={downloadQrImage}
                disabled={qrBusy || !partner?.qrImageUrl}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-600 px-4 text-sm font-bold text-white disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                {qrBusy ? "Working…" : "Download QR"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          Recent visits
        </p>
        {loading ? (
          <p className="py-4 text-sm text-slate-500">Loading recent activity…</p>
        ) : referrals.length === 0 ? (
          <p className="py-4 text-sm text-slate-500">
            No visitor check-ins yet. Scan a family user&apos;s visit QR to record their visit.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {referrals.map((row) => {
              const visitorLabel = row.visitorName || row.visitorEmail || "Unknown visitor";
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedReferral(row)}
                    className="flex w-full items-start justify-between gap-3 py-2.5 text-left transition hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {visitorLabel}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {row.visitorEmail && row.visitorName ? row.visitorEmail : row.referralCode}
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
                  </button>
                </li>
              );
            })}
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
      <Dialog
        open={Boolean(selectedReferral)}
        onOpenChange={(open) => {
          if (!open) setSelectedReferral(null);
        }}
      >
        <DialogContent className="max-w-md rounded-2xl border-[#E2E8F0]">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-xl text-slate-900">
              {selectedReferral?.visitorName || selectedReferral?.visitorEmail || "Visitor details"}
            </DialogTitle>
            <DialogDescription>
              Family visitor checked in at your facility.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Name</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {selectedReferral?.visitorName || "—"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Email</p>
              <p className="mt-1 break-all text-sm font-semibold text-slate-900">
                {selectedReferral?.visitorEmail || "—"}
              </p>
            </div>
            {selectedReferral?.visitorPhone ? (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Phone</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {selectedReferral.visitorPhone}
                </p>
              </div>
            ) : null}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Referral code
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {selectedReferral?.referralCode || "—"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Scanned</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {selectedReferral?.checkedInAt
                    ? formatShortDate(selectedReferral.checkedInAt)
                    : "—"}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
              <p className="text-sm font-medium text-emerald-800">Status</p>
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                {selectedReferral?.status || "Checked In"}
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
