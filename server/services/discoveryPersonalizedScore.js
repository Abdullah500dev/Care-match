/**
 * Replaces star-rating-as-"match%" with a location-aware personalized fit score
 * for external discovery rows. Optionally refines scores in one batched GPT call.
 */

import { OPENAI_CHAT_MODEL } from "../config/chatConstants.js";

const GOOGLE_MAPS_KEY = String(
  process.env.GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    ""
).trim();

function normalizeZip(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 5);
}

function toFinite(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function distanceMilesBetweenPoints(aLat, aLng, bLat, bLng) {
  const toRad = (n) => (n * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(h));
}

async function geocodeToLatLng(query, signal) {
  const q = String(query || "").trim();
  if (!q || !GOOGLE_MAPS_KEY) return { latitude: null, longitude: null };
  const url =
    `https://maps.googleapis.com/maps/api/geocode/json?` +
    `address=${encodeURIComponent(q)}&key=${encodeURIComponent(GOOGLE_MAPS_KEY)}`;
  let payload = {};
  try {
    const response = await fetch(url, { signal });
    if (!response.ok) return { latitude: null, longitude: null };
    payload = await response.json().catch(() => ({}));
  } catch {
    return { latitude: null, longitude: null };
  }
  const first = Array.isArray(payload?.results) ? payload.results[0] : null;
  return {
    latitude: toFinite(first?.geometry?.location?.lat),
    longitude: toFinite(first?.geometry?.location?.lng),
  };
}

function resolveStarRating(row) {
  const fromExternal = toFinite(row?.external_data?.overall_rating);
  if (fromExternal != null && fromExternal > 0) {
    return Math.min(5, Math.max(1, fromExternal));
  }
  const legacy = toFinite(row?.score);
  if (legacy != null && legacy > 0) {
    const approx = legacy / 20;
    if (approx >= 0.9 && approx <= 5.1) return Math.min(5, Math.max(1, approx));
  }
  return 4;
}

function careOverlapRatio(row, requested) {
  const want = (Array.isArray(requested) ? requested : [])
    .map((x) => String(x || "").toLowerCase().trim())
    .filter(Boolean);
  if (want.length === 0) return 1;
  const levels = (Array.isArray(row?.care_levels) ? row.care_levels : []).map((x) =>
    String(x || "").toLowerCase()
  );
  if (levels.length === 0) return 0.4;
  let hits = 0;
  for (const w of want) {
    if (levels.some((l) => l.includes(w) || w.includes(l))) hits += 1;
  }
  return hits / want.length;
}

/**
 * Rule-based 38–100 fit score: exact search ZIP can reach 100; different ZIP is capped below 100.
 */
export function computeDiscoveryPersonalizedPercent(row, ctx) {
  const searchZip = normalizeZip(ctx.searchZip || "");
  const facilityZip = normalizeZip(row.zip_code || row?.external_data?.zip_code);
  const rating = resolveStarRating(row);
  const maxMiles =
    Number.isFinite(Number(ctx.maxDistanceMiles)) && Number(ctx.maxDistanceMiles) > 0
      ? Number(ctx.maxDistanceMiles)
      : 50;

  let miles = null;
  if (Number.isFinite(ctx.anchorLat) && Number.isFinite(ctx.anchorLng)) {
    const lat = toFinite(row.latitude ?? row?.external_data?.google_places?.latitude);
    const lng = toFinite(row.longitude ?? row?.external_data?.google_places?.longitude);
    if (lat != null && lng != null) {
      miles = distanceMilesBetweenPoints(ctx.anchorLat, ctx.anchorLng, lat, lng);
    }
  }

  const careFit = careOverlapRatio(row, ctx.careLevels);
  const careBoost = careFit * 5;

  if (searchZip && facilityZip && searchZip === facilityZip) {
    const geoHint = miles != null && miles < 1.5 ? 2 : 0;
    const raw = 80 + (rating / 5) * 16 + careBoost * 0.4 + geoHint;
    return Math.min(100, Math.max(72, Math.round(raw)));
  }

  let proximityFactor = 0.5;
  if (miles != null && Number.isFinite(miles)) {
    const t = Math.min(1, Math.max(0, miles / Math.max(maxMiles, 1)));
    proximityFactor = 0.32 + (1 - t) * 0.48;
  }

  const raw = 48 + proximityFactor * 34 + (rating / 5) * 7 + careBoost * 0.55;
  return Math.min(94, Math.max(38, Math.round(raw)));
}

async function fetchGptPersonalizedScores(facilitiesPayload, criteria, signal) {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey || !facilitiesPayload.length) return null;

  const system = `You score how well each senior living community matches a family's search. Output ONLY valid JSON with shape {"scores":[{"facilityId":"string","matchPercent":number}]}.

Hard rules:
- matchPercent must be an integer from 40 to 100.
- If the facility's ZIP code is not exactly the same as the search ZIP, NEVER use 95 or above. Prefer 72–90 when they are a few miles apart in the same metro.
- Only use 96–100 when the facility ZIP equals the search ZIP exactly (same 5 digits) AND care type fits.
- Distance: closer within the user's max radius should score higher than farther, all else equal.
- Do not invent facilities; score only those given.`;

  const user = JSON.stringify({
    searchCriteria: criteria,
    facilities: facilitiesPayload,
  });

  let response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal,
      body: JSON.stringify({
        model: OPENAI_CHAT_MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
  } catch {
    return null;
  }

  if (!response.ok) return null;
  let data;
  try {
    data = await response.json();
  } catch {
    return null;
  }
  const text = data?.choices?.[0]?.message?.content;
  if (!text || typeof text !== "string") return null;
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  const list = Array.isArray(parsed?.scores) ? parsed.scores : null;
  if (!list) return null;
  const out = new Map();
  for (const item of list) {
    const id = String(item?.facilityId || "").trim();
    const p = Math.round(Number(item?.matchPercent));
    if (!id || !Number.isFinite(p)) continue;
    out.set(id, Math.min(100, Math.max(40, p)));
  }
  return out.size ? out : null;
}

/**
 * @param {object[]} rows - match rows from mapAiDiscoveryFacilityToMatchRow
 * @param {object} ctx
 * @param {string} [ctx.searchZip]
 * @param {string} [ctx.locationText]
 * @param {number|null} [ctx.maxDistanceMiles]
 * @param {string[]} [ctx.careLevels]
 * @param {number|null} [ctx.seedLat]
 * @param {number|null} [ctx.seedLng]
 * @param {AbortSignal} [signal]
 */
export async function enrichDiscoveryFacilitiesWithPersonalizedScores(rows, ctx, signal) {
  const list = Array.isArray(rows) ? rows : [];
  if (list.length === 0) return [];

  let anchorLat = toFinite(ctx.seedLat);
  let anchorLng = toFinite(ctx.seedLng);
  const locationText = String(ctx.locationText || "").trim();
  let searchZip = normalizeZip(ctx.searchZip || "");
  if (!searchZip) {
    const m = locationText.match(/\b(\d{5})\b/);
    if (m) searchZip = normalizeZip(m[1]);
  }

  if (anchorLat == null || anchorLng == null) {
    const geoQuery = [locationText, searchZip].filter(Boolean).join(" ").trim() || searchZip;
    const geo = await geocodeToLatLng(geoQuery, signal);
    anchorLat = geo.latitude;
    anchorLng = geo.longitude;
  }

  const maxDistanceMiles = ctx.maxDistanceMiles ?? null;
  const careLevels = Array.isArray(ctx.careLevels) ? ctx.careLevels : [];

  const scoreCtx = {
    searchZip,
    anchorLat,
    anchorLng,
    maxDistanceMiles,
    careLevels,
  };

  const ruleScored = list.map((row) => {
    const rule = computeDiscoveryPersonalizedPercent(row, scoreCtx);
    return { ...row, score: rule };
  });

  const gptInput = ruleScored.slice(0, 24).map((row) => {
    const lat = toFinite(row.latitude ?? row?.external_data?.google_places?.latitude);
    const lng = toFinite(row.longitude ?? row?.external_data?.google_places?.longitude);
    let miles = null;
    if (lat != null && lng != null && anchorLat != null && anchorLng != null) {
      miles = Math.round(distanceMilesBetweenPoints(anchorLat, anchorLng, lat, lng) * 10) / 10;
    }
    const fz = normalizeZip(row.zip_code || row?.external_data?.zip_code);
    return {
      facilityId: row.facilityId,
      name: row.name,
      address: row.address,
      facilityZip: fz || null,
      approximateMilesFromSearchCenter: miles,
      careLevels: row.care_levels || [],
    };
  });

  const gptMap = await fetchGptPersonalizedScores(
    gptInput,
    {
      searchZip: searchZip || null,
      location: locationText || null,
      maxDistanceMiles,
      requestedCareLevels: careLevels,
      budgetMinMonthly: ctx.budgetMinMonthly ?? null,
      budgetMaxMonthly: ctx.budgetMaxMonthly ?? null,
    },
    signal
  );

  const scored = !gptMap
    ? ruleScored
    : ruleScored.map((row) => {
        const gpt = gptMap.get(row.facilityId);
        if (gpt == null) return row;
        const fz = normalizeZip(row.zip_code || row?.external_data?.zip_code);
        const zipExact = searchZip && fz && searchZip === fz;
        let merged = gpt;
        if (!zipExact) merged = Math.min(merged, 94);
        const rule = computeDiscoveryPersonalizedPercent(row, scoreCtx);
        merged = Math.max(40, Math.min(100, Math.round((merged + rule) / 2)));
        if (!zipExact) merged = Math.min(merged, 94);
        return { ...row, score: merged };
      });

  const maxDist = Number(maxDistanceMiles);
  if (
    !Number.isFinite(maxDist) ||
    maxDist <= 0 ||
    anchorLat == null ||
    anchorLng == null
  ) {
    return scored;
  }

  return scored
    .map((row) => {
      const lat = toFinite(row.latitude ?? row?.external_data?.google_places?.latitude);
      const lng = toFinite(row.longitude ?? row?.external_data?.google_places?.longitude);
      let miles = null;
      if (lat != null && lng != null) {
        miles = distanceMilesBetweenPoints(anchorLat, anchorLng, lat, lng);
      }
      return {
        ...row,
        distance_miles: miles != null ? Math.round(miles * 10) / 10 : null,
      };
    })
    .filter((row) => {
      const miles = Number(row.distance_miles);
      return Number.isFinite(miles) && miles <= maxDist;
    });
}
