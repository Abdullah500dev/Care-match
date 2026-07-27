import catchAsyncError from "../middleware/catchAsyncErrors.js";
import ErrorHandler from "../utils/errorHandler.js";
import Lead, { LEAD_STATUS_VALUES } from "../models/leadModel.js";
import User from "../models/userModel.js";

const requireAdmin = async (userId) => {
  const dbUser = await User.findById(userId).select("role user_type");
  if (!dbUser || (dbUser.role !== "admin" && dbUser.user_type !== "admin")) {
    return null;
  }
  return dbUser;
};

const initialsFromName = (name) => {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
};

const mapLead = (lead) => ({
  id: lead._id,
  initials: initialsFromName(lead.userName),
  name: lead.userName || "Unknown",
  email: lead.userEmail || "",
  facility: lead.facilityName || "—",
  facilityId: lead.facilityId || "",
  careType: lead.careType || "—",
  status: lead.status || "New",
  destinationUrl: lead.destinationUrl || "",
  sourcePlatform: lead.sourcePlatform || "",
  emailOpened: Boolean(lead.emailOpened),
  emailOpenedAt: lead.emailOpenedAt,
  emailOpenCount: lead.emailOpenCount || 0,
  createdAt: lead.createdAt,
  updatedAt: lead.updatedAt,
});

/**
 * Clear false "Email Opened" rows (manual repair helper; not run automatically).
 */
export const repairFalseEmailOpenedLeads = async () => {
  const result = await Lead.updateMany(
    {
      isRemoved: false,
      $or: [{ status: "Email Opened" }, { emailOpened: true }],
    },
    {
      $set: {
        status: "New",
        emailOpened: false,
        emailOpenedAt: null,
        confirmedOpen: false,
        emailOpenCount: 0,
      },
    },
  );
  const n = result?.modifiedCount || result?.nModified || 0;
  if (n > 0) {
    console.log(`[leads] reset ${n} Email Opened lead(s) → New`);
  }
  return n;
};

/**
 * Admin leads list — Explore creates New; opening the notify email sets Email Opened.
 * GET /api/email/leads
 */
export const listLeads = catchAsyncError(async (req, res, next) => {
  if (!(await requireAdmin(req.user?.id))) {
    return next(new ErrorHandler("Admin only", 403));
  }

  const limit = Math.min(Number(req.query.limit) || 100, 300);
  const q = String(req.query.q || "").trim();
  const status = String(req.query.status || "").trim();

  const filter = {
    isRemoved: false,
  };

  if (status && LEAD_STATUS_VALUES.includes(status)) {
    filter.status = status;
  }

  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ userName: rx }, { userEmail: rx }, { facilityName: rx }];
  }

  const leads = await Lead.find(filter).sort({ createdAt: -1 }).limit(limit).lean();

  return res.status(200).json({
    success: true,
    count: leads.length,
    leads: leads.map(mapLead),
  });
});

/**
 * Update lead status.
 * PATCH /api/email/leads/:id
 */
export const updateLead = catchAsyncError(async (req, res, next) => {
  if (!(await requireAdmin(req.user?.id))) {
    return next(new ErrorHandler("Admin only", 403));
  }

  const lead = await Lead.findById(req.params.id);
  if (!lead || lead.isRemoved) {
    return next(new ErrorHandler("Lead not found", 404));
  }

  const nextStatus = String(req.body?.status || "").trim();
  if (!LEAD_STATUS_VALUES.includes(nextStatus)) {
    return next(new ErrorHandler("Invalid status", 400));
  }

  lead.status = nextStatus;
  if (nextStatus === "Email Opened") {
    lead.emailOpened = true;
    lead.emailOpenedAt = lead.emailOpenedAt || new Date();
    lead.confirmedOpen = true;
  }
  await lead.save();

  return res.status(200).json({ success: true, lead: mapLead(lead) });
});

/**
 * Soft-remove a lead from the admin list.
 * DELETE /api/email/leads/:id
 */
export const removeLead = catchAsyncError(async (req, res, next) => {
  if (!(await requireAdmin(req.user?.id))) {
    return next(new ErrorHandler("Admin only", 403));
  }

  const lead = await Lead.findById(req.params.id);
  if (!lead || lead.isRemoved) {
    return next(new ErrorHandler("Lead not found", 404));
  }

  lead.isRemoved = true;
  await lead.save();

  return res.status(200).json({ success: true });
});
