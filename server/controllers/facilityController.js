import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import validator from "email-validator";

import catchAsyncError from "../middleware/catchAsyncErrors.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FACILITY_UPLOAD_DIR = path.join(__dirname, "../uploads/facilities");

const safeRemoveFacilityImageFile = (relativePath) => {
  if (!relativePath || typeof relativePath !== "string") return;
  if (!relativePath.startsWith("/uploads/facilities/")) return;
  const base = path.basename(relativePath);
  if (!base || base === "." || base === "..") return;
  const abs = path.join(FACILITY_UPLOAD_DIR, base);
  const resolved = path.normalize(abs);
  if (!resolved.startsWith(path.normalize(FACILITY_UPLOAD_DIR))) return;
  fs.unlink(resolved, () => {});
};
import ErrorHandler from "../utils/errorHandler.js";
import sendMail from "../utils/sendMail.js";
import { greetingNameForEmail } from "../utils/greetingNameForEmail.js";
import { resolveClientBaseUrl } from "../utils/resolveClientBaseUrl.js";
import User from "../models/userModel.js";
import Facility from "../models/facilityModel.js";
import { RESET_PASSWORD_TOKEN_MINUTES } from "../config/authConstants.js";
import { OPENAI_CHAT_MODEL } from "../config/chatConstants.js";
import { getCareMatchResults } from "../scripts/results.js";
import { mapAiDiscoveryFacilityToMatchRow } from "../services/aiDiscoveryBridge.js";

const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const toOptionalString = (value) => {
  if (value == null) return "";
  return String(value).trim();
};

const syntheticExternalEmail = (sourcePlatform, externalRef) => {
  const rawSeed = `${sourcePlatform || "external"}-${externalRef || Date.now()}`;
  const seed = rawSeed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);
  const hash = crypto
    .createHash("sha1")
    .update(rawSeed)
    .digest("hex")
    .slice(0, 10);
  return `${seed || "external-facility"}-${hash}@external.carematch.local`;
};

const generateTemporaryPassword = () => {
  const random = crypto.randomBytes(8).toString("base64url").slice(0, 8);
  return `CmAI!${random}9`;
};

const APIFY_DEFAULT_ACTOR_ID =
  process.env.APIFY_ACTOR_ID || "compass/crawler-google-places";
const APIFY_BASE_URL = "https://api.apify.com/v2";

const pickFirstNonEmpty = (obj, keys) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (value != null && String(value).trim() !== "") return value;
  }
  return "";
};

const toNumberOrNull = (value) => {
  if (value == null || value === "") return null;
  const parsed = Number(String(value).replace(/[^\d.-]+/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const toMonthlyPricingText = (rawValue) => {
  const raw = toOptionalString(rawValue);
  if (!raw) return "";
  if (/\$|month|mo|\/m|weekly|week|daily|day|year|yr/i.test(raw)) return raw;
  const parsed = toNumberOrNull(raw);
  if (parsed == null || parsed <= 0) return raw;
  return `$${parsed.toLocaleString("en-US")}/mo`;
};

const toOptionalNumber = (value) => {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const splitAddressCityStateZip = (addressText) => {
  const raw = toOptionalString(addressText);
  if (!raw) return { city: "", state: "", zipCode: "" };
  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) return { city: "", state: "", zipCode: "" };
  const city = parts[parts.length - 2] || "";
  const stateZipPart = parts[parts.length - 1] || "";
  const stateMatch = stateZipPart.match(/\b([A-Z]{2})\b/i);
  const zipMatch = stateZipPart.match(/\b(\d{5}(?:-\d{4})?)\b/);
  return {
    city,
    state: stateMatch ? stateMatch[1].toUpperCase() : "",
    zipCode: zipMatch ? zipMatch[1] : "",
  };
};

const toIntOrZero = (value) => {
  if (value == null || value === "") return 0;
  const parsed = Number.parseInt(String(value).replace(/[^\d-]+/g, ""), 10);
  if (Number.isNaN(parsed) || parsed < 0) return 0;
  return parsed;
};

const pushIfPresent = (arr, label, value) => {
  if (value == null || value === "") return;
  arr.push(`${label}: ${value}`);
};

const toStringArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .flatMap((x) => toStringArray(x))
      .map((x) => String(x || "").trim())
      .filter(Boolean);
  }
  if (typeof value === "object") {
    if (
      Object.prototype.hasOwnProperty.call(value, "day") &&
      Object.prototype.hasOwnProperty.call(value, "hours")
    ) {
      const day = String(value.day || "").trim();
      const hours = String(value.hours || "").trim();
      return day && hours ? [`${day}: ${hours}`] : [];
    }

    const out = [];
    Object.entries(value).forEach(([k, v]) => {
      if (Array.isArray(v)) {
        v.forEach((entry) => {
          if (entry && typeof entry === "object") {
            Object.entries(entry).forEach(([subKey, subVal]) => {
              if (typeof subVal === "boolean") {
                out.push(`${k} - ${subKey}: ${subVal ? "Yes" : "No"}`);
              } else if (subVal != null && String(subVal).trim() !== "") {
                out.push(`${k} - ${subKey}: ${String(subVal).trim()}`);
              }
            });
          } else if (entry != null && String(entry).trim() !== "") {
            out.push(`${k}: ${String(entry).trim()}`);
          }
        });
      } else if (v != null && String(v).trim() !== "") {
        out.push(`${String(k)}: ${String(v).trim()}`);
      }
    });
    return out;
  }
  const single = String(value).trim();
  return single ? [single] : [];
};

const inferCareLevelsFromText = (...values) => {
  const text = values
    .map((v) => String(v || "").toLowerCase())
    .join(" ");
  const levels = [];
  if (/skilled nursing|nursing home|snf|rehab center/i.test(text)) {
    levels.push("Skilled Nursing");
  }
  if (/assisted living|assisted/i.test(text)) {
    levels.push("Assisted Living");
  }
  if (/memory care|dementia|alzheimer/i.test(text)) {
    levels.push("Memory Care");
  }
  if (/independent living/i.test(text)) {
    levels.push("Independent Living");
  }
  return [...new Set(levels)];
};

const parseJsonEnvObject = (envName) => {
  const raw = String(process.env[envName] || "").trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const parseJsonObjectFromText = (text) => {
  const raw = String(text || "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      try {
        return JSON.parse(fenced[1]);
      } catch {
        return null;
      }
    }
    return null;
  }
};

