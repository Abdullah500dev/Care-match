import React, { useState } from "react";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Filter, Download, MoreHorizontal } from "lucide-react";

const STATUS_STYLES = {
  New: "bg-amber-500 text-white",
  "Tour Scheduled": "bg-violet-500 text-white",
  Contacted: "bg-[#00B8DB] text-white",
  Waitlist: "bg-slate-200 text-slate-700",
  Closed: "bg-slate-700 text-white",
};

const LEADS_DATA = [
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

export default function Residents() {
  const [search, setSearch] = useState("");

  return (
    <div
      className="mx-auto w-full min-w-0 max-w-5xl space-y-6"
      style={{ fontFamily: "Rethink Sans, sans-serif" }}
    >
      {/* Header - same pattern as Overview */}
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

      {/* Search + Filter + Export - bar container (gray bar behind) */}
      <div
        className="min-w-0 overflow-hidden rounded-[1.25rem] bg-white px-4 py-3 sm:px-5 sm:py-4"
        style={{
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="relative min-w-0 flex-1 sm:max-w-[42%]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search leads by name, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-0 rounded-xl border border-slate-200/80 bg-slate-50 pl-9 shadow-sm focus-visible:bg-white focus-visible:ring-2"
            />
          </div>
          <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-2 sm:ml-auto">
            <Button
              variant="outline"
              size="default"
              className="flex shrink-0 items-center justify-center gap-2 bg-white"
              style={{
                minWidth: "80px",
                maxWidth: "100%",
                height: "48px",
                borderRadius: "14px",
                border: "1px solid rgba(0,0,0,0.08)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              <Filter className="h-4 w-4 shrink-0 text-black" />
              <span
                style={{
                  fontFamily: "Rethink Sans, sans-serif",
                  fontWeight: 700,
                  fontSize: "14px",
                  lineHeight: "20px",
                  letterSpacing: "0px",
                  color: "#000000",
                }}
              >
                Filter
              </span>
            </Button>
            <Button
              variant="outline"
              size="default"
              className="flex shrink-0 items-center justify-center gap-2 bg-white"
              style={{
                minWidth: "80px",
                maxWidth: "100%",
                height: "48px",
                borderRadius: "14px",
                border: "1px solid rgba(0,0,0,0.08)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              <Download className="h-4 w-4 shrink-0 text-black" />
              <span
                style={{
                  fontFamily: "Rethink Sans, sans-serif",
                  fontWeight: 700,
                  fontSize: "14px",
                  lineHeight: "20px",
                  letterSpacing: "0px",
                  color: "#000000",
                }}
              >
                Export
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Leads table card */}
      <Card className="min-w-0 overflow-hidden rounded-3xl border-slate-200 bg-white shadow-sm">
        <CardContent className="min-w-0 overflow-x-auto p-0">
          <Table className="min-w-0">
            <TableHeader>
              <TableRow className="border-slate-100 bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead
                  className="h-11 rounded-tl-3xl uppercase first:pl-5"
                  style={{
                    fontFamily: "Rethink Sans, sans-serif",
                    fontWeight: 700,
                    fontStyle: "normal",
                    fontSize: "12px",
                    lineHeight: "16px",
                    letterSpacing: "1.2px",
                    color: "#90A1B9",
                  }}
                >
                  Lead Name
                </TableHead>
                <TableHead
                  className="h-11 uppercase"
                  style={{
                    fontFamily: "Rethink Sans, sans-serif",
                    fontWeight: 700,
                    fontStyle: "normal",
                    fontSize: "12px",
                    lineHeight: "16px",
                    letterSpacing: "1.2px",
                    color: "#90A1B9",
                  }}
                >
                  Facility
                </TableHead>
                <TableHead
                  className="h-11 uppercase"
                  style={{
                    fontFamily: "Rethink Sans, sans-serif",
                    fontWeight: 700,
                    fontStyle: "normal",
                    fontSize: "12px",
                    lineHeight: "16px",
                    letterSpacing: "1.2px",
                    color: "#90A1B9",
                  }}
                >
                  Care Type
                </TableHead>
                <TableHead
                  className="h-11 uppercase"
                  style={{
                    fontFamily: "Rethink Sans, sans-serif",
                    fontWeight: 700,
                    fontStyle: "normal",
                    fontSize: "12px",
                    lineHeight: "16px",
                    letterSpacing: "1.2px",
                    color: "#90A1B9",
                  }}
                >
                  Status
                </TableHead>
                <TableHead
                  className="h-11 uppercase"
                  style={{
                    fontFamily: "Rethink Sans, sans-serif",
                    fontWeight: 700,
                    fontStyle: "normal",
                    fontSize: "12px",
                    lineHeight: "16px",
                    letterSpacing: "1.2px",
                    color: "#90A1B9",
                  }}
                >
                  Score
                </TableHead>
                <TableHead
                  className="h-11 w-12 rounded-tr-3xl uppercase last:pr-5"
                  style={{
                    fontFamily: "Rethink Sans, sans-serif",
                    fontWeight: 700,
                    fontStyle: "normal",
                    fontSize: "12px",
                    lineHeight: "16px",
                    letterSpacing: "1.2px",
                    color: "#90A1B9",
                  }}
                >
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {LEADS_DATA.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="border-slate-100 transition-colors hover:bg-slate-50/80"
                >
                  <TableCell className="py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 rounded-full border border-slate-100 bg-sky-50">
                        <AvatarFallback className="bg-[#00B8DB]/10 text-sm font-semibold text-[#00B8DB]">
                          {lead.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-900">
                          {lead.name}
                        </p>
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
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[lead.status] || "bg-slate-100 text-slate-700"}`}
                    >
                      {lead.status}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 font-semibold text-[#00B8DB]">
                    {lead.score}
                  </TableCell>
                  <TableCell className="py-3">
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
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem>View details</DropdownMenuItem>
                        <DropdownMenuItem>Schedule tour</DropdownMenuItem>
                        <DropdownMenuItem>Send message</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
