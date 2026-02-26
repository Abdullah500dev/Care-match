import React from "react";

/** Turquoise double-loop / infinity style icon for the image block */
function LoopIcon({ className = "" }) {
  return (
    <div
      className={`absolute bottom-3 right-3 z-10 flex h-10 w-10 items-center justify-center sm:bottom-4 sm:right-4 sm:h-12 sm:w-12 min-[1920px]:bottom-4 min-[1920px]:right-4 min-[1920px]:h-12 min-[1920px]:w-12 ${className}`}
      aria-hidden
    >
      <img
        src="/assets/images/favicon/favicon.svg"
        alt=""
        aria-hidden
        className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 min-[1920px]:h-16 min-[1920px]:w-16"
      />
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
      className="relative w-full overflow-hidden py-10 sm:py-12 md:py-16 lg:py-20 min-[1280px]:py-24 min-[1920px]:py-28"
      style={{
        background:
          "linear-gradient(117.63deg, rgba(249, 171, 97, 0.22) 2.27%, rgba(0, 207, 244, 0.22) 56.96%, rgba(185, 244, 255, 0.22) 111.64%)",
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

      <div className="container relative z-10 mx-auto min-w-0 px-4 sm:px-6 md:px-8 lg:max-w-6xl lg:px-8 min-[1280px]:max-w-[1400px] min-[1280px]:px-10 min-[1536px]:max-w-[1600px] min-[1536px]:px-12 min-[1920px]:max-w-[1800px] min-[1920px]:px-14">
        {/* Top: tag + title + subtitle */}
        <div className="mx-auto max-w-3xl text-center">
          <span
            className="inline-block rounded-md px-3 py-1 text-xs font-medium text-[#00CFF4] sm:px-4 sm:py-1.5 sm:text-sm md:text-base min-[1920px]:px-5 min-[1920px]:py-3 min-[1920px]:text-lg"
            style={{ backgroundColor: "#00CFF41A" }}
          >
            All Care Options
          </span>
          <h2 className="mt-3 text-xl font-bold tracking-tight text-[#101828] sm:mt-4 sm:text-2xl md:mt-5 md:text-3xl lg:text-4xl lg:leading-tight min-[1280px]:text-[2.75rem] min-[1920px]:text-[56px] min-[1920px]:leading-tight">
            Assisted Living Solutions
          </h2>
          <p className="mt-2 text-sm text-[#101828] sm:mt-3 sm:text-base md:mt-4 md:text-lg min-[1920px]:text-2xl">
            We'll help you find the right care for you or your loved one!
          </p>
        </div>

        {/* Image left at full height; dark card shorter and overlapping from the right */}
        <div className="relative mt-4 sm:mt-6 md:mt-10 lg:mt-14 min-[1280px]:mt-20 min-[1920px]:mt-40">
          {/* Left: image full height with overlapping icon */}
          <div className="relative w-full lg:w-[45%]">
            <div className="relative overflow-hidden">
              <img
                src="/assets/images/AssistedLivingSolutions.svg"
                alt="Family and caregivers outdoors with mobility support"
                className="h-auto w-full object-cover min-h-[200px] sm:min-h-[240px] md:min-h-[280px] lg:min-h-[320px] min-[1280px]:min-h-[360px] min-[1920px]:min-h-[360px]"
              />
            </div>
            <LoopIcon />
          </div>

          {/* Dark card: natural (shorter) height, vertically centered, overlapping image */}
          <div className="mt-4 rounded-xl bg-[#1A202C] p-4 shadow-xl sm:mt-6 sm:rounded-2xl sm:p-6 md:p-8 lg:absolute lg:right-0 lg:top-1/2 lg:mt-0 lg:w-[59%] lg:-translate-y-1/2 lg:rounded-2xl lg:p-8 min-[1280px]:p-10 min-[1920px]:p-12">
            <p className="text-left text-sm leading-relaxed text-white sm:text-base md:text-lg min-[1920px]:text-xl">
              Our network focuses exclusively on providing the highest quality
              assisted living. From daily activity support to specialized
              medical management, we ensure every resident thrives in a
              supportive community.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 sm:mt-6 sm:gap-3 md:gap-4 min-[1920px]:mt-8">
              {FEATURE_BUTTONS.map(({ label }) => (
                <button
                  key={label}
                  type="button"
                  className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-[#1A202C] transition hover:bg-gray-50 sm:px-4 sm:py-2.5 sm:text-sm md:px-5 md:py-3 md:text-base min-[1920px]:w-[30%] min-[1920px]:flex-none"
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