const normalizeStringList = (value, limit = 16) => {
  const list = Array.isArray(value) ? value : [];
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const s = String(item || "").trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= limit) break;
  }
  return out;
};

const enrichFacilityListsWithGpt = async (rawRecord, fallback = {}) => {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey || !rawRecord || typeof rawRecord !== "object") {
    return {
      services: normalizeStringList(fallback.services),
      amenities: normalizeStringList(fallback.amenities),
      care_levels: normalizeStringList(fallback.care_levels),
    };
  }

  const systemPrompt =
    "You classify senior-care listing metadata. Return strict JSON only with keys services, amenities, care_levels. Each value must be an array of short strings. No markdown, no explanations.";
  const userPrompt = JSON.stringify({
    task: "Extract practical fields for a senior-care directory.",
    rules: {
      care_levels_allowed: [
        "Skilled Nursing",
        "Assisted Living",
        "Memory Care",
        "Independent Living",
        "Continuing Care",
        "Rehabilitation",
      ],
      max_items_each: 12,
    },
    listing: rawRecord,
    fallback,
  });

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_CHAT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 400,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        services: normalizeStringList(fallback.services),
        amenities: normalizeStringList(fallback.amenities),
        care_levels: normalizeStringList(fallback.care_levels),
      };
    }
    const content = data?.choices?.[0]?.message?.content || "";
    const parsed = parseJsonObjectFromText(content) || {};
    return {
      services: normalizeStringList(parsed.services || fallback.services),
      amenities: normalizeStringList(parsed.amenities || fallback.amenities),
      care_levels: normalizeStringList(parsed.care_levels || fallback.care_levels),
    };
  } catch {
    return {
      services: normalizeStringList(fallback.services),
      amenities: normalizeStringList(fallback.amenities),
      care_levels: normalizeStringList(fallback.care_levels),
    };
  }
};

