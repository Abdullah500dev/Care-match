import express from "express";
import { isAutheticated } from "../middleware/auth.js";
import {
  checkInVisitorByCode,
  claimSnfReferral,
  createSnfPartner,
  deleteSnfPartnerByAdmin,
  getMyScannedSnfs,
  getMySnfPartner,
  getMyVisitPass,
  getPublicSnfByReferralCode,
  getSnfDashboard,
  scanSnfReferral,
  updateMySnfPartner,
  updateSnfPartnerByAdmin,
} from "../controllers/snfPartnerController.js";
import uploadFacilityImages from "../middleware/uploadFacilityImages.js";

const router = express.Router();

router.get("/referral/:code", scanSnfReferral);
router.get("/public/:code", getPublicSnfByReferralCode);
router.post("/claim-referral", isAutheticated, claimSnfReferral);
router.get("/my-visit-pass", isAutheticated, getMyVisitPass);
router.post("/visitor-check-in", isAutheticated, checkInVisitorByCode);
router.get("/my-scans", isAutheticated, getMyScannedSnfs);
router.get("/me", isAutheticated, getMySnfPartner);
router.put("/me", isAutheticated, uploadFacilityImages.array("images", 8), updateMySnfPartner);
router.get("/dashboard", isAutheticated, getSnfDashboard);
router.post("/", isAutheticated, uploadFacilityImages.array("images", 8), createSnfPartner);
router.put("/:id", isAutheticated, uploadFacilityImages.array("images", 8), updateSnfPartnerByAdmin);
router.delete("/:id", isAutheticated, deleteSnfPartnerByAdmin);

export default router;
