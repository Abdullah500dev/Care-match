import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ChevronDown,
  ChevronUp,
  Compass,
  Info,
  MapPin,
  MessageCircle,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { apiClient } from "../../../services/api";
import { getUser } from "../../../store/auth/authSlice";
import SEO from "../../../components/common/SEO";
import CareExplorerBar from "../../../components/client/CareExplorer/CareExplorerBar";
import FiltersSidebar from "../../../components/client/CareExplorer/FiltersSidebar";
import FacilityCard from "../../../components/client/CareExplorer/FacilityCard";
import LoadingOverlay from "../../../components/client/LoadingOverlay";
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
const AUTO_APPLY_FILTERS = false;
const DISCOVER_DUPLICATE_WINDOW_MS = 1200;
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
const FIXED_CARE_TYPE_OPTIONS = ["Assisted Living"];

const CARE_TYPE_ALIASES = {
  "assisted living": ["assisted living", "assisted"],
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

function extractFiveDigitZip(text) {
  const m = String(text || "").match(/\b(\d{5})(?:-\d{4})?\b/);
  return m ? m[1] : "";
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
    const zipInQuery = String(stateRaw || "").match(/\b(\d{5})(?:-\d{4})?\b/)?.[1] || "";
    const stateOnly = String(stateRaw || "")
      .replace(/\b\d{5}(?:-\d{4})?\b/g, "")
      .trim();
    const stateAbbr = US_STATE_ABBR[stateOnly] || stateOnly;

    // If ZIP is provided, accept exact ZIP match.
    if (zipInQuery && addr.includes(zipInQuery)) return true;

    // City + state match should still pass even if ZIP differs within same city/state.
    if (city && addr.includes(city)) {
      if (stateAbbr && new RegExp(`\\b${String(stateAbbr).toLowerCase()}\\b`).test(addr)) {
        return true;
      }
      if (stateOnly && addr.includes(stateOnly.toLowerCase())) return true;
      // When user gives only city and no parseable state, allow city-only match.
      if (!stateOnly) return true;
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
  const placeId =
    typeof googlePlaces.place_id === "string" ? googlePlaces.place_id.trim() : "";
  if (!imageSrc && placeId) {
    imageSrc = resolveFacilityImageUrl(
      `/api/facilities/google-place-photo-by-place-id?place_id=${encodeURIComponent(placeId)}&maxwidth=1200`,
    );
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
    availability: m.availability || "",
    lat: googlePlaces.latitude ?? externalData.latitude ?? m.latitude ?? null,
    lng: googlePlaces.longitude ?? externalData.longitude ?? m.longitude ?? null,
  };
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

function facilityDedupKey(facility) {
  const normalize = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const name = normalize(facility?.name);
  const address = normalize(facility?.address);
  const zip = normalize(facility?.zipCode);
  const phone = normalize(facility?.phone);

  // Prefer name + address for canonical facility identity.
  if (name && address) return `name:${name}|addr:${address}`;
  // Fallbacks when address is missing.
  if (name && zip) return `name:${name}|zip:${zip}`;
  if (name && phone) return `name:${name}|phone:${phone}`;
  if (name) return `name:${name}`;
  return String(facility?.key || "").trim();
}

function facilityCompletenessScore(facility) {
  let score = 0;
  if (String(facility?.address || "").trim()) score += 1;
  if (String(facility?.phone || "").trim() && String(facility?.phone || "").trim() !== "N/A") score += 1;
  if (String(facility?.website || "").trim()) score += 1;
  if (String(facility?.imageSrc || "").trim() && String(facility?.imageSrc || "").trim() !== DEFAULT_CARD_IMAGE) score += 1;
  if (Number.isFinite(Number(facility?.reviewCount)) && Number(facility?.reviewCount) > 0) score += 1;
  if (Number.isFinite(Number(facility?.rating)) && Number(facility?.rating) > 0) score += 1;
  if ((facility?.features || []).length > 0) score += 1;
  if ((facility?.amenities || []).length > 0) score += 1;
  if ((facility?.careLevels || []).length > 0) score += 1;
  return score;
}

function dedupeFacilities(facilities) {
  const selected = new Map();

  (Array.isArray(facilities) ? facilities : []).forEach((facility) => {
    const dedupKey = facilityDedupKey(facility);
    if (!dedupKey) return;

    const existing = selected.get(dedupKey);
    if (!existing) {
      selected.set(dedupKey, facility);
      return;
    }

    const existingMatch = Number(existing?.matchPercent) || 0;
    const incomingMatch = Number(facility?.matchPercent) || 0;
    const existingRichness = facilityCompletenessScore(existing);
    const incomingRichness = facilityCompletenessScore(facility);

    if (
      incomingMatch > existingMatch ||
      (incomingMatch === existingMatch && incomingRichness > existingRichness)
    ) {
      selected.set(dedupKey, facility);
    }
  });

  return Array.from(selected.values());
}

function sanitizeMonthlyBudgetValue(value) {
  if (value == null) return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) return null;
    if (value > 100000) return null;
    return Math.round(value);
  }

  const raw = String(value).toLowerCase().trim();
  if (!raw) return null;

  const kMatch = raw.match(/(\d+(?:\.\d+)?)\s*k\b/);
  if (kMatch) {
    const n = Number.parseFloat(kMatch[1]);
    if (!Number.isNaN(n) && n > 0) {
      const parsedK = Math.round(n * 1000);
      return parsedK > 100000 ? null : parsedK;
    }
  }

  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  const parsed = Number.parseInt(digits, 10);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100000) return null;
  return parsed;
}

