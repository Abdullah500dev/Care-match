import React from "react";

/** Turquoise double-loop / infinity style icon for the image block */
function LoopIcon({ className = "" }) {
  return (
    <div
      className={`absolute bottom-4 right-4 z-10 flex h-12 w-12 items-center justify-center sm:h-10 sm:w-10 md:right-4 md:bottom-4 md:h-10 md:w-10 ${className}`}
      aria-hidden
    >
     <img src="/assets/images/favicon/favicon.svg" alt="Loop" className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16" />
    </div>
  );
}

const FEATURE_BUTTONS = [
  { label: "24/7 Support" },
  { label: "Health Care" },
  { label: "Social Events" },
];

export default function AssistedLiving() {
  return (
    <section
      className="relative w-full overflow-hidden py-12 sm:py-16 md:py-20 lg:py-24 min-[1280px]:py-28"
      style={{
        background:
          "linear-gradient(135deg, #FFF5F0 0%, #E8F7FA 45%, #D6EFF5 100%)",
      }}
    >
      {/* Subtle circular / wave pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        aria-hidden
        style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, #00CFF4 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, #00CFF4 0%, transparent 45%),
            radial-gradient(circle at 50% 50%, #0ea5e9 0%, transparent 60%)`,
        }}
      />

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:max-w-6xl lg:px-8 min-[1280px]:max-w-[1400px] min-[1280px]:px-10 min-[1536px]:max-w-[1600px] min-[1536px]:px-12 min-[1920px]:max-w-[1800px] min-[1920px]:px-14">
        {/* Top: tag + title + subtitle */}
        <div className="mx-auto max-w-3xl text-center">
          <span
            className="inline-block rounded-full px-4 py-1.5 text-sm font-medium text-white sm:px-5 sm:py-2 sm:text-base"
            style={{ backgroundColor: "#00CFF4" }}
          >
            All Care Options
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#132329] sm:mt-5 sm:text-4xl md:text-5xl lg:text-[56px] lg:leading-tight">
            Assisted Living Solutions
          </h2>
          <p className="mt-3 text-base text-gray-700 sm:mt-4 sm:text-lg md:text-xl">
            We'll Help You Find The Right Care For You Or Your Loved One!
          </p>
        </div>

        {/* Image left at full height; dark card shorter and overlapping from the right */}
        <div className="relative mt-10 lg:mt-14">
          {/* Left: image full height with overlapping icon */}
          <div className="relative w-full lg:w-[45%]">
            <div className="relative overflow-hidden">
              <img
                src="/assets/images/AssistedLivingSolutions.svg"
                alt="Family and caregivers outdoors with mobility support"
                className="h-auto w-full object-cover min-h-[240px] sm:min-h-[280px] md:min-h-[320px] lg:min-h-[360px]"
              />
            </div>
            <LoopIcon />
          </div>

          {/* Dark card: natural (shorter) height, vertically centered, overlapping image */}
          <div className="mt-6 rounded-2xl bg-[#1A202C] p-6 shadow-xl sm:p-8 md:p-12 lg:absolute lg:right-0 lg:top-1/2 lg:mt-0 lg:w-[59%] lg:-translate-y-1/2 lg:rounded-2xl">
            <p className="text-left text-base leading-relaxed text-white sm:text-lg md:text-xl">
              Our network focuses exclusively on providing the highest quality
              assisted living. From daily activity support to specialized
              medical management, we ensure every resident thrives in a
              supportive community.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 sm:mt-8 sm:gap-4">
              {FEATURE_BUTTONS.map(({ label }) => (
                <button
                  key={label}
                  type="button"
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-[#1A202C] transition hover:bg-gray-50 sm:px-5 sm:py-3 w-[30%] sm:text-base"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
