/**
 * Maps Carrie intake preferences → getCareMatchResults payload,
 * and OpenAI discovery rows → the same facility row shape used by rankFacilities / Care Explorer.
 */

/** @param {string} text */
function extractZipFromText(text) {
  const m = String(text || "").match(/\b(\d{5})(?:-\d{4})?\b/);
  return m ? m[1] : "";
}

/** Rough ZIP–region sanity: avoids MA zips (e.g. 02026) when the user asked for San Francisco. */
function reconcileZipWithLocation(zip, location) {
  const z = String(zip || "").replace(/\D/g, "").slice(0, 5);
  const loc = String(location || "").toLowerCase();
  if (!z || z.length !== 5) return z;

  const isSf =
    /\bsan francisco\b/.test(loc) ||
    /\bsf\b/.test(loc) ||
    /\bay area\b/.test(loc);
  if (isSf && !/^94/.test(z)) {
    return "94102";
  }

  const isBoston =
    /\bboston\b/.test(loc) ||
    /\bcambridge\s*,\s*ma\b/.test(loc) ||
    /\b(somerville|brookline|newton|quincy)\s*,\s*ma\b/.test(loc);
  if (isBoston && /^94/.test(z)) {
    return "02108";
  }

  return z;
}

function deriveServicesFromAmenities(amenities) {
  const text = (Array.isArray(amenities) ? amenities : [])
    .map((x) => String(x).toLowerCase())
    .join(" | ");
  const services = [];
  if (/\bhospice\b/.test(text)) services.push("hospice care");
  if (/\bphysical therapy|therapy\b/.test(text)) services.push("physical therapy");
  if (/\boccupational therapy\b/.test(text)) services.push("occupational therapy");
  if (/\bmeal|dining|nutrition\b/.test(text)) services.push("meals and dining");
  if (/\bactivit|social|engagement\b/.test(text)) services.push("activities and social engagement");
  if (/\bskilled nursing|snf\b/.test(text)) services.push("skilled nursing");
  return [...new Set(services)];
}

function toPositiveNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function buildDiscoveryKeywords(prefs, amenities) {
  const keywords = [];
  const notes = String(prefs?.personalityNotes || "").trim();
  if (notes) keywords.push(notes);

  const amenityText = (Array.isArray(amenities) ? amenities : [])
    .map((x) => String(x || "").toLowerCase())
    .join(" | ");

  if (/\bmeal|dining|nutrition\b/.test(amenityText)) keywords.push("meals and dining");
  if (/\bactivit|social|engagement\b/.test(amenityText)) keywords.push("activities and social engagement");
  if (/\bwheelchair|accessible|ada\b/.test(amenityText)) {
    keywords.push("wheelchair-accessible entrance and parking");
  }
  if (/\bprivate room|room type|suite|semi-private\b/.test(amenityText)) {
    keywords.push("room types and private rooms");
  }
  if (/\bsafety|safe|secure|staff|qualified|licensed\b/.test(amenityText)) {
    keywords.push("strong safety standards and qualified staff");
  }
  if (/\breview|rating|highly rated\b/.test(amenityText)) keywords.push("highly rated communities with strong reviews");
  if (/\bmodern|amenit/.test(amenityText)) keywords.push("modern amenities");

  return [...new Set(keywords)].filter(Boolean);
}

