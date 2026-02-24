import React from "react";
import { Clock, ShieldCheck, Phone } from "lucide-react";

export default function TopBar() {
  return (
    <div className="w-full bg-[#00BCD4] py-2 sm:py-2.5">
      <div className="container mx-auto flex flex-col items-center justify-between gap-3 px-3 sm:flex-row sm:flex-nowrap sm:items-center sm:gap-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-start sm:gap-6">
          <span className="flex items-center gap-1.5 text-xs font-medium text-cyan-50/95 sm:gap-2 sm:text-sm">
            <Clock className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" strokeWidth={2} />
            24/7 Expert Support
          </span>
          <span className="flex items-center gap-1.5 text-xs font-medium text-cyan-50/95 sm:gap-2 sm:text-sm">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" strokeWidth={2} />
            100% Free Service
          </span>
        </div>
        <a
          href="tel:1-888-227-3669"
          className="flex items-center gap-1.5 text-xs font-medium text-cyan-50/95 transition-opacity hover:opacity-90 sm:gap-2 sm:text-sm sm:shrink-0"
        >
          <Phone className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" strokeWidth={2} />
          1-888-CARE-NOW
        </a>
      </div>
    </div>
  );
}
