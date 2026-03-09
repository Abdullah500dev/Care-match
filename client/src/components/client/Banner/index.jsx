import React, { useState, useEffect } from "react";
import SearchBar from "../SearchBar";

const BANNER_HEADING = "Meet carrie – \nYour senior healthcare AI advisor";
const TYPE_SPEED_MS = 70;
const CURSOR_BLINK_MS = 530;

export default function Banner() {
  const [displayedLength, setDisplayedLength] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (displayedLength >= BANNER_HEADING.length) return;
    const t = setTimeout(() => setDisplayedLength((d) => d + 1), TYPE_SPEED_MS);
    return () => clearTimeout(t);
  }, [displayedLength]);

  // When typewriter completes, wait briefly then restart so it loops
  useEffect(() => {
    if (displayedLength < BANNER_HEADING.length) return;
    const t = setTimeout(() => setDisplayedLength(0), 1500);
    return () => clearTimeout(t);
  }, [displayedLength]);

  useEffect(() => {
    const t = setInterval(() => setShowCursor((c) => !c), CURSOR_BLINK_MS);
    return () => clearInterval(t);
  }, []);

  const displayedText = BANNER_HEADING.slice(0, displayedLength);
  const lines = displayedText.split("\n");
  const isComplete = displayedLength >= BANNER_HEADING.length;

  return (
    <section className="relative w-full min-h-[420px] overflow-hidden sm:min-h-[480px] md:min-h-[520px] lg:min-h-[560px]">
      {/* Background image as real element so it always renders */}
      <img
        src="/assets/images/bannerBg.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover object-center"
      />
      {/* Gradient overlay on top of BG image */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(180deg, rgba(255, 255, 255, 0) 70%, #FFFFFF 95%)",
        }}
        aria-hidden
      />

      <style>{`
        @keyframes banner-logo-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.92; }
        }
        .banner-logo-pulse {
          animation: banner-logo-pulse 2.5s ease-in-out infinite;
        }
      `}</style>
      <div className="container relative z-10 mx-auto flex flex-col items-center justify-center px-4 py-12 text-center sm:px-6 sm:py-16 md:py-20 lg:px-8 lg:py-24 min-[1280px]:max-w-4xl min-[1280px]:px-8 min-[1280px]:py-20 min-[1536px]:max-w-[1400px] min-[1536px]:px-12 min-[1536px]:py-28">
        {/* Orb: scales for 1280 (xl) and 1536 (2xl) explicitly; gentle pulse */}
        <img
          src="/assets/images/favicon/favicon.svg"
          alt="CareMatch AI"
          className="banner-logo-pulse mb-8 h-10 w-10 sm:mb-10 sm:h-12 sm:w-12 md:mb-12 md:h-14 md:w-14 lg:mb-14 lg:h-16 lg:w-16 min-[1280px]:mb-12 min-[1280px]:h-14  min-[1280px]:w-14 min-[1536px]:h-20 min-[1536px]:w-20 min-[1536px]:mb-16"
        />
        {/* Fixed-height wrapper so typewriter loop never shifts the search bar */}
        <div className="min-h-[5.5rem] sm:min-h-[6rem] md:min-h-[7rem] lg:min-h-[8rem] flex flex-col justify-start">
          <h1
            className="font-semibold capitalize tracking-tight text-[#132329] text-3xl leading-tight sm:text-4xl sm:leading-snug md:text-5xl md:leading-[1.15] lg:text-[56px] lg:leading-[1.2]"
            style={{
              fontSize: "clamp(1.875rem, 2.5vw + 1rem, 3.25rem)",
              lineHeight: "1.2",
            }}
          >
            {lines.map((line, i) => (
              <React.Fragment key={i}>
                {i > 0 && <br className="hidden sm:block" />}
                {line}
              </React.Fragment>
            ))}
            <span
              aria-hidden
              className={`inline-block h-[0.9em] w-0.5 align-middle bg-[#132329] sm:h-[0.85em] ${
                showCursor && !isComplete ? "opacity-100" : "opacity-0"
              }`}
              style={{
                marginLeft: "2px",
                animation: isComplete ? "none" : undefined,
              }}
            />
          </h1>
        </div>
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

        <div className="mt-6 w-full max-w-4xl px-2 sm:mt-8 lg:mt-10 min-[1280px]:mt-8 min-[1536px]:mt-10">
          <SearchBar />
        </div>
      </div>
    </section>
  );
}
