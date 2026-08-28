import catchAsyncError from "../middleware/catchAsyncErrors.js";
import ErrorHandler from "../utils/errorHandler.js";
import User from "../models/userModel.js";
import {
  getConversationMessages,
  getUnreadMessageCount,
  listConversationsForUser,
  listMessageDirectory,
  listScannedSnfContacts,
  markConversationRead,
  startConversation,
} from "../services/messagingService.js";

const loadRequestUser = async (req) => {
  const user = await User.findById(req.user?.id).select(
    "name email role user_type is_blocked",
  );
  if (!user || user.is_blocked) {
    throw new ErrorHandler("User not found", 404);
  }
  return user;
};

export const getMyConversations = catchAsyncError(async (req, res) => {
  const user = await loadRequestUser(req);
  const conversations = await listConversationsForUser(user);
  res.json({ success: true, conversations });
});

export const getDirectoryUsers = catchAsyncError(async (req, res) => {
  const user = await loadRequestUser(req);
  const users = await listMessageDirectory(user, req.query.q);
  res.json({ success: true, users });
});

export const createConversation = catchAsyncError(async (req, res) => {
  const user = await loadRequestUser(req);
  const conversation = await startConversation(user, {
    recipientId: req.body?.recipientId,
    snfPartnerId: req.body?.snfPartnerId,
    support: Boolean(req.body?.support),
  });
  res.status(201).json({ success: true, conversation });
});

export const getScannedSnfContacts = catchAsyncError(async (req, res) => {
  const user = await loadRequestUser(req);
  const contacts = await listScannedSnfContacts(user);
  res.json({ success: true, contacts });
});

export const getMessages = catchAsyncError(async (req, res) => {
  const user = await loadRequestUser(req);
  const payload = await getConversationMessages(user, req.params.id);
  res.json({ success: true, ...payload });
});

export const markRead = catchAsyncError(async (req, res) => {
  const user = await loadRequestUser(req);
  await markConversationRead(user, req.params.id);
  res.json({ success: true });
});

export const getUnreadCount = catchAsyncError(async (req, res) => {
  const user = await loadRequestUser(req);
  const count = await getUnreadMessageCount(user);
  res.json({ success: true, count });
});
