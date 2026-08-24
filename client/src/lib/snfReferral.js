export const SNF_REFERRAL_STORAGE_KEY = "carematch_snf_referral";
export const SNF_HIGHLIGHT_STORAGE_KEY = "carematch_snf_highlight";

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

export function persistSnfHighlightPartnerId(partnerId) {
  const id = String(partnerId || "").trim();
  if (!id || typeof sessionStorage === "undefined") return "";
  sessionStorage.setItem(SNF_HIGHLIGHT_STORAGE_KEY, id);
  return id;
}

export function peekSnfHighlightPartnerId() {
  if (typeof sessionStorage === "undefined") return "";
  return String(sessionStorage.getItem(SNF_HIGHLIGHT_STORAGE_KEY) || "").trim();
}

export function clearSnfHighlightPartnerId() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(SNF_HIGHLIGHT_STORAGE_KEY);
}

/** Clears login-session referral code + SNF highlight (call on logout). */
export function clearSnfReferralSession() {
  clearSnfReferralCode();
  clearSnfHighlightPartnerId();
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
