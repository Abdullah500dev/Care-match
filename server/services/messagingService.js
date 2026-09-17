import ErrorHandler from "../utils/errorHandler.js";
import User from "../models/userModel.js";
import Facility from "../models/facilityModel.js";
import SnfPartner, { SnfReferral } from "../models/snfPartnerModel.js";
import {
  Conversation,
  Message,
  buildParticipantKey,
} from "../models/messageModel.js";

export const isAdminStaffUser = (user) => {
  if (!user) return false;
  if (user.role === "admin") return true;
  return ["admin", "authenticator", "moderator"].includes(user.user_type);
};

const loadUserById = async (userId) => {
  if (!userId) return null;
  return User.findById(userId).select("name email role user_type");
};

export const accountLabelFor = (user) => {
  if (!user) return "User";
  if (user.role === "admin" || user.user_type === "admin") return "Admin";
  if (user.role === "facility") return "Facility";
  if (user.role === "snf") return "SNF Partner";
  if (["authenticator", "moderator"].includes(user.user_type)) return "Staff";
  return "Family User";
};

const displayNameFor = (user, facilityNameByUserId, snfNameByUserId) => {
  if (!user) return "User";
  const id = String(user._id);
  if (isAdminStaffUser(user)) return "CareMatch Support";
  if (user.role === "facility") {
    return facilityNameByUserId.get(id) || user.name || "Facility";
  }
  if (user.role === "snf") {
    return snfNameByUserId.get(id) || user.name || "SNF Partner";
  }
  return user.name || "User";
};

const buildNameLookupMaps = async (users) => {
  const list = users.filter(Boolean);
  const facilityUserIds = list
    .filter((u) => u.role === "facility")
    .map((u) => u._id);
  const snfUserIds = list.filter((u) => u.role === "snf").map((u) => u._id);

  const facilities = facilityUserIds.length
    ? await Facility.find({ user_id: { $in: facilityUserIds } })
        .select("user_id name")
        .lean()
    : [];
  const snfPartners = snfUserIds.length
    ? await SnfPartner.find({ facilityUserId: { $in: snfUserIds } })
        .select("facilityUserId name")
        .lean()
    : [];

  const facilityNameByUserId = new Map(
    facilities.map((f) => [String(f.user_id), f.name]),
  );
  const snfNameByUserId = new Map(
    snfPartners.map((p) => [String(p.facilityUserId), p.name]),
  );

  return { facilityNameByUserId, snfNameByUserId };
};

const serializeUser = (user, nameLookup = null) => {
  if (!user) return null;
  const lookup = nameLookup || {
    facilityNameByUserId: new Map(),
    snfNameByUserId: new Map(),
  };
  return {
    id: String(user._id),
    name: displayNameFor(user, lookup.facilityNameByUserId, lookup.snfNameByUserId),
    email: user.email || "",
    role: user.role || "user",
    user_type: user.user_type || "user",
    accountLabel: accountLabelFor(user),
  };
};

const serializeMessage = (message, sender, nameLookup = null) => ({
  id: String(message._id),
  conversationId: String(message.conversationId),
  senderId: String(message.senderId),
  text: message.text,
  createdAt: message.createdAt,
  sender: serializeUser(sender, nameLookup),
});

const getUnreadForUser = (conversation, userId) => {
  const key = String(userId);
  const map = conversation.unreadCounts;
  if (map instanceof Map) return Number(map.get(key) || 0);
  if (map && typeof map === "object") return Number(map[key] || 0);
  return 0;
};

