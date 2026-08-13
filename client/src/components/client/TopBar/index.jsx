import React from "react";
import { useLocation } from "react-router-dom";
import { Headphones, CircleCheck, Phone } from "lucide-react";

export default function TopBar() {
  const location = useLocation();
  const isDashboard =
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/portal") ||
    location.pathname.startsWith("/facility");

  const containerClass = isDashboard
    ? "mx-auto max-w-[1800px] px-2 sm:px-4"
    : "container mx-auto px-6 sm:px-8 md:px-10 lg:max-w-6xl lg:px-12 min-[1280px]:max-w-[1400px] min-[1280px]:px-16 min-[1536px]:max-w-[1600px] min-[1536px]:px-20 min-[1920px]:max-w-[1800px] min-[1920px]:px-24";

  return (
    <div
      className="w-full"
      style={{
        backgroundColor: "#00B8DB",
        ...(isDashboard
          ? {
              paddingLeft: "max(1.5rem, 5vw)",
              paddingRight: "max(1.5rem, 5vw)",
            }
          : {}),
      }}
    >
      <div
        className={`flex h-9 min-w-0 items-center justify-between gap-4 sm:h-10 ${containerClass}`}
        style={{ fontFamily: "Rethink Sans, sans-serif" }}
      >
        <div className="flex min-w-0 items-center gap-5 sm:gap-8 md:gap-10">
          <span className="flex items-center gap-2 text-[12px] font-medium leading-none text-white sm:text-[13px]">
            <Headphones
              className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4"
              strokeWidth={2}
              aria-hidden
            />
            <span className="truncate">24/7 Expert Support</span>
          </span>
          <span className="hidden items-center gap-2 text-[12px] font-medium leading-none text-white sm:flex sm:text-[13px]">
            <CircleCheck
              className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4"
              strokeWidth={2}
              aria-hidden
            />
            <span>100% Free Service</span>
          </span>
        </div>

        <a
          href="tel:1-888-227-3669"
          className="flex shrink-0 items-center gap-2 text-[12px] font-medium leading-none text-white transition-opacity hover:opacity-90 sm:text-[13px]"
        >
          <Phone
            className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4"
            strokeWidth={2}
            aria-hidden
          />
          <span>1-888-CARE-NOW</span>
        </a>
      </div>
    </div>
  );
}
