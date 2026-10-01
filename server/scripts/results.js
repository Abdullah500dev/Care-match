/**
 * Care match search helper — OpenAI Responses API.
 * Call `getCareMatchResults(searchParams)` with:
 * { zip_code, location, amenities?, services?, care_levels }
 *
 * Env: OPENAI_API_KEY (required), OPENAI_MODEL (default: gpt-5.4)
 * `.env` next to this file is loaded via dotenv (does not override existing env vars).
 */

import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { CITY_DEFAULT_STATE, inferStateFromCityHint } from "./usCityDefaultState.js";
import { stateFromUsZip, zipCompatibleWithSearch } from "./usZipState.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Load server-level `.env`; does not override variables already set in the environment. */
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.4";

/** When the model drifts to another metro, keep at least this many after geo filter before skipping retry. */
const MIN_GEO_FILTERED = 5;
/** Allow practical partial result sets instead of hard-failing on low count. */
const MIN_ACCEPTABLE_RESULTS = 1;
const MAX_RESULTS = 20;

/** Block obvious placeholder / demo hosts (post-sanitize + prompt forbid). */
const DISALLOWED_URL_HOST =
  /example\.com|example\.org|example\.net|placeholder|picsum\.photos|via\.placeholder|dummyimage|placehold\.co|loremflickr|fakeimg|test\.com|satisfied|localhost/i;
const GOOGLE_MAPS_PLACES_API_KEY = String(
  process.env.GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    ""
).trim();
const DISCOVERY_IMAGE_DEBUG = process.env.CAREMATCH_DISCOVERY_IMAGE_DEBUG === "1";
const DISCOVERY_CALL_DEBUG = process.env.CAREMATCH_DISCOVERY_CALL_DEBUG === "1";
const DISCOVERY_ENABLE_GEO_RETRY = process.env.CAREMATCH_DISCOVERY_ENABLE_GEO_RETRY === "1";

const MANUAL_TIMELINE_TO_KEYWORDS = {
  immediately: "Immediate move-in preferred",
  within30: "Needs move-in within 30 days",
  within60: "Planning within 60 days",
  noRush: "Planning ahead for future care",
};
const MANUAL_LEVEL_TO_CARE_LEVEL = {
  assisted: "assisted living",
  independent: "independent living",
  memory: "memory care",
  snf: "skilled nursing",
};
const MANUAL_CARE_TO_AMENITY = {
  dailyActivities: "24/7 Care",
  memoryCare: "Memory Care",
  medication: "Medication Management",
  mobilityAssist: "Mobility Assistance",
  medicalMonitoring: "Medical Monitoring",
  socialEngagement: "Social Engagement",
};
const MANUAL_SPECIAL_NEED_TO_AMENITY = {
  privateRoom: "Private Rooms",
  petFriendly: "Pet Friendly",
  couples: "Couples Accommodation",
  cultural: "Cultural or Language-specific Care",
  faithBased: "Faith-based Community",
  lgbtq: "LGBTQ+ Welcoming",
  diabetes: "Diabetes Management",
  physicalTherapy: "Physical Therapy",
  hospice: "Hospice Care",
  respiratory: "Respiratory Support",
  dialysis: "Dialysis Access Nearby",
};

const discoveryInFlight = new Map();

const FACILITY_SHAPE = `Each facility object MUST include these keys (exact spelling):
- care_levels: string[]
- name: string
- email: string (realistic community contact; may be info@ the same domain as website when unknown)
- phone: string (E.164 or readable US format)
- website: string (https URL — MUST be the operator’s real public homepage domain you verified via web search; NEVER example.com or other placeholders)
- description: string (2–4 sentences)
- services: string[] (include requested services where plausible)
- amenities: string[] (include requested amenities where plausible)
- budget: { min_monthly: number, max_monthly: number, currency: "USD" }
- pricing: string (short note)
- images: string[] (0 to 3 items ONLY — each MUST be a direct https URL to a real image file on the same registrable domain as website, or on a major operator CDN clearly tied to that brand; use [] if you cannot verify real image URLs — NEVER invent or use stock/demo hosts)
- location: { full_address, city, county, state, zip_code, country: "US" }
- provider_url: string (https URL — same entity as website or a reputable government/registry link from web search; no placeholders)
- google_places: { place_id, maps_url, latitude, longitude, review_count, total_score }
- maps_url: string
- latitude: number
- longitude: number
- review: { rating: number, count: number, summary: string }`;

