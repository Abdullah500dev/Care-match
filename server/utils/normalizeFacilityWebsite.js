/**
 * Normalizes a facility website for storage and Explore links (https required).
 * Accepts full URLs or bare domains (example.com → https://example.com).
 */
export function normalizeFacilityWebsite(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";

  let candidate = s;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate.replace(/^\/+/, "")}`;
  }

  try {
    const url = new URL(candidate);
    if (!url.hostname || !url.hostname.includes(".")) return "";
    return url.href;
  } catch {
    return "";
  }
}
