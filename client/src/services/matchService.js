import { apiClient } from "./api";

/**
 * Rule-based ranked facilities (MVP). Same preference shape as Carrie’s CAREMATCH_INTAKE_JSON.
 * @param {object} preferences
 */
export function postMatchRecommendations(preferences) {
  return apiClient.post("/api/match/recommendations", preferences);
}
