import express from "express";

import { isAutheticated } from "../middleware/auth.js";
import {
  createFacilityValidation,
  updateFacilityValidation,
} from "../middleware/formValidation/facilityFormValidation.js";
import {
  createFacility,
  listFacilities,
  listPublicFacilities,
  postDiscoverFacilities,
  getGooglePlacePhotoProxy,
  getGooglePlacePhotoByPlaceIdProxy,
  getFacility,
  updateFacility,
  deleteFacility,
  getMyFacility,
  importExternalFacilities,
  importFacilitiesFromApify,
  enrichFacilitiesWithGpt,
  updateMyFacility,
  resolveAddressZip,
} from "../controllers/facilityController.js";
import { notifyExploreClick } from "../controllers/exploreNotifyController.js";
import uploadFacilityImages from "../middleware/uploadFacilityImages.js";
import { getApifySchedulerStatus } from "../controllers/apifySyncController.js";

const router = express.Router();

router.get("/public", listPublicFacilities);
router.post("/discover", postDiscoverFacilities);
router.get("/google-place-photo", getGooglePlacePhotoProxy);
router.get("/google-place-photo-by-place-id", getGooglePlacePhotoByPlaceIdProxy);
router.get("/apify-sync-status", isAutheticated, getApifySchedulerStatus);

/**
 * @swagger
 * /api/facilities:
 *   get:
 *     summary: List all facilities (admin only)
 *     tags: [Facility Management]
 *     security:
 *       - accessTokenAuth: []
 *     responses:
 *       200:
 *         description: List of facilities
 *       403:
 *         description: Only admin users can list facilities
 */
router.get("/", isAutheticated, listFacilities);

/**
 * @swagger
 * /api/facilities:
 *   post:
 *     summary: Create a new facility account (admin only)
 *     tags: [Facility Management]
 *     security:
 *       - accessTokenAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, email, phone, address]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Evergreen Health Center"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "intake@evergreenhealth.com"
 *               phone:
 *                 type: string
 *                 example: "+1 (206) 555-0123"
 *               address:
 *                 type: string
 *                 example: "123 Main St, Seattle, WA"
 *               zip_code:
 *                 type: string
 *                 example: "98101"
 *               services:
 *                 oneOf:
 *                   - type: array
 *                     items:
 *                       type: string
 *                   - type: string
 *                 example: ["Rehabilitation", "Post-Acute Care"]
 *               amenities:
 *                 oneOf:
 *                   - type: array
 *                     items:
 *                       type: string
 *                   - type: string
 *                 example: ["Private Rooms", "Therapy Gym"]
 *               care_levels:
 *                 oneOf:
 *                   - type: array
 *                     items:
 *                       type: string
 *                   - type: string
 *                 example: ["Skilled Nursing", "Memory Care"]
 *               pricing:
 *                 type: string
 *                 example: "$4,500 - $6,800/month"
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Facility created and invite email sent
 *       400:
 *         description: Validation or duplicate email error
 *       403:
 *         description: Only admin users can create facilities
 */
router.post(
  "/",
  isAutheticated,
  uploadFacilityImages.array("images", 8),
  createFacilityValidation,
  createFacility
);

router.post("/import-external", isAutheticated, importExternalFacilities);
router.post("/import-apify", isAutheticated, importFacilitiesFromApify);
router.post("/enrich-gpt", isAutheticated, enrichFacilitiesWithGpt);

router.get("/resolve-zip", isAutheticated, resolveAddressZip);
router.get("/me", isAutheticated, getMyFacility);
router.put(
  "/me",
  isAutheticated,
  uploadFacilityImages.array("images", 8),
  updateMyFacility
);
router.post("/explore-click", isAutheticated, notifyExploreClick);

/**
 * @swagger
 * /api/facilities/{id}:
 *   get:
 *     summary: Get one facility (admin only)
 *     tags: [Facility Management]
 *     security:
 *       - accessTokenAuth: []
 */
router.get("/:id", isAutheticated, getFacility);

/**
 * @swagger
 * /api/facilities/{id}:
 *   put:
 *     summary: Update facility (admin only)
 *     tags: [Facility Management]
 *     security:
 *       - accessTokenAuth: []
 */
router.put(
  "/:id",
  isAutheticated,
  uploadFacilityImages.array("images", 8),
  updateFacilityValidation,
  updateFacility
);

/**
 * @swagger
 * /api/facilities/{id}:
 *   delete:
 *     summary: Delete facility and linked user (admin only)
 *     tags: [Facility Management]
 *     security:
 *       - accessTokenAuth: []
 */
router.delete("/:id", isAutheticated, deleteFacility);

export default router;
