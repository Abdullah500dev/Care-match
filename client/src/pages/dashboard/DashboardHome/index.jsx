import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  Download,
  Plus,
  Users,
  CalendarDays,
  Eye,
  TrendingUp,
} from "lucide-react";
import AnimatedNumber from "@/components/common/AnimatedNumber";

const SUMMARY_CARDS = [
  {
    label: "Active Leads",
    value: "48",
    change: "+12%",
    icon: Users,
    iconBg: "bg-sky-100",
    iconColor: "text-sky-600",
  },
  {
    label: "Tour Requests",
    value: "12",
    change: "+5%",
    icon: CalendarDays,
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
  },
  {
    label: "Profile Views",
    value: "1,284",
    change: "+24%",
    icon: Eye,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  {
    label: "Conversion Rate",
    value: "8.4%",
    change: "+2.1%",
    sub: "Auto",
    icon: TrendingUp,
    iconBg: "bg-teal-100",
    iconColor: "text-[#00B8DB]",
  },
];

const CHART_DATA = [
  { day: "Mon", leads: 4 },
  { day: "Tue", leads: 8 },
  { day: "Wed", leads: 6 },
  { day: "Thu", leads: 12 },
  { day: "Fri", leads: 14 },
  { day: "Sat", leads: 10 },
  { day: "Sun", leads: 8 },
];

const TOP_LEADS = [
  { initials: "SJ", name: "Sarah Johnson", facility: "Sunrise Villa", score: "95%", time: "3 H AGO" },
  { initials: "RM", name: "Robert Miller", facility: "Sunrise Villa", score: "88%", time: "5 H AGO" },
  { initials: "ED", name: "Emily Davis", facility: "Golden Years", score: "72%", time: "3 D AGO" },
  { initials: "MC", name: "Michael Chen", facility: "Sunrise Villa", score: "91%", time: "2 D AGO" },
];

const chartConfig = {
  leads: {
    label: "Leads",
    color: "#00B8DB",
  },
};

export default function DashboardHome() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex flex-col sm:min-w-0">
          <h1
            className="flex items-center text-xl font-bold tracking-tight text-slate-900 sm:text-2xl md:text-3xl lg:h-9"
            style={{ maxWidth: "100%" }}
          >
            Dashboard Overview
          </h1>
          <p
            className="mt-1 text-sm text-slate-500 md:text-base lg:h-6"
            style={{ maxWidth: "100%" }}
          >
            Welcome back, here&apos;s what&apos;s happening with your facilities today.
          </p>
        </div>
        <div className="mt-4 flex min-w-0 flex-shrink-0 flex-wrap items-center gap-2 sm:mt-0">
          <Button
            variant="outline"
            size="default"
            className="relative flex shrink-0 items-center justify-center gap-2 border-slate-200"
            style={{
              minWidth: "100px",
              width: "121.6px",
              maxWidth: "100%",
              height: "48px",
              borderRadius: "14px",
              border: "1.5px solid #cbd5e1",
            }}
          >
            <Download className="h-4 w-4 shrink-0 text-[#45556C]" />
            <span
              style={{
                fontFamily: "Rethink Sans, sans-serif",
                fontWeight: 700,
                fontSize: "14px",
                lineHeight: "20px",
                letterSpacing: "0px",
                textAlign: "center",
                color: "#45556C",
              }}
            >
              Export
            </span>
          </Button>
          <Button
            size="default"
            className="relative flex shrink-0 items-center justify-center gap-2 text-white hover:bg-[#00B8DB]/90"
            style={{
              minWidth: "140px",
              width: "173.25px",
              maxWidth: "100%",
              height: "48px",
              borderRadius: "14px",
              background: "#00B8DB",
              boxShadow: "0 0 6px -4px #CEFAFE, 0 8px 24px 0 rgba(0, 184, 219, 0.5)",
            }}
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span
              style={{
                fontFamily: "Rethink Sans, sans-serif",
                fontWeight: 700,
                fontSize: "14px",
                lineHeight: "20px",
                letterSpacing: "0px",
                textAlign: "center",
              }}
            >
              New Facility
            </span>
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SUMMARY_CARDS.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="min-w-0 border-slate-200 bg-white shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${item.iconBg} ${item.iconColor}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  <AnimatedNumber value={item.change} durationMs={1200} startOnView />
                </span>
              </CardHeader>
              <CardContent>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {item.label}
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  <AnimatedNumber value={item.value} durationMs={1500} startOnView />
                </p>
                {item.sub && (
                  <p className="mt-0.5 text-xs text-slate-400">{item.sub}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Two main cards */}
      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Leads Performance - 2/3 width */}
        <Card className="min-w-0 border-slate-200 bg-white shadow-sm lg:col-span-2">
          <CardHeader className="min-w-0">
            <CardTitle className="min-w-0 text-slate-900 lg:h-7">
              Leads Performance
            </CardTitle>
            <CardDescription className="min-w-0 text-slate-500 lg:h-6">
              Daily leads generated across all facilities
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0 overflow-x-auto">
            <ChartContainer config={chartConfig} className="h-[240px] w-full min-w-0 sm:h-[280px]">
              <AreaChart data={CHART_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00B8DB" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#00B8DB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => String(v)}
                  domain={[0, 16]}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="leads"
                  stroke="#00B8DB"
                  strokeWidth={2}
                  fill="url(#fillLeads)"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Top Hot Leads - 1/3 width */}
        <Card className="min-w-0 border-slate-200 bg-white shadow-sm">
          <CardHeader className="min-w-0">
            <CardTitle className="min-w-0 text-slate-900 lg:h-7">
              Top Hot Leads
            </CardTitle>
            <CardDescription className="min-w-0 text-slate-500 lg:h-6">
              Highest intent matches
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">
            <ul className="space-y-4">
              {TOP_LEADS.map((lead) => (
                <li key={lead.initials} className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 rounded-full border border-slate-200 bg-slate-100">
                    <AvatarFallback className="bg-slate-200 text-sm font-medium text-slate-600">
                      {lead.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{lead.name}</p>
                    <p className="text-xs text-slate-500">{lead.facility}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-emerald-600">{lead.score}</p>
                    <p className="text-xs text-slate-400">{lead.time}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 text-center">
              <button
                type="button"
                className="text-sm font-medium text-[#00B8DB] underline underline-offset-2 hover:no-underline"
              >
                View All Leads
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