/** @param {Record<string, unknown>|null|undefined} prefs */
export function intakePreferencesToAiSearchParams(prefs) {
  if (!prefs || typeof prefs !== "object") return null;

  let zip = String(prefs.searchZipCode || "").trim();
  if (!zip) zip = extractZipFromText(prefs.searchLocation);

  let locationRaw = String(prefs.searchLocation || "").trim();
  zip = reconcileZipWithLocation(zip, locationRaw);
  locationRaw = sanitizeLocationForZip(locationRaw, zip);

  const careFromLevels = Array.isArray(prefs.careLevels)
    ? prefs.careLevels.map((x) => String(x).trim()).filter(Boolean)
    : [];
  const primary = prefs.primaryCareType ? String(prefs.primaryCareType).trim() : "";
  const care_levels =
    careFromLevels.length > 0 ? careFromLevels : primary ? [primary] : ["assisted living"];

  const amenities = Array.isArray(prefs.amenityMustHaves)
    ? prefs.amenityMustHaves.map((x) => String(x).trim()).filter(Boolean)
    : [];

  const services = deriveServicesFromAmenities(amenities);
  const budgetMin = toPositiveNumber(prefs.budgetMinMonthly ?? prefs.budgetMin ?? prefs.budget_min);
  const budgetMax = toPositiveNumber(prefs.budgetMaxMonthly ?? prefs.budgetMax ?? prefs.budget_max);
  const maxDistanceMiles = toPositiveNumber(prefs.maxDistanceMiles ?? prefs.max_distance_miles);
  const keywords = buildDiscoveryKeywords(prefs, amenities);

  // Allow city/state-only discovery when ZIP is unknown.
  // `results.js` accepts either zip_code or location.
  if (!locationRaw) return null;

  const payload = {
    zip_code: zip || locationRaw,
    location: locationRaw,
    care_levels,
    amenities,
    services,
  };

  if (budgetMin != null && budgetMax != null && budgetMax >= budgetMin) {
    payload.budget_min = budgetMin;
    payload.budget_max = budgetMax;
  } else if (budgetMax != null) {
    payload.budget_max = budgetMax;
  }

  if (maxDistanceMiles != null) {
    payload.max_distance_miles = maxDistanceMiles;
  }

  if (keywords.length > 0) {
    payload.keywords = keywords;
  }

  return payload;
}

import {
  isAggregatorListingUrl,
  resolveOperatorWebsite,
} from "../utils/isAggregatorListingUrl.js";
import { CITY_DEFAULT_STATE } from "../scripts/usCityDefaultState.js";
import { stateFromUsZip } from "../scripts/usZipState.js";

/** Prefer ZIP state over conflicting city names like Everett+80220. */
function sanitizeLocationForZip(location, zip) {
  const z = String(zip || "").replace(/\D/g, "").slice(0, 5);
  const loc = String(location || "").trim();
  const zipState = z.length === 5 ? stateFromUsZip(z) : "";
  if (!zipState) return loc || z;

  const cityToken = loc
    .split(",")[0]
    ?.replace(/\b\d{5}(?:-\d{4})?\b/g, "")
    .trim()
    .toLowerCase()
    .split(/\s+/)[0];
  const cityState =
    cityToken && CITY_DEFAULT_STATE.has(cityToken)
      ? CITY_DEFAULT_STATE.get(cityToken)
      : "";

  if (cityState && cityState !== zipState) {
    return `${zipState} ${z}`;
  }
  if (!loc) return `${zipState} ${z}`;
  if (!new RegExp(`\\b${zipState}\\b`, "i").test(loc)) {
    const cityPart = loc.replace(/\b\d{5}(?:-\d{4})?\b/g, "").replace(/,\s*$/, "").trim();
    return cityPart ? `${cityPart}, ${zipState}` : `${zipState} ${z}`;
  }
  return loc;
}

/**
 * @param {object} f - one facility object from getCareMatchResults().results
 * @param {number} index
 */
