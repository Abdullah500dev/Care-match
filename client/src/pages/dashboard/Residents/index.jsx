import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import SEO from "@/components/common/SEO";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Search,
  Filter,
  ChevronDown,
  X,
  MoreHorizontal,
  Loader2,
  MapPin,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/services/api";

const STATUS_STYLES = {
  New: "bg-amber-500 text-white",
  "Email Opened": "bg-emerald-500 text-white",
  "Tour Scheduled": "bg-violet-500 text-white",
  Contacted: "bg-[#00B8DB] text-white",
  Waitlist: "bg-slate-200 text-slate-700",
  Closed: "bg-slate-700 text-white",
};

const ALL_STATUSES = [
  "New",
  "Email Opened",
  "Tour Scheduled",
  "Contacted",
  "Waitlist",
  "Closed",
];

/** Product only supports Assisted Living — never show other care-type chips. */
const ASSISTED_LIVING_LABEL = "Assisted Living";

const normalizeCareTypeDisplay = (careType) => {
  const raw = String(careType || "").trim();
  if (!raw || raw === "—") return ASSISTED_LIVING_LABEL;
  if (/assisted\s*living/i.test(raw)) return ASSISTED_LIVING_LABEL;
  return ASSISTED_LIVING_LABEL;
};

const HEAD_STYLE = {
  fontFamily: "Rethink Sans, sans-serif",
  fontWeight: 700,
  fontSize: "12px",
  lineHeight: "16px",
  letterSpacing: "1.2px",
  color: "#90A1B9",
};

const areaKeyFromLead = (lead) => {
  const zip = String(lead.facilityZip || "").trim();
  if (zip) return zip;
  const address = String(lead.facilityAddress || "").trim();
  if (!address) return "";
  // Prefer city-ish segment before last comma, else full address
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return parts[parts.length - 2] || parts[0];
  return parts[0] || "";
};

const toDateInputValue = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
};

const formatEstDateTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return (
    d.toLocaleString("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }) + " EST"
  );
};

const PAGE_SIZE = 8;

const FilterButton = ({ active, label, children }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="outline"
        size="default"
        className="flex shrink-0 items-center gap-2 bg-white"
        style={{
          height: "40px",
          borderRadius: "12px",
          border: active ? "1.5px solid #00B8DB" : "1px solid rgba(0,0,0,0.08)",
          color: active ? "#00B8DB" : "#000",
        }}
      >
        <Filter className="h-4 w-4 shrink-0" />
        <span className="max-w-[9rem] truncate text-sm font-bold">{label}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="max-h-64 w-52 overflow-y-auto">
      {children}
    </DropdownMenuContent>
  </DropdownMenu>
);