const serializeConversation = async (conversation, viewerId, participantsById) => {
  const viewer = String(viewerId);
  const participantIds = conversation.participantIds.map((id) => String(id));
  const isViewerIn = participantIds.includes(viewer);

  let peerId;
  if (isViewerIn) {
    peerId = participantIds.find((id) => id !== viewer) || viewer;
  } else {
    const users = participantIds
      .map((id) => participantsById?.get(id))
      .filter(Boolean);
    const familyPeer = users.find(
      (u) => u.role === "user" && !["admin", "authenticator", "moderator"].includes(u.user_type),
    );
    peerId = familyPeer ? String(familyPeer._id) : participantIds[0];
  }

  const peer =
    participantsById?.get(peerId) ||
    (await loadUserById(peerId));

  const participantUsers = participantIds
    .map((id) => participantsById?.get(id))
    .filter(Boolean);
  if (peer && !participantUsers.some((u) => String(u._id) === String(peer._id || peerId))) {
    participantUsers.push(peer);
  }
  const nameLookup = await buildNameLookupMaps(participantUsers);

  const subtitleParts = participantIds
    .filter((id) => id !== String(peer?._id || peerId))
    .map((id) => {
      const user = participantsById?.get(id) || null;
      return user ? accountLabelFor(user) : "";
    })
    .filter(Boolean);

  return {
    id: String(conversation._id),
    peer: serializeUser(peer, nameLookup),
    subtitle: subtitleParts.length ? subtitleParts.join(" · ") : accountLabelFor(peer),
    lastMessageText: conversation.lastMessageText || "",
    lastMessageAt: conversation.lastMessageAt,
    unread: isViewerIn ? getUnreadForUser(conversation, viewerId) : 0,
    updatedAt: conversation.updatedAt,
  };
};

const findSupportAdmin = async () => {
  const admin = await User.findOne({
    $or: [{ role: "admin" }, { user_type: "admin" }],
    is_blocked: { $ne: true },
  })
    .sort({ createdAt: 1 })
    .select("_id name email role user_type");
  return admin;
};

const collectScannedPartnerIds = async (userId) => {
  const user = await User.findById(userId).select("scanned_snfs");
  const scannedAtById = new Map();
  const fromUser = Array.isArray(user?.scanned_snfs) ? user.scanned_snfs : [];
  fromUser
    .filter((row) => row?.partnerId)
    .forEach((row) => scannedAtById.set(String(row.partnerId), row.scannedAt));

  const referrals = await SnfReferral.find({ scannedBy: userId })
    .sort({ checkedInAt: -1 })
    .select("snfPartnerId checkedInAt createdAt")
    .lean();

  for (const referral of referrals) {
    const id = String(referral.snfPartnerId || "");
    if (!id || scannedAtById.has(id)) continue;
    scannedAtById.set(id, referral.checkedInAt || referral.createdAt);
  }

  return scannedAtById;
};

export const userHasScannedSnfPartner = async (userId, partnerId) => {
  const id = String(partnerId || "").trim();
  if (!id) return false;
  const scannedAtById = await collectScannedPartnerIds(userId);
  return scannedAtById.has(id);
};

const userCanMessagePeer = async (reqUser, peer) => {
  if (isAdminStaffUser(reqUser)) return true;
  if (isAdminStaffUser(peer)) return true;
  // Family users may message CareMatch-registered facility accounts
  // (admin-created or facility self-registered).
  if (peer?.role === "facility") {
    const linkedFacility = await Facility.findOne({ user_id: peer._id })
      .select("_id is_external")
      .lean();
    if (linkedFacility?.is_external === true) return false;
    // Registered facility login (admin-created or self-registered).
    return true;
  }
  // Facility accounts may reply to / message family users who contacted them.
  if (reqUser?.role === "facility" && peer?.role === "user") {
    return true;
  }
  if (peer?.role === "snf") {
    const partner = await SnfPartner.findOne({ facilityUserId: peer._id }).select("_id");
    if (!partner) return false;
    return userHasScannedSnfPartner(reqUser._id, partner._id);
  }
  return false;
};

/** SNF partners the family user scanned — contacts use linked SNF login user id. */
export const listScannedSnfContacts = async (reqUser) => {
  if (isAdminStaffUser(reqUser) || reqUser.role !== "user") {
    return [];
  }

  const scannedAtById = await collectScannedPartnerIds(reqUser._id);
  const ids = [...scannedAtById.keys()];
  if (!ids.length) return [];

  const partners = await SnfPartner.find({ _id: { $in: ids } })
    .select("name email facilityUserId partnershipType")
    .lean();

  return partners
    .filter((p) => p.facilityUserId)
    .map((p) => ({
      id: String(p.facilityUserId),
      partnerId: String(p._id),
      name: p.name || "SNF Partner",
      email: p.email || "",
      role: "snf",
      user_type: "user",
      accountLabel: "SNF Partner",
      scannedAt: scannedAtById.get(String(p._id)),
    }))
    .sort((a, b) => new Date(b.scannedAt || 0) - new Date(a.scannedAt || 0));
};

