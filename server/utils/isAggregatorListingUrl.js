/** Directory/listing sites — not the operator's own homepage. */
const AGGREGATOR_HOST_RE =
  /(^|\.)caring\.com$|(^|\.)aplaceformom\.com$|(^|\.)seniorliving\.com$|(^|\.)senioradvisor\.com$|(^|\.)seniorhomes\.com$|(^|\.)care\.com$/i;

export function isAggregatorListingUrl(raw) {
  const s = String(raw || "").trim();
  if (!s) return false;
  try {
    const host = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`).hostname;
    return AGGREGATOR_HOST_RE.test(host);
  } catch {
    return false;
  }
}

/** Prefer operator homepage; drop aggregator profile URLs. */
export function resolveOperatorWebsite(...candidates) {
  for (const raw of candidates) {
    const s = String(raw || "").trim();
    if (!s || isAggregatorListingUrl(s)) continue;
    return s;
  }
  return "";
}
