import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Users,
  CalendarDays,
  BarChart2,
  Copy,
  Download,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";
import AnimatedNumber from "@/components/common/AnimatedNumber";

const METRIC_CARDS = [
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
    label: "Conversion Rate",
    value: "24%",
    change: "+2%",
    icon: BarChart2,
    iconBg: "bg-teal-100",
    iconColor: "text-[#00B8DB]",
  },
];

const PARTNER_FACILITIES = [
  {
    id: 1,
    name: "Evergreen Health Center",
    location: "Seattle, WA",
    activeCount: "12",
    totalCount: "145",
    referralCode: "EVE-992-WA",
  },
  {
    id: 2,
    name: "Sunnyvale Skilled Nursing",
    location: "Portland, OR",
    activeCount: "8",
    totalCount: "89",
    referralCode: "SUN-441-OR",
  },
];

const REFERRALS = [
  {
    id: 1,
    patient: "James Wilson",
    details: "78 years • Assisted Living",
    source: "Evergreen Health Center",
    status: "AWAITING VERIFICATION",
    statusVariant: "warning",
  },
  {
    id: 2,
    patient: "Martha Stewart",
    details: "82 years • Memory Care",
    source: "Sunnyvale Skilled Nursing",
    status: "ONBOARDING",
    statusVariant: "success",
  },
];

function QrCodeGraphic() {
  return (
    <div className="flex h-24 w-24 shrink-0 items-center justify-center md:h-28 md:w-28">
      <img
        src="/assets/images/Container.svg"
        alt="QR Code"
        className="h-full w-full object-contain"
      />
    </div>
  );
}

