/** Dashboard stats helpers: last match count + intake draft → match prefs. */

export const LAST_MATCH_COUNT_KEY = "carematch_last_match_count_v1";
export const INTAKE_DRAFT_STORAGE_KEY = "carematch_intake_draft_v1";

const LEVEL_TO_CARE_LEVEL = {
  assisted: "assisted living",
  independent: "independent living",
  memory: "memory care",
  snf: "skilled nursing",
};

const CARE_TO_AMENITY = {
  dailyActivities: "24/7 Care",
  memoryCare: "Memory Care",
  medication: "Medication Management",
  mobilityAssist: "Mobility Assistance",
  medicalMonitoring: "Medical Monitoring",
  socialEngagement: "Social Engagement",
};

const SPECIAL_NEED_TO_AMENITY = {
  privateRoom: "Private Rooms",
  petFriendly: "Pet Friendly",
  physicalTherapy: "Therapy Services",
  respiratory: "Respiratory Support",
  dialysis: "Dialysis Access",
};

export function getLastMatchCount() {
  if (typeof sessionStorage === "undefined") return 0;
  const n = Number(sessionStorage.getItem(LAST_MATCH_COUNT_KEY));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

export function setLastMatchCount(count) {
  if (typeof sessionStorage === "undefined") return;
  const n = Number(count);
  if (!Number.isFinite(n) || n < 0) return;
  sessionStorage.setItem(LAST_MATCH_COUNT_KEY, String(Math.round(n)));
}

/**
 * Build matcher preferences from the saved intake draft (same shape as intake search).
 * Returns null when there is nothing usable to score with.
 */
export function buildMatchPreferencesFromIntakeDraft() {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(INTAKE_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    const formData = draft?.formData;
    if (!formData || typeof formData !== "object") return null;

    const careLevels = [];
    if (formData.levelOfCare && LEVEL_TO_CARE_LEVEL[formData.levelOfCare]) {
      careLevels.push(LEVEL_TO_CARE_LEVEL[formData.levelOfCare]);
    }

    const amenityMustHaves = [
      ...(formData.lovedOneCare || []).map((id) => CARE_TO_AMENITY[id]).filter(Boolean),
      ...(formData.specialNeedsPreferences || [])
        .map((id) => SPECIAL_NEED_TO_AMENITY[id])
        .filter(Boolean),
    ];

    const prefs = {
      careLevels: [...new Set(careLevels)],
      amenityMustHaves: [...new Set(amenityMustHaves)],
      budgetMinMonthly: Number(formData.budgetMin) || null,
      budgetMaxMonthly: Number(formData.budgetMax) || null,
      searchLocation: String(formData.location || "").trim(),
      maxDistanceMiles: Number(formData.maxTravelMiles) || null,
      visitationImportance: "medium",
      personalityNotes: "",
      snfReadiness: formData.levelOfCare === "snf",
      primaryCareType: careLevels[0] || "",
    };

    const hasCriteria =
      prefs.careLevels.length > 0 ||
      prefs.amenityMustHaves.length > 0 ||
      Boolean(prefs.budgetMaxMonthly) ||
      Boolean(prefs.searchLocation);

    return hasCriteria ? prefs : null;
  } catch {
    return null;
  }
}
