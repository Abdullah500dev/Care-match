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
    budgetMaxMonthly = parseBudgetLikeValue(raw.budgetMaxMonthly);
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
  const primaryCareType = typeof raw.primaryCareType === "string" ? raw.primaryCareType.trim() : "";
  const searchZipCode = typeof raw.searchZipCode === "string" ? raw.searchZipCode.trim() : "";

  return {
    careLevels,
    amenityMustHaves,
    budgetMaxMonthly,
    searchLocation,
    searchZipCode,
    maxDistanceMiles,
    visitationImportance,
    personalityNotes,
    snfReadiness,
    primaryCareType,
  };
}

/**
 * Parse budget-like values from number/string inputs.
 * Supports: 9000, "9000", "$9,000", "9k", "under 9,500 /mo"
 * @param {unknown} value
 * @returns {number|null}
 */
export function parseBudgetLikeValue(value) {
  if (value == null) return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) return null;
    return Math.round(value);
  }
  const raw = String(value).toLowerCase().trim();
  if (!raw) return null;
  const kMatch = raw.match(/(\d+(?:\.\d+)?)\s*k\b/);
  if (kMatch) {
    const n = Number.parseFloat(kMatch[1]);
    if (!Number.isNaN(n) && n > 0) return Math.round(n * 1000);
  }
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number.parseInt(digits, 10);
  if (Number.isNaN(n) || n <= 0) return null;
  return n;
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

/** Overlap groups for must-have amenities (phrase in user intake vs listing text). */
const AMENITY_SYNONYMS = [
  ["outdoor", "outside", "garden", "courtyard", "patio", "terrace", "walking path", "walking paths", "nature", "secure garden", "courtyards"],
  ["private room", "private suite", "private rooms", "suite", "semi-private"],
  ["pet", "pets", "dog", "cat", "animal friendly", "pet-friendly"],
  ["therapy", "rehab", "physical therapy", "occupational therapy"],
  ["dialysis"],
  ["lgbtq", "lgbt", "welcoming"],
  ["parking", "free parking", "on-site parking", "parking lot", "parking lots"],
];

/**
 * @param {string} wantNorm normalized single must-have phrase
 * @param {string[]} pool normalized amenity + service strings
 */
function amenityWantMatchesPool(wantNorm, pool) {
  if (!wantNorm) return false;
  if (pool.some((p) => p.includes(wantNorm) || wantNorm.includes(p))) return true;
  for (const group of AMENITY_SYNONYMS) {
    const userTouchesGroup = group.some(
      (g) => wantNorm === g || wantNorm.includes(g) || g.includes(wantNorm)
    );
    if (!userTouchesGroup) continue;
    if (pool.some((p) => group.some((g) => p.includes(g) || g.includes(p)))) return true;
  }
  const significant = wantNorm.split(/\s+/).filter((t) => t.length >= 4);
  if (significant.some((t) => pool.some((p) => p.includes(t)))) return true;
  const threes = wantNorm.split(/\s+/).filter((t) => t.length === 3);
  if (threes.length && threes.every((t) => pool.some((p) => p.includes(t)))) return true;
  return false;
}

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
    const hit = amenityWantMatchesPool(w, pool);
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
    return { score: 0.25, label: "range exceeds stated budget" };
  }
  if (compareLow > budgetMax) {
    const over = compareLow - budgetMax;
    const penalty = Math.min(1, over / Math.max(budgetMax, 1));
    return { score: Math.max(0, 0.25 - penalty * 0.25), label: "likely above stated budget" };
  }
  return { score: 0.5, label: "budget alignment unclear" };
}

const SHORT_LOCATION_TOKENS = new Set([
  "la",
  "sf",
  "ca",
  "ny",
  "tx",
  "fl",
  "il",
  "wa",
  "or",
  "co",
  "az",
  "nv",
  "ut",
  "ma",
  "ga",
  "nc",
  "mi",
  "oh",
  "pa",
  "va",
  "vt",
]);

const STATE_NAME_TO_ABBR = {
  california: "ca",
  "new york": "ny",
  texas: "tx",
  florida: "fl",
  vermont: "vt",
  massachusetts: "ma",
};

/**
 * Tokens for fuzzy address matching (includes 2-letter state/city codes and metro hints).
 * @param {string} q normalized search location
 */
