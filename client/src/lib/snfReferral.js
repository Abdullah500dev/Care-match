export const SNF_REFERRAL_STORAGE_KEY = "carematch_snf_referral";

export function normalizeSnfReferralCode(value) {
  return String(value || "").trim().toUpperCase();
}

export function persistSnfReferralCode(value) {
  const code = normalizeSnfReferralCode(value);
  if (!code || typeof sessionStorage === "undefined") return "";
  sessionStorage.setItem(SNF_REFERRAL_STORAGE_KEY, code);
  return code;
}

export function peekSnfReferralCode() {
  if (typeof sessionStorage === "undefined") return "";
  return normalizeSnfReferralCode(sessionStorage.getItem(SNF_REFERRAL_STORAGE_KEY));
}

export function clearSnfReferralCode() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(SNF_REFERRAL_STORAGE_KEY);
}

export function snfReferralPath(value) {
  const code = normalizeSnfReferralCode(value);
  return code ? `/snf-referral/${encodeURIComponent(code)}` : "/snf-referral";
}

export function resolveSnfImageUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const base = import.meta.env.VITE_REACT_APP_API_BASE_URL || "";
  return `${String(base).replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}
