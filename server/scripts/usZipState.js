/**
 * Approximate US ZIP3 → state. Used so city-name defaults (Everett→WA)
 * cannot override an explicit ZIP like 80220 (CO).
 */

const ZIP3_TO_STATE = new Map();

function addZip3Range(start, end, state) {
  for (let z = start; z <= end; z += 1) {
    ZIP3_TO_STATE.set(String(z).padStart(3, "0"), state);
  }
}

// ZIP3 sectional ranges (approximate, good enough for state gating).
addZip3Range(10, 149, "NY");
addZip3Range(150, 196, "PA");
addZip3Range(197, 199, "DE");
addZip3Range(200, 205, "DC");
addZip3Range(206, 219, "MD");
addZip3Range(220, 246, "VA");
addZip3Range(247, 269, "WV");
addZip3Range(270, 289, "NC");
addZip3Range(290, 299, "SC");
addZip3Range(300, 319, "GA");
addZip3Range(320, 349, "FL");
addZip3Range(350, 369, "AL");
addZip3Range(370, 385, "TN");
addZip3Range(386, 397, "MS");
addZip3Range(400, 427, "KY");
addZip3Range(430, 458, "OH");
addZip3Range(460, 479, "IN");
addZip3Range(480, 499, "MI");
addZip3Range(500, 528, "IA");
addZip3Range(530, 549, "WI");
addZip3Range(550, 567, "MN");
addZip3Range(570, 577, "SD");
addZip3Range(580, 588, "ND");
addZip3Range(590, 599, "MT");
addZip3Range(600, 629, "IL");
addZip3Range(630, 658, "MO");
addZip3Range(660, 679, "KS");
addZip3Range(680, 693, "NE");
addZip3Range(700, 714, "LA");
addZip3Range(716, 729, "AR");
addZip3Range(730, 749, "OK");
addZip3Range(750, 799, "TX");
addZip3Range(800, 816, "CO");
addZip3Range(820, 831, "WY");
addZip3Range(832, 838, "ID");
addZip3Range(840, 847, "UT");
addZip3Range(850, 865, "AZ");
addZip3Range(870, 884, "NM");
addZip3Range(889, 898, "NV");
addZip3Range(900, 961, "CA");
addZip3Range(970, 979, "OR");
addZip3Range(980, 994, "WA");
addZip3Range(995, 999, "AK");
addZip3Range(967, 968, "HI");
addZip3Range(60, 69, "CT");
addZip3Range(70, 89, "NJ");
addZip3Range(100, 149, "NY");
addZip3Range(10, 27, "MA");
addZip3Range(28, 29, "RI");
addZip3Range(30, 38, "NH");
addZip3Range(39, 49, "ME");
addZip3Range(50, 59, "VT");

/**
 * @param {string} zip
 * @returns {string} 2-letter state or ""
 */
export function stateFromUsZip(zip) {
  const z = String(zip || "").replace(/\D/g, "").slice(0, 5);
  if (z.length !== 5) return "";
  return ZIP3_TO_STATE.get(z.slice(0, 3)) || "";
}

/**
 * @param {string} searchZip
 * @param {string} facilityZip
 * @param {string} [facilityState]
 */
export function zipCompatibleWithSearch(searchZip, facilityZip, facilityState = "") {
  const want = String(searchZip || "").replace(/\D/g, "").slice(0, 5);
  if (want.length !== 5) return true;
  const wantState = stateFromUsZip(want);
  const gotZip = String(facilityZip || "").replace(/\D/g, "").slice(0, 5);
  const gotState = String(facilityState || "").trim().toUpperCase();

  if (gotZip.length === 5) {
    if (gotZip === want) return true;
    const gotZipState = stateFromUsZip(gotZip);
    if (wantState && gotZipState && wantState !== gotZipState) return false;
    if (wantState && gotZipState && wantState === gotZipState) return true;
  }

  if (wantState && gotState.length === 2 && wantState !== gotState) return false;
  return true;
}
