import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import SEO from "@/components/common/SEO";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Users,
  CalendarDays,
  Eye,
  TrendingUp,
  MessageSquare,
  ArrowRight,
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
    to: "/admin/residents",
  },
  {
    label: "Contact Requests",
    value: "12",
    change: "+5%",
    icon: CalendarDays,
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
    to: "/admin/messages",
  },
  {
    label: "Profile Views",
    value: "1,284",
    change: "+24%",
    icon: Eye,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    to: "/admin/communities",
  },
  {
    label: "Conversion Rate",
    value: "8.4%",
    change: "+2.1%",
    sub: "Auto",
    icon: TrendingUp,
    iconBg: "bg-teal-100",
    iconColor: "text-[#00B8DB]",
    to: "/admin/analytics",
  },
];

const CHART_DATA_BY_RANGE = {
  week: [
    { day: "Mon", leads: 4 },
    { day: "Tue", leads: 8 },
    { day: "Wed", leads: 6 },
    { day: "Thu", leads: 12 },
    { day: "Fri", leads: 14 },
    { day: "Sat", leads: 10 },
    { day: "Sun", leads: 8 },
  ],
  month: [
    { day: "W1", leads: 24 },
    { day: "W2", leads: 67 },
    { day: "W3", leads: 31 },
    { day: "W4", leads: 53 },
  ],
  quarter: [
    { day: "Jan", leads: 102 },
    { day: "Feb", leads: 66 },
    { day: "Mar", leads: 149 },
  ],
};

const RANGE_OPTIONS = [
  { value: "week", label: "7 days" },
  { value: "month", label: "30 days" },
  { value: "quarter", label: "90 days" },
];

const TOP_LEADS = [
  { initials: "SJ", name: "Sarah Johnson", facility: "Sunrise Villa", score: "95%", time: "3 H AGO" },
  { initials: "RM", name: "Robert Miller", facility: "Sunrise Villa", score: "88%", time: "5 H AGO" },
  { initials: "ED", name: "Emily Davis", facility: "Golden Years", score: "72%", time: "3 D AGO" },
  { initials: "MC", name: "Michael Chen", facility: "Sunrise Villa", score: "91%", time: "2 D AGO" },
];

const RECENT_MESSAGES = [
  {
    id: 1,
    name: "Sunrise Villa",
    subtitle: "Facility Partner",
    preview: "We've confirmed 2 new tours for next week.",
    time: "5m ago",
    unread: 3,
    color: "#00B8DB",
  },
  {
    id: 2,
    name: "Golden Years",
    subtitle: "Facility Partner",
    preview: "Can we update our amenities listing?",
    time: "1h ago",
    unread: 1,
    color: "#8b5cf6",
  },
  {
    id: 3,
    name: "Sarah Johnson",
    subtitle: "Lead / Family",
    preview: "My father needs memory care urgently.",
    time: "3h ago",
    unread: 0,
    color: "#f59e0b",
  },
  {
    id: 4,
    name: "Robert Miller",
    subtitle: "Lead / Family",
    preview: "Tour at Sunrise Villa went well!",
    time: "Yesterday",
    unread: 0,
    color: "#10b981",
  },
];

const chartConfig = {
  leads: {
    label: "Leads",
    color: "#00B8DB",
  },
};

export default function DashboardHome() {
  const navigate = useNavigate();
  const [leadsRange, setLeadsRange] = useState("week");
  const chartData = CHART_DATA_BY_RANGE[leadsRange] ?? CHART_DATA_BY_RANGE.week;
  const yAxisMax = useMemo(() => {
    const max = Math.max(...chartData.map((d) => d.leads), 1);
    return Math.ceil(max * 1.2);
  }, [chartData]);

  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl space-y-6">
      <SEO title="Overview – Admin | CareMatch AI" />
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
      </div>

      {/* Summary cards */}
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SUMMARY_CARDS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => navigate(item.to)}
              className="min-w-0 rounded-xl text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B8DB]/40"
            >
              <Card className="h-full min-w-0 cursor-pointer border-slate-200 bg-white shadow-sm transition hover:border-[#00B8DB]/40">
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
            </button>
          );
        })}
      </div>

      {/* Two main cards */}
      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Leads Performance - 2/3 width */}
        <Card className="min-w-0 border-slate-200 bg-white shadow-sm lg:col-span-2">
          <CardHeader className="min-w-0 space-y-3">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <CardTitle className="min-w-0 text-slate-900 lg:h-7">
                  Leads Performance
                </CardTitle>
                <CardDescription className="mt-1 min-w-0 text-slate-500 lg:h-6">
                  Leads generated across all facilities
                </CardDescription>
              </div>
              {/* Tab-style range filter – no portal, no z-index issues */}
              <div className="flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                {RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setLeadsRange(opt.value)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      leadsRange === opt.value
                        ? "bg-white text-[#00B8DB] shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="min-w-0 overflow-x-auto">
            <ChartContainer config={chartConfig} className="h-[240px] w-full min-w-0 sm:h-[280px]">
              <AreaChart
                key={leadsRange}
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
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
                  domain={[0, yAxisMax]}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="leads"
                  stroke="#00B8DB"
                  strokeWidth={2}
                  fill="url(#fillLeads)"
                  isAnimationActive
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
                onClick={() => navigate("/admin/residents")}
                className="text-sm font-medium text-[#00B8DB] underline underline-offset-2 hover:no-underline"
              >
                View All Leads
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Messages */}
      <Card className="min-w-0 border-slate-200 bg-white shadow-sm">
        <CardHeader className="min-w-0 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <MessageSquare className="h-4 w-4 text-[#00B8DB]" />
                Recent Messages
              </CardTitle>
              <CardDescription className="mt-1 text-slate-500">
                Latest conversations with facility partners and families
              </CardDescription>
            </div>
            <button
              type="button"
              onClick={() => navigate("/admin/messages")}
              className="flex items-center gap-1 text-sm font-semibold text-[#00B8DB] hover:underline underline-offset-2"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="min-w-0 p-0">
          <ul className="divide-y divide-slate-100">
            {RECENT_MESSAGES.map((msg) => (
              <li key={msg.id}>
                <button
                  type="button"
                  onClick={() => navigate("/admin/messages")}
                  className="flex w-full items-center gap-4 px-6 py-3.5 text-left transition-colors hover:bg-slate-50"
                >
                  {/* Colored avatar */}
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: msg.color }}
                  >
                    {msg.name.slice(0, 2).toUpperCase()}
                  </div>

                  {/* Text */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {msg.name}
                      </p>
                      <span className="shrink-0 text-[11px] text-slate-400">{msg.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">{msg.subtitle}</p>
                    <p className="truncate text-xs text-slate-500">{msg.preview}</p>
                  </div>

                  {/* Unread badge */}
                  {msg.unread > 0 && (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#00B8DB] text-[10px] font-bold text-white">
                      {msg.unread}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
