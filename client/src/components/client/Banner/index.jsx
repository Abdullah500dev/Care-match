import React from "react";
import SearchBar from "../SearchBar";

export default function Banner() {
  return (
    <section
      className="relative min-h-[60vh] w-full overflow-hidden bg-cover bg-center bg-no-repeat sm:min-h-[70vh] lg:min-h-[75vh] min-[1280px]:min-h-[72vh] min-[1536px]:min-h-[80vh]"
      style={{ backgroundImage: "url(/assets/images/bannerBg.png)" }}
    >
      {/* Gradient overlay on BG image only – text sits above via z-index */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(255, 255, 255, 0) 70%, #FFFFFF 95%)",
        }}
        aria-hidden
      />

      <div className="container relative z-10 mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-12 text-center sm:min-h-[70vh] sm:px-6 sm:py-16 md:py-20 lg:min-h-[75vh] lg:px-8 lg:py-24 min-[1280px]:min-h-[72vh] min-[1280px]:max-w-4xl min-[1280px]:px-8 min-[1280px]:py-20 min-[1536px]:min-h-[80vh] min-[1536px]:max-w-[1400px] min-[1536px]:px-12 min-[1536px]:py-28">
        {/* Orb: scales for 1280 (xl) and 1536 (2xl) explicitly */}
        <img
          src="/assets/images/bolb.svg"
          alt=""
          className="mb-8 h-10 w-10 sm:mb-10 sm:h-12 sm:w-12 md:mb-12 md:h-14 md:w-14 lg:mb-14 lg:h-16 lg:w-16 min-[1280px]:mb-12 min-[1280px]:h-14 min-[1280px]:w-14 min-[1536px]:h-20 min-[1536px]:w-20 min-[1536px]:mb-16"
        />
        <h1
          className="font-semibold capitalize tracking-tight text-[#132329] text-3xl leading-tight sm:text-4xl sm:leading-snug md:text-5xl md:leading-[1.15] lg:text-[56px] lg:leading-[1.2]"
          style={{
            fontSize: "clamp(1.875rem, 2.5vw + 1rem, 3.25rem)",
            lineHeight: "1.2",
          }}
        >
          Meet carrie – <br className="hidden sm:block" />
          Your senior healthcare AI advisor
        </h1>
        <p
          className="mt-3 font-normal text-[#132329] text-base leading-relaxed sm:mt-4 sm:text-lg sm:leading-8 md:mt-5 md:text-xl md:leading-8 lg:text-xl lg:leading-9"
          style={{
            fontSize: "clamp(1rem, 1vw + 0.75rem, 1.25rem)",
            marginTop: "clamp(0.75rem, 1.25vw, 1.25rem)",
          }}
        >
          <span className="block sm:inline">Let carrie help you discover verified senior living communities</span>
          <br className="hidden sm:block" />
          <span className="block sm:inline">tailored to your loved one's needs. 100% free, personalized service.</span>
        </p>

        <div className="mt-6 w-full max-w-4xl px-2 sm:mt-8 lg:mt-10 min-[1280px]:mt-8 min-[1536px]:mt-12">
          <SearchBar />
        </div>
      </div>
    </section>
  );
}
