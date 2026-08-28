import express from "express";
import { isAutheticated } from "../middleware/auth.js";
import {
  createConversation,
  getDirectoryUsers,
  getMessages,
  getMyConversations,
  getScannedSnfContacts,
  getUnreadCount,
  markRead,
} from "../controllers/messageController.js";

const router = express.Router();

router.get("/conversations", isAutheticated, getMyConversations);
router.post("/conversations", isAutheticated, createConversation);
router.get("/directory", isAutheticated, getDirectoryUsers);
router.get("/scanned-snf-contacts", isAutheticated, getScannedSnfContacts);
router.get("/unread-count", isAutheticated, getUnreadCount);
router.get("/conversations/:id", isAutheticated, getMessages);
router.post("/conversations/:id/read", isAutheticated, markRead);

export default router;