export default function Residents() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [careTypeFilter, setCareTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get("/api/email/leads", {
        params: { limit: 300 },
      });
      setLeads(Array.isArray(data?.leads) ? data.leads : []);
    } catch (err) {
      console.error(err);
      toast.error("Could not load leads", {
        description: err?.response?.data?.message || "Please try again.",
      });
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const areaOptions = useMemo(() => {
    const set = new Set();
    leads.forEach((lead) => {
      const key = areaKeyFromLead(lead);
      if (key) set.add(key);
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [leads]);

  const careTypeOptions = useMemo(() => [ASSISTED_LIVING_LABEL], []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const fromTs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toTs = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null;

    return leads.filter((lead) => {
      const name = String(lead.name || "").toLowerCase();
      const email = String(lead.email || "").toLowerCase();
      const facility = String(lead.facility || "").toLowerCase();

      const matchSearch =
        !q || name.includes(q) || email.includes(q) || facility.includes(q);
      const matchStatus = !statusFilter || lead.status === statusFilter;
      const matchArea = !areaFilter || areaKeyFromLead(lead) === areaFilter;
      const matchCare =
        !careTypeFilter ||
        normalizeCareTypeDisplay(lead.careType) === careTypeFilter;

      const created = lead.createdAt ? new Date(lead.createdAt).getTime() : null;
      const matchFrom = fromTs == null || (created != null && created >= fromTs);
      const matchTo = toTs == null || (created != null && created <= toTs);

      return matchSearch && matchStatus && matchArea && matchCare && matchFrom && matchTo;
    });
  }, [
    leads,
    search,
    statusFilter,
    areaFilter,
    careTypeFilter,
    dateFrom,
    dateTo,
  ]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, areaFilter, careTypeFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedLeads = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  const hasActiveFilter = Boolean(
    statusFilter || areaFilter || careTypeFilter || dateFrom || dateTo,
  );

  const clearFilters = () => {
    setStatusFilter("");
    setAreaFilter("");
    setCareTypeFilter("");
    setDateFrom("");
    setDateTo("");
  };

  const updateLeadStatus = async (id, newStatus) => {
    const prev = leads;
    setLeads((list) =>
      list.map((l) => (l.id === id ? { ...l, status: newStatus } : l)),
    );
    try {
      await apiClient.patch(`/api/email/leads/${id}`, { status: newStatus });
      toast.success("Status updated", { description: `Lead moved to "${newStatus}".` });
    } catch (err) {
      setLeads(prev);
      toast.error("Could not update status", {
        description: err?.response?.data?.message || "Please try again.",
      });
    }
  };

  const removeLead = async (id, name) => {
    const prev = leads;
    setLeads((list) => list.filter((l) => l.id !== id));
    try {
      await apiClient.delete(`/api/email/leads/${id}`);
      toast.success("Lead removed", { description: `${name} has been removed.` });
    } catch (err) {
      setLeads(prev);
      toast.error("Could not remove lead", {
        description: err?.response?.data?.message || "Please try again.",
      });
    }
  };

  const handleViewDetails = (lead) => {
    const opened = lead.emailOpenedAt
      ? formatEstDateTime(lead.emailOpenedAt)
      : "—";
    toast.info(`Viewing ${lead.name}`, {
      description: `${lead.facility} · ${normalizeCareTypeDisplay(lead.careType)} · Email opened ${opened}`,
    });
  };

  return (
    <div
      className="mx-auto w-full min-w-0 max-w-5xl space-y-6"
      style={{ fontFamily: "Rethink Sans, sans-serif" }}
    >
      <SEO title="Leads – Admin | CareMatch AI" />
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
            Search by name, email, or facility. Filter by area, status, care type, and date.
          </p>
        </div>
      </div>

      <div
        className="min-w-0 overflow-visible rounded-[1.25rem] bg-white px-4 py-3 sm:px-5 sm:py-4"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
      >
        <div className="flex min-w-0 flex-col gap-3">
          <div className="relative min-w-0 w-full sm:max-w-[420px]">
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

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <FilterButton
              active={Boolean(areaFilter)}
              label={areaFilter ? `Area: ${areaFilter}` : "Area"}
            >
              <DropdownMenuItem
                onClick={() => setAreaFilter("")}
                className={!areaFilter ? "font-semibold text-[#00B8DB]" : ""}
              >
                All areas
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {areaOptions.length === 0 ? (
                <DropdownMenuItem disabled>No areas yet</DropdownMenuItem>
              ) : (
                areaOptions.map((area) => (
                  <DropdownMenuItem
                    key={area}
                    onClick={() => setAreaFilter(area)}
                    className={areaFilter === area ? "font-semibold text-[#00B8DB]" : ""}
                  >
                    {area}
                  </DropdownMenuItem>
                ))
              )}
            </FilterButton>

            <FilterButton
              active={Boolean(statusFilter)}
              label={statusFilter || "Status"}
            >
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
            </FilterButton>

            <FilterButton
              active={Boolean(careTypeFilter)}
              label={careTypeFilter || "Care type"}
            >
              <DropdownMenuItem
                onClick={() => setCareTypeFilter("")}
                className={!careTypeFilter ? "font-semibold text-[#00B8DB]" : ""}
              >
                All care types
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {careTypeOptions.length === 0 ? (
                <DropdownMenuItem disabled>No care types yet</DropdownMenuItem>
              ) : (
                careTypeOptions.map((ct) => (
                  <DropdownMenuItem
                    key={ct}
                    onClick={() => setCareTypeFilter(ct)}
                    className={
                      careTypeFilter === ct ? "font-semibold text-[#00B8DB]" : ""
                    }
                  >
                    {ct}
                  </DropdownMenuItem>
                ))
              )}
            </FilterButton>

            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5">
              <span className="px-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                Date
              </span>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-8 w-[9.5rem] rounded-lg border-slate-200 bg-white text-sm"
                aria-label="From date"
              />
              <span className="text-xs text-slate-400">to</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-8 w-[9.5rem] rounded-lg border-slate-200 bg-white text-sm"
                aria-label="To date"
              />
            </div>

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

      {!loading && filtered.length > 0 && (
        <p className="text-sm text-slate-500">
          Showing{" "}
          <span className="font-semibold text-slate-700">
            {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)}
          </span>{" "}
          of {filtered.length} leads
          {(search || hasActiveFilter) && leads.length !== filtered.length
            ? ` (filtered from ${leads.length})`
            : ""}
        </p>
      )}

      <Card className="min-w-0 overflow-hidden rounded-3xl border-slate-200 bg-white shadow-sm">
        <CardContent className="min-w-0 overflow-x-auto p-0">
          <Table className="min-w-[920px]">
            <TableHeader>
              <TableRow className="border-slate-100 bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="h-11 w-[22%] rounded-tl-3xl uppercase first:pl-5" style={HEAD_STYLE}>
                  Lead Name
                </TableHead>
                <TableHead className="h-11 w-[34%] uppercase" style={HEAD_STYLE}>
                  Facility
                </TableHead>
                <TableHead className="h-11 w-[22%] uppercase" style={HEAD_STYLE}>
                  Care Type
                </TableHead>
                <TableHead className="h-11 w-[14%] uppercase" style={HEAD_STYLE}>
                  Status
                </TableHead>
                <TableHead className="h-11 w-12 rounded-tr-3xl uppercase last:pr-5" style={HEAD_STYLE}>
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-sm text-slate-400">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading leads…
                    </span>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-sm text-slate-400">
                    {leads.length === 0
                      ? "No leads yet. They appear when a user clicks Contact."
                      : "No leads match your search or filters."}
                  </TableCell>
                </TableRow>
              ) : (
                pagedLeads.map((lead) => {
                  const careLabel = normalizeCareTypeDisplay(lead.careType);
                  return (
                  <TableRow
                    key={lead.id}
                    className="border-slate-100 transition-colors hover:bg-slate-50/80"
                  >
                    <TableCell className="align-top py-4 first:pl-5">
                      <div className="flex items-start gap-3">
                        <Avatar className="mt-0.5 h-9 w-9 shrink-0 rounded-full border border-slate-100 bg-sky-50">
                          <AvatarFallback className="bg-[#00B8DB]/10 text-sm font-semibold text-[#00B8DB]">
                            {lead.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 space-y-1">
                          <p className="break-words font-bold leading-snug text-slate-900">
                            {lead.name}
                          </p>
                          <p className="break-all text-xs leading-snug" style={{ color: "#90A1B9" }}>
                            {lead.email}
                          </p>
                          {lead.createdAt && (
                            <p className="text-[11px] text-slate-400">
                              {formatEstDateTime(lead.createdAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="align-top py-4" style={{ color: "#45556C" }}>
                      <div className="min-w-[14rem] max-w-[22rem] space-y-2">
                        <p className="break-words font-bold leading-snug text-slate-800">
                          {lead.facility}
                        </p>
                        <div className="space-y-1.5 rounded-xl border border-slate-100 bg-slate-50/80 px-2.5 py-2">
                          <p className="flex items-start gap-2 text-xs leading-snug text-slate-600">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#00B8DB]" />
                            <span className="min-w-0 break-words">
                              {lead.facilityAddress || "Address not available"}
                              {lead.facilityZip ? ` · ${lead.facilityZip}` : ""}
                            </span>
                          </p>
                          <p className="flex items-start gap-2 text-xs leading-snug text-slate-600">
                            <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#00B8DB]" />
                            <span className="min-w-0 break-all">
                              {lead.facilityEmail || "Email not available"}
                            </span>
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="align-top py-4" style={{ color: "#45556C" }}>
                      <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold leading-snug text-slate-700">
                        {careLabel}
                      </span>
                    </TableCell>
                    <TableCell className="align-top py-4">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
                          STATUS_STYLES[lead.status] || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {lead.status}
                      </span>
                    </TableCell>
                    <TableCell className="align-top py-4 last:pr-5">
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
                          <DropdownMenuItem onClick={() => navigate("/admin/messages")}>
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
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {!loading && filtered.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:flex-row">
          <p className="text-sm text-slate-600">
            Page {safePage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
