import React from "react";

/** White square with light cyan circle and dark cyan checkmark for process cards */
function StepIcon() {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white sm:h-12 sm:w-12">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00C9F0]/30 sm:h-12 sm:w-12">
        <img src="/assets/images/simpleprocessicon.svg" alt="" className="" />
      </span>
    </div>
  );
}

const STEPS = [
  {
    title: "Share Your Needs",
    description:
      "Chat with our AI or use filters to tell us what you're looking for - care type, location, budget, and special requirements",
  },
  {
    title: "Get Personalized Matches",
    description:
      "Receive curated recommendations from our database of 15,000+ verified communities, perfectly matched to your criteria.",
  },
  {
    title: "Tour & Decide",
    description:
      "Schedule virtual or in-person tours, compare options, and get expert guidance until you find the perfect fit.",
  },
];

export default function SimpleProcess() {
  return (
    <section
      className="w-full py-12 sm:py-16 md:py-20 lg:py-24 min-[1280px]:py-28"
      style={{ backgroundColor: "#142A54" }}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:max-w-6xl lg:px-8 min-[1280px]:max-w-[1400px] min-[1280px]:px-10 min-[1536px]:max-w-[1600px] min-[1536px]:px-12 min-[1920px]:max-w-[1800px] min-[1920px]:px-14">
        {/* Tag + title + subtitle */}
        <div className="mx-auto max-w-3xl text-center">
          <span
            className="inline-block rounded-lg px-4 py-1.5 text-sm font-medium text-[#00CFF4] sm:px-5 sm:py-3 sm:text-base"
            style={{
              backgroundColor: "#00CFF41A",
            }}
          >
            Simple Process
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:mt-5 sm:text-4xl md:text-5xl lg:text-[56px] lg:leading-tight">
            Your Journey To Better Care
          </h2>
          <p className="mt-3 text-base text-white/95 sm:mt-4 sm:text-lg md:text-xl">
            We've Helped Over 2 Million Families Find The Perfect Senior Living
            Solution
          </p>
        </div>

        {/* Three process cards */}
        <div className="mt-10 grid grid-cols-1 gap-6 sm:mt-12 sm:gap-8 md:grid-cols-3 md:gap-6 lg:mt-14 lg:gap-8 min-[1280px]:gap-10">
          {STEPS.map((step) => (
            <div
              key={step.title}
              className="rounded-2xl p-5 sm:p-6 md:p-5 lg:p-6 min-[1280px]:p-8 flex flex-col"
              style={{ backgroundColor: "#00C9F0" }}
            >
              <StepIcon />
              <div className="mt-16">
              <h3 className="mt-2 text-lg font-bold text-white sm:text-xl lg:text-xl">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white sm:text-base">
                {step.description}
              </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