const normalizeApifyFacilityRow = (row = {}) => {
  const parsedAddress = splitAddressCityStateZip(
    pickFirstNonEmpty(row, ["address", "formattedAddress", "fullAddress"])
  );
  const providerName = toOptionalString(
    pickFirstNonEmpty(row, ["providerName", "name", "title", "placeName", "Provider Name"])
  );
  const city = toOptionalString(pickFirstNonEmpty(row, ["city", "City"])) || parsedAddress.city;
  const state =
    toOptionalString(pickFirstNonEmpty(row, ["state", "State"])) || parsedAddress.state;
  const zipCode = toOptionalString(
    pickFirstNonEmpty(row, ["zipCode", "zip", "zipcode", "postalCode", "ZIP Code"])
  );
  const phoneNumber = toOptionalString(
    pickFirstNonEmpty(row, [
      "phoneNumber",
      "phone",
      "internationalPhoneNumber",
      "formattedPhoneNumber",
      "Phone Number",
    ])
  );
  const providerUrl = toOptionalString(
    pickFirstNonEmpty(row, [
      "providerUrl",
      "providerURL",
      "url",
      "website",
      "googleMapsUrl",
      "Provider URL",
      "profileUrl",
    ])
  );
  const overallRatingRaw = pickFirstNonEmpty(row, [
    "overallRating",
    "overall_star_rating",
    "Overall Rating",
  ]);
  const finesRaw = pickFirstNonEmpty(row, [
    "totalFinesAmount",
    "totalFines",
    "total_fines_amount",
    "Total Fines Amount",
  ]);
  const overallRating =
    toNumberOrNull(overallRatingRaw) ??
    toOptionalNumber(pickFirstNonEmpty(row, ["rating", "stars"]));
  const totalFinesAmount = toNumberOrNull(finesRaw);
  const pricingRaw = pickFirstNonEmpty(row, [
    "pricing",
    "price",
    "monthlyPrice",
    "monthlyCost",
    "averageMonthlyCost",
    "avgMonthlyCost",
    "estimatedMonthlyCost",
    "privatePayRate",
    "costPerMonth",
    "Price",
    "Monthly Price",
    "Monthly Cost",
    "Estimated Monthly Cost",
  ]);
  const pricing = toMonthlyPricingText(pricingRaw);
  const certifiedBeds = toIntOrZero(
    pickFirstNonEmpty(row, ["certifiedBeds", "Certified Beds"])
  );
  const licensedBeds = toIntOrZero(
    pickFirstNonEmpty(row, ["licensedBeds", "Licensed Beds"])
  );
  const medicareCertifiedBeds = toIntOrZero(
    pickFirstNonEmpty(row, ["medicareCertifiedBeds", "Medicare Certified Beds"])
  );
  const medicaidCertifiedBeds = toIntOrZero(
    pickFirstNonEmpty(row, ["medicaidCertifiedBeds", "Medicaid Certified Beds"])
  );
  const continuingCareBeds = toIntOrZero(
    pickFirstNonEmpty(row, ["continuingCareBeds", "Continuing Care Beds"])
  );
  const totalResidentCount = toIntOrZero(
    pickFirstNonEmpty(row, ["totalResidentCount", "Total Resident Count"])
  );
  const residentsLess90Days = toIntOrZero(
    pickFirstNonEmpty(row, ["residentsLess90Days", "residents<90Days", "Residents <90 Days"])
  );
  const residents90PlusDays = toIntOrZero(
    pickFirstNonEmpty(row, ["residents90PlusDays", "residents90+Days", "Residents 90+ Days"])
  );

  const staffingRating = pickFirstNonEmpty(row, ["staffingRating", "Staffing Rating"]);
  const healthInspectionRating = pickFirstNonEmpty(row, [
    "healthInspectionRating",
    "Health Inspection Rating",
  ]);
  const qualityMeasureRating = pickFirstNonEmpty(row, [
    "qualityMeasureRating",
    "Quality Measure Rating",
  ]);
  const ownershipType = toOptionalString(
    pickFirstNonEmpty(row, ["ownershipType", "Ownership Type"])
  );
  const ownershipInformation = toOptionalString(
    pickFirstNonEmpty(row, ["ownershipInformation", "Ownership Information"])
  );
  const deficiencyCount = toIntOrZero(
    pickFirstNonEmpty(row, ["deficiencyCount", "Deficiency Count"])
  );
  const severeDeficiencyCount = toIntOrZero(
    pickFirstNonEmpty(row, ["severeDeficiencyCount", "Severe Deficiency Count"])
  );
  const totalPenaltiesCount = toIntOrZero(
    pickFirstNonEmpty(row, ["totalPenaltiesCount", "Total Penalties Count"])
  );
  const seriousBodilyInjuryCount = toIntOrZero(
    pickFirstNonEmpty(row, ["seriousBodilyInjuryCount", "Serious Bodily Injury Count"])
  );

  const units =
    certifiedBeds ||
    licensedBeds ||
    medicareCertifiedBeds ||
    medicaidCertifiedBeds ||
    continuingCareBeds ||
    0;
  const occupancy =
    units > 0 && totalResidentCount > 0
      ? Math.min(100, Math.round((totalResidentCount / units) * 100))
      : 0;
  const activeLeads =
    residentsLess90Days ||
    (totalPenaltiesCount > 0 ? Math.min(totalPenaltiesCount, 100) : 0);

  const services = [];
  pushIfPresent(services, "Health Inspection Rating", healthInspectionRating);
  pushIfPresent(services, "Quality Measure Rating", qualityMeasureRating);
  pushIfPresent(services, "Staffing Rating", staffingRating);
  if (totalResidentCount > 0) services.push(`Total Residents: ${totalResidentCount}`);
  if (residentsLess90Days > 0) services.push(`Residents <90 Days: ${residentsLess90Days}`);
  if (residents90PlusDays > 0) services.push(`Residents 90+ Days: ${residents90PlusDays}`);

  const amenities = [];
  if (ownershipType) amenities.push(`Ownership: ${ownershipType}`);
  if (ownershipInformation) amenities.push(`Ownership Info: ${ownershipInformation}`);
  if (deficiencyCount > 0) amenities.push(`Deficiency Count: ${deficiencyCount}`);
  if (severeDeficiencyCount > 0)
    amenities.push(`Severe Deficiency Count: ${severeDeficiencyCount}`);
  if (totalFinesAmount != null && totalFinesAmount > 0) {
    amenities.push(`Total Fines: $${totalFinesAmount.toLocaleString("en-US")}`);
  }
  if (seriousBodilyInjuryCount > 0) {
    amenities.push(`Serious Bodily Injury Count: ${seriousBodilyInjuryCount}`);
  }
  if (medicareCertifiedBeds > 0) {
    amenities.push(`Medicare Certified Beds: ${medicareCertifiedBeds}`);
  }
  if (medicaidCertifiedBeds > 0) {
    amenities.push(`Medicaid Certified Beds: ${medicaidCertifiedBeds}`);
  }

  const placeTypes = Array.isArray(row?.types)
    ? row.types.map((x) => String(x || "").toLowerCase())
    : [];
  const categories = toStringArray(
    pickFirstNonEmpty(row, ["categories", "categoryName", "category"])
  );
  const careLevels = inferCareLevelsFromText(
    providerName,
    categories.join(" "),
    placeTypes.join(" ")
  );
  if (continuingCareBeds > 0) careLevels.push("Continuing Care");

  const mapsUrl = toOptionalString(pickFirstNonEmpty(row, ["googleMapsUrl", "mapsUrl", "url"]));
  const placeId = toOptionalString(
    pickFirstNonEmpty(row, ["placeId", "place_id", "id"])
  );
  const category = toOptionalString(
    pickFirstNonEmpty(row, ["categoryName", "category", "subTitle", "subtitle"])
  );
  const subtitle = toOptionalString(pickFirstNonEmpty(row, ["subTitle", "subtitle"]));
  const website = toOptionalString(pickFirstNonEmpty(row, ["website"]));
  const plusCode = toOptionalString(pickFirstNonEmpty(row, ["plusCode", "plus_code"]));
  const latitude =
    toOptionalNumber(pickFirstNonEmpty(row, ["latitude", "lat"])) ??
    toOptionalNumber(row?.coordinates?.lat) ??
    toOptionalNumber(row?.location?.lat);
  const longitude =
    toOptionalNumber(pickFirstNonEmpty(row, ["longitude", "lng", "lon"])) ??
    toOptionalNumber(row?.coordinates?.lng) ??
    toOptionalNumber(row?.location?.lng);
  const totalScore =
    toOptionalNumber(pickFirstNonEmpty(row, ["totalScore", "rating", "stars"])) ??
    null;
  const reviewCount = toIntOrZero(
    pickFirstNonEmpty(row, ["reviewsCount", "reviewCount", "totalReviews"])
  );
  const priceBracket = toOptionalString(
    pickFirstNonEmpty(row, ["priceBracket", "priceLevel"])
  );
  const closedStatus = toOptionalString(
    pickFirstNonEmpty(row, ["temporarilyClosed", "permanentlyClosed", "closed"])
  );
  const openingHours = toStringArray(
    pickFirstNonEmpty(row, ["openingHours", "opening_hours", "workingHours"])
  );
  const additionalInfo = toStringArray(
    pickFirstNonEmpty(row, ["additionalInfo", "additional_info"])
  );
  const socialProfiles = toStringArray(
    pickFirstNonEmpty(row, ["socialMedia", "socialProfiles", "social_profiles"])
  );
  const peopleAlsoSearch = toStringArray(
    pickFirstNonEmpty(row, ["peopleAlsoSearch", "people_also_search"])
  );
  const menuItems = toStringArray(pickFirstNonEmpty(row, ["menu", "menus"]));
  const questionsAndAnswers = toStringArray(
    pickFirstNonEmpty(row, ["questionsAndAnswers", "qaUpdates", "qna"])
  );
  const images = toStringArray(
    pickFirstNonEmpty(row, [
      "images",
      "imageUrls",
      "photos",
      "imageUrl",
      "image",
      "thumbnail",
      "thumbnailUrl",
    ])
  );

  // Enrich display fields from Google Places if source values are missing.
  if (!providerUrl && (website || mapsUrl)) {
    // no-op: this is used in return object below
  }

  return {
    providerName,
    city,
    state,
    zipCode,
    phoneNumber,
    overallRating,
    totalFinesAmount,
    providerUrl,
    pricing,
    services: [...new Set([...services, ...categories.slice(0, 6)])],
    amenities,
    careLevels: [...new Set(careLevels)],
    units,
    occupancy,
    activeLeads,
    googlePlaces: {
      category,
      subtitle,
      place_id: placeId,
      maps_url: mapsUrl,
      website,
      plus_code: plusCode,
      latitude,
      longitude,
      total_score: totalScore,
      review_count: reviewCount || null,
      price_bracket: priceBracket,
      closed_status: closedStatus,
      opening_hours: openingHours,
      additional_info: additionalInfo,
      social_profiles: socialProfiles,
      people_also_search: peopleAlsoSearch,
    },
    rawRow: row,
    menuItems,
    questionsAndAnswers,
    mappedImages: images,
  };
};

