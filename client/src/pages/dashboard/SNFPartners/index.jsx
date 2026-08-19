import React, { useEffect, useMemo, useState } from "react";
import SEO from "@/components/common/SEO";
import DashboardFooter from "@/components/dashboard/layout/DashboardFooter";
import {
  Plus,
  TrendingUp,
  CalendarDays,
  BarChart2,
  Copy,
  Download,
  MapPin,
  Phone,
  Mail,
  X,
  ImagePlus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { apiClient } from "@/services/api";
import FacilityAddressZipFields from "@/components/dashboard/facilities/FacilityAddressZipFields";
import {
  extractZipFromAddress,
  formatZipInput,
  validateAddressZipPair,
} from "@/lib/facilityAddressGeo";
import { normalizeFacilityWebsite } from "@/lib/facilityWebsite";
import { formatPhoneInput, phoneDigitsOnly } from "@/lib/formatPhone";

/** Brand tokens from SNF Partners reference mock */
const BRAND = {
  cyan: "#00B8DB",
  cyanSoft: "#ECFEFF",
  navy: "#0F172A",
  navyCard: "#1A1E2F",
  navyInput: "#2A3044",
  pageBg: "#F8FAFC",
  text: "#0F172A",
  muted: "#64748B",
  softMuted: "#90A1B9",
  border: "#E2E8F0",
  greenBadgeBg: "#DCFCE7",
  greenBadgeText: "#15803D",
  greenBadgeBorder: "#b7f7ce",
  purple: "#7C3AED",
};

function formatPricingInput(value) {
  const raw = String(value || "");
  const monthly = /\/\s*month\s*$/i.test(raw.trim());
  let body = raw.replace(/\s*\/\s*month\s*$/i, "").trim();
  body = body.replace(/\$/g, "").replace(/,/g, "");
  body = body.replace(/[^\d\s-]/g, "");
  const parts = body.split(/\s*-\s*/);
  const leftDigits = (parts[0] ?? "").replace(/\D/g, "").slice(0, 8);
  const rightDigits =
    parts.length > 1 ? parts.slice(1).join("").replace(/\D/g, "").slice(0, 8) : "";
  const fmt = (digits) => {
    if (!digits) return "";
    const num = Number.parseInt(digits, 10);
    if (Number.isNaN(num)) return "";
    return `$${num.toLocaleString("en-US")}`;
  };
  let out = fmt(leftDigits);
  if (parts.length > 1) {
    out = rightDigits ? `${fmt(leftDigits)}-${fmt(rightDigits)}` : `${fmt(leftDigits)}-`;
  }
  const suffix = monthly ? "/month" : "";
  if (!out && !suffix) return "";
  return out + suffix;
}

const EMPTY_ONBOARD = {
  name: "",
  email: "",
  phone: "",
  website: "",
  address: "",
  zip_code: "",
  pricing: "",
  services: [],
  amenities: [],
  careLevels: ["Skilled Nursing"],
  units: "",
  occupancy: "",
};

const METRIC_CARDS = [
  {
    label: "Total Referrals",
    value: "0",
    change: "Live",
    icon: TrendingUp,
    iconColor: BRAND.cyan,
    iconBg: "rgba(0, 184, 219, 0.12)",
  },
  {
    label: "Partner Facilities",
    value: "0",
    change: "Live",
    icon: CalendarDays,
    iconColor: BRAND.purple,
    iconBg: "rgba(124, 58, 237, 0.12)",
  },
  {
    label: "Referral Codes",
    value: "0",
    change: "Live",
    icon: BarChart2,
    iconColor: BRAND.cyan,
    iconBg: "rgba(0, 184, 219, 0.12)",
  },
];

function QrCodeGraphic() {
  return (
    <div
      className="flex h-[120px] w-[120px] shrink-0 items-center justify-center rounded-2xl sm:h-[132px] sm:w-[132px]"
      // style={{ backgroundColor: "#151A2B" }}
    >
      <img
        src="/assets/images/Container.svg"
        alt="QR Code"
        className="h-[88px] w-[88px] object-contain sm:h-[96px] sm:w-[96px]"
      />
    </div>
  );
}

export default function SNFPartners() {
  const [activeTab, setActiveTab] = useState("partners");
  const [qrInput, setQrInput] = useState("222");
  const [snfModalOpen, setSnfModalOpen] = useState(false);
  const [snfModalStep, setSnfModalStep] = useState("onboard"); // onboard | kit
  const [openKitModalOpen, setOpenKitModalOpen] = useState(false);
  const [partners, setPartners] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [onboardForm, setOnboardForm] = useState(EMPTY_ONBOARD);
  const [tagDrafts, setTagDrafts] = useState({
    services: "",
    amenities: "",
    careLevels: "",
  });
  const [selectedImages, setSelectedImages] = useState([]);
  const [selectedImagePreviewUrls, setSelectedImagePreviewUrls] = useState([]);

  useEffect(() => {
    const urls = selectedImages.map((file) => URL.createObjectURL(file));
    setSelectedImagePreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [selectedImages]);

  const metricCards = useMemo(
    () => [
      { ...METRIC_CARDS[0], value: String(summary.totalReferrals ?? 0) },
      { ...METRIC_CARDS[1], value: String(summary.partnerCount ?? 0) },
      { ...METRIC_CARDS[2], value: String(summary.partnerCount ?? 0) },
    ],
    [summary],
  );

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get("/api/snf-partners/dashboard");
      setPartners(Array.isArray(data?.partners) ? data.partners : []);
      setReferrals(Array.isArray(data?.referrals) ? data.referrals : []);
      setSummary(data?.summary || {});
    } catch (error) {
      toast.error("Could not load skilled nursing partners", {
        description: error?.response?.data?.message || "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const copyReferralCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Referral code copied");
    } catch {
      toast.error("Could not copy code");
    }
  };

  const copyReferralLink = async () => {
    if (!selectedPartner?.referralLink) return;
    try {
      await navigator.clipboard.writeText(selectedPartner.referralLink);
      toast.success("Referral link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const handleOnboardSubmit = async (e) => {
    e.preventDefault();
    const phoneFormatted = formatPhoneInput(onboardForm.phone);
    if (phoneDigitsOnly(phoneFormatted).length !== 10) {
      toast.error("Invalid phone number", {
        description: "Enter a 10-digit US phone number, e.g. (206) 555-0123.",
      });
      return;
    }
    const zipDigits =
      formatZipInput(onboardForm.zip_code) || extractZipFromAddress(onboardForm.address);
    if (zipDigits.length !== 5) {
      toast.error("ZIP code required", {
        description: "Include a valid 5-digit US ZIP in the address.",
      });
      return;
    }
    const geoCheck = await validateAddressZipPair(onboardForm.address, zipDigits);
    if (geoCheck.state === "mismatch") {
      toast.error("Address ZIP could not be verified", {
        description: geoCheck.message,
      });
      return;
    }
    const normalizedWebsite = normalizeFacilityWebsite(onboardForm.website);
    if (String(onboardForm.website || "").trim() && !normalizedWebsite) {
      toast.error("Invalid website", {
        description: "Enter a valid URL (e.g. https://www.yourfacility.com).",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = new FormData();
      payload.append("name", onboardForm.name);
      payload.append("email", onboardForm.email);
      payload.append("phone", phoneFormatted);
      payload.append("website", normalizedWebsite);
      payload.append("address", onboardForm.address);
      payload.append("zip_code", zipDigits);
      payload.append("pricing", onboardForm.pricing);
      onboardForm.services.forEach((item) => payload.append("services", item));
      onboardForm.amenities.forEach((item) => payload.append("amenities", item));
      onboardForm.careLevels.forEach((item) => payload.append("care_levels", item));
      selectedImages.forEach((file) => payload.append("images", file));
      payload.append("units", onboardForm.units || 0);
      payload.append("occupancy", onboardForm.occupancy || 0);

      const { data } = await apiClient.post("/api/snf-partners", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSelectedPartner(data.partner);
      setOpenKitModalOpen(false);
      setSnfModalStep("kit");
      setPartners((current) => [data.partner, ...current]);
      setOnboardForm(EMPTY_ONBOARD);
      setTagDrafts({ services: "", amenities: "", careLevels: "" });
      setSelectedImages([]);
      toast.success("SNF partner created. A sign-in invite was sent by email.");
    } catch (error) {
      toast.error("Could not create SNF partner", {
        description: error?.response?.data?.message || "Please review the form.",
      });
    } finally {
      setSaving(false);
    }
  };

  const addTags = (field, raw) => {
    const next = String(raw || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (!next.length) return;
    setOnboardForm((prev) => ({
      ...prev,
      [field]: [...prev[field], ...next.filter((item) => !prev[field].includes(item))],
    }));
  };

  const handleTagInputKeyDown = (field, event) => {
    if (event.key !== "Enter" && event.key !== ",") return;
    event.preventDefault();
    addTags(field, tagDrafts[field]);
    setTagDrafts((prev) => ({ ...prev, [field]: "" }));
  };

  const handleTagInputBlur = (field) => {
    if (!tagDrafts[field].trim()) return;
    addTags(field, tagDrafts[field]);
    setTagDrafts((prev) => ({ ...prev, [field]: "" }));
  };

  const removeTag = (field, index) => {
    setOnboardForm((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setSelectedImages((prev) => [...prev, ...files].slice(0, 8));
    e.target.value = "";
  };

  const handleFacilityImageDragOver = (e) => {
    e.preventDefault();
  };

  const handleFacilityImageDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []).filter((f) =>
      String(f.type || "").startsWith("image/"),
    );
    if (!files.length) return;
    setSelectedImages((prev) => [...prev, ...files].slice(0, 8));
  };

  const removeImage = (index) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const openOnboardModal = () => {
    setSnfModalStep("onboard");
    setOpenKitModalOpen(false);
    setSnfModalOpen(true);
  };

  const closeSnfModal = () => {
    setSnfModalOpen(false);
    setOpenKitModalOpen(false);
    setSnfModalStep("onboard");
    setOnboardForm(EMPTY_ONBOARD);
    setTagDrafts({ services: "", amenities: "", careLevels: "" });
    setSelectedImages([]);
  };

  const handleCheckIn = async () => {
    if (!qrInput.trim()) {
      toast.error("Enter a QR referral code");
      return;
    }
    try {
      const { data } = await apiClient.post("/api/snf-partners/check-in", {
        referralCode: qrInput.trim(),
      });
      toast.success("Referral checked in", { description: data.message });
      setQrInput("");
      loadDashboard();
    } catch (error) {
      toast.error("Could not check in referral", {
        description: error?.response?.data?.message || "Check the referral code.",
      });
    }
  };

  return (
    <div className="-mx-4 -my-4 flex min-h-full min-w-0 flex-col md:-mx-6 md:-my-6 lg:-mx-8 lg:-my-8">
      <SEO title="SNF Partners – Admin | CareMatch AI" />

      <div
        className="mx-auto w-full min-w-0 max-w-5xl flex-1 space-y-6 px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8"
        style={{ fontFamily: "Rethink Sans, sans-serif" }}
      >
        {/* Header */}
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1
              className="text-2xl font-bold tracking-tight sm:text-[28px] md:text-[32px]"
              style={{ color: BRAND.text, lineHeight: 1.2 }}
            >
              Skilled Nursing Facilities
            </h1>
            <p
              className="mt-1.5 text-sm md:text-[15px]"
              style={{ color: BRAND.muted }}
            >
              Welcome back, here&apos;s what&apos;s happening with your facilities
              today.
            </p>
          </div>
          <button
            type="button"
            onClick={openOnboardModal}
            className="inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-[14px] px-5 text-sm font-bold text-white sm:w-auto"
            style={{
              background: BRAND.cyan,
              boxShadow:
                "0 0 6px -4px #CEFAFE, 0 8px 24px 0 rgba(0, 184, 219, 0.45)",
            }}
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            New Facility
          </button>
        </div>

        {/* Metric cards */}
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3">
          {metricCards.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="min-w-0 rounded-2xl border bg-white p-5 shadow-sm"
                style={{ borderColor: BRAND.border }}
              >
                <div className="flex items-start justify-between">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: item.iconBg, color: item.iconColor }}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2.25} />
                  </div>
                  <span
                    className="rounded-md px-2.5 py-1 border text-xs font-bold"
                    style={{
                      backgroundColor: BRAND.greenBadgeBg,
                      color: BRAND.greenBadgeText,
                      border: `1px solid ${BRAND.greenBadgeBorder}`
                    }}
                  >
                    {item.change}
                  </span>
                </div>
                <p
                  className="mt-4 text-[11px] font-bold uppercase tracking-[0.08em]"
                  style={{ color: BRAND.softMuted }}
                >
                  {item.label}
                </p>
                <p
                  className="mt-1 text-[28px] font-bold leading-none"
                  style={{ color: BRAND.text }}
                >
                  {item.value}
                </p>
              </div>
            );
          })}
        </div>

        {/* Internal Intake Station */}
        <div
          className="flex min-w-0 flex-col gap-5 rounded-2xl p-5 sm:p-6 md:flex-row md:items-center md:justify-between"
          style={{ backgroundColor: BRAND.navyCard }}
        >
          <div className="min-w-0 flex-1 space-y-3">
            <h3 className="text-lg font-bold text-white sm:text-xl">
              Internal Intake Station
            </h3>
            <p className="max-w-xl text-sm leading-relaxed text-white/50">
              Check in arriving patients from SNF partners by verifying their QR <br />
              referral code here.
            </p>
            <div className="flex min-w-0 max-w-md flex-col gap-2.5 sm:flex-row sm:items-center">
              <input
                type="text"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                placeholder="222"
                className="h-11 flex-1 rounded-xl border-0 px-4 text-sm text-gray-500 outline-none placeholder:text-slate-500 focus:ring-2"
                style={{
                  backgroundColor: BRAND.navyInput,
                  boxShadow: "inset 0 0 0 1px rgba(148, 163, 184, 0.15)",
                }}
              />
              <button
                type="button"
                onClick={handleCheckIn}
                className="h-11 shrink-0 rounded-xl px-6 text-sm font-bold text-white"
                style={{ backgroundColor: BRAND.cyan }}
              >
                Check In
              </button>
            </div>
          </div>
          <div className="hidden shrink-0 md:block">
            <QrCodeGraphic />
          </div>
        </div>

        {/* Partner Facilities / Recent Referrals */}
        <div
          className="min-w-0 overflow-hidden rounded-2xl border bg-white shadow-sm"
          style={{ borderColor: BRAND.border }}
        >
          <div className="border-b px-5 pt-4 sm:px-6" style={{ borderColor: BRAND.border }}>
            <div className="flex flex-wrap gap-6">
              {[
                { id: "partners", label: "Partner Facilities" },
                { id: "referrals", label: "Recent Referrals" },
              ].map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className="relative pb-3 text-sm font-bold transition-colors"
                    style={{ color: active ? BRAND.cyan : BRAND.muted }}
                  >
                    {tab.label}
                    {active && (
                      <span
                        className="absolute inset-x-0 bottom-0 h-0.5 rounded-full"
                        style={{ backgroundColor: BRAND.cyan }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-w-0 overflow-x-auto">
            {activeTab === "partners" ? (
              <table className="w-full min-w-[560px]">
                <thead>
                  <tr
                    className="border-b"
                    style={{
                      borderColor: BRAND.border,
                      backgroundColor: "#F8FAFC",
                    }}
                  >
                    {["Facility", "Stats", "Referral Code"].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] sm:px-6"
                        style={{ color: BRAND.softMuted }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-10 text-center text-sm text-slate-400">
                        Loading partners…
                      </td>
                    </tr>
                  ) : partners.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-10 text-center text-sm text-slate-400">
                        No skilled nursing partners yet.
                      </td>
                    </tr>
                  ) : partners.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b last:border-b-0"
                      style={{ borderColor: BRAND.border }}
                    >
                      <td className="px-5 py-4 sm:px-6">
                        <p className="font-bold" style={{ color: BRAND.text }}>
                          {row.name}
                        </p>
                        <p className="mt-0.5 text-sm" style={{ color: BRAND.muted }}>
                          {row.address || row.email}
                        </p>
                      </td>
                      <td className="px-5 py-4 sm:px-6">
                        <p className="font-bold" style={{ color: BRAND.text }}>
                          {row.activeReferrals} Active
                        </p>
                        <p className="mt-0.5 text-sm" style={{ color: BRAND.muted }}>
                          {row.totalReferrals} total referrals
                        </p>
                      </td>
                      <td className="px-5 py-4 sm:px-6">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPartner(row);
                              setSnfModalStep("kit");
                              setSnfModalOpen(true);
                            }}
                            className="inline-flex items-center rounded-lg px-2.5 py-1.5 text-xs font-bold"
                            style={{
                              backgroundColor: "#F1F5F9",
                              color: "#475569",
                            }}
                          >
                            {row.referralCode}
                          </button>
                          <button
                            type="button"
                            onClick={() => copyReferralCode(row.referralCode)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            aria-label={`Copy ${row.referralCode}`}
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full min-w-[560px]">
                <thead>
                  <tr
                    className="border-b"
                    style={{
                      borderColor: BRAND.border,
                      backgroundColor: "#F8FAFC",
                    }}
                  >
                    {["Patient", "Source", "Status"].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] sm:px-6"
                        style={{ color: BRAND.softMuted }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {referrals.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-10 text-center text-sm text-slate-400">
                        No referrals have been checked in yet.
                      </td>
                    </tr>
                  ) : referrals.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b last:border-b-0"
                      style={{ borderColor: BRAND.border }}
                    >
                      <td className="px-5 py-4 sm:px-6">
                        <p className="font-bold" style={{ color: BRAND.text }}>
                          {row.referralCode}
                        </p>
                        <p className="mt-0.5 text-sm" style={{ color: BRAND.muted }}>
                          {new Date(row.checkedInAt).toLocaleString()}
                        </p>
                      </td>
                      <td
                        className="px-5 py-4 text-sm font-medium sm:px-6"
                        style={{ color: "#334155" }}
                      >
                        {row.source}
                      </td>
                      <td className="px-5 py-4 sm:px-6">
                        <span
                          className="inline-flex rounded-full px-3 py-1 text-[11px] font-bold"
                          style={
                            {
                              backgroundColor: BRAND.greenBadgeBg,
                              color: BRAND.greenBadgeText,
                            }
                          }
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <DashboardFooter />

      {/* SNF flow: single Dialog (onboard → kit) — avoids Radix open/close race */}
      <Dialog
        open={snfModalOpen}
        onOpenChange={(open) => {
          if (!open) closeSnfModal();
          else setSnfModalOpen(true);
        }}
      >
        <DialogContent
          hideClose
          className={
            snfModalStep === "kit"
              ? "w-[calc(100%-2rem)] max-w-[720px] gap-0 overflow-hidden border-0 bg-white p-0"
              : "w-[calc(100%-2rem)] max-w-[720px] gap-0 overflow-hidden border-0 bg-white p-0"
          }
          style={{
            borderRadius: snfModalStep === "kit" ? 36 : 40,
            boxShadow: "0 24px 64px rgba(15, 23, 42, 0.28)",
          }}
        >
          <button
            type="button"
            onClick={closeSnfModal}
            className="absolute right-6 top-6 z-30 flex h-9 w-9 items-center justify-center rounded-full text-[#94A3B8] transition-colors hover:bg-slate-100 hover:text-[#64748B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00B8DB]/40"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>

          {snfModalStep === "onboard" ? (
            <>
              <DialogHeader className="px-7 pt-7 pb-1 pr-14 sm:px-8 sm:pt-8">
                <DialogTitle
                  className="text-left text-[22px] font-bold tracking-tight"
                  style={{ color: "#0F172A", fontFamily: "Rethink Sans, sans-serif" }}
                >
                  Onboard New SNF
                </DialogTitle>
              </DialogHeader>
              <form
                onSubmit={handleOnboardSubmit}
                className="flex min-w-0 flex-col overflow-y-auto px-7 pb-7 pt-5 sm:px-8 sm:pb-8"
                style={{ fontFamily: "Rethink Sans, sans-serif", maxHeight: "80vh" }}
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                        Facility Name
                      </label>
                      <Input
                        required
                        value={onboardForm.name}
                        onChange={(e) =>
                          setOnboardForm((p) => ({ ...p, name: e.target.value }))
                        }
                        placeholder="Evergreen Health Center"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                        Email
                      </label>
                      <Input
                        type="email"
                        required
                        value={onboardForm.email}
                        onChange={(e) =>
                          setOnboardForm((p) => ({ ...p, email: e.target.value }))
                        }
                        placeholder="intake@evergreenhealth.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                        Phone
                      </label>
                      <Input
                        type="tel"
                        inputMode="tel"
                        required
                        value={onboardForm.phone}
                        onChange={(e) =>
                          setOnboardForm((p) => ({
                            ...p,
                            phone: formatPhoneInput(e.target.value),
                          }))
                        }
                        placeholder="(206) 555-0123"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                        Monthly Pricing
                      </label>
                      <Input
                        value={onboardForm.pricing}
                        onChange={(e) =>
                          setOnboardForm((p) => ({
                            ...p,
                            pricing: formatPricingInput(e.target.value),
                          }))
                        }
                        placeholder="$4,500 or $4,500-$6,800"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                      Website
                    </label>
                    <Input
                      type="url"
                      value={onboardForm.website}
                      onChange={(e) =>
                        setOnboardForm((p) => ({ ...p, website: e.target.value }))
                      }
                      placeholder="https://www.yourfacility.com"
                    />
                    <p className="text-xs text-slate-500">
                      Optional. Shown when families click Contact on Care Explorer.
                    </p>
                  </div>

                  <FacilityAddressZipFields
                    enabled={snfModalOpen && snfModalStep === "onboard"}
                    address={onboardForm.address}
                    zipCode={onboardForm.zip_code}
                    onAddressChange={(e) =>
                      setOnboardForm((p) => ({ ...p, address: e.target.value }))
                    }
                    onZipCodeChange={(zip) =>
                      setOnboardForm((p) => ({ ...p, zip_code: zip }))
                    }
                  />

                  <div className="space-y-3">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                      Facility images (max 8 total) — change / upload here
                    </label>
                    {selectedImages.length >= 8 ? (
                      <p className="rounded-2xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-center text-xs font-medium text-amber-950">
                        Image limit reached (8 total). Remove an image to add more.
                      </p>
                    ) : (
                      <div
                        className="relative overflow-hidden rounded-2xl border-2 border-dashed border-slate-200/90 bg-gradient-to-br from-slate-50/80 via-white to-cyan-50/40"
                        onDragOver={handleFacilityImageDragOver}
                        onDrop={handleFacilityImageDrop}
                      >
                        <input
                          id="snf-images-input"
                          type="file"
                          accept="image/*"
                          multiple
                          className="sr-only"
                          onChange={handleImageSelect}
                        />
                        <label
                          htmlFor="snf-images-input"
                          className="relative flex cursor-pointer flex-col items-center gap-2 px-4 py-8"
                        >
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00B8DB] to-cyan-600 text-white shadow-lg">
                            <ImagePlus className="h-7 w-7" strokeWidth={1.75} />
                          </div>
                          <span className="text-sm font-semibold text-slate-800">
                            Drop images here or click to browse
                          </span>
                          <span className="text-center text-xs text-slate-500">
                            JPG, PNG, WebP — {8 - selectedImages.length} of 8 upload slots left
                          </span>
                        </label>
                      </div>
                    )}
                    {selectedImages.length > 0 && (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {selectedImages.map((file, index) => (
                          <div
                            key={`${file.name}-${index}`}
                            className="group relative overflow-hidden rounded-2xl border border-cyan-100/80 bg-white shadow-md"
                          >
                            <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
                              <img
                                src={selectedImagePreviewUrls[index]}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-slate-800 shadow-lg"
                                aria-label={`Remove ${file.name}`}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            <p className="truncate px-2 py-1.5 text-center text-[10px] font-medium text-slate-600">
                              {file.name}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {[
                    { field: "services", label: "Services", color: "text-cyan-900" },
                    { field: "amenities", label: "Amenities", color: "text-violet-900" },
                    { field: "careLevels", label: "Care Levels", color: "text-emerald-900" },
                  ].map((tag) => (
                    <div key={tag.field} className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                        {tag.label}
                      </label>
                      <Input
                        value={tagDrafts[tag.field]}
                        onChange={(e) =>
                          setTagDrafts((prev) => ({
                            ...prev,
                            [tag.field]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => handleTagInputKeyDown(tag.field, e)}
                        onBlur={() => handleTagInputBlur(tag.field)}
                        placeholder={`Type ${tag.label.slice(0, -1).toLowerCase()} and press Enter or comma`}
                      />
                      <div className="flex flex-wrap gap-2 pt-1">
                        {onboardForm[tag.field].map((item, index) => (
                          <span
                            key={`${item}-${index}`}
                            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${tag.color}`}
                          >
                            {item}
                            <button
                              type="button"
                              onClick={() => removeTag(tag.field, index)}
                              className="rounded-full p-0.5"
                              aria-label={`Remove ${item}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                        Units
                      </label>
                      <Input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        value={onboardForm.units}
                        onChange={(e) =>
                          setOnboardForm((p) => ({ ...p, units: e.target.value }))
                        }
                        placeholder="100"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                        Occupancy
                      </label>
                      <Input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        value={onboardForm.occupancy}
                        onChange={(e) =>
                          setOnboardForm((p) => ({ ...p, occupancy: e.target.value }))
                        }
                        placeholder="85"
                      />
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="mt-6 h-12 w-full text-[15px] font-bold text-white"
                  style={{
                    borderRadius: 14,
                    backgroundColor: BRAND.cyan,
                    boxShadow:
                      "0 0 6px -2px #CEFAFE, 0 8px 20px 0 rgba(0, 184, 219, 0.45)",
                  }}
                >
                  {saving ? "Creating partner…" : "Generate Partnership & QR Kit"}
                </button>
              </form>
            </>
          ) : (
            <div className="relative overflow-hidden">
              <DialogTitle className="sr-only">{selectedPartner?.name || "SNF partner"}</DialogTitle>
              <div style={{ fontFamily: "Rethink Sans, sans-serif" }}>
                <div className="flex min-w-0 flex-col px-6 pb-7 pt-7 sm:px-8 sm:pb-8 sm:pt-8">
                  <div className="flex min-w-0 items-start gap-3 pr-10 sm:gap-4">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center sm:h-14 sm:w-14"
                      style={{
                        backgroundColor: "#ECFEFF",
                        borderRadius: 16,
                      }}
                    >
                      <img
                        src="/assets/images/everGreenHealthCareIcon.svg"
                        alt=""
                        className="h-8 w-8 object-contain sm:h-9 sm:w-9"
                        style={{ background: "transparent" }}
                      />
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <h2
                        className="text-xl font-bold tracking-tight sm:text-[22px]"
                        style={{ color: "#0F172A" }}
                      >
                        {selectedPartner?.name || "SNF partner"}
                      </h2>
                      <p
                        className="mt-1 flex items-center gap-1.5 text-sm"
                        style={{ color: "#64748B" }}
                      >
                        <MapPin className="h-3 w-3 shrink-0" style={{ color: "#94A3B8" }} />
                        {selectedPartner?.address || "Skilled Nursing Partner"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                    {[
                      { value: String(selectedPartner?.totalReferrals ?? 0), label: "Total Referrals", color: "#0F172A" },
                      { value: String(selectedPartner?.activeReferrals ?? 0), label: "Currently Active", color: "#00B8DB" },
                      { value: "—", label: "Intake Success", color: "#166534" },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="flex min-h-[104px] flex-col items-center justify-center rounded-2xl border bg-white px-3 py-5 text-center"
                        style={{
                          borderColor: "#E2E8F0",
                          borderRadius: 16,
                        }}
                      >
                        <p
                          className="text-[28px] font-bold leading-none tracking-tight"
                          style={{ color: stat.color }}
                        >
                          {stat.value}
                        </p>
                        <p
                          className="mt-2.5 text-[11px] font-bold uppercase tracking-[0.1em]"
                          style={{ color: "#90A1B9" }}
                        >
                          {stat.label}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6">
                    <h3 className="text-base font-bold" style={{ color: "#0F172A" }}>
                      Partner Contact & Legal
                    </h3>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                      <div
                        className="flex flex-col gap-2 rounded-2xl border bg-white p-4"
                        style={{ borderColor: "#E2E8F0" }}
                      >
                        <p
                          className="text-[11px] font-bold uppercase tracking-[0.08em]"
                          style={{ color: "#90A1B9" }}
                        >
                          Direct Line
                        </p>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 shrink-0" style={{ color: BRAND.cyan }} />
                          <p className="text-sm font-bold" style={{ color: "#0F172A" }}>
                            {selectedPartner?.phone || "—"}
                          </p>
                        </div>
                      </div>
                      <div
                        className="flex flex-col gap-2 rounded-2xl border bg-white p-4"
                        style={{ borderColor: "#E2E8F0" }}
                      >
                        <p
                          className="text-[11px] font-bold uppercase tracking-[0.08em]"
                          style={{ color: "#90A1B9" }}
                        >
                          Email Contact
                        </p>
                        <div className="flex min-w-0 items-center gap-2">
                          <Mail className="h-3.5 w-3.5 shrink-0" style={{ color: BRAND.cyan }} />
                          <p className="truncate text-sm font-bold" style={{ color: "#0F172A" }}>
                            {selectedPartner?.email || "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h3 className="text-base font-bold" style={{ color: "#0F172A" }}>
                      Referral QR Kit
                    </h3>
                    <div
                      className="mt-3 flex min-w-0 flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                      style={{ backgroundColor: "#1A1E2F", borderRadius: 20 }}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white">
                          <img
                            src={selectedPartner?.qrImageUrl}
                            alt="Referral QR Code"
                            className="h-8 w-8 object-contain"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-tight text-white">
                            Active Referral Code
                          </p>
                          <p
                            className="mt-0.5 text-base font-bold leading-tight"
                            style={{ color: "#94A3B8" }}
                          >
                            {selectedPartner?.referralCode || "—"}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOpenKitModalOpen(true)}
                        className="h-11 w-full shrink-0 px-6 text-sm font-bold text-white sm:w-auto"
                        style={{
                          borderRadius: 12,
                          backgroundColor: BRAND.cyan,
                        }}
                      >
                        Open Kit
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      className="h-12 flex-1 text-sm font-bold text-white"
                      style={{
                        borderRadius: 14,
                        backgroundColor: "#1A1E2F",
                      }}
                    >
                      Send New Kit
                    </button>
                    <button
                      type="button"
                      className="h-12 flex-1 border text-sm font-bold"
                      style={{
                        borderRadius: 14,
                        borderColor: "#E2E8F0",
                        color: "#475569",
                        backgroundColor: "#FFFFFF",
                      }}
                    >
                      Edit Partner File
                    </button>
                  </div>
                </div>
              </div>

              {openKitModalOpen && (
                <div
                  className="absolute inset-0 z-20 flex items-center justify-center overflow-hidden px-[15%] py-[6%]"
                  style={{ backgroundColor: "rgba(100, 116, 139, 0.42)" }}
                  onClick={() => setOpenKitModalOpen(false)}
                  role="presentation"
                >
                  <div
                    className="flex w-full max-w-[440px] flex-col overflow-hidden bg-white"
                    style={{
                      borderRadius: 40,
                      boxShadow: "0 24px 56px rgba(15, 23, 42, 0.28)",
                      fontFamily: "Rethink Sans, sans-serif",
                    }}
                    onClick={(e) => e.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Official Partner Referral QR Code"
                  >
                    <div className="flex flex-col items-center px-9 pb-8 pt-9 sm:px-10 sm:pb-9 sm:pt-10">
                      <h2
                        className="w-full text-center text-[20px] font-bold leading-tight tracking-tight sm:text-[22px]"
                        style={{ color: "#0F172A" }}
                      >
                        {selectedPartner?.name || "SNF partner"}
                      </h2>
                      <p
                        className="mt-2 w-full text-center text-sm"
                        style={{ color: "#94A3B8" }}
                      >
                        Official Partner Referral QR Code
                      </p>

                      <div
                        className="mt-7 flex items-center justify-center rounded-[20px] bg-white p-5"
                        style={{
                          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.12)",
                        }}
                      >
                        <img
                        src={selectedPartner?.qrImageUrl}
                          alt="Referral QR Code"
                          className="h-44 w-44 sm:h-48 sm:w-48"
                        />
                      </div>

                      <div className="mt-7 flex w-full flex-col gap-3">
                        <button
                          type="button"
                          onClick={copyReferralLink}
                          className="flex h-12 w-full items-center justify-center gap-2 border text-sm font-bold"
                          style={{
                            borderRadius: 16,
                            borderColor: "#E2E8F0",
                            backgroundColor: "#FFFFFF",
                            color: "#0F172A",
                          }}
                        >
                          <Copy className="h-4 w-4" />
                          Copy Referral Link
                        </button>
                        <button
                          type="button"
                          className="flex h-12 w-full items-center justify-center gap-2 text-sm font-bold text-white"
                          style={{
                            borderRadius: 16,
                            backgroundColor: BRAND.cyan,
                            boxShadow:
                              "0 0 6px -2px #CEFAFE, 0 8px 20px 0 rgba(0, 184, 219, 0.4)",
                          }}
                        >
                          <Download className="h-4 w-4" />
                          Download Print Kit
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
