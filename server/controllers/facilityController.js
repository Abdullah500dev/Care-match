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
import { mapAiDiscoveryFacilityToMatchRow } from "../services/aiDiscoveryBridge.js";
import { enrichDiscoveryFacilitiesWithPersonalizedScores } from "../services/discoveryPersonalizedScore.js";
import { findOwnedFacilitiesForDiscover } from "../services/ownedFacilityDiscovery.js";
import { extractPreferencesFromMedicalProfile } from "../services/medicalProfileRecommend.js";
import { extractMedicalHistoryFieldsFromDocuments } from "../services/careDocumentAnalysis.js";
import { normalizeFacilityWebsite } from "../utils/normalizeFacilityWebsite.js";
import {
  isAggregatorListingUrl,
  resolveOperatorWebsite,
} from "../utils/isAggregatorListingUrl.js";
import {
  APIFY_DISABLED_RESULT,
  isApifyIntegrationEnabled,
} from "../config/apify.js";

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
const GOOGLE_MAPS_PLACES_API_KEY = String(
  process.env.GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    ""
).trim();
const SILVERASSIST_LOCATION_AUTOCOMPLETE_URL =
  process.env.SILVERASSIST_LOCATION_AUTOCOMPLETE_URL ||
  "https://api.silverassist.com/fam-communities/location-autocomplete";
const CARING_FACETED_SEARCH_URL =
  process.env.CARING_FACETED_SEARCH_URL || "https://api.caring.com/v1/faceted-search";
const CARING_DEFAULT_DISTANCE_MILES = Number.parseInt(
  String(process.env.CARING_DEFAULT_DISTANCE_MILES || "30"),
  10
);
const CARING_HITS_PER_PAGE = Math.min(
  60,
  Math.max(10, Number.parseInt(String(process.env.CARING_HITS_PER_PAGE || "30"), 10) || 30)
);
const CARING_MAX_PAGES = Math.min(
  120,
  Math.max(5, Number.parseInt(String(process.env.CARING_MAX_PAGES || "24"), 10) || 24)
);
const CARING_MAX_FETCH_MS = Math.max(
  5000,
  Number.parseInt(String(process.env.CARING_MAX_FETCH_MS || "45000"), 10) || 45000
);

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

const normalizeFiveDigitZip = (value) => String(value || "").replace(/\D/g, "").slice(0, 5);

const toFiniteNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const buildFullAddress = (address, city, state, zipCode) =>
  [address, city, state, zipCode].map((x) => String(x || "").trim()).filter(Boolean).join(", ");

const deepCollectObjects = (value, limit = 450) => {
  const out = [];
  const queue = [value];
  const seen = new Set();

  while (queue.length > 0 && out.length < limit) {
    const current = queue.shift();
    if (current == null) continue;

    if (Array.isArray(current)) {
      current.forEach((item) => {
        if (item && typeof item === "object") queue.push(item);
      });
      continue;
    }

    if (typeof current !== "object") continue;
    if (seen.has(current)) continue;
    seen.add(current);
    out.push(current);

    Object.values(current).forEach((v) => {
      if (v && typeof v === "object") queue.push(v);
    });
  }

  return out;
};

const extractLatLngFromAnyRow = (row) => {
  const lat =
    toFiniteNumber(
      pickFirstNonEmpty(row, ["latitude", "lat", "geo_lat", "locationLat", "location_lat"])
    ) ??
    toFiniteNumber(row?.coordinates?.lat) ??
    toFiniteNumber(row?.location?.lat) ??
    toFiniteNumber(row?.location?.latitude) ??
    null;
  const lng =
    toFiniteNumber(
      pickFirstNonEmpty(row, ["longitude", "lng", "lon", "geo_lng", "locationLng", "location_lng"])
    ) ??
    toFiniteNumber(row?.coordinates?.lng) ??
    toFiniteNumber(row?.coordinates?.lon) ??
    toFiniteNumber(row?.location?.lng) ??
    toFiniteNumber(row?.location?.longitude) ??
    null;
  return { lat, lng };
};

