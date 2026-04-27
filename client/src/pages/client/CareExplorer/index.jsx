import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { apiClient } from "../../../services/api";
import { getUser } from "../../../store/auth/authSlice";
import SEO from "../../../components/common/SEO";
import CareExplorerBar from "../../../components/client/CareExplorer/CareExplorerBar";
import FiltersSidebar from "../../../components/client/CareExplorer/FiltersSidebar";
import FacilityCard from "../../../components/client/CareExplorer/FacilityCard";
import {
  getGoogleMapsApiKey,
  loadGoogleMapsScript,
} from "../../../lib/loadGoogleMaps";
import { scrollToCarrieHeroThenOpenChat } from "../../../utils/scrollToCarrieHeroTagline";

const API_BASE =
  typeof import.meta.env.VITE_REACT_APP_API_BASE_URL === "string"
    ? import.meta.env.VITE_REACT_APP_API_BASE_URL.replace(/\/$/, "")
    : "";

function resolveFacilityImageUrl(path) {
  if (!path || typeof path !== "string") return null;
  if (/^https?:\/\//i.test(path)) return path;
  if (!API_BASE) return path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

const DEFAULT_CARD_IMAGE = "/assets/images/imgForFindCare.svg";
const DEFAULT_PRICE_RANGE = "Price on call";
const DEFAULT_MAP_CENTER = { lat: 40.7128, lng: -74.006 };
const DEFAULT_NEARBY_RADIUS_MILES = 30;
const FAVORITE_FACILITY_IDS_STORAGE_KEY = "carematch_favorite_facility_ids";
const FIXED_AMENITY_OPTIONS = [
  "Private room preferred",
  "Pet-friendly",
  "Couples accommodation",
  "Cultural or language-specific care",
  "Faith-based community",
  "LGBTQ+ welcoming",
  "Diabetes management",
  "Physical therapy",
  "Hospice care",
  "Respiratory support",
  "Dialysis access nearby",
];
const FIXED_CARE_TYPE_OPTIONS = [
  "Assisted Living",
  "Skilled Nursing",
  "Hospice Care",
  "Physical Therapy",
  "Memory Care",
  "Independent Living",
];

const CARE_TYPE_ALIASES = {
  "assisted living": ["assisted living", "assisted"],
  "skilled nursing": ["skilled nursing", "snf", "nursing home", "subacute"],
  "memory care": ["memory care", "dementia", "alzheimer"],
  "independent living": ["independent living", "independent"],
  hospice: ["hospice"],
  "physical therapy": ["physical therapy", "therapy"],
};

const AMENITY_ALIASES = {
  "private room preferred": ["private room", "private rooms", "private room preferred"],
  "pet-friendly": ["pet friendly", "pet-friendly"],
  "couples accommodation": ["couples accommodation", "couples"],
  "cultural or language-specific care": [
    "cultural care",
    "language specific",
    "language-specific",
    "cultural or language-specific care",
  ],
  "faith-based community": ["faith based", "faith-based community"],
  "lgbtq+ welcoming": ["lgbtq", "lgbtq+", "lgbtq welcoming", "lgbtq+ welcoming"],
  "diabetes management": ["diabetes", "diabetes management"],
  "physical therapy": ["physical therapy", "therapy services", "therapy"],
  "hospice care": ["hospice", "hospice care"],
  "respiratory support": ["respiratory", "respiratory support"],
  "dialysis access nearby": ["dialysis", "dialysis access", "dialysis access nearby"],
};

function formatPriceRange(rawPricing) {
  const raw = String(rawPricing || "").trim();
  const nums = [...raw.matchAll(/(\d[\d,]*)/g)]
    .map((m) => Number.parseInt(m[1].replace(/,/g, ""), 10))
    .filter((n) => !Number.isNaN(n) && n > 0);

  if (nums.length === 0) return DEFAULT_PRICE_RANGE;
  if (nums.length === 1) return `$${nums[0].toLocaleString("en-US")}/mo`;
  const low = Math.min(...nums);
  const high = Math.max(...nums);
  return `$${low.toLocaleString("en-US")} - $${high.toLocaleString("en-US")}/mo`;
}

function parsePriceRangeNumbers(rawPricing) {
  const raw = String(rawPricing || "").trim();
  const nums = [...raw.matchAll(/(\d[\d,]*)/g)]
    .map((m) => Number.parseInt(m[1].replace(/,/g, ""), 10))
    .filter((n) => !Number.isNaN(n) && n > 0);
  if (nums.length === 0) return { min: null, max: null };
  if (nums.length === 1) return { min: nums[0], max: nums[0] };
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

function averagePriceFromText(rawPricing) {
  const { min, max } = parsePriceRangeNumbers(rawPricing);
  if (min != null && max != null) return Math.round((min + max) / 2);
  if (min != null) return min;
  if (max != null) return max;
  return null;
}

function distanceMiles(a, b) {
  const toRad = (n) => (n * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(h));
}

function titleCase(s) {
  return String(s || "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function normalizeToken(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9+]+/g, " ")
    .trim();
}

function mapSelectionsToOptions(incomingValues, options, aliases = {}) {
  const selected = [];
  const normalizedIncoming = (Array.isArray(incomingValues) ? incomingValues : [])
    .map((v) => normalizeToken(v))
    .filter(Boolean);

  options.forEach((option) => {
    const normalizedOption = normalizeToken(option);
    const aliasList = (aliases[normalizedOption] || []).map((a) => normalizeToken(a));
    const matchTerms = [normalizedOption, ...aliasList].filter(Boolean);
    const matched = normalizedIncoming.some((input) =>
      matchTerms.some((term) => input === term || input.includes(term) || term.includes(input)),
    );
    if (matched) selected.push(option);
  });

  return [...new Set(selected)];
}

// US state name → abbreviation lookup for location filter
const US_STATE_ABBR = {
  alabama: "al", alaska: "ak", arizona: "az", arkansas: "ar", california: "ca",
  colorado: "co", connecticut: "ct", delaware: "de", florida: "fl", georgia: "ga",
  hawaii: "hi", idaho: "id", illinois: "il", indiana: "in", iowa: "ia",
  kansas: "ks", kentucky: "ky", louisiana: "la", maine: "me", maryland: "md",
  massachusetts: "ma", michigan: "mi", minnesota: "mn", mississippi: "ms",
  missouri: "mo", montana: "mt", nebraska: "ne", nevada: "nv",
  "new hampshire": "nh", "new jersey": "nj", "new mexico": "nm", "new york": "ny",
  "north carolina": "nc", "north dakota": "nd", ohio: "oh", oklahoma: "ok",
  oregon: "or", pennsylvania: "pa", "rhode island": "ri", "south carolina": "sc",
  "south dakota": "sd", tennessee: "tn", texas: "tx", utah: "ut",
  vermont: "vt", virginia: "va", washington: "wa", "west virginia": "wv",
  wisconsin: "wi", wyoming: "wy", "district of columbia": "dc",
};

/**
 * Returns true if the facility's full address matches the location query.
 * Handles: city names, state full names, state abbreviations, zip codes.
 */
function addressMatchesLocation(fullAddress, locationQuery) {
  if (!locationQuery) return true;
  const addr = String(fullAddress || "").toLowerCase();
  const query = locationQuery.toLowerCase().trim();
  if (!query) return true;

  // If facility has no address data, don't hide it — incomplete data shouldn't remove results
  if (!addr) return true;

  // 1. Direct substring match (city names, zip codes, full state name spelled out)
  if (addr.includes(query)) return true;

  // 2. State full name → try abbreviation match in address (e.g. "new jersey" → "nj")
  const abbr = US_STATE_ABBR[query];
  if (abbr) {
    // Word-boundary match — catches ", NJ", " NJ ", "NJ,", "NJ 07030" etc.
    if (new RegExp(`\\b${abbr}\\b`).test(addr)) return true;
  }

  // 3. Handle "City, State" queries e.g. "Newark, NJ" or "Newark, New Jersey"
  if (query.includes(",")) {
    const [city, stateRaw] = query.split(",").map((s) => s.trim());
    const stateAbbr = US_STATE_ABBR[stateRaw] || stateRaw;
    if (city && addr.includes(city)) {
      if (addr.includes(stateAbbr)) return true;
      if (stateRaw && addr.includes(stateRaw)) return true;
    }
  }

  // 4. User typed a 2-letter abbreviation like "NJ" — word-boundary match
  if (/^[a-z]{2}$/.test(query)) {
    if (new RegExp(`\\b${query}\\b`).test(addr)) return true;
    // Also try reverse: "nj" → find "new jersey" in address
    const fullName = Object.keys(US_STATE_ABBR).find((k) => US_STATE_ABBR[k] === query);
    if (fullName && addr.includes(fullName)) return true;
  }

  return false;
}

function locationMatchStrength(query, address, distance) {
  if (!query) return 1;
  const q = String(query).toLowerCase().trim();
  const addr = String(address || "").toLowerCase();

  // 1. Direct hit (Full match or ZIP match)
  if (addr.includes(q)) return 1.0;

  // 2. Distance hit (if geocoding worked and we have miles)
  if (typeof distance === "number" && !Number.isNaN(distance)) {
    if (distance <= 5) return 0.95;
    if (distance <= 15) return 0.8;
    if (distance <= 30) return 0.6;
    if (distance <= 50) return 0.4;
    return 0.1;
  }

  // 3. Partial overlap or state/city match logic
  if (addressMatchesLocation(address, query)) return 0.75;

  return 0;
}

function normalizeFacilityForCard(m) {
  const externalData =
    m && typeof m.external_data === "object" && m.external_data
      ? m.external_data
      : {};
  const googlePlaces =
    externalData && typeof externalData.google_places === "object"
      ? externalData.google_places
      : {};
  const latForMap =
    googlePlaces.latitude != null && !Number.isNaN(Number(googlePlaces.latitude))
      ? Number(googlePlaces.latitude)
      : externalData.latitude != null && !Number.isNaN(Number(externalData.latitude))
        ? Number(externalData.latitude)
        : m.latitude != null && !Number.isNaN(Number(m.latitude))
          ? Number(m.latitude)
          : null;
  const lngForMap =
    googlePlaces.longitude != null && !Number.isNaN(Number(googlePlaces.longitude))
      ? Number(googlePlaces.longitude)
      : externalData.longitude != null && !Number.isNaN(Number(externalData.longitude))
        ? Number(externalData.longitude)
        : m.longitude != null && !Number.isNaN(Number(m.longitude))
          ? Number(m.longitude)
          : null;

  const firstImg =
    Array.isArray(m.images) && m.images.length ? m.images[0] : null;
  let imageSrc = resolveFacilityImageUrl(firstImg) || null;
  if (!imageSrc && Array.isArray(m.images) && m.images.length > 1) {
    for (let i = 1; i < m.images.length; i += 1) {
      const u = resolveFacilityImageUrl(m.images[i]);
      if (u) {
        imageSrc = u;
        break;
      }
    }
  }
  const mapsKey = getGoogleMapsApiKey();
  if (
    !imageSrc &&
    mapsKey &&
    latForMap != null &&
    lngForMap != null &&
    Number.isFinite(latForMap) &&
    Number.isFinite(lngForMap)
  ) {
    imageSrc = `https://maps.googleapis.com/maps/api/staticmap?center=${latForMap},${lngForMap}&zoom=16&size=600x360&scale=2&maptype=roadmap&markers=color:0x14b8a6%7C${latForMap},${lngForMap}&key=${encodeURIComponent(mapsKey)}`;
  }
  if (!imageSrc) imageSrc = DEFAULT_CARD_IMAGE;
  const category =
    Array.isArray(m.care_levels) && m.care_levels.length
      ? m.care_levels.join(" · ").toUpperCase()
      : "SENIOR LIVING";
  const features =
    Array.isArray(m.reasons) && m.reasons.length
      ? m.reasons.map((r) =>
        String(r)
          .replace(/^[✓○]\s*/, "")
          .trim(),
      )
      : ["Review listing details and tour to validate fit"];
  const pricingTextFromFields =
    String(m.pricing || "").trim() || String(externalData.pricing || "").trim();
  const budgetObject =
    m && typeof m.budget === "object" && m.budget
      ? m.budget
      : externalData && typeof externalData.budget === "object" && externalData.budget
        ? externalData.budget
        : null;
  const budgetMin =
    budgetObject?.min_monthly != null && !Number.isNaN(Number(budgetObject.min_monthly))
      ? Number(budgetObject.min_monthly)
      : null;
  const budgetMax =
    budgetObject?.max_monthly != null && !Number.isNaN(Number(budgetObject.max_monthly))
      ? Number(budgetObject.max_monthly)
      : null;
  const pricingTextFromBudget =
    budgetMin != null && budgetMax != null
      ? `$${budgetMin.toLocaleString("en-US")} - $${budgetMax.toLocaleString("en-US")}/mo`
      : budgetMin != null
        ? `$${budgetMin.toLocaleString("en-US")}/mo`
        : budgetMax != null
          ? `$${budgetMax.toLocaleString("en-US")}/mo`
          : "";
  const finesAmount = Number(externalData.total_fines_amount);
  const pricingText =
    pricingTextFromFields ||
    pricingTextFromBudget ||
    (Number.isFinite(finesAmount) && finesAmount > 0
      ? `$${finesAmount.toLocaleString("en-US")}/mo`
      : "");
  const formattedPriceRange = formatPriceRange(pricingText);
  const priceRange = formattedPriceRange;
  const numericPrice = parsePriceRangeNumbers(pricingText);
  const overallRating =
    externalData.overall_rating != null &&
      !Number.isNaN(Number(externalData.overall_rating))
      ? Number(externalData.overall_rating)
      : googlePlaces.total_score != null &&
        !Number.isNaN(Number(googlePlaces.total_score))
        ? Number(googlePlaces.total_score)
        : null;
  const reviewCountRaw =
    googlePlaces.review_count ??
    m?.apify_raw?.reviewsCount ??
    m?.apify_raw?.reviews_count ??
    null;
  const reviewCountValue =
    reviewCountRaw != null && !Number.isNaN(Number(reviewCountRaw))
      ? Number(reviewCountRaw)
      : null;
  const providerUrl = String(externalData.provider_url || "").trim();
  const phone =
    String(
      m.phone ||
      m.phone_number ||
      externalData.phone_number ||
      externalData.phone ||
      "",
    ).trim() || "N/A";
  const zipCode =
    String(
      m.zip_code ||
      m.zipCode ||
      externalData.zip_code ||
      externalData.zipCode ||
      "",
    ).trim() || "";
  const distance =
    m.address && String(m.address).trim()
      ? String(m.address).trim().slice(0, 48) +
      (String(m.address).length > 48 ? "…" : "")
      : "Address on file";
  return {
    key: m.facilityId || m._id || m.name,
    matchPercent: typeof m.score === "number" ? m.score : 0,
    imageSrc,
    category,
    name: m.name || "Community",
    priceRange,
    priceMin: numericPrice.min,
    priceMax: numericPrice.max,
    distance,
    features,
    address: m.address || "",
    zipCode,
    phone,
    website: m.website || "",
    rating: overallRating != null ? overallRating : 4.8,
    reviewCount: reviewCountValue,
    ratingLabel: overallRating != null ? "CMS rating" : "family reviews",
    specialty: Array.isArray(m.specialty) ? m.specialty : [],
    description: m.description || "",
    sourcePlatform: m.source_platform || "",
    isExternal: Boolean(m.is_external),
    externalSourceUrl: m.external_source_url || providerUrl,
    careLevels: Array.isArray(m.care_levels) ? m.care_levels : [],
    amenities: Array.isArray(m.amenities) ? m.amenities : [],
    services: Array.isArray(m.services) ? m.services : [],
    availability: m.availability || "Within 30 Days",
    lat: googlePlaces.latitude ?? externalData.latitude ?? m.latitude ?? null,
    lng: googlePlaces.longitude ?? externalData.longitude ?? m.longitude ?? null,
  };
}

function extractFiveDigitZip(text) {
  const m = String(text || "").match(/\b(\d{5})(?:-\d{4})?\b/);
  return m ? m[1] : "";
}

/** Normalize for fuzzy checkbox / listing match (hyphens, case). */
function normMatchToken(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function amenityText(x) {
  if (x == null) return "";
  if (typeof x === "string") return x;
  if (typeof x === "object" && x.name != null) return String(x.name);
  return String(x);
}

/** Tokens to match in facility text for one sidebar "must-have" selection. */
function amenityMatchVariants(selectedLower) {
  const key = normMatchToken(selectedLower);
  if (!key) return [];
  for (const [label, aliases] of Object.entries(AMENITY_ALIASES)) {
    const labelN = normMatchToken(label);
    if (labelN === key) {
      return [...new Set([labelN, ...aliases.map((a) => normMatchToken(a))])].filter(
        Boolean,
      );
    }
    if (aliases.some((a) => normMatchToken(a) === key)) {
      return [...new Set([labelN, ...aliases.map((a) => normMatchToken(a)), key])].filter(
        Boolean,
      );
    }
  }
  return [key];
}

function deriveServicesFromPreferencePhrases(values) {
  const text = (Array.isArray(values) ? values : [])
    .map((item) => String(item || "").toLowerCase())
    .join(" | ");
  const services = [];
  if (/\bhospice\b/.test(text)) services.push("hospice care");
  if (/\bphysical therapy|therapy\b/.test(text)) services.push("physical therapy");
  if (/\boccupational therapy\b/.test(text)) services.push("occupational therapy");
  if (/\bsocial|activities|engagement|community\b/.test(text)) services.push("social activities");
  if (/\boutdoor|garden|courtyard|walking path\b/.test(text)) services.push("outdoor spaces");
  if (/\bwheelchair|accessible|mobility\b/.test(text)) services.push("wheelchair accessibility");
  if (/\bparking\b/.test(text)) services.push("accessible parking");
  return [...new Set(services)];
}

function deriveDiscoverKeywords(filters) {
  const keywords = [];
  const searchQuery = String(filters?.searchQuery || "").trim();
  const selectedAvailability = Array.isArray(filters?.selectedAvailability)
    ? filters.selectedAvailability
      .map((value) => String(value || "").trim())
      .filter(Boolean)
    : [];
  const sortBy = String(filters?.sortBy || "").trim();

  if (searchQuery) {
    keywords.push(searchQuery);
  }

  if (selectedAvailability.length > 0) {
    keywords.push(`Move-in timeline: ${selectedAvailability.join(", ")}`);
  }

  const sortKeywordMap = {
    bestMatch: "Best overall match",
    overallQuality: "Overall quality",
    nearest: "Nearest first",
    lowestPrice: "Lowest estimated price",
  };
  if (sortKeywordMap[sortBy]) {
    keywords.push(`Ranking preference: ${sortKeywordMap[sortBy]}`);
  }

  return [...new Set(keywords)];
}

function buildEffectiveLocationQuery(locationQuery, zipCode) {
  const location = String(locationQuery || "").trim();
  const zip = String(zipCode || "")
    .replace(/\D/g, "")
    .slice(0, 5);
  if (location && zip) {
    const locationZip = extractFiveDigitZip(location);
    if (location === zip || locationZip === zip) return location;
    return `${location} ${zip}`;
  }
  if (location) return location;
  if (zip) return zip;
  return "";
}

function normalizeLocationFieldValue(locationQuery, zipCode) {
  const rawLocation = String(locationQuery || "").trim();
  const zip = String(zipCode || "")
    .replace(/\D/g, "")
    .slice(0, 5);
  if (!rawLocation) return "";
  if (/^\d{5}$/.test(rawLocation)) return zip && rawLocation === zip ? "" : rawLocation;

  let normalized = rawLocation;
  if (zip) {
    normalized = normalized.replace(new RegExp(`\\b${zip}\\b`, "g"), "");
  }

  normalized = normalized
    .replace(/\bZIP\b/gi, "")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,/g, ", ")
    .replace(/\s{2,}/g, " ")
    .replace(/^,\s*|\s*,$/g, "")
    .trim();

  return normalized;
}

function inferCityStateFromMatches(matches) {
  if (!Array.isArray(matches)) return "";

  for (const match of matches) {
    const address = String(match?.address || "").trim();
    if (!address) continue;

    const parts = address
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length >= 2) {
      const city = parts[parts.length - 2];
      const stateMatch = parts[parts.length - 1].match(/\b([A-Z]{2})\b/i);
      const state = stateMatch?.[1]?.toUpperCase() || "";
      if (city && state) return `${city}, ${state}`;
      if (city) return city;
    }
  }

  return "";
}

function computeFacilityMiles(facility, locationCenterCoords) {
  if (
    locationCenterCoords &&
    Number.isFinite(Number(facility?.lat)) &&
    Number.isFinite(Number(facility?.lng))
  ) {
    return distanceMiles(locationCenterCoords, {
      lat: Number(facility.lat),
      lng: Number(facility.lng),
    });
  }
  if (
    Number.isFinite(Number(facility?.distanceMiles)) &&
    Number(facility.distanceMiles) >= 0
  ) {
    return Number(facility.distanceMiles);
  }
  const parsed = Number.parseFloat(
    String(facility?.distance || "").match(/(\d+(?:\.\d+)?)\s*miles?/i)?.[1],
  );
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function formatDistanceLabel(distanceInMiles, zipCode) {
  if (Number.isFinite(distanceInMiles) && distanceInMiles >= 0) {
    const rounded =
      distanceInMiles < 10
        ? distanceInMiles.toFixed(1)
        : Math.round(distanceInMiles).toString();
    return `${rounded} miles away`;
  }
  const zip = String(zipCode || "").trim();
  if (zip) return `ZIP ${zip}`;
  return "Local match";
}

function computeOverallQualityScore(facility) {
  const rating = Number(facility?.rating);
  const reviewCount = Number(facility?.reviewCount);
  const ratingScore = Number.isFinite(rating)
    ? Math.min(Math.max(rating / 5, 0), 1)
    : 0.72;
  const reviewScore =
    Number.isFinite(reviewCount) && reviewCount > 0
      ? Math.min(1, Math.log10(reviewCount + 1) / Math.log10(501))
      : 0;
  return ratingScore * 0.82 + reviewScore * 0.18;
}

function averageFacilityPrice(facility) {
  const low = facility?.priceMin ?? facility?.priceMax;
  const high = facility?.priceMax ?? facility?.priceMin;
  if (low != null && high != null) return Math.round((Number(low) + Number(high)) / 2);
  if (low != null) return Number(low);
  if (high != null) return Number(high);
  return Number.POSITIVE_INFINITY;
}

function sanitizeMonthlyBudgetValue(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  if (parsed > 100000) return null;
  return Math.round(parsed);
}

/** Build POST /api/facilities/discover body from sidebar + optional Carrie intake. */
function buildDiscoverRequestBody(filters, carrieFilters, carrieLocationQuery) {
  const locRaw = String(filters.locationQuery || carrieLocationQuery || "").trim();
  const explicitZip = String(filters.zipCode || "")
    .replace(/\D/g, "")
    .slice(0, 5);
  const zipFromPrefs = String(carrieFilters?.searchZipCode || "")
    .replace(/\D/g, "")
    .slice(0, 5);
  const zip =
    explicitZip ||
    extractFiveDigitZip(locRaw) ||
    extractFiveDigitZip(String(carrieLocationQuery || "")) ||
    extractFiveDigitZip(String(carrieFilters?.searchLocation || "")) ||
    (zipFromPrefs.length === 5 ? zipFromPrefs : "");
  const baseLocation =
    locRaw || String(carrieFilters?.searchLocation || "").trim();
  const location = buildEffectiveLocationQuery(baseLocation, zip);

  const care_levels =
    Array.isArray(filters.selectedCareTypes) && filters.selectedCareTypes.length > 0
      ? filters.selectedCareTypes.map((x) => String(x).toLowerCase())
      : Array.isArray(carrieFilters?.careLevels) && carrieFilters.careLevels.length > 0
        ? carrieFilters.careLevels.map((x) => String(x).toLowerCase())
        : ["assisted living"];

  const amenities = [
    ...(Array.isArray(filters.selectedAmenities)
      ? filters.selectedAmenities.map((x) => String(x))
      : []),
    ...(Array.isArray(carrieFilters?.amenityMustHaves)
      ? carrieFilters.amenityMustHaves.map((x) => String(x))
      : []),
  ]
    .map((x) => x.trim())
    .filter(Boolean);

  const services = deriveServicesFromPreferencePhrases(amenities);
  const keywords = deriveDiscoverKeywords(filters);
  const maxDistanceMiles = Number.parseFloat(String(filters.maxMiles || "").trim());

  return {
    zip_code: zip,
    location,
    care_levels,
    amenities: [...new Set(amenities)],
    services: [...new Set(services)],
    keywords,
    budget_min: Number(filters.budgetMin),
    budget_max: Number(filters.budgetMax),
    max_distance_miles:
      Number.isFinite(maxDistanceMiles) && maxDistanceMiles > 0
        ? Math.round(maxDistanceMiles)
        : null,
  };
}

const CareExplorer = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const carrieMatches = location.state?.carrieMatches;
  const carrieFilters = location.state?.carrieFilters;
  const fromCarrie = Boolean(location.state?.fromCarrie);
  const carrieLocationQuery = String(
    carrieFilters?.locationQuery || carrieFilters?.searchLocation || "",
  ).trim();
  const carrieZipCode = String(carrieFilters?.searchZipCode || "")
    .replace(/\D/g, "")
    .slice(0, 5);
  const normalizedCarrieLocationQueryRaw = normalizeLocationFieldValue(
    carrieLocationQuery,
    carrieZipCode,
  );
  const inferredCarrieLocationQuery =
    normalizedCarrieLocationQueryRaw || inferCityStateFromMatches(carrieMatches);

  const [view, setView] = useState("listing");
  const [layout, setLayout] = useState("single");
  const [scope, setScope] = useState("all");
  const [mobileFiltersCollapsed, setMobileFiltersCollapsed] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    locationQuery: inferredCarrieLocationQuery,
    zipCode: carrieZipCode,
    searchQuery: "",
    maxMiles: "",
    budgetMin: 1000,
    budgetMax: 15000,
    selectedCareTypes: [],
    selectedAvailability: ["Within 30 Days"],
    selectedAmenities: [],
    sortBy: "bestMatch",
  });
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const mapMarkersRef = useRef([]);
  const geocoderRef = useRef(null);
  const [mapError, setMapError] = useState("");
  const [mapsReady, setMapsReady] = useState(false);
  const [currentCoords, setCurrentCoords] = useState(null);
  const [locationCenterCoords, setLocationCenterCoords] = useState(null);
  const [nearbyMapFacilityKeys, setNearbyMapFacilityKeys] = useState([]);
  const [directoryFacilities, setDirectoryFacilities] = useState([]);
  /** `undefined` = use Carrie / directory; array = last live discover from filters (may be empty). */
  const [discoverOverrideRows, setDiscoverOverrideRows] = useState(undefined);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const discoverRunIdRef = useRef(0);
  const skipDiscoverMountRef = useRef(true);
  const skipQueryLogMountRef = useRef(true);
  const { isAuthenticated, userData } = useSelector(getUser);
  const [favoriteFacilityIds, setFavoriteFacilityIds] = useState([]);

  // Preload Google Maps + Places so the location autocomplete works immediately
  useEffect(() => {
    const apiKey = getGoogleMapsApiKey();
    if (apiKey) loadGoogleMapsScript(apiKey).catch(() => { });
  }, []);

  // Load initial favorites from backend or local storage
  useEffect(() => {
    const loadFavorites = async () => {
      if (isAuthenticated) {
        try {
          const response = await apiClient.get("/api/auth/favorites");
          if (response.data.success) {
            setFavoriteFacilityIds(response.data.favorites.map(id => String(id)));
            return;
          }
        } catch (error) {
          console.error("Failed to fetch favorites from database", error);
        }
      }

      // Fallback to local storage if not authenticated or API fails
      try {
        const raw = localStorage.getItem(FAVORITE_FACILITY_IDS_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        setFavoriteFacilityIds(Array.isArray(parsed) ? parsed.map((id) => String(id)) : []);
      } catch {
        setFavoriteFacilityIds([]);
      }
    };

    loadFavorites();
  }, [isAuthenticated]);

  const handleAskCarrie = () => {
    if (location.pathname !== "/") {
      navigate("/");
      window.setTimeout(() => {
        scrollToCarrieHeroThenOpenChat({ source: "care-explorer" });
      }, 120);
      return;
    }
    scrollToCarrieHeroThenOpenChat({ source: "care-explorer" });
  };

  const handleToggleFavorite = async (facilityId) => {
    const safeId = String(facilityId || "").trim();
    if (!safeId) return;

    // Optimistic UI update
    setFavoriteFacilityIds((prev) =>
      prev.includes(safeId)
        ? prev.filter((id) => id !== safeId)
        : [...prev, safeId],
    );

    if (isAuthenticated) {
      try {
        await apiClient.post("/api/auth/toggle-favorite", { facilityId: safeId });
      } catch (error) {
        console.error("Failed to sync favorite with database", error);
        // Rollback on failure if you want to be strict, but for likes usually it's fine
      }
    }
  };

  useEffect(() => {
    localStorage.setItem(
      FAVORITE_FACILITY_IDS_STORAGE_KEY,
      JSON.stringify(favoriteFacilityIds),
    );
  }, [favoriteFacilityIds]);

  const liveFacilities = useMemo(() => {
    if (!Array.isArray(carrieMatches) || carrieMatches.length === 0)
      return null;
    return carrieMatches.map(normalizeFacilityForCard);
  }, [carrieMatches]);

  const baseFacilities = useMemo(() => {
    if (discoverOverrideRows !== undefined) {
      return Array.isArray(discoverOverrideRows) ? discoverOverrideRows : [];
    }
    if (liveFacilities?.length) return liveFacilities;
    if (directoryFacilities.length) return directoryFacilities;
    return [];
  }, [discoverOverrideRows, liveFacilities, directoryFacilities]);

  const careTypeOptions = useMemo(() => {
    return FIXED_CARE_TYPE_OPTIONS;
  }, []);

  const amenityOptions = useMemo(() => FIXED_AMENITY_OPTIONS, []);
  const availabilityOptions = useMemo(() => {
    const base = [
      ...new Set(
        baseFacilities
          .map((f) => String(f.availability || "").trim())
          .filter(Boolean),
      ),
    ];
    return base.length ? base : ["Immediate", "Within 30 Days", "Future Planning"];
  }, [baseFacilities]);

  useEffect(() => {
    if (!fromCarrie || !carrieFilters) return;
    const maxBudget = sanitizeMonthlyBudgetValue(carrieFilters.budgetMaxMonthly) ?? 15000;
    const safeMax = Math.min(15000, Math.max(1000, Math.round(maxBudget)));
    setFilters((prev) => ({
      ...prev,
      locationQuery: normalizeLocationFieldValue(
        carrieLocationQuery,
        carrieZipCode,
      ) || inferCityStateFromMatches(carrieMatches),
      zipCode: carrieZipCode,
      budgetMax: safeMax,
      selectedCareTypes: Array.isArray(carrieFilters.careLevels)
        ? mapSelectionsToOptions(
          carrieFilters.careLevels.map((x) => titleCase(x)),
          careTypeOptions,
          CARE_TYPE_ALIASES,
        )
        : prev.selectedCareTypes,
      selectedAmenities: Array.isArray(carrieFilters.amenityMustHaves)
        ? mapSelectionsToOptions(
          carrieFilters.amenityMustHaves.map((x) => String(x).trim()),
          amenityOptions,
          AMENITY_ALIASES,
        )
        : prev.selectedAmenities,
      selectedAvailability:
        typeof carrieFilters.availability === "string" &&
          carrieFilters.availability.trim()
          ? [carrieFilters.availability.trim()]
          : prev.selectedAvailability,
      maxMiles:
        carrieFilters.maxDistanceMiles != null &&
          !Number.isNaN(Number(carrieFilters.maxDistanceMiles))
          ? String(carrieFilters.maxDistanceMiles)
          : prev.maxMiles,
    }));
  }, [fromCarrie, carrieFilters, carrieLocationQuery, carrieMatches, careTypeOptions, amenityOptions]);

  useEffect(() => {
    const query = buildEffectiveLocationQuery(
      String(filters.locationQuery || carrieLocationQuery || "").trim(),
      filters.zipCode,
    );
    if (!query) {
      setLocationCenterCoords(null);
      return;
    }

    let cancelled = false;
    const apiKey = getGoogleMapsApiKey();
    if (!apiKey) {
      setLocationCenterCoords(null);
      return;
    }

    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (cancelled || !window.google?.maps?.Geocoder) return;
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address: query }, (results, status) => {
          if (cancelled) return;
          if (
            status === "OK" &&
            Array.isArray(results) &&
            results[0]?.geometry?.location
          ) {
            const loc = results[0].geometry.location;
            setLocationCenterCoords({ lat: loc.lat(), lng: loc.lng() });
            return;
          }
          setLocationCenterCoords(null);
        });
      })
      .catch(() => {
        if (!cancelled) setLocationCenterCoords(null);
      });

    return () => {
      cancelled = true;
    };
  }, [filters.locationQuery, filters.zipCode, carrieLocationQuery]);

  useEffect(() => {
    if (fromCarrie || !API_BASE) return;
    let cancelled = false;
    axios
      .get(`${API_BASE}/api/facilities/public`, { withCredentials: true })
      .then((res) => {
        if (cancelled) return;
        const rows = Array.isArray(res?.data?.facilities)
          ? res.data.facilities
          : [];
        setDirectoryFacilities(rows.map(normalizeFacilityForCard));
      })
      .catch(() => {
        if (cancelled) return;
        setDirectoryFacilities([]);
      });
    return () => {
      cancelled = true;
    };
  }, [fromCarrie]);

  useEffect(() => {
    if (skipQueryLogMountRef.current) {
      skipQueryLogMountRef.current = false;
      return;
    }

    const query = buildDiscoverRequestBody(filters, carrieFilters, carrieLocationQuery);
    console.log("[CareExplorer] Updated discover query:", query);
  }, [filters, carrieFilters, carrieLocationQuery]);

  // Debounced live discover when filters change (same engine as Carrie / results.js).
  useEffect(() => {
    if (skipDiscoverMountRef.current) {
      skipDiscoverMountRef.current = false;
      return;
    }

    const body = buildDiscoverRequestBody(filters, carrieFilters, carrieLocationQuery);
    if (!body.zip_code || !String(body.location || "").trim()) {
      return;
    }

    const runId = ++discoverRunIdRef.current;
    const timer = window.setTimeout(async () => {
      setDiscoverLoading(true);
      try {
        const { data } = await apiClient.post("/api/facilities/discover", body);
        if (runId !== discoverRunIdRef.current) return;
        const rows = Array.isArray(data?.facilities) ? data.facilities : [];
        setDiscoverOverrideRows(rows.map(normalizeFacilityForCard));
      } catch (err) {
        if (runId !== discoverRunIdRef.current) return;
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Request failed";
        toast.error("Could not refresh listings", { description: String(msg) });
      } finally {
        if (runId === discoverRunIdRef.current) {
          setDiscoverLoading(false);
        }
      }
    }, 650);

    return () => window.clearTimeout(timer);
  }, [
    filters.budgetMin,
    filters.budgetMax,
    filters.zipCode,
    filters.locationQuery,
    filters.searchQuery,
    filters.maxMiles,
    filters.selectedAmenities,
    filters.selectedAvailability,
    filters.selectedCareTypes,
    filters.sortBy,
    carrieFilters,
    carrieLocationQuery,
  ]);

  useEffect(() => {
    if (discoverOverrideRows !== undefined) {
      setPage(1);
    }
  }, [discoverOverrideRows]);

  const scopedFacilities = useMemo(() => {
    if (scope !== "saved") return baseFacilities;
    const favoriteSet = new Set(favoriteFacilityIds.map((id) => String(id)));
    return baseFacilities.filter((f) =>
      favoriteSet.has(String(f.key ?? f.facilityId ?? f.name)),
    );
  }, [scope, baseFacilities, favoriteFacilityIds]);

  const filteredFacilities = useMemo(() => {
    const q = String(filters.searchQuery || "")
      .trim()
      .toLowerCase();
    const locationQuery = String(filters.locationQuery || carrieLocationQuery || "")
      .trim()
      .toLowerCase();
    const isZipOnlyLocationQuery = /^\d{5}$/.test(locationQuery);
    const maxMilesNum = Number.parseFloat(
      String(filters.maxMiles || "").trim(),
    );
    const budgetMin = Number(filters.budgetMin) || 1000;
    const budgetMax = Number(filters.budgetMax) || 15000;
    const selectedCare = new Set(
      (filters.selectedCareTypes || []).map((x) => String(x).toLowerCase()),
    );
    const selectedAmenities = (filters.selectedAmenities || []).map((x) =>
      String(x).toLowerCase(),
    );
    const selectedAvailability = new Set(
      (filters.selectedAvailability || []).map((x) => String(x).toLowerCase()),
    );

    return scopedFacilities.filter((f) => {
      if (locationQuery && !isZipOnlyLocationQuery) {
        // Use improved location matching that handles state names and abbreviations
        if (!addressMatchesLocation(f.address, locationQuery)) return false;
      }

      if (q) {
        const text =
          `${f.name || ""} ${f.category || ""} ${f.address || ""} ${(f.features || []).join(" ")}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      if (f.priceMin != null || f.priceMax != null) {
        const low = f.priceMin ?? f.priceMax;
        const high = f.priceMax ?? f.priceMin;
        if (low != null && high != null) {
          const overlaps = low <= budgetMax && high >= budgetMin;
          if (!overlaps) return false;
        }
      }

      if (selectedCare.size > 0) {
        const levels = [
          ...(f.careLevels || []).map((x) => normMatchToken(x)),
          normMatchToken(f.category),
        ].filter(Boolean);
        const hasCare = [...selectedCare].some((c) => {
          const cn = normMatchToken(c);
          if (!cn) return false;
          return levels.some((l) => l.includes(cn) || cn.includes(l));
        });
        if (!hasCare) return false;
      }

      if (selectedAmenities.length > 0) {
        const pool = [
          ...(f.amenities || []).map(amenityText),
          ...(f.services || []).map(amenityText),
          ...(f.features || []).map(amenityText),
          String(f.description || ""),
          String(f.name || ""),
        ]
          .map((x) => normMatchToken(x))
          .filter(Boolean);
        const hasAllMustHaves = selectedAmenities.every((a) => {
          const variants = amenityMatchVariants(a);
          if (variants.length === 0) return true;
          return variants.some((want) =>
            pool.some((p) => p.includes(want) || want.includes(p)),
          );
        });
        if (!hasAllMustHaves) return false;
      }

      if (selectedAvailability.size > 0) {
        const a = String(f.availability || "").toLowerCase();
        if (a && !selectedAvailability.has(a)) return false;
      }

      if (!Number.isNaN(maxMilesNum) && maxMilesNum > 0) {
        const facilityMiles = computeFacilityMiles(f, locationCenterCoords);
        if (!Number.isNaN(facilityMiles) && facilityMiles > maxMilesNum)
          return false;
      }

      return true;
    });
  }, [filters, scopedFacilities, carrieLocationQuery, locationCenterCoords]);

  const rankedFacilities = useMemo(() => {
    const locationQuery = String(filters.locationQuery || carrieLocationQuery || "")
      .trim()
      .toLowerCase();
    const searchQuery = String(filters.searchQuery || "").trim().toLowerCase();
    const selectedCare = (filters.selectedCareTypes || []).map((x) =>
      String(x).toLowerCase(),
    );
    const selectedAmenities = (filters.selectedAmenities || []).map((x) =>
      String(x).toLowerCase(),
    );
    const selectedAvailability = (filters.selectedAvailability || []).map((x) =>
      String(x).toLowerCase(),
    );
    const budgetMin = Number(filters.budgetMin) || 1000;
    const budgetMax = Number(filters.budgetMax) || 15000;
    const sortBy = String(filters.sortBy || "bestMatch");

    const getRelevanceScore = (facility) => {
      let score = 0;

      // Keep backend/LLM match signal as a baseline.
      const backendMatchScore = Number(facility.matchPercent) || 0;
      score += Math.min(20, Math.max(0, backendMatchScore * 0.2));

      // Location is the first-order ranking signal.
      const locationStrength = locationMatchStrength(
        locationQuery,
        facility.address,
        facility.distance,
      );
      score += locationStrength * 45;

      if (selectedCare.length > 0) {
        const levels = (facility.careLevels || []).map((x) => String(x).toLowerCase());
        const careHits = selectedCare.filter((want) =>
          levels.some((level) => level.includes(want) || want.includes(level)),
        ).length;
        score += (careHits / selectedCare.length) * 15;
      } else {
        score += 7;
      }

      if (selectedAmenities.length > 0) {
        const pool = [
          ...(facility.amenities || []).map(amenityText),
          ...(facility.services || []).map(amenityText),
          ...(facility.features || []).map(amenityText),
          String(facility.description || ""),
          String(facility.name || ""),
        ]
          .map((x) => normMatchToken(x))
          .filter(Boolean);
        const amenityHits = selectedAmenities.filter((want) => {
          const variants = amenityMatchVariants(want);
          return variants.some((v) =>
            pool.some((p) => p.includes(v) || v.includes(p)),
          );
        }).length;
        score += (amenityHits / selectedAmenities.length) * 12;
      } else {
        score += 6;
      }

      if (selectedAvailability.length > 0) {
        const availability = String(facility.availability || "").toLowerCase();
        if (availability && selectedAvailability.includes(availability)) score += 3;
      }

      const low = facility.priceMin ?? facility.priceMax;
      const high = facility.priceMax ?? facility.priceMin;
      if (low != null && high != null && low <= budgetMax && high >= budgetMin) score += 3;

      if (searchQuery) {
        const text =
          `${facility.name || ""} ${facility.category || ""} ${facility.address || ""} ${(facility.features || []).join(" ")}`.toLowerCase();
        if (text.includes(searchQuery)) score += 2;
      }

      score += computeOverallQualityScore(facility) * 8;

      return score;
    };

    return filteredFacilities
      .map((facility) => {
        const computedDistanceMiles = computeFacilityMiles(facility, locationCenterCoords);
        return {
          ...facility,
          distanceMiles: Number.isFinite(computedDistanceMiles)
            ? Number(computedDistanceMiles.toFixed(1))
            : facility.distanceMiles ?? null,
          distance: formatDistanceLabel(computedDistanceMiles, facility.zipCode),
          qualityScore: computeOverallQualityScore(facility),
          relevanceScore: getRelevanceScore(facility),
          averagePrice: averageFacilityPrice(facility),
        };
      })
      .sort((a, b) => {
        if (sortBy === "overallQuality") {
          const qualityDiff = b.qualityScore - a.qualityScore;
          if (qualityDiff !== 0) return qualityDiff;
          const relevanceDiff = b.relevanceScore - a.relevanceScore;
          if (relevanceDiff !== 0) return relevanceDiff;
        } else if (sortBy === "nearest") {
          const aMiles = Number.isFinite(a.distanceMiles) ? a.distanceMiles : Number.POSITIVE_INFINITY;
          const bMiles = Number.isFinite(b.distanceMiles) ? b.distanceMiles : Number.POSITIVE_INFINITY;
          if (aMiles !== bMiles) return aMiles - bMiles;
          const relevanceDiff = b.relevanceScore - a.relevanceScore;
          if (relevanceDiff !== 0) return relevanceDiff;
        } else if (sortBy === "lowestPrice") {
          if (a.averagePrice !== b.averagePrice) return a.averagePrice - b.averagePrice;
          const relevanceDiff = b.relevanceScore - a.relevanceScore;
          if (relevanceDiff !== 0) return relevanceDiff;
        } else {
          const scoreDiff = b.relevanceScore - a.relevanceScore;
          if (scoreDiff !== 0) return scoreDiff;
          const qualityDiff = b.qualityScore - a.qualityScore;
          if (qualityDiff !== 0) return qualityDiff;
        }

        const backendDiff = (Number(b.matchPercent) || 0) - (Number(a.matchPercent) || 0);
        if (backendDiff !== 0) return backendDiff;
        return String(a.name || "").localeCompare(String(b.name || ""));
      });
  }, [filteredFacilities, filters, carrieLocationQuery, locationCenterCoords]);

  const mapFacilities = useMemo(
    () =>
      view === "map"
        ? fromCarrie && liveFacilities
          ? filteredFacilities
          : scopedFacilities
        : [],
    [view, fromCarrie, liveFacilities, filteredFacilities, scopedFacilities],
  );

  const visibleMapFacilities = useMemo(() => {
    if (!Array.isArray(mapFacilities)) return [];
    if (
      !Array.isArray(nearbyMapFacilityKeys) ||
      nearbyMapFacilityKeys.length === 0
    )
      return [];
    const allowed = new Set(nearbyMapFacilityKeys);
    return mapFacilities.filter((f) => allowed.has(f.key));
  }, [mapFacilities, nearbyMapFacilityKeys]);

  const pageSize = 5;
  const matchCountForHeader = rankedFacilities.length;
  const locationLabelForHeader =
    buildEffectiveLocationQuery(
      String(filters.locationQuery || "").trim() || carrieLocationQuery,
      filters.zipCode,
    ) ||
    String(filters.searchQuery || "").trim() ||
    "your area";
  const summaryCareText =
    filters.selectedCareTypes.length > 0
      ? filters.selectedCareTypes.join(", ")
      : "senior living";
  const summaryBudgetText = `$${Number(filters.budgetMin || 1000).toLocaleString()}-$${Number(filters.budgetMax || 15000).toLocaleString()}/mo`;
  const summaryNeedsText =
    filters.selectedAmenities.length > 0
      ? filters.selectedAmenities.slice(0, 2).join(", ")
      : "your selected preferences";
  const hasNonDefaultAvailability =
    filters.selectedAvailability.length > 0 &&
    !(
      filters.selectedAvailability.length === 1 &&
      String(filters.selectedAvailability[0]).trim().toLowerCase() === "within 30 days"
    );
  const promptCriteria = [];
  if (locationLabelForHeader) {
    promptCriteria.push({ label: "Location", value: locationLabelForHeader });
  }
  if (filters.selectedCareTypes.length > 0) {
    promptCriteria.push({
      label: "Care Type",
      value: filters.selectedCareTypes.join(", "),
    });
  }
  if (
    sanitizeMonthlyBudgetValue(carrieFilters?.budgetMaxMonthly) != null ||
    Number(filters.budgetMin) !== 1000 ||
    Number(filters.budgetMax) !== 15000
  ) {
    promptCriteria.push({
      label: "Budget",
      value: summaryBudgetText,
    });
  }
  if (String(filters.maxMiles || "").trim()) {
    promptCriteria.push({
      label: "Distance",
      value: `Within ${String(filters.maxMiles).trim()} miles`,
    });
  }
  if (filters.selectedAmenities.length > 0) {
    promptCriteria.push({
      label: "Must-Have Needs",
      value: filters.selectedAmenities.join(", "),
    });
  }
  if (hasNonDefaultAvailability) {
    promptCriteria.push({
      label: "Move-In Timeline",
      value: filters.selectedAvailability.join(", "),
    });
  }
  const totalPages = Math.max(
    1,
    Math.ceil(rankedFacilities.length / pageSize),
  );
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const listingItems = rankedFacilities.slice(startIdx, endIdx);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) return [1, 2, 3, 4, 5, "...", totalPages];
    if (currentPage >= totalPages - 3) {
      return [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }
    return [
      1,
      "...",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "...",
      totalPages,
    ];
  }, [currentPage, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [layout, scope, fromCarrie, carrieMatches?.length]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    if (view !== "map") {
      mapInstanceRef.current = null;
      setMapsReady(false);
      return;
    }
    const apiKey = getGoogleMapsApiKey();
    if (!apiKey) {
      setMapError("Map is unavailable: missing VITE_GOOGLE_MAPS_API_KEY.");
      setMapsReady(false);
      return;
    }
    let cancelled = false;
    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (cancelled) return;
        setMapError("");
        if (!mapContainerRef.current || mapInstanceRef.current) return;
        mapInstanceRef.current = new window.google.maps.Map(
          mapContainerRef.current,
          {
            center: DEFAULT_MAP_CENTER,
            zoom: 11,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          },
        );
        geocoderRef.current = new window.google.maps.Geocoder();
        setMapsReady(true);
      })
      .catch((err) => {
        if (cancelled) return;
        setMapError(err?.message || "Could not load map.");
        setMapsReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, [view]);

  useEffect(() => {
    if (
      view !== "map" ||
      !mapsReady ||
      !mapInstanceRef.current ||
      !geocoderRef.current
    )
      return;

    mapMarkersRef.current.forEach((m) => {
      if (m.marker) m.marker.setMap(null);
      else if (m.setMap) m.setMap(null); // fallback for any legacy markers
    });
    mapMarkersRef.current = [];
    setNearbyMapFacilityKeys([]);

    const candidates = (mapFacilities || []).filter((f) => f.address).slice(0, 15);
    if (candidates.length === 0) return;

    let cancelled = false;

    const geocodeOne = (address) =>
      new Promise((resolve) => {
        geocoderRef.current.geocode({ address }, (results, status) => {
          if (status === "OK" && results?.[0]?.geometry?.location)
            resolve(results[0].geometry.location);
          else resolve(null);
        });
      });

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    const loadMarkers = async () => {
      const placed = [];
      const cache = {};

      for (let i = 0; i < candidates.length; i++) {
        if (cancelled) break;
        const f = candidates[i];

        // Try searching for the specific facility name + address to get exact coordinates
        const queryStr = (f.name && f.name !== "Community")
          ? `${f.name}, ${f.address}`
          : f.address;

        let loc = null;
        if (f.lat && f.lng) {
          loc = { lat: () => f.lat, lng: () => f.lng };
        } else {
          let locFromCache = cache[queryStr];
          if (!locFromCache) {
            locFromCache = await geocodeOne(queryStr);
            if (!locFromCache && queryStr !== f.address) {
              locFromCache = await geocodeOne(f.address);
            }
            if (locFromCache) {
              cache[queryStr] = locFromCache;
            }
            if (i < candidates.length - 1) await sleep(300);
          }
          loc = locFromCache;
        }

        if (loc && !cancelled) {
          const latLng = { lat: loc.lat(), lng: loc.lng() };

          const avgPrice = averagePriceFromText(f.priceRange);
          const marker = new window.google.maps.Marker({
            map: mapInstanceRef.current,
            position: latLng,
            title: f.name,
            label: avgPrice
              ? {
                text: `$${Math.round(avgPrice / 100) * 100}`,
                color: "#0f172a",
                fontWeight: "700",
              }
              : undefined,
          });

          placed.push({ marker, loc, key: f.key, latLng });
        }
      }

      if (cancelled) {
        placed.forEach((p) => p.marker.setMap(null));
        return;
      }

      const valid = placed.filter(Boolean);
      setNearbyMapFacilityKeys(valid.map((x) => x.key));
      valid.forEach((x) => mapMarkersRef.current.push({ marker: x.marker, key: x.key }));

      if (valid.length === 0) return;

      const bounds = new window.google.maps.LatLngBounds();
      valid.forEach((x) => bounds.extend(x.latLng));
      mapInstanceRef.current.fitBounds(bounds, 60);
    };

    loadMarkers();

    return () => {
      cancelled = true;
    };
  }, [view, mapsReady, mapFacilities, currentCoords, filters.maxMiles]);

  return (
    <>
      <SEO title="Care Explorer - CareMatch AI" />
      <div
        className="min-w-0 bg-no-repeat overflow-x-hidden"
        style={{
          backgroundImage:
            "url(/assets/images/overlay-searchbg.svg), url(/assets/images/seacrh-bg-img.png)",
          backgroundSize: "55% 70%, cover",
          backgroundPosition: "145% 100%, center",
        }}
      >
        <CareExplorerBar
          view={view}
          onViewChange={setView}
          layout={layout}
          onLayoutChange={setLayout}
          scope={scope}
          onScopeChange={setScope}
          matchCount={matchCountForHeader}
          locationLabel={locationLabelForHeader}
          isDiscoverLoading={discoverLoading}
        />

        {/* How we matched - bordered card; responsive */}
        <div className="w-full max-w-7xl mx-auto px-2 pt-3 pb-2 sm:px-4 sm:pt-4 sm:pb-2 md:px-6 md:pt-5">
          <div className="flex flex-col md:flex-row items-start md:items-stretch gap-3 md:gap-8 p-3 sm:p-4 bg-white rounded-lg border border-[#E2E8F0] shadow-sm min-w-0">
            <div className="flex flex-col gap-1 shrink-0 py-1 pl-0 sm:pl-2">
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#155DFC]/20 text-[#155DFC]">
                  <Info className="h-3 w-3" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wide text-[#155DFC]">
                  Transparency
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-[#132329]">
                How we matched these
              </h2>
            </div>
            <div className="md:border-l-2 md:border-[#E2E8F0] md:pl-8 flex-1 flex items-center justify-center min-w-0 max-w-5xl w-full">
              <p className="text-xs sm:text-sm text-[#64748b] text-center sm:text-left md:text-center">
                {fromCarrie && liveFacilities ? (
                  <>
                    These communities are{" "}
                    <span className="font-semibold text-[#132329]">
                      ranked from your chat with Carrie
                    </span>.
                    {promptCriteria.length > 0 && (
                      <>
                        {" "}Criteria from your prompt:{" "}
                        {promptCriteria.map((item, idx) => (
                          <React.Fragment key={item.label}>
                            {idx > 0 ? "; " : ""}
                            <span className="font-semibold text-[#132329]">{item.label}:</span>{" "}
                            <span className="font-semibold text-[#132329]">{item.value}</span>
                          </React.Fragment>
                        ))}
                        .
                      </>
                    )}
                    Always confirm details on a tour.
                  </>
                ) : (
                  <>
                    Prioritized in{" "}
                    <span className="font-semibold text-[#132329]">
                      {locationLabelForHeader}
                    </span>
                    {" "}for{" "}
                    <span className="font-semibold text-[#132329]">
                      {summaryCareText}
                    </span>
                    , budget around{" "}
                    <span className="font-semibold text-[#132329]">
                      {summaryBudgetText}
                    </span>
                    {String(filters.maxMiles || "").trim() && (
                      <>
                        , within{" "}
                        <span className="font-semibold text-[#132329]">
                          {String(filters.maxMiles).trim()} miles
                        </span>
                      </>
                    )}
                    , and your specific{" "}
                    <span className="font-semibold text-[#222c2e]">
                      {summaryNeedsText}
                    </span>
                    .
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Main content - sidebar + listing or map view; responsive padding and gap */}
        <div className="w-full max-w-7xl mx-auto px-2 pt-3 pb-8 flex flex-col lg:flex-row gap-3 sm:px-4 sm:pt-4 sm:pb-10 sm:gap-5 min-w-0 min-[1280px]:pb-12 min-[1920px]:pb-16">
          <div className="w-full lg:w-72 flex-shrink-0 min-w-0 max-w-full">
            <div className="lg:hidden rounded-xl border border-[#F7F4EF] bg-white px-3 py-2.5">
              <button
                type="button"
                onClick={() => setMobileFiltersCollapsed((prev) => !prev)}
                className="flex w-full items-center justify-between text-sm font-semibold text-[#364153]"
              >
                <span>Filters</span>
                {mobileFiltersCollapsed ? (
                  <ChevronDown className="h-4 w-4 text-[#64748b]" />
                ) : (
                  <ChevronUp className="h-4 w-4 text-[#64748b]" />
                )}
              </button>
            </div>
            <div
              className={mobileFiltersCollapsed ? "hidden lg:block" : "block"}
            >
              <FiltersSidebar
                filters={filters}
                onFiltersChange={setFilters}
                onReset={() => {
                  discoverRunIdRef.current += 1;
                  setDiscoverLoading(false);
                  setDiscoverOverrideRows(undefined);
                  setFilters({
                    locationQuery: inferredCarrieLocationQuery,
                    zipCode: carrieZipCode,
                    searchQuery: "",
                    maxMiles: "",
                    budgetMin: 1000,
                    budgetMax: 15000,
                    selectedCareTypes: [],
                    selectedAvailability: ["Within 30 Days"],
                    selectedAmenities: [],
                    sortBy: "bestMatch",
                  });
                }}
                careTypeOptions={careTypeOptions}
                amenityOptions={amenityOptions}
                onAskCarrie={handleAskCarrie}
              />
            </div>
          </div>

          {view === "listing" ? (
            <div
              className={`flex-1 min-w-0 w-full max-w-full lg:max-w-5xl ${layout === "single"
                ? "space-y-3 sm:space-y-4"
                : layout === "two"
                  ? "grid grid-cols-2 md:grid-cols-2 gap-3 sm:gap-4"
                  : "grid grid-cols-2 min-[500px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 justify-items-center"
                }`}
            >
              {listingItems.map((f) => (
                <div
                  key={f.key ?? f.matchPercent}
                  className={
                    layout !== "single" ? "min-w-0 overflow-hidden" : undefined
                  }
                >
                  <FacilityCard
                    facilityId={f.key ?? f.facilityId ?? f.name}
                    matchPercent={f.matchPercent}
                    imageSrc={f.imageSrc}
                    name={f.name}
                    category={f.category}
                    rating={f.rating}
                    reviewCount={f.reviewCount}
                    ratingLabel={f.ratingLabel}
                    priceRange={f.priceRange}
                    distance={f.distance}
                    features={f.features}
                    address={f.address}
                    zipCode={f.zipCode}
                    phone={f.phone}
                    website={f.website}
                    sourcePlatform={f.sourcePlatform}
                    isExternal={Boolean(f.isExternal)}
                    externalSourceUrl={f.externalSourceUrl}
                    compact={layout !== "single"}
                    gridView={layout === "grid"}
                    isFavorite={favoriteFacilityIds.includes(
                      String(f.key ?? f.facilityId ?? f.name),
                    )}
                    onToggleFavorite={handleToggleFavorite}
                  />
                </div>
              ))}

              {listingItems.length === 0 && (
                <div className="col-span-full rounded-xl border border-[#E2E8F0] bg-white p-6 text-center text-sm text-[#64748b]">
                  No facilities available yet for the selected filters.
                </div>
              )}

              {totalPages > 1 && (
                <div className="col-span-full mt-2 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm text-[#132329] disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <span className="text-sm text-[#64748B]">
                    Page {currentPage} of {totalPages}
                  </span>
                  <div className="mx-1 flex items-center gap-1">
                    {pageNumbers.map((p, idx) =>
                      p === "..." ? (
                        <span
                          key={`ellipsis-${idx}`}
                          className="px-1 text-sm text-[#94A3B8]"
                        >
                          ...
                        </span>
                      ) : (
                        <button
                          key={`page-${p}`}
                          type="button"
                          onClick={() => setPage(Number(p))}
                          className={`rounded-lg border px-2.5 py-1.5 text-sm ${currentPage === p
                            ? "border-[#00CFF4] bg-[#00CFF4] text-white"
                            : "border-[#E2E8F0] bg-white text-[#132329]"
                            }`}
                        >
                          {p}
                        </button>
                      ),
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm text-[#132329] disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 min-w-0 w-full max-w-full lg:max-w-5xl">
              <div className="flex flex-col gap-4">
                <div className="min-h-[520px] rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden w-full flex flex-col">
                  {mapError ? (
                    <div className="flex-1 flex items-center justify-center px-6 text-sm text-[#64748b]">
                      {mapError}
                    </div>
                  ) : (
                    <div ref={mapContainerRef} className="flex-1 w-full min-h-[520px]" />
                  )}
                </div>
                <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 w-full overflow-hidden">
                  <p className="text-sm font-semibold text-[#132329] mb-4">
                    Recommended Matches
                  </p>
                  <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 snap-x scrollbar-hide">
                    {(visibleMapFacilities || []).map((f) => (
                      <div
                        key={`map-${f.key ?? f.matchPercent}`}
                        className="w-[320px] snap-start flex-shrink-0 cursor-pointer transition-transform hover:scale-[1.03]"
                        onClick={(e) => {
                          if (e.target.closest('button') || e.target.closest('a')) return;
                          const markerObj = mapMarkersRef.current.find(m => m.key === f.key);
                          if (markerObj && markerObj.marker && mapInstanceRef.current) {
                            mapInstanceRef.current.panTo(markerObj.marker.getPosition());
                            mapInstanceRef.current.setZoom(15);
                            markerObj.marker.setAnimation(window.google.maps.Animation.BOUNCE);
                            setTimeout(() => {
                              markerObj.marker.setAnimation(null);
                            }, 2100);
                          }
                        }}
                      >
                        <FacilityCard
                          facilityId={f.key ?? f.facilityId ?? f.name}
                          matchPercent={f.matchPercent}
                          imageSrc={f.imageSrc}
                          name={f.name}
                          category={f.category}
                          rating={f.rating}
                          reviewCount={f.reviewCount}
                          ratingLabel={f.ratingLabel}
                          priceRange={f.priceRange}
                          distance={f.distance}
                          features={f.features}
                          address={f.address}
                          zipCode={f.zipCode}
                          phone={f.phone}
                          website={f.website}
                          sourcePlatform={f.sourcePlatform}
                          isExternal={Boolean(f.isExternal)}
                          externalSourceUrl={f.externalSourceUrl}
                          compact
                          isFavorite={favoriteFacilityIds.includes(
                            String(f.key ?? f.facilityId ?? f.name),
                          )}
                          onToggleFavorite={handleToggleFavorite}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CareExplorer;