function locationSearchTokens(q) {
  const raw = q.split(/[,\s]+/).map((t) => norm(t)).filter(Boolean);
  const tokens = new Set(
    raw.filter((t) => t.length > 2 || SHORT_LOCATION_TOKENS.has(t))
  );
  for (const [full, abbr] of Object.entries(STATE_NAME_TO_ABBR)) {
    if (q.includes(full)) tokens.add(abbr);
  }
  const metroHints = [
    { triggers: ["los angeles", "la county", "southern california", "greater los angeles"], add: ["los", "angeles", "hollywood"] },
    { triggers: ["san francisco", "bay area", "sf bay"], add: ["san", "francisco", "oakland"] },
    { triggers: ["new york", "nyc", "manhattan"], add: ["new", "york", "brooklyn"] },
  ];
  for (const m of metroHints) {
    if (m.triggers.some((t) => q.includes(t))) {
      for (const x of m.add) {
        if (x.length > 2) tokens.add(x);
      }
    }
  }
  return [...tokens];
}

/**
 * @param {string} searchLocation
 * @param {string} facilityAddress
 */
function locationScore(searchLocation, facilityAddress, prefs) {
  const q = norm(searchLocation);
  const a = norm(facilityAddress);
  const z = prefs?.searchZipCode ? norm(prefs.searchZipCode) : "";

  if (!q && !z) return { score: 0.5, label: "location not specified" };
  if (!a) return { score: 0.3, label: "no address on listing" };

  // ZIP code match is highest confidence
  if (z && a.includes(z)) {
    return { score: 0.98, label: "ZIP code match" };
  }

  if (q.length >= 5 && a.includes(q)) {
    return { score: 0.9, label: "location text overlap" };
  }

  const tokens = locationSearchTokens(q);
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
  const loc = locationScore(searchLocation, facility.address || "", prefs);
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
    website: facility.website || "",
    specialty: Array.isArray(facility.specialty) ? facility.specialty : [],
    description: facility.description || "",
    source_platform: facility.source_platform || "",
    is_external: Boolean(facility.is_external),
    amenities: Array.isArray(facility.amenities) ? facility.amenities : [],
    services: Array.isArray(facility.services) ? facility.services : [],
    external_data:
      facility.external_data && typeof facility.external_data === "object"
        ? facility.external_data
        : {},
    images: Array.isArray(facility.images) ? facility.images : [],
    score: score100,
    reasons: reasons.slice(0, 6),
  };
}

/**
 * Hard gates: only facilities that satisfy stated care, must-have amenities, budget cap,
 * location keywords (when provided), and SNF readiness (when requested) are returned for ranking.
 * @param {object} facility lean mongoose doc
 * @param {IntakePrefs} prefs
 */
export function facilityMeetsIntakeRequirements(facility, prefs) {
  if (!prefs || typeof prefs !== "object") return false;

  const careLevels = Array.isArray(prefs.careLevels) ? prefs.careLevels : [];
  const amenityMustHaves = Array.isArray(prefs.amenityMustHaves)
    ? prefs.amenityMustHaves
    : [];
  const budgetMax = parseBudgetLikeValue(prefs.budgetMaxMonthly);
  const searchLocation = prefs.searchLocation || "";
  const snfReadiness = Boolean(prefs.snfReadiness);

  const fcLevels = facility.care_levels || [];
  const fcAmenities = facility.amenities || [];
  const fcServices = facility.services || [];

  if (careLevels.length > 0) {
    const care = careLevelScore(careLevels, fcLevels);
    if (care.matched.length === 0) return false;
  }

  if (amenityMustHaves.length > 0) {
    const amen = amenityScore(amenityMustHaves, fcAmenities, fcServices);
    if (amen.misses.length > 0) return false;
  }

  if (budgetMax != null && budgetMax > 0) {
    const priceR = parseMonthlyPriceRange(facility.pricing);
    const compareHigh = priceR.max ?? priceR.min;
    if (compareHigh == null) return false;
    if (compareHigh > budgetMax) return false;
  }

  const q = norm(searchLocation);
  if (q.length >= 3) {
    const locTokens = locationSearchTokens(q);
    if (locTokens.length > 0 || prefs?.searchZipCode) {
      const loc = locationScore(searchLocation, facility.address || "", prefs);
      if (
        loc.label === "distance/area: not a clear text match (MVP)" ||
        loc.label === "no address on listing"
      ) {
        return false;
      }
    }
  }

  if (snfReadiness) {
    const f = fcLevels.map(norm).join(" ");
    if (!/skilled|snf|nursing|subacute/i.test(f)) return false;
  }

  return true;
}