const toExternalFacilityDoc = (normalizedRow, actorId = APIFY_DEFAULT_ACTOR_ID) => {
  const {
    providerName,
    city,
    state,
    zipCode,
    phoneNumber,
    overallRating,
    totalFinesAmount,
    providerUrl,
    pricing,
    services,
    amenities,
    careLevels,
    units,
    occupancy,
    activeLeads,
    googlePlaces,
    rawRow,
    menuItems,
    questionsAndAnswers,
    mappedImages,
  } = normalizedRow;

  const locationParts = [city, state, zipCode].filter(Boolean);
  const address = locationParts.join(", ") || "N/A";
  const externalRef = providerUrl || `${providerName}::${city}::${state}::${zipCode}`;
  const ratingText = overallRating == null ? "N/A" : String(overallRating);
  const finesText = totalFinesAmount == null ? "N/A" : `$${totalFinesAmount.toLocaleString("en-US")}`;

  return {
    is_external: true,
    source_platform: "apify",
    external_ref: externalRef,
    email: syntheticExternalEmail("apify", externalRef),
    name: providerName || "Unknown Provider",
    phone: phoneNumber || "N/A",
    address,
    website: providerUrl || googlePlaces?.website || googlePlaces?.maps_url || "",
    specialty:
      actorId.includes("google-places") && Array.isArray(googlePlaces?.additional_info)
        ? [...new Set((googlePlaces.additional_info || []).slice(0, 6))]
        : actorId.includes("google-places")
          ? ["Senior Care"]
          : ["Skilled Nursing"],
    description: `CMS overall rating: ${ratingText}. Total fines amount: ${finesText}.`,
    services: Array.isArray(services) ? services : [],
    amenities: Array.isArray(amenities) ? amenities : [],
    care_levels: Array.isArray(careLevels) ? careLevels : ["Skilled Nursing"],
    pricing: pricing || "",
    images: Array.isArray(mappedImages)
      ? mappedImages
          .filter((url) => /^https?:\/\//i.test(String(url || "").trim()))
          .slice(0, 8)
      : [],
    units: units || 0,
    occupancy: occupancy || 0,
    active_leads: activeLeads || 0,
    apify_raw: rawRow || null,
    external_data: {
      provider_name: providerName,
      city,
      state,
      zip_code: zipCode,
      phone_number: phoneNumber,
      overall_rating: overallRating,
      total_fines_amount: totalFinesAmount,
      provider_url: providerUrl,
      pricing: pricing || "",
      google_places: {
        ...(googlePlaces || {}),
      },
    },
  };
};

const upsertExternalFacilities = async (records) => {
  let created = 0;
  let updated = 0;

  for (const item of records) {
    const existing = await Facility.findOne({
      is_external: true,
      source_platform: item.source_platform,
      external_ref: item.external_ref,
    });

    try {
      if (existing) {
        Object.assign(existing, item);
        await existing.save();
        updated += 1;
      } else {
        await Facility.create(item);
        created += 1;
      }
    } catch (error) {
      // Handle legacy/email collisions by reusing existing row keyed by email.
      if (error?.code === 11000 && item?.email) {
        const byEmail = await Facility.findOne({ email: item.email });
        if (byEmail) {
          Object.assign(byEmail, item);
          await byEmail.save();
          updated += 1;
          continue;
        }
      }
      throw error;
    }
  }

  return { created, updated };
};

export const syncFacilitiesFromApify = async (actorInput = {}) => {
  const apifyToken = process.env.APIFY_TOKEN;
  if (!apifyToken) {
    throw new Error("APIFY_TOKEN is required in environment variables");
  }

  const actorId = toOptionalString(actorInput?.actorId) || APIFY_DEFAULT_ACTOR_ID;
  const defaultActorInput = parseJsonEnvObject("APIFY_SYNC_ACTOR_INPUT_JSON");
  const envEnrich = String(process.env.APIFY_ENRICH_WITH_GPT || "true").toLowerCase();
  const explicitActorFlag =
    typeof actorInput?.enrichWithGpt === "boolean"
      ? actorInput.enrichWithGpt
      : null;
  const enrichWithGpt =
    explicitActorFlag != null ? explicitActorFlag : envEnrich !== "false";
  const actorPayload =
    actorInput && typeof actorInput === "object" ? { ...actorInput } : {};
  delete actorPayload.actorId;
  delete actorPayload.enrichWithGpt;
  const safeActorInput =
    actorPayload && typeof actorPayload === "object"
      ? { ...defaultActorInput, ...actorPayload }
      : { ...defaultActorInput };

  if (actorId.includes("compass/crawler-google-places")) {
    const hasSearchStrings =
      Array.isArray(safeActorInput.searchStringsArray) &&
      safeActorInput.searchStringsArray.length > 0;
    const hasCategories =
      Array.isArray(safeActorInput.categoryFilterWords) &&
      safeActorInput.categoryFilterWords.length > 0;
    const hasStartUrls =
      Array.isArray(safeActorInput.startUrls) && safeActorInput.startUrls.length > 0;
    const scrapeAll = Boolean(safeActorInput.allPlacesNoSearchAction);

    if (!hasSearchStrings && !hasCategories && !hasStartUrls && !scrapeAll) {
      throw new Error(
        "Invalid actorInput for compass/crawler-google-places. Provide at least one of: searchStringsArray, categoryFilterWords, startUrls, or allPlacesNoSearchAction=true."
      );
    }

    // Keep actor-side crawl bounded when caller provides maxItems.
    const maxItems = Number.parseInt(String(safeActorInput.maxItems || ""), 10);
    if (
      Number.isFinite(maxItems) &&
      maxItems > 0 &&
      !Number.isFinite(Number(safeActorInput.maxCrawledPlacesPerSearch))
    ) {
      safeActorInput.maxCrawledPlacesPerSearch = maxItems;
    }
  }
  const runUrl = `${APIFY_BASE_URL}/acts/${encodeURIComponent(actorId)}/runs?token=${encodeURIComponent(apifyToken)}`;

  const runResponse = await fetch(runUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(safeActorInput),
  });

  if (!runResponse.ok) {
    const errorText = await runResponse.text();
    throw new Error(`Failed to start Apify actor run: ${errorText}`);
  }

  const runPayload = await runResponse.json();
  const runId = runPayload?.data?.id;
  if (!runId) {
    throw new Error("Apify run started but run id is missing");
  }

  const maxWaitSeconds = Number.parseInt(
    String(process.env.APIFY_RUN_MAX_WAIT_SECONDS || "900"),
    10
  );
  const waitChunkSeconds = Number.parseInt(
    String(process.env.APIFY_RUN_WAIT_CHUNK_SECONDS || "120"),
    10
  );
  const timeoutAt = Date.now() + Math.max(60, maxWaitSeconds) * 1000;
  let waitPayload = null;
  let runStatus = "RUNNING";
  let datasetId = "";

  while (Date.now() < timeoutAt) {
    const waitUrl = `${APIFY_BASE_URL}/actor-runs/${encodeURIComponent(runId)}?waitForFinish=${Math.max(
      5,
      waitChunkSeconds
    )}&token=${encodeURIComponent(apifyToken)}`;
    const waitResponse = await fetch(waitUrl);
    if (!waitResponse.ok) {
      const errorText = await waitResponse.text();
      throw new Error(`Failed while waiting for Apify run: ${errorText}`);
    }

    waitPayload = await waitResponse.json();
    runStatus = waitPayload?.data?.status || "UNKNOWN";
    datasetId = waitPayload?.data?.defaultDatasetId || "";

    if (runStatus === "SUCCEEDED") break;
    if (["FAILED", "ABORTED", "TIMED-OUT"].includes(runStatus)) {
      const statusMessage = waitPayload?.data?.statusMessage
        ? ` (${waitPayload.data.statusMessage})`
        : "";
      throw new Error(
        `Apify run did not succeed. Current status: ${runStatus}${statusMessage}`
      );
    }
  }

  if (runStatus !== "SUCCEEDED" || !datasetId) {
    throw new Error(
      `Apify run is still ${runStatus || "RUNNING"} after waiting ${Math.max(
        60,
        maxWaitSeconds
      )} seconds`
    );
  }

  const datasetUrl = `${APIFY_BASE_URL}/datasets/${encodeURIComponent(datasetId)}/items?clean=true&token=${encodeURIComponent(apifyToken)}`;
  const datasetResponse = await fetch(datasetUrl);
  if (!datasetResponse.ok) {
    const errorText = await datasetResponse.text();
    throw new Error(`Failed to fetch Apify dataset items: ${errorText}`);
  }

  const rows = await datasetResponse.json();
  const maxItemsLimit = Number.parseInt(String(safeActorInput.maxItems || ""), 10);
  const limitedRows =
    Array.isArray(rows) && Number.isFinite(maxItemsLimit) && maxItemsLimit > 0
      ? rows.slice(0, maxItemsLimit)
      : rows;
  const normalized = Array.isArray(rows)
    ? limitedRows
        .map(normalizeApifyFacilityRow)
        .filter((item) => item.providerName)
    : [];

  if (normalized.length === 0) {
    throw new Error("Apify returned no valid nursing home records");
  }

  let normalizedRows = normalized;
  if (enrichWithGpt) {
    const enriched = [];
    for (const item of normalized) {
      const gpt = await enrichFacilityListsWithGpt(item.rawRow, {
        services: item.services,
        amenities: item.amenities,
        care_levels: item.careLevels,
      });
      enriched.push({
        ...item,
        services: gpt.services,
        amenities: gpt.amenities,
        careLevels: gpt.care_levels,
      });
    }
    normalizedRows = enriched;
  }

  const prepared = normalizedRows.map((item) => toExternalFacilityDoc(item, actorId));
  const { created, updated } = await upsertExternalFacilities(prepared);

  return {
    actor: actorId,
    runId,
    totalScraped: normalizedRows.length,
    created,
    updated,
    gptEnriched: enrichWithGpt,
    fields: normalizedRows.map((item) => ({
      provider_name: item.providerName,
      city: item.city,
      state: item.state,
      zip_code: item.zipCode,
      phone_number: item.phoneNumber,
      overall_rating: item.overallRating,
      total_fines_amount: item.totalFinesAmount,
      provider_url: item.providerUrl,
      pricing: item.pricing || "",
      services: item.services || [],
      amenities: item.amenities || [],
      care_levels: item.careLevels || [],
      units: item.units || 0,
      occupancy: item.occupancy || 0,
      active_leads: item.activeLeads || 0,
      google_places: item.googlePlaces || {},
    })),
  };
};

