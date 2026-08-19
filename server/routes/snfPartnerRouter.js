import express from "express";
import { isAutheticated } from "../middleware/auth.js";
import {
  checkInSnfReferral,
  createSnfPartner,
  getMySnfPartner,
  getSnfDashboard,
  scanSnfReferral,
  updateMySnfPartner,
} from "../controllers/snfPartnerController.js";
import uploadFacilityImages from "../middleware/uploadFacilityImages.js";

const router = express.Router();

router.get("/referral/:code", scanSnfReferral);
router.get("/me", isAutheticated, getMySnfPartner);
router.put("/me", isAutheticated, uploadFacilityImages.array("images", 8), updateMySnfPartner);
router.get("/dashboard", isAutheticated, getSnfDashboard);
router.post("/", isAutheticated, uploadFacilityImages.array("images", 8), createSnfPartner);
router.post("/check-in", isAutheticated, checkInSnfReferral);

export default router;
