import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, FileText, ImagePlus, Loader2, Sparkles, X } from "lucide-react";
import SEO from "@/components/common/SEO";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export default function UserDashboardSettings() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { userData, token } = useSelector(getUser);
  const isFamilyUser =
    userData?.role === "user" &&
    !["admin", "authenticator", "moderator"].includes(userData?.user_type);

  const [name, setName] = useState(userData?.name || "");
  const [nameLoading, setNameLoading] = useState(false);
  const [careLoading, setCareLoading] = useState(false);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [nameError, setNameError] = useState("");
  const [passwordErrors, setPasswordErrors] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState({
    oldPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

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

  const tabFromHash = (hash) => {
    if (hash === "#medical-record" && isFamilyUser) return "medical-record";
    if (hash === "#password") return "password";
    return "profile";
  };
  const [activeTab, setActiveTab] = useState(() => tabFromHash(location.hash));

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

  useEffect(() => {
    setActiveTab(tabFromHash(location.hash));
  }, [location.hash, isFamilyUser]);

  useEffect(() => {
    if (!isFamilyUser || activeTab !== "medical-record") return undefined;
    const timer = window.setTimeout(() => {
      document.getElementById("medical-record")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [isFamilyUser, activeTab, location.pathname]);

  const handleTabChange = (value) => {
    setActiveTab(value);
    const nextHash =
      value === "medical-record"
        ? "#medical-record"
        : value === "password"
          ? "#password"
          : "";
    const base = `${location.pathname}${location.search}`;
    navigate(`${base}${nextHash}`, { replace: true });
  };

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

  const handleCareProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      setCareLoading(true);
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

      const response = await authServices.updateUserInfo(payload);
      const updatedUser = response?.data?.user;
      if (updatedUser) {
        dispatch(setUser({ user: updatedUser, token, tokenExpire: null }));
        setKeptDocuments(
          Array.isArray(updatedUser.care_documents) ? updatedUser.care_documents : [],
        );
        setNewFiles([]);
      }
      toastAuthSuccess("Medical record saved", "Your care preferences were updated.");
    } catch (error) {
      toastAuthError(error, {
        fallbackTitle: "Could not save medical record",
        fallbackDescription: "Please check your files and try again.",
      });
    } finally {
      setCareLoading(false);
    }
  };

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
      services: Array.isArray(careForm.desired_services)
        ? careForm.desired_services
        : [],
      keywords: [],
      max_distance_miles: Number.isFinite(maxDistance) && maxDistance > 0
        ? Math.round(maxDistance)
        : 25,
      budget_min: safePrefs.budgetMinMonthly ?? safePrefs.budget_min ?? undefined,
      budget_max:
        safePrefs.budgetMaxMonthly ??
        safePrefs.budget_max ??
        (careForm.budget_max_monthly
          ? Number(careForm.budget_max_monthly)
          : undefined),
    };
  };

  const handleGetRecommendations = async () => {
    if (!isMedicalRecordComplete) {
      toast.error("Complete your medical record first", {
        description: "Fill bio, medical issues, preferences, and a 5-digit ZIP.",
      });
      return;
    }

    setRecommendLoading(true);
    try {
      // Persist any new uploads so the server can analyze them.
      let docsForRecommend = keptDocuments;
      if (newFiles.length > 0) {
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

        const saveRes = await authServices.updateUserInfo(payload);
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

      const profilePayload = {
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
      };

      const { data } = await postRecommendFromProfile(profilePayload);
      if (!data?.success || !data?.preferences) {
        const missing = Array.isArray(data?.missing) ? data.missing.join(", ") : "";
        toast.error(data?.message || "Could not build recommendations", {
          description: missing ? `Still need: ${missing}` : "Add a ZIP and try again.",
        });
        return;
      }

      const prefs = data.preferences;
      const discoverPayload = buildDiscoverPayloadFromPrefs(prefs);
      const discoverRes = await postDiscoverFacilities(discoverPayload);
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
        toast.success("Recommendations ready", {
          description: docsNote.trim(),
        });
      }

      navigate("/care-explorer", {
        state: {
          fromCarrie: true,
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

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    const nextErrors = {
      oldPassword: passwordForm.oldPassword ? "" : "Current password is required.",
      newPassword: passwordForm.newPassword ? "" : "New password is required.",
      confirmPassword: passwordForm.confirmPassword ? "" : "Please confirm your new password.",
    };
    if (nextErrors.oldPassword || nextErrors.newPassword || nextErrors.confirmPassword) {
      setPasswordErrors(nextErrors);
      return;
    }
    setPasswordErrors({ oldPassword: "", newPassword: "", confirmPassword: "" });

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordErrors((prev) => ({
        ...prev,
        confirmPassword: "Passwords do not match.",
      }));
      toastAuthError(
        { response: { status: 400, data: { message: "Passwords do not match." } } },
        { fallbackTitle: "Password mismatch" },
      );
      return;
    }

    try {
      setPasswordLoading(true);
      await authServices.updateUserPassword(passwordForm);
      setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordErrors({ oldPassword: "", newPassword: "", confirmPassword: "" });
      toastAuthSuccess("Password updated", "Your password has been changed.");
    } catch (error) {
      toastAuthError(error, {
        fallbackTitle: "Could not update password",
        fallbackDescription: "Please check your current password and try again.",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <SEO title="Settings – CareMatch AI" />
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList
          className={`grid h-auto w-full gap-1 bg-slate-100 p-1 ${
            isFamilyUser ? "grid-cols-3" : "grid-cols-2"
          }`}
        >
          <TabsTrigger
            value="profile"
            className="rounded-md px-3 py-2 text-sm data-[state=active]:bg-white data-[state=active]:text-[#00B8DB] data-[state=active]:shadow-sm"
          >
            Profile
          </TabsTrigger>
          {isFamilyUser ? (
            <TabsTrigger
              value="medical-record"
              className="rounded-md px-3 py-2 text-sm data-[state=active]:bg-white data-[state=active]:text-[#00B8DB] data-[state=active]:shadow-sm"
            >
              Medical Record
            </TabsTrigger>
          ) : null}
          <TabsTrigger
            value="password"
            className="rounded-md px-3 py-2 text-sm data-[state=active]:bg-white data-[state=active]:text-[#00B8DB] data-[state=active]:shadow-sm"
          >
            Password
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <form
            onSubmit={handleNameUpdate}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Profile</h2>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={userData?.email || ""}
              disabled
              title="Email is locked and cannot be edited"
              className="h-10 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3 text-sm text-slate-500 opacity-90"
            />
            <p className="mt-1 text-xs text-slate-500">
              Email cannot be updated from settings.
            </p>
            <label className="mb-1 mt-3 block text-sm font-medium text-slate-700">Name</label>
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
            <button
              type="submit"
              disabled={nameLoading}
              className="mt-4 rounded-lg bg-[#00B8DB] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              {nameLoading ? "Updating..." : "Update Name"}
            </button>
          </form>
        </TabsContent>

        {isFamilyUser ? (
          <TabsContent value="medical-record" className="mt-4">
            <form
              id="medical-record"
              onSubmit={handleCareProfileUpdate}
              className="scroll-mt-6 rounded-xl border border-slate-200 bg-white p-5"
            >
              <h2 className="mb-1 text-lg font-semibold text-slate-900">Medical Record</h2>
              <p className="mb-4 text-sm text-slate-500">
                Share medical context, preferred services, and optional documents with CareMatch.
              </p>

              <label className="mb-1 block text-sm font-medium text-slate-700">Bio</label>
              <textarea
                value={careForm.bio}
                onChange={(e) => setCareForm((prev) => ({ ...prev, bio: e.target.value }))}
                rows={3}
                placeholder="Short introduction about the care seeker or family situation"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B8DB]/40"
              />

              <label className="mb-1 mt-3 block text-sm font-medium text-slate-700">
                Medical Issues
              </label>
              <textarea
                value={careForm.medical_issues}
                onChange={(e) =>
                  setCareForm((prev) => ({ ...prev, medical_issues: e.target.value }))
                }
                rows={3}
                placeholder="Diagnoses, mobility needs, medications, or conditions to keep in mind"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B8DB]/40"
              />

              <label className="mb-1 mt-3 block text-sm font-medium text-slate-700">
                Background
              </label>
              <textarea
                value={careForm.care_background}
                onChange={(e) =>
                  setCareForm((prev) => ({ ...prev, care_background: e.target.value }))
                }
                rows={3}
                placeholder="Living situation, prior care history, timeline, or other context"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B8DB]/40"
              />

              <div className="mt-3 space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Services Wanted — Use Comma in Between
                </label>
                <input
                  type="text"
                  value={tagDrafts.desired_services}
                  onChange={(e) =>
                    setTagDrafts((prev) => ({
                      ...prev,
                      desired_services: e.target.value,
                    }))
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
                        className="rounded-full p-0.5 text-cyan-900/70 transition hover:bg-cyan-900/10 hover:text-cyan-900"
                        aria-label={`Remove ${item}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Amenities Wanted — Use Comma in Between
                </label>
                <input
                  type="text"
                  value={tagDrafts.desired_amenities}
                  onChange={(e) =>
                    setTagDrafts((prev) => ({
                      ...prev,
                      desired_amenities: e.target.value,
                    }))
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
                        className="rounded-full p-0.5 text-violet-900/70 transition hover:bg-violet-900/10 hover:text-violet-900"
                        aria-label={`Remove ${item}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
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

              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Images / Documents (optional)
                </label>
                <p className="mb-2 text-xs text-slate-500">
                  Upload images or PDFs (max 6 files, 8MB each). Images and PDFs are
                  reviewed by Carrie when you tap Get Recommendations.
                </p>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                  <ImagePlus className="h-4 w-4 text-[#00B8DB]" />
                  Add files
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
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
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
                          onClick={() =>
                            setNewFiles((prev) => prev.filter((_, i) => i !== index))
                          }
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

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={careLoading || recommendLoading}
                  className="rounded-lg bg-[#00B8DB] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {careLoading ? "Saving..." : "Save Medical Record"}
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
                    Fill bio, medical issues, preferences, and a 5-digit ZIP to unlock
                    recommendations (same Carrie / ChatGPT matching flow).
                  </p>
                ) : null}
              </div>
            </form>
          </TabsContent>
        ) : null}

        <TabsContent value="password" className="mt-4">
          <form
            onSubmit={handlePasswordUpdate}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Password</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword.oldPassword ? "text" : "password"}
                    value={passwordForm.oldPassword}
                    onChange={(e) => {
                      setPasswordForm((prev) => ({ ...prev, oldPassword: e.target.value }));
                      if (passwordErrors.oldPassword) {
                        setPasswordErrors((prev) => ({ ...prev, oldPassword: "" }));
                      }
                    }}
                    className={`h-10 w-full rounded-lg border px-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B8DB]/40 ${
                      passwordErrors.oldPassword ? "border-red-400" : "border-slate-200"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((prev) => ({
                        ...prev,
                        oldPassword: !prev.oldPassword,
                      }))
                    }
                    className="absolute inset-y-0 right-2 my-auto text-slate-500 hover:text-slate-700"
                    aria-label={showPassword.oldPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword.oldPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {passwordErrors.oldPassword ? (
                  <p className="mt-1 text-xs text-red-600">{passwordErrors.oldPassword}</p>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword.newPassword ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => {
                      setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }));
                      if (passwordErrors.newPassword || passwordErrors.confirmPassword) {
                        setPasswordErrors((prev) => ({
                          ...prev,
                          newPassword: "",
                          confirmPassword: "",
                        }));
                      }
                    }}
                    className={`h-10 w-full rounded-lg border px-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B8DB]/40 ${
                      passwordErrors.newPassword ? "border-red-400" : "border-slate-200"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((prev) => ({
                        ...prev,
                        newPassword: !prev.newPassword,
                      }))
                    }
                    className="absolute inset-y-0 right-2 my-auto text-slate-500 hover:text-slate-700"
                    aria-label={showPassword.newPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword.newPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {passwordErrors.newPassword ? (
                  <p className="mt-1 text-xs text-red-600">{passwordErrors.newPassword}</p>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword.confirmPassword ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => {
                      setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }));
                      if (passwordErrors.confirmPassword) {
                        setPasswordErrors((prev) => ({ ...prev, confirmPassword: "" }));
                      }
                    }}
                    className={`h-10 w-full rounded-lg border px-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B8DB]/40 ${
                      passwordErrors.confirmPassword ? "border-red-400" : "border-slate-200"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((prev) => ({
                        ...prev,
                        confirmPassword: !prev.confirmPassword,
                      }))
                    }
                    className="absolute inset-y-0 right-2 my-auto text-slate-500 hover:text-slate-700"
                    aria-label={
                      showPassword.confirmPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword.confirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {passwordErrors.confirmPassword ? (
                  <p className="mt-1 text-xs text-red-600">{passwordErrors.confirmPassword}</p>
                ) : null}
              </div>
            </div>
            <button
              type="submit"
              disabled={passwordLoading}
              className="mt-4 rounded-lg bg-[#132329] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              {passwordLoading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </TabsContent>
      </Tabs>

      <style>{`
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