function validatePayload(body) {
  if (!body || typeof body !== "object") return "Body must be a JSON object.";
  const { zip_code, location, care_levels } = body;
  const hasZip = typeof zip_code === "string" && zip_code.trim().length > 0;
  const hasLocation = typeof location === "string" && location.trim().length > 0;
  if (!hasZip && !hasLocation) return "Either zip_code or location is required.";
  if (!Array.isArray(care_levels) || care_levels.length === 0)
    return "care_levels is required (non-empty string array).";
  if (body.amenities != null && !Array.isArray(body.amenities)) return "amenities must be an array of strings if provided.";
  if (body.services != null && !Array.isArray(body.services)) return "services must be an array of strings if provided.";
  if (body.keywords != null && !Array.isArray(body.keywords)) return "keywords must be an array of strings if provided.";
  return null;
}

/** @param {{ zip_code: string, location: string, care_levels: unknown[], amenities: unknown[], services: unknown[] }} payload */
export function parseGeoAnchorFromPayload(payload) {
  const zip = String(payload.zip_code || "").replace(/\D/g, "").slice(0, 5);
  let location = String(payload.location || "").trim();
  const parts = location.split(",").map((p) => p.trim()).filter(Boolean);
  let stateAbbr = null;
  let cityHint = "";

  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    // "CO" OR "CO 80220" OR "Colorado"
    const stateToken =
      last.match(/^([A-Za-z]{2})(?:\s+\d{5}(?:-\d{4})?)?$/)?.[1] ||
      last.match(/\b([A-Za-z]{2})\b/)?.[1] ||
      "";
    if (stateToken && /^[A-Za-z]{2}$/.test(stateToken)) {
      stateAbbr = stateToken.toUpperCase();
      cityHint = parts
        .slice(0, -1)
        .join(" ")
        .toLowerCase()
        .replace(/\b\d{5}(?:-\d{4})?\b/g, "")
        .replace(/\s+/g, " ")
        .trim();
    }
  }

  if (!cityHint) {
    cityHint = String(location || "")
      .toLowerCase()
      .replace(/\b\d{5}(?:-\d{4})?\b/g, "")
      .replace(/\b[a-z]{2}\b/g, (m) =>
        ["co", "wa", "ca", "ny", "tx", "fl", "az", "or", "nv", "ut", "nm", "id"].includes(m)
          ? ""
          : m,
      )
      .replace(/[,\s]+/g, " ")
      .trim();
  }

  const zipState = zip.length === 5 ? stateFromUsZip(zip) : "";
  const cityKey = cityHint.split(/\s+/)[0]?.trim().toLowerCase() || "";
  const cityDefaultState =
    cityKey && CITY_DEFAULT_STATE.has(cityKey) ? CITY_DEFAULT_STATE.get(cityKey) : "";

  // ZIP is authoritative. Never let "Everett" imply WA when ZIP is Colorado.
  if (zipState) {
    stateAbbr = zipState;
    const cityConflictsWithZip =
      Boolean(cityDefaultState) && cityDefaultState !== zipState;
    // Drop city when it defaults to another state (Everett→WA with ZIP 80220).
    if (cityConflictsWithZip) {
      cityHint = "";
      location = `${zipState} ${zip}`;
    } else if (cityHint) {
      location = `${cityHint.replace(/\b(co|wa|ca|ny|tx|fl|az|or|nv|ut)\b/gi, "").trim()}, ${zipState} ${zip}`
        .replace(/\s+/g, " ")
        .replace(/^,\s*|,\s*$/g, "")
        .replace(/\s+,/g, ",")
        .trim();
    } else {
      location = location.includes(zip) ? location : `${zipState} ${zip}`;
    }
  } else if (!stateAbbr) {
    const fromCity = inferStateFromCityHint(cityHint);
    if (fromCity) stateAbbr = fromCity;
    else if (cityDefaultState) stateAbbr = cityDefaultState;
  }

  return { zip, location, stateAbbr, cityHint };
}

