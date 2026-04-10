/**
 * Rule-based care matching (MVP). Scores facilities from Mongo Facility documents.
 * No geocoding: location is fuzzy substring match on address when user gives a place.
 */

const INTAKE_JSON_START = "---CAREMATCH_INTAKE_JSON---";
const INTAKE_JSON_END = "---END_CAREMATCH_INTAKE_JSON---";

/**
 * Coerce HTTP body or model JSON into scoring prefs.
 * @param {object} raw
 */
export function normalizeIntakePreferences(raw) {
  if (!raw || typeof raw !== "object") return null;
  const careLevels = Array.isArray(raw.careLevels)
    ? raw.careLevels.map((x) => String(x).trim()).filter(Boolean)
    : [];
  const amenityMustHaves = Array.isArray(raw.amenityMustHaves)
    ? raw.amenityMustHaves.map((x) => String(x).trim()).filter(Boolean)
    : [];
  let budgetMaxMonthly = null;
  if (raw.budgetMaxMonthly != null && raw.budgetMaxMonthly !== "") {
    const n = Number(raw.budgetMaxMonthly);
    if (!Number.isNaN(n) && n > 0) budgetMaxMonthly = n;
  }
  const searchLocation =
    typeof raw.searchLocation === "string" ? raw.searchLocation.trim() : "";
  let maxDistanceMiles = null;
  if (raw.maxDistanceMiles != null && raw.maxDistanceMiles !== "") {
    const n = Number(raw.maxDistanceMiles);
    if (!Number.isNaN(n) && n >= 0) maxDistanceMiles = n;
  }
  const vi = String(raw.visitationImportance || "medium").toLowerCase();
  const visitationImportance = ["low", "medium", "high"].includes(vi) ? vi : "medium";
  const personalityNotes =
    typeof raw.personalityNotes === "string" ? raw.personalityNotes.trim() : "";
  const snfReadiness = Boolean(raw.snfReadiness);
  return {
    careLevels,
    amenityMustHaves,
    budgetMaxMonthly,
    searchLocation,
    maxDistanceMiles,
    visitationImportance,
    personalityNotes,
    snfReadiness,
  };
}

/** @param {string} text */
export function extractIntakeJsonBlock(text) {
  if (!text || typeof text !== "string") {
    return { userVisible: text || "", prefs: null };
  }
  const start = text.indexOf(INTAKE_JSON_START);
  const end = text.indexOf(INTAKE_JSON_END);
  if (start === -1 || end === -1 || end <= start) {
    return { userVisible: text.trim(), prefs: null };
  }
  const raw = text.slice(start + INTAKE_JSON_START.length, end).trim();
  let prefs = null;
  try {
    prefs = JSON.parse(raw);
  } catch {
    prefs = null;
  }
  const before = text.slice(0, start).trim();
  const after = text.slice(end + INTAKE_JSON_END.length).trim();
  let userVisible = [before, after].filter(Boolean).join("\n\n").trim();
  if (!prefs) {
    userVisible = `${userVisible}\n\n_(I couldn’t run the matcher on that reply—feel free to say **show matches** when you’re ready, and I’ll try again.)_`.trim();
  }
  return { userVisible, prefs };
}

/** @param {string} s */
function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Pull monthly dollar amounts from free-text pricing e.g. "$4,500 - $6,800/month"
 * @returns {{ min: number|null, max: number|null }}
 */
