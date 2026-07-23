import express from "express";

import { isAutheticated } from "../middleware/auth.js";
import {
  listExploreEmailOpens,
  trackEmailOpen,
} from "../controllers/emailTrackController.js";
import {
  listLeads,
  removeLead,
  updateLead,
} from "../controllers/leadController.js";

const router = express.Router();

router.get("/track/:token", trackEmailOpen);
router.get("/explore-opens", isAutheticated, listExploreEmailOpens);
router.get("/leads", isAutheticated, listLeads);
router.patch("/leads/:id", isAutheticated, updateLead);
router.delete("/leads/:id", isAutheticated, removeLead);

export default router;
