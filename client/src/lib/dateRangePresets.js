/** Shared analytics / dashboard date-range presets. */

export const PERIOD_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This Week" },
  { value: "last_week", label: "Last Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "this_quarter", label: "This Quarter" },
  { value: "last_quarter", label: "Last Quarter" },
  { value: "this_year", label: "This Year" },
  { value: "last_year", label: "Last Year" },
  { value: "custom", label: "Custom" },
];

export const DEFAULT_PERIOD = "this_month";

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
 * Resolve a preset (or custom from/to) to inclusive calendar bounds.
 * @returns {{ from: string, to: string, label: string } | null}
 */
export function resolveDateRange(period, customFrom, customTo) {
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
    case "custom": {
      const a = parseYmd(customFrom);
      const b = parseYmd(customTo);
      if (!a || !b) return null;
      from = startOfDay(a <= b ? a : b);
      to = endOfDay(a <= b ? b : a);
      break;
    }
    default:
      from = startOfDay(new Date(today.getFullYear(), today.getMonth(), 1));
      to = endOfDay(today);
  }

  const opt = PERIOD_OPTIONS.find((o) => o.value === period);
  return {
    from: toYmd(from),
    to: toYmd(to),
    label: opt?.label || "This Month",
  };
}

export function periodLabel(period) {
  return PERIOD_OPTIONS.find((o) => o.value === period)?.label || "This Month";
}