/** Remove placeholder / fake URLs so the UI never shows example.com. */
function sanitizeDiscoveryResults(results) {
  if (!Array.isArray(results)) return;
  const isAllowedImageUrl = (url) => {
    const u = String(url || "").trim();
    if (!u) return false;
    if (/^https:\/\//i.test(u) && !DISALLOWED_URL_HOST.test(u)) return true;
    if (/^\/api\/facilities\/google-place-photo\?/i.test(u)) return true;
    return false;
  };
  for (const f of results) {
    if (f && typeof f.website === "string" && DISALLOWED_URL_HOST.test(f.website)) {
      f.website = "";
    }
    if (f && typeof f.provider_url === "string" && DISALLOWED_URL_HOST.test(f.provider_url)) {
      f.provider_url = typeof f.website === "string" ? f.website : "";
    }
    if (f && Array.isArray(f.images)) {
      f.images = f.images
        .filter((u) => typeof u === "string" && isAllowedImageUrl(u))
        .slice(0, 3);
    }
  }
}

async function fetchPlacePhotoUrls(placeId, apiKey) {
  const safePlaceId = String(placeId || "").trim();
  if (!safePlaceId || !apiKey) return [];

  try {
    const detailsUrl =
      `https://maps.googleapis.com/maps/api/place/details/json?` +
      `place_id=${encodeURIComponent(safePlaceId)}&fields=photos&key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(detailsUrl);
    if (!response.ok) return [];
    const data = await response.json().catch(() => ({}));
    if (DISCOVERY_IMAGE_DEBUG) {
      console.log(
        `[discovery:image] place/details place_id=${safePlaceId} status=${data?.status || "unknown"}`
      );
    }
    if (data?.status !== "OK" || !Array.isArray(data?.result?.photos)) return [];

    const refs = data.result.photos
      .map((p) => String(p?.photo_reference || "").trim())
      .filter(Boolean)
      .slice(0, 3);
    if (refs.length === 0) return [];

    return buildGooglePhotoUrlsFromRefs(refs);
  } catch {
    if (DISCOVERY_IMAGE_DEBUG) {
      console.log(`[discovery:image] place/details place_id=${safePlaceId} failed`);
    }
    return [];
  }
}

async function findPlaceCandidateByText(result, apiKey) {
  if (!result || typeof result !== "object" || !apiKey) return null;
  const name = String(result.name || "").trim();
  const address = String(result?.location?.full_address || "").trim();
  const query = [name, address].filter(Boolean).join(", ").trim();
  if (!query) return null;

  const gp = result && typeof result.google_places === "object" && result.google_places
    ? result.google_places
    : {};
  const lat = Number(gp.latitude ?? result.latitude);
  const lng = Number(gp.longitude ?? result.longitude);
  const locationBias =
    Number.isFinite(lat) && Number.isFinite(lng)
      ? `&locationbias=point:${lat},${lng}`
      : "";

  try {
    const url =
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?` +
      `input=${encodeURIComponent(query)}` +
      `&inputtype=textquery` +
      `&fields=place_id,photos` +
      `${locationBias}` +
      `&key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json().catch(() => ({}));
    if (DISCOVERY_IMAGE_DEBUG) {
      console.log(
        `[discovery:image] findplace query="${query.slice(0, 80)}" status=${data?.status || "unknown"} candidates=${Array.isArray(data?.candidates) ? data.candidates.length : 0}`
      );
    }
    if (data?.status !== "OK" || !Array.isArray(data?.candidates) || data.candidates.length === 0) {
      return null;
    }
    return data.candidates[0] || null;
  } catch {
    if (DISCOVERY_IMAGE_DEBUG) {
      console.log(`[discovery:image] findplace failed query="${query.slice(0, 80)}"`);
    }
    return null;
  }
}

function buildGooglePhotoUrlsFromRefs(refs) {
  const list = Array.isArray(refs) ? refs : [];
  return list
    .map((r) => String(r || "").trim())
    .filter(Boolean)
    .slice(0, 3)
    .map(
      (ref) =>
        `/api/facilities/google-place-photo?photo_reference=${encodeURIComponent(ref)}&maxwidth=1200`
    );
}

async function enrichDiscoveryResultsWithRealPlacePhotos(results, stats = null) {
  if (!Array.isArray(results) || results.length === 0 || !GOOGLE_MAPS_PLACES_API_KEY) return;

  const needsPhoto = results.filter((f) => {
    if (!f || typeof f !== "object") return false;
    const images = Array.isArray(f.images) ? f.images : [];
    const hasProxyImage = images.some((u) =>
      /^\/api\/facilities\/google-place-photo\?/i.test(String(u || "").trim())
    );
    // Keep trying when images are missing or only non-proxy links.
    // This makes image delivery more reliable in the browser.
    return !hasProxyImage;
  });

  if (needsPhoto.length === 0) return;
  if (DISCOVERY_IMAGE_DEBUG) {
    console.log(
      `[discovery:image] start enrich total=${results.length} missing_images=${needsPhoto.length}`
    );
  }

  await Promise.all(
    needsPhoto.map(async (f) => {
      const facilityName = String(f?.name || "Unknown").trim();
      const gp = f && typeof f.google_places === "object" && f.google_places ? f.google_places : {};
      if (DISCOVERY_IMAGE_DEBUG) {
        console.log(
          `[discovery:image] facility="${facilityName}" initial_place_id=${String(gp.place_id || "").trim() || "none"}`
        );
      }
      if (stats && String(gp.place_id || "").trim()) stats.googlePlaceDetailsCalls += 1;
      let photoUrls = await fetchPlacePhotoUrls(gp.place_id, GOOGLE_MAPS_PLACES_API_KEY);
      if (photoUrls.length > 0) {
        f.images = photoUrls;
        if (DISCOVERY_IMAGE_DEBUG) {
          console.log(
            `[discovery:image] facility="${facilityName}" source=place_details photos=${photoUrls.length}`
          );
        }
        return;
      }

      if (stats) stats.googleFindPlaceCalls += 1;
      const candidate = await findPlaceCandidateByText(f, GOOGLE_MAPS_PLACES_API_KEY);
      if (!candidate) {
        if (DISCOVERY_IMAGE_DEBUG) {
          console.log(`[discovery:image] facility="${facilityName}" no_findplace_candidate`);
        }
        return;
      }

      if (candidate.place_id) {
        f.google_places = {
          ...(f.google_places && typeof f.google_places === "object" ? f.google_places : {}),
          place_id: candidate.place_id,
        };
      }

      const candidateRefs = Array.isArray(candidate.photos)
        ? candidate.photos
          .map((p) => String(p?.photo_reference || "").trim())
          .filter(Boolean)
        : [];
      photoUrls = buildGooglePhotoUrlsFromRefs(candidateRefs);

      if (photoUrls.length === 0 && candidate.place_id) {
        if (stats) stats.googlePlaceDetailsCalls += 1;
        photoUrls = await fetchPlacePhotoUrls(candidate.place_id, GOOGLE_MAPS_PLACES_API_KEY);
      }

      if (photoUrls.length > 0) {
        f.images = photoUrls;
        if (DISCOVERY_IMAGE_DEBUG) {
          console.log(
            `[discovery:image] facility="${facilityName}" source=findplace photos=${photoUrls.length}`
          );
        }
      } else if (DISCOVERY_IMAGE_DEBUG) {
        console.log(`[discovery:image] facility="${facilityName}" no_photos_resolved`);
      }
    })
  );

  if (DISCOVERY_IMAGE_DEBUG) {
    const withImages = results.filter((r) => Array.isArray(r?.images) && r.images.length > 0).length;
    console.log(
      `[discovery:image] done enrich with_images=${withImages}/${results.length}`
    );
  }
}

function facilityLocationBlob(f) {
  const loc = f && typeof f.location === "object" && f.location ? f.location : {};
  const gp = f && typeof f.google_places === "object" && f.google_places ? f.google_places : {};
  return [
    loc.full_address,
    loc.city,
    loc.county,
    loc.state,
    loc.zip_code,
    f.maps_url,
    gp.maps_url,
  ]
    .map((x) => String(x || "").toLowerCase())
    .join(" | ");
}

/**
 * Drop rows that are clearly outside the user’s anchor (common model failure mode).
 * @param {object[]} results
 * @param {{ zip: string, location: string, stateAbbr: string|null, cityHint: string }} anchor
 */
export function filterDiscoveryResultsByAnchor(results, anchor) {
  if (!Array.isArray(results)) return [];

  const anchorZip = String(anchor.zip || "").replace(/\D/g, "").slice(0, 5);
  const hint = String(anchor.cityHint || "").toLowerCase().trim();
  const wantState = anchor.stateAbbr ? String(anchor.stateAbbr).toUpperCase() : "";

  return results.filter((f) => {
    const loc = f && typeof f.location === "object" && f.location ? f.location : {};
    const blob = facilityLocationBlob(f);
    const rowState = String(loc.state || "").trim().toUpperCase();
    let rowZip = String(loc.zip_code || "").replace(/\D/g, "").slice(0, 5);
    if (!rowZip) {
      const m = blob.match(/\b(\d{5})(?:-\d{4})?\b/);
      if (m) rowZip = m[1];
    }

    // ZIP/state gate first — never keep Everett WA for a Colorado ZIP.
    if (!zipCompatibleWithSearch(anchorZip, rowZip, rowState)) return false;
    if (wantState && rowState.length === 2 && rowState !== wantState) return false;
    // Infer state from blob when row.state is missing (e.g. ", WA 98201").
    if (wantState && !rowState) {
      const blobState = blob.match(/,\s*([a-z]{2})\s+\d{5}/i)?.[1]?.toUpperCase();
      if (blobState && blobState !== wantState) return false;
    }

    if (wantState === "CA" && /,\s*ma\b|, massachusetts\b|\bdedham\b|\bbrookline\b|\bcambridge,\s*ma\b/.test(blob)) {
      if (!hint || !blob.includes(hint)) return false;
    }
    if (wantState === "MA" && /,\s*ca\b|, california\b|\bsan francisco\b/.test(blob)) {
      if (!hint || !blob.includes(hint)) return false;
    }

    if (hint.length >= 3 && blob.includes(hint)) {
      return true;
    }

    if (anchorZip.length === 5) {
      if (rowZip.length === 5) {
        if (rowZip.slice(0, 2) !== anchorZip.slice(0, 2)) return false;
        if (wantState && rowState.length === 2 && rowState !== wantState) return false;
        return true;
      }
      // No facility ZIP: require same-state signal in the address blob.
      if (wantState && !new RegExp(`\\b${wantState.toLowerCase()}\\b`).test(blob)) {
        return false;
      }
      return blob.includes(anchorZip) || Boolean(wantState);
    }

    return false;
  });
}

function buildPrompt(payload) {
  const anchor = parseGeoAnchorFromPayload(payload);
  const anchorNote = anchor.stateAbbr
    ? `Anchor U.S. state: ${anchor.stateAbbr}. Anchor ZIP (reference only): ${anchor.zip}. Include nearby towns/suburbs within the requested radius, but keep everything in the same state/region.`
    : `Anchor ZIP (reference only): ${anchor.zip}. Include nearby towns/suburbs within the requested radius.`;

  const acc =
    Array.isArray(payload.amenities) && payload.amenities.length
      ? `Accessibility / amenity priorities (reflect honestly in amenities + description; rank higher when clearly supported): ${JSON.stringify(payload.amenities)}`
      : "";

  const budgetMin = Number(payload.budget_min);
  const budgetMax = Number(payload.budget_max);
  const budgetLine =
    Number.isFinite(budgetMin) &&
    Number.isFinite(budgetMax) &&
    budgetMin > 0 &&
    budgetMax >= budgetMin
      ? `Monthly budget (prefer estimated monthly fees within or close to this range when plausible): $${Math.round(budgetMin)}–$${Math.round(budgetMax)} USD per month.\n`
      : "";
  const maxDistanceMiles = Number(payload.max_distance_miles);
  const distanceLine =
    Number.isFinite(maxDistanceMiles) && maxDistanceMiles > 0
      ? `Distance constraint: include communities within ${Math.round(maxDistanceMiles)} miles of the requested location/ZIP. Always keep the closest matches and then expand outward; do not swap out closer results when the radius increases.\n`
      : "";
  const keywords = Array.isArray(payload.keywords)
    ? payload.keywords.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  const keywordLine = keywords.length
    ? `Lifestyle / fit preferences to reflect in ranking, amenities, services, or description when supported: ${JSON.stringify(keywords)}\n`
    : "";

  return `You output only compact JSON. Never use markdown code fences.

Search for senior care / assisted living style facilities matching:

- zip_code: ${JSON.stringify(payload.zip_code)}
- location (city, state, OR county — treat as the ONLY geographic anchor): ${JSON.stringify(payload.location)}
- care_levels: ${JSON.stringify(payload.care_levels)}
- amenities (prefer facilities that mention or plausibly offer these): ${JSON.stringify(payload.amenities || [])}
- services (prefer facilities that mention or plausibly offer these): ${JSON.stringify(payload.services || [])}

${anchorNote}
${budgetLine}${distanceLine}${keywordLine}${acc ? `${acc}\n` : ""}

WEB SEARCH (REQUIRED FOR THIS TASK):
- You have access to the web_search tool. Use it to find each community’s **real** official website and, when possible, **direct https image URLs** from that site (or the same operator domain).
- Do NOT fabricate URLs. If you cannot verify a homepage, omit website (empty string) and use images: [] rather than guessing.
- Forbidden patterns (never output): example.com, example.org, via.placeholder, picsum.photos, placehold.co, loremflickr, dummyimage, localhost, or any obvious template host.

GEOGRAPHY (NON-NEGOTIABLE):
- Every facility MUST be in the same U.S. state and metro area implied by the location + zip_code above.
- location.state MUST match that state (e.g. California → "CA"). Do NOT output communities in Massachusetts, Texas, Illinois, etc. unless the anchor location is clearly in that state.
- Do NOT "fill" the list using similarly named streets in distant cities (e.g. "Washington St" in Dedham, MA when the user asked for San Francisco, CA).
- location.zip_code should share the same broad regional prefix as the anchor ZIP when possible (same first 2 digits at minimum for the same state).

Return ONLY valid JSON with this top-level shape:
{ "results": [ /* up to 20 facility objects */ ] }

${FACILITY_SHAPE}

Rules:
1. Return as many high-confidence rows as you can find, up to 20 (do not fabricate filler rows just to hit a number).
2. Names, addresses, coordinates, and ZIP codes must all be mutually consistent with the anchor location and zip_code.
3. Rank higher (higher total_score / review.rating) communities that clearly document the requested accessibility, services, lifestyle fit, and overall quality in amenities or description.
4. Vary facility names; do not copy one template 20 times.
5. When the radius is larger, your result set should be a superset of the smaller radius (add more, do not replace closer matches).
6. total_score and review.rating: numbers from 3.0 to 5.0; review_count / review.count: integers from 5 to 500.
7. Every non-empty website and images[] URL must come from web-search-verified sources for that exact community name + metro (same legal operator).`;
}

function buildGeoRepairPrompt(payload) {
  const anchor = parseGeoAnchorFromPayload(payload);
  return `${buildPrompt(payload)}

RETRY / CORRECTION (read carefully):
The previous attempt may have included ANY community outside ${JSON.stringify(anchor.location)} with ZIP region ${JSON.stringify(anchor.zip)}.
Regenerate the ENTIRE JSON from scratch. ALL 20 rows must be in that same metro and state (no Massachusetts listings for a California anchor, no cross-country filler). If a street name is ambiguous, pick only addresses that unambiguously match the anchor city or neighboring suburbs in the same state.
Use web_search again for every row: real https website and real image URLs only — no example.com or placeholders.`;
}

/**
 * Softer geography fallback: prefer same-state rows, then same ZIP prefix rows.
 * This prevents complete no-result failures when strict filtering is too narrow.
 * @param {object[]} results
 * @param {{ zip: string, stateAbbr: string|null }} anchor
 */
function fallbackGeoSubset(results, anchor) {
  const rows = Array.isArray(results) ? results : [];
  const wantState = anchor?.stateAbbr ? String(anchor.stateAbbr).toUpperCase() : "";
  const anchorZip = String(anchor?.zip || "").replace(/\D/g, "").slice(0, 5);
  const zipPrefix = anchorZip.length >= 2 ? anchorZip.slice(0, 2) : "";

  const sameState = rows.filter((f) => {
    const loc = f?.location && typeof f.location === "object" ? f.location : {};
    const rowState = String(loc.state || "").trim().toUpperCase();
    const rowZip = String(loc.zip_code || "").replace(/\D/g, "").slice(0, 5);
    if (!zipCompatibleWithSearch(anchorZip, rowZip, rowState)) return false;
    return Boolean(wantState) && rowState.length === 2 && rowState === wantState;
  });
  if (sameState.length > 0) return sameState;

  if (zipPrefix) {
    const sameZipPrefix = rows.filter((f) => {
      const loc = f?.location && typeof f.location === "object" ? f.location : {};
      const rowZip = String(loc.zip_code || "").replace(/\D/g, "").slice(0, 5);
      const rowState = String(loc.state || "").trim().toUpperCase();
      if (!zipCompatibleWithSearch(anchorZip, rowZip, rowState)) return false;
      return rowZip.length === 5 && rowZip.startsWith(zipPrefix);
    });
    if (sameZipPrefix.length > 0) return sameZipPrefix;
  }

  // Never fall back to cross-state rows when we know the anchor state.
  if (wantState || anchorZip.length === 5) return [];
  return rows;
}

/** Strip optional ```json ... ``` wrapper from model text. */
function extractJsonObject(text) {
  const t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t);
  if (fence) return fence[1].trim();
  return t;
}

async function openaiCareSearch(client, payload, model = OPENAI_MODEL) {
  const anchor = parseGeoAnchorFromPayload(payload);
  const stats = {
    openaiResponseCalls: 0,
    googleFindPlaceCalls: 0,
    googlePlaceDetailsCalls: 0,
    geoRepairAttempted: false,
    geoRepairUsed: false,
  };

  const discoveryTools =
    process.env.CAREMATCH_DISCOVERY_WEB_SEARCH === "0"
      ? undefined
      : [{ type: "web_search" }];

  const runOnce = async (input) => {
    stats.openaiResponseCalls += 1;
    const response = await client.responses.create({
      model,
      input,
      ...(discoveryTools ? { tools: discoveryTools } : {}),
    });

    const text = typeof response.output_text === "string" ? response.output_text : "";
    if (!text.trim()) {
      const err = new Error("Empty model response");
      err.status = 502;
      throw err;
    }

    let parsed;
    try {
      parsed = JSON.parse(extractJsonObject(text));
    } catch {
      const err = new Error("Model returned non-JSON");
      err.status = 502;
      err.raw_snippet = text.slice(0, 500);
      throw err;
    }

    if (!parsed.results || !Array.isArray(parsed.results)) {
      const err = new Error('Expected { "results": array } from model');
      err.status = 502;
      throw err;
    }

    if (parsed.results.length < MIN_ACCEPTABLE_RESULTS) {
      const err = new Error(
        `Expected at least ${MIN_ACCEPTABLE_RESULTS} results, got ${parsed.results.length}`
      );
      err.status = 502;
      err.partial = parsed;
      throw err;
    }

    if (parsed.results.length > MAX_RESULTS) {
      parsed.results = parsed.results.slice(0, MAX_RESULTS);
    }

    sanitizeDiscoveryResults(parsed.results);
    return parsed;
  };
  let parsed = await runOnce(buildPrompt(payload));
  let filtered = filterDiscoveryResultsByAnchor(parsed.results, anchor);

  if (DISCOVERY_ENABLE_GEO_RETRY && filtered.length < MIN_GEO_FILTERED) {
    stats.geoRepairAttempted = true;
    try {
      const parsed2 = await runOnce(buildGeoRepairPrompt(payload));
      const filtered2 = filterDiscoveryResultsByAnchor(parsed2.results, anchor);
      if (filtered2.length > filtered.length) {
        parsed = parsed2;
        filtered = filtered2;
        stats.geoRepairUsed = true;
      }
    } catch {
      /* keep first pass */
    }
  }

  if (filtered.length === 0) {
    const fallback = fallbackGeoSubset(parsed.results, anchor);
    if (fallback.length > 0) {
      parsed.results = fallback.slice(0, MAX_RESULTS);
      sanitizeDiscoveryResults(parsed.results);
      await enrichDiscoveryResultsWithRealPlacePhotos(parsed.results, stats);
      sanitizeDiscoveryResults(parsed.results);
      if (DISCOVERY_CALL_DEBUG) {
        const totalExternal =
          stats.openaiResponseCalls + stats.googleFindPlaceCalls + stats.googlePlaceDetailsCalls;
        console.log(
          `[discovery:calls] cache=miss openai=${stats.openaiResponseCalls} geo_repair_attempted=${stats.geoRepairAttempted} geo_repair_used=${stats.geoRepairUsed} google_findplace=${stats.googleFindPlaceCalls} google_place_details=${stats.googlePlaceDetailsCalls} total_external=${totalExternal}`
        );
      }
      return parsed;
    }

    const err = new Error(
      "No communities passed geographic validation for your area. Try again with a complete city, state, and ZIP (e.g. San Francisco, CA 94102)."
    );
    err.status = 502;
    err.partial = parsed;
    throw err;
  }

  parsed.results = filtered;
  sanitizeDiscoveryResults(parsed.results);
  await enrichDiscoveryResultsWithRealPlacePhotos(parsed.results, stats);
  sanitizeDiscoveryResults(parsed.results);
  if (DISCOVERY_CALL_DEBUG) {
    const totalExternal =
      stats.openaiResponseCalls + stats.googleFindPlaceCalls + stats.googlePlaceDetailsCalls;
    console.log(
      `[discovery:calls] cache=miss openai=${stats.openaiResponseCalls} geo_repair_attempted=${stats.geoRepairAttempted} geo_repair_used=${stats.geoRepairUsed} google_findplace=${stats.googleFindPlaceCalls} google_place_details=${stats.googlePlaceDetailsCalls} total_external=${totalExternal}`
    );
  }
  return parsed;
}

function cloneDiscoveryPayload(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function buildDiscoveryCacheKey(payload, model) {
  return JSON.stringify({ model, payload });
}

function normalizeSearchParams(userSearch) {
  const bmin = Number(userSearch?.budget_min);
  const bmax = Number(userSearch?.budget_max);
  const maxDistanceMiles = Number(userSearch?.max_distance_miles);
  return {
    zip_code: typeof userSearch?.zip_code === "string" ? userSearch.zip_code.trim() : "",
    location: typeof userSearch?.location === "string" ? userSearch.location.trim() : "",
    care_levels: Array.isArray(userSearch?.care_levels) ? userSearch.care_levels : [],
    amenities: Array.isArray(userSearch?.amenities) ? userSearch.amenities : [],
    services: Array.isArray(userSearch?.services) ? userSearch.services : [],
    keywords: Array.isArray(userSearch?.keywords) ? userSearch.keywords : [],
    budget_min: Number.isFinite(bmin) && bmin > 0 ? Math.round(bmin) : null,
    budget_max: Number.isFinite(bmax) && bmax > 0 ? Math.round(bmax) : null,
    max_distance_miles:
      Number.isFinite(maxDistanceMiles) && maxDistanceMiles > 0
        ? Math.round(maxDistanceMiles)
        : null,
  };
}

function normalizeManualSearchParams(manualIntake) {
  const intake = manualIntake && typeof manualIntake === "object" ? manualIntake : {};

  const location = typeof intake.location === "string" ? intake.location.trim() : "";
  const locationZip = String(location || "").match(/\b(\d{5})(?:-\d{4})?\b/);
  const zipFromLocation = locationZip ? locationZip[1] : "";
  const explicitZip = typeof intake.zip_code === "string" ? intake.zip_code.trim() : "";
  const zip_code = explicitZip || zipFromLocation || location;

  const derivedCareLevel = MANUAL_LEVEL_TO_CARE_LEVEL[String(intake.levelOfCare || "").trim()];
  const care_levels = derivedCareLevel ? [derivedCareLevel] : ["assisted living"];

  const lovedOneCare = Array.isArray(intake.lovedOneCare) ? intake.lovedOneCare : [];
  const specialNeeds = Array.isArray(intake.specialNeedsPreferences)
    ? intake.specialNeedsPreferences
    : [];
  const amenityMustHaves = [
    ...lovedOneCare.map((id) => MANUAL_CARE_TO_AMENITY[id]).filter(Boolean),
    ...specialNeeds.map((id) => MANUAL_SPECIAL_NEED_TO_AMENITY[id]).filter(Boolean),
  ];

  const services = [...new Set(amenityMustHaves)].filter(Boolean);
  const amenities = [...new Set(amenityMustHaves)].filter(Boolean);

  const keywords = [
    MANUAL_TIMELINE_TO_KEYWORDS[String(intake.careTimeline || "").trim()] || "",
    String(intake.who || "").trim() ? `Care recipient: ${String(intake.who).trim()}` : "",
    String(intake.parentAge || "").trim() ? `Age range: ${String(intake.parentAge).trim()}` : "",
    String(intake.livingNow || "").trim()
      ? `Current living situation: ${String(intake.livingNow).trim()}`
      : "",
    String(intake.mobility || "").trim()
      ? `Mobility status: ${String(intake.mobility).trim()}`
      : "",
  ].filter(Boolean);

  const budget_min = Number(intake.budgetMin);
  const budget_max = Number(intake.budgetMax);
  const max_distance_miles = Number(intake.maxTravelMiles ?? intake.maxMiles);

  return {
    zip_code,
    location,
    care_levels,
    amenities,
    services,
    keywords,
    budget_min: Number.isFinite(budget_min) && budget_min > 0 ? Math.round(budget_min) : null,
    budget_max:
      Number.isFinite(budget_max) && budget_max > 0 && budget_max >= budget_min
        ? Math.round(budget_max)
        : null,
    max_distance_miles:
      Number.isFinite(max_distance_miles) && max_distance_miles > 0
        ? Math.round(max_distance_miles)
        : null,
  };
}

/**
 * Main function you can call after you get params from user search.
 * @param {object} userSearch - Search input from user.
 * @param {object} [options]
 * @param {string} [options.apiKey] - Optional API key; falls back to OPENAI_API_KEY.
 * @param {string} [options.model] - Optional model override.
 * @returns {Promise<{results: Array}>}
 */
export async function getCareMatchResults(userSearch, options = {}) {
  const payload = normalizeSearchParams(userSearch);
  const validationError = validatePayload(payload);
  if (validationError) {
    const err = new Error(validationError);
    err.status = 400;
    throw err;
  }

  const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const err = new Error("Missing OPENAI_API_KEY environment variable.");
    err.status = 500;
    throw err;
  }

  const client = new OpenAI({
    apiKey,
  });

  const model = options.model || OPENAI_MODEL;
  const cacheKey = buildDiscoveryCacheKey(payload, model);

  const existing = discoveryInFlight.get(cacheKey);
  if (existing) {
    if (DISCOVERY_CALL_DEBUG) {
      console.log("[discovery:calls] inflight_join");
    }
    const joined = await existing;
    return cloneDiscoveryPayload(joined);
  }

  const requestPromise = openaiCareSearch(client, payload, model).finally(() => {
      discoveryInFlight.delete(cacheKey);
    });

  discoveryInFlight.set(cacheKey, requestPromise);
  const fresh = await requestPromise;
  return cloneDiscoveryPayload(fresh);
}

/**
 * Manual intake adapter for the 8-step flow.
 * Accepts raw intake fields and routes through the same discovery engine.
 * @param {object} manualIntake
 * @param {object} [options]
 * @returns {Promise<{results: Array}>}
 */
export async function getCareMatchResultsFromManualIntake(manualIntake, options = {}) {
  const searchParams = normalizeManualSearchParams(manualIntake);
  return getCareMatchResults(searchParams, options);
}

/**
 * Optional helper if you want validation + search in one line.
 */
export async function searchCareFacilitiesFromUser(userSearch, options = {}) {
  return getCareMatchResults(userSearch, options);
}