import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import SEO from "@/components/common/SEO";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Filter, ChevronDown, X, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

const STATUS_STYLES = {
  New: "bg-amber-500 text-white",
  "Tour Scheduled": "bg-violet-500 text-white",
  Contacted: "bg-[#00B8DB] text-white",
  Waitlist: "bg-slate-200 text-slate-700",
  Closed: "bg-slate-700 text-white",
};

const ALL_STATUSES = ["New", "Tour Scheduled", "Contacted", "Waitlist", "Closed"];

const INITIAL_LEADS = [
  {
    id: 1,
    initials: "SJ",
    name: "Sarah Johnson",
    email: "sarah.j@email.com",
    facility: "Sunrise Villa",
    careType: "Assisted Living",
    status: "New",
    score: "96%",
  },
  {
    id: 2,
    initials: "RM",
    name: "Robert Miller",
    email: "robert.m@email.com",
    facility: "Sunrise Villa",
    careType: "Memory Care",
    status: "Tour Scheduled",
    score: "88%",
  },
  {
    id: 3,
    initials: "ED",
    name: "Emily Davis",
    email: "emily.d@email.com",
    facility: "Golden Years",
    careType: "Independent Living",
    status: "Contacted",
    score: "92%",
  },
  {
    id: 4,
    initials: "MC",
    name: "Michael Chen",
    email: "michael.c@email.com",
    facility: "Sunrise Villa",
    careType: "Skilled Nursing",
    status: "Waitlist",
    score: "85%",
  },
  {
    id: 5,
    initials: "JW",
    name: "Jennifer Wilson",
    email: "jennifer.w@email.com",
    facility: "Golden Years",
    careType: "Assisted Living",
    status: "Closed",
    score: "78%",
  },
  {
    id: 6,
    initials: "DB",
    name: "David Brown",
    email: "david.b@email.com",
    facility: "Sunrise Villa",
    careType: "Memory Care",
    status: "New",
    score: "94%",
  },
];

const HEAD_STYLE = {
  fontFamily: "Rethink Sans, sans-serif",
  fontWeight: 700,
  fontSize: "12px",
  lineHeight: "16px",
  letterSpacing: "1.2px",
  color: "#90A1B9",
};