/**
 * Build criteria array from user intake.
 * Primary 3 requested by product flow: care, amenities, budget.
 * @param {IntakePrefs} prefs
 */
function buildCriteriaArray(prefs) {
  const budgetMax = parseBudgetLikeValue(prefs?.budgetMaxMonthly);
  const careLevels = Array.isArray(prefs?.careLevels)
    ? prefs.careLevels.map((x) => String(x).trim()).filter(Boolean)
    : [];
  const amenityMustHaves = Array.isArray(prefs?.amenityMustHaves)
    ? prefs.amenityMustHaves.map((x) => String(x).trim()).filter(Boolean)
    : [];
  const searchLocation =
    typeof prefs?.searchLocation === "string" ? prefs.searchLocation.trim() : "";
  const personalityNotes =
    typeof prefs?.personalityNotes === "string" ? prefs.personalityNotes.trim() : "";

  const criteria = [];
  if (careLevels.length) criteria.push({ key: "care", value: careLevels, primary: true });
  if (amenityMustHaves.length) {
    criteria.push({ key: "amenities", value: amenityMustHaves, primary: true });
  }
  if (budgetMax != null && budgetMax > 0) {
    criteria.push({ key: "budget", value: budgetMax, primary: true });
  }
  if (searchLocation.length >= 3) criteria.push({ key: "location", value: searchLocation, primary: false });
  if (personalityNotes.length >= 2) criteria.push({ key: "personality", value: personalityNotes, primary: false });
  return criteria;
}

/**
 * Evaluate facility against criteria array.
 * @param {object} facility
 * @param {IntakePrefs} prefs
 * @param {{key:string,value:any,primary:boolean}[]} criteria
 */
function evaluateCriteriaMatch(facility, prefs, criteria) {
  const fcLevels = Array.isArray(facility.care_levels) ? facility.care_levels : [];
  const fcAmenities = Array.isArray(facility.amenities) ? facility.amenities : [];
  const fcServices = Array.isArray(facility.services) ? facility.services : [];
  const checks = [];

  for (const c of criteria) {
    if (c.key === "care") {
      const care = careLevelScore(c.value, fcLevels);
      checks.push({ key: c.key, primary: c.primary, matched: care.matched.length > 0 });
    } else if (c.key === "amenities") {
      const amen = amenityScore(c.value, fcAmenities, fcServices);
      // 'Must-Have' logic: criterion is only matched if ALL requested amenities are present
      checks.push({ key: c.key, primary: c.primary, matched: amen.hits.length === c.value.length && amen.misses.length === 0 });
    } else if (c.key === "budget") {
      const priceR = parseMonthlyPriceRange(facility.pricing);
      const compareHigh = priceR.max ?? priceR.min;
      checks.push({ key: c.key, primary: c.primary, matched: compareHigh != null && compareHigh <= c.value });
    } else if (c.key === "location") {
      const loc = locationScore(c.value, facility.address || "", prefs);
      checks.push({ key: c.key, primary: c.primary, matched: loc.score >= 0.55 });
    } else if (c.key === "personality") {
      const pers = personalityScore(c.value, fcAmenities, fcServices);
      checks.push({ key: c.key, primary: c.primary, matched: pers.hits.length > 0 });
    }
  }

  const primaryChecks = checks.filter((c) => c.primary);
  const primaryMatched = primaryChecks.filter((c) => c.matched).length;
  const totalMatched = checks.filter((c) => c.matched).length;
  const primaryCount = primaryChecks.length;
  const totalCount = checks.length;
  const fullPrimaryArray = primaryCount >= 3;
  const isFullMatch = fullPrimaryArray
    ? primaryMatched === primaryCount
    : totalCount > 0 && totalMatched === totalCount;
  const isPartialMatch = !isFullMatch && totalMatched > 0;

  return {
    checks,
    totalMatched,
    totalCount,
    primaryMatched,
    primaryCount,
    fullPrimaryArray,
    isFullMatch,
    isPartialMatch,
  };
}

/**
 * @param {object[]} facilities lean
 * @param {IntakePrefs} prefs
 * @param {{ limit?: number }} [opts]
 */