const tryParseExternalRowToAiFacility = (row, source, fallbackContext = {}) => {
  if (!row || typeof row !== "object") return null;

  const name = toOptionalString(
    pickFirstNonEmpty(row, [
      "name",
      "communityName",
      "title",
      "providerName",
      "facilityName",
      "community_name",
    ])
  );
  if (!name) return null;

  const streetAddress = toOptionalString(
    pickFirstNonEmpty(row, [
      "address",
      "formattedAddress",
      "fullAddress",
      "streetAddress",
      "street",
      "displayAddress",
      "location",
    ])
  );
  const city = toOptionalString(
    pickFirstNonEmpty(row, ["city", "locality", "town"])
  );
  const state = toOptionalString(
    pickFirstNonEmpty(row, ["state", "stateCode", "region", "stateAbbreviation"])
  ).toUpperCase();
  const zipCode =
    normalizeFiveDigitZip(
      pickFirstNonEmpty(row, ["zip", "zipCode", "zip_code", "postalCode", "postal_code"])
    ) || normalizeFiveDigitZip(fallbackContext.zipCode);

  const fullAddress = buildFullAddress(streetAddress, city, state, zipCode);
  const websiteRaw = toOptionalString(
    pickFirstNonEmpty(row, ["website", "url", "link", "profileUrl", "canonicalUrl"])
  );
  const website = isAggregatorListingUrl(websiteRaw) ? "" : websiteRaw;
  const phone = toOptionalString(
    pickFirstNonEmpty(row, ["phone", "phoneNumber", "telephone", "formattedPhoneNumber"])
  );
  const description = toOptionalString(
    pickFirstNonEmpty(row, ["description", "summary", "snippet", "teaser"])
  );
  const pricing = toOptionalString(
    pickFirstNonEmpty(row, ["pricing", "price", "monthlyPrice", "priceRange", "cost"])
  );
  const reviewRating = toOptionalNumber(
    pickFirstNonEmpty(row, ["rating", "overallRating", "reviewScore", "score"])
  );
  const reviewCount = toIntOrZero(
    pickFirstNonEmpty(row, ["reviewCount", "reviewsCount", "numReviews", "reviews"])
  );

  const { lat, lng } = extractLatLngFromAnyRow(row);
  const safeLat = lat ?? fallbackContext.latitude ?? null;
  const safeLng = lng ?? fallbackContext.longitude ?? null;
  const mapsUrl = toOptionalString(
    pickFirstNonEmpty(row, ["mapsUrl", "googleMapsUrl", "mapUrl"])
  );
  const placeId = toOptionalString(
    pickFirstNonEmpty(row, ["placeId", "place_id", "googlePlaceId"])
  );

  const images = toStringArray(
    pickFirstNonEmpty(row, ["images", "imageUrls", "photos", "gallery", "image"])
  )
    .filter((url) => /^https?:\/\//i.test(String(url || "").trim()))
    .slice(0, 6);

  const amenities = toStringArray(
    pickFirstNonEmpty(row, ["amenities", "highlights", "features"])
  ).slice(0, 14);
  const services = toStringArray(
    pickFirstNonEmpty(row, ["services", "careServices", "serviceLines"])
  ).slice(0, 14);

  const careTypeRaw = toOptionalString(
    pickFirstNonEmpty(row, ["careType", "care_type", "primaryCareType", "category"])
  );
  const inferredCareLevels = inferCareLevelsFromText(name, careTypeRaw);
  const careLevels = inferredCareLevels.length > 0 ? inferredCareLevels : ["Assisted Living"];

  return {
    care_levels: careLevels,
    name,
    email: syntheticExternalEmail(source, `${name}|${fullAddress}`),
    phone,
    website,
    description,
    services,
    amenities,
    budget: {
      min_monthly: null,
      max_monthly: null,
      currency: "USD",
    },
    pricing,
    images,
    location: {
      full_address: fullAddress,
      city,
      county: "",
      state,
      zip_code: zipCode,
      country: "US",
    },
    provider_url: websiteRaw || website || mapsUrl,
    google_places: {
      place_id: placeId,
      maps_url: mapsUrl,
      latitude: safeLat,
      longitude: safeLng,
      review_count: reviewCount || null,
      total_score: reviewRating ?? null,
    },
    maps_url: mapsUrl,
    latitude: safeLat,
    longitude: safeLng,
    review: {
      rating: reviewRating ?? null,
      count: reviewCount || null,
      summary: "",
    },
  };
};

const dedupeMatchRows = (rows) => {
  const out = [];
  const seen = new Set();
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    if (!row || typeof row !== "object") return;
    const key = [
      String(row.name || "").toLowerCase().trim(),
      String(row.address || "").toLowerCase().trim(),
      normalizeFiveDigitZip(row.zip_code || row?.external_data?.zip_code),
    ].join("|");
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(row);
  });
  return out;
};

const fetchJsonFromUrl = async (url, signal, headers = { Accept: "application/json" }) => {
  const response = await fetch(url, {
    method: "GET",
    headers,
    signal,
  });
  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    const error = new Error(`External API request failed (${response.status})`);
    error.status = response.status;
    error.bodySnippet = String(bodyText || "").slice(0, 220);
    throw error;
  }
  return response.json().catch(() => ({}));
};

const fetchCaringJsonFromUrl = async (url, signal) =>
  fetchJsonFromUrl(url, signal, {
    Accept: "application/json, text/plain, */*",
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 CareMatchBot/1.0",
    "Accept-Language": "en-US,en;q=0.9",
    Referer: "https://www.caring.com/",
    Origin: "https://www.caring.com",
  });

const resolveLocationContextFromSilverAssist = (silverPayload, zipCodeFallback) => {
  const rows = deepCollectObjects(silverPayload, 280);
  for (const row of rows) {
    const { lat, lng } = extractLatLngFromAnyRow(row);
    if (lat == null || lng == null) continue;
    const zipCode =
      normalizeFiveDigitZip(
        pickFirstNonEmpty(row, ["zip", "zipCode", "zip_code", "postalCode", "postal_code"])
      ) || normalizeFiveDigitZip(zipCodeFallback);
    return { latitude: lat, longitude: lng, zipCode };
  }
  return {
    latitude: null,
    longitude: null,
    zipCode: normalizeFiveDigitZip(zipCodeFallback),
  };
};

const mapExternalPayloadToMatchRows = (payload, source, fallbackContext = {}) => {
  const rows = deepCollectObjects(payload, 420);
  const aiFacilities = rows
    .map((row) => tryParseExternalRowToAiFacility(row, source, fallbackContext))
    .filter(Boolean);
  return aiFacilities.map((row, idx) => mapAiDiscoveryFacilityToMatchRow(row, idx));
};

const mapCaringPayloadToMatchRows = (payload, fallbackContext = {}) => {
  const rows = Array.isArray(payload?.data?.results) ? payload.data.results : [];
  const aiFacilities = rows
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const address = row.address && typeof row.address === "object" ? row.address : {};
      const city = toOptionalString(address.city);
      const state = toOptionalString(address.state).slice(0, 2).toUpperCase();
      const zipCode =
        normalizeFiveDigitZip(address.zipCode) || normalizeFiveDigitZip(fallbackContext.zipCode);
      const formattedAddress =
        toOptionalString(address.formattedAddress) ||
        buildFullAddress(address.street, city, state, zipCode);
      const lat = toFiniteNumber(address.latitude) ?? fallbackContext.latitude ?? null;
      const lng = toFiniteNumber(address.longitude) ?? fallbackContext.longitude ?? null;
      const careLevels = ["Assisted Living"];
      const caringAmenities = [
        ...toStringArray(row.amenities),
        ...toStringArray(row.highlights),
        ...toStringArray(row.features),
        ...toStringArray(row.tags),
      ].slice(0, 14);
      const reviewSnippet = toOptionalString(row.lastReviewSnippet);
      const description = [toOptionalString(row.description), reviewSnippet]
        .filter(Boolean)
        .join(" ");
      return {
        care_levels: careLevels,
        name: toOptionalString(row.name),
        email: syntheticExternalEmail("Caring", row.id || row.slug || row.name),
        phone: toOptionalString(row.phoneNumber),
        website: "",
        description,
        services: careLevels,
        amenities: caringAmenities,
        budget: {
          min_monthly: null,
          max_monthly: null,
          currency: "USD",
        },
        pricing:
          Number.isFinite(Number(row.startPriceInCents)) && Number(row.startPriceInCents) > 0
            ? `$${Math.round(Number(row.startPriceInCents) / 100).toLocaleString("en-US")}/mo`
            : "",
        images: toStringArray(row.images).slice(0, 8),
        location: {
          full_address: formattedAddress,
          city,
          county: toOptionalString(address.county),
          state,
          zip_code: zipCode,
          country: "US",
        },
        provider_url: row.url ? `https://www.caring.com${String(row.url).trim()}` : "",
        google_places: {
          place_id: "",
          maps_url: "",
          latitude: lat,
          longitude: lng,
          review_count: toIntOrZero(row.reviewCount) || null,
          total_score: toOptionalNumber(row.averageRating) ?? null,
        },
        maps_url: "",
        latitude: lat,
        longitude: lng,
        review: {
          rating: toOptionalNumber(row.averageRating),
          count: toIntOrZero(row.reviewCount) || null,
          summary: toOptionalString(row.lastReviewSnippet),
        },
      };
    })
    .filter((row) => row && row.name);
  return aiFacilities.map((row, idx) => mapAiDiscoveryFacilityToMatchRow(row, idx));
};

