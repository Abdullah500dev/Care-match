import express from "express";

import { isAutheticated } from "../middleware/auth.js";
import {
  listExploreEmailOpens,
  trackEmailOpen,
} from "../controllers/emailTrackController.js";

const router = express.Router();

router.get("/track/:token", trackEmailOpen);
router.get("/explore-opens", isAutheticated, listExploreEmailOpens);

export default router;