export function parseMonthlyPriceRange(pricing) {
  const p = String(pricing || "");
  const nums = [...p.matchAll(/\$?\s*([\d,]+)/g)]
    .map((m) => Number.parseInt(m[1].replace(/,/g, ""), 10))
    .filter((n) => !Number.isNaN(n) && n > 0 && n < 500000);
  if (nums.length === 0) return { min: null, max: null };
  if (nums.length === 1) return { min: nums[0], max: nums[0] };
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

const CARE_SYNONYMS = [
  ["memory", "memory care", "dementia", "alzheimer"],
  ["assisted", "assisted living", "al"],
  ["independent", "independent living"],
  ["skilled", "snf", "skilled nursing", "nursing home", "subacute"],
  ["respite", "respite care"],
  ["hospice", "hospice care"],
];

/**
 * @param {string[]} userLevels
 * @param {string[]} facilityLevels
 */
function careLevelScore(userLevels, facilityLevels) {
  const u = userLevels.map(norm).filter(Boolean);
  const f = facilityLevels.map(norm).filter(Boolean);
  if (u.length === 0) return { score: 0.5, matched: [], note: "no care level specified" };
  if (f.length === 0) return { score: 0.2, matched: [], note: "listing has no care levels" };

  const matched = [];
  for (const want of u) {
    let hit = false;
    for (const fl of f) {
      if (fl.includes(want) || want.includes(fl)) {
        matched.push(fl);
        hit = true;
        break;
      }
      for (const group of CARE_SYNONYMS) {
        const wantIn = group.some((g) => want.includes(g) || g.includes(want));
        const facIn = group.some((g) => fl.includes(g));
        if (wantIn && facIn) {
          matched.push(fl);
          hit = true;
          break;
        }
      }
      if (hit) break;
    }
  }
  const uniq = [...new Set(matched)];
  const ratio = uniq.length / Math.max(u.length, 1);
  return { score: Math.min(1, 0.35 + ratio * 0.65), matched: uniq };
}

/**
 * @param {string[]} mustHaves
 * @param {string[]} facilityAmenities
 * @param {string[]} facilityServices
 */
function amenityScore(mustHaves, facilityAmenities, facilityServices) {
  const wants = mustHaves.map(norm).filter(Boolean);
  const pool = [...facilityAmenities, ...facilityServices].map(norm).filter(Boolean);
  if (wants.length === 0) return { score: 0.55, hits: [], misses: [] };
  if (pool.length === 0) return { score: 0.15, hits: [], misses: wants };

  const hits = [];
  const misses = [];
  for (const w of wants) {
    const hit = pool.some((p) => p.includes(w) || w.includes(p));
    if (hit) hits.push(w);
    else misses.push(w);
  }
  const ratio = hits.length / wants.length;
  return { score: ratio, hits, misses };
}

/**
 * @param {number|null} budgetMax user max monthly budget
 * @param {{ min: number|null, max: number|null }} facilityRange
 */
function budgetScore(budgetMax, facilityRange) {
  if (budgetMax == null || Number.isNaN(budgetMax) || budgetMax <= 0) {
    return { score: 0.5, label: "budget not specified" };
  }
  const fMin = facilityRange.min;
  const fMax = facilityRange.max;
  if (fMin == null && fMax == null) return { score: 0.45, label: "pricing unclear on listing" };

  const compareLow = fMin ?? fMax;
  const compareHigh = fMax ?? fMin;
  if (compareHigh <= budgetMax) {
    return { score: 1, label: "within budget" };
  }
  if (compareLow <= budgetMax && compareHigh > budgetMax) {
    return { score: 0.65, label: "range may extend over budget" };
  }
  if (compareLow > budgetMax) {
    const over = compareLow - budgetMax;
    const penalty = Math.min(1, over / Math.max(budgetMax, 1));
    return { score: Math.max(0, 0.25 - penalty * 0.25), label: "likely above stated budget" };
  }
  return { score: 0.5, label: "budget alignment unclear" };
}

/**
 * @param {string} searchLocation
 * @param {string} facilityAddress
 */
function locationScore(searchLocation, facilityAddress) {
  const q = norm(searchLocation);
  const a = norm(facilityAddress);
  if (!q || q.length < 3) return { score: 0.5, label: "location not specified" };
  if (!a) return { score: 0.3, label: "no address on listing" };

  const tokens = q.split(/[,\s]+/).filter((t) => t.length > 2);
  let hits = 0;
  for (const t of tokens) {
    if (a.includes(t)) hits += 1;
  }
  if (hits === 0) return { score: 0.35, label: "distance/area: not a clear text match (MVP)" };
  const ratio = hits / Math.max(tokens.length, 1);
  return { score: 0.4 + ratio * 0.6, label: "location text overlap" };
}

/** @param {"low"|"medium"|"high"|string} imp */
function visitationScore(imp, facilityAmenities, facilityServices) {
  const pool = [...facilityAmenities, ...facilityServices].join(" ").toLowerCase();
  const i = norm(imp);
  if (!i || i === "low") return { score: 0.55, bullets: [] };
  const familyHints =
    /visit|family|guest|private|suite|parking|outdoor|garden|wifi|flexible/i.test(pool);
  let score = i === "high" ? 0.5 : 0.55;
  const bullets = [];
  if (familyHints) {
    score += 0.35;
    bullets.push("amenities that support visits & comfort");
  } else if (i === "high") {
    score += 0.1;
    bullets.push("visitation priority noted — confirm visiting policies with each community");
  } else {
    score += 0.2;
  }
  return { score: Math.min(1, score), bullets };
}

const PERSONALITY_MAP = [
  { keys: ["social", "outgoing", "extrovert", "busy", "active"], amenityHints: ["social", "activity", "fitness", "club", "event", "game", "music"] },
  { keys: ["quiet", "calm", "introvert", "private", "low key"], amenityHints: ["private", "quiet", "library", "garden", "suite", "small"] },
  { keys: ["spiritual", "faith", "religious"], amenityHints: ["chapel", "spiritual", "faith", "worship"] },
  { keys: ["pet", "dog", "cat"], amenityHints: ["pet", "dog", "cat", "animal"] },
];

/**
 * @param {string} personalityNotes
 * @param {string[]} facilityAmenities
 * @param {string[]} facilityServices
 */
function personalityScore(personalityNotes, facilityAmenities, facilityServices) {
  const n = norm(personalityNotes);
  const pool = [...facilityAmenities, ...facilityServices].join(" | ").toLowerCase();
  if (!n || n.length < 2) return { score: 0.55, hits: [] };

  let score = 0.45;
  const hits = [];
  for (const row of PERSONALITY_MAP) {
    if (!row.keys.some((k) => n.includes(k))) continue;
    const any = row.amenityHints.some((h) => pool.includes(h));
    if (any) {
      score += 0.18;
      hits.push(row.keys[0]);
    }
  }
  return { score: Math.min(1, score), hits };
}

/**
 * @param {boolean|undefined} snfReadiness
 * @param {string[]} facilityLevels
 */
function snfReadinessScore(snfReadiness, facilityLevels) {
  if (!snfReadiness) return { score: 0.5, note: null };
  const f = facilityLevels.map(norm).join(" ");
  const has = /skilled|snf|nursing|subacute/i.test(f);
  return has
    ? { score: 1, note: "SNF / skilled nursing signals on listing" }
    : { score: 0.25, note: "SNF readiness requested — listing may need verification" };
}

/**
 * @typedef {object} IntakePrefs
 * @property {string[]} [careLevels]
 * @property {string[]} [amenityMustHaves]
 * @property {number|null} [budgetMaxMonthly]
 * @property {string} [searchLocation]
 * @property {number|null} [maxDistanceMiles]
 * @property {"low"|"medium"|"high"|string} [visitationImportance]
 * @property {string} [personalityNotes]
 * @property {boolean} [snfReadiness]
 */

/**
 * @param {object} facility lean mongoose doc
 * @param {IntakePrefs} prefs
 */
export function scoreFacility(facility, prefs) {
  const careLevels = Array.isArray(prefs.careLevels) ? prefs.careLevels : [];
  const amenityMustHaves = Array.isArray(prefs.amenityMustHaves)
    ? prefs.amenityMustHaves
    : [];
  const budgetMax =
    prefs.budgetMaxMonthly != null && !Number.isNaN(Number(prefs.budgetMaxMonthly))
      ? Number(prefs.budgetMaxMonthly)
      : null;
  const searchLocation = prefs.searchLocation || "";
  const visitationImportance = prefs.visitationImportance || "medium";
  const personalityNotes = prefs.personalityNotes || "";
  const snfReadiness = Boolean(prefs.snfReadiness);

  const fcLevels = facility.care_levels || [];
  const fcAmenities = facility.amenities || [];
  const fcServices = facility.services || [];

  const care = careLevelScore(careLevels, fcLevels);
  const amen = amenityScore(amenityMustHaves, fcAmenities, fcServices);
  const priceR = parseMonthlyPriceRange(facility.pricing);
  const budget = budgetScore(budgetMax, priceR);
  const loc = locationScore(searchLocation, facility.address || "");
  const visit = visitationScore(visitationImportance, fcAmenities, fcServices);
  const pers = personalityScore(personalityNotes, fcAmenities, fcServices);
  const snf = snfReadinessScore(snfReadiness, fcLevels);

  const weights = {
    care: 0.28,
    amenity: 0.22,
    budget: 0.2,
    location: 0.12,
    visitation: 0.08,
    personality: 0.06,
    snf: 0.04,
  };

  const weighted =
    care.score * weights.care +
    amen.score * weights.amenity +
    budget.score * weights.budget +
    loc.score * weights.location +
    visit.score * weights.visitation +
    pers.score * weights.personality +
    snf.score * weights.snf;

  const score01 = Math.max(0, Math.min(1, weighted));
  const score100 = Math.round(score01 * 100);

  const reasons = [];
  if (care.matched.length) {
    reasons.push(`✓ Care fit: ${care.matched.slice(0, 3).join(", ")}`);
  } else if (careLevels.length) {
    reasons.push("○ Confirm care levels with this community");
  }
  if (amen.hits.length) {
    reasons.push(`✓ Amenities / services aligned: ${amen.hits.slice(0, 4).join(", ")}`);
  }
  if (budget.label === "within budget") reasons.push("✓ Stated pricing looks within your budget");
  else if (budgetMax && budget.label.includes("above")) reasons.push("○ Pricing may exceed your budget — verify");
  if (loc.score > 0.55) reasons.push("✓ Location text matches your area (verify drive time)");
  if (visit.bullets.length) reasons.push(`✓ ${visit.bullets[0]}`);
  if (pers.hits.length) reasons.push(`✓ Personality / lifestyle signals: ${pers.hits.join(", ")}`);
  if (snf.note && snf.score > 0.7) reasons.push(`✓ ${snf.note}`);

  if (reasons.length < 2) {
    reasons.push("○ Review listing details and tour to validate fit");
  }

  return {
    facilityId: String(facility._id),
    name: facility.name,
    address: facility.address,
    pricing: facility.pricing,
    care_levels: fcLevels,
    score: score100,
    reasons: reasons.slice(0, 6),
  };
}

/**
 * @param {object[]} facilities lean
 * @param {IntakePrefs} prefs
 * @param {{ limit?: number }} [opts]
 */
export function rankFacilities(facilities, prefs, opts = {}) {
  const limit = opts.limit ?? 8;
  const scored = facilities.map((f) => scoreFacility(f, prefs));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/**
 * @param {object[]} facilities
 * @param {IntakePrefs|null} prefs
 */
export function formatRecommendationsForChat(facilities, prefs) {
  if (!prefs || typeof prefs !== "object") {
    return "";
  }
  const ranked = rankFacilities(facilities, prefs, { limit: 6 });
  if (ranked.length === 0) {
    return "\n\n---\n**Ranked matches (rule-based MVP)**\nNo communities are in the directory yet. Ask your CareMatch admin to add facilities, then try again.\n";
  }

  const lines = [
    "",
    "---",
    "**Your ranked matches (explainable, rule-based MVP)**",
    "Scores combine care level fit, must-have amenities, budget vs listed pricing, rough location text match, visitation-friendly signals, and lifestyle hints. Always confirm on a tour.",
  ];
  ranked.forEach((r, i) => {
    lines.push(`\n**${i + 1}. ${r.name}** — match score **${r.score}/100**`);
    lines.push(r.reasons.map((x) => `  ${x}`).join("\n"));
    if (r.address) lines.push(`  _${r.address}_`);
    if (r.pricing) lines.push(`  _Pricing (listing): ${r.pricing}_`);
  });
  lines.push(
    "\n_Next step: schedule tours and ask each community about care assessments, waitlists, and true all-in monthly cost._"
  );
  return lines.join("\n");
}