export function rankFacilities(facilities, prefs, opts = {}) {
  const limit = opts.limit ?? 8;
  if (!prefs || typeof prefs !== "object") return [];
  const criteria = buildCriteriaArray(prefs);
  // Do not show everything when we have no usable criteria.
  if (criteria.length === 0) return [];

  // HARD FILTER: Only show facilities that match the primary care type if specified.
  let filteredFacilities = facilities;
  if (prefs.primaryCareType) {
    const targetType = norm(prefs.primaryCareType);
    filteredFacilities = facilities.filter((f) => {
      const fLevels = (f.care_levels || []).map(norm);
      // Check if any of the facility's care levels match the target primary care type
      return fLevels.some(l => 
        l.includes(targetType) || targetType.includes(l) ||
        CARE_SYNONYMS.some(group => group.includes(targetType) && group.some(g => l.includes(g)))
      );
    });
  }

  const evaluated = filteredFacilities.map((f) => {
    const base = scoreFacility(f, prefs);
    const evals = evaluateCriteriaMatch(f, prefs, criteria);
    return {
      ...base,
      criteriaMatched: evals.totalMatched,
      criteriaTotal: evals.totalCount,
      primaryMatched: evals.primaryMatched,
      primaryTotal: evals.primaryCount,
      _isFull: evals.isFullMatch,
      _isPartial: evals.isPartialMatch,
      _hasPrimaryArray: evals.fullPrimaryArray,
    };
  });

  const full = evaluated.filter((x) => x._isFull);
  const partial = evaluated.filter((x) => x._isPartial);

  const sorter = (a, b) =>
    b.primaryMatched - a.primaryMatched ||
    b.criteriaMatched - a.criteriaMatched ||
    b.score - a.score ||
    String(a.name).localeCompare(String(b.name));

  full.sort(sorter);
  partial.sort(sorter);

  return [...full, ...partial].slice(0, limit).map((x) => ({
    facilityId: x.facilityId,
    name: x.name,
    address: x.address,
    pricing: x.pricing,
    care_levels: x.care_levels,
    images: x.images,
    website: x.website || "",
    specialty: Array.isArray(x.specialty) ? x.specialty : [],
    description: x.description || "",
    source_platform: x.source_platform || "",
    is_external: Boolean(x.is_external),
    amenities: Array.isArray(x.amenities) ? x.amenities : [],
    services: Array.isArray(x.services) ? x.services : [],
    external_data: x.external_data || {},
    score: x.score,
    reasons: x.reasons,
    criteriaMatched: x.criteriaMatched,
    criteriaTotal: x.criteriaTotal,
  }));
}

/**
 * All facilities that pass requirement gates, scored and sorted.
 * @param {object[]} facilities lean
 * @param {IntakePrefs|null} prefs
 */
export function rankAllFacilities(facilities, prefs) {
  if (!prefs || typeof prefs !== "object") return [];
  const criteria = buildCriteriaArray(prefs);
  if (criteria.length === 0) return [];

  const ranked = rankFacilities(facilities, prefs, { limit: facilities.length });
  return ranked.sort(
    (a, b) =>
      (b.criteriaMatched || 0) - (a.criteriaMatched || 0) ||
      b.score - a.score ||
      String(a.name).localeCompare(String(b.name))
  );
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
    const emptyDir = !facilities || facilities.length === 0;
    const msg = emptyDir
      ? "No facilities matched your criteria. Please broaden your search criteria."
      : "No facilities matched your criteria. Please broaden your search criteria.";
    return `\n\n---\n**Your matches**\n${msg}\n`;
  }

  const lines = [
    "",
    "---",
    "**Your matches (rule-based MVP)**",
    "Results are ordered by criteria-array matching: full matches first, then partial matches (any matched criterion), then score. Always confirm on a tour.",
  ];
  ranked.forEach((r, i) => {
    lines.push(`\n**${i + 1}. ${r.name}** — match score **${r.score}/100**`);
    if (typeof r.criteriaMatched === "number" && typeof r.criteriaTotal === "number") {
      lines.push(`  ✓ Criteria match: ${r.criteriaMatched}/${r.criteriaTotal}`);
    }
    lines.push(r.reasons.map((x) => `  ${x}`).join("\n"));
    if (r.address) lines.push(`  _${r.address}_`);
    if (r.pricing) lines.push(`  _Pricing (listing): ${r.pricing}_`);
    if (r.website) lines.push(`  _Website: ${r.website}_`);
  });
  lines.push(
    "\n_Next step: schedule tours and ask each community about care assessments, waitlists, and true all-in monthly cost._"
  );
  return lines.join("\n");
}