export default function Residents() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState(INITIAL_LEADS);
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  /* ── derived filtered list ───────────────────────────────── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return leads.filter((lead) => {
      const matchSearch =
        !q ||
        lead.name.toLowerCase().includes(q) ||
        lead.email.toLowerCase().includes(q) ||
        lead.facility.toLowerCase().includes(q);
      const matchStatus = !statusFilter || lead.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [leads, search, statusFilter]);

  const hasActiveFilter = Boolean(statusFilter);

  const clearFilters = () => {
    setStatusFilter("");
  };

  /* ── action handlers ─────────────────────────────────────── */
  const updateLeadStatus = (id, newStatus) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l))
    );
    toast.success("Status updated", { description: `Lead moved to "${newStatus}".` });
  };

  const removeLead = (id, name) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    toast.success("Lead removed", { description: `${name} has been removed.` });
  };

  const handleViewDetails = (lead) => {
    toast.info(`Viewing ${lead.name}`, {
      description: `${lead.facility} · ${lead.careType} · Score ${lead.score}`,
    });
  };

  return (
    <div
      className="mx-auto w-full min-w-0 max-w-5xl space-y-6"
      style={{ fontFamily: "Rethink Sans, sans-serif" }}
    >
      <SEO title="Leads – Admin | CareMatch AI" />
      {/* Page header */}
      <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex flex-col">
          <h1
            className="flex items-center text-xl font-bold tracking-tight text-slate-900 sm:text-2xl md:text-3xl lg:h-9"
            style={{ maxWidth: "100%" }}
          >
            Leads
          </h1>
          <p
            className="mt-1 text-sm text-slate-500 md:text-base lg:h-6"
            style={{ maxWidth: "100%" }}
          >
            Manage your leads and track performance.
          </p>
        </div>
      </div>

      {/* Search + Filter bar */}
      <div
        className="min-w-0 overflow-visible rounded-[1.25rem] bg-white px-4 py-3 sm:px-5 sm:py-4"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
      >
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          {/* Search */}
          <div className="relative min-w-0 flex-1 sm:max-w-[42%]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by name, email, or facility…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-0 rounded-xl border border-slate-200/80 bg-slate-50 pl-9 shadow-sm focus-visible:bg-white focus-visible:ring-2"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-2 sm:ml-auto">
            {/* Status filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="default"
                  className="flex shrink-0 items-center gap-2 bg-white"
                  style={{
                    height: "40px",
                    borderRadius: "12px",
                    border: statusFilter
                      ? "1.5px solid #00B8DB"
                      : "1px solid rgba(0,0,0,0.08)",
                    color: statusFilter ? "#00B8DB" : "#000",
                  }}
                >
                  <Filter className="h-4 w-4 shrink-0" />
                  <span className="text-sm font-bold">
                    {statusFilter ? statusFilter : "Status"}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onClick={() => setStatusFilter("")}
                  className={!statusFilter ? "font-semibold text-[#00B8DB]" : ""}
                >
                  All statuses
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {ALL_STATUSES.map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={statusFilter === s ? "font-semibold text-[#00B8DB]" : ""}
                  >
                    {s}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Clear filters */}
            {hasActiveFilter && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 hover:text-red-600"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Result count when filtering */}
      {(search || hasActiveFilter) && (
        <p className="text-sm text-slate-500">
          Showing <span className="font-semibold text-slate-700">{filtered.length}</span> of{" "}
          {leads.length} leads
        </p>
      )}

      {/* Leads table */}
      <Card className="min-w-0 overflow-hidden rounded-3xl border-slate-200 bg-white shadow-sm">
        <CardContent className="min-w-0 overflow-x-auto p-0">
          <Table className="min-w-0">
            <TableHeader>
              <TableRow className="border-slate-100 bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="h-11 rounded-tl-3xl uppercase first:pl-5" style={HEAD_STYLE}>
                  Lead Name
                </TableHead>
                <TableHead className="h-11 uppercase" style={HEAD_STYLE}>
                  Facility
                </TableHead>
                <TableHead className="h-11 uppercase" style={HEAD_STYLE}>
                  Care Type
                </TableHead>
                <TableHead className="h-11 uppercase" style={HEAD_STYLE}>
                  Status
                </TableHead>
                <TableHead className="h-11 uppercase" style={HEAD_STYLE}>
                  Score
                </TableHead>
                <TableHead className="h-11 w-12 rounded-tr-3xl uppercase last:pr-5" style={HEAD_STYLE}>
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-slate-400">
                    No leads match your search or filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className="border-slate-100 transition-colors hover:bg-slate-50/80"
                  >
                    <TableCell className="py-3 first:pl-5">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 rounded-full border border-slate-100 bg-sky-50">
                          <AvatarFallback className="bg-[#00B8DB]/10 text-sm font-semibold text-[#00B8DB]">
                            {lead.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-900">{lead.name}</p>
                          <p className="truncate text-xs" style={{ color: "#90A1B9" }}>
                            {lead.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 font-bold" style={{ color: "#45556C" }}>
                      {lead.facility}
                    </TableCell>
                    <TableCell className="py-3 font-bold" style={{ color: "#45556C" }}>
                      {lead.careType}
                    </TableCell>
                    <TableCell className="py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_STYLES[lead.status] || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {lead.status}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 font-semibold text-[#00B8DB]">
                      {lead.score}
                    </TableCell>
                    <TableCell className="py-3 last:pr-5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-slate-100"
                            aria-label="Open actions"
                          >
                            <MoreHorizontal className="h-4 w-4" style={{ color: "#45556C" }} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem onClick={() => handleViewDetails(lead)}>
                            View details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => updateLeadStatus(lead.id, "Tour Scheduled")}
                            disabled={lead.status === "Tour Scheduled"}
                          >
                            Schedule tour
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => updateLeadStatus(lead.id, "Contacted")}
                            disabled={lead.status === "Contacted"}
                          >
                            Mark as Contacted
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => navigate("/admin/messages")}
                          >
                            Send message
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => removeLead(lead.id, lead.name)}
                          >
                            Remove lead
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
