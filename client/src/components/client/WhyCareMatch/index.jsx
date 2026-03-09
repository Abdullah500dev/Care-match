import React from "react";
import { TiltCard } from "@/components/ui/tilt-card";

const ACCENT = "#00CFF4";
const ACCENT_BG = "rgba(0, 207, 244, 0.22)";

/** Teal circular icon with border - AI star/snowflake */
function IconAI({ className = "" }) {
  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center sm:h-10 sm:w-10 md:h-12 md:w-12 min-[1920px]:h-12 min-[1920px]:w-12 ${className}`}
      aria-hidden
    >
      <img src="/assets/images/ai-matching.svg" alt="AI" className="h-full w-full object-contain" />
    </div>
  );
}

/** Teal circular icon - verified (circle with notch / badge) */
function IconVerified({ className = "" }) {
  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center sm:h-10 sm:w-10 md:h-12 md:w-12 min-[1920px]:h-12 min-[1920px]:w-12 ${className}`}
      aria-hidden
    >
      <img src="/assets/images/verified.svg" alt="Verified Communities" className="h-full w-full object-contain" />
    </div>
  );
}

/** Teal circular icon - heart */
function IconHeart({ className = "" }) {
  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center sm:h-10 sm:w-10 md:h-12 md:w-12 min-[1920px]:h-12 min-[1920px]:w-12 ${className}`}
      aria-hidden
    >
      <img src="/assets/images/heart-matching.svg" alt="Heart" className="h-full w-full object-contain" />
    </div>
  );
}

/** Double-loop / knot icon overlay on image */
function LoopIcon({ className = "" }) {
  return (
    <div
      className={`absolute bottom-3 right-3 z-10 flex h-10 w-10 items-center justify-center sm:bottom-4 sm:right-4 sm:h-12 sm:w-12 min-[1920px]:bottom-4 min-[1920px]:right-4 min-[1920px]:h-12 min-[1920px]:w-12 ${className}`}
      aria-hidden
    >
      <img
        src="/assets/images/favicon/favicon.svg"
        alt=""
        className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 min-[1920px]:h-16 min-[1920px]:w-16"
      />
    </div>
  );
}

const FEATURES = [
  {
    title: "AI-Powered Matching",
    description:
      "Our advanced AI analyzes thousands of communities to find your perfect match in seconds.",
    Icon: IconAI,
  },
  {
    title: "Verified Communities",
    description:
      "Every community is thoroughly vetted for quality, safety, and licensing compliance.",
    Icon: IconVerified,
  },
  {
    title: "Always Free",
    description:
      "Our service is 100% free to families. We're paid by communities, never by you.",
    Icon: IconHeart,
  },
];

export default function WhyCareMatch() {
  return (
    <section
      className="relative w-full overflow-hidden py-10 sm:py-12 md:py-16 lg:py-20 min-[1280px]:py-24 min-[1920px]:py-28"
      style={{ backgroundColor: "#fff" }}
    >
      <div className="container relative z-10 mx-auto min-w-0 px-4 sm:px-6 md:px-8 lg:max-w-6xl lg:px-8 min-[1280px]:max-w-[1400px] min-[1280px]:px-10 min-[1536px]:max-w-[1600px] min-[1536px]:px-12 min-[1920px]:max-w-[1800px] min-[1920px]:px-14">
        {/* Card container: rounded, same light bg for visual cohesion */}
        <div
          className="overflow-hidden rounded-xl shadow-sm pb-8 sm:rounded-2xl sm:pb-10 md:rounded-3xl md:pb-12 min-[1280px]:rounded-[24px] min-[1280px]:pb-14 min-[1920px]:rounded-[24px] min-[1920px]:pb-14"
          style={{
            background: "linear-gradient(135deg, #F9FAFB 0%, #EFF6FF 100%)",
          }}
        >
          {/* At 1024px (lg) stay stacked with tight gap and full-width content; two columns from 1280px */}
          <div className="flex flex-col gap-6 px-4 sm:gap-8 sm:px-6 md:gap-10 md:px-8 lg:gap-6 lg:px-6 lg:pb-2 min-[1280px]:flex-row min-[1280px]:items-stretch min-[1280px]:gap-10 min-[1280px]:px-10 min-[1920px]:px-10">
            {/* Left: text + features */}
            <div className="flex flex-1 flex-col justify-center px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10 lg:max-w-none lg:py-6 lg:px-0 min-[1280px]:max-w-[50%] min-[1280px]:py-12 min-[1280px]:pl-10 min-[1280px]:pr-8 min-[1920px]:pl-14 min-[1920px]:pr-10">
              <span
                className="inline-block w-fit rounded-md px-3 py-1 text-xs font-medium sm:px-4 sm:py-1.5 sm:text-sm md:text-base min-[1920px]:px-5 min-[1920px]:py-3 min-[1920px]:text-base"
                style={{ backgroundColor: "#00CFF41A", color: "#00CFF4" }}
              >
                Why CareMatch
              </span>
              <h2 className="mt-3 text-xl font-semibold tracking-tight text-[#101828] sm:mt-4 sm:text-2xl md:mt-5 md:text-3xl lg:mt-4 lg:text-[1.75rem] lg:leading-tight min-[1280px]:text-4xl min-[1280px]:mt-5 min-[1280px]:text-[2.75rem] min-[1920px]:text-[56px] min-[1920px]:leading-tight min-[1920px]:pr-20">
                Your Trusted Partner in Senior Care
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#101828] font-normal sm:mt-3 sm:text-base md:mt-4 md:text-lg lg:text-base min-[1280px]:text-xl min-[1920px]:text-2xl">
                We Understand That Finding The Right Care For Your Loved One Is
                One Of Life's Most Important Decisions. That's Why We're Here To
                Help - At No Cost To You.
              </p>
              <div className="mt-4 space-y-4 sm:mt-6 sm:space-y-6 md:space-y-7 lg:space-y-6 min-[1280px]:mt-10 min-[1280px]:space-y-8 min-[1280px]:pr-8 min-[1920px]:pr-[82px]">
                {FEATURES.map(({ title, description, Icon }) => (
                  <div key={title} className="flex gap-3 sm:gap-4 min-[1920px]:gap-5">
                    <Icon />
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-[#132329] sm:text-base md:text-lg lg:text-base min-[1920px]:text-[22px]">
                        {title}
                      </h3>
                      <p className="mt-0.5 text-xs leading-relaxed text-[#4A5565] sm:mt-1 sm:text-sm md:text-base lg:text-sm min-[1920px]:text-lg">
                        {description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: image with overlay icon */}
            <TiltCard className="relative w-full shrink-0 lg:mt-0 min-[1280px]:mt-14 min-[1280px]:w-[48%] min-[1920px]:w-[45%] min-[1920px]:mt-14" innerClassName="relative aspect-[4/5] w-full overflow-hidden sm:aspect-[3/4] lg:aspect-[3/2] min-[1280px]:aspect-auto min-[1280px]:h-full min-[1280px]:min-h-[380px] min-[1920px]:min-h-[420px] rounded-2xl min-[1280px]:rounded-3xl min-[1920px]:rounded-[24px] block">
              <img
                  src="/assets/images/carematch.jpeg"
                  alt="Elderly woman and caregiver in a warm, supportive setting"
                  className="h-full w-full object-cover lg:rounded-2xl min-[1280px]:rounded-3xl min-[1920px]:rounded-[24px]"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80";
                  }}
                />
                {/* <LoopIcon /> */}
            </TiltCard>
          </div>
        </div>
      </div>
    </section>
  );
}