export const createFacility = catchAsyncError(async (req, res, next) => {
  const adminId = req.user?.id;
  const admin = await User.findById(adminId);

  if (!admin || admin.user_type !== "admin") {
    return next(new ErrorHandler("Only admins can create facilities", 403));
  }

  const {
    name,
    email,
    phone,
    address,
    website,
    specialty,
    description,
    services,
    amenities,
    care_levels,
    units,
    occupancy,
    active_leads,
    pricing,
  } = req.body;

  if (!validator.validate(email)) {
    return next(new ErrorHandler("Invalid facility email", 400));
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new ErrorHandler("A user with this email already exists", 400));
  }

  const existingFacility = await Facility.findOne({ email });
  if (existingFacility) {
    return next(new ErrorHandler("A facility with this email already exists", 400));
  }

  const temporaryPassword = generateTemporaryPassword();
  const normalizedServices = toArray(services);
  const normalizedAmenities = toArray(amenities);
  const normalizedSpecialty = toArray(specialty);
  const normalizedUnits = Number(units) || 0;
  const normalizedOccupancy = Number(occupancy) || 0;
  const normalizedActiveLeads = Number(active_leads) || 0;
  const normalizedCareLevels = toArray(care_levels);
  const uploadedImages = Array.isArray(req.files)
    ? req.files.map((file) => `/uploads/facilities/${file.filename}`)
    : [];

  const facilityUser = await User.create({
    name,
    email,
    password: temporaryPassword,
    phone,
    is_verified: true,
    user_type: "user",
    role: "facility",
  });

  const facility = await Facility.create({
    name,
    email,
    phone,
    address,
    website: toOptionalString(website),
    specialty: normalizedSpecialty,
    description: toOptionalString(description),
    services: normalizedServices,
    amenities: normalizedAmenities,
    care_levels: normalizedCareLevels,
    pricing,
    units: normalizedUnits,
    occupancy: normalizedOccupancy,
    active_leads: normalizedActiveLeads,
    images: uploadedImages,
    created_by: admin._id,
    user_id: facilityUser._id,
  });

  const resetToken = facilityUser.getToken(RESET_PASSWORD_TOKEN_MINUTES);
  await facilityUser.save({ validateBeforeSave: false });

  const clientBaseUrl = resolveClientBaseUrl(req);
  const resetLink = `${clientBaseUrl}/reset-password?token=${resetToken}`;
  const loginUrl = `${clientBaseUrl}/signin`;

  try {
    await sendMail({
      email: facilityUser.email,
      subject: "Your CareMatch AI facility account is ready",
      template: "facility-onboarding.ejs",
      data: {
        user: { name: greetingNameForEmail(facilityUser) },
        facility: { name: facility.name },
        username: facilityUser.email,
        temporaryPassword,
        loginUrl,
        resetLink,
      },
    });
  } catch (error) {
    await Facility.deleteOne({ _id: facility._id });
    await User.deleteOne({ _id: facilityUser._id });
    return next(new ErrorHandler("Facility created but invite email failed to send", 500));
  }

  res.status(201).json({
    success: true,
    message:
      "Facility created successfully. Credentials and password reset link sent by email.",
    facility,
  });
});

