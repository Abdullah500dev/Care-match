/**
 * Format US phone as you type: (XXX) XXX-XXXX
 * Accepts pasted values with +1 / country code 1 and normalizes to 10-digit NANP.
 */
export function formatPhoneInput(value) {
  let digits = String(value || "").replace(/\D/g, "");

  if (digits.length >= 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }
  digits = digits.slice(0, 10);

  if (!digits) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Digits-only phone (max 10) for APIs that prefer raw numbers. */
export function phoneDigitsOnly(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.length >= 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
}
