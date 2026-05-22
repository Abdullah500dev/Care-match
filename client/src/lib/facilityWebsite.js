/** Directory/listing sites — not the operator's own homepage. */
const AGGREGATOR_HOST_RE =
  /(^|\.)caring\.com$|(^|\.)aplaceformom\.com$|(^|\.)seniorliving\.com$|(^|\.)senioradvisor\.com$|(^|\.)seniorhomes\.com$|(^|\.)care\.com$/i;

/** @param {string} raw */
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

/** @param {string} raw */
export function normalizeFacilityWebsite(raw) {
  const s = String(raw || "").trim();
  if (!s || isAggregatorListingUrl(s)) return "";

  let candidate = s;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate.replace(/^\/+/, "")}`;
  }

  try {
    const url = new URL(candidate);
    if (!url.hostname || !url.hostname.includes(".")) return "";
    if (isAggregatorListingUrl(url.href)) return "";
    return url.href;
  } catch {
    return "";
  }
}

/** @param {string} url */
export function isExploreableWebsite(url) {
  return Boolean(normalizeFacilityWebsite(url));
}
