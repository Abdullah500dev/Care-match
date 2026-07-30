import React, { useCallback, useEffect, useMemo, useState } from "react";
import SEO from "@/components/common/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
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
import {
  ImagePlus,
  MapPin,
  Plus,
  Star,
  X,
  Phone,
  Mail,
  Globe,
  Hash,
  Search,
  Eye,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/services/api";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import FacilityAddressZipFields from "@/components/dashboard/facilities/FacilityAddressZipFields";
import {
  formatZipInput,
  validateAddressZipPair,
} from "@/lib/facilityAddressGeo";
import { normalizeFacilityWebsite } from "@/lib/facilityWebsite";

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=220&fit=crop";

function resolveSingleImageUrl(path) {
  if (!path) return PLACEHOLDER_IMAGE;
  if (path.startsWith("http")) return path;
  const base = import.meta.env.VITE_REACT_APP_API_BASE_URL || "";
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

function getFacilityImageUrls(images) {
  if (!Array.isArray(images) || images.length === 0) {
    return [PLACEHOLDER_IMAGE];
  }
  return images.map((p) => resolveSingleImageUrl(p));
}

/** Formats phone as you type: US (XXX) XXX-XXXX; +1 (…) when 11 digits start with 1; +intl when leading + or longer numbers. */
function formatPhoneInput(value) {
  const raw = String(value || "");
  const hasPlus = raw.trim().startsWith("+");
  const digits = raw.replace(/\D/g, "").slice(0, 15);
  if (!digits) return hasPlus ? "+" : "";

  // NANP 11 digits without leading + (e.g. pasted 12065550123)
  if (digits.length === 11 && digits[0] === "1" && !hasPlus) {
    const d = digits.slice(1);
    return `+1 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }

  if (hasPlus || digits.length > 10) {
    return "+" + digits.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
  }

  const d = digits.slice(0, 10);
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/**
 * Pricing: formats as $4,500 or $4,500 - $6,800. Digits only (plus optional range).
 * Optional suffix /month. Preserves "min - " while typing the second amount.
 */
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
    // Compact range style: $4,500-$6,800 (no spaces around dash)
    out = rightDigits ? `${fmt(leftDigits)}-${fmt(rightDigits)}` : `${fmt(leftDigits)}-`;
  }
  const suffix = monthly ? "/month" : "";
  if (!out && !suffix) return "";
  return out + suffix;
}

function getFacilityZipCode(facility) {
  if (!facility || typeof facility !== "object") return "";
  const direct = formatZipInput(facility.zip_code);
  if (direct) return direct;
  return formatZipInput(facility.external_data?.zip_code);
}

function getFacilityPricingValue(facility) {
  if (!facility || typeof facility !== "object") return "";
  const direct = String(facility.pricing || "").trim();
  if (direct) return direct;
  const nested = String(facility.external_data?.pricing || "").trim();
  if (nested) return nested;
  const fines = Number(facility.external_data?.total_fines_amount);
  if (Number.isFinite(fines) && fines > 0) {
    return `$${fines.toLocaleString("en-US")}/mo`;
  }
  return "";
}

function FacilityImageSlider({ images, name }) {
  const urls = getFacilityImageUrls(images);
  const [api, setApi] = useState(null);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => api.off("select", onSelect);
  }, [api]);

  return (
    <Carousel
      className="w-full overflow-hidden rounded-t-[28px]"
      setApi={setApi}
      opts={{ align: "start", loop: urls.length > 1 }}
    >
      <CarouselContent className="-ml-0">
        {urls.map((src, index) => (
          <CarouselItem key={`${src}-${index}`} className="basis-full pl-0">
            <div className="relative aspect-[400/220] w-full overflow-hidden bg-slate-200">
              <img
                src={src}
                alt={`${name} — image ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      {urls.length > 1 && (
        <div
          className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1.5"
          role="tablist"
          aria-label="Slide indicators"
        >
          {urls.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === current}
              className={`h-1.5 rounded-full transition-all ${
                i === current ? "w-6 bg-white" : "w-1.5 bg-white/50"
              }`}
              onClick={() => api?.scrollTo(i)}
            />
          ))}
        </div>
      )}
    </Carousel>
  );
}