export const getOrCreateConversation = async (userIdA, userIdB) => {
  const key = buildParticipantKey(userIdA, userIdB);
  let conversation = await Conversation.findOne({ participantKey: key });
  if (!conversation) {
    conversation = await Conversation.create({
      participantIds: [userIdA, userIdB],
      participantKey: key,
      unreadCounts: {},
    });
  }
  return conversation;
};

export const listConversationsForUser = async (reqUser) => {
  const viewerId = String(reqUser._id);

  const conversations = await Conversation.find({ participantIds: reqUser._id })
    .sort({ lastMessageAt: -1 })
    .limit(100)
    .lean();

  const participantIds = new Set();
  conversations.forEach((c) => {
    c.participantIds.forEach((id) => participantIds.add(String(id)));
  });

  const users = await User.find({ _id: { $in: [...participantIds] } })
    .select("name email role user_type")
    .lean();
  const byId = new Map(users.map((u) => [String(u._id), u]));

  const rows = await Promise.all(
    conversations.map((c) =>
      serializeConversation(c, viewerId, byId),
    ),
  );

  return rows;
};

export const listMessageDirectory = async (reqUser, search = "") => {
  if (!isAdminStaffUser(reqUser)) {
    throw new ErrorHandler("Admin only", 403);
  }

  const q = String(search || "").trim();
  const regex = q
    ? new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
    : null;
  const selfId = String(reqUser._id);
  const userIds = new Set();

  // Always include linked facility + SNF login accounts (admin-created partners).
  // A plain User.find().limit(50) can hide them when many family users exist.
  const [facilityLinks, snfLinks] = await Promise.all([
    Facility.find({
      user_id: { $exists: true, $ne: null },
      ...(regex ? { $or: [{ name: regex }, { email: regex }] } : {}),
    })
      .select("user_id")
      .limit(200)
      .lean(),
    SnfPartner.find({
      facilityUserId: { $exists: true, $ne: null },
      ...(regex ? { $or: [{ name: regex }, { email: regex }] } : {}),
    })
      .select("facilityUserId")
      .limit(200)
      .lean(),
  ]);

  facilityLinks.forEach((f) => {
    if (f.user_id) userIds.add(String(f.user_id));
  });
  snfLinks.forEach((p) => {
    if (p.facilityUserId) userIds.add(String(p.facilityUserId));
  });

  const userFilter = {
    is_blocked: { $ne: true },
    _id: { $ne: reqUser._id },
  };

  if (regex) {
    // Match login name/email OR pull in ids already matched via Facility/SNF profile.
    const matchedUsers = await User.find({
      ...userFilter,
      $or: [{ name: regex }, { email: regex }],
    })
      .select("_id")
      .limit(100)
      .lean();
    matchedUsers.forEach((u) => userIds.add(String(u._id)));
  } else {
    // Default browse: facilities, SNFs, and a reasonable set of family users.
    const [facilityUsers, snfUsers, familyUsers] = await Promise.all([
      User.find({ ...userFilter, role: "facility" }).select("_id").limit(200).lean(),
      User.find({ ...userFilter, role: "snf" }).select("_id").limit(200).lean(),
      User.find({
        ...userFilter,
        role: "user",
        user_type: { $nin: ["admin", "authenticator", "moderator"] },
      })
        .select("_id")
        .sort({ name: 1 })
        .limit(100)
        .lean(),
    ]);
    facilityUsers.forEach((u) => userIds.add(String(u._id)));
    snfUsers.forEach((u) => userIds.add(String(u._id)));
    familyUsers.forEach((u) => userIds.add(String(u._id)));
  }

  userIds.delete(selfId);
  const ids = [...userIds];
  if (!ids.length) return [];

  const users = await User.find({
    _id: { $in: ids },
    is_blocked: { $ne: true },
  })
    .select("name email role user_type")
    .lean();

  const nameLookup = await buildNameLookupMaps(users);
  const roleRank = (role) => {
    if (role === "facility") return 0;
    if (role === "snf") return 1;
    if (role === "user") return 2;
    return 3;
  };

  return users
    .map((u) => serializeUser(u, nameLookup))
    .sort((a, b) => {
      const rankDiff = roleRank(a.role) - roleRank(b.role);
      if (rankDiff !== 0) return rankDiff;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
};

const resolveFacilityRecipientUserId = async (facilityIdRaw) => {
  const raw = String(facilityIdRaw || "").trim();
  if (!raw) return null;

  let mongoId = raw;
  if (raw.startsWith("owned-")) {
    mongoId = raw.slice("owned-".length);
  } else if (raw.startsWith("snf-")) {
    const partner = await SnfPartner.findById(raw.slice("snf-".length))
      .select("facilityUserId")
      .lean();
    return partner?.facilityUserId || null;
  }

  if (!/^[a-fA-F0-9]{24}$/.test(mongoId)) return null;

  const facility = await Facility.findById(mongoId)
    .select("user_id email is_external")
    .lean();
  if (!facility || facility.is_external === true) return null;
  if (facility.user_id) return facility.user_id;

  const email = String(facility.email || "").trim().toLowerCase();
  if (!email) return null;
  const facilityUser = await User.findOne({ email, role: "facility" }).select("_id").lean();
  return facilityUser?._id || null;
};

export const startConversation = async (
  reqUser,
  { recipientId, snfPartnerId, facilityId, support = false } = {},
) => {
  let peerId = recipientId;

  if (support) {
    const admin = await findSupportAdmin();
    if (!admin) throw new ErrorHandler("Support is not available right now", 503);
    peerId = admin._id;
  }

  if (facilityId && !support && !peerId) {
    peerId = await resolveFacilityRecipientUserId(facilityId);
    if (!peerId) {
      throw new ErrorHandler(
        "This facility cannot receive in-app messages yet",
        404,
      );
    }
  }

  if (snfPartnerId && !support) {
    const partnerId = String(snfPartnerId).trim();
    if (
      !isAdminStaffUser(reqUser) &&
      !(await userHasScannedSnfPartner(reqUser._id, partnerId))
    ) {
      throw new ErrorHandler("You can only message SNF partners you have scanned", 403);
    }
    const partner = await SnfPartner.findById(partnerId).select("facilityUserId name");
    if (!partner?.facilityUserId) {
      throw new ErrorHandler("This SNF partner cannot receive messages yet", 404);
    }
    peerId = partner.facilityUserId;
  }

  if (!peerId) throw new ErrorHandler("Recipient is required", 400);

  const peer = await User.findById(peerId).select("name email role user_type is_blocked");
  if (!peer || peer.is_blocked) throw new ErrorHandler("User not found", 404);

  if (!isAdminStaffUser(reqUser) && !support) {
    const allowed = await userCanMessagePeer(reqUser, peer);
    if (!allowed) {
      throw new ErrorHandler(
        "You can only message CareMatch facilities, support, or scanned SNF partners",
        403,
      );
    }
  }

  if (String(peerId) === String(reqUser._id)) {
    throw new ErrorHandler("You cannot message yourself", 400);
  }

  const conversation = await getOrCreateConversation(reqUser._id, peerId);
  const serialized = await serializeConversation(conversation, reqUser._id);
  return serialized;
};

export const getConversationMessages = async (reqUser, conversationId) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw new ErrorHandler("Conversation not found", 404);

  const isParticipant = conversation.participantIds.some(
    (id) => String(id) === String(reqUser._id),
  );
  if (!isParticipant) {
    throw new ErrorHandler("Not allowed to view this conversation", 403);
  }

  const messages = await Message.find({ conversationId: conversation._id })
    .sort({ createdAt: 1 })
    .limit(200)
    .lean();

  const senderIds = [...new Set(messages.map((m) => String(m.senderId)))];
  const senders = await User.find({ _id: { $in: senderIds } })
    .select("name email role user_type")
    .lean();
  const byId = new Map(senders.map((s) => [String(s._id), s]));
  const nameLookup = await buildNameLookupMaps(senders);

  const meta = await serializeConversation(conversation, reqUser._id, byId);

  return {
    conversation: meta,
    messages: messages.map((m) =>
      serializeMessage(m, byId.get(String(m.senderId)), nameLookup),
    ),
  };
};

export const createAndEmitMessage = async ({
  conversationId,
  senderId,
  text,
  io,
}) => {
  const trimmed = String(text || "").trim();
  if (!trimmed) throw new ErrorHandler("Message text is required", 400);

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw new ErrorHandler("Conversation not found", 404);

  const sender = await loadUserById(senderId);
  if (!sender) throw new ErrorHandler("Sender not found", 404);

  const isParticipant = conversation.participantIds.some(
    (id) => String(id) === String(senderId),
  );
  if (!isParticipant) {
    throw new ErrorHandler("Not allowed to send in this conversation", 403);
  }

  const message = await Message.create({
    conversationId: conversation._id,
    senderId: sender._id,
    text: trimmed,
    readBy: [sender._id],
  });

  conversation.lastMessageText = trimmed;
  conversation.lastMessageAt = new Date();
  conversation.lastSenderId = sender._id;

  const unread = conversation.unreadCounts instanceof Map
    ? conversation.unreadCounts
    : new Map(Object.entries(conversation.unreadCounts || {}));

  conversation.participantIds.forEach((participantId) => {
    const key = String(participantId);
    if (key === String(senderId)) {
      unread.set(key, 0);
    } else {
      unread.set(key, Number(unread.get(key) || 0) + 1);
    }
  });
  conversation.unreadCounts = unread;
  await conversation.save();

  const serializedMessage = serializeMessage(
    message,
    sender,
    await buildNameLookupMaps([sender]),
  );
  const conversationPayload = await serializeConversation(
    conversation,
    senderId,
  );

  if (io) {
    for (const participantId of conversation.participantIds) {
      const participantKey = String(participantId);
      const peerSerialized = await serializeConversation(
        conversation,
        participantKey,
      );

      io.to(`user:${participantKey}`).emit("message:new", {
        message: serializedMessage,
        conversation: peerSerialized,
      });

      io.to(`user:${participantKey}`).emit("notification:message", {
        type: "new_message",
        conversationId: String(conversation._id),
        preview: trimmed.slice(0, 120),
        senderName: serializedMessage.sender?.name || sender.name,
        senderId: String(sender._id),
        unread: peerSerialized.unread,
        conversation: peerSerialized,
      });
    }
  }

  return { message: serializedMessage, conversation: conversationPayload };
};

export const markConversationRead = async (reqUser, conversationId) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw new ErrorHandler("Conversation not found", 404);

  const isParticipant = conversation.participantIds.some(
    (id) => String(id) === String(reqUser._id),
  );
  if (!isParticipant) {
    throw new ErrorHandler("Not allowed", 403);
  }

  const unread = conversation.unreadCounts instanceof Map
    ? conversation.unreadCounts
    : new Map(Object.entries(conversation.unreadCounts || {}));
  unread.set(String(reqUser._id), 0);
  conversation.unreadCounts = unread;
  await conversation.save();

  await Message.updateMany(
    {
      conversationId: conversation._id,
      senderId: { $ne: reqUser._id },
      readBy: { $ne: reqUser._id },
    },
    { $addToSet: { readBy: reqUser._id } },
  );

  return { success: true };
};

export const getUnreadMessageCount = async (reqUser) => {
  const conversations = await Conversation.find({ participantIds: reqUser._id })
    .select("unreadCounts participantIds");
  let total = 0;
  const viewerKey = String(reqUser._id);
  conversations.forEach((c) => {
    total += getUnreadForUser(c, viewerKey);
  });
  return total;
};
