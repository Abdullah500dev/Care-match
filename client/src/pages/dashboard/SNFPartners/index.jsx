import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { apiClient } from "@/services/api";
import AdminMessageIconButton from "@/components/dashboard/AdminMessageIconButton";
import { messageAdminSnfPartner } from "@/lib/adminMessaging";
import FacilityAddressZipFields from "@/components/dashboard/facilities/FacilityAddressZipFields";
import {
  extractZipFromAddress,
  formatZipInput,
  validateAddressZipPair,
} from "@/lib/facilityAddressGeo";
import { normalizeFacilityWebsite } from "@/lib/facilityWebsite";
import { formatPhoneInput, phoneDigitsOnly } from "@/lib/formatPhone";
import { downloadAuthenticatedImage, downloadImageFile } from "@/lib/qrShare";

/** Brand tokens from SNF Partners reference mock */
const BRAND = {
  cyan: "#00B8DB",
  cyanSoft: "#ECFEFF",
  navy: "#0F172A",
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

function resolveSnfImageUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const base = import.meta.env.VITE_REACT_APP_API_BASE_URL || "";
  return `${String(base).replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

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

export default function SNFPartners() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("partners");
  const [snfModalOpen, setSnfModalOpen] = useState(false);
  const [snfModalStep, setSnfModalStep] = useState("onboard"); // onboard | kit
  const [openKitModalOpen, setOpenKitModalOpen] = useState(false);
  const [partners, setPartners] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [sendingKit, setSendingKit] = useState(false);
  const [partnerReferralsOpen, setPartnerReferralsOpen] = useState(false);
  const [partnerReferralsLoading, setPartnerReferralsLoading] = useState(false);
  const [partnerReferrals, setPartnerReferrals] = useState([]);
  const [editingPartnerId, setEditingPartnerId] = useState(null);
  const [keptImages, setKeptImages] = useState([]);
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

  const downloadPartnerQr = async () => {
    if (!selectedPartner?.qrDownloadPath && !selectedPartner?.qrImageUrl) {
      toast.error("QR image is not available yet");
      return;
    }
    try {
      const filename = `${selectedPartner.referralCode || "snf"}-qr.png`;
      if (selectedPartner.qrDownloadPath) {
        await downloadAuthenticatedImage(selectedPartner.qrDownloadPath, filename);
      } else if (selectedPartner.referralCode) {
        await downloadAuthenticatedImage(
          `/api/snf-partners/qr-image/${encodeURIComponent(selectedPartner.referralCode)}`,
          filename,
        );
      } else {
        await downloadImageFile(selectedPartner.qrImageUrl, filename);
      }
      toast.success("QR image downloaded");
    } catch (error) {
      toast.error("Could not download QR image", {
        description: error?.message || error?.response?.data?.message || "Please try again.",
      });
    }
  };

  const sendNewKit = async () => {
    if (!selectedPartner?.id) return;
    setSendingKit(true);
    try {
      const { data } = await apiClient.post(
        `/api/snf-partners/${encodeURIComponent(selectedPartner.id)}/resend-kit`,
      );
      toast.success(data?.message || "Partner kit emailed");
    } catch (error) {
      toast.error("Could not send new kit", {
        description: error?.response?.data?.message || "Please try again.",
      });
    } finally {
      setSendingKit(false);
    }
  };

  const openPartnerReferrals = async () => {
    if (!selectedPartner?.id) return;
    setPartnerReferralsOpen(true);
    setPartnerReferralsLoading(true);
    setPartnerReferrals(
      referrals.filter((row) => String(row.partnerId) === String(selectedPartner.id)),
    );
    try {
      const { data } = await apiClient.get(
        `/api/snf-partners/${encodeURIComponent(selectedPartner.id)}/referrals`,
      );
      setPartnerReferrals(Array.isArray(data?.referrals) ? data.referrals : []);
    } catch (error) {
      toast.error("Could not load referrals", {
        description: error?.response?.data?.message || "Please try again.",
      });
    } finally {
      setPartnerReferralsLoading(false);
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
    const isEditing = Boolean(editingPartnerId);
    const partnerId = editingPartnerId;
    try {
      const payload = new FormData();
      payload.append("name", onboardForm.name);
      if (!isEditing) {
        payload.append("email", onboardForm.email);
      }
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
      if (isEditing) {
        payload.append("keep_image_paths", JSON.stringify(keptImages));
      }

      const { data } = isEditing
        ? await apiClient.put(`/api/snf-partners/${partnerId}`, payload, {
            headers: { "Content-Type": "multipart/form-data" },
          })
        : await apiClient.post("/api/snf-partners", payload, {
            headers: { "Content-Type": "multipart/form-data" },
          });

      setSelectedPartner(data.partner);
      setOpenKitModalOpen(false);
      setSnfModalStep("kit");
      setEditingPartnerId(null);
      setKeptImages([]);
      if (isEditing) {
        setPartners((current) =>
          current.map((row) =>
            String(row.id) === String(data.partner?.id) ? data.partner : row,
          ),
        );
        toast.success("SNF partner updated.");
      } else {
        setPartners((current) => [data.partner, ...current]);
        toast.success("SNF partner created. A sign-in invite was sent by email.");
      }
      setOnboardForm(EMPTY_ONBOARD);
      setTagDrafts({ services: "", amenities: "", careLevels: "" });
      setSelectedImages([]);
    } catch (error) {
      toast.error(isEditing ? "Could not update SNF partner" : "Could not create SNF partner", {
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
    setSelectedImages((prev) => {
      const room = Math.max(0, 8 - keptImages.length - prev.length);
      return [...prev, ...files].slice(0, prev.length + room);
    });
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
    setSelectedImages((prev) => {
      const room = Math.max(0, 8 - keptImages.length - prev.length);
      return [...prev, ...files].slice(0, prev.length + room);
    });
  };

  const removeImage = (index) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeKeptImage = (index) => {
    setKeptImages((prev) => prev.filter((_, i) => i !== index));
  };

  const openPartnerModal = (row) => {
    setSelectedPartner(row);
    setEditingPartnerId(null);
    setOpenKitModalOpen(false);
    setSnfModalStep("kit");
    setSnfModalOpen(true);
  };

  const openEditPartner = () => {
    if (!selectedPartner) return;
    setEditingPartnerId(selectedPartner.id);
    setOnboardForm({
      name: selectedPartner.name || "",
      email: selectedPartner.email || "",
      phone: formatPhoneInput(selectedPartner.phone || ""),
      website: selectedPartner.website || "",
      address: selectedPartner.address || "",
      zip_code: selectedPartner.zip_code || "",
      pricing: selectedPartner.pricing || "",
      services: Array.isArray(selectedPartner.services) ? selectedPartner.services : [],
      amenities: Array.isArray(selectedPartner.amenities) ? selectedPartner.amenities : [],
      careLevels: Array.isArray(selectedPartner.care_levels) && selectedPartner.care_levels.length
        ? selectedPartner.care_levels
        : ["Skilled Nursing"],
      units: selectedPartner.units != null ? String(selectedPartner.units) : "",
      occupancy: selectedPartner.occupancy != null ? String(selectedPartner.occupancy) : "",
    });
    setKeptImages(Array.isArray(selectedPartner.images) ? [...selectedPartner.images] : []);
    setSelectedImages([]);
    setTagDrafts({ services: "", amenities: "", careLevels: "" });
    setOpenKitModalOpen(false);
    setSnfModalStep("onboard");
  };

  const openOnboardModal = () => {
    setEditingPartnerId(null);
    setSelectedPartner(null);
    setKeptImages([]);
    setSelectedImages([]);
    setOnboardForm(EMPTY_ONBOARD);
    setTagDrafts({ services: "", amenities: "", careLevels: "" });
    setSnfModalStep("onboard");
    setOpenKitModalOpen(false);
    setSnfModalOpen(true);
  };

  const closeSnfModal = () => {
    setSnfModalOpen(false);
    setOpenKitModalOpen(false);
    setSnfModalStep("onboard");
    setEditingPartnerId(null);
    setKeptImages([]);
    setOnboardForm(EMPTY_ONBOARD);
    setTagDrafts({ services: "", amenities: "", careLevels: "" });
    setSelectedImages([]);
  };

  const handleDeletePartner = async () => {
    const partnerId = editingPartnerId || selectedPartner?.id;
    if (!partnerId) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/api/snf-partners/${partnerId}`);
      setPartners((current) =>
        current.filter((row) => String(row.id) !== String(partnerId)),
      );
      setReferrals((current) =>
        current.filter(
          (row) =>
            String(row.source || "").toLowerCase() !==
            String(selectedPartner?.name || "").toLowerCase(),
        ),
      );
      setDeleteDialogOpen(false);
      closeSnfModal();
      setSelectedPartner(null);
      toast.success("SNF partner deleted.");
      loadDashboard();
    } catch (error) {
      toast.error("Could not delete SNF partner", {
        description: error?.response?.data?.message || "Please try again.",
      });
    } finally {
      setDeleting(false);
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

        {/* Partner Facilities / Recent Referrals */}
        <div
          className="min-w-0 overflow-hidden rounded-2xl border bg-white shadow-sm"
          style={{ borderColor: BRAND.border }}
        >
          <div className="border-b px-5 pt-4 sm:px-6" style={{ borderColor: BRAND.border }}>
            <div className="flex flex-wrap gap-6">
              {[
                { id: "partners", label: "Partner Facilities" },
                { id: "referrals", label: "Recent Visits" },
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
                    {["Facility", "Referrals", "Referral Code", "Message"].map((h) => (
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
                      <td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-400">
                        Loading partners…
                      </td>
                    </tr>
                  ) : partners.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-400">
                        No skilled nursing partners yet.
                      </td>
                    </tr>
                  ) : partners.map((row) => (
                    <tr
                      key={row.id}
                      className="cursor-pointer border-b last:border-b-0 transition-colors hover:bg-slate-50/80"
                      style={{ borderColor: BRAND.border }}
                      onClick={() => openPartnerModal(row)}
                    >
                      <td className="px-5 py-4 sm:px-6">
                        <div className="flex min-w-0 items-center gap-3">
                          {row.images?.[0] ? (
                            <img
                              src={resolveSnfImageUrl(row.images[0])}
                              alt=""
                              className="h-12 w-12 shrink-0 rounded-xl object-cover"
                            />
                          ) : (
                            <div
                              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                              style={{ backgroundColor: BRAND.cyanSoft }}
                            >
                              <img
                                src="/assets/images/everGreenHealthCareIcon.svg"
                                alt=""
                                className="h-7 w-7 object-contain"
                              />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold" style={{ color: BRAND.text }}>
                              {row.name}
                            </p>
                            <p className="mt-0.5 truncate text-sm" style={{ color: BRAND.muted }}>
                              {row.address || row.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 sm:px-6">
                        <p className="font-bold" style={{ color: BRAND.text }}>
                          {row.totalReferrals}{" "}
                          {row.totalReferrals === 1 ? "referral" : "referrals"}
                        </p>
                      </td>
                      <td className="px-5 py-4 sm:px-6">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex items-center rounded-lg px-2.5 py-1.5 text-xs font-bold"
                            style={{
                              backgroundColor: "#F1F5F9",
                              color: "#475569",
                            }}
                          >
                            {row.referralCode}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyReferralCode(row.referralCode);
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            aria-label={`Copy ${row.referralCode}`}
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-4 sm:px-6">
                        <AdminMessageIconButton
                          label="Message SNF partner"
                          onClick={() => messageAdminSnfPartner(navigate, row)}
                          disabled={!row.facilityUserId}
                        />
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
                    {["Visitor", "Facility", "Status"].map((h) => (
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
                        No visitor check-ins yet.
                      </td>
                    </tr>
                  ) : referrals.map((row) => (
                    <tr
                      key={row.id}
                      className="cursor-pointer border-b last:border-b-0 transition-colors hover:bg-slate-50/80"
                      style={{ borderColor: BRAND.border }}
                      onClick={() => setSelectedReferral(row)}
                    >
                      <td className="px-5 py-4 sm:px-6">
                        <p className="font-bold" style={{ color: BRAND.text }}>
                          {row.visitorName || row.visitorEmail || row.referralCode}
                        </p>
                        <p className="mt-0.5 text-sm" style={{ color: BRAND.muted }}>
                          {row.visitorEmail && row.visitorName
                            ? row.visitorEmail
                            : row.checkedInAt
                              ? new Date(row.checkedInAt).toLocaleString()
                              : "—"}
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
                          style={{
                            backgroundColor: BRAND.greenBadgeBg,
                            color: BRAND.greenBadgeText,
                          }}
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
            onClick={() => {
              if (editingPartnerId && selectedPartner) {
                setEditingPartnerId(null);
                setKeptImages([]);
                setSelectedImages([]);
                setOnboardForm(EMPTY_ONBOARD);
                setSnfModalStep("kit");
                return;
              }
              closeSnfModal();
            }}
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
                  {editingPartnerId ? "Edit SNF Partner" : "Onboard New SNF"}
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
                        disabled={Boolean(editingPartnerId)}
                        onChange={(e) =>
                          setOnboardForm((p) => ({ ...p, email: e.target.value }))
                        }
                        placeholder="intake@evergreenhealth.com"
                      />
                      {editingPartnerId ? (
                        <p className="text-[11px] text-slate-400">
                          Login email cannot be changed here.
                        </p>
                      ) : null}
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
                        autoComplete="tel"
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
                    {keptImages.length + selectedImages.length >= 8 ? (
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
                            JPG, PNG, WebP —{" "}
                            {8 - keptImages.length - selectedImages.length} of 8 upload slots left
                          </span>
                        </label>
                      </div>
                    )}
                    {(keptImages.length > 0 || selectedImages.length > 0) && (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {keptImages.map((path, index) => (
                          <div
                            key={`kept-${path}-${index}`}
                            className="group relative overflow-hidden rounded-2xl border border-cyan-100/80 bg-white shadow-md"
                          >
                            <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
                              <img
                                src={resolveSnfImageUrl(path)}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => removeKeptImage(index)}
                                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-slate-800 shadow-lg"
                                aria-label="Remove image"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            <p className="truncate px-2 py-1.5 text-center text-[10px] font-medium text-slate-600">
                              Current photo
                            </p>
                          </div>
                        ))}
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
                <div
                  className={`mt-6 flex flex-col gap-3 sm:flex-row sm:items-center ${
                    editingPartnerId ? "sm:justify-between" : ""
                  }`}
                >
                  {editingPartnerId ? (
                    <button
                      type="button"
                      disabled={saving || deleting}
                      onClick={() => setDeleteDialogOpen(true)}
                      className="inline-flex h-11 items-center justify-center gap-2 border px-5 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                      style={{
                        borderRadius: 14,
                        borderColor: "#FECACA",
                        backgroundColor: "#FFFFFF",
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  ) : null}
                  <button
                    type="submit"
                    disabled={saving || deleting}
                    className={`h-11 text-[15px] font-bold text-white disabled:opacity-60 ${
                      editingPartnerId ? "w-full sm:ml-auto sm:w-auto sm:min-w-[180px] px-6" : "w-full"
                    }`}
                    style={{
                      borderRadius: 14,
                      backgroundColor: BRAND.cyan,
                      boxShadow:
                        "0 0 6px -2px #CEFAFE, 0 8px 20px 0 rgba(0, 184, 219, 0.45)",
                    }}
                  >
                    {saving
                      ? editingPartnerId
                        ? "Saving changes…"
                        : "Creating partner…"
                      : editingPartnerId
                        ? "Save SNF Partner"
                        : "Generate Partnership & QR Kit"}
                  </button>
                </div>
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
                    {selectedPartner?.images?.[0] ? (
                      <img
                        src={resolveSnfImageUrl(selectedPartner.images[0])}
                        alt=""
                        className="h-12 w-12 rounded-2xl object-cover sm:h-14 sm:w-14"
                      />
                    ) : (
                      <img
                        src="/assets/images/everGreenHealthCareIcon.svg"
                        alt=""
                        className="h-8 w-8 object-contain sm:h-9 sm:w-9"
                        style={{ background: "transparent" }}
                      />
                    )}
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

                  <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                    <button
                      type="button"
                      onClick={openPartnerReferrals}
                      className="flex min-h-[104px] flex-col items-center justify-center rounded-2xl border bg-white px-3 py-5 text-center transition hover:border-[#00B8DB]/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B8DB]/40"
                      style={{
                        borderColor: "#E2E8F0",
                        borderRadius: 16,
                      }}
                    >
                      <p
                        className="text-[28px] font-bold leading-none tracking-tight"
                        style={{ color: "#0F172A" }}
                      >
                        {String(selectedPartner?.totalReferrals ?? 0)}
                      </p>
                      <p
                        className="mt-2.5 text-[11px] font-bold uppercase tracking-[0.1em]"
                        style={{ color: "#90A1B9" }}
                      >
                        Total Referrals
                      </p>
                      <p className="mt-1 text-[10px] font-medium" style={{ color: BRAND.cyan }}>
                        View list
                      </p>
                    </button>
                    <div
                      className="flex min-h-[104px] flex-col items-center justify-center rounded-2xl border bg-white px-3 py-5 text-center"
                      style={{
                        borderColor: "#E2E8F0",
                        borderRadius: 16,
                      }}
                    >
                      <p
                        className="text-[28px] font-bold leading-none tracking-tight"
                        style={{ color: "#00B8DB" }}
                      >
                        {selectedPartner?.referralCode || "—"}
                      </p>
                      <p
                        className="mt-2.5 text-[11px] font-bold uppercase tracking-[0.1em]"
                        style={{ color: "#90A1B9" }}
                      >
                        Referral Code
                      </p>
                    </div>
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
                            {formatPhoneInput(selectedPartner?.phone) || "—"}
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
                      onClick={sendNewKit}
                      disabled={sendingKit}
                      className="h-12 flex-1 text-sm font-bold text-white disabled:opacity-60"
                      style={{
                        borderRadius: 14,
                        backgroundColor: "#1A1E2F",
                      }}
                    >
                      {sendingKit ? "Sending…" : "Send New Kit"}
                    </button>
                    <button
                      type="button"
                      onClick={openEditPartner}
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
                          onClick={downloadPartnerQr}
                          className="flex h-12 w-full items-center justify-center gap-2 text-sm font-bold text-white"
                          style={{
                            borderRadius: 16,
                            backgroundColor: BRAND.cyan,
                            boxShadow:
                              "0 0 6px -2px #CEFAFE, 0 8px 20px 0 rgba(0, 184, 219, 0.4)",
                          }}
                        >
                          <Download className="h-4 w-4" />
                          Download QR Image
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this SNF partner?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes{" "}
              <span className="font-semibold text-slate-700">
                {selectedPartner?.name || "this partner"}
              </span>
              , their referral history, and their partner login account. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                handleDeletePartner();
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleting ? "Deleting…" : "Delete partner"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={Boolean(selectedReferral)}
        onOpenChange={(open) => {
          if (!open) setSelectedReferral(null);
        }}
      >
        <DialogContent className="max-w-md rounded-2xl border-[#E2E8F0]">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-xl text-slate-900">
              {selectedReferral?.visitorName ||
                selectedReferral?.visitorEmail ||
                "Visitor details"}
            </DialogTitle>
            <DialogDescription>
              Family visitor checked in at {selectedReferral?.source || "an SNF partner"}.
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
                  Facility
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {selectedReferral?.source || "—"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Checked in
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {selectedReferral?.checkedInAt
                    ? new Date(selectedReferral.checkedInAt).toLocaleString()
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

      <Dialog
        open={partnerReferralsOpen}
        onOpenChange={(open) => {
          if (!open) {
            setPartnerReferralsOpen(false);
            setPartnerReferrals([]);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto rounded-2xl border-[#E2E8F0]">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-xl text-slate-900">
              Referrals — {selectedPartner?.name || "SNF partner"}
            </DialogTitle>
            <DialogDescription>
              Family visitors who scanned or checked in with this partner&apos;s referral code.
            </DialogDescription>
          </DialogHeader>
          {partnerReferralsLoading ? (
            <p className="py-8 text-center text-sm text-slate-400">Loading referrals…</p>
          ) : partnerReferrals.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              No referrals yet for this partner.
            </p>
          ) : (
            <div className="space-y-2">
              {partnerReferrals.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setSelectedReferral(row)}
                  className="flex w-full flex-col rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-left transition hover:border-[#00B8DB]/40 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {row.visitorName || row.visitorEmail || row.referralCode || "Visitor"}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {row.visitorEmail && row.visitorName
                          ? row.visitorEmail
                          : row.visitorPhone || "—"}
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold"
                      style={{
                        backgroundColor: BRAND.greenBadgeBg,
                        color: BRAND.greenBadgeText,
                      }}
                    >
                      {row.status || "Checked In"}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">
                    {row.checkedInAt ? new Date(row.checkedInAt).toLocaleString() : "—"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