function extractBudgetBoundsFromText(value) {
  const raw = String(value || "").trim();
  if (!raw) return { min: null, max: null };
  const nums = [...raw.matchAll(/(\d[\d,]*)/g)]
    .map((m) => Number.parseInt(String(m[1] || "").replace(/,/g, ""), 10))
    .filter((n) => Number.isFinite(n) && n > 0 && n <= 100000);
  if (nums.length === 0) return { min: null, max: null };
  if (nums.length === 1) return { min: null, max: nums[0] };
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

function resolveCarrieBudgetRange(carrieFilters) {
  const cf = carrieFilters && typeof carrieFilters === "object" ? carrieFilters : {};
  const directMinCandidates = [
    cf.budgetMinMonthly,
    cf.budget_min_monthly,
    cf.budgetMin,
    cf.budget_min,
    cf.minBudget,
    cf.minimumBudget,
  ];
  const directMaxCandidates = [
    cf.budgetMaxMonthly,
    cf.budget_max_monthly,
    cf.budgetMax,
    cf.budget_max,
    cf.maxBudget,
    cf.maximumBudget,
  ];

  const parsedMin = directMinCandidates
    .map((v) => sanitizeMonthlyBudgetValue(v))
    .find((v) => v != null);
  const parsedMax = directMaxCandidates
    .map((v) => sanitizeMonthlyBudgetValue(v))
    .find((v) => v != null);

  const textCandidates = [
    cf.budgetRange,
    cf.budget_range,
    cf.monthlyBudgetRange,
    cf.monthly_budget_range,
    cf.budget,
  ];
  const fromText = textCandidates
    .map((v) => extractBudgetBoundsFromText(v))
    .find((x) => x.min != null || x.max != null) || { min: null, max: null };

  const min = parsedMin ?? fromText.min ?? null;
  const max = parsedMax ?? fromText.max ?? null;
  return { min, max };
}

function resolveBudgetRangeFromCarrieMatches(carrieMatches) {
  const rows = Array.isArray(carrieMatches) ? carrieMatches : [];
  if (rows.length === 0) return { min: null, max: null };

  let min = null;
  let max = null;
  for (const row of rows) {
    const candidates = [
      row?.budget?.min_monthly,
      row?.budget?.max_monthly,
      row?.external_data?.budget?.min_monthly,
      row?.external_data?.budget?.max_monthly,
      row?.external_data?.pricing,
      row?.pricing,
    ];
    for (const c of candidates) {
      const parsed = sanitizeMonthlyBudgetValue(c);
      if (parsed != null) {
        if (min == null || parsed < min) min = parsed;
        if (max == null || parsed > max) max = parsed;
      } else if (typeof c === "string") {
        const parsedRange = extractBudgetBoundsFromText(c);
        if (parsedRange.min != null) {
          if (min == null || parsedRange.min < min) min = parsedRange.min;
        }
        if (parsedRange.max != null) {
          if (max == null || parsedRange.max > max) max = parsedRange.max;
        }
      }
    }
  }

  return { min, max };
}

/** Extract state abbreviation from "City, ST" or "City, ST XXXXX" pattern */
function extractStateFromLocation(locStr) {
  const m = String(locStr || "").match(/,\s*([A-Za-z]{2})\b/);
  return m ? m[1].toUpperCase() : "";
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

  // If we have a ZIP and the location was autofilled as "City, ST",
  // use the full "City, ST" so the AI searches that city/state area.
  // Only narrow to ZIP-level when a max distance is also set.
  const maxDistanceMilesRaw = Number.parseFloat(String(filters.maxMiles || "").trim());
  const hasDistanceConstraint = Number.isFinite(maxDistanceMilesRaw) && maxDistanceMilesRaw > 0;

  let location;
  if (!hasDistanceConstraint && explicitZip && baseLocation) {
    // Use "City, ST" without appending the ZIP so the AI searches state/city-wide
    const stateAbbr = extractStateFromLocation(baseLocation);
    location = stateAbbr ? baseLocation : buildEffectiveLocationQuery(baseLocation, zip);
  } else {
    location = buildEffectiveLocationQuery(baseLocation, zip);
  }

  const care_levels = ["assisted living"];

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

function buildDiscoverRequestSignature(body) {
  const toSortedLowerArray = (value) =>
    (Array.isArray(value) ? value : [])
      .map((x) => String(x || "").trim().toLowerCase())
      .filter(Boolean)
      .sort();

  const nBudgetMin = Number(body?.budget_min);
  const nBudgetMax = Number(body?.budget_max);
  const nMaxDistance = Number(body?.max_distance_miles);

  return JSON.stringify({
    zip_code: String(body?.zip_code || "").trim(),
    location: String(body?.location || "").trim().toLowerCase(),
    care_levels: toSortedLowerArray(body?.care_levels),
    amenities: toSortedLowerArray(body?.amenities),
    services: toSortedLowerArray(body?.services),
    keywords: toSortedLowerArray(body?.keywords),
    budget_min: Number.isFinite(nBudgetMin) ? Math.round(nBudgetMin) : null,
    budget_max: Number.isFinite(nBudgetMax) ? Math.round(nBudgetMax) : null,
    max_distance_miles: Number.isFinite(nMaxDistance) ? Math.round(nMaxDistance) : null,
  });
}

function normalizeFilterStateForCompare(filters) {
  const f = filters && typeof filters === "object" ? filters : {};
  const toSortedLowerArray = (value) =>
    (Array.isArray(value) ? value : [])
      .map((x) => String(x || "").trim().toLowerCase())
      .filter(Boolean)
      .sort();

  const budgetMin = Number(f.budgetMin);
  const budgetMax = Number(f.budgetMax);

  return {
    locationQuery: String(f.locationQuery || "").trim().toLowerCase(),
    zipCode: String(f.zipCode || "").replace(/\D/g, "").slice(0, 5),
    searchQuery: String(f.searchQuery || "").trim().toLowerCase(),
    maxMiles: String(f.maxMiles || "").trim(),
    budgetMin: Number.isFinite(budgetMin) ? Math.round(budgetMin) : 1000,
    budgetMax: Number.isFinite(budgetMax) ? Math.round(budgetMax) : 15000,
    selectedCareTypes: toSortedLowerArray(f.selectedCareTypes),
    selectedAvailability: toSortedLowerArray(f.selectedAvailability),
    selectedAmenities: toSortedLowerArray(f.selectedAmenities),
    sortBy: String(f.sortBy || "bestMatch").trim().toLowerCase(),
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
  const carrieZipFromLocation = extractFiveDigitZip(carrieLocationQuery);
  const carrieZipCode = String(carrieFilters?.searchZipCode || carrieZipFromLocation || "")
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
  const initialFilters = useMemo(
    () => ({
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
    }),
    [inferredCarrieLocationQuery, carrieZipCode],
  );

  // `filters` are the draft values (typing/selecting in the sidebar)
  const [filters, setFilters] = useState(initialFilters);
  // `appliedFilters` are what the listing uses (updated only on Apply)
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const hasPendingFilterChanges = useMemo(() => {
    const draft = normalizeFilterStateForCompare(filters);
    const applied = normalizeFilterStateForCompare(appliedFilters);
    return JSON.stringify(draft) !== JSON.stringify(applied);
  }, [filters, appliedFilters]);

  const activeFilters = AUTO_APPLY_FILTERS ? filters : appliedFilters;
  const mapContainerRef = useRef(null);
  const listingTopRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const mapMarkersRef = useRef([]);
  const geocoderRef = useRef(null);
  const [selectedFacilityKey, setSelectedFacilityKey] = useState(null);
  const cardRefsMap = useRef({});
  const [mapError, setMapError] = useState("");
  const [mapsReady, setMapsReady] = useState(false);
  const [currentCoords, setCurrentCoords] = useState(null);
  const [locationCenterCoords, setLocationCenterCoords] = useState(null);
  const [nearbyMapFacilityKeys, setNearbyMapFacilityKeys] = useState([]);
  const [directoryFacilities, setDirectoryFacilities] = useState([]);
  /** `undefined` = use Carrie / directory; array = last live discover from filters (may be empty). */
  const [discoverOverrideRows, setDiscoverOverrideRows] = useState(undefined);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const discoverThinkingMessages = useMemo(
    () => [
      "Reviewing care preferences",
      "Comparing nearby communities",
      "Ranking the strongest matches",
      "Checking care and lifestyle fit",
    ],
    [],
  );
  const [discoverThinkingIndex, setDiscoverThinkingIndex] = useState(0);
  const discoverRunIdRef = useRef(0);
  const discoverAbortControllerRef = useRef(null);
  const discoverInFlightSignatureRef = useRef("");
  const lastDiscoverSignatureRef = useRef("");
  const lastDiscoverStartedAtRef = useRef(0);
  const carrieBootstrapDiscoverDoneRef = useRef(false);
  const hasUserTouchedFiltersRef = useRef(false);
  const skipDiscoverMountRef = useRef(true);
  const skipQueryLogMountRef = useRef(true);
  const { isAuthenticated, userData } = useSelector(getUser);
  const [favoriteFacilityIds, setFavoriteFacilityIds] = useState([]);


  const scrollToListingTop = () => {
    window.dispatchEvent(new CustomEvent("carematch:scroll-to-top"));
  };

  const handlePageChange = (nextPage) => {
    setPage(nextPage);
  };

  useEffect(() => {
    const t = setTimeout(() => scrollToListingTop(), 0);
    return () => clearTimeout(t);
  }, [page]);

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

  const handleToggleFavorite = async (facilityId, facilityData) => {
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
        await apiClient.post("/api/auth/toggle-favorite", { facilityId: safeId, facilityData: facilityData || null });
      } catch (error) {
        console.error("Failed to sync favorite with database", error);
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
  const uniqueBaseFacilities = useMemo(
    () => dedupeFacilities(baseFacilities),
    [baseFacilities],
  );

  const careTypeOptions = useMemo(() => {
    return FIXED_CARE_TYPE_OPTIONS;
  }, []);

  const amenityOptions = useMemo(() => FIXED_AMENITY_OPTIONS, []);
  const availabilityOptions = useMemo(() => {
    const base = [
      ...new Set(
        uniqueBaseFacilities
          .map((f) => String(f.availability || "").trim())
          .filter(Boolean),
      ),
    ];
    return base.length ? base : ["Immediate", "Within 30 Days", "Future Planning"];
  }, [uniqueBaseFacilities]);

  useEffect(() => {
    if (!fromCarrie || !carrieFilters) return;
    const fromFilters = resolveCarrieBudgetRange(carrieFilters);
    const fromMatches = resolveBudgetRangeFromCarrieMatches(carrieMatches);
    const parsedMinBudget = fromFilters.min ?? fromMatches.min;
    const parsedMaxBudget = fromFilters.max ?? fromMatches.max;
    console.log("[CareExplorer] carrieFilters budget:", {
      budgetMinMonthly: carrieFilters.budgetMinMonthly,
      budgetMaxMonthly: carrieFilters.budgetMaxMonthly,
      budgetFromMatches: fromMatches,
      resolvedMin: parsedMinBudget,
      resolvedMax: parsedMaxBudget,
    });
    const effectiveMaxBudget = parsedMaxBudget ?? parsedMinBudget ?? 15000;
    const safeMax = Math.min(15000, Math.max(1000, Math.round(effectiveMaxBudget)));
    const effectiveMinBudget = parsedMinBudget ?? Math.min(1000, safeMax);
    const safeMin = Math.min(safeMax, Math.max(1000, Math.round(effectiveMinBudget)));

    const nextFilters = {
      ...initialFilters,
      locationQuery: normalizeLocationFieldValue(
        carrieLocationQuery,
        carrieZipCode,
      ) || inferCityStateFromMatches(carrieMatches),
      zipCode: carrieZipCode,
      budgetMin: safeMin,
      budgetMax: safeMax,
      selectedCareTypes: Array.isArray(carrieFilters.careLevels)
        ? mapSelectionsToOptions(
          carrieFilters.careLevels.map((x) => titleCase(x)),
          careTypeOptions,
          CARE_TYPE_ALIASES,
        )
        : initialFilters.selectedCareTypes,
      selectedAmenities: Array.isArray(carrieFilters.amenityMustHaves)
        ? mapSelectionsToOptions(
          carrieFilters.amenityMustHaves.map((x) => String(x).trim()),
          amenityOptions,
          AMENITY_ALIASES,
        )
        : initialFilters.selectedAmenities,
      selectedAvailability:
        typeof carrieFilters.availability === "string" &&
          carrieFilters.availability.trim()
          ? [carrieFilters.availability.trim()]
          : initialFilters.selectedAvailability,
      maxMiles:
        carrieFilters.maxDistanceMiles != null &&
          !Number.isNaN(Number(carrieFilters.maxDistanceMiles))
          ? String(carrieFilters.maxDistanceMiles)
          : initialFilters.maxMiles,
    };

    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
  }, [
    fromCarrie,
    carrieFilters,
    carrieLocationQuery,
    carrieMatches,
    careTypeOptions,
    amenityOptions,
    initialFilters,
  ]);

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

  useEffect(() => {
    carrieBootstrapDiscoverDoneRef.current = false;
  }, [fromCarrie, carrieLocationQuery, carrieZipCode, carrieMatches?.length]);

  const runDiscoverRequest = useCallback(async (body) => {
    const signature = buildDiscoverRequestSignature(body);
    const now = Date.now();

    if (discoverInFlightSignatureRef.current === signature) {
      return;
    }

    if (
      lastDiscoverSignatureRef.current === signature &&
      now - lastDiscoverStartedAtRef.current < DISCOVER_DUPLICATE_WINDOW_MS
    ) {
      return;
    }

    const runId = ++discoverRunIdRef.current;
    lastDiscoverSignatureRef.current = signature;
    lastDiscoverStartedAtRef.current = now;

    if (discoverAbortControllerRef.current) {
      discoverAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    discoverAbortControllerRef.current = controller;
    discoverInFlightSignatureRef.current = signature;

    setDiscoverLoading(true);
    try {
      const { data } = await apiClient.post("/api/facilities/discover", body, {
        signal: controller.signal,
      });
      if (runId !== discoverRunIdRef.current) return;
      const rows = Array.isArray(data?.facilities) ? data.facilities : [];
      setDiscoverOverrideRows(rows.map(normalizeFacilityForCard));
    } catch (err) {
      const cancelled =
        axios.isCancel?.(err) || err?.name === "CanceledError" || err?.code === "ERR_CANCELED";
      if (cancelled || runId !== discoverRunIdRef.current) return;
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Request failed";
      toast.error("Could not refresh listings", { description: String(msg) });
    } finally {
      if (discoverAbortControllerRef.current === controller) {
        discoverAbortControllerRef.current = null;
      }
      if (discoverInFlightSignatureRef.current === signature) {
        discoverInFlightSignatureRef.current = "";
      }
      if (runId === discoverRunIdRef.current) {
        setDiscoverLoading(false);
      }
    }
  }, []);

  // Debounced live discover when filters change (same engine as Carrie / results.js).
  useEffect(() => {
    if (skipDiscoverMountRef.current) {
      skipDiscoverMountRef.current = false;
      return;
    }

    if (!AUTO_APPLY_FILTERS) {
      return;
    }
    // Keep Carrie results stable on initial load; only refresh live results
    // after the user intentionally changes filters in this view.
    if (fromCarrie && !hasUserTouchedFiltersRef.current) {
      return;
    }

    const body = buildDiscoverRequestBody(filters, carrieFilters, carrieLocationQuery);
    if (!body.zip_code || !String(body.location || "").trim()) {
      return;
    }

    const timer = window.setTimeout(async () => {
      await runDiscoverRequest(body);
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
    fromCarrie,
    runDiscoverRequest,
  ]);

  // One-time bootstrap when user comes from Carrie without precomputed matches.
  // AUTO_APPLY_FILTERS is disabled by design, so this ensures the page doesn't look empty.
  useEffect(() => {
    if (!fromCarrie) return;
    if (carrieBootstrapDiscoverDoneRef.current) return;
    if (Array.isArray(carrieMatches) && carrieMatches.length > 0) return;

    const body = buildDiscoverRequestBody(filters, carrieFilters, carrieLocationQuery);
    const hasLocation = String(body.location || "").trim().length > 0;
    const hasZip = String(body.zip_code || "").trim().length > 0;
    if (!hasLocation && !hasZip) return;
    if (!body.zip_code && hasLocation) {
      body.zip_code = body.location;
    }

    carrieBootstrapDiscoverDoneRef.current = true;
    runDiscoverRequest(body);
  }, [
    fromCarrie,
    carrieMatches,
    filters,
    carrieFilters,
    carrieLocationQuery,
    runDiscoverRequest,
  ]);

  const handleApplyFilters = async () => {
    if (!hasPendingFilterChanges) return;
    hasUserTouchedFiltersRef.current = true;
    setAppliedFilters(filters);
    const body = buildDiscoverRequestBody(filters, carrieFilters, carrieLocationQuery);
    const hasLocation = String(body.location || "").trim().length > 0;
    const hasZip = String(body.zip_code || "").trim().length > 0;
    if (!hasLocation && !hasZip) {
      setDiscoverOverrideRows(undefined);
      setDiscoverLoading(false);
      toast.error("Please enter a city, state, or ZIP code before searching.");
      return;
    }
    if (!body.zip_code && hasLocation) {
      body.zip_code = body.location;
    }

    await runDiscoverRequest(body);
  };

  useEffect(
    () => () => {
      if (discoverAbortControllerRef.current) {
        discoverAbortControllerRef.current.abort();
      }
    },
    [],
  );

  useEffect(() => {
    if (discoverOverrideRows !== undefined) {
      setPage(1);
    }
  }, [discoverOverrideRows]);

  const scopedFacilities = useMemo(() => {
    if (scope !== "saved") return uniqueBaseFacilities;
    const favoriteSet = new Set(favoriteFacilityIds.map((id) => String(id)));
    return uniqueBaseFacilities.filter((f) =>
      favoriteSet.has(String(f.key ?? f.facilityId ?? f.name)),
    );
  }, [scope, uniqueBaseFacilities, favoriteFacilityIds]);

  const filteredFacilities = useMemo(() => {
    const q = String(activeFilters.searchQuery || "")
      .trim()
      .toLowerCase();
    const locationQuery = String(activeFilters.locationQuery || carrieLocationQuery || "")
      .trim()
      .toLowerCase();
    const isZipOnlyLocationQuery = /^\d{5}$/.test(locationQuery);
    const maxMilesNum = Number.parseFloat(
      String(activeFilters.maxMiles || "").trim(),
    );
    const budgetMin = Number(activeFilters.budgetMin) || 1000;
    const budgetMax = Number(activeFilters.budgetMax) || 15000;
    const selectedCare = new Set(
      (activeFilters.selectedCareTypes || []).map((x) => String(x).toLowerCase()),
    );
    const selectedAmenities = (activeFilters.selectedAmenities || []).map((x) =>
      String(x).toLowerCase(),
    );
    const selectedAvailability = new Set(
      (activeFilters.selectedAvailability || []).map((x) => String(x).toLowerCase()),
    );

    const getAmenityHits = (facility) => {
      if (selectedAmenities.length === 0) return 0;
      const pool = [
        ...(facility.amenities || []).map(amenityText),
        ...(facility.services || []).map(amenityText),
        ...(facility.features || []).map(amenityText),
        String(facility.description || ""),
        String(facility.name || ""),
      ]
        .map((x) => normMatchToken(x))
        .filter(Boolean);

      return selectedAmenities.filter((a) => {
        const variants = amenityMatchVariants(a);
        if (variants.length === 0) return true;
        return variants.some((want) =>
          pool.some((p) => p.includes(want) || want.includes(p)),
        );
      }).length;
    };

    const matchesFacility = (facility, { amenityMode }) => {
      const assistedOnlyLevels = [
        ...(facility.careLevels || []).map((x) => normMatchToken(x)),
        normMatchToken(facility.category),
      ].filter(Boolean);
      const hasAssistedLiving = assistedOnlyLevels.some(
        (level) =>
          level.includes("assisted living") ||
          level.includes("assisted") ||
          level.includes("retirement community") ||
          level.includes("assisted living facility"),
      );
      if (!hasAssistedLiving) {
        const isCarrieResult =
          fromCarrie ||
          String(facility.sourcePlatform || "").toLowerCase().includes("ai discovery");
        if (!isCarrieResult) return false;
      }

      if (locationQuery && !isZipOnlyLocationQuery) {
        // For Carrie-originated matches, the backend discovery already anchors to the metro/ZIP.
        // Strict substring matching against a user-entered city label (e.g. "Miami, FL")
        // incorrectly hides nearby valid matches (e.g. Coral Gables) that are still in the
        // returned AI discovery set.
        const shouldApplyStrictLocationFilter = !fromCarrie;
        if (shouldApplyStrictLocationFilter) {
          // Use improved location matching that handles state names and abbreviations
          if (!addressMatchesLocation(facility.address, locationQuery)) return false;
        }
      }

      if (q) {
        const text =
          `${facility.name || ""} ${facility.category || ""} ${facility.address || ""} ${(facility.features || []).join(" ")}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      if (facility.priceMin != null || facility.priceMax != null) {
        const low = facility.priceMin ?? facility.priceMax;
        const high = facility.priceMax ?? facility.priceMin;
        if (low != null && high != null) {
          const overlaps = low <= budgetMax && high >= budgetMin;
          if (!overlaps) return false;
        }
      }

      if (selectedCare.size > 0) {
        const levels = [
          ...(facility.careLevels || []).map((x) => normMatchToken(x)),
          normMatchToken(facility.category),
        ].filter(Boolean);
        const hasCare = [...selectedCare].some((c) => {
          const cn = normMatchToken(c);
          if (!cn) return false;
          return levels.some((l) => l.includes(cn) || cn.includes(l));
        });
        if (!hasCare) return false;
      }

      if (selectedAmenities.length > 0) {
        const hits = getAmenityHits(facility);
        if (amenityMode === "all") {
          if (hits !== selectedAmenities.length) return false;
        } else if (amenityMode === "half") {
          const threshold = Math.max(1, Math.ceil(selectedAmenities.length * 0.5));
          if (hits < threshold) return false;
        }
      }

      if (selectedAvailability.size > 0) {
        const a = String(facility.availability || "").toLowerCase();
        if (a && !selectedAvailability.has(a)) return false;
      }

      if (!Number.isNaN(maxMilesNum) && maxMilesNum > 0) {
        const facilityMiles = computeFacilityMiles(facility, locationCenterCoords);
        if (!Number.isNaN(facilityMiles) && facilityMiles > maxMilesNum)
          return false;
      }

      return true;
    };

    const strict = scopedFacilities.filter((f) => matchesFacility(f, { amenityMode: "all" }));
    if (selectedAmenities.length > 0 && strict.length === 0) {
      return scopedFacilities.filter((f) => matchesFacility(f, { amenityMode: "half" }));
    }
    return strict;
  }, [
    activeFilters,
    scopedFacilities,
    carrieLocationQuery,
    locationCenterCoords,
    fromCarrie,
    discoverOverrideRows,
  ]);

  const rankedFacilities = useMemo(() => {
    const locationQuery = String(activeFilters.locationQuery || carrieLocationQuery || "")
      .trim()
      .toLowerCase();
    const searchQuery = String(activeFilters.searchQuery || "").trim().toLowerCase();
    const selectedCare = (activeFilters.selectedCareTypes || []).map((x) =>
      String(x).toLowerCase(),
    );
    const selectedAmenities = (activeFilters.selectedAmenities || []).map((x) =>
      String(x).toLowerCase(),
    );
    const selectedAvailability = (activeFilters.selectedAvailability || []).map((x) =>
      String(x).toLowerCase(),
    );
    const budgetMin = Number(activeFilters.budgetMin) || 1000;
    const budgetMax = Number(activeFilters.budgetMax) || 15000;
    const sortBy = String(activeFilters.sortBy || "bestMatch");

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
  }, [filteredFacilities, activeFilters, carrieLocationQuery, locationCenterCoords]);

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

  const pageSize = layout === "grid" ? 12 : 4;
  const matchCountForHeader = rankedFacilities.length;
  const locationLabelForHeader =
    buildEffectiveLocationQuery(
      String(appliedFilters.locationQuery || "").trim() || carrieLocationQuery,
      appliedFilters.zipCode,
    ) ||
    String(appliedFilters.searchQuery || "").trim() ||
    "your area";
  const summaryCareText =
    appliedFilters.selectedCareTypes.length > 0
      ? appliedFilters.selectedCareTypes.join(", ")
      : "senior living";
  const summaryBudgetText = `$${Number(appliedFilters.budgetMin || 1000).toLocaleString()}-$${Number(appliedFilters.budgetMax || 15000).toLocaleString()}/mo`;
  const summaryNeedsText =
    appliedFilters.selectedAmenities.length > 0
      ? appliedFilters.selectedAmenities.slice(0, 2).join(", ")
      : "your selected preferences";
  const hasNonDefaultAvailability =
    appliedFilters.selectedAvailability.length > 0 &&
    !(
      appliedFilters.selectedAvailability.length === 1 &&
      String(appliedFilters.selectedAvailability[0]).trim().toLowerCase() === "within 30 days"
    );
  const promptCriteria = [];
  const displayCriteria =
    carrieFilters?.displayCriteria && typeof carrieFilters.displayCriteria === "object"
      ? carrieFilters.displayCriteria
      : null;
  if (displayCriteria) {
    const displayLocation = String(displayCriteria.location || locationLabelForHeader || "").trim();
    const displayBudgetMin = sanitizeMonthlyBudgetValue(displayCriteria.budgetMinMonthly);
    const displayBudgetMax = sanitizeMonthlyBudgetValue(displayCriteria.budgetMaxMonthly);
    const displayDistance = String(displayCriteria.maxDistanceMiles || "").trim();
    const displayMustHaves = Array.isArray(displayCriteria.mustHaveNeeds)
      ? displayCriteria.mustHaveNeeds.map((item) => String(item || "").trim()).filter(Boolean)
      : [];
    const displayAvailability = String(displayCriteria.availability || "").trim();

    if (displayLocation) {
      promptCriteria.push({ label: "Location", value: displayLocation });
    }
    if (displayBudgetMin != null || displayBudgetMax != null) {
      const minText = displayBudgetMin != null ? `$${displayBudgetMin.toLocaleString()}` : "";
      const maxText = displayBudgetMax != null ? `$${displayBudgetMax.toLocaleString()}` : "";
      promptCriteria.push({
        label: "Budget",
        value: [minText, maxText].filter(Boolean).join("-") + "/mo",
      });
    }
    if (displayDistance) {
      promptCriteria.push({
        label: "Distance",
        value: `Within ${displayDistance} miles`,
      });
    }
    if (displayMustHaves.length > 0) {
      promptCriteria.push({
        label: "Must-Have Needs",
        value: displayMustHaves.join(", "),
      });
    }
    if (displayAvailability) {
      promptCriteria.push({
        label: "Move-In Timeline",
        value: displayAvailability,
      });
    }
  } else {
    if (locationLabelForHeader) {
      promptCriteria.push({ label: "Location", value: locationLabelForHeader });
    }
    if (appliedFilters.selectedCareTypes.length > 0) {
      promptCriteria.push({
        label: "Care Type",
        value: appliedFilters.selectedCareTypes.join(", "),
      });
    }
    if (
      sanitizeMonthlyBudgetValue(carrieFilters?.budgetMaxMonthly) != null ||
      Number(appliedFilters.budgetMin) !== 1000 ||
      Number(appliedFilters.budgetMax) !== 15000
    ) {
      promptCriteria.push({
        label: "Budget",
        value: summaryBudgetText,
      });
    }
    if (String(appliedFilters.maxMiles || "").trim()) {
      promptCriteria.push({
        label: "Distance",
        value: `Within ${String(appliedFilters.maxMiles).trim()} miles`,
      });
    }
    if (appliedFilters.selectedAmenities.length > 0) {
      promptCriteria.push({
        label: "Must-Have Needs",
        value: appliedFilters.selectedAmenities.join(", "),
      });
    }
    if (hasNonDefaultAvailability) {
      promptCriteria.push({
        label: "Move-In Timeline",
        value: appliedFilters.selectedAvailability.join(", "),
      });
    }
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

          marker.addListener("click", () => {
            setSelectedFacilityKey(f.key);
            mapInstanceRef.current?.panTo(latLng);
            mapInstanceRef.current?.setZoom(15);
            const cardEl = cardRefsMap.current[f.key];
            if (cardEl) {
              cardEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
            }
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

  useEffect(() => {
    if (!mapMarkersRef.current.length) return;
    mapMarkersRef.current.forEach(({ marker, key }) => {
      if (!marker) return;
      if (key === selectedFacilityKey) {
        marker.setZIndex(999);
        marker.setAnimation(window.google?.maps?.Animation?.BOUNCE);
        setTimeout(() => marker.setAnimation(null), 1400);
      } else {
        marker.setZIndex(undefined);
      }
    });
  }, [selectedFacilityKey]);

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
        <LoadingOverlay
          open={discoverLoading}
          subtitle={discoverThinkingMessages[discoverThinkingIndex]}
        />
        <style jsx global>{`
          @keyframes careExplorerFloatLeftRight {
            0%, 100% {
              transform: translateX(0px) translateY(0px);
            }
            50% {
              transform: translateX(3px) translateY(-2px);
            }
          }

          @keyframes careExplorerIconFloatStrong {
            0%, 100% {
              transform: translateY(0px) translateX(0px) scale(1);
            }
            25% {
              transform: translateY(-6px) translateX(2px) scale(1.05);
            }
            50% {
              transform: translateY(-2px) translateX(5px) scale(1.1);
            }
            75% {
              transform: translateY(4px) translateX(-1px) scale(1.03);
            }
          }

          @keyframes careExplorerIconBounceStrong {
            0%, 100% {
              transform: translateY(0px) scale(1);
            }
            20% {
              transform: translateY(-7px) scale(1.06);
            }
            40% {
              transform: translateY(1px) scale(0.98);
            }
            60% {
              transform: translateY(-4px) scale(1.04);
            }
            80% {
              transform: translateY(0px) scale(1);
            }
          }

          @keyframes careExplorerIconSpinStrong {
            0% {
              transform: rotate(0deg) scale(1);
            }
            40% {
              transform: rotate(160deg) scale(1.08);
            }
            70% {
              transform: rotate(280deg) scale(1.02);
            }
            100% {
              transform: rotate(360deg) scale(1);
            }
          }

          @keyframes careExplorerIconWobble {
            0%, 100% {
              transform: rotate(0deg) translateY(0px) scale(1);
            }
            15% {
              transform: rotate(-12deg) translateY(-2px) scale(1.05);
            }
            30% {
              transform: rotate(10deg) translateY(2px) scale(1.02);
            }
            45% {
              transform: rotate(-8deg) translateY(-1px) scale(1.06);
            }
            60% {
              transform: rotate(6deg) translateY(2px) scale(1.03);
            }
            75% {
              transform: rotate(-4deg) translateY(-1px) scale(1.01);
            }
          }

          @keyframes careExplorerIconRipple {
            0% {
              box-shadow: 0 0 0 0 rgba(0, 207, 244, 0.45);
            }
            70% {
              box-shadow: 0 0 0 14px rgba(0, 207, 244, 0);
            }
            100% {
              box-shadow: 0 0 0 0 rgba(0, 207, 244, 0);
            }
          }

          .animate-icon-float-strong {
            animation: careExplorerIconFloatStrong 1.45s ease-in-out infinite;
            will-change: transform;
          }

          .animate-icon-bounce-strong {
            animation: careExplorerIconBounceStrong 1.2s ease-in-out infinite;
            will-change: transform;
          }

          .animate-icon-spin-strong {
            animation: careExplorerIconSpinStrong 1.3s linear infinite;
            will-change: transform;
          }

          .animate-icon-wobble {
            animation: careExplorerIconWobble 1.1s ease-in-out infinite;
            will-change: transform;
          }

          .animate-icon-ripple {
            animation:
              careExplorerIconFloatStrong 1.45s ease-in-out infinite,
              careExplorerIconRipple 1.7s ease-out infinite;
            will-change: transform, box-shadow;
          }

          .animate-float-left-right {
            animation: careExplorerFloatLeftRight 2.2s ease-in-out infinite;
            will-change: transform;
          }
        `}</style>
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
                onFiltersChange={(nextFilters) => {
                  hasUserTouchedFiltersRef.current = true;
                  setFilters(nextFilters);
                }}
                onReset={() => {
                  if (discoverAbortControllerRef.current) {
                    discoverAbortControllerRef.current.abort();
                    discoverAbortControllerRef.current = null;
                  }
                  discoverInFlightSignatureRef.current = "";
                  lastDiscoverSignatureRef.current = "";
                  lastDiscoverStartedAtRef.current = 0;
                  carrieBootstrapDiscoverDoneRef.current = false;
                  discoverRunIdRef.current += 1;
                  hasUserTouchedFiltersRef.current = false;
                  setDiscoverLoading(false);
                  setDiscoverOverrideRows(undefined);
                  setFilters(initialFilters);
                  setAppliedFilters(initialFilters);
                }}
                careTypeOptions={careTypeOptions}
                amenityOptions={amenityOptions}
                onAskCarrie={handleAskCarrie}
                onApplyFilters={handleApplyFilters}
                isApplying={discoverLoading}
                canApplyFilters={hasPendingFilterChanges}
              />
            </div>
          </div>

          {view === "listing" ? (
            <div
              ref={listingTopRef}
              className={`flex-1 min-w-0 w-full max-w-full ${layout === "grid" ? "lg:max-w-none" : "lg:max-w-5xl"} ${layout === "single"
                ? "space-y-3 sm:space-y-4"
                : layout === "two"
                  ? "grid content-start items-start grid-cols-2 md:grid-cols-2 gap-3 sm:gap-4"
                  : "grid content-start items-start grid-cols-1 min-[520px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
                }`}
            >
              {discoverLoading ? (
                <div className="col-span-full rounded-xl border border-[#E2E8F0] bg-white p-8">
                  <div className="mx-auto max-w-xl rounded-3xl border border-[#00CFF4]/20 bg-gradient-to-br from-white to-[#F0FBFF] px-5 py-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)] sm:px-6">
                    <div className="flex items-start gap-4">
                      <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#00CFF4]/15 text-[#00A8C8] shadow-[0_10px_24px_rgba(0,207,244,0.16)]">
                        <img
                          src="/assets/images/favicon/favicon.svg"
                          alt="CareMatch"
                          className="h-5 w-5 object-contain"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-[#132329]">Finding your best matches</p>
                          <div className="flex items-center gap-1" aria-hidden>
                            <span className="h-1.5 w-1.5 rounded-full bg-[#00CFF4] animate-bounce" />
                            <span
                              className="h-1.5 w-1.5 rounded-full bg-[#00CFF4] animate-bounce"
                              style={{ animationDelay: "0.18s" }}
                            />
                            <span
                              className="h-1.5 w-1.5 rounded-full bg-[#00CFF4] animate-bounce"
                              style={{ animationDelay: "0.36s" }}
                            />
                          </div>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          {discoverThinkingMessages[discoverThinkingIndex]}
                        </p>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#E2E8F0]">
                          <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-[#00CFF4] via-[#60A5FA] to-[#818CF8] animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                listingItems.map((f) => (
                <div
                  key={f.key ?? f.matchPercent}
                  className={
                    layout === "grid"
                      ? "min-w-0 w-full overflow-hidden"
                      : layout !== "single"
                        ? "min-w-0 overflow-hidden"
                        : undefined
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
                ))
              )}

              {!discoverLoading && listingItems.length === 0 && (
                <div className="col-span-full rounded-xl border border-[#E2E8F0] bg-white p-6 text-center text-sm text-[#64748b]">
                  No facilities available yet for the selected filters.
                </div>
              )}

              {totalPages > 1 && (
                <div className="col-span-full mt-2 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
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
                          onClick={() => handlePageChange(Number(p))}
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
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
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
                <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 w-full overflow-x-hidden">
                  <p className="text-sm font-semibold text-[#132329] mb-1">
                    Recommended Matches
                  </p>
                  <div className="flex gap-3 sm:gap-4 overflow-x-auto pt-3 pb-4 snap-x scrollbar-hide">
                    {(visibleMapFacilities || []).map((f) => {
                      const isSelected = selectedFacilityKey === f.key;
                      return (
                      <div
                        key={`map-${f.key ?? f.matchPercent}`}
                        ref={(el) => { if (el) cardRefsMap.current[f.key] = el; }}
                        className={`w-[320px] snap-start flex-shrink-0 cursor-pointer transition-all hover:scale-[1.03] rounded-2xl ${isSelected ? "ring-2 ring-[#00CFF4] ring-offset-2 scale-[1.02] shadow-lg" : ""}`}
                        onClick={(e) => {
                          if (e.target.closest('button') || e.target.closest('a')) return;
                          setSelectedFacilityKey(f.key);
                          const markerObj = mapMarkersRef.current.find(m => m.key === f.key);
                          if (markerObj && markerObj.marker && mapInstanceRef.current) {
                            mapInstanceRef.current.panTo(markerObj.marker.getPosition());
                            mapInstanceRef.current.setZoom(15);
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
                    );
                    })}
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