export default function SNFPartners() {
  const [activeTab, setActiveTab] = useState("partners");
  const [qrInput, setQrInput] = useState("");
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [partnershipKitOpen, setPartnershipKitOpen] = useState(false);
  const [openKitModalOpen, setOpenKitModalOpen] = useState(false);
  const [onboardForm, setOnboardForm] = useState({
    facilityName: "",
    contactPerson: "",
    phone: "",
    partnershipType: "",
  });

  const copyReferralCode = (code) => {
    navigator.clipboard.writeText(code);
  };

  const REFERRAL_LINK = "https://carematch.ai/referral/EVE-992-WA";

  const copyReferralLink = () => {
    navigator.clipboard.writeText(REFERRAL_LINK);
  };

  const handleOnboardSubmit = (e) => {
    e.preventDefault();
    setOnboardOpen(false);
    setPartnershipKitOpen(true);
  };

  return (
    <div
      className="mx-auto w-full min-w-0 max-w-5xl space-y-6"
      style={{ fontFamily: "Rethink Sans, sans-serif" }}
    >
      {/* Header */}
      <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex flex-col">
          <h1
            className="flex items-center text-xl font-bold tracking-tight text-slate-900 sm:text-2xl md:text-3xl lg:h-9"
            style={{ maxWidth: "100%" }}
          >
            Skilled Nursing Facilities
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
            type="button"
            onClick={() => setOnboardOpen(true)}
            size="default"
            className="relative flex w-full shrink-0 items-center justify-center gap-2 text-white hover:bg-[#00B8DB]/90 sm:w-auto sm:min-w-[140px]"
            style={{
              maxWidth: "100%",
              height: "48px",
              borderRadius: "14px",
              background: "#00B8DB",
              boxShadow:
                "0 0 6px -4px #CEFAFE, 0 8px 24px 0 rgba(0, 184, 219, 0.5)",
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

      {/* Metric cards */}
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3">
        {METRIC_CARDS.map((item) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.label}
              className="min-w-0 border-slate-200 bg-white shadow-sm"
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${item.iconBg} ${item.iconColor}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span
                  className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700"
                  style={{
                    fontFamily: "Rethink Sans, sans-serif",
                    fontWeight: 700,
                    fontSize: "12px",
                    lineHeight: "18px",
                    letterSpacing: "0px",
                  }}
                >
                  <AnimatedNumber
                    value={item.change}
                    durationMs={1200}
                    startOnView
                  />
                </span>
              </CardHeader>
              <CardContent>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {item.label}
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  <AnimatedNumber
                    value={item.value}
                    durationMs={1500}
                    startOnView
                  />
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Internal Intake Station */}
      <div
        className="flex min-w-0 flex-col gap-4 rounded-2xl p-4 sm:p-6 md:flex-row md:items-center md:justify-between"
        style={{ backgroundColor: "#1A1E2F" }}
      >
        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="text-base font-bold text-white sm:text-lg">
            Internal Intake Station
          </h3>
          <p className="text-xs text-white/80 sm:text-sm">
            Check in arriving patients from SNF partners by verifying their QR
            referral code here.
          </p>
          <div className="flex min-w-0 max-w-full flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3 md:max-w-md">
            <Input
              placeholder="Scan or enter QR Code ID..."
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              className="h-11 flex-1 rounded-xl border-0 bg-slate-700/50 text-white placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#00B8DB]"
            />
            <Button
              className="h-11 min-w-0 rounded-xl border-2 border-[#1A202C] bg-[#00B8DB] text-white hover:bg-[#00B8DB]/90 sm:min-w-[120px]"
            >
              Check In
            </Button>
          </div>
        </div>
        <div className="hidden shrink-0 md:block">
          <QrCodeGraphic />
        </div>
      </div>

      {/* Recent Referrals / Partner Facilities */}
      <Card className="min-w-0 overflow-hidden border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100">
          <div className="flex flex-wrap gap-4 px-4 pt-4 sm:gap-6 sm:px-6">
            <button
              type="button"
              onClick={() => setActiveTab("partners")}
              className={`relative pb-3 text-sm font-semibold transition-colors ${
                activeTab === "partners"
                  ? "text-[#00B8DB]"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Partner Facilities
              {activeTab === "partners" && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#00B8DB]" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("referrals")}
              className={`relative pb-3 text-sm font-semibold transition-colors ${
                activeTab === "referrals"
                  ? "text-[#00B8DB]"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Recent Referrals
              {activeTab === "referrals" && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#00B8DB]" />
              )}
            </button>
          </div>
        </div>
        <CardContent className="min-w-0 p-0">
          <div className="min-w-0 overflow-x-auto">
            {activeTab === "partners" ? (
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#62748E] sm:px-6">
                      Facility
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#62748E] sm:px-6">
                      Stats
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#62748E] sm:px-6">
                      Referral Code
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {PARTNER_FACILITIES.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50"
                    >
                      <td className="px-4 py-4 sm:px-6">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">
                            {row.name}
                          </p>
                          <p className="text-sm text-slate-500">
                            {row.location}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 sm:px-6">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {row.activeCount} Active
                          </p>
                          <p className="text-sm text-slate-500">
                            {row.totalCount} total
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 sm:px-6">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className="inline-flex items-center rounded-lg border border-slate-200 bg-[#F1F5F9]"
                            style={{
                              fontFamily: "Inter, sans-serif",
                              fontWeight: 700,
                              fontSize: "12px",
                              lineHeight: "18px",
                              letterSpacing: "0px",
                              color: "#475569",
                              padding: "5px 8px",
                            }}
                          >
                            {row.referralCode}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyReferralCode(row.referralCode)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            aria-label="Copy referral code"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#62748E] sm:px-6">
                      Patient
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#62748E] sm:px-6">
                      Source
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#62748E] sm:px-6">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {REFERRALS.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50"
                    >
                      <td className="px-4 py-4 sm:px-6">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">
                            {row.patient}
                          </p>
                          <p className="text-sm text-slate-500">
                            {row.details}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-700 underline sm:px-6">
                        {row.source}
                      </td>
                      <td className="px-4 py-4 sm:px-6">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            row.statusVariant === "warning"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Onboard New SNF Modal */}
      <Dialog open={onboardOpen} onOpenChange={setOnboardOpen}>
        <DialogContent className="mx-4 w-[calc(100%-2rem)] max-w-md gap-0 rounded-[64px] border border-slate-200 bg-white p-0 shadow-[0_4px_24px_rgba(0,0,0,0.12)] sm:mx-auto sm:max-w-lg">
          <DialogHeader className="px-4 pt-6 pb-4 pr-12 sm:px-6">
            <DialogTitle className="text-left text-xl font-bold text-slate-900">
              Onboard New SNF
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleOnboardSubmit} className="flex min-w-0 flex-col">
            <div className="space-y-4 px-4 py-2 sm:px-6">
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Facility Name
                </label>
                <Input
                  value={onboardForm.facilityName}
                  onChange={(e) =>
                    setOnboardForm((p) => ({
                      ...p,
                      facilityName: e.target.value,
                    }))
                  }
                  placeholder="Seattle Senior Care"
                  className="h-11 rounded-[20px] border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#00B8DB]"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Contact Person
                  </label>
                  <Input
                    value={onboardForm.contactPerson}
                    onChange={(e) =>
                      setOnboardForm((p) => ({
                        ...p,
                        contactPerson: e.target.value,
                      }))
                    }
                    placeholder="John Smith"
                    className="h-11 rounded-[20px] border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#00B8DB]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Phone
                  </label>
                  <Input
                    value={onboardForm.phone}
                    onChange={(e) =>
                      setOnboardForm((p) => ({ ...p, phone: e.target.value }))
                    }
                    placeholder="(206) 555-0000"
                    className="h-11 rounded-[20px] border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#00B8DB]"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Partnership Type
                </label>
                <Input
                  value={onboardForm.partnershipType}
                  onChange={(e) =>
                    setOnboardForm((p) => ({
                      ...p,
                      partnershipType: e.target.value,
                    }))
                  }
                  placeholder="Select or enter partnership type"
                  className="h-11 rounded-[20px] border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#00B8DB]"
                />
              </div>
            </div>
            <div className="px-4 pb-6 pt-4 sm:px-6">
              <Button
                type="submit"
                className="h-12 w-full rounded-[28px] bg-[#00B8DB] text-base font-bold text-white shadow-[0_2px_8px_rgba(0,184,219,0.3)] hover:bg-[#00B8DB]/90"
              >
                Generate Partnership & QR Kit
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Partnership & QR Kit Modal */}
      <Dialog open={partnershipKitOpen} onOpenChange={setPartnershipKitOpen}>
        <DialogContent className="mx-4 max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl gap-0 overflow-y-auto rounded-[24px] border border-slate-200 bg-white p-0 shadow-[0_4px_24px_rgba(0,0,0,0.12)] sm:mx-auto sm:rounded-[32px]">
          <div className="flex min-w-0 flex-col">
            {/* Header */}
            <div className="flex items-start gap-3 px-4 pt-4 pr-10 sm:gap-4 sm:px-6 sm:pt-6 sm:pr-12">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center sm:h-14 sm:w-14">
                <img
                  src="/assets/images/everGreenHealthCareIcon.svg"
                  alt="Evergreen Health Care"
                  className="h-10 w-10 object-contain sm:h-14 sm:w-14"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                  Evergreen Health Center
                </h2>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                  <MapPin className="h-4 w-4 shrink-0 text-slate-500" />
                  Seattle, WA
                </p>
              </div>
            </div>

            {/* Stats cards */}
            <div className="mt-4 grid grid-cols-1 gap-3 px-4 sm:mt-6 sm:grid-cols-3 sm:gap-4 sm:px-6">
              <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
                <p className="text-xl font-bold text-slate-900 sm:text-2xl">145</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">
                  Total Referrals
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
                <p className="text-xl font-bold text-[#00B8DB] sm:text-2xl">12</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">
                  Currently Active
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
                <p className="text-xl font-bold sm:text-2xl" style={{ color: "#166534" }}>88%</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">
                  Intake Success
                </p>
              </div>
            </div>

            {/* Partner Contact & Legal */}
            <div className="mt-4 px-4 sm:mt-6 sm:px-6">
              <h3 className="text-base font-bold text-slate-900">
                Partner Contact & Legal
              </h3>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Direct Line
                  </p>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3 shrink-0 text-[#00B8DB]" />
                    <p className="text-sm font-bold text-slate-900">(206) 555-0123</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Email Contact
                  </p>
                  <div className="flex items-center gap-2">
                    <Mail className="h-3 w-3 shrink-0 text-[#00B8DB]" />
                    <p className="text-sm font-bold text-slate-900">
                      s.jenkins@evergreen.com
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Referral QR Kit */}
            <div className="mt-4 px-4 sm:mt-6 sm:px-6">
              <h3 className="text-base font-bold text-slate-900">
                Referral QR Kit
              </h3>
              <div
                className="mt-3 flex min-w-0 flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                style={{ backgroundColor: "#1A1E2F" }}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center sm:h-12 sm:w-12">
                    <img
                      src="/assets/images/qrCode2.svg"
                      alt="QR Code"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="flex min-h-[2rem] flex-col justify-center">
                    <p className="text-xs leading-tight text-white/80">
                      Active Referral Code
                    </p>
                    <p className="text-base font-bold leading-tight text-white">
                      EVE-992-WA
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => setOpenKitModalOpen(true)}
                  className="w-full shrink-0 rounded-xl bg-[#00B8DB] px-5 py-2.5 font-semibold text-white hover:bg-[#00B8DB]/90 sm:w-auto"
                >
                  Open Kit
                </Button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-4 flex flex-col gap-3 px-4 pb-6 sm:mt-6 sm:flex-row sm:px-6">
              <Button
                type="button"
                className="h-12 flex-1 rounded-xl bg-[#1A1E2F] font-semibold text-white hover:bg-[#1A1E2F]/90"
              >
                Send New Kit
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 flex-1 rounded-xl border-slate-200 font-semibold text-slate-900"
              >
                Edit Partner File
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Display Modal (Open Kit) */}
      <Dialog open={openKitModalOpen} onOpenChange={setOpenKitModalOpen}>
        <DialogContent className="mx-4 w-[calc(100%-2rem)] max-w-sm gap-0 overflow-hidden rounded-[48px] border border-slate-200 bg-white p-0 shadow-[0_4px_24px_rgba(0,0,0,0.12)] sm:mx-auto">
          <div className="flex min-w-0 flex-col items-center px-5 pt-5 pb-6 sm:px-6 sm:pt-6 sm:pb-7">
            <h2 className="w-full text-center text-base font-bold text-slate-900 sm:text-xl">
              Evergreen Health Center
            </h2>
            <p className="mt-1 w-full max-w-[70%] text-center text-xs text-slate-500">
              Official Partner Referral QR Code
            </p>
            <div className="mt-4 flex items-center justify-center p-3">
              <img
                src="/assets/images/SNFDashboard.svg"
                alt="Referral QR Code"
                className="h-36 w-36 sm:h-40 sm:w-40"
              />
            </div>
            <div className="mt-4 flex w-full flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={copyReferralLink}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border-slate-200 bg-slate-50 font-semibold text-slate-900 hover:bg-slate-100"
              >
                <Copy className="h-4 w-4" />
                Copy Referral Link
              </Button>
              <Button
                type="button"
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#00B8DB] font-semibold text-white shadow-[0_2px_8px_rgba(0,184,219,0.3)] hover:bg-[#00B8DB]/90"
              >
                <Download className="h-4 w-4" />
                Download Print Kit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
