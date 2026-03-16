import React from "react";
import { Link } from "react-router-dom";

/** Sparkle / asterisk icon for AI Assistant button */
function SparkleIcon({ className = "" }) {
  return (
    <img
      src="/assets/images/ai-assistant.svg"
      alt=""
      aria-hidden
      className={`h-5 w-5 shrink-0 sm:h-6 sm:w-6 ${className}`}
    />
  );
}

/** Small circular check icon for footnotes — commented out (checkbox/tick removed site-wide) */
// function FootnoteIcon({ className = "" }) {
//   return (
//     <img
//       src="/assets/images/tick-search.svg"
//       alt=""
//       aria-hidden
//       className={`h-4 w-4 shrink-0 sm:h-5 sm:w-5 ${className}`}
//     />
//   );
// }

export default function StartYourSearch() {
  return (
    <section
      id="start-your-search-section"
      className="relative w-full overflow-hidden py-10 sm:py-16 md:py-20 lg:py-24 min-[1280px]:py-28 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "linear-gradient(180deg, rgba(0,207,244,0.85) 0%, rgba(0,184,220,0.9) 100%), url(/assets/images/overlay-searchbg.svg), url(/assets/images/seacrh-bg-img.png)",
        backgroundSize: "cover, cover, cover",
        backgroundPosition: "center, center, center",
      }}
    >
      <div className="container relative z-10 mx-auto min-w-0 px-4 text-center sm:px-6 md:px-8 lg:max-w-6xl lg:px-8 min-[1280px]:max-w-[1400px] min-[1280px]:px-10 min-[1536px]:max-w-[1600px] min-[1536px]:px-12 min-[1920px]:max-w-[1800px] min-[1920px]:px-14">
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl lg:text-[48px] lg:leading-tight ">
          Start Your Search Today
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-white font-normal sm:mt-5 sm:text-base md:text-lg lg:text-xl lg:max-w-[53rem]">
          Join millions of families who found peace of mind with CareMatch. Our
          service is 100% free{" "}
          <span className="block sm:inline sm:pl-1">
            - no hidden fees, ever.
          </span>
        </p>

        {/* Button + input group */}
        <div className="mt-6 flex w-full max-w-full flex-col items-stretch gap-3 sm:mt-10 sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4">
          <Link
            to="/find-care"
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-semibold transition hover:bg-white/95 sm:w-auto sm:px-8 sm:py-4 sm:text-base"
            style={{ color: "#00CFF4", boxShadow: "0px 20px 25px -5px #0000001A" }}
          >
            <SparkleIcon />
            Try AI Assistant - Carrie
          </Link>
          <input
            type="text"
            placeholder="Enter your location"
            className="min-h-[44px] w-full min-w-0 rounded-xl border-0 bg-white px-4 py-3.5 text-sm text-gray-900 placeholder-gray-500 shadow-sm sm:w-56 sm:max-w-[280px] sm:px-6 sm:py-4 sm:text-base md:w-64 lg:w-72"
            aria-label="Enter your location"
          />
        </div>

        {/* Footnotes — check icons commented out */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-4 sm:mt-8 sm:gap-10">
          <span className="text-xs text-white/90 sm:text-sm">
            No Credit Card Required
          </span>
          <span className="text-xs text-white/90 sm:text-sm">
            100% Free Service
          </span>
        </div>
      </div>
    </section>
  );
}
