import React from "react";
import { useLocation } from "react-router-dom";

export default function TopBar() {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith("/dashboard");

  // Extra left/right gaps only on dashboard; inline styles so they always apply
  return (
    <div
      className="w-full bg-[#00BCD4] py-2 sm:py-2.5"
      style={isDashboard ? { paddingLeft: "max(1.5rem, 5vw)", paddingRight: "max(1.5rem, 5vw)" } : undefined}
    >
      <div
        className={`mx-auto flex min-w-0 flex-col items-center justify-between gap-3 sm:flex-row sm:flex-nowrap sm:items-center sm:gap-4 ${
          isDashboard
            ? "max-w-[1800px] px-2 sm:px-4"
            : "container px-4 sm:px-6 lg:max-w-6xl lg:px-8 min-[1280px]:max-w-[1400px] min-[1280px]:px-10 min-[1536px]:max-w-[1600px] min-[1536px]:px-12 min-[1920px]:max-w-[1800px] min-[1920px]:px-14"
        }`}
      >
        <div className="flex min-w-0 flex-wrap items-center justify-center gap-4 sm:justify-start sm:gap-6">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-white sm:gap-2 sm:text-sm">
            <img
              src="/assets/images/timer.svg"
              alt=""
              className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4"
            />
            24/7 Live Support
          </span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="tel:1-888-262-8244"
            className="flex items-center gap-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 sm:gap-2 sm:text-sm sm:shrink-0"
          >
            <img
              src="/assets/images/phone.svg"
              alt=""
              className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4"
            />
            1-888-CMATCH-AI
          </a>
          <button
            type="button"
            className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:bg-white/30 sm:text-sm"
          >
            Call Now
          </button>
        </div>
      </div>
    </div>
  );
}