export function mapAiDiscoveryFacilityToMatchRow(f, index) {
  const loc = f && typeof f.location === "object" && f.location ? f.location : {};
  const gp = f && typeof f.google_places === "object" && f.google_places ? f.google_places : {};
  const rev = f && typeof f.review === "object" && f.review ? f.review : {};

  const address =
    String(loc.full_address || "").trim() ||
    [loc.city, loc.county, loc.state, loc.zip_code].filter(Boolean).join(", ");

  const slug = String(f.name || "community")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const placeId = String(gp.place_id || "").trim();
  const facilityId = placeId ? `ai-${placeId}` : `ai-${slug || "facility"}-${index}`;

  const lat = gp.latitude ?? f.latitude;
  const lng = gp.longitude ?? f.longitude;
  const rating = rev.rating ?? gp.total_score;
  const reviewCount = rev.count ?? gp.review_count;

  const external_data = {
    provider_url: f.provider_url || "",
    phone_number: f.phone || "",
    phone: f.phone || "",
    zip_code: loc.zip_code || "",
    budget:
      f && typeof f.budget === "object" && f.budget
        ? {
          min_monthly: f.budget.min_monthly ?? null,
          max_monthly: f.budget.max_monthly ?? null,
          currency: f.budget.currency || "USD",
        }
        : null,
    google_places: {
      place_id: gp.place_id || "",
      maps_url: gp.maps_url || f.maps_url || "",
      website: gp.website || "",
      latitude: lat,
      longitude: lng,
      review_count: reviewCount,
      total_score: gp.total_score ?? rating,
    },
    overall_rating: rating != null ? Number(rating) : null,
    pricing: f.pricing || "",
  };

  const scoreBase = rating != null && !Number.isNaN(Number(rating)) ? Number(rating) / 5 : 0.82;
  const score = Math.min(100, Math.round(scoreBase * 100));

  const reasons = [];
  if (rev.summary) reasons.push(String(rev.summary).trim());
  if (f.pricing) reasons.push(String(f.pricing).trim());
  if (!reasons.length) reasons.push("AI-suggested community — verify details before touring.");

  const providerUrl = String(f.provider_url || "").trim();
  const operatorWebsite = resolveOperatorWebsite(
    f.website,
    gp.website,
    f.maps_url,
  );
  const listingUrl =
    providerUrl ||
    (isAggregatorListingUrl(f.website) ? String(f.website || "").trim() : "");

  const rawEmail = String(f.email || "").trim().toLowerCase();
  // Never expose synthetic scrape placeholders in discover payloads.
  const email = /@external\.carematch\.local$/i.test(rawEmail) ? "" : rawEmail;

  return {
    facilityId,
    name: f.name || "Community",
    address: address || "Address on file",
    pricing: String(f.pricing || "").trim(),
    budget:
      f && typeof f.budget === "object" && f.budget
        ? {
          min_monthly: f.budget.min_monthly ?? null,
          max_monthly: f.budget.max_monthly ?? null,
          currency: f.budget.currency || "USD",
        }
        : null,
    care_levels: Array.isArray(f.care_levels) ? f.care_levels : [],
    images: Array.isArray(f.images) ? f.images : [],
    website: operatorWebsite,
    phone: f.phone || "",
    email,
    zip_code: loc.zip_code || "",
    specialty: [],
    description: String(f.description || "").trim(),
    source_platform: "AI Discovery",
    is_external: true,
    amenities: Array.isArray(f.amenities) ? f.amenities : [],
    services: Array.isArray(f.services) ? f.services : [],
    external_data,
    external_source_url: listingUrl,
    latitude: lat,
    longitude: lng,
    score,
    reasons,
    criteriaMatched: 0,
    criteriaTotal: 0,
  };
}

/**
 * Markdown block for Carrie chat when using AI discovery rows (same vibe as rule-based formatter).
 * @param {object[]} rows - rows from mapAiDiscoveryFacilityToMatchRow
 * @param {number} [limit]
 */
export function formatAiDiscoveryMatchesForChat(rows, limit = 6) {
  const list = Array.isArray(rows) ? rows.slice(0, limit) : [];
  if (list.length === 0) {
    return "\n\n---\n**Your matches**\nNo AI suggestions returned. Try again or adjust location/ZIP.\n";
  }
  const lines = [
    "",
    "---",
    "**Your matches (AI discovery)**",
    "These are model-generated starting points for research — always verify on a tour and with licensing sources.",
  ];
  list.forEach((r, i) => {
    lines.push(`\n**${i + 1}. ${r.name}** — score **${r.score}/100**`);
    if (Array.isArray(r.reasons) && r.reasons.length) {
      lines.push(r.reasons.map((x) => `  ${x}`).join("\n"));
    }
    if (r.address) lines.push(`  _${r.address}_`);
    if (r.pricing) lines.push(`  _Pricing (estimate): ${r.pricing}_`);
    if (r.website) lines.push(`  _Website: ${r.website}_`);
  });
  lines.push(
    "\n_Next step: open the dashboard to compare communities, then schedule tours and confirm true monthly cost._"
  );
  return lines.join("\n");
}
