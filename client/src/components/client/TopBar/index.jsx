import React from "react";

export default function TopBar() {
  return (
    <div className="w-full bg-[#00BCD4] py-2 sm:py-2.5">
      <div className="container mx-auto flex flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:flex-nowrap sm:items-center sm:gap-4 sm:px-6 lg:max-w-6xl lg:px-8 min-[1280px]:max-w-[1400px] min-[1280px]:px-10 min-[1536px]:max-w-[1600px] min-[1536px]:px-12 min-[1920px]:max-w-[1800px] min-[1920px]:px-14">
        <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-start sm:gap-6">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-white sm:gap-2 sm:text-sm">
            <img
              src="/assets/images/timer.svg"
              alt=""
              className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4"
            />
            24/7 Expert Support
          </span>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-white sm:gap-2 sm:text-sm">
            <img
              src="/assets/images/sheild.svg"
              alt=""
              className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4"
            />
            100% Free Service
          </span>
        </div>
        <a
          href="tel:1-888-227-3669"
          className="flex items-center gap-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 sm:gap-2 sm:text-sm sm:shrink-0"
        >
          <img
            src="/assets/images/phone.svg"
            alt=""
            className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4"
          />
          1-888-CARE-NOW
        </a>
      </div>
    </div>
  );
}
