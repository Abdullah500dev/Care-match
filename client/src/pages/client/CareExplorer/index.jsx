import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ChevronLeft,
  ChevronRight,
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
import { setLastMatchCount } from "@/lib/userDashboardStats";
import {
  isAggregatorListingUrl,
  normalizeFacilityWebsite,
} from "../../../lib/facilityWebsite";

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
const DEFAULT_PRICE_RANGE = "";
const DEFAULT_MAP_CENTER = { lat: 40.7128, lng: -74.006 };
const DEFAULT_NEARBY_RADIUS_MILES = 30;
const AUTO_APPLY_FILTERS = false;
const ZIP_ONLY_DISCOVERY_MODE = true;
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

/** Cards with no numeric monthly price — skip strict budget range matching. */
function facilityHasCallForPricingDisplay(facility) {
  const display = String(facility?.priceRange || "").trim();
  if (!display || /^price\s+on\s+call$/i.test(display)) return true;
  const { min, max } = parsePriceRangeNumbers(display);
  return min == null && max == null;
}

function averagePriceFromText(rawPricing) {
  const { min, max } = parsePriceRangeNumbers(rawPricing);
  if (min != null && max != null) return Math.round((min + max) / 2);
  if (min != null) return min;
  if (max != null) return max;
  return null;
}

/** Admin/provider listings created in CareMatch (not external API scrapes). */
function isCareMatchPartnerListing(facility) {
  if (!facility || typeof facility !== "object") return false;
  if (facility.isExternal === false) return true;
  const platform = String(facility.sourcePlatform || "").toLowerCase();
  if (platform === "carematch") return true;
  const key = String(facility.key || facility.facilityId || "");
  return key.startsWith("owned-") || key.startsWith("snf-");
}

