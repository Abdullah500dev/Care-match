import catchAsyncError from "../middleware/catchAsyncErrors.js";
import ErrorHandler from "../utils/errorHandler.js";
import Lead, { LEAD_STATUS_VALUES } from "../models/leadModel.js";
import User from "../models/userModel.js";
import Facility from "../models/facilityModel.js";

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

const mapLead = (lead, facilityLookup = {}) => {
  const linked =
    (lead.facilityId && facilityLookup[String(lead.facilityId)]) ||
    (lead.facilityName && facilityLookup[`name:${String(lead.facilityName).toLowerCase()}`]) ||
    null;

  return {
    id: lead._id,
    initials: initialsFromName(lead.userName),
    name: lead.userName || "Unknown",
    email: lead.userEmail || "",
    facility: lead.facilityName || linked?.name || "—",
    facilityId: lead.facilityId || linked?._id?.toString?.() || "",
    facilityAddress: lead.facilityAddress || linked?.address || "",
    facilityPhone: lead.facilityPhone || linked?.phone || "",
    facilityEmail: lead.facilityEmail || linked?.email || "",
    facilityZip: lead.facilityZip || linked?.zip_code || "",
    careType: lead.careType || "—",
    status: lead.status || "New",
    destinationUrl: lead.destinationUrl || "",
    sourcePlatform: lead.sourcePlatform || "",
    emailOpened: Boolean(lead.emailOpened),
    emailOpenedAt: lead.emailOpenedAt,
    emailOpenCount: lead.emailOpenCount || 0,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };
};

const buildFacilityLookup = async (leads) => {
  const ids = [
    ...new Set(
      leads
        .map((l) => String(l.facilityId || "").trim())
        .filter((id) => id && /^[a-f\d]{24}$/i.test(id)),
    ),
  ];
  const names = [
    ...new Set(leads.map((l) => String(l.facilityName || "").trim()).filter(Boolean)),
  ];

  if (ids.length === 0 && names.length === 0) return {};

  const or = [];
  if (ids.length) or.push({ _id: { $in: ids } });
  if (names.length) or.push({ name: { $in: names } });

  const facilities = await Facility.find({ $or: or })
    .select("name address phone email zip_code")
    .lean();

  const lookup = {};
  for (const f of facilities) {
    lookup[String(f._id)] = f;
    lookup[`name:${String(f.name || "").toLowerCase()}`] = f;
  }
  return lookup;
};

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
    filter.$or = [
      { userName: rx },
      { userEmail: rx },
      { facilityName: rx },
      { facilityAddress: rx },
      { facilityZip: rx },
    ];
  }

  const leads = await Lead.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  const facilityLookup = await buildFacilityLookup(leads);

  return res.status(200).json({
    success: true,
    count: leads.length,
    leads: leads.map((lead) => mapLead(lead, facilityLookup)),
  });
});

/**
 * Website / admin analytics summary.
 * GET /api/email/analytics
 */
