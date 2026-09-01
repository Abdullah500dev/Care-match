import catchAsyncError from "../middleware/catchAsyncErrors.js";
import ErrorHandler from "../utils/errorHandler.js";
import Lead, { LEAD_STATUS_VALUES } from "../models/leadModel.js";
import User from "../models/userModel.js";
import Facility from "../models/facilityModel.js";
import {
  eachDayYmd,
  resolveAnalyticsRange,
} from "../utils/dateRangePresets.js";

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

const normalizeFacilityValue = (value) => {
  const s = String(value || "").trim();
  if (!s || /^n\/?a$/i.test(s) || s === "—" || s === "-") return "";
  return s;
};

const mapLead = (lead, facilityLookup = {}) => {
  const linked =
    (lead.facilityId && facilityLookup[String(lead.facilityId)]) ||
    (lead.facilityName &&
      facilityLookup[`name:${String(lead.facilityName).trim().toLowerCase()}`]) ||
    null;

  return {
    id: lead._id,
    userId: lead.userId ? String(lead.userId) : "",
    initials: initialsFromName(lead.userName),
    name: lead.userName || "Unknown",
    email: lead.userEmail || "",
    facility: lead.facilityName || linked?.name || "—",
    facilityId: lead.facilityId || linked?._id?.toString?.() || "",
    facilityAddress:
      normalizeFacilityValue(lead.facilityAddress) ||
      normalizeFacilityValue(linked?.address) ||
      "",
    facilityPhone:
      normalizeFacilityValue(lead.facilityPhone) ||
      normalizeFacilityValue(linked?.phone) ||
      normalizeFacilityValue(linked?.phone_number) ||
      "",
    facilityEmail:
      normalizeFacilityValue(lead.facilityEmail) ||
      normalizeFacilityValue(linked?.email) ||
      "",
    facilityZip:
      normalizeFacilityValue(lead.facilityZip) ||
      normalizeFacilityValue(linked?.zip_code) ||
      "",
    careType: "Assisted Living",
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

const escapeRegex = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildFacilityLookup = async (leads) => {
  const ids = [
    ...new Set(
      leads
        .map((l) => String(l.facilityId || "").trim())
        .filter((id) => id && /^[a-f\d]{24}$/i.test(id)),
    ),
  ];
  const externalRefs = [
    ...new Set(
      leads
        .map((l) => String(l.facilityId || "").trim())
        .filter((id) => id && !/^[a-f\d]{24}$/i.test(id)),
    ),
  ];
  const names = [
    ...new Set(leads.map((l) => String(l.facilityName || "").trim()).filter(Boolean)),
  ];

  if (ids.length === 0 && externalRefs.length === 0 && names.length === 0) {
    return {};
  }

  const or = [];
  if (ids.length) or.push({ _id: { $in: ids } });
  if (externalRefs.length) or.push({ external_ref: { $in: externalRefs } });
  for (const n of names) {
    or.push({ name: new RegExp(`^${escapeRegex(n)}$`, "i") });
  }

  let facilities = await Facility.find({ $or: or })
    .select("name address phone email zip_code external_ref")
    .lean();

  // Broaden match if some lead facility names still unresolved
  const matchedNames = new Set(
    facilities.map((f) => String(f.name || "").trim().toLowerCase()),
  );
  const unresolved = names.filter((n) => !matchedNames.has(n.toLowerCase()));
  if (unresolved.length > 0) {
    const extra = await Facility.find()
      .select("name address phone email zip_code external_ref")
      .limit(800)
      .lean();
    const have = new Set(facilities.map((f) => String(f._id)));
    for (const f of extra) {
      if (have.has(String(f._id))) continue;
      const fname = String(f.name || "").trim().toLowerCase();
      if (
        unresolved.some(
          (n) => fname === n.toLowerCase() || fname.includes(n.toLowerCase()) || n.toLowerCase().includes(fname),
        )
      ) {
        facilities.push(f);
        have.add(String(f._id));
      }
    }
  }

  const lookup = {};
  for (const f of facilities) {
    lookup[String(f._id)] = f;
    if (f.external_ref) lookup[String(f.external_ref)] = f;
    lookup[`name:${String(f.name || "").trim().toLowerCase()}`] = f;
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
  const mapped = leads.map((lead) => mapLead(lead, facilityLookup));

  // Persist hydrated facility details onto older leads that are missing them
  const backfills = [];
  for (let i = 0; i < leads.length; i += 1) {
    const raw = leads[i];
    const mappedLead = mapped[i];
    const needs =
      (!normalizeFacilityValue(raw.facilityAddress) && mappedLead.facilityAddress) ||
      (!normalizeFacilityValue(raw.facilityPhone) && mappedLead.facilityPhone) ||
      (!normalizeFacilityValue(raw.facilityEmail) && mappedLead.facilityEmail) ||
      (!normalizeFacilityValue(raw.facilityZip) && mappedLead.facilityZip);
    if (!needs) continue;
    backfills.push(
      Lead.updateOne(
        { _id: raw._id },
        {
          $set: {
            facilityAddress: mappedLead.facilityAddress || raw.facilityAddress || "",
            facilityPhone: mappedLead.facilityPhone || raw.facilityPhone || "",
            facilityEmail: mappedLead.facilityEmail || raw.facilityEmail || "",
            facilityZip: mappedLead.facilityZip || raw.facilityZip || "",
          },
        },
      ),
    );
  }
  if (backfills.length) {
    Promise.allSettled(backfills).catch(() => {});
  }

  return res.status(200).json({
    success: true,
    count: mapped.length,
    leads: mapped,
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

  const range = resolveAnalyticsRange(req.query);
  const { from, to, fromYmd, toYmd, period } = range;
  const dayKeys = eachDayYmd(from, to);
  const days = dayKeys.length;

  const createdInRange = { createdAt: { $gte: from, $lte: to } };

  const [
    allLeads,
    periodLeads,
    facilityCount,
    userCount,
    facilitySignupCount,
    recentUsers,
    recentFacilitySignups,
  ] = await Promise.all([
    Lead.find({ isRemoved: false }).lean(),
    Lead.find({ isRemoved: false, ...createdInRange }).lean(),
    Facility.countDocuments(),
    User.countDocuments({
      role: "user",
      user_type: { $nin: ["admin", "authenticator", "moderator"] },
    }),
    Facility.countDocuments({ is_external: { $ne: true } }),
    User.find({
      role: "user",
      user_type: { $nin: ["admin", "authenticator", "moderator"] },
      ...createdInRange,
    })
      .select("createdAt")
      .lean(),
    Facility.find({
      is_external: { $ne: true },
      ...createdInRange,
    })
      .select("createdAt")
      .lean(),
  ]);

  const byStatus = {};
  for (const s of LEAD_STATUS_VALUES) byStatus[s] = 0;
  for (const lead of periodLeads) {
    const key = lead.status || "New";
    byStatus[key] = (byStatus[key] || 0) + 1;
  }

  const inquiries = periodLeads.length;
  const emailOpened = periodLeads.filter(
    (l) => l.emailOpened || l.status === "Email Opened",
  ).length;
  const contacted = periodLeads.filter((l) =>
    ["Contacted", "Tour Scheduled"].includes(l.status),
  ).length;
  const visits = inquiries; // Explore click = facility interest / visit signal

  const careTypeMap = { "Assisted Living": periodLeads.length };
  const byCareType = Object.entries(careTypeMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const facilityMap = {};
  for (const lead of periodLeads) {
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
    .slice(0, 25);

  const localYmd = (d) => {
    const x = new Date(d);
    const y = x.getFullYear();
    const m = String(x.getMonth() + 1).padStart(2, "0");
    const day = String(x.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const localHour = (d) => new Date(d).getHours();

  let timeline;
  let usersTimeline;
  let facilitiesTimeline;
  let granularity = "day";

  // Today / Yesterday (single calendar day): hourly buckets so charts have real points
  if (days === 1) {
    granularity = "hour";
    const hourKeys = Array.from({ length: 24 }, (_, h) => h);
    const hourly = Object.fromEntries(
      hourKeys.map((h) => [h, { visits: 0, inquiries: 0, users: 0, facilities: 0 }]),
    );
    for (const lead of periodLeads) {
      const h = localHour(lead.createdAt);
      hourly[h].visits += 1;
      hourly[h].inquiries += 1;
    }
    for (const u of recentUsers) {
      hourly[localHour(u.createdAt)].users += 1;
    }
    for (const f of recentFacilitySignups) {
      hourly[localHour(f.createdAt)].facilities += 1;
    }
    const hourLabel = (h) =>
      `${String(h).padStart(2, "0")}:00`;
    timeline = hourKeys.map((h) => ({
      date: `${fromYmd}T${hourLabel(h)}`,
      label: hourLabel(h),
      visits: hourly[h].visits,
      inquiries: hourly[h].inquiries,
    }));
    usersTimeline = hourKeys.map((h) => ({
      date: `${fromYmd}T${hourLabel(h)}`,
      label: hourLabel(h),
      users: hourly[h].users,
    }));
    facilitiesTimeline = hourKeys.map((h) => ({
      date: `${fromYmd}T${hourLabel(h)}`,
      label: hourLabel(h),
      facilities: hourly[h].facilities,
    }));
  } else {
    const dailyCounts = Object.fromEntries(
      dayKeys.map((k) => [k, { visits: 0, inquiries: 0, users: 0, facilities: 0 }]),
    );
    for (const lead of periodLeads) {
      const key = localYmd(lead.createdAt);
      if (!dailyCounts[key]) continue;
      dailyCounts[key].visits += 1;
      dailyCounts[key].inquiries += 1;
    }
    for (const u of recentUsers) {
      const key = localYmd(u.createdAt);
      if (!dailyCounts[key]) continue;
      dailyCounts[key].users += 1;
    }
    for (const f of recentFacilitySignups) {
      const key = localYmd(f.createdAt);
      if (!dailyCounts[key]) continue;
      dailyCounts[key].facilities += 1;
    }
    timeline = dayKeys.map((date) => ({
      date,
      label: date.slice(5),
      visits: dailyCounts[date].visits,
      inquiries: dailyCounts[date].inquiries,
    }));
    usersTimeline = dayKeys.map((date) => ({
      date,
      label: date.slice(5),
      users: dailyCounts[date].users,
    }));
    facilitiesTimeline = dayKeys.map((date) => ({
      date,
      label: date.slice(5),
      facilities: dailyCounts[date].facilities,
    }));
  }

  return res.status(200).json({
    success: true,
    period,
    from: fromYmd,
    to: toYmd,
    days,
    granularity,
    summary: {
      facilitiesListed: facilityCount,
      facilitiesSignedUp: facilitySignupCount,
      totalUsers: userCount,
      userVisits: visits,
      inquiriesSent: inquiries,
      emailsOpened: emailOpened,
      contacted,
      recentInquiries: periodLeads.length,
      recentUsers: recentUsers.length,
      recentFacilitySignups: recentFacilitySignups.length,
      allTimeInquiries: allLeads.length,
      conversionRate:
        visits > 0 ? Number(((contacted / visits) * 100).toFixed(1)) : 0,
    },
    byStatus,
    byCareType,
    topFacilities,
    timeline,
    usersTimeline,
    facilitiesTimeline,
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

  const or = [];
  if (facilityId) {
    or.push({ facilityId });
    if (!facilityId.startsWith("owned-")) {
      or.push({ facilityId: `owned-${facilityId}` });
    }
  }
  if (facilityName) {
    or.push({ facilityName });
  }

  const filter = { isRemoved: false };
  if (or.length === 1) {
    Object.assign(filter, or[0]);
  } else if (or.length > 1) {
    filter.$or = or;
  }

  const leads = await Lead.find(filter).sort({ createdAt: -1 }).limit(200).lean();
  return res.status(200).json(buildFacilityAnalyticsPayload(leads, facilityId, facilityName));
});

/**
 * Facility account: analytics for their own listing.
 * GET /api/email/analytics/me
 */
export const getMyFacilityAnalytics = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.user?.id).select("role");
  if (!user || user.role !== "facility") {
    return next(new ErrorHandler("Facility account only", 403));
  }

  const facility = await Facility.findOne({ user_id: user._id }).lean();
  if (!facility) {
    return next(new ErrorHandler("Facility profile not found", 404));
  }

  const idStr = String(facility._id);
  const ownedKey = `owned-${idStr}`;
  const name = String(facility.name || "").trim();
  const email = String(facility.email || "").trim().toLowerCase();

  const or = [{ facilityId: ownedKey }, { facilityId: idStr }];
  if (name) or.push({ facilityName: name });
  if (email && !/@external\.carematch\.local$/i.test(email)) {
    or.push({ facilityEmail: email });
  }

  const leads = await Lead.find({ isRemoved: false, $or: or })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  return res.status(200).json(
    buildFacilityAnalyticsPayload(leads, ownedKey, name || "Your facility"),
  );
});

const buildFacilityAnalyticsPayload = (leads, facilityId, facilityName) => {
  const list = Array.isArray(leads) ? leads : [];
  const visits = list.length;
  const inquiries = list.length;
  const emailsOpened = list.filter(
    (l) => l.emailOpened || l.status === "Email Opened",
  ).length;
  const contacted = list.filter((l) =>
    ["Contacted", "Tour Scheduled"].includes(l.status),
  ).length;

  const byStatus = {};
  for (const lead of list) {
    const key = lead.status || "New";
    byStatus[key] = (byStatus[key] || 0) + 1;
  }

  const recent = list.slice(0, 10).map((l) => ({
    id: l._id,
    name: l.userName || "Unknown",
    email: l.userEmail || "",
    status: l.status || "New",
    careType: l.careType || "—",
    createdAt: l.createdAt,
    emailOpened: Boolean(l.emailOpened),
  }));

  return {
    success: true,
    facilityId,
    facilityName: facilityName || list[0]?.facilityName || "Facility",
    summary: {
      userVisited: visits,
      inquiriesSent: inquiries,
      emailsOpened,
      contacted,
      peopleReached: visits,
    },
    byStatus,
    recent,
  };
};

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