const distanceMilesBetweenPoints = (aLat, aLng, bLat, bLng) => {
  const toRad = (n) => (n * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(h));
};

const ownedRowMatchesLocationWithoutCoords = (row, searchZip, locationText) => {
  if (row?.is_external !== false) return false;

  const fz = normalizeFiveDigitZip(row?.zip_code || row?.external_data?.zip_code);
  if (searchZip && fz && searchZip === fz) return true;

  const addr = String(row?.address || "").toLowerCase();
  const loc = String(locationText || "").toLowerCase().trim();
  if (!addr || !loc) return false;

  const cityHint = loc.split(",")[0]?.trim();
  if (cityHint && cityHint.length >= 3 && addr.includes(cityHint)) return true;

  const stateMatch = loc.match(/\b([a-z]{2})\b/);
  if (stateMatch && addr.includes(stateMatch[1])) return true;

  return false;
};

const filterRowsByAnchorDistance = (
  rows,
  anchorLat,
  anchorLng,
  maxDistanceMiles,
  { searchZip = "", locationText = "" } = {}
) => {
  const list = Array.isArray(rows) ? rows : [];
  const maxMiles =
    Number.isFinite(Number(maxDistanceMiles)) && Number(maxDistanceMiles) > 0
      ? Number(maxDistanceMiles)
      : null;

  if (maxMiles == null) return list;

  if (!Number.isFinite(anchorLat) || !Number.isFinite(anchorLng)) {
    return list.filter((row) =>
      ownedRowMatchesLocationWithoutCoords(row, searchZip, locationText)
    );
  }

  const normalizedSearchZip = normalizeFiveDigitZip(searchZip);

  return list.filter((row) => {
    const lat = toFiniteNumber(row?.latitude ?? row?.external_data?.google_places?.latitude);
    const lng = toFiniteNumber(row?.longitude ?? row?.external_data?.google_places?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return ownedRowMatchesLocationWithoutCoords(row, normalizedSearchZip, locationText);
    }
    const miles = distanceMilesBetweenPoints(anchorLat, anchorLng, lat, lng);
    return Number.isFinite(miles) && miles <= maxMiles;
  });
};

/** Geocode facility addresses that are missing coordinates so radius filtering can be exact. */
const hydrateMissingRowCoordinates = async (rows, signal, limit = 36) => {
  const list = Array.isArray(rows) ? rows : [];
  const needs = list.filter((row) => {
    const lat = toFiniteNumber(row?.latitude ?? row?.external_data?.google_places?.latitude);
    const lng = toFiniteNumber(row?.longitude ?? row?.external_data?.google_places?.longitude);
    return !Number.isFinite(lat) || !Number.isFinite(lng);
  });
  const slice = needs.slice(0, Math.max(0, limit));
  for (const row of slice) {
    const addr = String(row?.address || row?.external_data?.full_address || "").trim();
    const zip = normalizeFiveDigitZip(row?.zip_code || row?.external_data?.zip_code);
    const query = [addr, zip].filter(Boolean).join(", ");
    if (!query) continue;
    const geo = await geocodeQueryToLatLng(query, signal);
    if (geo.latitude == null || geo.longitude == null) continue;
    row.latitude = geo.latitude;
    row.longitude = geo.longitude;
    if (row.external_data && typeof row.external_data === "object") {
      if (!row.external_data.google_places || typeof row.external_data.google_places !== "object") {
        row.external_data.google_places = {};
      }
      row.external_data.google_places.latitude = geo.latitude;
      row.external_data.google_places.longitude = geo.longitude;
    }
  }
  return list;
};

const geocodeQueryToLatLng = async (query, signal) => {
  const q = String(query || "").trim();
  if (!q || !GOOGLE_MAPS_PLACES_API_KEY) return { latitude: null, longitude: null };
  const geocodeUrl =
    `https://maps.googleapis.com/maps/api/geocode/json?` +
    `address=${encodeURIComponent(q)}&key=${encodeURIComponent(GOOGLE_MAPS_PLACES_API_KEY)}`;
  let payload = {};
  try {
    payload = await fetchJsonFromUrl(geocodeUrl, signal);
  } catch {
    payload = {};
  }
  const first = Array.isArray(payload?.results) ? payload.results[0] : null;
  const latitude = toFiniteNumber(first?.geometry?.location?.lat);
  const longitude = toFiniteNumber(first?.geometry?.location?.lng);
  return {
    latitude: latitude ?? null,
    longitude: longitude ?? null,
  };
};

