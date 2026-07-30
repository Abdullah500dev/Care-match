import Facility from "../models/facilityModel.js";
import { mapAiDiscoveryFacilityToMatchRow } from "./aiDiscoveryBridge.js";

function normalizeZip(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 5);
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Parse "San Francisco, CA, USA" → city, state, optional zip. */
export function parseLocationTokens(locationText) {
  const text = String(locationText || "").trim();
  const zipMatch = text.match(/\b(\d{5})(?:-\d{4})?\b/);
  const zip = zipMatch ? normalizeZip(zipMatch[1]) : "";

  const withoutZip = text.replace(/\b\d{5}(?:-\d{4})?\b/g, "").replace(/\s+/g, " ").trim();
  const parts = withoutZip
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => !/^usa$/i.test(p));

  let city = "";
  let state = "";
  if (parts.length >= 1) city = parts[0];
  if (parts.length >= 2) {
    const rawState = parts[1].replace(/\./g, "").trim();
    state = rawState.length === 2 ? rawState.toUpperCase() : rawState;
  }

  return { city, state, zip };
}

/**
 * Partner (owned) facilities are included when ZIP/city/state matches the search.
 * Care-level fit is reflected in the match score, not used to hide listings.
 */
function ownedFacilityMatchesCareLevels() {
  return true;
}

function mapOwnedDocToAiInput(doc) {
  const zip = normalizeZip(doc.zip_code);
  const address = String(doc.address || "").trim();
  const { city, state } = parseLocationTokens(address);
  const fullAddress =
    zip && address && !new RegExp(`\\b${zip}\\b`).test(address)
      ? `${address}, ${zip}`
      : address;

  return {
    care_levels: Array.isArray(doc.care_levels) && doc.care_levels.length ? doc.care_levels : ["Assisted Living"],
    name: doc.name,
    email: doc.email,
    phone: doc.phone || "",
    website: doc.website || "",
    description: doc.description || "",
    services: Array.isArray(doc.services) ? doc.services : [],
    amenities: Array.isArray(doc.amenities) ? doc.amenities : [],
    pricing: doc.pricing || "",
    images: Array.isArray(doc.images) ? doc.images : [],
    budget: { min_monthly: null, max_monthly: null, currency: "USD" },
    location: {
      full_address: fullAddress,
      city,
      county: "",
      state,
      zip_code: zip,
      country: "US",
    },
    provider_url: doc.website || "",
    google_places: {},
    latitude: null,
    longitude: null,
    review: { rating: null, count: null, summary: "" },
  };
}

export function mapOwnedFacilityToMatchRow(doc, index) {
  const aiInput = mapOwnedDocToAiInput(doc);
  const row = mapAiDiscoveryFacilityToMatchRow(aiInput, index);
  return {
    ...row,
    facilityId: `owned-${String(doc._id)}`,
    is_external: false,
    source_platform: "CareMatch",
    external_source_url: "",
    reasons: ["CareMatch partner community — added by the facility."],
    score: Math.max(row.score || 0, 88),
  };
}

/**
 * Find non-external (admin/provider) facilities matching search ZIP and/or city/state.
 */
export async function findOwnedFacilitiesForDiscover({
  zipCode = "",
  location = "",
  careLevels = [],
} = {}) {
  const searchZip = normalizeZip(zipCode);
  const locTokens = parseLocationTokens(location);
  const zip = searchZip || locTokens.zip;
  const city = locTokens.city;
  const state = locTokens.state;

  const orConditions = [];

  if (zip) {
    orConditions.push({ zip_code: zip });
  }

  if (city) {
    const cityRx = escapeRegex(city);
    orConditions.push({ address: { $regex: cityRx, $options: "i" } });
    if (state) {
      const statePart =
        state.length === 2 ? `\\b${escapeRegex(state)}\\b` : escapeRegex(state);
      orConditions.push({
        $and: [
          { address: { $regex: cityRx, $options: "i" } },
          { address: { $regex: statePart, $options: "i" } },
        ],
      });
    }
  } else if (state) {
    const statePart =
      state.length === 2 ? `\\b${escapeRegex(state)}\\b` : escapeRegex(state);
    orConditions.push({ address: { $regex: statePart, $options: "i" } });
  }

  if (orConditions.length === 0) {
    return [];
  }

  const docs = await Facility.find({
    is_external: { $ne: true },
    $or: orConditions,
  })
    .sort({ updatedAt: -1 })
    .limit(50)
    .lean();

  const filtered = docs.filter((doc) => ownedFacilityMatchesCareLevels(doc));

  return filtered.map((doc, index) => mapOwnedFacilityToMatchRow(doc, index));
}