export const getWebsiteAnalytics = catchAsyncError(async (req, res, next) => {
  if (!(await requireAdmin(req.user?.id))) {
    return next(new ErrorHandler("Admin only", 403));
  }

  const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 90);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [allLeads, recentLeads, facilityCount] = await Promise.all([
    Lead.find({ isRemoved: false }).lean(),
    Lead.find({ isRemoved: false, createdAt: { $gte: since } }).lean(),
    Facility.countDocuments(),
  ]);

  const byStatus = {};
  for (const s of LEAD_STATUS_VALUES) byStatus[s] = 0;
  for (const lead of allLeads) {
    const key = lead.status || "New";
    byStatus[key] = (byStatus[key] || 0) + 1;
  }

  const inquiries = allLeads.length;
  const emailOpened = allLeads.filter((l) => l.emailOpened || l.status === "Email Opened").length;
  const contacted = allLeads.filter((l) =>
    ["Contacted", "Tour Scheduled"].includes(l.status),
  ).length;
  const visits = inquiries; // Explore click = facility interest / visit signal

  const careTypeMap = {};
  for (const lead of allLeads) {
    const ct = String(lead.careType || "Other").trim() || "Other";
    careTypeMap[ct] = (careTypeMap[ct] || 0) + 1;
  }
  const byCareType = Object.entries(careTypeMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const facilityMap = {};
  for (const lead of allLeads) {
    const key = lead.facilityId || lead.facilityName || "Unknown";
    if (!facilityMap[key]) {
      facilityMap[key] = {
        facilityId: lead.facilityId || "",
        facilityName: lead.facilityName || "Unknown",
        visits: 0,
        inquiries: 0,
        emailOpened: 0,
      };
    }
    facilityMap[key].visits += 1;
    facilityMap[key].inquiries += 1;
    if (lead.emailOpened || lead.status === "Email Opened") {
      facilityMap[key].emailOpened += 1;
    }
  }
  const topFacilities = Object.values(facilityMap)
    .sort((a, b) => b.inquiries - a.inquiries)
    .slice(0, 8);

  // Daily series for the selected window
  const dayKeys = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    dayKeys.push(d.toISOString().slice(0, 10));
  }
  const dailyCounts = Object.fromEntries(dayKeys.map((k) => [k, { visits: 0, inquiries: 0 }]));
  for (const lead of recentLeads) {
    const key = new Date(lead.createdAt).toISOString().slice(0, 10);
    if (!dailyCounts[key]) continue;
    dailyCounts[key].visits += 1;
    dailyCounts[key].inquiries += 1;
  }
  const timeline = dayKeys.map((date) => ({
    date,
    label: date.slice(5),
    visits: dailyCounts[date].visits,
    inquiries: dailyCounts[date].inquiries,
  }));

  return res.status(200).json({
    success: true,
    days,
    summary: {
      facilitiesListed: facilityCount,
      userVisits: visits,
      inquiriesSent: inquiries,
      emailsOpened: emailOpened,
      contacted,
      recentInquiries: recentLeads.length,
      conversionRate:
        visits > 0 ? Number(((contacted / visits) * 100).toFixed(1)) : 0,
    },
    byStatus,
    byCareType,
    topFacilities,
    timeline,
  });
});

/**
 * Per-facility analytics (visits & inquiries).
 * GET /api/email/analytics/facility
 */
export const getFacilityAnalytics = catchAsyncError(async (req, res, next) => {
  if (!(await requireAdmin(req.user?.id))) {
    return next(new ErrorHandler("Admin only", 403));
  }

  const facilityId = String(req.query.facilityId || "").trim();
  const facilityName = String(req.query.facilityName || "").trim();

  if (!facilityId && !facilityName) {
    return next(new ErrorHandler("facilityId or facilityName is required", 400));
  }

  const filter = { isRemoved: false };
  if (facilityId && facilityName) {
    filter.$or = [{ facilityId }, { facilityName }];
  } else if (facilityId) {
    filter.facilityId = facilityId;
  } else {
    filter.facilityName = facilityName;
  }

  const leads = await Lead.find(filter).sort({ createdAt: -1 }).limit(200).lean();

  const visits = leads.length;
  const inquiries = leads.length;
  const emailsOpened = leads.filter(
    (l) => l.emailOpened || l.status === "Email Opened",
  ).length;
  const contacted = leads.filter((l) =>
    ["Contacted", "Tour Scheduled"].includes(l.status),
  ).length;

  const byStatus = {};
  for (const lead of leads) {
    const key = lead.status || "New";
    byStatus[key] = (byStatus[key] || 0) + 1;
  }

  const recent = leads.slice(0, 10).map((l) => ({
    id: l._id,
    name: l.userName || "Unknown",
    email: l.userEmail || "",
    status: l.status || "New",
    careType: l.careType || "—",
    createdAt: l.createdAt,
    emailOpened: Boolean(l.emailOpened),
  }));

  return res.status(200).json({
    success: true,
    facilityId,
    facilityName: facilityName || leads[0]?.facilityName || "Facility",
    summary: {
      userVisited: visits,
      inquiriesSent: inquiries,
      emailsOpened,
      contacted,
    },
    byStatus,
    recent,
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
