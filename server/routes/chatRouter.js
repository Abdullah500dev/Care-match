import express from "express";
import multer from "multer";
import { sendChat, transcribeAudio } from "../controllers/chatController.js";

const router = express.Router();
const uploadVoice = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

router.post("/", sendChat);
router.post("/transcribe", uploadVoice.single("file"), transcribeAudio);

export default router;
