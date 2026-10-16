import { apiClient } from "./api";

/**
 * Rule-based ranked facilities (MVP). Same preference shape as Carrie’s CAREMATCH_INTAKE_JSON.
 * @param {object} preferences
 */
export function postMatchRecommendations(preferences) {
  return apiClient.post("/api/match/recommendations", preferences);
}

/**
 * Live discovery search backed by scraping + AI enrichment.
 * @param {object} payload
 */
export function postDiscoverFacilities(payload) {
  return apiClient.post("/api/facilities/discover", payload);
}

/**
 * Carrie-style GPT extraction from medical record → intake preferences.
 * @param {object} profile
 */
export function postRecommendFromProfile(profile) {
  return apiClient.post("/api/facilities/recommend-from-profile", profile);
}

/**
 * Upload medical docs/images → AI fills Medical History form fields.
 * @param {FormData} formData
 */
export function postParseMedicalDocuments(formData) {
  return apiClient.post("/api/facilities/parse-medical-documents", formData);
}

/**
 * Homepage: upload one medical doc/image → extract ZIP only (public).
 * @param {FormData} formData
 */
export function postExtractSearchZip(formData) {
  return apiClient.post("/api/facilities/extract-search-zip", formData);
}
