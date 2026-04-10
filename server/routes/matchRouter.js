import express from "express";
import { postRecommendations } from "../controllers/matchController.js";
import { isAutheticated } from "../middleware/auth.js";

const router = express.Router();

router.post("/recommendations", isAutheticated, postRecommendations);

export default router;
