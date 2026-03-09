import React, { useState, useEffect } from "react";
import SearchBar from "../SearchBar";

// Use hero-bg.png - "banner" in filename triggers ad blockers (ERR_BLOCKED_BY_CLIENT)
const BANNER_BG = "/assets/images/hero-bg.png";

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
    <section
      className="relative w-full min-h-[420px] overflow-hidden bg-cover bg-center bg-no-repeat sm:min-h-[480px] md:min-h-[520px] lg:min-h-[560px]"
      style={{
        backgroundImage: `url(${BANNER_BG})`,
      }}
    >
      {/* Fallback: img element in case CSS background doesn't load */}
      <img
        src={BANNER_BG}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover object-center"
      />
      {/* Subtle gradient – only fades to white at very bottom so image shows through */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, transparent 75%, rgba(255, 255, 255, 0.6) 90%, #FFFFFF 100%)",
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
          transform-origin: center;
        }
      `}</style>
      <div className="container relative z-10 mx-auto flex flex-col items-center justify-center px-4 py-12 text-center sm:px-6 sm:py-16 md:py-20 lg:px-8 lg:py-24 min-[1280px]:max-w-4xl min-[1280px]:px-8 min-[1280px]:py-20 min-[1536px]:max-w-[1400px] min-[1536px]:px-12 min-[1536px]:py-28">
        {/* Logo: full logo always pulses on home page */}
        <svg
          viewBox="0 0 43 41"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="banner-logo-pulse mb-8 h-10 w-10 sm:mb-10 sm:h-12 sm:w-12 md:mb-12 md:h-14 md:w-14 lg:mb-14 lg:h-16 lg:w-16 min-[1280px]:mb-12 min-[1280px]:h-14 min-[1280px]:w-14 min-[1536px]:h-20 min-[1536px]:w-20 min-[1536px]:mb-16"
          aria-label="CareMatch AI"
        >
          <path d="M21.3074 6.11932C21.4439 6.15187 21.5074 6.08291 21.6036 6.00692C22.6239 5.20108 23.6219 3.86357 24.579 2.95187C27.6769 0.000527893 32.3106 -0.854292 36.1821 1.02446C37.2493 1.54239 37.6891 2.10578 38.5529 2.73711C39.1503 3.17351 39.5553 3.59848 40.0193 4.22479C42.8393 8.03012 42.6359 13.1808 39.6788 16.8479C38.6195 18.1618 37.3155 19.2692 36.154 20.4924L40.6304 24.9672C44.9264 30.2676 42.5699 38.3015 35.8899 40.1744C27.3122 42.5795 20.3944 32.674 25.845 25.4399C28.8187 21.4936 33.5422 18.0626 36.8028 14.2402C39.6519 10.2151 37.6304 4.82022 32.627 4.02045C31.0834 3.77382 28.7794 4.27831 27.6487 5.40896L21.4859 11.5717H21.308L15.1441 5.40762C13.8665 4.13017 11.0999 3.66879 9.39526 4.12195C4.92926 5.30913 3.24959 10.7768 6.07674 14.3556C9.3789 17.9764 13.404 21.2561 16.6326 24.9056C22.2109 31.2111 16.9207 41.2798 8.51011 40.4878C0.969436 39.7776 -2.61238 30.731 2.16234 24.9634L6.64183 20.4895C4.45675 18.3158 2.18063 16.3719 1.23235 13.3476C-1.05185 6.06245 5.36827 -1.2796 12.8912 0.189108C14.0649 0.418291 16.5077 1.31958 17.3363 2.14822L21.3074 6.11932ZM33.4286 23.2183L28.7176 27.9293C28.5323 28.1146 27.9605 29.6615 27.8954 30.0035C26.6494 36.5503 36.0277 39.3241 38.5404 33.0863C40.2782 28.7721 36.357 26.4357 33.8675 23.7809C33.6956 23.5976 33.5997 23.3936 33.4286 23.2183ZM14.0793 27.9278L9.36736 23.2158C8.98493 23.4897 8.75031 23.9379 8.45371 24.2528C6.12063 26.7289 3.09927 28.4772 4.0439 32.3714C5.12538 36.8296 10.858 38.0579 13.7683 34.5652C15.1824 32.8684 15.4189 29.7294 14.0793 27.9278Z" fill="#00CFF4" />
          <path d="M30.6122 8.72812C31.0252 8.43988 32.103 8.50462 32.5085 8.79488C33.5706 9.55492 33.8161 10.5661 33.2135 11.6915L22.6675 22.2394L21.3982 24.1054L20.1285 22.239L9.58088 11.689C8.48093 9.91394 10.3558 7.78839 12.2404 8.79253L21.0714 17.6223L21.4569 17.8833L30.6122 8.72812Z" fill="#00CFF4" />
        </svg>
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