const fetchExternalZipSearchMatches = async (
  { zipCode, location, maxDistanceMiles, latitude: seedLatitude, longitude: seedLongitude },
  signal
) => {
  const searchQuery = normalizeFiveDigitZip(zipCode) || String(location || "").trim();
  const locationKeyword = String(location || "")
    .replace(/\b\d{5}(?:-\d{4})?\b/g, "")
    .replace(/\s+/g, " ")
    .replace(/,\s*,/g, ", ")
    .replace(/^,\s*|\s*,$/g, "")
    .trim();
  if (!searchQuery) return [];
  console.log("[discover] search seed:", {
    zipCode: normalizeFiveDigitZip(zipCode),
    location: String(location || "").trim(),
    searchQuery,
    locationKeyword,
    maxDistanceMiles,
    seedLatitude: toFiniteNumber(seedLatitude),
    seedLongitude: toFiniteNumber(seedLongitude),
  });

  let silverPayload = {};
  try {
    const silverUrl =
      `${SILVERASSIST_LOCATION_AUTOCOMPLETE_URL}?` +
      `search_query=${encodeURIComponent(searchQuery)}`;
    silverPayload = await fetchJsonFromUrl(silverUrl, signal);
  } catch {
    silverPayload = {};
  }
  const silverContextRaw = resolveLocationContextFromSilverAssist(silverPayload, searchQuery);
  const providedLat = toFiniteNumber(seedLatitude);
  const providedLng = toFiniteNumber(seedLongitude);
  let silverContext = {
    ...silverContextRaw,
    latitude: providedLat ?? silverContextRaw.latitude ?? null,
    longitude: providedLng ?? silverContextRaw.longitude ?? null,
  };
  if (silverContext.latitude == null || silverContext.longitude == null) {
    const geocoded = await geocodeQueryToLatLng(searchQuery, signal);
    silverContext = {
      ...silverContext,
      latitude: silverContext.latitude ?? geocoded.latitude,
      longitude: silverContext.longitude ?? geocoded.longitude,
    };
  }
  const silverRows = mapExternalPayloadToMatchRows(silverPayload, "SilverAssist", silverContext);
  const silverLabel = Array.isArray(silverPayload?.autocomplete_results)
    ? silverPayload.autocomplete_results
        .map((item) => `${item?.city || ""}, ${item?.state || ""}`.replace(/^,\s*|,\s*$/g, ""))
        .find(Boolean) || ""
    : "";

  const requestedDistanceMiles =
    Number.isFinite(Number(maxDistanceMiles)) && Number(maxDistanceMiles) > 0
      ? Number(maxDistanceMiles)
      : CARING_DEFAULT_DISTANCE_MILES;
  // Caring's own distance facet can return empty results for very small radii (e.g. 5 miles)
  // even when close communities exist. Fetch from a wider upstream radius and apply our own
  // precise haversine distance gate locally.
  const upstreamDistanceMiles = Math.max(
    25,
    Math.min(60, Math.ceil(requestedDistanceMiles * 2))
  );
  const fetchStartedAt = Date.now();
  // Caring's "recommended" ordering does not always surface the nearest facilities first.
  // For tight radii, scan deeper before giving up so 1-3 mile matches are not skipped.
  const distanceTargetPageCount =
    requestedDistanceMiles <= 10
      ? 6
      : requestedDistanceMiles <= 25
        ? 5
        : requestedDistanceMiles <= 35
          ? 4
          : requestedDistanceMiles <= 50
            ? 3
            : 2;
  const minPagesBeforeStaleStop =
    requestedDistanceMiles <= 10 ? 6 : requestedDistanceMiles <= 25 ? 5 : 3;
  const maxConsecutiveStalePages =
    requestedDistanceMiles <= 10 ? 5 : requestedDistanceMiles <= 25 ? 4 : 2;
  const targetPageCount = distanceTargetPageCount;

  const buildCaringParams = (keyword, includeLatLng, page) =>
    new URLSearchParams({
      hitsPerPage: String(CARING_HITS_PER_PAGE),
      matchAllFilters: "true",
      page: String(page),
      sortBy: "recommended",
      "criteria[careType]": "assisted-living",
      "criteria[distanceInMiles]": String(Math.max(1, Math.ceil(upstreamDistanceMiles))),
      "criteria[domain]": "caring.com",
      "criteria[keyword]": keyword,
      ...(includeLatLng &&
      silverContext.latitude != null &&
      silverContext.longitude != null
        ? {
            "criteria[latitude]": String(silverContext.latitude),
            "criteria[longitude]": String(silverContext.longitude),
          }
        : {}),
      domain: "caring.com",
    });

  const caringParamCandidates = [
    { keyword: searchQuery, includeLatLng: true },
    { keyword: searchQuery, includeLatLng: false },
    ...(locationKeyword &&
    locationKeyword.toLowerCase() !== String(searchQuery || "").toLowerCase()
      ? [
          { keyword: locationKeyword, includeLatLng: true },
          { keyword: locationKeyword, includeLatLng: false },
        ]
      : []),
    ...(silverLabel
      ? [
          { keyword: silverLabel, includeLatLng: true },
          { keyword: silverLabel, includeLatLng: false },
        ]
      : []),
  ];
  console.log(
    "[discover] caring candidates:",
    caringParamCandidates.map((c) => ({
      keyword: c.keyword,
      includeLatLng: c.includeLatLng,
    }))
  );

  let caringRows = [];
  let caringRowsAcrossCandidates = [];
  for (const candidate of caringParamCandidates) {
    let aggregated = [];
    let knownTotalPages = null;
    let page = 1;
    let effectiveTargetPages = targetPageCount;
    let stalePageCount = 0;
    while (page <= effectiveTargetPages) {
      if (Date.now() - fetchStartedAt > CARING_MAX_FETCH_MS) break;
      let caringPayload = {};
      try {
        const params = buildCaringParams(candidate.keyword, candidate.includeLatLng, page);
        const caringUrl = `${CARING_FACETED_SEARCH_URL}?${params.toString()}`;
        caringPayload = await fetchCaringJsonFromUrl(caringUrl, signal);
      } catch {
        caringPayload = {};
      }

      const mappedRows = mapCaringPayloadToMatchRows(caringPayload, silverContext);
      const nearbyRows = filterRowsByAnchorDistance(
        mappedRows,
        toFiniteNumber(silverContext.latitude),
        toFiniteNumber(silverContext.longitude),
        maxDistanceMiles
      );
      console.log("[discover] caring page stats:", {
        keyword: candidate.keyword,
        includeLatLng: candidate.includeLatLng,
        page,
        mappedRows: mappedRows.length,
        nearbyRows: nearbyRows.length,
        apiTotalPages: caringPayload?.data?.totalPages ?? null,
      });

      let rowsWithinRadius = nearbyRows;
      if (
        rowsWithinRadius.length === 0 &&
        mappedRows.length > 0 &&
        Number.isFinite(toFiniteNumber(silverContext.latitude)) &&
        Number.isFinite(toFiniteNumber(silverContext.longitude))
      ) {
        await hydrateMissingRowCoordinates(mappedRows, signal, 12);
        rowsWithinRadius = filterRowsByAnchorDistance(
          mappedRows,
          toFiniteNumber(silverContext.latitude),
          toFiniteNumber(silverContext.longitude),
          maxDistanceMiles
        );
      }

      const beforeAgg = aggregated.length;
      if (rowsWithinRadius.length > 0) {
        aggregated = dedupeMatchRows([...aggregated, ...rowsWithinRadius]);
      }
      const gained = aggregated.length - beforeAgg;
      stalePageCount = gained === 0 ? stalePageCount + 1 : 0;

      const apiTotalPages = Number.parseInt(String(caringPayload?.data?.totalPages || ""), 10);
      if (Number.isFinite(apiTotalPages) && apiTotalPages > 0) {
        knownTotalPages = apiTotalPages;
        effectiveTargetPages = Math.min(
          CARING_MAX_PAGES,
          Math.max(effectiveTargetPages, knownTotalPages)
        );
      }
      if (mappedRows.length === 0) break;
      if (page >= minPagesBeforeStaleStop && stalePageCount >= maxConsecutiveStalePages) {
        break;
      }
      page += 1;
    }

    if (aggregated.length > 0) {
      caringRowsAcrossCandidates = dedupeMatchRows([
        ...caringRowsAcrossCandidates,
        ...aggregated,
      ]);
    }
    console.log("[discover] caring candidate done:", {
      keyword: candidate.keyword,
      includeLatLng: candidate.includeLatLng,
      aggregatedWithinRadius: aggregated.length,
    });
  }
  if (caringRowsAcrossCandidates.length > 0) {
    caringRows = caringRowsAcrossCandidates;
  }

  let merged = dedupeMatchRows([...silverRows, ...caringRows]);
  const anchorLat = toFiniteNumber(silverContext.latitude);
  const anchorLng = toFiniteNumber(silverContext.longitude);
  if (
    merged.length > 0 &&
    Number.isFinite(anchorLat) &&
    Number.isFinite(anchorLng) &&
    requestedDistanceMiles > 0
  ) {
    await hydrateMissingRowCoordinates(merged, signal, 40);
    merged = filterRowsByAnchorDistance(
      merged,
      anchorLat,
      anchorLng,
      requestedDistanceMiles
    );
  }

  console.log("[discover] merge stats:", {
    silverRows: silverRows.length,
    caringRows: caringRows.length,
    mergedWithinRadius: merged.length,
    anchorLat,
    anchorLng,
    requestedDistanceMiles,
  });
  return merged;
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

const inferCareLevelsFromText = (..._values) => {
  // Product currently supports Assisted Living only.
  return ["Assisted Living"];
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
      care_levels_allowed: ["Assisted Living"],
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
  const careLevels = ["Assisted Living"];
  // Product supports Assisted Living only — do not append other care levels.

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
    website: resolveOperatorWebsite(
      googlePlaces?.website,
      providerUrl,
      googlePlaces?.maps_url,
    ),
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
  if (!isApifyIntegrationEnabled()) {
    return { ...APIFY_DISABLED_RESULT };
  }

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
    zip_code,
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

  const normalizedZip = normalizeFiveDigitZip(zip_code);
  if (normalizedZip.length !== 5) {
    return next(new ErrorHandler("A valid 5-digit ZIP code is required", 400));
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
    zip_code: normalizedZip,
    website: normalizeFacilityWebsite(website),
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
  const dashboardUrl = `${clientBaseUrl}/facility`;
  const signupUrl = `${clientBaseUrl}/register`;

  try {
    await sendMail({
      email: facilityUser.email,
      subject: `Welcome to CareMatch AI – ${facility.name} account is ready`,
      template: "facility-onboarding.ejs",
      data: {
        user: { name: greetingNameForEmail(facilityUser) },
        facility: { name: facility.name },
        username: facilityUser.email,
        temporaryPassword,
        loginUrl,
        resetLink,
        dashboardUrl,
        signupUrl,
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
  const q = String(req.query.q || req.query.search || "").trim();

  const filter = {};
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.name = rx;
  }

  const [facilities, total] = await Promise.all([
    Facility.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Facility.countDocuments(filter),
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

export const resolveAddressZip = catchAsyncError(async (req, res) => {
  const { resolveZipForAddressQuery } = await import("../services/addressZipResolver.js");
  const address = String(req.query.address || req.body?.address || "").trim();
  const resolved = await resolveZipForAddressQuery(address);

  res.status(200).json({
    success: true,
    ...resolved,
  });
});

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
    zip_code,
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

  if (zip_code != null) {
    const normalizedZip = normalizeFiveDigitZip(zip_code);
    if (normalizedZip.length !== 5) {
      return next(new ErrorHandler("A valid 5-digit ZIP code is required", 400));
    }
    facility.zip_code = normalizedZip;
  }

  if (pricing != null) {
    facility.pricing = String(pricing).trim();
  }

  if (website != null) {
    facility.website = normalizeFacilityWebsite(website);
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

  let keepPaths = facility.images || [];
  try {
    if (req.body.keep_image_paths != null && req.body.keep_image_paths !== "") {
      const parsed = JSON.parse(req.body.keep_image_paths);
      if (Array.isArray(parsed)) {
        keepPaths = parsed.filter(
          (p) => typeof p === "string" && (facility.images || []).includes(p),
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

  facility.images = mergedImages;

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
    zip_code,
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

  const normalizedZip = normalizeFiveDigitZip(zip_code);
  if (normalizedZip.length !== 5) {
    return next(new ErrorHandler("A valid 5-digit ZIP code is required", 400));
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
  facility.zip_code = normalizedZip;
  facility.website = normalizeFacilityWebsite(website);
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

/**
 * Admin-only: delete every facility document (and uploaded facility images).
 * Does not delete users, leads, or other collections.
 */
export const deleteAllFacilities = catchAsyncError(async (req, res, next) => {
  const admin = await assertAdmin(req.user?.id);
  if (!admin) {
    return next(new ErrorHandler("Only admins can delete all facilities", 403));
  }

  const facilities = await Facility.find({}).select("images").lean();
  facilities.forEach((facility) => {
    (facility.images || []).forEach((imagePath) =>
      safeRemoveFacilityImageFile(imagePath),
    );
  });

  const result = await Facility.deleteMany({});

  res.status(200).json({
    success: true,
    message: "All facilities deleted successfully.",
    deletedCount: result.deletedCount || 0,
  });
});

export const importFacilitiesFromApify = catchAsyncError(async (req, res, next) => {
  if (!isApifyIntegrationEnabled()) {
    return next(
      new ErrorHandler("Apify import is disabled (integration turned off)", 503)
    );
  }

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
 * External listings (SilverAssist location context + Caring.com faceted search).
 * Used by Care Explorer when filters change. Personalizes match % from ZIP/distance (+ optional GPT).
 */
export const postDiscoverFacilities = catchAsyncError(async (req, res, next) => {
  const body = req.body || {};
  const locationRaw = String(body.location || "").trim();
  const zipCode = String(body.zip_code || "").trim() || locationRaw;
  const location = locationRaw || zipCode;
  const careLevelsRaw = Array.isArray(body.care_levels) ? body.care_levels : [];
  const careLevels = careLevelsRaw.length ? careLevelsRaw : ["assisted living"];
  const payload = {
    zip_code: zipCode,
    location,
    care_levels: careLevels,
    amenities: Array.isArray(body.amenities) ? body.amenities : [],
    services: Array.isArray(body.services) ? body.services : [],
    keywords: Array.isArray(body.keywords) ? body.keywords : [],
  };
  console.log("[discover] request body summary:", {
    zip_code: zipCode,
    location,
    care_levels: careLevels,
    amenitiesCount: payload.amenities.length,
    servicesCount: payload.services.length,
    keywordsCount: payload.keywords.length,
    budget_min: body.budget_min ?? null,
    budget_max: body.budget_max ?? null,
    max_distance_miles: body.max_distance_miles ?? null,
    latitude: body.latitude ?? body.lat ?? body?.coords?.lat ?? body?.coordinates?.lat ?? null,
    longitude: body.longitude ?? body.lng ?? body.lon ?? body?.coords?.lng ?? body?.coordinates?.lng ?? null,
  });

  const bmin = Number(body.budget_min);
  const bmax = Number(body.budget_max);

  const maxDistanceMiles = Number.parseFloat(String(body.max_distance_miles));
  if (Number.isFinite(maxDistanceMiles) && maxDistanceMiles > 0) {
    payload.max_distance_miles = maxDistanceMiles;
  }
  let latitude = toFiniteNumber(
    body.latitude ?? body.lat ?? body?.coords?.lat ?? body?.coordinates?.lat
  );
  let longitude = toFiniteNumber(
    body.longitude ?? body.lng ?? body.lon ?? body?.coords?.lng ?? body?.coordinates?.lng
  );

  const fetchController = new AbortController();
  const fetchSignal = fetchController.signal;

  if (latitude == null || longitude == null) {
    const geo = await geocodeQueryToLatLng(
      [location, normalizeFiveDigitZip(zipCode)].filter(Boolean).join(", ") ||
        normalizeFiveDigitZip(zipCode) ||
        location,
      fetchSignal
    );
    latitude = geo.latitude ?? latitude;
    longitude = geo.longitude ?? longitude;
  }

  let externalRows = [];
  let ownedRows = [];
  try {
    [externalRows, ownedRows] = await Promise.all([
      fetchExternalZipSearchMatches(
        {
          zipCode,
          location,
          maxDistanceMiles: payload.max_distance_miles,
          latitude,
          longitude,
        },
        fetchSignal
      ),
      findOwnedFacilitiesForDiscover({
        zipCode,
        location,
        careLevels,
      }),
    ]);
  } catch (error) {
    console.warn("[discover] external fetch error:", error?.message || error);
    if (!ownedRows.length) {
      ownedRows = await findOwnedFacilitiesForDiscover({
        zipCode,
        location,
        careLevels,
      });
    }
  } finally {
    fetchController.abort();
  }

  if (ownedRows.length > 0) {
    await hydrateMissingRowCoordinates(ownedRows, undefined, 30);
  }

  const deduped = dedupeMatchRows([...ownedRows, ...externalRows]);
  const distanceFilterCtx = {
    searchZip: normalizeFiveDigitZip(zipCode),
    locationText: location,
  };

  const partnerRows = deduped.filter((row) => row?.is_external === false);
  const externalOnlyRows = deduped.filter((row) => row?.is_external !== false);

  const filterPartnerRow = (row) => {
    const lat = toFiniteNumber(row?.latitude ?? row?.external_data?.google_places?.latitude);
    const lng = toFiniteNumber(row?.longitude ?? row?.external_data?.google_places?.longitude);
    const maxMiles =
      Number.isFinite(Number(payload.max_distance_miles)) && Number(payload.max_distance_miles) > 0
        ? Number(payload.max_distance_miles)
        : null;

    if (ownedRowMatchesLocationWithoutCoords(row, distanceFilterCtx.searchZip, distanceFilterCtx.locationText)) {
      return true;
    }

    if (
      maxMiles != null &&
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      Number.isFinite(latitude) &&
      Number.isFinite(longitude)
    ) {
      const miles = distanceMilesBetweenPoints(latitude, longitude, lat, lng);
      return Number.isFinite(miles) && miles <= maxMiles;
    }

    return maxMiles == null;
  };

  let constrainedPartners = partnerRows.filter(filterPartnerRow);
  let constrainedExternal = filterRowsByAnchorDistance(
    externalOnlyRows,
    latitude,
    longitude,
    payload.max_distance_miles,
    distanceFilterCtx
  );

  if (
    constrainedExternal.length === 0 &&
    externalOnlyRows.length > 0 &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    payload.max_distance_miles
  ) {
    await hydrateMissingRowCoordinates(externalOnlyRows, undefined, 40);
    constrainedExternal = filterRowsByAnchorDistance(
      externalOnlyRows,
      latitude,
      longitude,
      payload.max_distance_miles,
      distanceFilterCtx
    );
  }

  let constrainedRows = dedupeMatchRows([...constrainedPartners, ...constrainedExternal]);

  const effectiveRows = constrainedRows;
  const enrichCtx = {
    searchZip: normalizeFiveDigitZip(zipCode),
    locationText: location,
    maxDistanceMiles: payload.max_distance_miles ?? null,
    careLevels,
    seedLat: latitude,
    seedLng: longitude,
    budgetMinMonthly: Number.isFinite(bmin) && bmin > 0 ? Math.round(bmin) : null,
    budgetMaxMonthly: Number.isFinite(bmax) && bmax > 0 ? Math.round(bmax) : null,
  };

  let facilities = await enrichDiscoveryFacilitiesWithPersonalizedScores(
    effectiveRows,
    enrichCtx,
    undefined
  );

  const scoredIds = new Set((facilities || []).map((f) => String(f.facilityId || "")));
  const missingPartners = constrainedPartners.filter(
    (row) => !scoredIds.has(String(row.facilityId || ""))
  );
  if (missingPartners.length > 0) {
    const partnerScored = await enrichDiscoveryFacilitiesWithPersonalizedScores(
      missingPartners,
      enrichCtx,
      undefined
    );
    facilities = dedupeMatchRows([...partnerScored, ...facilities]);
  }
  console.log("[discover] pipeline counts:", {
    ownedRows: ownedRows.length,
    externalRows: Array.isArray(externalRows) ? externalRows.length : 0,
    deduped: deduped.length,
    constrainedPartners: constrainedPartners.length,
    constrainedExternal: constrainedExternal.length,
    constrainedByDistance: constrainedRows.length,
    candidatesForEnrichment: effectiveRows.length,
    finalScored: facilities.length,
    partnersInResponse: facilities.filter((f) => {
      const id = String(f.facilityId || "");
      return id.startsWith("owned-") || id.startsWith("snf-");
    }).length,
    enrichBudgetHintMonthly: {
      min: Number.isFinite(bmin) && bmin > 0 ? Math.round(bmin) : null,
      max: Number.isFinite(bmax) && bmax > 0 ? Math.round(bmax) : null,
    },
  });

  res.status(200).json({
    success: true,
    count: facilities.length,
    facilities,
    search_center:
      Number.isFinite(latitude) && Number.isFinite(longitude)
        ? { lat: latitude, lng: longitude }
        : null,
    max_distance_miles: payload.max_distance_miles ?? null,
  });
});

/**
 * GET /api/facilities/google-place-photo
 * Proxies Google Place Photo requests so browser does not depend on direct key usage.
 * Query: photo_reference (required), maxwidth (optional)
 */
export const getGooglePlacePhotoProxy = catchAsyncError(async (req, res, next) => {
  if (!GOOGLE_MAPS_PLACES_API_KEY) {
    return next(new ErrorHandler("Google Places photo proxy is not configured.", 503));
  }

  const photoReference = String(
    req.query?.photo_reference || req.query?.photoReference || req.query?.ref || ""
  ).trim();
  if (!photoReference) {
    return next(new ErrorHandler("photo_reference query param is required.", 400));
  }

  const parsedMax = Number.parseInt(String(req.query?.maxwidth || "1200"), 10);
  const maxwidth = Number.isFinite(parsedMax)
    ? Math.min(1600, Math.max(200, parsedMax))
    : 1200;

  const url =
    `https://maps.googleapis.com/maps/api/place/photo?` +
    `maxwidth=${encodeURIComponent(String(maxwidth))}` +
    `&photo_reference=${encodeURIComponent(photoReference)}` +
    `&key=${encodeURIComponent(GOOGLE_MAPS_PLACES_API_KEY)}`;

  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    return next(new ErrorHandler(error?.message || "Failed to fetch place photo.", 502));
  }

  if (!response.ok) {
    return next(new ErrorHandler(`Place photo request failed (${response.status}).`, 502));
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const body = Buffer.from(await response.arrayBuffer());
  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.status(200).send(body);
});

/**
 * GET /api/facilities/google-place-photo-by-place-id
 * Resolves first available Google Place photo by place_id and proxies image bytes.
 * Query: place_id (required), maxwidth (optional)
 */
export const getGooglePlacePhotoByPlaceIdProxy = catchAsyncError(async (req, res, next) => {
  if (!GOOGLE_MAPS_PLACES_API_KEY) {
    return next(new ErrorHandler("Google Places photo proxy is not configured.", 503));
  }

  const placeId = String(req.query?.place_id || req.query?.placeId || "").trim();
  if (!placeId) {
    return next(new ErrorHandler("place_id query param is required.", 400));
  }

  const parsedMax = Number.parseInt(String(req.query?.maxwidth || "1200"), 10);
  const maxwidth = Number.isFinite(parsedMax)
    ? Math.min(1600, Math.max(200, parsedMax))
    : 1200;

  const detailsUrl =
    `https://maps.googleapis.com/maps/api/place/details/json?` +
    `place_id=${encodeURIComponent(placeId)}` +
    `&fields=photos` +
    `&key=${encodeURIComponent(GOOGLE_MAPS_PLACES_API_KEY)}`;

  let detailsResp;
  try {
    detailsResp = await fetch(detailsUrl);
  } catch (error) {
    return next(
      new ErrorHandler(error?.message || "Failed to fetch place details for photos.", 502)
    );
  }

  if (!detailsResp.ok) {
    return next(new ErrorHandler(`Place details request failed (${detailsResp.status}).`, 502));
  }

  const details = await detailsResp.json().catch(() => ({}));
  const photos = Array.isArray(details?.result?.photos) ? details.result.photos : [];
  const photoReference = String(photos?.[0]?.photo_reference || "").trim();
  if (!photoReference) {
    return next(new ErrorHandler("No photos found for this place_id.", 404));
  }

  const photoUrl =
    `https://maps.googleapis.com/maps/api/place/photo?` +
    `maxwidth=${encodeURIComponent(String(maxwidth))}` +
    `&photo_reference=${encodeURIComponent(photoReference)}` +
    `&key=${encodeURIComponent(GOOGLE_MAPS_PLACES_API_KEY)}`;

  let photoResp;
  try {
    photoResp = await fetch(photoUrl);
  } catch (error) {
    return next(new ErrorHandler(error?.message || "Failed to fetch place photo.", 502));
  }

  if (!photoResp.ok) {
    return next(new ErrorHandler(`Place photo request failed (${photoResp.status}).`, 502));
  }

  const contentType = photoResp.headers.get("content-type") || "image/jpeg";
  const body = Buffer.from(await photoResp.arrayBuffer());
  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.status(200).send(body);
});

/**
 * POST /api/facilities/recommend-from-profile
 * Carrie-style GPT intake extraction from a family medical record.
 * Also analyzes uploaded care images (vision) and PDF text when present.
 * Returns preferences for the same /discover → Care Explorer path.
 */
export const postRecommendFromProfile = catchAsyncError(async (req, res, next) => {
  const body = req.body || {};
  const bio = String(body.bio || "").trim();
  const medicalIssues = String(body.medical_issues || "").trim();
  const background = String(body.care_background || "").trim();
  const hasServices =
    (Array.isArray(body.desired_services) && body.desired_services.some(Boolean)) ||
    String(body.desired_services || "").trim().length > 0;
  const hasAmenities =
    (Array.isArray(body.desired_amenities) && body.desired_amenities.some(Boolean)) ||
    String(body.desired_amenities || "").trim().length > 0;

  if (!bio || !medicalIssues || (!background && !hasServices && !hasAmenities)) {
    return next(
      new ErrorHandler(
        "Complete your medical record (bio, medical issues, and background or preferences) before requesting recommendations.",
        400,
      ),
    );
  }

  // Only analyze documents that belong to this user (path allow-list).
  let documents = [];
  try {
    const user = await User.findById(req.user?.id).select("care_documents").lean();
    const owned = Array.isArray(user?.care_documents) ? user.care_documents : [];
    const ownedByPath = new Map(
      owned
        .filter((d) => d?.path)
        .map((d) => [String(d.path), d]),
    );

    const requested = Array.isArray(body.document_paths)
      ? body.document_paths.map((p) => String(p || "").trim()).filter(Boolean)
      : [];

    if (requested.length > 0) {
      documents = requested
        .map((p) => ownedByPath.get(p))
        .filter(Boolean)
        .slice(0, 4);
    } else {
      documents = owned.slice(0, 4);
    }
  } catch {
    documents = [];
  }

  let result;
  try {
    result = await extractPreferencesFromMedicalProfile(body, documents);
  } catch (err) {
    return next(
      new ErrorHandler(
        err?.message || "Could not build recommendations from your medical record",
        err?.statusCode || 502,
      ),
    );
  }

  if (!result?.preferences || (Array.isArray(result.missing) && result.missing.length > 0)) {
    return res.status(200).json({
      success: false,
      missing: result?.missing || ["searchZipCode"],
      message:
        "Add a 5-digit ZIP code (and budget/radius if needed) so we can search nearby communities.",
      preferences: result?.preferences || null,
      documentsAnalyzed: result?.documentsAnalyzed || 0,
    });
  }

  res.status(200).json({
    success: true,
    preferences: result.preferences,
    documentsAnalyzed: result.documentsAnalyzed || 0,
  });
});

/**
 * POST /api/facilities/parse-medical-documents
 * Upload medical docs/images → AI fills medical history form fields.
 * Also appends uploaded files to the user's care_documents.
 */
export const postParseMedicalDocuments = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.user?.id);
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  const uploaded = Array.isArray(req.files) ? req.files : [];
  const bodyPaths = Array.isArray(req.body?.document_paths)
    ? req.body.document_paths.map((p) => String(p || "").trim()).filter(Boolean)
    : typeof req.body?.document_paths === "string" && req.body.document_paths
      ? (() => {
          try {
            const parsed = JSON.parse(req.body.document_paths);
            return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
          } catch {
            return [String(req.body.document_paths).trim()].filter(Boolean);
          }
        })()
      : [];

  const previousDocs = Array.isArray(user.care_documents) ? user.care_documents : [];
  const newDocs = uploaded.map((file) => ({
    path: `/uploads/user-care/${file.filename}`,
    originalName: file.originalname || file.filename,
    mimeType: file.mimetype || "",
    size: file.size || 0,
    uploadedAt: new Date(),
  }));

  if (newDocs.length > 0) {
    user.care_documents = [...previousDocs, ...newDocs].slice(0, 12);
    user.markModified("care_documents");
    await user.save();
  }

  const owned = Array.isArray(user.care_documents) ? user.care_documents : [];
  const ownedByPath = new Map(
    owned.filter((d) => d?.path).map((d) => [String(d.path), d]),
  );

  let documents = [];
  if (newDocs.length > 0) {
    documents = newDocs;
  } else if (bodyPaths.length > 0) {
    documents = bodyPaths.map((p) => ownedByPath.get(p)).filter(Boolean).slice(0, 4);
  } else {
    documents = owned.slice(-4);
  }

  if (!documents.length) {
    return next(new ErrorHandler("Upload a PDF or image to fill Medical History.", 400));
  }

  let fields;
  try {
    fields = await extractMedicalHistoryFieldsFromDocuments(documents);
  } catch (err) {
    return next(
      new ErrorHandler(
        err?.message || "Could not read medical documents",
        err?.statusCode || 502,
      ),
    );
  }

  if (!fields?.medical_issues && !fields?.documentsAnalyzed) {
    return res.status(200).json({
      success: false,
      message:
        "Could not extract medical history from that file. Try a clearer PDF or photo.",
      fields: null,
      documents: owned,
    });
  }

  res.status(200).json({
    success: true,
    fields: {
      medical_issues: fields.medical_issues || "",
      bio: fields.bio || "",
      care_background: fields.care_background || "",
      desired_services: fields.desired_services || [],
      desired_amenities: fields.desired_amenities || [],
    },
    documentsAnalyzed: fields.documentsAnalyzed || 0,
    documents: owned,
    user,
  });
});