export default function Communities() {
  const PAGE_SIZE = 6;
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [keptImagePaths, setKeptImagePaths] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    zip_code: "",
    services: [],
    amenities: [],
    careLevels: [],
    pricing: "",
    units: 0,
    occupancy: 0,
    active_leads: 0,
  });
  const [tagDrafts, setTagDrafts] = useState({
    services: "",
    amenities: "",
    careLevels: "",
  });
  const [facilities, setFacilities] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [facilitySearch, setFacilitySearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsFacility, setAnalyticsFacility] = useState(null);
  const [facilityAnalytics, setFacilityAnalytics] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(facilitySearch.trim()), 300);
    return () => clearTimeout(t);
  }, [facilitySearch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const selectedImagePreviewUrls = useMemo(
    () => selectedImages.map((file) => URL.createObjectURL(file)),
    [selectedImages]
  );

  useEffect(() => {
    return () => {
      selectedImagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [selectedImagePreviewUrls]);

  const facilitySlotsMax = Math.max(0, 8 - keptImagePaths.length);
  const facilitySlotsLeft = Math.max(0, facilitySlotsMax - selectedImages.length);

  const fetchFacilities = useCallback(async () => {
    setListLoading(true);
    setListError("");
    try {
      const { data } = await apiClient.get("/api/facilities", {
        params: {
          page: currentPage,
          limit: PAGE_SIZE,
          ...(debouncedSearch ? { q: debouncedSearch } : {}),
        },
      });
      const nextFacilities = data?.facilities || [];
      const nextPagination = data?.pagination || {
        page: currentPage,
        limit: PAGE_SIZE,
        total: nextFacilities.length,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      };
      setFacilities(nextFacilities);
      setPagination(nextPagination);
      if (nextPagination.totalPages > 0 && currentPage > nextPagination.totalPages) {
        setCurrentPage(nextPagination.totalPages);
      }
    } catch (error) {
      setListError(
        error?.response?.data?.message || "Could not load facilities. Sign in as admin and try again."
      );
      setFacilities([]);
      setPagination({
        page: 1,
        limit: PAGE_SIZE,
        total: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      });
    } finally {
      setListLoading(false);
    }
  }, [currentPage, PAGE_SIZE, debouncedSearch]);

  useEffect(() => {
    fetchFacilities();
  }, [fetchFacilities]);

  const openFacilityAnalytics = async (facility) => {
    setAnalyticsFacility(facility);
    setFacilityAnalytics(null);
    setAnalyticsOpen(true);
    setAnalyticsLoading(true);
    try {
      const { data } = await apiClient.get("/api/email/analytics/facility", {
        params: {
          facilityId: facility._id,
          facilityName: facility.name,
        },
      });
      setFacilityAnalytics(data);
    } catch (err) {
      toast.error("Could not load facility analytics", {
        description: err?.response?.data?.message || "Please try again.",
      });
      setFacilityAnalytics(null);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleInput = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  /** Units / occupancy / leads: empty display when 0 so typing doesn’t stick to a leading 0. */
  const handleNonNegativeCountInput = (field) => (e) => {
    const raw = e.target.value;
    if (raw === "") {
      handleInput(field, 0);
      return;
    }
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n)) {
      handleInput(field, Math.max(0, n));
    }
  };

  const countFieldDisplayValue = (n) => (n === 0 ? "" : n);

  const resetForm = () => {
    setEditingId(null);
    setKeptImagePaths([]);
    setForm({
      name: "",
      email: "",
      phone: "",
      website: "",
      address: "",
      zip_code: "",
      services: [],
      amenities: [],
      careLevels: [],
      units: 0,
      occupancy: 0,
      active_leads: 0,
      pricing: "",
    });
    setTagDrafts({
      services: "",
      amenities: "",
      careLevels: "",
    });
    setSelectedImages([]);
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openManageFacility = (facility) => {
    setEditingId(facility._id);
    setForm({
      name: facility.name || "",
      email: facility.email || "",
      phone: facility.phone || "",
      website: facility.website || "",
      address: facility.address || "",
      zip_code: getFacilityZipCode(facility),
      services: Array.isArray(facility.services) ? [...facility.services] : [],
      amenities: Array.isArray(facility.amenities) ? [...facility.amenities] : [],
      careLevels: Array.isArray(facility.care_levels) ? [...facility.care_levels] : [],
      pricing: formatPricingInput(getFacilityPricingValue(facility)),
      units: facility.units || 0,
      occupancy: facility.occupancy || 0,
      active_leads: facility.active_leads || 0,
    });
    setTagDrafts({ services: "", amenities: "", careLevels: "" });
    setKeptImagePaths([...(facility.images || [])]);
    setSelectedImages([]);
    setModalOpen(true);
  };

  const addFacilityImageFiles = useCallback(
    (fileList) => {
      const files = Array.from(fileList || []);
      if (!files.length) return;

      const imageFiles = files.filter((file) => file.type?.startsWith("image/"));
      const rejectedCount = files.length - imageFiles.length;

      if (rejectedCount > 0) {
        toast.error("Only image files are allowed", {
          description: "PDF, folders, and other file types are blocked.",
        });
      }

      if (!imageFiles.length) return;

      const maxFiles = 8 - keptImagePaths.length;
      setSelectedImages((prev) =>
        [...prev, ...imageFiles].slice(0, Math.max(0, maxFiles))
      );
    },
    [keptImagePaths.length]
  );

  const handleImageSelect = (event) => {
    addFacilityImageFiles(event.target.files);
    event.target.value = "";
  };

  const handleFacilityImageDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addFacilityImageFiles(e.dataTransfer?.files);
  };

  const handleFacilityImageDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const removeImage = (indexToRemove) => {
    setSelectedImages((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const addTags = (field, rawValue) => {
    const parsedValues = rawValue
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (!parsedValues.length) return;

    setForm((prev) => {
      const existing = new Set(prev[field].map((v) => v.toLowerCase()));
      const next = [...prev[field]];
      parsedValues.forEach((item) => {
        if (!existing.has(item.toLowerCase())) {
          existing.add(item.toLowerCase());
          next.push(item);
        }
      });
      return { ...prev, [field]: next };
    });
  };

  const removeTag = (field, indexToRemove) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, index) => index !== indexToRemove),
    }));
  };

  const handleTagInputKeyDown = (field, event) => {
    if (event.key !== "Enter" && event.key !== ",") return;
    event.preventDefault();
    const value = tagDrafts[field];
    addTags(field, value);
    setTagDrafts((prev) => ({ ...prev, [field]: "" }));
  };

  const handleTagInputBlur = (field) => {
    const value = tagDrafts[field];
    if (!value.trim()) return;
    addTags(field, value);
    setTagDrafts((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmitFacility = async (e) => {
    e.preventDefault();
    const zipDigits = formatZipInput(form.zip_code);
    if (zipDigits.length !== 5) {
      toast.error("ZIP code required", {
        description: "Enter a valid 5-digit US ZIP code (e.g. 98101).",
      });
      return;
    }

    const geoCheck = await validateAddressZipPair(form.address, zipDigits);
    if (geoCheck.state === "mismatch") {
      toast.error("Address and ZIP do not match", {
        description: geoCheck.message,
      });
      return;
    }

    const normalizedWebsite = normalizeFacilityWebsite(form.website);
    if (String(form.website || "").trim() && !normalizedWebsite) {
      toast.error("Invalid website", {
        description: "Enter a valid URL (e.g. https://www.yourfacility.com or yourfacility.com).",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = new FormData();
      payload.append("name", form.name);
      payload.append("email", form.email);
      payload.append("phone", form.phone);
      payload.append("website", normalizedWebsite);
      payload.append("address", form.address);
      payload.append("zip_code", zipDigits);
      payload.append("pricing", form.pricing);
      form.services.forEach((service) => payload.append("services", service));
      form.amenities.forEach((amenity) => payload.append("amenities", amenity));
      form.careLevels.forEach((careLevel) => payload.append("care_levels", careLevel));
      selectedImages.forEach((file) => payload.append("images", file));
      payload.append("units", form.units);
      payload.append("occupancy", form.occupancy);
      payload.append("active_leads", editingId ? form.active_leads || 0 : 0);

      if (editingId) {
        payload.append("keep_image_paths", JSON.stringify(keptImagePaths));
        await apiClient.put(`/api/facilities/${editingId}`, payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Facility updated", {
          description: "Changes have been saved.",
        });
      } else {
        await apiClient.post("/api/facilities", payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Facility created", {
          description: "Credentials and reset-password link sent to facility email.",
        });
        setCurrentPage(1);
      }

      setModalOpen(false);
      resetForm();
      if (editingId) {
        await fetchFacilities();
      }
    } catch (error) {
      toast.error(editingId ? "Unable to update facility" : "Unable to create facility", {
        description:
          error?.response?.data?.message || "Please check fields and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFacility = async () => {
    if (!editingId) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/api/facilities/${editingId}`);
      toast.success("Facility deleted", {
        description: "The facility and its login have been removed.",
      });
      setDeleteDialogOpen(false);
      setModalOpen(false);
      resetForm();
      await fetchFacilities();
    } catch (error) {
      toast.error("Unable to delete facility", {
        description: error?.response?.data?.message || "Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const removeKeptImage = (path) => {
    setKeptImagePaths((prev) => prev.filter((p) => p !== path));
  };

  const scrollFacilitiesPageToTop = () => {
    const pageTop = document.getElementById("page-top");
    if (pageTop) {
      pageTop.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    document.scrollingElement?.scrollTo({ top: 0, behavior: "smooth" });
    document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
    document.body.scrollTo?.({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div
      className="mx-auto w-full min-w-0 max-w-5xl space-y-6"
      style={{ fontFamily: "Rethink Sans, sans-serif" }}
    >
      <SEO title="Facilities – Admin | CareMatch AI" />
      {/* Header */}
      <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex flex-col">
          <h1
            className="flex items-center text-xl font-bold tracking-tight text-slate-900 sm:text-2xl md:text-3xl lg:h-9"
            style={{ maxWidth: "100%" }}
          >
            Facilities
          </h1>
          <p
            className="mt-1 text-sm text-slate-500 md:text-base lg:h-6"
            style={{ maxWidth: "100%" }}
          >
            Manage your facilities and track performance.
          </p>
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:mt-0 sm:flex-row sm:items-center">
          <div className="relative min-w-0 sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search facilities by name…"
              value={facilitySearch}
              onChange={(e) => setFacilitySearch(e.target.value)}
              className="rounded-xl border-slate-200 bg-white pl-9 pr-8"
            />
            {facilitySearch && (
              <button
                type="button"
                onClick={() => setFacilitySearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                aria-label="Clear facility search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-2 rounded-xl bg-[#00B8DB] px-4 py-2.5 font-semibold text-white hover:bg-[#00B8DB]/90"
          >
            <Plus className="h-4 w-4" />
            New Facility
          </Button>
        </div>
      </div>

      {/* Facility cards grid */}
      {listError && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {listError}
        </p>
      )}
      {listLoading ? (
        <p className="text-center text-sm text-slate-500">Loading facilities…</p>
      ) : facilities.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center text-sm text-slate-500">
          {debouncedSearch
            ? (
              <>
                No facilities match <span className="font-semibold text-slate-700">“{debouncedSearch}”</span>.
              </>
            )
            : (
              <>
                No facilities yet. Click <span className="font-semibold text-slate-700">New Facility</span> to add one.
              </>
            )}
        </p>
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2">
          {facilities.map((facility) => {
              const typeLabel = "Assisted Living";
            return (
              <Card
                key={facility._id}
                className="min-w-0 overflow-hidden rounded-[28px] border-slate-200 bg-white shadow-sm"
              >
                <div className="relative w-full overflow-hidden rounded-t-[28px] bg-slate-200">
                  <FacilityImageSlider images={facility.images} name={facility.name} />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-full px-3 py-1 text-xs font-medium text-white"
                      style={{ backgroundColor: "#00B8DB" }}
                    >
                      {typeLabel}
                    </span>
                    {getFacilityPricingValue(facility) ? (
                      <span className="rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-sm">
                        {getFacilityPricingValue(facility)}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-900 shadow-sm">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        New
                      </span>
                    )}
                  </div>
                  <div className="pointer-events-none absolute bottom-3 left-3 right-3 pb-3 text-white">
                    <h3 className="text-lg font-bold drop-shadow-md sm:text-xl">
                      {facility.name}
                    </h3>
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-white/95 drop-shadow-md">
                      <MapPin className="h-4 w-4 shrink-0" />
                      {facility.address || "—"}
                    </p>
                  </div>
                </div>

                <CardContent className="space-y-4 p-4 sm:p-5">
                  <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-3 text-sm">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Facility details
                    </p>
                    <div className="space-y-1.5 text-slate-700">
                      <p className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#00B8DB]" />
                        <span className="min-w-0 break-words">
                          <span className="font-semibold text-slate-500">Address: </span>
                          {facility.address || "—"}
                          {facility.zip_code ? `, ${facility.zip_code}` : ""}
                        </span>
                      </p>
                      <p className="flex items-start gap-2">
                        <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#00B8DB]" />
                        <span className="min-w-0 break-words">
                          <span className="font-semibold text-slate-500">Phone: </span>
                          {facility.phone || "—"}
                        </span>
                      </p>
                      <p className="flex items-start gap-2">
                        <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#00B8DB]" />
                        <span className="min-w-0 break-words">
                          <span className="font-semibold text-slate-500">Email: </span>
                          {facility.email || "—"}
                        </span>
                      </p>
                      <p className="flex items-start gap-2">
                        <Hash className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#00B8DB]" />
                        <span className="min-w-0 break-words">
                          <span className="font-semibold text-slate-500">ZIP: </span>
                          {facility.zip_code || "—"}
                        </span>
                      </p>
                      <p className="flex items-start gap-2">
                        <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#00B8DB]" />
                        <span className="min-w-0 break-words">
                          <span className="font-semibold text-slate-500">Website: </span>
                          {facility.website ? (
                            <a
                              href={
                                /^https?:\/\//i.test(facility.website)
                                  ? facility.website
                                  : `https://${facility.website}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#00B8DB] hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {facility.website}
                            </a>
                          ) : (
                            "—"
                          )}
                        </span>
                      </p>
                      {(facility.care_levels?.length > 0 || facility.pricing) && (
                        <div className="border-t border-slate-200 pt-2 text-xs text-slate-600">
                          {facility.care_levels?.length > 0 && (
                            <p>
                              <span className="font-semibold text-slate-500">Care levels: </span>
                              Assisted Living
                            </p>
                          )}
                          {facility.pricing && (
                            <p className="mt-1">
                              <span className="font-semibold text-slate-500">Pricing: </span>
                              {facility.pricing}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 rounded-2xl border border-slate-100 bg-white px-3 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Services &amp; amenities
                    </p>
                    <div className="space-y-2">
                      <div>
                        <p className="mb-1.5 text-xs font-semibold text-slate-500">Services</p>
                        {facility.services?.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {facility.services.map((s) => (
                              <span
                                key={s}
                                className="rounded-full bg-[#00B8DB]/10 px-2.5 py-0.5 text-xs font-medium text-[#0891b2]"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400">No services listed</p>
                        )}
                      </div>
                      <div>
                        <p className="mb-1.5 text-xs font-semibold text-slate-500">Amenities</p>
                        {facility.amenities?.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {facility.amenities.map((a) => (
                              <span
                                key={a}
                                className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700"
                              >
                                {a}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400">No amenities listed</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div
                      className="rounded-2xl px-3 py-3 text-center"
                      style={{ backgroundColor: "#F8F8FA" }}
                    >
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Units
                      </p>
                     <p className="mt-1 text-xl font-bold text-slate-900">
  {facility.units ?? 0}
</p>
                    </div>
                    <div
                      className="rounded-2xl px-3 py-3 text-center"
                      style={{ backgroundColor: "#F8F8FA" }}
                    >
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Occupancy
                      </p>
                      <p className="mt-1 text-xl font-bold text-emerald-600">
  {facility.occupancy ?? 0}
</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button
                      type="button"
                      size="default"
                      className="w-[70%] shrink-0 rounded-2xl font-semibold text-white"
                      style={{ background: "#1A1E2F" }}
                      onClick={() => openManageFacility(facility)}
                    >
                      Manage Facility
                    </Button>
                    <Button
                      variant="outline"
                      size="default"
                      className="w-[30%] shrink-0 rounded-2xl border-slate-200 font-semibold text-slate-900"
                      onClick={() => openFacilityAnalytics(facility)}
                    >
                      View Analytics
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!listLoading && facilities.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:flex-row">
          <p className="text-sm text-slate-600">
            Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCurrentPage((prev) => Math.max(1, prev - 1));
                scrollFacilitiesPageToTop();
              }}
              disabled={listLoading || !pagination.hasPrevPage}
              className="rounded-xl"
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCurrentPage((prev) => prev + 1);
                scrollFacilitiesPageToTop();
              }}
              disabled={listLoading || !pagination.hasNextPage}
              className="rounded-xl"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="mx-4 max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {editingId ? "Edit facility" : "Add new facility"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmitFacility}
            className="space-y-4 [&_input]:placeholder:text-slate-400"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                  Facility Name
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => handleInput("name", e.target.value)}
                  placeholder="Evergreen Health Center"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                  Email
                </label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleInput("email", e.target.value)}
                  placeholder="intake@evergreenhealth.com"
                  required
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
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) => handleInput("phone", formatPhoneInput(e.target.value))}
                  placeholder="(206) 555-0123"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                  Pricing
                </label>
                <Input
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  spellCheck={false}
                  value={form.pricing}
                  onChange={(e) => handleInput("pricing", formatPricingInput(e.target.value))}
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
                inputMode="url"
                autoComplete="url"
                value={form.website}
                onChange={(e) => handleInput("website", e.target.value)}
                placeholder="https://www.yourfacility.com"
              />
              <p className="text-xs text-slate-500">
                Optional. Shown when families click Contact on Care Explorer.
              </p>
            </div>

            <FacilityAddressZipFields
              enabled={modalOpen}
              address={form.address}
              zipCode={form.zip_code}
              onAddressChange={(e) => handleInput("address", e.target.value)}
              onZipCodeChange={(zip) => handleInput("zip_code", zip)}
            />

            <div className="mt-8 space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                Facility images (max 8 total) — change / upload here
              </label>
              {editingId && keptImagePaths.length > 0 && (
                <p className="facility-copy-fade text-xs text-slate-500">
                  Current images — remove to delete on save.
                </p>
              )}
              {editingId && keptImagePaths.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {keptImagePaths.map((imgPath, idx) => (
                    <div
                      key={imgPath}
                      className="facility-kept-card group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-900/5"
                      style={{
                        animation: "facilityThumbIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
                        animationDelay: `${idx * 65}ms`,
                      }}
                    >
                      <img
                        src={resolveSingleImageUrl(imgPath)}
                        alt=""
                        className="h-20 w-20 object-cover transition duration-300 group-hover:scale-105"
                      />
                      <button
                        type="button"
                        onClick={() => removeKeptImage(imgPath)}
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/75 text-white opacity-0 shadow-md transition hover:bg-red-600 group-hover:opacity-100"
                        aria-label="Remove image"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      <span className="block max-w-[5.5rem] truncate px-1.5 pb-1 text-center text-[10px] font-medium text-slate-600">
                        {imgPath.split("/").pop()}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {facilitySlotsMax === 0 ? (
                <p className="rounded-2xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-center text-xs font-medium text-amber-950">
                  Image limit reached (8 total). Remove a current or new image to add more.
                </p>
              ) : (
                <div
                  className="facility-upload-zone group relative overflow-hidden rounded-2xl border-2 border-dashed border-slate-200/90 bg-gradient-to-br from-slate-50/80 via-white to-cyan-50/40 transition duration-300 hover:border-[#00B8DB]/50 hover:shadow-[0_12px_40px_-12px_rgba(0,184,219,0.35)]"
                  onDragOver={handleFacilityImageDragOver}
                  onDrop={handleFacilityImageDrop}
                >
                  <div
                    className="facility-upload-shimmer pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100"
                    aria-hidden
                  />
                  <input
                    id="facility-images-input"
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={handleImageSelect}
                  />
                  <label
                    htmlFor="facility-images-input"
                    className="relative flex cursor-pointer flex-col items-center gap-2 px-4 py-8"
                  >
                    <div className="facility-upload-icon flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00B8DB] to-cyan-600 text-white shadow-lg shadow-cyan-500/25 ring-4 ring-cyan-100/80 transition duration-300 group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-cyan-500/30">
                      <ImagePlus className="h-7 w-7" strokeWidth={1.75} />
                    </div>
                    <span className="text-sm font-semibold text-slate-800">
                      Drop images here or click to browse
                    </span>
                    <span className="text-center text-xs text-slate-500">
                      JPG, PNG, WebP — {facilitySlotsLeft} of {facilitySlotsMax} upload slot
                      {facilitySlotsMax === 1 ? "" : "s"} left
                    </span>
                  </label>
                </div>
              )}

              {selectedImages.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {selectedImages.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="facility-new-card group relative overflow-hidden rounded-2xl border border-cyan-100/80 bg-white shadow-md ring-1 ring-cyan-500/10"
                      style={{
                        animation: "facilityThumbIn 0.48s cubic-bezier(0.22, 1, 0.36, 1) both",
                        animationDelay: `${index * 55}ms`,
                      }}
                    >
                      <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
                        <img
                          src={selectedImagePreviewUrls[index]}
                          alt=""
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-slate-800 shadow-lg backdrop-blur-sm transition hover:bg-red-500 hover:text-white"
                          aria-label={`Remove ${file.name}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <p
                        className="truncate px-2 py-1.5 text-center text-[10px] font-medium text-slate-600"
                        title={file.name}
                      >
                        {file.name}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                  Services
                </label>
                <Input
                  value={tagDrafts.services}
                  onChange={(e) =>
                    setTagDrafts((prev) => ({
                      ...prev,
                      services: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => handleTagInputKeyDown("services", e)}
                  onBlur={() => handleTagInputBlur("services")}
                  placeholder="Type service and press Enter or comma"
                />
                <div className="flex flex-wrap gap-2 pt-1">
                  {form.services.map((item, index) => (
                    <span
                      key={`${item}-${index}`}
                      className="tag-chip inline-flex animate-[tagPop_220ms_ease-out] items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold text-cyan-900 shadow-sm"
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => removeTag("services", index)}
                        className="rounded-full p-0.5 text-cyan-900/70 transition hover:bg-cyan-900/10 hover:text-cyan-900"
                        aria-label={`Remove ${item}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                  Amenities
                </label>
                <Input
                  value={tagDrafts.amenities}
                  onChange={(e) =>
                    setTagDrafts((prev) => ({
                      ...prev,
                      amenities: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => handleTagInputKeyDown("amenities", e)}
                  onBlur={() => handleTagInputBlur("amenities")}
                  placeholder="Type amenity and press Enter or comma"
                />
                <div className="flex flex-wrap gap-2 pt-1">
                  {form.amenities.map((item, index) => (
                    <span
                      key={`${item}-${index}`}
                      className="tag-chip inline-flex animate-[tagPop_220ms_ease-out] items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold text-violet-900 shadow-sm"
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => removeTag("amenities", index)}
                        className="rounded-full p-0.5 text-violet-900/70 transition hover:bg-violet-900/10 hover:text-violet-900"
                        aria-label={`Remove ${item}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                  Care Levels
                </label>
                <Input
                  value={tagDrafts.careLevels}
                  onChange={(e) =>
                    setTagDrafts((prev) => ({
                      ...prev,
                      careLevels: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => handleTagInputKeyDown("careLevels", e)}
                  onBlur={() => handleTagInputBlur("careLevels")}
                  placeholder="Type care level and press Enter or comma"
                />
                <div className="flex flex-wrap gap-2 pt-1">
                  {form.careLevels.map((item, index) => (
                    <span
                      key={`${item}-${index}`}
                      className="tag-chip inline-flex animate-[tagPop_220ms_ease-out] items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold text-emerald-900 shadow-sm"
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => removeTag("careLevels", index)}
                        className="rounded-full p-0.5 text-emerald-900/70 transition hover:bg-emerald-900/10 hover:text-emerald-900"
                        aria-label={`Remove ${item}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
  <div className="space-y-2">
    <label className="text-xs font-semibold uppercase tracking-wider text-slate-900">
      Units
    </label>
    <Input
      type="number"
      min="0"
      inputMode="numeric"
      value={countFieldDisplayValue(form.units)}
      onChange={handleNonNegativeCountInput("units")}
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
      value={countFieldDisplayValue(form.occupancy)}
      onChange={handleNonNegativeCountInput("occupancy")}
      placeholder="85"
    />
  </div>
</div>
            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
              {editingId ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-xl border-red-200 text-red-700 hover:bg-red-50 sm:w-auto"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={isSubmitting}
                >
                  Delete facility
                </Button>
              ) : (
                <span />
              )}
              <Button
                type="submit"
                className="w-full rounded-xl bg-[#00B8DB] text-white hover:bg-[#00B8DB]/90 sm:min-w-[200px]"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? editingId
                    ? "Saving…"
                    : "Creating…"
                  : editingId
                    ? "Save changes"
                    : "Create facility"}
              </Button>
            </div>

            
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {analyticsFacility?.name || "Facility"} analytics
            </DialogTitle>
          </DialogHeader>
          {analyticsLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading analytics…
            </div>
          ) : !facilityAnalytics ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No analytics available for this facility yet.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Eye className="h-4 w-4 text-[#00B8DB]" />
                    <span className="text-xs font-bold uppercase tracking-wide">User visited</span>
                  </div>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {facilityAnalytics.summary?.userVisited ?? 0}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Explore / interest clicks from Care Explorer
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                  <div className="flex items-center gap-2 text-slate-500">
                    <MessageSquare className="h-4 w-4 text-[#00B8DB]" />
                    <span className="text-xs font-bold uppercase tracking-wide">
                      Sent inquiries
                    </span>
                  </div>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {facilityAnalytics.summary?.inquiriesSent ?? 0}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Inquiry emails sent to facility contacts
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-100 px-3 py-3 text-center">
                  <p className="text-xs font-medium uppercase text-slate-400">Emails opened</p>
                  <p className="mt-1 text-xl font-bold text-emerald-600">
                    {facilityAnalytics.summary?.emailsOpened ?? 0}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 px-3 py-3 text-center">
                  <p className="text-xs font-medium uppercase text-slate-400">Contacted</p>
                  <p className="mt-1 text-xl font-bold text-[#00B8DB]">
                    {facilityAnalytics.summary?.contacted ?? 0}
                  </p>
                </div>
              </div>
              {Array.isArray(facilityAnalytics.recent) && facilityAnalytics.recent.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                    Recent inquiries
                  </p>
                  <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                    {facilityAnalytics.recent.map((row) => (
                      <li key={row.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">{row.name}</p>
                          <p className="truncate text-xs text-slate-500">{row.email}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          {row.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this facility?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the facility listing and its partner login. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault();
                handleDeleteFacility();
              }}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <style jsx global>{`
        @keyframes tagPop {
          0% {
            opacity: 0;
            transform: translateY(8px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .tag-chip:nth-child(3n + 1) {
          background: linear-gradient(135deg, #cffafe, #bae6fd);
          border-color: #a5f3fc;
        }
        .tag-chip:nth-child(3n + 2) {
          background: linear-gradient(135deg, #ede9fe, #ddd6fe);
          border-color: #c4b5fd;
        }
        .tag-chip:nth-child(3n + 3) {
          background: linear-gradient(135deg, #dcfce7, #bbf7d0);
          border-color: #86efac;
        }
      `}</style>
    </div>
  );
}
