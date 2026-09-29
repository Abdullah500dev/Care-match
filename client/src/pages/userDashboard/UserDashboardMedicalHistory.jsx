import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FileText, ImagePlus, Loader2, Sparkles, Upload, X } from "lucide-react";
import SEO from "@/components/common/SEO";
import { authServices } from "../../services/authServices";
import {
  postDiscoverFacilities,
  postRecommendFromProfile,
} from "../../services/matchService";
import { setLastMatchCount } from "../../lib/userDashboardStats";
import { getUser, setUser } from "../../store/auth/authSlice";
import { toastAuthError, toastAuthSuccess } from "../../lib/authFeedback";
import { toast } from "sonner";

const API_BASE = String(import.meta.env.VITE_REACT_APP_API_BASE_URL || "").replace(/\/$/, "");

const resolveUploadUrl = (path) => {
  const raw = String(path || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${API_BASE}${raw}`;
  return `${API_BASE}/${raw}`;
};

const listToCsv = (value) =>
  Array.isArray(value) ? value.filter(Boolean).join(", ") : String(value || "");

const listFromValue = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  return String(value || "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const FIELD_HINT = "Add Any Pertinent Info In Addition to Medical Record";

export default function UserDashboardMedicalHistory() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userData, token } = useSelector(getUser);

  const [name, setName] = useState(userData?.name || "");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState("");
  const [careLoading, setCareLoading] = useState(false);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [careForm, setCareForm] = useState({
    bio: userData?.bio || "",
    medical_issues: userData?.medical_issues || "",
    care_background: userData?.care_background || "",
    desired_services: listFromValue(userData?.desired_services),
    desired_amenities: listFromValue(userData?.desired_amenities),
    search_zip_code: userData?.search_zip_code || "",
    search_location: userData?.search_location || "",
    budget_max_monthly:
      userData?.budget_max_monthly != null ? String(userData.budget_max_monthly) : "",
    max_distance_miles:
      userData?.max_distance_miles != null ? String(userData.max_distance_miles) : "25",
  });
  const [tagDrafts, setTagDrafts] = useState({
    desired_services: "",
    desired_amenities: "",
  });
  const [keptDocuments, setKeptDocuments] = useState(
    Array.isArray(userData?.care_documents) ? userData.care_documents : [],
  );
  const [newFiles, setNewFiles] = useState([]);

  useEffect(() => {
    setName(userData?.name || "");
    setCareForm({
      bio: userData?.bio || "",
      medical_issues: userData?.medical_issues || "",
      care_background: userData?.care_background || "",
      desired_services: listFromValue(userData?.desired_services),
      desired_amenities: listFromValue(userData?.desired_amenities),
      search_zip_code: userData?.search_zip_code || "",
      search_location: userData?.search_location || "",
      budget_max_monthly:
        userData?.budget_max_monthly != null ? String(userData.budget_max_monthly) : "",
      max_distance_miles:
        userData?.max_distance_miles != null ? String(userData.max_distance_miles) : "25",
    });
    setTagDrafts({ desired_services: "", desired_amenities: "" });
    setKeptDocuments(
      Array.isArray(userData?.care_documents) ? userData.care_documents : [],
    );
  }, [userData]);

  const newFilePreviews = useMemo(
    () =>
      newFiles.map((file) => ({
        file,
        url: file.type?.startsWith("image/") ? URL.createObjectURL(file) : "",
      })),
    [newFiles],
  );

  useEffect(() => {
    return () => {
      newFilePreviews.forEach((item) => {
        if (item.url) URL.revokeObjectURL(item.url);
      });
    };
  }, [newFilePreviews]);

  const isMedicalRecordComplete = useMemo(() => {
    const zip = String(careForm.search_zip_code || "").replace(/\D/g, "");
    const hasContext =
      Boolean(careForm.care_background?.trim()) ||
      careForm.desired_services.length > 0 ||
      careForm.desired_amenities.length > 0;
    return (
      Boolean(careForm.bio?.trim()) &&
      Boolean(careForm.medical_issues?.trim()) &&
      hasContext &&
      zip.length === 5
    );
  }, [careForm]);

  const addTags = (field, rawValue) => {
    const next = listFromValue(rawValue);
    if (!next.length) return;
    setCareForm((prev) => {
      const current = Array.isArray(prev[field]) ? prev[field] : [];
      const merged = [...current];
      next.forEach((item) => {
        if (!merged.some((existing) => existing.toLowerCase() === item.toLowerCase())) {
          merged.push(item);
        }
      });
      return { ...prev, [field]: merged };
    });
  };

  const handleTagInputKeyDown = (field, event) => {
    if (event.key !== "Enter" && event.key !== ",") return;
    event.preventDefault();
    addTags(field, tagDrafts[field]);
    setTagDrafts((prev) => ({ ...prev, [field]: "" }));
  };

  const handleTagInputBlur = (field) => {
    if (!String(tagDrafts[field] || "").trim()) return;
    addTags(field, tagDrafts[field]);
    setTagDrafts((prev) => ({ ...prev, [field]: "" }));
  };

  const removeTag = (field, index) => {
    setCareForm((prev) => ({
      ...prev,
      [field]: (Array.isArray(prev[field]) ? prev[field] : []).filter((_, i) => i !== index),
    }));
  };

  const handleNameUpdate = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError("Name is required.");
      return;
    }
    setNameError("");
    try {
      setNameLoading(true);
      const response = await authServices.updateUserInfo({ name: name.trim() });
      const updatedUser = response?.data?.user;
      if (updatedUser) {
        dispatch(setUser({ user: updatedUser, token, tokenExpire: null }));
      }
      toastAuthSuccess("Profile updated", "Your name has been updated.");
    } catch (error) {
      toastAuthError(error, {
        fallbackTitle: "Could not update profile",
        fallbackDescription: "Please try again.",
      });
    } finally {
      setNameLoading(false);
    }
  };

  const buildCareFormData = () => {
    const payload = new FormData();
    payload.append("name", name.trim() || userData?.name || "");
    payload.append("bio", careForm.bio);
    payload.append("medical_issues", careForm.medical_issues);
    payload.append("care_background", careForm.care_background);
    payload.append("desired_services", listToCsv(careForm.desired_services));
    payload.append("desired_amenities", listToCsv(careForm.desired_amenities));
    payload.append("search_zip_code", careForm.search_zip_code);
    payload.append("search_location", careForm.search_location);
    payload.append("budget_max_monthly", careForm.budget_max_monthly);
    payload.append("max_distance_miles", careForm.max_distance_miles);
    payload.append(
      "keep_document_paths",
      JSON.stringify(keptDocuments.map((doc) => doc.path).filter(Boolean)),
    );
    newFiles.forEach((file) => payload.append("documents", file));
    return payload;
  };

  const handleCareProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      setCareLoading(true);
      const response = await authServices.updateUserInfo(buildCareFormData());
      const updatedUser = response?.data?.user;
      if (updatedUser) {
        dispatch(setUser({ user: updatedUser, token, tokenExpire: null }));
        setKeptDocuments(
          Array.isArray(updatedUser.care_documents) ? updatedUser.care_documents : [],
        );
        setNewFiles([]);
      }
      toastAuthSuccess("Medical history saved", "Your care preferences were updated.");
    } catch (error) {
      toastAuthError(error, {
        fallbackTitle: "Could not save medical history",
        fallbackDescription: "Please check your files and try again.",
      });
    } finally {
      setCareLoading(false);
    }
  };

  const buildDiscoverPayloadFromPrefs = (prefs) => {
    const safePrefs = prefs && typeof prefs === "object" ? prefs : {};
    const rawLocation = String(
      safePrefs.searchLocation || careForm.search_location || "",
    ).trim();
    const zipFromPrefs = String(safePrefs.searchZipCode || "")
      .replace(/\D/g, "")
      .slice(0, 5);
    const zipFromForm = String(careForm.search_zip_code || "")
      .replace(/\D/g, "")
      .slice(0, 5);
    const zipCode = zipFromPrefs || zipFromForm;
    const location = rawLocation || zipCode;
    const careLevels = Array.isArray(safePrefs.careLevels)
      ? safePrefs.careLevels.map((x) => String(x || "").trim()).filter(Boolean)
      : [];
    const maxDistance = Number(
      safePrefs.maxDistanceMiles ?? careForm.max_distance_miles ?? 25,
    );

    return {
      zip_code: zipCode || location,
      location,
      care_levels: careLevels.length > 0 ? careLevels : ["assisted living"],
      amenities: Array.isArray(safePrefs.amenityMustHaves)
        ? safePrefs.amenityMustHaves.map((x) => String(x || "").trim()).filter(Boolean)
        : [],
      services: Array.isArray(careForm.desired_services) ? careForm.desired_services : [],
      keywords: [],
      max_distance_miles:
        Number.isFinite(maxDistance) && maxDistance > 0 ? Math.round(maxDistance) : 25,
      budget_min: safePrefs.budgetMinMonthly ?? safePrefs.budget_min ?? undefined,
      budget_max:
        safePrefs.budgetMaxMonthly ??
        safePrefs.budget_max ??
        (careForm.budget_max_monthly ? Number(careForm.budget_max_monthly) : undefined),
    };
  };

  const handleGetRecommendations = async () => {
    if (!isMedicalRecordComplete) {
      toast.error("Complete your medical history first", {
        description: "Fill bio, medical history, preferences, and a 5-digit ZIP.",
      });
      return;
    }

    setRecommendLoading(true);
    try {
      let docsForRecommend = keptDocuments;
      if (newFiles.length > 0) {
        const saveRes = await authServices.updateUserInfo(buildCareFormData());
        const updatedUser = saveRes?.data?.user;
        if (updatedUser) {
          dispatch(setUser({ user: updatedUser, token, tokenExpire: null }));
          docsForRecommend = Array.isArray(updatedUser.care_documents)
            ? updatedUser.care_documents
            : [];
          setKeptDocuments(docsForRecommend);
          setNewFiles([]);
        }
      }

      const { data } = await postRecommendFromProfile({
        bio: careForm.bio,
        medical_issues: careForm.medical_issues,
        care_background: careForm.care_background,
        desired_services: listToCsv(careForm.desired_services),
        desired_amenities: listToCsv(careForm.desired_amenities),
        search_zip_code: careForm.search_zip_code,
        search_location: careForm.search_location,
        budget_max_monthly: careForm.budget_max_monthly || undefined,
        max_distance_miles: careForm.max_distance_miles || 25,
        document_paths: docsForRecommend.map((doc) => doc.path).filter(Boolean),
      });

      if (!data?.success || !data?.preferences) {
        const missing = Array.isArray(data?.missing) ? data.missing.join(", ") : "";
        toast.error(data?.message || "Could not build recommendations", {
          description: missing ? `Still need: ${missing}` : "Add a ZIP and try again.",
        });
        return;
      }

      const prefs = data.preferences;
      const discoverRes = await postDiscoverFacilities(buildDiscoverPayloadFromPrefs(prefs));
      const matches = Array.isArray(discoverRes?.data?.facilities)
        ? discoverRes.data.facilities
        : [];
      setLastMatchCount(matches.length);

      const docsNote =
        Number(data.documentsAnalyzed) > 0
          ? ` Used ${data.documentsAnalyzed} uploaded file(s) in matching.`
          : "";

      if (matches.length === 0) {
        toast.message("No facilities found nearby", {
          description: `Try a wider radius or a different ZIP.${docsNote}`,
        });
      } else if (docsNote) {
        toast.success("Recommendations ready", { description: docsNote.trim() });
      }

      navigate("/care-explorer", {
        state: {
          fromCarrie: true,
          searchSource: "medical-record",
          carrieMatches: matches,
          carrieFilters: {
            ...prefs,
            skipInitialBudgetPrefill: prefs.budgetMaxMonthly == null,
          },
        },
      });
    } catch (error) {
      toastAuthError(error, {
        fallbackTitle: "Could not get recommendations",
        fallbackDescription: "Please try again in a moment.",
      });
    } finally {
      setRecommendLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <SEO title="Medical History – CareMatch AI" />
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Medical History</h1>
        <p className="mt-1 text-sm text-slate-500">
          Share medical context, preferred services, and documents with CareMatch.
        </p>
      </div>

      {/* 1. Profile on top */}
      <form
        onSubmit={handleNameUpdate}
        className="rounded-xl border border-slate-200 bg-white p-5"
      >
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Profile</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={userData?.email || ""}
              disabled
              className="h-10 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3 text-sm text-slate-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError("");
              }}
              className={`h-10 w-full rounded-lg border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B8DB]/40 ${
                nameError ? "border-red-400" : "border-slate-200"
              }`}
            />
            {nameError ? <p className="mt-1 text-xs text-red-600">{nameError}</p> : null}
          </div>
        </div>
        <button
          type="submit"
          disabled={nameLoading}
          className="mt-4 rounded-lg bg-[#00B8DB] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          {nameLoading ? "Updating..." : "Update Name"}
        </button>
      </form>

      <form onSubmit={handleCareProfileUpdate} className="space-y-6">
        {/* 2. Big upload block */}
        <div className="rounded-xl border border-dashed border-[#00B8DB]/50 bg-gradient-to-b from-[#ECFEFF] to-white p-6 sm:p-8">
          <div className="mb-4 flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#00B8DB] shadow-sm ring-1 ring-[#00B8DB]/20">
              <Upload className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Upload Medical Records</h2>
              <p className="mt-1 text-sm text-slate-500">
                Upload images or PDFs (max 6 files, 8MB each). Carrie reviews these when you
                get recommendations.
              </p>
            </div>
          </div>

          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white/80 px-4 py-10 text-center transition hover:border-[#00B8DB] hover:bg-[#ECFEFF]/40">
            <ImagePlus className="h-8 w-8 text-[#00B8DB]" />
            <span className="text-sm font-semibold text-slate-800">
              Drop files here or click to browse
            </span>
            <span className="text-xs text-slate-500">JPG, PNG, WEBP, PDF, DOC, DOCX</span>
            <input
              type="file"
              accept="image/*,.pdf,.doc,.docx,application/pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                const picked = Array.from(e.target.files || []);
                if (!picked.length) return;
                setNewFiles((prev) => [...prev, ...picked].slice(0, 6));
                e.target.value = "";
              }}
            />
          </label>

          {(keptDocuments.length > 0 || newFilePreviews.length > 0) && (
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {keptDocuments.map((doc) => {
                const isImage = String(doc.mimeType || "").startsWith("image/");
                const href = resolveUploadUrl(doc.path);
                return (
                  <div
                    key={doc.path}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2"
                  >
                    {isImage ? (
                      <img
                        src={href}
                        alt={doc.originalName || "Document"}
                        className="h-12 w-12 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded bg-slate-100">
                        <FileText className="h-5 w-5 text-slate-500" />
                      </div>
                    )}
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 flex-1 truncate text-xs font-medium text-[#00B8DB] hover:underline"
                    >
                      {doc.originalName || doc.path}
                    </a>
                    <button
                      type="button"
                      onClick={() =>
                        setKeptDocuments((prev) =>
                          prev.filter((item) => item.path !== doc.path),
                        )
                      }
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Remove document"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
              {newFilePreviews.map((item, index) => (
                <div
                  key={`${item.file.name}-${index}`}
                  className="flex items-center gap-2 rounded-lg border border-cyan-100 bg-cyan-50/40 p-2"
                >
                  {item.url ? (
                    <img
                      src={item.url}
                      alt={item.file.name}
                      className="h-12 w-12 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded bg-white">
                      <FileText className="h-5 w-5 text-slate-500" />
                    </div>
                  )}
                  <p className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">
                    {item.file.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => setNewFiles((prev) => prev.filter((_, i) => i !== index))}
                    className="rounded p-1 text-slate-400 hover:bg-white hover:text-slate-700"
                    aria-label="Remove new file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. ZIP / location / budget / radius */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-1 text-lg font-semibold text-slate-900">Search Preferences</h2>
          <p className="mb-4 text-sm text-slate-500">
            Used to find nearby assisted living communities that fit your needs.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Search ZIP <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={5}
                value={careForm.search_zip_code}
                onChange={(e) =>
                  setCareForm((prev) => ({
                    ...prev,
                    search_zip_code: e.target.value.replace(/\D/g, "").slice(0, 5),
                  }))
                }
                placeholder="e.g. 85001"
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B8DB]/40"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                City / Area (optional)
              </label>
              <input
                type="text"
                value={careForm.search_location}
                onChange={(e) =>
                  setCareForm((prev) => ({ ...prev, search_location: e.target.value }))
                }
                placeholder="e.g. Phoenix, AZ"
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B8DB]/40"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Max monthly budget (USD)
              </label>
              <input
                type="number"
                min={500}
                step={100}
                value={careForm.budget_max_monthly}
                onChange={(e) =>
                  setCareForm((prev) => ({
                    ...prev,
                    budget_max_monthly: e.target.value,
                  }))
                }
                placeholder="e.g. 6000"
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B8DB]/40"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Search radius (miles)
              </label>
              <input
                type="number"
                min={5}
                max={100}
                step={5}
                value={careForm.max_distance_miles}
                onChange={(e) =>
                  setCareForm((prev) => ({
                    ...prev,
                    max_distance_miles: e.target.value,
                  }))
                }
                placeholder="25"
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B8DB]/40"
              />
            </div>
          </div>
        </div>

        {/* 4. Same sections below with updated labels */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <label className="mb-1 block text-sm font-medium text-slate-700">Bio</label>
          <p className="mb-2 text-xs text-slate-500">{FIELD_HINT}</p>
          <textarea
            value={careForm.bio}
            onChange={(e) => setCareForm((prev) => ({ ...prev, bio: e.target.value }))}
            rows={3}
            placeholder="Short introduction about the care seeker or family situation"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B8DB]/40"
          />

          <label className="mb-1 mt-4 block text-sm font-medium text-slate-700">
            Medical History
          </label>
          <p className="mb-2 text-xs text-slate-500">{FIELD_HINT}</p>
          <textarea
            value={careForm.medical_issues}
            onChange={(e) =>
              setCareForm((prev) => ({ ...prev, medical_issues: e.target.value }))
            }
            rows={3}
            placeholder="Diagnoses, mobility needs, medications, or conditions to keep in mind"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B8DB]/40"
          />

          <label className="mb-1 mt-4 block text-sm font-medium text-slate-700">
            Background
          </label>
          <p className="mb-2 text-xs text-slate-500">{FIELD_HINT}</p>
          <textarea
            value={careForm.care_background}
            onChange={(e) =>
              setCareForm((prev) => ({ ...prev, care_background: e.target.value }))
            }
            rows={3}
            placeholder="Living situation, prior care history, timeline, or other context"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B8DB]/40"
          />

          <div className="mt-4 space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Services Wanted — Use Comma in Between
            </label>
            <input
              type="text"
              value={tagDrafts.desired_services}
              onChange={(e) =>
                setTagDrafts((prev) => ({ ...prev, desired_services: e.target.value }))
              }
              onKeyDown={(e) => handleTagInputKeyDown("desired_services", e)}
              onBlur={() => handleTagInputBlur("desired_services")}
              placeholder="Type service and press Enter or comma"
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B8DB]/40"
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {careForm.desired_services.map((item, index) => (
                <span
                  key={`${item}-${index}`}
                  className="tag-chip inline-flex animate-[tagPop_220ms_ease-out] items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold text-cyan-900 shadow-sm"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => removeTag("desired_services", index)}
                    className="rounded-full p-0.5 text-cyan-900/70 transition hover:bg-cyan-900/10"
                    aria-label={`Remove ${item}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Amenities Wanted — Use Comma in Between
            </label>
            <input
              type="text"
              value={tagDrafts.desired_amenities}
              onChange={(e) =>
                setTagDrafts((prev) => ({ ...prev, desired_amenities: e.target.value }))
              }
              onKeyDown={(e) => handleTagInputKeyDown("desired_amenities", e)}
              onBlur={() => handleTagInputBlur("desired_amenities")}
              placeholder="Type amenity and press Enter or comma"
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B8DB]/40"
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {careForm.desired_amenities.map((item, index) => (
                <span
                  key={`${item}-${index}`}
                  className="tag-chip inline-flex animate-[tagPop_220ms_ease-out] items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold text-violet-900 shadow-sm"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => removeTag("desired_amenities", index)}
                    className="rounded-full p-0.5 text-violet-900/70 transition hover:bg-violet-900/10"
                    aria-label={`Remove ${item}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={careLoading || recommendLoading}
              className="rounded-lg bg-[#00B8DB] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {careLoading ? "Saving..." : "Save Medical History"}
            </button>
            <button
              type="button"
              onClick={handleGetRecommendations}
              disabled={!isMedicalRecordComplete || recommendLoading || careLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-[#00B8DB] bg-white px-4 py-2 text-sm font-semibold text-[#00B8DB] hover:bg-[#ECFEFF] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {recommendLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {recommendLoading ? "Finding matches..." : "Get Recommendations"}
            </button>
            {!isMedicalRecordComplete ? (
              <p className="w-full text-xs text-slate-500">
                Fill bio, medical history, preferences, and a 5-digit ZIP to unlock
                recommendations.
              </p>
            ) : null}
          </div>
        </div>
      </form>

      <style>{`
        @keyframes tagPop {
          0% { opacity: 0; transform: translateY(8px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
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
