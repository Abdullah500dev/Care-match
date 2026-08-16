import express from "express";
import { isAutheticated } from "../middleware/auth.js";
import {
  checkInSnfReferral,
  createSnfPartner,
  getSnfDashboard,
  scanSnfReferral,
} from "../controllers/snfPartnerController.js";

const router = express.Router();

router.get("/referral/:code", scanSnfReferral);
router.get("/dashboard", isAutheticated, getSnfDashboard);
router.post("/", isAutheticated, createSnfPartner);
router.post("/check-in", isAutheticated, checkInSnfReferral);

export default router;
