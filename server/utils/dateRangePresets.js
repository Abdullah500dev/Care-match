/**
 * Analytics date-range presets (mirrors client/src/lib/dateRangePresets.js).
 */

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function toYmd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYmd(ymd) {
  if (!ymd || typeof ymd !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function startOfWeekSunday(d) {
  const x = startOfDay(d);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

function quarterStart(d) {
  const q = Math.floor(d.getMonth() / 3);
  return startOfDay(new Date(d.getFullYear(), q * 3, 1));
}

/**
 * Resolve query period / from / to into Date bounds.
 * Supports: period=today|yesterday|...|custom with from&to, or legacy days=.
 */
export function resolveAnalyticsRange(query = {}) {
  const period = String(query.period || "").trim() || null;
  const fromParam = query.from;
  const toParam = query.to;

  if (fromParam && toParam) {
    const a = parseYmd(fromParam);
    const b = parseYmd(toParam);
    if (a && b) {
      const from = startOfDay(a <= b ? a : b);
      const to = endOfDay(a <= b ? b : a);
      return {
        from,
        to,
        fromYmd: toYmd(from),
        toYmd: toYmd(to),
        period: period || "custom",
      };
    }
  }

  const now = new Date();
  const today = startOfDay(now);
  let from;
  let to = endOfDay(today);

  switch (period) {
    case "today":
      from = today;
      to = endOfDay(today);
      break;
    case "yesterday": {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      from = startOfDay(y);
      to = endOfDay(y);
      break;
    }
    case "this_week":
      from = startOfWeekSunday(today);
      to = endOfDay(today);
      break;
    case "last_week": {
      const thisSun = startOfWeekSunday(today);
      const lastSun = new Date(thisSun);
      lastSun.setDate(lastSun.getDate() - 7);
      const lastSat = new Date(thisSun);
      lastSat.setDate(lastSat.getDate() - 1);
      from = startOfDay(lastSun);
      to = endOfDay(lastSat);
      break;
    }
    case "this_month":
      from = startOfDay(new Date(today.getFullYear(), today.getMonth(), 1));
      to = endOfDay(today);
      break;
    case "last_month": {
      const firstThis = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDayPrev = new Date(firstThis);
      lastDayPrev.setDate(0);
      from = startOfDay(new Date(lastDayPrev.getFullYear(), lastDayPrev.getMonth(), 1));
      to = endOfDay(lastDayPrev);
      break;
    }
    case "this_quarter":
      from = quarterStart(today);
      to = endOfDay(today);
      break;
    case "last_quarter": {
      const thisQ = quarterStart(today);
      const lastQEnd = new Date(thisQ);
      lastQEnd.setDate(0);
      from = quarterStart(lastQEnd);
      to = endOfDay(lastQEnd);
      break;
    }
    case "this_year":
      from = startOfDay(new Date(today.getFullYear(), 0, 1));
      to = endOfDay(today);
      break;
    case "last_year":
      from = startOfDay(new Date(today.getFullYear() - 1, 0, 1));
      to = endOfDay(new Date(today.getFullYear() - 1, 11, 31));
      break;
    default: {
      // Legacy days=N (clamped 1–366)
      const days = Math.min(Math.max(Number(query.days) || 30, 1), 366);
      from = startOfDay(new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000));
      to = endOfDay(today);
      return {
        from,
        to,
        fromYmd: toYmd(from),
        toYmd: toYmd(to),
        period: period || "legacy_days",
        days,
      };
    }
  }

  return {
    from,
    to,
    fromYmd: toYmd(from),
    toYmd: toYmd(to),
    period: period || "this_month",
  };
}

/** Inclusive list of YYYY-MM-DD keys from from..to */
export function eachDayYmd(from, to) {
  const keys = [];
  const cur = startOfDay(from);
  const end = startOfDay(to);
  while (cur <= end) {
    keys.push(toYmd(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return keys;
}
