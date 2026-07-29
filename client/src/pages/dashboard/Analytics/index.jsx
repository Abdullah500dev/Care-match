import React, { useCallback, useEffect, useState } from "react";
import SEO from "@/components/common/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  Building2,
  Eye,
  MessageSquare,
  MailOpen,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/services/api";

const RANGE_OPTIONS = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

const chartConfig = {
  visits: { label: "Visits", color: "#00B8DB" },
  inquiries: { label: "Inquiries", color: "#6366F1" },
};

export default function Analytics() {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await apiClient.get("/api/email/analytics", {
        params: { days },
      });
      setData(res);
    } catch (err) {
      console.error(err);
      toast.error("Could not load analytics", {
        description: err?.response?.data?.message || "Please try again.",
      });
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const summary = data?.summary || {};
  const timeline = Array.isArray(data?.timeline) ? data.timeline : [];
  const byCareType = Array.isArray(data?.byCareType) ? data.byCareType : [];
  const topFacilities = Array.isArray(data?.topFacilities) ? data.topFacilities : [];
  const byStatus = data?.byStatus || {};

  const cards = [
    {
      label: "Facilities listed",
      value: summary.facilitiesListed ?? 0,
      icon: Building2,
      color: "text-sky-600",
      bg: "bg-sky-100",
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
      label: "Emails opened",
      value: summary.emailsOpened ?? 0,
      icon: MailOpen,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
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
        <div className="flex flex-wrap gap-2">
          {RANGE_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              type="button"
              variant={days === opt.value ? "default" : "outline"}
              size="sm"
              className={
                days === opt.value
                  ? "rounded-xl bg-[#00B8DB] text-white hover:bg-[#00B8DB]/90"
                  : "rounded-xl"
              }
              onClick={() => setDays(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
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
                  Visits &amp; inquiries ({days} days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {timeline.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-400">No activity in this range.</p>
                ) : (
                  <ChartContainer config={chartConfig} className="h-[260px] w-full">
                    <AreaChart data={timeline}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
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
                    {summary.recentInquiries} inquiries in the last {days} days
                  </p>
                )}
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
                  <ChartContainer
                    config={{ count: { label: "Leads", color: "#00B8DB" } }}
                    className="h-[240px] w-full"
                  >
                    <BarChart data={byCareType} layout="vertical" margin={{ left: 8 }}>
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} fontSize={11} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={110}
                        tickLine={false}
                        axisLine={false}
                        fontSize={11}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="#00B8DB" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ChartContainer>
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
                  <ul className="divide-y divide-slate-100">
                    {topFacilities.map((f) => (
                      <li
                        key={`${f.facilityId}-${f.facilityName}`}
                        className="flex items-center justify-between gap-3 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-800">
                            {f.facilityName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {f.visits} visits · {f.emailOpened} opened
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-[#00B8DB]/10 px-2.5 py-1 text-xs font-bold text-[#0891b2]">
                          {f.inquiries} inquiries
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