export const listFacilities = catchAsyncError(async (req, res, next) => {
  const adminId = req.user?.id;
  const admin = await User.findById(adminId);

  if (!admin || admin.user_type !== "admin") {
    return next(new ErrorHandler("Only admins can list facilities", 403));
  }

  const parsedPage = Number.parseInt(req.query.page, 10);
  const parsedLimit = Number.parseInt(req.query.limit, 10);
  const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  const limit = Number.isNaN(parsedLimit) || parsedLimit < 1 ? 10 : Math.min(parsedLimit, 100);
  const skip = (page - 1) * limit;

  const [facilities, total] = await Promise.all([
    Facility.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Facility.countDocuments(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  res.status(200).json({
    success: true,
    facilities,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
});

export const listPublicFacilities = catchAsyncError(async (req, res) => {
  const parsedLimit = Number.parseInt(req.query.limit, 10);
  const limit = Number.isNaN(parsedLimit) || parsedLimit < 1 ? 100 : Math.min(parsedLimit, 500);
  const externalOnly = String(req.query.externalOnly || "").toLowerCase() === "true";
  const query = externalOnly ? { is_external: true } : {};

  const facilities = await Facility.find(query)
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();

  res.status(200).json({
    success: true,
    count: facilities.length,
    facilities,
  });
});

const assertAdmin = async (userId) => {
  const admin = await User.findById(userId);
  if (!admin || admin.user_type !== "admin") {
    return null;
  }
  return admin;
};

const assertFacilityUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user || user.role !== "facility") {
    return null;
  }
  return user;
};

export const getMyFacility = catchAsyncError(async (req, res, next) => {
  const facilityUser = await assertFacilityUser(req.user?.id);
  if (!facilityUser) {
    return next(new ErrorHandler("Only facility users can access this resource", 403));
  }

  const facility = await Facility.findOne({ user_id: facilityUser._id }).lean();
  if (!facility) {
    return next(new ErrorHandler("Facility profile not found for this account", 404));
  }

  res.status(200).json({
    success: true,
    facility,
  });
});

export const updateMyFacility = catchAsyncError(async (req, res, next) => {
  const facilityUser = await assertFacilityUser(req.user?.id);
  if (!facilityUser) {
    return next(new ErrorHandler("Only facility users can update this resource", 403));
  }

  const facility = await Facility.findOne({ user_id: facilityUser._id });
  if (!facility) {
    return next(new ErrorHandler("Facility profile not found for this account", 404));
  }

  const {
    name,
    phone,
    address,
    pricing,
    website,
    specialty,
    description,
    services,
    amenities,
    care_levels,
    units,
    occupancy,
    active_leads,
  } = req.body;

  if (name != null) {
    const trimmed = String(name).trim();
    if (!trimmed) return next(new ErrorHandler("Facility name cannot be empty", 400));
    facility.name = trimmed;
    facilityUser.name = trimmed;
  }

  if (phone != null) {
    const trimmed = String(phone).trim();
    if (!trimmed) return next(new ErrorHandler("Phone cannot be empty", 400));
    facility.phone = trimmed;
    facilityUser.phone = trimmed;
  }

  if (address != null) {
    const trimmed = String(address).trim();
    if (!trimmed) return next(new ErrorHandler("Address cannot be empty", 400));
    facility.address = trimmed;
  }

  if (pricing != null) {
    facility.pricing = String(pricing).trim();
  }

  if (website != null) {
    facility.website = toOptionalString(website);
  }
  if (specialty != null) {
    facility.specialty = toArray(specialty);
  }
  if (description != null) {
    facility.description = toOptionalString(description);
  }

  if (services != null) {
    facility.services = toArray(services);
  }

  if (amenities != null) {
    facility.amenities = toArray(amenities);
  }

  if (care_levels != null) {
    facility.care_levels = toArray(care_levels);
  }

  if (units != null && units !== "") {
    facility.units = Math.max(0, Number(units) || 0);
  }
  if (occupancy != null && occupancy !== "") {
    facility.occupancy = Math.max(0, Number(occupancy) || 0);
  }
  if (active_leads != null && active_leads !== "") {
    facility.active_leads = Math.max(0, Number(active_leads) || 0);
  }

  await Promise.all([facility.save(), facilityUser.save()]);

  res.status(200).json({
    success: true,
    message: "Facility profile updated successfully.",
    facility,
  });
});

export const getFacility = catchAsyncError(async (req, res, next) => {
  const admin = await assertAdmin(req.user?.id);
  if (!admin) {
    return next(new ErrorHandler("Only admins can view facility details", 403));
  }

  const facility = await Facility.findById(req.params.id).lean();
  if (!facility) {
    return next(new ErrorHandler("Facility not found", 404));
  }

  res.status(200).json({
    success: true,
    facility,
  });
});

export const updateFacility = catchAsyncError(async (req, res, next) => {
  const admin = await assertAdmin(req.user?.id);
  if (!admin) {
    return next(new ErrorHandler("Only admins can update facilities", 403));
  }

  const facility = await Facility.findById(req.params.id);
  if (!facility) {
    return next(new ErrorHandler("Facility not found", 404));
  }

  const {
    name,
    email,
    phone,
    address,
    website,
    specialty,
    description,
    services,
    amenities,
    care_levels,
    pricing,
    units,
    occupancy,
    active_leads,
  } = req.body;

  if (!validator.validate(email)) {
    return next(new ErrorHandler("Invalid facility email", 400));
  }

  const normalizedEmail = email.toLowerCase().trim();

  const normalizedServices = toArray(services);
  const normalizedAmenities = toArray(amenities);
  const normalizedCareLevels = toArray(care_levels);
  const normalizedSpecialty = toArray(specialty);
  const normalizedUnits = Number(units) || 0;
  const normalizedOccupancy = Number(occupancy) || 0;
  const normalizedActiveLeads = Number(active_leads) || 0;
  let keepPaths = facility.images || [];
  try {
    if (req.body.keep_image_paths != null && req.body.keep_image_paths !== "") {
      const parsed = JSON.parse(req.body.keep_image_paths);
      if (Array.isArray(parsed)) {
        keepPaths = parsed.filter(
          (p) => typeof p === "string" && (facility.images || []).includes(p)
        );
      }
    }
  } catch {
    keepPaths = facility.images || [];
  }

  const newUploads = Array.isArray(req.files)
    ? req.files.map((file) => `/uploads/facilities/${file.filename}`)
    : [];

  const previousImages = facility.images || [];
  const mergedImages = [...keepPaths, ...newUploads].slice(0, 8);

  previousImages.forEach((oldPath) => {
    if (!mergedImages.includes(oldPath)) {
      safeRemoveFacilityImageFile(oldPath);
    }
  });

  if (normalizedEmail !== facility.email) {
    const duplicateUser = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: facility.user_id },
    });
    if (duplicateUser) {
      return next(new ErrorHandler("Another account already uses this email", 400));
    }
    const duplicateFacility = await Facility.findOne({
      email: normalizedEmail,
      _id: { $ne: facility._id },
    });
    if (duplicateFacility) {
      return next(new ErrorHandler("Another facility already uses this email", 400));
    }
  }

  const facilityUser = await User.findById(facility.user_id);
  if (facilityUser) {
    facilityUser.name = name;
    facilityUser.email = normalizedEmail;
    facilityUser.phone = phone;
    await facilityUser.save();
  }

  facility.name = name;
  facility.email = normalizedEmail;
  facility.phone = phone;
  facility.address = address;
  facility.website = toOptionalString(website);
  facility.specialty = normalizedSpecialty;
  facility.description = toOptionalString(description);
  facility.services = normalizedServices;
  facility.amenities = normalizedAmenities;
  facility.care_levels = normalizedCareLevels;
  facility.units = normalizedUnits;
  facility.occupancy = normalizedOccupancy;
  facility.active_leads = normalizedActiveLeads;
  facility.pricing = pricing || "";
  facility.images = mergedImages;
  await facility.save();

  res.status(200).json({
    success: true,
    message: "Facility updated successfully.",
    facility,
  });
});

