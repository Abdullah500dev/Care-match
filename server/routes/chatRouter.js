import express from "express";
import { sendChat } from "../controllers/chatController.js";
import { isAutheticated } from "../middleware/auth.js";

const router = express.Router();

router.post("/", isAutheticated, sendChat);

export default router;
