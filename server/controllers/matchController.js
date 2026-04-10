import catchAsyncError from "../middleware/catchAsyncErrors.js";
import Facility from "../models/facilityModel.js";
import {
  rankFacilities,
  normalizeIntakePreferences,
} from "../services/matchingEngine.js";

/**
 * POST /api/match/recommendations
 * Body: intake preferences (same shape as CAREMATCH_INTAKE_JSON)
 */
export const postRecommendations = catchAsyncError(async (req, res) => {
  const prefs = normalizeIntakePreferences(req.body || {});
  const facilities = await Facility.find().lean();
  const ranked = rankFacilities(facilities, prefs, { limit: 12 });

  res.status(200).json({
    success: true,
    preferences: prefs,
    count: ranked.length,
    recommendations: ranked,
  });
});
