import React, { useCallback, useEffect, useMemo, useState } from "react";
import SEO from "@/components/common/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  Eye,
  MessageSquare,
  TrendingUp,
  Loader2,
  Users,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/services/api";
import DateRangeFilter from "@/components/common/DateRangeFilter";
import {
  DEFAULT_PERIOD,
  periodLabel,
  resolveDateRange,
} from "@/lib/dateRangePresets";

const CARE_TYPE_PAGE_SIZE = 5;
const FACILITY_PAGE_SIZE = 5;

const chartConfig = {
  visits: { label: "Visits", color: "#00B8DB" },
  inquiries: { label: "Inquiries", color: "#6366F1" },
};

const usersChartConfig = {
  users: { label: "Users", color: "#00B8DB" },
};

const facilitiesChartConfig = {
  facilities: { label: "Facilities", color: "#00B8DB" },
};

function defaultCustomBounds() {
  const r = resolveDateRange("this_month");
  return { from: r.from, to: r.to };
}

function useSectionRangeFilter(initialPeriod = DEFAULT_PERIOD) {
  const [period, setPeriod] = useState(initialPeriod);
  const [customFrom, setCustomFrom] = useState(() => defaultCustomBounds().from);
  const [customTo, setCustomTo] = useState(() => defaultCustomBounds().to);
  const range = useMemo(
    () => resolveDateRange(period, customFrom, customTo),
    [period, customFrom, customTo],
  );
  const onCustomChange = useCallback(({ from, to }) => {
    setCustomFrom(from);
    setCustomTo(to);
  }, []);
  return {
    period,
    setPeriod,
    customFrom,
    customTo,
    onCustomChange,
    range,
    label: periodLabel(period),
  };
}

async function fetchAnalyticsRange(period, range) {
  const { data: res } = await apiClient.get("/api/email/analytics", {
    params: { period, from: range.from, to: range.to },
  });
  return res;
}