function partnerMatchesSearchArea(facility, { zipCode = "", locationQuery = "" } = {}) {
  if (!isCareMatchPartnerListing(facility)) return false;
  const zipFromLocation =
    String(locationQuery || "").match(/\b(\d{5})(?:-\d{4})?\b/)?.[1] || "";
  const searchZip =
    String(zipCode || "").replace(/\D/g, "").slice(0, 5) || zipFromLocation;
  const facilityZip = String(facility.zipCode || "").replace(/\D/g, "").slice(0, 5);
  if (searchZip && facilityZip && searchZip === facilityZip) return true;
  const loc = String(locationQuery || "").trim();
  if (loc && addressMatchesLocation(facility.address, loc.toLowerCase())) return true;
  return false;
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

function parseDistanceMiles(value) {
  if (value == null) return null;
  const parsed = Number.parseFloat(String(value).replace(/[^0-9.]+/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveCarrieMaxMiles(filters) {
  if (!filters) return null;
  const candidate =
    filters.maxDistanceMiles ??
    filters.max_distance_miles ??
    filters.maxMiles ??
    filters.max_miles;
  return parseDistanceMiles(candidate);
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

  const normalizedImageUrls = Array.isArray(m.images)
    ? m.images
        .map((img) => resolveFacilityImageUrl(img))
        .filter((img) => typeof img === "string" && img.trim().length > 0)
    : [];
  let imageSrc = normalizedImageUrls[0] || null;
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
  const isSnfListing =
    String(m.facilityId || "").startsWith("snf-") ||
    (Array.isArray(m.care_levels) &&
      m.care_levels.some((level) => /skilled nursing/i.test(String(level || ""))));
  const category = isSnfListing ? "SKILLED NURSING" : "ASSISTED LIVING";
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
  const googlePlacesWebsite = String(externalData?.google_places?.website || "").trim();
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
    imageUrls: normalizedImageUrls,
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
    email: String(m.email || externalData.email || "").trim(),
    website: (() => {
      const top = String(m.website || "").trim();
      const gpSite = String(googlePlacesWebsite || "").trim();
      const candidate = top && !isAggregatorListingUrl(top) ? top : gpSite;
      return normalizeFacilityWebsite(candidate);
    })(),
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
    distanceMiles:
      m.distance_miles != null && Number.isFinite(Number(m.distance_miles))
        ? Number(m.distance_miles)
        : null,
  };
}

function normalizeSavedFacilityDetail(detail) {
  const src = detail && typeof detail === "object" ? detail : {};
  const key = String(src.facilityId || src.id || src._id || src.name || "").trim();
  const normalizedImageUrls = Array.isArray(src.imageUrls)
    ? src.imageUrls
        .map((img) => resolveFacilityImageUrl(img))
        .filter((img) => typeof img === "string" && img.trim().length > 0)
    : [];
  const imageSrc = resolveFacilityImageUrl(src.imageSrc) || normalizedImageUrls[0] || DEFAULT_CARD_IMAGE;
  const pricingText = String(src.priceRange || src.pricing || "").trim();
  const numericPrice = parsePriceRangeNumbers(pricingText);
  const parsedRating = Number(src.rating);
  const parsedReviewCount = Number(src.reviewCount);
  const rawLat = src.lat ?? src.latitude;
  const rawLng = src.lng ?? src.longitude;
  const parsedLat = Number(rawLat);
  const parsedLng = Number(rawLng);
  const lat =
    rawLat != null &&
    String(rawLat).trim() !== "" &&
    Number.isFinite(parsedLat) &&
    !(Math.abs(parsedLat) < 0.01 && Math.abs(Number(rawLng)) < 0.01)
      ? parsedLat
      : null;
  const lng =
    rawLng != null &&
    String(rawLng).trim() !== "" &&
    Number.isFinite(parsedLng) &&
    lat != null
      ? parsedLng
      : null;
  return {
    key: key || String(src.name || "saved-facility"),
    matchPercent: Number.isFinite(Number(src.matchPercent)) ? Number(src.matchPercent) : 0,
    imageSrc,
    imageUrls: normalizedImageUrls,
    category: "ASSISTED LIVING",
    name: String(src.name || "Community"),
    priceRange: formatPriceRange(pricingText),
    priceMin: numericPrice.min,
    priceMax: numericPrice.max,
    distance: String(src.distance || "Saved facility"),
    features: Array.isArray(src.features) ? src.features : [],
    address: String(src.address || ""),
    zipCode: String(src.zipCode || src.zip_code || ""),
    phone: String(src.phone || ""),
    email: String(src.email || ""),
    website: String(src.website || ""),
    rating: Number.isFinite(parsedRating) ? parsedRating : 4.8,
    reviewCount: Number.isFinite(parsedReviewCount) ? parsedReviewCount : null,
    ratingLabel: "family reviews",
    specialty: Array.isArray(src.specialty) ? src.specialty : [],
    description: String(src.description || ""),
    sourcePlatform: String(src.sourcePlatform || src.source_platform || ""),
    isExternal: Boolean(src.isExternal ?? src.is_external),
    externalSourceUrl: String(src.externalSourceUrl || src.external_source_url || ""),
    careLevels: Array.isArray(src.careLevels) ? src.careLevels : [],
    amenities: Array.isArray(src.amenities) ? src.amenities : [],
    services: Array.isArray(src.services) ? src.services : [],
    availability: String(src.availability || ""),
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    distanceMiles:
      src.distanceMiles != null && Number.isFinite(Number(src.distanceMiles))
        ? Number(src.distanceMiles)
        : null,
    savedAt: src.savedAt || null,
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

/** Searchable text pool for must-have amenity matching on a facility card. */
function buildFacilityAmenitySearchPool(facility) {
  const specialty = Array.isArray(facility?.specialty) ? facility.specialty : [];
  return [
    ...(facility?.amenities || []).map(amenityText),
    ...(facility?.services || []).map(amenityText),
    ...(facility?.features || []).map(amenityText),
    ...(facility?.careLevels || []).map(amenityText),
    ...specialty.map(amenityText),
    String(facility?.description || ""),
    String(facility?.name || ""),
    String(facility?.category || ""),
    String(facility?.priceRange || ""),
    String(facility?.address || ""),
  ]
    .map((x) => normMatchToken(x))
    .filter(Boolean);
}

function amenityPreferenceMatches(pool, selectedLower) {
  const variants = amenityMatchVariants(selectedLower);
  if (variants.length === 0) return true;
  return variants.some((want) =>
    pool.some((p) => p.includes(want) || want.includes(p)),
  );
}

/** All selected must-haves must match (AND). Empty selection = no filter. */
function facilityMeetsMustHaveAmenities(facility, selectedAmenities) {
  if (!selectedAmenities.length) return true;
  const pool = buildFacilityAmenitySearchPool(facility);
  return selectedAmenities.every((want) => amenityPreferenceMatches(pool, want));
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

function hasValidFacilityCoords(facility) {
  const rawLat = facility?.lat;
  const rawLng = facility?.lng;
  if (rawLat == null || rawLng == null) return false;
  if (String(rawLat).trim() === "" || String(rawLng).trim() === "") return false;
  const lat = Number(rawLat);
  const lng = Number(rawLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  // Missing geocode often collapses to Null Island (0,0) — treat as invalid.
  if (Math.abs(lat) < 0.01 && Math.abs(lng) < 0.01) return false;
  return true;
}

function computeFacilityMiles(facility, locationCenterCoords) {
  // Important: Number(null) === 0, so never coerce null coords before validating.
  if (locationCenterCoords && hasValidFacilityCoords(facility)) {
    return distanceMiles(locationCenterCoords, {
      lat: Number(facility.lat),
      lng: Number(facility.lng),
    });
  }
  const apiMiles = Number(facility?.distanceMiles);
  const apiMilesTrusted =
    Number.isFinite(apiMiles) &&
    apiMiles >= 0 &&
    apiMiles <= 500 &&
    (!isCareMatchPartnerListing(facility) || apiMiles <= 200);
  if (apiMilesTrusted) {
    return apiMiles;
  }
  const parsed = Number.parseFloat(
    String(facility?.distance || "").match(/(\d+(?:\.\d+)?)\s*miles?/i)?.[1],
  );
  return Number.isFinite(parsed) && parsed <= 500 ? parsed : Number.NaN;
}

function formatDistanceLabel(distanceInMiles, zipCode) {
  if (Number.isFinite(distanceInMiles) && distanceInMiles >= 0) {
    if (distanceInMiles < 0.5) return "In your ZIP";
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

    const existingIsPartner = isCareMatchPartnerListing(existing);
    const incomingIsPartner = isCareMatchPartnerListing(facility);
    if (incomingIsPartner && !existingIsPartner) {
      selected.set(dedupKey, facility);
      return;
    }
    if (existingIsPartner && !incomingIsPartner) {
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

/**
 * Build POST /api/facilities/discover body from sidebar (+ optional Carrie intake).
 * @param {{ sidebarOnly?: boolean }} [options] — when true (Apply Filters), use only sidebar fields.
 */
function buildDiscoverRequestBody(
  filters,
  carrieFilters,
  carrieLocationQuery,
  options = {},
) {
  const sidebarOnly = options.sidebarOnly === true;
  const locRaw = sidebarOnly
    ? String(filters.locationQuery || "").trim()
    : String(filters.locationQuery || carrieLocationQuery || "").trim();
  const explicitZip = String(filters.zipCode || "")
    .replace(/\D/g, "")
    .slice(0, 5);
  const zipFromPrefs = sidebarOnly
    ? ""
    : String(carrieFilters?.searchZipCode || "")
        .replace(/\D/g, "")
        .slice(0, 5);
  const zip = sidebarOnly
    ? explicitZip || extractFiveDigitZip(locRaw)
    : explicitZip ||
      extractFiveDigitZip(locRaw) ||
      extractFiveDigitZip(String(carrieLocationQuery || "")) ||
      extractFiveDigitZip(String(carrieFilters?.searchLocation || "")) ||
      (zipFromPrefs.length === 5 ? zipFromPrefs : "");
  const baseLocation = sidebarOnly
    ? locRaw
    : locRaw || String(carrieFilters?.searchLocation || "").trim();

  // Keep the location scoped to the city/state even when max distance changes,
  // so increasing radius never narrows the base discovery query.
  let location = normalizeLocationFieldValue(baseLocation, zip) || baseLocation;
  if (!location) {
    location = zip;
  }

  const care_levels = ["assisted living"];

  const amenities = ZIP_ONLY_DISCOVERY_MODE
    ? []
    : [
      ...(Array.isArray(filters.selectedAmenities)
        ? filters.selectedAmenities.map((x) => String(x))
        : []),
      ...(Array.isArray(carrieFilters?.amenityMustHaves)
        ? carrieFilters.amenityMustHaves.map((x) => String(x))
        : []),
    ]
      .map((x) => x.trim())
      .filter(Boolean);

  const services = ZIP_ONLY_DISCOVERY_MODE ? [] : deriveServicesFromPreferencePhrases(amenities);
  const keywords = ZIP_ONLY_DISCOVERY_MODE ? [] : deriveDiscoverKeywords(filters);
  const maxDistanceMiles = Number.parseFloat(String(filters.maxMiles || "").trim());

  const body = {
    zip_code: zip,
    location,
    care_levels,
    amenities: [...new Set(amenities)],
    services: [...new Set(services)],
    keywords,
    max_distance_miles:
      Number.isFinite(maxDistanceMiles) && maxDistanceMiles > 0
        ? Math.round(maxDistanceMiles)
        : null,
  };

  // With live filters, budget is applied client-side so the slider does not wipe the
  // candidate set when the external API has nothing strictly in-band (common in NYC).
  if (!AUTO_APPLY_FILTERS) {
    body.budget_min = Number(filters.budgetMin);
    body.budget_max = Number(filters.budgetMax);
  }

  return body;
}

/** Zip + normalized location — radius widen merge only when this matches the last completed discover. */
function discoverMergeContextKey(body) {
  const zip = String(body?.zip_code || "")
    .replace(/\D/g, "")
    .slice(0, 5);
  const loc = String(body?.location || "").trim().toLowerCase();
  return `${zip}|${loc}`;
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

/** Draft vs applied for “needs Apply” — sort, budget, and amenities refine the list live (client-side). */
function filterStateForApplyPendingCompare(filters) {
  const norm = normalizeFilterStateForCompare(filters);
  const {
    sortBy: _sort,
    selectedAmenities: _amenities,
    budgetMin: _budgetMin,
    budgetMax: _budgetMax,
    ...rest
  } = norm;
  return rest;
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
  const initialMaxMiles = useMemo(() => {
    const parsedCandidate = resolveCarrieMaxMiles(carrieFilters);
    if (parsedCandidate != null) {
      return String(parsedCandidate);
    }
    if (fromCarrie) return String(DEFAULT_NEARBY_RADIUS_MILES);
    return "";
  }, [carrieFilters, fromCarrie]);

  const initialFilters = useMemo(
    () => ({
    locationQuery: inferredCarrieLocationQuery,
    zipCode: carrieZipCode,
    searchQuery: "",
    maxMiles: initialMaxMiles,
    budgetMin: 1000,
    budgetMax: 15000,
    selectedCareTypes: [],
    selectedAvailability: ["Within 30 Days"],
    selectedAmenities: [],
    sortBy: "bestMatch",
    }),
    [inferredCarrieLocationQuery, carrieZipCode, initialMaxMiles],
  );

  // `filters` are the draft values (typing/selecting in the sidebar)
  const [filters, setFilters] = useState(initialFilters);
  // `filters` = sidebar draft. When AUTO_APPLY_FILTERS is true, `appliedFilters` mirrors `filters`
  // and `activeFilters` is the draft; when false, `activeFilters` is last-applied until user clicks Apply.
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const hasPendingFilterChanges = useMemo(() => {
    const draft = filterStateForApplyPendingCompare(filters);
    const applied = filterStateForApplyPendingCompare(appliedFilters);
    return JSON.stringify(draft) !== JSON.stringify(applied);
  }, [filters, appliedFilters]);

  const activeFilters = AUTO_APPLY_FILTERS ? filters : appliedFilters;

  useEffect(() => {
    if (!AUTO_APPLY_FILTERS) return;
    setAppliedFilters(filters);
  }, [filters]);

  const mapContainerRef = useRef(null);
  const listingTopRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const mapMarkersRef = useRef([]);
  const mapCardsScrollRef = useRef(null);
  const geocoderRef = useRef(null);
  const [selectedFacilityKey, setSelectedFacilityKey] = useState(null);
  const cardRefsMap = useRef({});
  const [mapError, setMapError] = useState("");
  const [mapsReady, setMapsReady] = useState(false);
  const [currentCoords, setCurrentCoords] = useState(null);
  const [locationCenterCoords, setLocationCenterCoords] = useState(null);
  const [nearbyMapFacilityKeys, setNearbyMapFacilityKeys] = useState([]);
  const [mapCardsNav, setMapCardsNav] = useState({ canLeft: false, canRight: false });
  const [directoryFacilities, setDirectoryFacilities] = useState([]);
  /** `undefined` = use Carrie / directory; array = last live discover from filters (may be empty). */
  const [discoverOverrideRows, setDiscoverOverrideRows] = useState(undefined);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [liveFilterLoading, setLiveFilterLoading] = useState(false);
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
  /** Same discover body in flight — share one promise so callers never get `undefined`. */
  const discoverInflightPromiseBySignatureRef = useRef(new Map());
  /** Recent successful normalized rows keyed by request signature (short TTL). */
  const discoverCachedRowsBySignatureRef = useRef(new Map());
  /** Last discover listing snapshot — merge fallback when React state `prev` is briefly empty. */
  const lastDiscoverSnapshotForMergeRef = useRef([]);
  const carrieBootstrapDiscoverDoneRef = useRef(false);
  /** After Apply Filters, listings come from POST /api/facilities/discover (Caring/SilverAssist), not Carrie results.js. */
  const discoverApplyCompletedRef = useRef(false);
  const hasUserTouchedFiltersRef = useRef(false);
  const skipDiscoverMountRef = useRef(true);
  /** Last completed discover `maxMiles` string — used to merge when the user widens radius. */
  const lastDiscoverMaxMilesRef = useRef("");
  /** Last discover zip+location — do not merge widen results across different searches. */
  const lastDiscoverMergeContextKeyRef = useRef("");
  const liveFilterLoaderTimeoutRef = useRef(null);
  const skipLiveFilterLoaderMountRef = useRef(true);
  const skipQueryLogMountRef = useRef(true);
  const { isAuthenticated, userData } = useSelector(getUser);
  const [favoriteFacilityIds, setFavoriteFacilityIds] = useState([]);
  const [favoriteFacilityDetails, setFavoriteFacilityDetails] = useState([]);
  const showResultsLoading = discoverLoading || liveFilterLoading;

  const liveRefinementFilterKey = useMemo(
    () =>
      JSON.stringify({
        sortBy: String(filters.sortBy || "bestMatch"),
        budgetMin: Number(filters.budgetMin) || 1000,
        budgetMax: Number(filters.budgetMax) || 15000,
        selectedAmenities: [...(filters.selectedAmenities || [])]
          .map((x) => String(x || "").trim().toLowerCase())
          .filter(Boolean)
          .sort(),
      }),
    [filters.sortBy, filters.budgetMin, filters.budgetMax, filters.selectedAmenities],
  );

  useEffect(() => {
    if (skipLiveFilterLoaderMountRef.current) {
      skipLiveFilterLoaderMountRef.current = false;
      return;
    }
    if (discoverLoading) return;

    setLiveFilterLoading(true);
    if (liveFilterLoaderTimeoutRef.current) {
      clearTimeout(liveFilterLoaderTimeoutRef.current);
    }
    liveFilterLoaderTimeoutRef.current = setTimeout(() => {
      setLiveFilterLoading(false);
      liveFilterLoaderTimeoutRef.current = null;
    }, 240);
  }, [liveRefinementFilterKey, discoverLoading]);

  useEffect(
    () => () => {
      if (liveFilterLoaderTimeoutRef.current) {
        clearTimeout(liveFilterLoaderTimeoutRef.current);
      }
    },
    [],
  );


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

  // Load favorites strictly from backend for authenticated users.
  useEffect(() => {
    const loadFavorites = async () => {
      if (!isAuthenticated) {
        setFavoriteFacilityIds([]);
        setFavoriteFacilityDetails([]);
        return;
      }

      try {
        const response = await apiClient.get("/api/auth/favorites");
        if (response.data.success) {
          setFavoriteFacilityIds(
            (response.data.favorites || []).map((id) => String(id)),
          );
          setFavoriteFacilityDetails(
            Array.isArray(response.data.facilityDetails)
              ? response.data.facilityDetails
              : [],
          );
          return;
        }
        setFavoriteFacilityIds([]);
        setFavoriteFacilityDetails([]);
      } catch (error) {
        console.error("Failed to fetch favorites from database", error);
        setFavoriteFacilityIds([]);
        setFavoriteFacilityDetails([]);
      }
    };

    loadFavorites();
  }, [isAuthenticated, userData?._id, userData?.id]);

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
    if (!safeId || !isAuthenticated) return;
    const wasFavorite = favoriteFacilityIds.includes(safeId);

    // Optimistic UI update
    setFavoriteFacilityIds((prev) =>
      prev.includes(safeId)
        ? prev.filter((id) => id !== safeId)
        : [...prev, safeId],
    );
    setFavoriteFacilityDetails((prev) => {
      const existing = Array.isArray(prev) ? prev : [];
      if (wasFavorite) {
        return existing.filter(
          (item) => String(item?.facilityId || item?.id || "") !== safeId,
        );
      }
      if (!facilityData || typeof facilityData !== "object") return existing;
      const alreadyExists = existing.some(
        (item) => String(item?.facilityId || item?.id || "") === safeId,
      );
      if (alreadyExists) return existing;
      return [...existing, { ...facilityData, facilityId: safeId, savedAt: new Date().toISOString() }];
    });

    try {
      const response = await apiClient.post("/api/auth/toggle-favorite", {
        facilityId: safeId,
        facilityData: facilityData || null,
      });
      if (response?.data?.success) {
        setFavoriteFacilityIds((response.data.favorites || []).map((id) => String(id)));
        setFavoriteFacilityDetails(
          Array.isArray(response.data.facilityDetails)
            ? response.data.facilityDetails
            : [],
        );
      }
    } catch (error) {
      console.error("Failed to sync favorite with database", error);
      try {
        const response = await apiClient.get("/api/auth/favorites");
        if (response?.data?.success) {
          setFavoriteFacilityIds((response.data.favorites || []).map((id) => String(id)));
          setFavoriteFacilityDetails(
            Array.isArray(response.data.facilityDetails)
              ? response.data.facilityDetails
              : [],
          );
        }
      } catch {
        // Keep optimistic state if recovery fetch fails.
      }
    }
  };

  const liveFacilities = useMemo(() => {
    if (!Array.isArray(carrieMatches) || carrieMatches.length === 0)
      return null;
    return carrieMatches.map(normalizeFacilityForCard);
  }, [carrieMatches]);

  const baseFacilities = useMemo(() => {
    if (discoverOverrideRows !== undefined) {
      return Array.isArray(discoverOverrideRows) ? discoverOverrideRows : [];
    }
    // Before the first Apply, Carrie may show chat matches (results.js). After Apply, only API/directory.
    if (fromCarrie && liveFacilities?.length && !discoverApplyCompletedRef.current) {
      return liveFacilities;
    }
    if (directoryFacilities.length) return directoryFacilities;
    return [];
  }, [discoverOverrideRows, fromCarrie, liveFacilities, directoryFacilities]);
  const uniqueBaseFacilities = useMemo(
    () => dedupeFacilities(baseFacilities),
    [baseFacilities],
  );
  useEffect(() => {
    if (uniqueBaseFacilities.length > 0) {
      setLastMatchCount(uniqueBaseFacilities.length);
    }
  }, [uniqueBaseFacilities.length]);
  const uniqueBaseFacilitiesForMergeRef = useRef(uniqueBaseFacilities);
  useEffect(() => {
    uniqueBaseFacilitiesForMergeRef.current = uniqueBaseFacilities;
  }, [uniqueBaseFacilities]);

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
    if (discoverApplyCompletedRef.current || hasUserTouchedFiltersRef.current) return;
    const fromFilters = resolveCarrieBudgetRange(carrieFilters);
    const fromMatches = resolveBudgetRangeFromCarrieMatches(carrieMatches);
    const parsedMinBudget = fromFilters.min ?? fromMatches.min;
    const parsedMaxBudget = fromFilters.max ?? fromMatches.max;
    const shouldPrefillBudget = carrieFilters?.skipInitialBudgetPrefill !== true;
    console.log("[CareExplorer] carrieFilters budget:", {
      budgetMinMonthly: carrieFilters.budgetMinMonthly,
      budgetMaxMonthly: carrieFilters.budgetMaxMonthly,
      budgetFromMatches: fromMatches,
      resolvedMin: parsedMinBudget,
      resolvedMax: parsedMaxBudget,
      shouldPrefillBudget,
    });
    const effectiveMaxBudget = shouldPrefillBudget
      ? parsedMaxBudget ?? parsedMinBudget ?? 15000
      : 15000;
    const safeMax = Math.min(15000, Math.max(500, Math.round(effectiveMaxBudget)));
    const effectiveMinBudget = shouldPrefillBudget
      ? parsedMinBudget ?? Math.min(500, safeMax)
      : 1000;
    const safeMin = Math.min(safeMax, Math.max(500, Math.round(effectiveMinBudget)));
    const intakeAmenitySelections = [
      ...(Array.isArray(carrieFilters?.displayCriteria?.mustHaveNeeds)
        ? carrieFilters.displayCriteria.mustHaveNeeds
        : []),
      ...(Array.isArray(carrieFilters?.amenityMustHaves)
        ? carrieFilters.amenityMustHaves
        : []),
      ...(Array.isArray(carrieFilters?.amenities) ? carrieFilters.amenities : []),
    ];
    const mappedAmenitySelections = mapSelectionsToOptions(
      intakeAmenitySelections,
      amenityOptions,
      AMENITY_ALIASES,
    );

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
      selectedAmenities:
        mappedAmenitySelections.length > 0
          ? mappedAmenitySelections
          : initialFilters.selectedAmenities,
      selectedAvailability:
        typeof carrieFilters.availability === "string" &&
          carrieFilters.availability.trim()
          ? [carrieFilters.availability.trim()]
          : initialFilters.selectedAvailability,
      maxMiles: (() => {
        const parsed = resolveCarrieMaxMiles(carrieFilters);
        return parsed != null ? String(parsed) : initialFilters.maxMiles;
      })(),
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
      String(appliedFilters.locationQuery || "").trim(),
      appliedFilters.zipCode,
    );
    if (!query) {
      setLocationCenterCoords(null);
      return;
    }

    // Clear anchor immediately when ZIP/location change so we never filter a fresh discover
    // response against the *previous* geocode (async gap). Otherwise almost every row looks
    // "outside" the new radius and the list collapses to 0–1 facilities until geocode finishes.
    setLocationCenterCoords(null);

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
  }, [appliedFilters.locationQuery, appliedFilters.zipCode, carrieLocationQuery]);

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

  const runDiscoverRequest = useCallback(async (body, options = {}) => {
    const silent =
      typeof options.silent === "boolean" ? options.silent : AUTO_APPLY_FILTERS;
    const signature = buildDiscoverRequestSignature(body);
    const now = Date.now();
    console.log(
      "[CareExplorer] discover request (POST /api/facilities/discover → Caring.com + SilverAssist, not results.js):",
      body,
    );

    const inflight = discoverInflightPromiseBySignatureRef.current.get(signature);
    if (inflight) return inflight;

    const cached = discoverCachedRowsBySignatureRef.current.get(signature);
    if (
      cached &&
      Array.isArray(cached.rows) &&
      now - cached.at < DISCOVER_DUPLICATE_WINDOW_MS
    ) {
      return cached.rows;
    }

    const runId = ++discoverRunIdRef.current;

    if (discoverAbortControllerRef.current) {
      discoverAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    discoverAbortControllerRef.current = controller;

    const promise = (async () => {
      if (!silent) {
        setDiscoverLoading(true);
      }
      try {
        const { data } = await apiClient.post("/api/facilities/discover", body, {
          signal: controller.signal,
        });
        if (runId !== discoverRunIdRef.current) return null;
        const rows = Array.isArray(data?.facilities) ? data.facilities : [];
        console.log("[CareExplorer] discover response:", {
          count: rows.length,
          success: Boolean(data?.success),
        });
        const center = data?.search_center;
        if (
          center &&
          Number.isFinite(Number(center.lat)) &&
          Number.isFinite(Number(center.lng))
        ) {
          setLocationCenterCoords({
            lat: Number(center.lat),
            lng: Number(center.lng),
          });
        }
        const normalized = rows.map(normalizeFacilityForCard);
        discoverCachedRowsBySignatureRef.current.set(signature, {
          at: Date.now(),
          rows: normalized,
        });
        return normalized;
      } catch (err) {
        const cancelled =
          axios.isCancel?.(err) || err?.name === "CanceledError" || err?.code === "ERR_CANCELED";
        if (cancelled || runId !== discoverRunIdRef.current) return null;
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Request failed";
        toast.error("Could not refresh listings", { description: String(msg) });
        return null;
      } finally {
        if (discoverAbortControllerRef.current === controller) {
          discoverAbortControllerRef.current = null;
        }
        discoverInflightPromiseBySignatureRef.current.delete(signature);
        if (runId === discoverRunIdRef.current) {
          if (!silent) {
            setDiscoverLoading(false);
          }
        }
      }
    })();

    discoverInflightPromiseBySignatureRef.current.set(signature, promise);
    return promise;
  }, []);

  // Debounced live discover when filters change (POST /api/facilities/discover — external APIs only).
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
      const rows = await runDiscoverRequest(body);
      if (!Array.isArray(rows)) return;
      if (rows.length === 0) {
        setDiscoverOverrideRows((prev) =>
          Array.isArray(prev) && prev.length > 0 ? prev : [],
        );
        lastDiscoverMaxMilesRef.current = String(filters.maxMiles || "").trim();
        return;
      }
      const nextMaxMiles = Number.parseFloat(String(filters.maxMiles || "").trim());
      const prevMaxMiles = Number.parseFloat(String(lastDiscoverMaxMilesRef.current || "").trim());
      const nextIsFinite = Number.isFinite(nextMaxMiles);
      const prevIsFinite = Number.isFinite(prevMaxMiles);
      const ctxKey = discoverMergeContextKey(body);
      const sameSearchPlace = lastDiscoverMergeContextKeyRef.current === ctxKey;
      // Only merge when the user widens an already-applied radius (e.g. 25→50) for the **same**
      // zip/location. First search with miles must replace — never merge into the public directory.
      const shouldExpand =
        sameSearchPlace &&
        nextIsFinite &&
        prevIsFinite &&
        nextMaxMiles > prevMaxMiles;
      const mergeOutcomeRef = { kind: "replace" };
      setDiscoverOverrideRows((prev) => {
        if (shouldExpand) {
          const previousRows =
            Array.isArray(prev) && prev.length > 0
              ? prev
              : lastDiscoverSnapshotForMergeRef.current.length > 0
                ? lastDiscoverSnapshotForMergeRef.current
                : [];
          if (Array.isArray(previousRows) && previousRows.length > 0) {
            mergeOutcomeRef.kind = "merge";
            const merged = dedupeFacilities([...previousRows, ...rows]);
            lastDiscoverSnapshotForMergeRef.current = merged;
            return merged;
          }
        }
        lastDiscoverSnapshotForMergeRef.current = rows;
        return rows;
      });
      lastDiscoverMergeContextKeyRef.current = ctxKey;
      if (mergeOutcomeRef.kind !== "merge") {
        setPage(1);
      }
      lastDiscoverMaxMilesRef.current = String(filters.maxMiles || "").trim();
    }, 650);

    return () => window.clearTimeout(timer);
  }, [
    ...(AUTO_APPLY_FILTERS ? [] : [filters.budgetMin, filters.budgetMax]),
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
    runDiscoverRequest(body).then((rows) => {
      if (Array.isArray(rows) && rows.length > 0) {
        lastDiscoverSnapshotForMergeRef.current = rows;
        lastDiscoverMergeContextKeyRef.current = discoverMergeContextKey(body);
        setDiscoverOverrideRows(rows);
        lastDiscoverMaxMilesRef.current = String(filters.maxMiles || "").trim();
        setPage(1);
      }
    });
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

    const zipDigits = String(filters.zipCode || "").replace(/\D/g, "").slice(0, 5);
    if (zipDigits.length !== 5) {
      toast.error("Please enter a valid 5-digit ZIP code, then click Apply Filters.");
      return;
    }

    setAppliedFilters(filters);
    setLocationCenterCoords(null);
    setDiscoverOverrideRows([]);
    setDiscoverLoading(true);
    discoverCachedRowsBySignatureRef.current.clear();
    lastDiscoverMergeContextKeyRef.current = "";
    lastDiscoverMaxMilesRef.current = "";

    const body = buildDiscoverRequestBody(filters, {}, "", { sidebarOnly: true });
    body.zip_code = zipDigits;
    if (!String(body.location || "").trim()) {
      body.location = zipDigits;
    }

    const rows = await runDiscoverRequest(body, { silent: false });
    if (!rows) {
      setDiscoverLoading(false);
      return;
    }

    discoverApplyCompletedRef.current = true;
    const appliedCarrieFilters = {
      ...(location.state?.carrieFilters ?? carrieFilters ?? {}),
      searchZipCode: zipDigits,
      searchLocation: String(filters.locationQuery || "").trim() || zipDigits,
      locationQuery: String(filters.locationQuery || "").trim(),
    };
    navigate(
      { pathname: location.pathname, search: location.search },
      {
        replace: true,
        state: {
          fromCarrie: Boolean(fromCarrie),
          carrieFilters: appliedCarrieFilters,
        },
      },
    );

    const ctxKey = discoverMergeContextKey(body);
    const sameSearchPlace = lastDiscoverMergeContextKeyRef.current === ctxKey;
    const nextMaxMiles = Number.parseFloat(String(filters.maxMiles || "").trim());
    const prevMaxMiles = Number.parseFloat(String(appliedFilters.maxMiles || "").trim());
    const nextIsFinite = Number.isFinite(nextMaxMiles);
    const prevIsFinite = Number.isFinite(prevMaxMiles);
    // Widen radius only for the same ZIP/location; a new ZIP always replaces results from the API.
    const shouldExpand =
      sameSearchPlace &&
      nextIsFinite &&
      prevIsFinite &&
      nextMaxMiles > prevMaxMiles;
    if (shouldExpand) {
      const previousRows =
        Array.isArray(discoverOverrideRows) && discoverOverrideRows.length > 0
          ? discoverOverrideRows
          : lastDiscoverSnapshotForMergeRef.current.length > 0
            ? lastDiscoverSnapshotForMergeRef.current
            : [];
      if (Array.isArray(previousRows) && previousRows.length > 0) {
        const merged = dedupeFacilities([...previousRows, ...rows]);
        lastDiscoverSnapshotForMergeRef.current = merged;
        lastDiscoverMergeContextKeyRef.current = ctxKey;
        setDiscoverOverrideRows(merged);
        lastDiscoverMaxMilesRef.current = String(filters.maxMiles || "").trim();
        return;
      }
    }
    lastDiscoverSnapshotForMergeRef.current = rows;
    lastDiscoverMergeContextKeyRef.current = ctxKey;
    setDiscoverOverrideRows(rows);
    lastDiscoverMaxMilesRef.current = String(filters.maxMiles || "").trim();
    setPage(1);
  };

  useEffect(
    () => () => {
      if (discoverAbortControllerRef.current) {
        discoverAbortControllerRef.current.abort();
      }
    },
    [],
  );

  const scopedFacilities = useMemo(() => {
    if (scope !== "saved") return uniqueBaseFacilities;
    const favoriteSet = new Set(favoriteFacilityIds.map((id) => String(id)));
    const savedFromCurrentResults = uniqueBaseFacilities.filter((f) =>
      favoriteSet.has(String(f.key ?? f.facilityId ?? f.name)),
    );
    const savedFromDatabase = (favoriteFacilityDetails || [])
      .filter((item) =>
        favoriteSet.has(String(item?.facilityId || item?.id || item?.name || "")),
      )
      .map(normalizeSavedFacilityDetail);
    return dedupeFacilities([...savedFromDatabase, ...savedFromCurrentResults]);
  }, [scope, uniqueBaseFacilities, favoriteFacilityIds, favoriteFacilityDetails]);

  const filteredFacilities = useMemo(() => {
    if (scope === "saved") return scopedFacilities;
    const q = String(activeFilters.searchQuery || "")
      .trim()
      .toLowerCase();
    const effectiveLocation = buildEffectiveLocationQuery(
      String(activeFilters.locationQuery || "").trim(),
      activeFilters.zipCode,
    )
      .trim()
      .toLowerCase();
    const locationQuery = String(
      activeFilters.locationQuery || carrieLocationQuery || "",
    )
      .trim()
      .toLowerCase();
    const isZipOnlyLocationQuery = /^\d{5}$/.test(locationQuery);
    const maxMilesNum = Number.parseFloat(
      String(activeFilters.maxMiles || "").trim(),
    );
    const budgetMin = Number(filters.budgetMin) || 1000;
    const budgetMax = Number(filters.budgetMax) || 15000;
    const budgetFilterActive = budgetMin !== 1000 || budgetMax < 15000;
    const selectedCare = new Set(
      (activeFilters.selectedCareTypes || []).map((x) => String(x).toLowerCase()),
    );
    const selectedAmenities = (filters.selectedAmenities || []).map((x) =>
      String(x).toLowerCase(),
    );
    const selectedAvailability = new Set(
      (activeFilters.selectedAvailability || []).map((x) => String(x).toLowerCase()),
    );

    const matchesFacility = (facility) => {
      const assistedOnlyLevels = [
        ...(facility.careLevels || []).map((x) => normMatchToken(x)),
        normMatchToken(facility.category),
      ].filter(Boolean);
      const isPartner = isCareMatchPartnerListing(facility);
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
        if (!isCarrieResult && !isPartner) return false;
      }

      // Strict radius: only show communities with a verified distance <= max miles from search center.
      // Partner (admin/CareMatch) listings in the searched ZIP stay visible even without map coords.
      if (!Number.isNaN(maxMilesNum) && maxMilesNum > 0) {
        const partnerInArea = partnerMatchesSearchArea(facility, {
          zipCode: activeFilters.zipCode,
          locationQuery: effectiveLocation || locationQuery,
        });
        if (!locationCenterCoords) {
          if (!partnerInArea) return false;
        } else {
          const milesForGate = computeFacilityMiles(facility, locationCenterCoords);
          if (!Number.isFinite(milesForGate) || milesForGate > maxMilesNum) {
            if (!partnerInArea) return false;
          }
        }
      } else if (effectiveLocation) {
        const partnerInArea = partnerMatchesSearchArea(facility, {
          zipCode: activeFilters.zipCode,
          locationQuery: effectiveLocation || locationQuery,
        });
        if (!partnerInArea && !addressMatchesLocation(facility.address, effectiveLocation)) {
          return false;
        }
      } else if (locationQuery && !isZipOnlyLocationQuery) {
        const partnerInArea = partnerMatchesSearchArea(facility, {
          zipCode: activeFilters.zipCode,
          locationQuery,
        });
        if (!partnerInArea && !addressMatchesLocation(facility.address, locationQuery)) {
          return false;
        }
      }

      if (!ZIP_ONLY_DISCOVERY_MODE && q) {
        const text =
          `${facility.name || ""} ${facility.category || ""} ${facility.address || ""} ${(facility.features || []).join(" ")}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      if (budgetFilterActive) {
        const low = facility.priceMin ?? facility.priceMax;
        const high = facility.priceMax ?? facility.priceMin;
        if (low == null || high == null) {
          if (facilityHasCallForPricingDisplay(facility)) return true;
          return false;
        }
        const overlaps = low <= budgetMax && high >= budgetMin;
        if (!overlaps) return false;
      }

      if (!ZIP_ONLY_DISCOVERY_MODE && selectedCare.size > 0) {
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

      if (!facilityMeetsMustHaveAmenities(facility, selectedAmenities)) {
        return false;
      }

      // Intake / Carrie pass move-in timing into discovery; facility rows rarely use the same
      // labels ("Immediate" vs "Within 30 Days" vs empty). Filtering here zeroes the list.
      if (!ZIP_ONLY_DISCOVERY_MODE && !fromCarrie && selectedAvailability.size > 0) {
        const a = String(facility.availability || "").toLowerCase();
        if (a && !selectedAvailability.has(a)) return false;
      }

      return true;
    };

    return scopedFacilities.filter((f) => matchesFacility(f));
  }, [
    activeFilters,
    filters.budgetMin,
    filters.budgetMax,
    filters.selectedAmenities,
    scopedFacilities,
    scope,
    carrieLocationQuery,
    locationCenterCoords,
    fromCarrie,
  ]);

  const rankedFacilities = useMemo(() => {
    const rankLocationText = buildEffectiveLocationQuery(
      String(activeFilters.locationQuery || "").trim(),
      activeFilters.zipCode,
    )
      .trim()
      .toLowerCase();
    const locationQuery =
      rankLocationText ||
      String(activeFilters.locationQuery || carrieLocationQuery || "")
        .trim()
        .toLowerCase();
    const searchQuery = String(activeFilters.searchQuery || "").trim().toLowerCase();
    const selectedCare = (activeFilters.selectedCareTypes || []).map((x) =>
      String(x).toLowerCase(),
    );
    const selectedAmenities = (filters.selectedAmenities || []).map((x) =>
      String(x).toLowerCase(),
    );
    const selectedAvailability = (activeFilters.selectedAvailability || []).map((x) =>
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
        const pool = buildFacilityAmenitySearchPool(facility);
        const amenityHits = selectedAmenities.filter((want) =>
          amenityPreferenceMatches(pool, want),
        ).length;
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

    const searchZipForRank = String(activeFilters.zipCode || "")
      .replace(/\D/g, "")
      .slice(0, 5);
    const locationQueryForRank = String(
      activeFilters.locationQuery || carrieLocationQuery || "",
    ).trim();

    /** CareMatch / admin facilities in the searched ZIP (or city) always rank above scrapes. */
    const isPriorityPartner = (facility) =>
      partnerMatchesSearchArea(facility, {
        zipCode: searchZipForRank,
        locationQuery: locationQueryForRank,
      });

    return filteredFacilities
      .map((facility) => {
        let computedDistanceMiles = computeFacilityMiles(facility, locationCenterCoords);
        const searchZip = searchZipForRank;
        const facilityZip = String(facility.zipCode || "")
          .replace(/\D/g, "")
          .slice(0, 5);
        // Same ZIP search: missing/bogus coords should read as local, not ~5000 miles to (0,0).
        if (
          searchZip &&
          facilityZip &&
          searchZip === facilityZip &&
          (!Number.isFinite(computedDistanceMiles) || computedDistanceMiles > 50)
        ) {
          computedDistanceMiles = 0;
        }
        return {
          ...facility,
          distanceMiles: Number.isFinite(computedDistanceMiles)
            ? Number(computedDistanceMiles.toFixed(1))
            : facility.distanceMiles ?? null,
          distance: formatDistanceLabel(computedDistanceMiles, facility.zipCode),
          qualityScore: computeOverallQualityScore(facility),
          relevanceScore: getRelevanceScore(facility),
          averagePrice: averageFacilityPrice(facility),
          isPriorityPartner: isPriorityPartner(facility),
        };
      })
      .sort((a, b) => {
        // Always surface our system facilities (admin-added / registered) first when they
        // match the searched ZIP / location — before scrapes and other sort modes.
        if (a.isPriorityPartner !== b.isPriorityPartner) {
          return a.isPriorityPartner ? -1 : 1;
        }

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
          // bestMatch: personalized % is the primary signal (matches card badge), then composite fit.
          const matchDiff =
            (Number(b.matchPercent) || 0) - (Number(a.matchPercent) || 0);
          if (matchDiff !== 0) return matchDiff;
          const scoreDiff = b.relevanceScore - a.relevanceScore;
          if (scoreDiff !== 0) return scoreDiff;
          const qualityDiff = b.qualityScore - a.qualityScore;
          if (qualityDiff !== 0) return qualityDiff;
        }

        const backendDiff = (Number(b.matchPercent) || 0) - (Number(a.matchPercent) || 0);
        if (backendDiff !== 0) return backendDiff;
        return String(a.name || "").localeCompare(String(b.name || ""));
      });
  }, [
    filteredFacilities,
    activeFilters,
    filters.sortBy,
    filters.budgetMin,
    filters.budgetMax,
    filters.selectedAmenities,
    carrieLocationQuery,
    locationCenterCoords,
  ]);

  /** When these change, reset listing pagination. Budget is live-only and omitted so the slider does not jump pages. */
  const listingPagingResetKey = useMemo(() => {
    const a = appliedFilters;
    const care = JSON.stringify([...(a.selectedCareTypes || [])].map(String).sort());
    const avail = JSON.stringify([...(a.selectedAvailability || [])].map(String).sort());
    const parts = [
      String(a.locationQuery || "").trim().toLowerCase(),
      String(a.zipCode || "").trim(),
      String(a.maxMiles || "").trim(),
      String(a.searchQuery || "").trim().toLowerCase(),
      care,
      avail,
    ];
    return parts.join("|");
  }, [
    appliedFilters.locationQuery,
    appliedFilters.zipCode,
    appliedFilters.maxMiles,
    appliedFilters.searchQuery,
    JSON.stringify([...(appliedFilters.selectedCareTypes || [])].map(String).sort()),
    JSON.stringify([...(appliedFilters.selectedAvailability || [])].map(String).sort()),
    ...(AUTO_APPLY_FILTERS ? [] : [appliedFilters.budgetMin, appliedFilters.budgetMax]),
  ]);

  const mustHaveAmenitiesPagingKey = useMemo(
    () => JSON.stringify([...(filters.selectedAmenities || [])].map(String).sort()),
    [filters.selectedAmenities],
  );

  const mapFacilities = useMemo(
    () => (view === "map" ? rankedFacilities : []),
    [view, rankedFacilities],
  );

  const visibleMapFacilities = useMemo(() => {
    if (!Array.isArray(mapFacilities)) return [];
    return mapFacilities;
  }, [mapFacilities]);

  const updateMapCardsNavState = useCallback(() => {
    const el = mapCardsScrollRef.current;
    if (!el) {
      setMapCardsNav({ canLeft: false, canRight: false });
      return;
    }
    const maxScrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
    const canLeft = el.scrollLeft > 4;
    const canRight = el.scrollLeft < maxScrollLeft - 4;
    setMapCardsNav({ canLeft, canRight });
  }, []);

  useEffect(() => {
    if (view !== "map") return;
    const el = mapCardsScrollRef.current;
    if (!el) return;
    const onScroll = () => updateMapCardsNavState();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    updateMapCardsNavState();
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [view, visibleMapFacilities, updateMapCardsNavState]);

  const scrollMapCardsBy = useCallback((direction) => {
    const el = mapCardsScrollRef.current;
    if (!el) return;
    const delta = Math.max(260, Math.floor(el.clientWidth * 0.72));
    el.scrollBy({ left: direction * delta, behavior: "smooth" });
  }, []);

  const pageSize = layout === "grid" ? 16 : 12;
  const matchCountForHeader = rankedFacilities.length;
  const locationLabelForHeader =
    buildEffectiveLocationQuery(
      String(appliedFilters.locationQuery || "").trim(),
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
    filters.selectedAmenities.length > 0
      ? filters.selectedAmenities.slice(0, 2).join(", ")
      : "your selected preferences";
  const hasNonDefaultAvailability =
    appliedFilters.selectedAvailability.length > 0 &&
    !(
      appliedFilters.selectedAvailability.length === 1 &&
      String(appliedFilters.selectedAvailability[0]).trim().toLowerCase() === "within 30 days"
    );
  const promptCriteria = [];
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
  if (filters.selectedAmenities.length > 0) {
    promptCriteria.push({
      label: "Must-Have Needs",
      value: filters.selectedAmenities.join(", "),
    });
  }
  if (hasNonDefaultAvailability) {
    promptCriteria.push({
      label: "Move-In Timeline",
      value: appliedFilters.selectedAvailability.join(", "),
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
  }, [listingPagingResetKey, filters.sortBy, mustHaveAmenitiesPagingKey]);

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

    const withCoords = [...(mapFacilities || [])].filter(
      (f) =>
        Number.isFinite(Number(f?.lat)) &&
        Number.isFinite(Number(f?.lng)),
    );
    const withoutCoords = [...(mapFacilities || [])]
      .filter(
        (f) =>
          (!Number.isFinite(Number(f?.lat)) ||
            !Number.isFinite(Number(f?.lng))) &&
          String(f?.address || "").trim(),
      )
      .slice(0, 40);
    const candidates = [...withCoords, ...withoutCoords];
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
        if (
          Number.isFinite(Number(f?.lat)) &&
          Number.isFinite(Number(f?.lng))
        ) {
          loc = { lat: () => Number(f.lat), lng: () => Number(f.lng) };
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

      if (valid.length === 0) {
        mapInstanceRef.current.setCenter(DEFAULT_MAP_CENTER);
        mapInstanceRef.current.setZoom(11);
        return;
      }

      const bounds = new window.google.maps.LatLngBounds();
      valid.forEach((x) => bounds.extend(x.latLng));
      mapInstanceRef.current.fitBounds(bounds, 60);
    };

    loadMarkers();

    return () => {
      cancelled = true;
    };
  }, [view, mapsReady, mapFacilities, currentCoords, appliedFilters.maxMiles]);

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
          isDiscoverLoading={showResultsLoading}
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
                    {String(appliedFilters.maxMiles || "").trim() && (
                      <>
                        , within{" "}
                        <span className="font-semibold text-[#132329]">
                          {String(appliedFilters.maxMiles).trim()} miles
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
                  discoverInflightPromiseBySignatureRef.current.clear();
                  discoverCachedRowsBySignatureRef.current.clear();
                  lastDiscoverSnapshotForMergeRef.current = [];
                  lastDiscoverMergeContextKeyRef.current = "";
                  carrieBootstrapDiscoverDoneRef.current = false;
                  discoverRunIdRef.current += 1;
                  hasUserTouchedFiltersRef.current = false;
                  setDiscoverLoading(false);
                  setDiscoverOverrideRows(undefined);
                  lastDiscoverMaxMilesRef.current = "";
                  setFilters(initialFilters);
                  setAppliedFilters(initialFilters);
                }}
                careTypeOptions={careTypeOptions}
                amenityOptions={amenityOptions}
                onAskCarrie={handleAskCarrie}
                onApplyFilters={handleApplyFilters}
                isApplying={discoverLoading}
                canApplyFilters={hasPendingFilterChanges}
                hideApplyFiltersButton={AUTO_APPLY_FILTERS}
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
              {showResultsLoading ? (
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
                          {discoverLoading
                            ? discoverThinkingMessages[discoverThinkingIndex]
                            : "Applying your filters and refreshing listings..."}
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
                    imageUrls={f.imageUrls}
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
                    email={f.email}
                    website={f.website}
                    sourcePlatform={f.sourcePlatform}
                    isExternal={Boolean(f.isExternal)}
                    externalSourceUrl={f.externalSourceUrl}
                    description={f.description}
                    careLevels={f.careLevels}
                    amenities={f.amenities}
                    services={f.services}
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

              {!showResultsLoading && listingItems.length === 0 && (
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
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => scrollMapCardsBy(-1)}
                      disabled={!mapCardsNav.canLeft}
                      className="absolute -left-2 sm:-left-3 top-1/2 z-30 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#00CFF4] bg-white text-[#00CFF4] shadow-[0_2px_10px_rgba(15,23,42,0.1)] transition-all hover:scale-105 hover:bg-[#F0FDFF] disabled:cursor-not-allowed disabled:border-[#CBD5E1] disabled:bg-[#F1F5F9] disabled:text-[#94A3B8] disabled:opacity-70"
                      aria-label="Show previous cards"
                    >
                      <ChevronLeft className="h-4 w-4" strokeWidth={2.25} />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollMapCardsBy(1)}
                      disabled={!mapCardsNav.canRight}
                      className="absolute -right-2 sm:-right-3 top-1/2 z-30 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#00CFF4] bg-white text-[#00CFF4] shadow-[0_2px_10px_rgba(15,23,42,0.1)] transition-all hover:scale-105 hover:bg-[#F0FDFF] disabled:cursor-not-allowed disabled:border-[#CBD5E1] disabled:bg-[#F1F5F9] disabled:text-[#94A3B8] disabled:opacity-70"
                      aria-label="Show next cards"
                    >
                      <ChevronRight className="h-4 w-4" strokeWidth={2.25} />
                    </button>
                    <div
                      ref={mapCardsScrollRef}
                      className="flex gap-3 sm:gap-4 overflow-x-auto pt-3 pb-4 snap-x scrollbar-hide"
                    >
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
                          imageUrls={f.imageUrls}
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
                          email={f.email}
                          website={f.website}
                          sourcePlatform={f.sourcePlatform}
                          isExternal={Boolean(f.isExternal)}
                          externalSourceUrl={f.externalSourceUrl}
                          description={f.description}
                          careLevels={f.careLevels}
                          amenities={f.amenities}
                          services={f.services}
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
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CareExplorer;