export const deleteFacility = catchAsyncError(async (req, res, next) => {
  const admin = await assertAdmin(req.user?.id);
  if (!admin) {
    return next(new ErrorHandler("Only admins can delete facilities", 403));
  }

  const facility = await Facility.findById(req.params.id);
  if (!facility) {
    return next(new ErrorHandler("Facility not found", 404));
  }

  (facility.images || []).forEach((p) => safeRemoveFacilityImageFile(p));

  if (facility.user_id) {
    await User.deleteOne({ _id: facility.user_id });
  }
  await Facility.deleteOne({ _id: facility._id });

  res.status(200).json({
    success: true,
    message: "Facility deleted successfully.",
  });
});

export const importFacilitiesFromApify = catchAsyncError(async (req, res, next) => {
  const admin = await assertAdmin(req.user?.id);
  if (!admin) {
    return next(new ErrorHandler("Only admins can import external facilities", 403));
  }

  const actorInput =
    req.body?.actorInput && typeof req.body.actorInput === "object"
      ? req.body.actorInput
      : {};

  try {
    const result = await syncFacilitiesFromApify(actorInput);
    res.status(200).json({
      success: true,
      message: "Apify facilities import completed.",
      ...result,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message || "Apify import failed", 502));
  }
});

export const enrichFacilitiesWithGpt = catchAsyncError(async (req, res, next) => {
  const admin = await assertAdmin(req.user?.id);
  if (!admin) {
    return next(new ErrorHandler("Only admins can run GPT enrichment", 403));
  }

  const parsedLimit = Number.parseInt(String(req.body?.limit || req.query?.limit || "20"), 10);
  const limit = Number.isNaN(parsedLimit) || parsedLimit < 1 ? 20 : Math.min(parsedLimit, 100);
  const externalOnly = String(req.body?.externalOnly ?? "true").toLowerCase() !== "false";
  const query = externalOnly ? { is_external: true } : {};

  const facilities = await Facility.find(query)
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();

  let updatedCount = 0;
  for (const item of facilities) {
    const gpt = await enrichFacilityListsWithGpt(item.apify_raw, {
      services: item.services || [],
      amenities: item.amenities || [],
      care_levels: item.care_levels || [],
    });

    await Facility.updateOne(
      { _id: item._id },
      {
        $set: {
          services: gpt.services,
          amenities: gpt.amenities,
          care_levels: gpt.care_levels,
        },
      }
    );
    updatedCount += 1;
  }

  res.status(200).json({
    success: true,
    message: "GPT enrichment completed.",
    processed: facilities.length,
    updated: updatedCount,
  });
});