export default function Analytics() {
  const [period, setPeriod] = useState(DEFAULT_PERIOD);
  const [customFrom, setCustomFrom] = useState(() => defaultCustomBounds().from);
  const [customTo, setCustomTo] = useState(() => defaultCustomBounds().to);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [carePage, setCarePage] = useState(1);
  const [facilityPage, setFacilityPage] = useState(1);

  const usersFilter = useSectionRangeFilter(DEFAULT_PERIOD);
  const facilitiesFilter = useSectionRangeFilter(DEFAULT_PERIOD);
  const [usersLoading, setUsersLoading] = useState(true);
  const [facilitiesLoading, setFacilitiesLoading] = useState(true);
  const [usersSection, setUsersSection] = useState(null);
  const [facilitiesSection, setFacilitiesSection] = useState(null);

  const range = useMemo(
    () => resolveDateRange(period, customFrom, customTo),
    [period, customFrom, customTo],
  );
  const rangeLabel = periodLabel(period);

  const fetchAnalytics = useCallback(async () => {
    if (!range) return;
    setLoading(true);
    try {
      const res = await fetchAnalyticsRange(period, range);
      setData(res);
      setCarePage(1);
      setFacilityPage(1);
    } catch (err) {
      console.error(err);
      toast.error("Could not load analytics", {
        description: err?.response?.data?.message || "Please try again.",
      });
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period, range]);

  const fetchUsersSection = useCallback(async () => {
    if (!usersFilter.range) return;
    setUsersLoading(true);
    try {
      const res = await fetchAnalyticsRange(usersFilter.period, usersFilter.range);
      setUsersSection(res);
    } catch (err) {
      console.error(err);
      toast.error("Could not load users chart");
      setUsersSection(null);
    } finally {
      setUsersLoading(false);
    }
  }, [usersFilter.period, usersFilter.range]);

  const fetchFacilitiesSection = useCallback(async () => {
    if (!facilitiesFilter.range) return;
    setFacilitiesLoading(true);
    try {
      const res = await fetchAnalyticsRange(
        facilitiesFilter.period,
        facilitiesFilter.range,
      );
      setFacilitiesSection(res);
    } catch (err) {
      console.error(err);
      toast.error("Could not load facilities chart");
      setFacilitiesSection(null);
    } finally {
      setFacilitiesLoading(false);
    }
  }, [facilitiesFilter.period, facilitiesFilter.range]);

  useEffect(() => {
    if (period === "custom" && (!customFrom || !customTo)) return;
    fetchAnalytics();
  }, [fetchAnalytics, period, customFrom, customTo]);

  useEffect(() => {
    if (
      usersFilter.period === "custom" &&
      (!usersFilter.customFrom || !usersFilter.customTo)
    ) {
      return;
    }
    fetchUsersSection();
  }, [
    fetchUsersSection,
    usersFilter.period,
    usersFilter.customFrom,
    usersFilter.customTo,
  ]);

  useEffect(() => {
    if (
      facilitiesFilter.period === "custom" &&
      (!facilitiesFilter.customFrom || !facilitiesFilter.customTo)
    ) {
      return;
    }
    fetchFacilitiesSection();
  }, [
    fetchFacilitiesSection,
    facilitiesFilter.period,
    facilitiesFilter.customFrom,
    facilitiesFilter.customTo,
  ]);

  const summary = data?.summary || {};
  const timeline = Array.isArray(data?.timeline) ? data.timeline : [];
  const usersTimeline = Array.isArray(usersSection?.usersTimeline)
    ? usersSection.usersTimeline
    : [];
  const facilitiesTimeline = Array.isArray(facilitiesSection?.facilitiesTimeline)
    ? facilitiesSection.facilitiesTimeline
    : [];
  const usersSummary = usersSection?.summary || {};
  const facilitiesSummary = facilitiesSection?.summary || {};
  const xTickInterval =
    timeline.length > 14 ? Math.ceil(timeline.length / 8) - 1 : 0;
  const usersTickInterval =
    usersTimeline.length > 14 ? Math.ceil(usersTimeline.length / 8) - 1 : 0;
  const facilitiesTickInterval =
    facilitiesTimeline.length > 14
      ? Math.ceil(facilitiesTimeline.length / 8) - 1
      : 0;
  const byCareType = Array.isArray(data?.byCareType) ? data.byCareType : [];
  const topFacilities = Array.isArray(data?.topFacilities) ? data.topFacilities : [];
  const byStatus = data?.byStatus || {};

  const careTotalPages = Math.max(1, Math.ceil(byCareType.length / CARE_TYPE_PAGE_SIZE));
  const careSafePage = Math.min(carePage, careTotalPages);
  const pagedCareTypes = useMemo(() => {
    const start = (careSafePage - 1) * CARE_TYPE_PAGE_SIZE;
    return byCareType.slice(start, start + CARE_TYPE_PAGE_SIZE);
  }, [byCareType, careSafePage]);
  const careMax = Math.max(1, ...byCareType.map((c) => Number(c.count) || 0));

  const facilityTotalPages = Math.max(1, Math.ceil(topFacilities.length / FACILITY_PAGE_SIZE));
  const facilitySafePage = Math.min(facilityPage, facilityTotalPages);
  const pagedFacilities = useMemo(() => {
    const start = (facilitySafePage - 1) * FACILITY_PAGE_SIZE;
    return topFacilities.slice(start, start + FACILITY_PAGE_SIZE);
  }, [topFacilities, facilitySafePage]);

  const cards = [
    {
      label: "Number of users",
      value: summary.totalUsers ?? 0,
      icon: Users,
      color: "text-sky-600",
      bg: "bg-sky-100",
      hint: `${summary.recentUsers ?? 0} new in range`,
    },
    {
      label: "Facilities signed up",
      value: summary.facilitiesSignedUp ?? summary.facilitiesListed ?? 0,
      icon: UserPlus,
      color: "text-teal-600",
      bg: "bg-teal-100",
      hint: `${summary.recentFacilitySignups ?? 0} new in range`,
    },
    {
      label: "User visits",
      value: summary.userVisits ?? 0,
      icon: Eye,
      color: "text-amber-600",
      bg: "bg-amber-100",
      hint: "Explore interest clicks",
    },
    {
      label: "Inquiries sent",
      value: summary.inquiriesSent ?? 0,
      icon: MessageSquare,
      color: "text-[#00B8DB]",
      bg: "bg-cyan-100",
      hint: "Notify emails from Explore",
    },
    {
      label: "Conversion rate",
      value: `${summary.conversionRate ?? 0}%`,
      icon: TrendingUp,
      color: "text-violet-600",
      bg: "bg-violet-100",
      hint: "Contacted / visits",
    },
  ];

  return (
    <div
      className="mx-auto w-full min-w-0 max-w-5xl space-y-6"
      style={{ fontFamily: "Rethink Sans, sans-serif" }}
    >
      <SEO title="Analytics – Admin | CareMatch AI" />

      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
        Analytics
      </h2>
          <p className="mt-1 text-sm text-slate-500 md:text-base">
            Website reporting — visits, inquiries, and facility engagement across CareMatch.
          </p>
        </div>
        <DateRangeFilter
          period={period}
          customFrom={customFrom}
          customTo={customTo}
          onPeriodChange={setPeriod}
          onCustomChange={({ from, to }) => {
            setCustomFrom(from);
            setCustomTo(to);
          }}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading website analytics…
        </div>
      ) : (
        <>
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <Card
                  key={card.label}
                  className="rounded-2xl border-slate-200 bg-white shadow-sm"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                          {card.label}
                        </p>
                        <p className="mt-2 text-2xl font-bold text-slate-900">{card.value}</p>
                        {card.hint && (
                          <p className="mt-1 text-[11px] text-slate-400">{card.hint}</p>
                        )}
                      </div>
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.bg}`}
                      >
                        <Icon className={`h-4 w-4 ${card.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-5">
            <Card className="rounded-2xl border-slate-200 lg:col-span-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-slate-900">
                  Visits &amp; inquiries ({rangeLabel})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {timeline.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-400">No activity in this range.</p>
                ) : (
                  <ChartContainer config={chartConfig} className="h-[260px] w-full">
                    <AreaChart data={timeline}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        fontSize={11}
                        interval={xTickInterval}
                        minTickGap={8}
                      />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area
                        type="monotone"
                        dataKey="visits"
                        stroke="#00B8DB"
                        fill="#00B8DB"
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="inquiries"
                        stroke="#6366F1"
                        fill="#6366F1"
                        fillOpacity={0.1}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200 lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-slate-900">
                  Lead status mix
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.keys(byStatus).length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">No lead data yet.</p>
                ) : (
                  Object.entries(byStatus).map(([status, count]) => (
                    <div
                      key={status}
                      className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
                    >
                      <span className="text-sm font-medium text-slate-700">{status}</span>
                      <span className="text-sm font-bold text-slate-900">{count}</span>
                    </div>
                  ))
                )}
                {summary.recentInquiries != null && (
                  <p className="pt-2 text-xs text-slate-400">
                    {summary.recentInquiries} inquiries · {rangeLabel}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="rounded-2xl border-slate-200">
              <CardHeader className="pb-2">
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <CardTitle className="text-base font-bold text-slate-900">
                    Number of users ({usersFilter.label})
                  </CardTitle>
                  <DateRangeFilter
                    period={usersFilter.period}
                    customFrom={usersFilter.customFrom}
                    customTo={usersFilter.customTo}
                    onPeriodChange={usersFilter.setPeriod}
                    onCustomChange={usersFilter.onCustomChange}
                    showRangeHint={false}
                    triggerClassName="h-8 w-[150px] text-xs"
                    className="shrink-0"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading…
                  </div>
                ) : usersTimeline.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-400">No user signups in this range.</p>
                ) : (
                  <ChartContainer config={usersChartConfig} className="h-[260px] w-full">
                    <AreaChart data={usersTimeline}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        fontSize={11}
                        interval={usersTickInterval}
                        minTickGap={8}
                      />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area
                        type="monotone"
                        dataKey="users"
                        stroke="#00B8DB"
                        fill="#00B8DB"
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ChartContainer>
                )}
                <p className="mt-2 text-xs text-slate-400">
                  Total users:{" "}
                  <span className="font-semibold text-slate-700">
                    {usersSummary.totalUsers ?? summary.totalUsers ?? 0}
                  </span>
                  {" · "}
                  New in range:{" "}
                  <span className="font-semibold text-slate-700">
                    {usersSummary.recentUsers ?? 0}
                  </span>
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200">
              <CardHeader className="pb-2">
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <CardTitle className="text-base font-bold text-slate-900">
                    Number of facilities signed up ({facilitiesFilter.label})
                  </CardTitle>
                  <DateRangeFilter
                    period={facilitiesFilter.period}
                    customFrom={facilitiesFilter.customFrom}
                    customTo={facilitiesFilter.customTo}
                    onPeriodChange={facilitiesFilter.setPeriod}
                    onCustomChange={facilitiesFilter.onCustomChange}
                    showRangeHint={false}
                    triggerClassName="h-8 w-[150px] text-xs"
                    className="shrink-0"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {facilitiesLoading ? (
                  <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading…
                  </div>
                ) : facilitiesTimeline.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-400">
                    No facility signups in this range.
                  </p>
                ) : (
                  <ChartContainer config={facilitiesChartConfig} className="h-[260px] w-full">
                    <AreaChart data={facilitiesTimeline}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        fontSize={11}
                        interval={facilitiesTickInterval}
                        minTickGap={8}
                      />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area
                        type="monotone"
                        dataKey="facilities"
                        stroke="#00B8DB"
                        fill="#00B8DB"
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ChartContainer>
                )}
                <p className="mt-2 text-xs text-slate-400">
                  Total signed up:{" "}
                  <span className="font-semibold text-slate-700">
                    {facilitiesSummary.facilitiesSignedUp ??
                      summary.facilitiesSignedUp ??
                      0}
                  </span>
                  {" · "}
                  New in range:{" "}
                  <span className="font-semibold text-slate-700">
                    {facilitiesSummary.recentFacilitySignups ?? 0}
                  </span>
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="rounded-2xl border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-slate-900">
                  By care type
                </CardTitle>
              </CardHeader>
              <CardContent>
                {byCareType.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">No care-type data yet.</p>
                ) : (
                  <div className="space-y-4">
                    <ul className="space-y-3">
                      {pagedCareTypes.map((row) => {
                        const count = Number(row.count) || 0;
                        const pct =
                          count <= 0 || careMax <= 0
                            ? 0
                            : Math.min(
                                100,
                                Math.max(6, Math.round((count / careMax) * 100)),
                              );
                        return (
                          <li key={row.name} className="space-y-1.5">
                            <div className="flex items-start justify-between gap-3">
                              <p className="min-w-0 flex-1 break-words text-sm font-semibold leading-snug text-slate-800">
                                {row.name}
                              </p>
                              <span className="shrink-0 text-sm font-bold text-slate-900">
                                {count}
                              </span>
                            </div>
                            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-[#00B8DB] transition-[width] duration-300"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                    {byCareType.length > CARE_TYPE_PAGE_SIZE && (
                      <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                        <p className="text-xs text-slate-500">
                          Page {careSafePage} of {careTotalPages}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-lg"
                            disabled={careSafePage <= 1}
                            onClick={() => setCarePage((p) => Math.max(1, p - 1))}
                          >
                            Previous
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-lg"
                            disabled={careSafePage >= careTotalPages}
                            onClick={() =>
                              setCarePage((p) => Math.min(careTotalPages, p + 1))
                            }
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-slate-900">
                  Top facilities by inquiries
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topFacilities.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">
                    No facility engagement yet.
                  </p>
                ) : (
                  <div className="space-y-1">
                    <ul className="divide-y divide-slate-100">
                      {pagedFacilities.map((f) => (
                        <li
                          key={`${f.facilityId}-${f.facilityName}`}
                          className="flex items-start justify-between gap-3 py-3"
                        >
                          <div className="min-w-0 space-y-1">
                            <p className="break-words font-semibold leading-snug text-slate-800">
                              {f.facilityName}
                            </p>
                            <p className="text-xs leading-snug text-slate-500">
                              {f.visits} visits · {f.emailOpened} opened
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-[#00B8DB]/10 px-2.5 py-1 text-xs font-bold text-[#0891b2]">
                            {f.inquiries} inquiries
                          </span>
                        </li>
                      ))}
                    </ul>
                    {topFacilities.length > FACILITY_PAGE_SIZE && (
                      <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                        <p className="text-xs text-slate-500">
                          Page {facilitySafePage} of {facilityTotalPages}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-lg"
                            disabled={facilitySafePage <= 1}
                            onClick={() => setFacilityPage((p) => Math.max(1, p - 1))}
                          >
                            Previous
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-lg"
                            disabled={facilitySafePage >= facilityTotalPages}
                            onClick={() =>
                              setFacilityPage((p) => Math.min(facilityTotalPages, p + 1))
                            }
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
