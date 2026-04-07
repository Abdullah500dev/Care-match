import React from "react";
import { Link } from "react-router-dom";
import {
  MapPin,
  History,
  Bell,
  Sparkles,
  Shield,
  Calendar,
  LogOut,
  ChevronRight,
} from "lucide-react";
import SEO from "../../../components/common/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Profile() {
  return (
    <>
      <SEO title="My Profile – CareMatch AI" />
      <div className="min-h-screen bg-[#FDFCFB]">
        <div className="px-4 py-6 sm:py-10 sm:px-6 max-w-4xl mx-auto">
          {/* Profile Header - same width as grid below */}
          <div className="flex flex-col gap-6 mb-6 sm:mb-8 sm:flex-row sm:items-center sm:justify-between bg-white rounded-2xl sm:rounded-3xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between w-full px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5">
              <div className="relative w-24 h-24 sm:w-32 sm:h-32 shrink-0 overflow-visible">
                <div className="relative z-0 w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                  <img
                    src="/assets/images/profileIcon.svg"
                    alt="Profile"
                    className="h-full w-full object-contain object-center"
                  />
                </div>
                <button
                  type="button"
                  className="absolute bottom-12 right-0 w-6 h-6 sm:w-7 sm:h-7 -translate-x-1/2 translate-y-1/2 rounded-full bg-white border border-[#E2E8F0] shadow-[0_2px_6px_rgba(0,0,0,0.1)] flex items-center justify-center hover:bg-gray-50 transition-colors overflow-hidden p-1 sm:p-1.5 z-20"
                >
                  <img
                    src="/assets/images/settingIcon.svg"
                    alt="Settings"
                    className="w-full h-full object-contain"
                  />
                </button>
              </div>
              <div className="pt-1 text-center sm:text-left">
                <h1 className="text-xl sm:text-2xl font-semibold text-[#132329]">
                  Sarah Miller
                </h1>
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-sm text-[#64748B] mt-0.5">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  San Francisco, CA
                </div>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 mt-2">
                  <Badge className="bg-[#E0EDFF] text-[#155DFC] hover:bg-[#E0EDFF] font-bold text-xs tracking-wide uppercase border-0">
                    Care Coordinator
                  </Badge>
                  <Badge className="bg-transparent text-[#62748E] hover:bg-transparent font-bold text-xs tracking-wide uppercase border border-[#E2E8F0] rounded-full px-2.5 py-0.5">
                    Member since 2020
                  </Badge>
                </div>
              </div>
              </div>
              <div className="flex items-center justify-center sm:justify-end gap-2 sm:gap-3">
                <button
                  type="button"
                  className="flex flex-col items-center justify-center gap-2 sm:gap-3 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-3xl bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] transition-colors p-3 sm:p-4"
                >
                  <History className="w-4 h-4 sm:w-5 sm:h-5 text-[#94A3B8]" />
                  <span className="text-[10px] sm:text-xs font-medium text-[#62748E] uppercase tracking-wide">
                    History
                  </span>
                </button>
                <button
                  type="button"
                  className="flex flex-col items-center justify-center gap-2 sm:gap-3 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-3xl bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] transition-colors p-3 sm:p-4"
                >
                  <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-[#94A3B8]" />
                  <span className="text-[10px] sm:text-xs font-medium text-[#62748E] uppercase tracking-wide">
                    Alerts
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Main Content - same width as profile section above */}
          <div className="grid grid-cols-1 md:grid-cols-[minmax(280px,320px)_1fr] gap-6 md:gap-8">
            {/* Left Column - Assessment */}
            <div>
              <Card className="border border-[#E2E8F0] shadow-sm rounded-3xl overflow-hidden">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-base font-bold text-[#132329]">
                      Current Assessment
                    </h2>
                    <Sparkles className="w-5 h-5 text-[#155DFC]" />
                  </div>

                  <div className="flex items-center gap-2 mb-5">
                    <img
                      src="/assets/images/timerIcon.svg"
                      alt="Status"
                      className="w-6 h-6 sm:w-8 sm:h-8 object-contain shrink-0"
                    />
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[#90A1B9] font-medium">
                        Status
                      </p>
                      <p className="text-sm font-bold text-[#132329]">
                        Matches Generated
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="bg-[#F8FAFC] rounded-lg px-4 py-3">
                      <p className="text-[10px] uppercase tracking-wider text-[#90A1B9] font-medium mb-0.5">
                        Primary Need
                      </p>
                      <p className="text-sm font-bold text-[#132329]">
                        Assisted Living
                      </p>
                    </div>
                    <div className="bg-[#F8FAFC] rounded-lg px-4 py-3">
                      <p className="text-[10px] uppercase tracking-wider text-[#90A1B9] font-medium mb-0.5">
                        Budget Target
                      </p>
                      <p className="text-sm font-bold text-[#132329]">
                        $4,000/mo
                      </p>
                    </div>
                    <div className="bg-[#F8FAFC] rounded-lg px-4 py-3">
                      <p className="text-[10px] uppercase tracking-wider text-[#90A1B9] font-medium mb-0.5">
                        Key Care Needs
                      </p>
                      <p className="text-[10px] font-extrathin italic text-[#90A1B9]">
                        None specified
                      </p>
                    </div>
                  </div>

                  <Button className="w-full rounded-lg h-11 font-semibold bg-[#132329] text-white hover:bg-[#132329]/90">
                    Retake Assessment
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>

              <Link
                to="/"
                className="flex items-center gap-2 text-sm text-[#64748B] mt-6 hover:text-[#132329] transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Link>
            </div>

            {/* Right Column */}
            <div className="space-y-8">
              {/* Saved Facilities */}
              <div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                  <h2 className="text-lg sm:text-xl font-semibold text-[#132329]">
                    Your Saved Facilities
                  </h2>
                  <button
                    type="button"
                    className="text-sm text-[#155DFC] font-bold hover:underline flex items-center gap-1 w-fit"
                  >
                    Browse more <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <Card className="border border-[#E2E8F0] shadow-sm rounded-3xl overflow-hidden">
                  <CardContent className="flex flex-col items-center justify-center py-10 sm:py-14 px-4 sm:px-6">
                    <img
                      src="/assets/images/heart.svg"
                      alt="Saved facilities"
                      className="w-10 h-auto object-contain mb-4"
                    />
                    <p className="text-base font-semibold text-[#132329] mb-1">
                      No saved facilities yet
                    </p>
                    <p className="text-sm text-[#62748E] text-center mb-5 max-w-xs">
                      Browse your personalized matches and save the ones that
                      resonate with you.
                    </p>
                    <Button className="rounded-lg h-10 px-6 font-semibold bg-[#155DFC] text-white hover:bg-[#155DFC]/90">
                      View Matches
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Links */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <Card className="border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow cursor-pointer rounded-3xl overflow-hidden">
                  <CardContent className="p-4 sm:p-5">
                    <div className="w-10 h-10 rounded-full bg-[#E0EDFF] flex items-center justify-center mb-3">
                      <Shield className="w-5 h-5 text-[#00B8DB]" />
                    </div>
                    <h3 className="text-sm font-bold text-[#132329] mb-1">
                      Privacy & Security
                    </h3>
                    <p className="font-['Inter'] font-light text-[14px] leading-[22.75px] tracking-[-0.15px] text-[#62748E]">
                      Manage your data permissions and how your information is
                      shared with care providers.
                    </p>
                  </CardContent>
                </Card>
                <Card className="border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow cursor-pointer rounded-3xl overflow-hidden">
                  <CardContent className="p-4 sm:p-5">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center mb-3">
                      <Calendar className="w-5 h-5 text-orange-500" />
                    </div>
                    <h3 className="text-sm font-bold text-[#132329] mb-1">
                      Upcoming Tours
                    </h3>
                    <p className="font-['Inter'] font-light text-[14px] leading-[22.75px] tracking-[-0.15px] text-[#62748E]">
                      View and manage your scheduled facility visits and virtual
                      tour appointments.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