export const importExternalFacilities = catchAsyncError(async (req, res, next) => {
  const admin = await assertAdmin(req.user?.id);
  if (!admin) {
    return next(new ErrorHandler("Only admins can import external facilities", 403));
  }

  const records = Array.isArray(req.body?.facilities) ? req.body.facilities : [];
  if (records.length === 0) {
    return next(new ErrorHandler("facilities array is required", 400));
  }

  const prepared = records
    .map((row) => {
      const name = toOptionalString(row?.name);
      const address = toOptionalString(row?.address);
      if (!name || !address) return null;
      const website = toOptionalString(row?.website);
      const sourcePlatform = toOptionalString(row?.source_platform || row?.source || "external");
      const externalRef =
        toOptionalString(row?.external_ref) ||
        toOptionalString(row?.id) ||
        `${name}::${address}`;
      return {
        is_external: true,
        source_platform: sourcePlatform,
        external_ref: externalRef,
        email: syntheticExternalEmail(sourcePlatform, externalRef),
        name,
        phone: toOptionalString(row?.phone || "N/A"),
        address,
        website,
        specialty: toArray(row?.specialty || row?.care_levels || row?.services),
        description: toOptionalString(row?.description),
        services: toArray(row?.services),
        amenities: toArray(row?.amenities),
        care_levels: toArray(row?.care_levels || row?.specialty),
        pricing: toOptionalString(row?.pricing),
        images: Array.isArray(row?.images)
          ? row.images.map((x) => toOptionalString(x)).filter(Boolean)
          : [],
      };
    })
    .filter(Boolean);

  if (prepared.length === 0) {
    return next(new ErrorHandler("No valid external facilities to import", 400));
  }

  const { created, updated } = await upsertExternalFacilities(prepared);

  res.status(200).json({
    success: true,
    message: "External facilities import completed.",
    created,
    updated,
    totalProcessed: prepared.length,
  });
});

/**
 * POST /api/facilities/discover
 * Live AI discovery (same engine as Carrie) from explicit search params.
 * Used by Care Explorer when filters change so the client can refresh results.
 */
export const postDiscoverFacilities = catchAsyncError(async (req, res, next) => {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return next(new ErrorHandler("Discovery is not configured (missing OPENAI_API_KEY).", 503));
  }

  const body = req.body || {};
  const payload = {
    zip_code: String(body.zip_code || "").trim(),
    location: String(body.location || "").trim(),
    care_levels: Array.isArray(body.care_levels) ? body.care_levels : [],
    amenities: Array.isArray(body.amenities) ? body.amenities : [],
    services: Array.isArray(body.services) ? body.services : [],
    keywords: Array.isArray(body.keywords) ? body.keywords : [],
  };

  const bmin = Number(body.budget_min);
  const bmax = Number(body.budget_max);
  if (Number.isFinite(bmin) && Number.isFinite(bmax) && bmin > 0 && bmax >= bmin) {
    payload.budget_min = Math.round(bmin);
    payload.budget_max = Math.round(bmax);
  }

  const maxDistanceMiles = Number(body.max_distance_miles);
  if (Number.isFinite(maxDistanceMiles) && maxDistanceMiles > 0) {
    payload.max_distance_miles = Math.round(maxDistanceMiles);
  }

  let out;
  try {
    out = await getCareMatchResults(payload);
  } catch (e) {
    const status = typeof e?.status === "number" ? e.status : 502;
    const safe = status >= 400 && status < 600 ? status : 502;
    return next(new ErrorHandler(e?.message || "Discovery failed", safe));
  }

  const facilities = (out.results || []).map((row, idx) =>
    mapAiDiscoveryFacilityToMatchRow(row, idx)
  );

  res.status(200).json({
    success: true,
    count: facilities.length,
    facilities,
  });
});
