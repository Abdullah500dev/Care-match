import React, { useRef } from "react";
import { Link } from "react-router-dom";
import SearchBar from "../SearchBar";

const BANNER_VIDEO = "/assets/images/newHeroVidTesting.mp4";

export default function Banner() {
  const videoRef = useRef(null);

  return (
    <section className="relative w-full min-h-[560px] overflow-hidden sm:min-h-[600px] md:min-h-[640px] lg:min-h-[680px]">
      {/* Video background – muted, seamless loop via onEnded to avoid pause */}
      <video
        ref={videoRef}
        src={BANNER_VIDEO}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover object-center"
        onEnded={() => {
          const el = videoRef.current;
          if (el) {
            el.currentTime = 0;
            el.play();
          }
        }}
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
      <div className="container relative z-10 mx-auto px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8 lg:py-24 min-[1536px]:max-w-[1400px] min-[1536px]:px-12">
        <div className="grid items-start gap-8 lg:grid-cols-[1.9fr_1fr] lg:gap-10">
          <div className="rounded-[28px] border border-white/60 bg-white/85 p-6 shadow-xl backdrop-blur-sm sm:p-8">
            <div className="flex items-center gap-3">
              <svg
                viewBox="0 0 43 41"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="banner-logo-pulse h-9 w-9"
                aria-label="CareMatch AI"
              >
                <path d="M21.3074 6.11932C21.4439 6.15187 21.5074 6.08291 21.6036 6.00692C22.6239 5.20108 23.6219 3.86357 24.579 2.95187C27.6769 0.000527893 32.3106 -0.854292 36.1821 1.02446C37.2493 1.54239 37.6891 2.10578 38.5529 2.73711C39.1503 3.17351 39.5553 3.59848 40.0193 4.22479C42.8393 8.03012 42.6359 13.1808 39.6788 16.8479C38.6195 18.1618 37.3155 19.2692 36.154 20.4924L40.6304 24.9672C44.9264 30.2676 42.5699 38.3015 35.8899 40.1744C27.3122 42.5795 20.3944 32.674 25.845 25.4399C28.8187 21.4936 33.5422 18.0626 36.8028 14.2402C39.6519 10.2151 37.6304 4.82022 32.627 4.02045C31.0834 3.77382 28.7794 4.27831 27.6487 5.40896L21.4859 11.5717H21.308L15.1441 5.40762C13.8665 4.13017 11.0999 3.66879 9.39526 4.12195C4.92926 5.30913 3.24959 10.7768 6.07674 14.3556C9.3789 17.9764 13.404 21.2561 16.6326 24.9056C22.2109 31.2111 16.9207 41.2798 8.51011 40.4878C0.969436 39.7776 -2.61238 30.731 2.16234 24.9634L6.64183 20.4895C4.45675 18.3158 2.18063 16.3719 1.23235 13.3476C-1.05185 6.06245 5.36827 -1.2796 12.8912 0.189108C14.0649 0.418291 16.5077 1.31958 17.3363 2.14822L21.3074 6.11932ZM33.4286 23.2183L28.7176 27.9293C28.5323 28.1146 27.9605 29.6615 27.8954 30.0035C26.6494 36.5503 36.0277 39.3241 38.5404 33.0863C40.2782 28.7721 36.357 26.4357 33.8675 23.7809C33.6956 23.5976 33.5997 23.3936 33.4286 23.2183ZM14.0793 27.9278L9.36736 23.2158C8.98493 23.4897 8.75031 23.9379 8.45371 24.2528C6.12063 26.7289 3.09927 28.4772 4.0439 32.3714C5.12538 36.8296 10.858 38.0579 13.7683 34.5652C15.1824 32.8684 15.4189 29.7294 14.0793 27.9278Z" fill="#00CFF4" />
                <path d="M30.6122 8.72812C31.0252 8.43988 32.103 8.50462 32.5085 8.79488C33.5706 9.55492 33.8161 10.5661 33.2135 11.6915L22.6675 22.2394L21.3982 24.1054L20.1285 22.239L9.58088 11.689C8.48093 9.91394 10.3558 7.78839 12.2404 8.79253L21.0714 17.6223L21.4569 17.8833L30.6122 8.72812Z" fill="#00CFF4" />
              </svg>
              <span className="text-xs font-semibold uppercase tracking-wide text-[#00A8C8]">
                Marketplace search
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-semibold leading-tight text-[#132329] sm:text-4xl lg:text-[46px] lg:leading-[1.1]">
              Find the right care for your loved one
            </h1>
            <p className="mt-3 text-base text-[#475569] sm:text-lg">
              Search verified communities by location, care type, and the services that matter most.
            </p>
            <div className="mt-6" id="carrie-hero-tagline">
              <SearchBar />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[28px] border border-white/60 bg-white/85 p-6 shadow-lg backdrop-blur-sm sm:p-8">
            <div
              className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#00CFF4]/15 blur-2xl"
              aria-hidden
            />
            <div
              className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-[#60A5FA]/15 blur-2xl"
              aria-hidden
            />
            <div className="relative z-10">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E0F7FA]">
                <svg
                  viewBox="0 0 43 41"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  aria-hidden
                >
                  <path d="M21.3074 6.11932C21.4439 6.15187 21.5074 6.08291 21.6036 6.00692C22.6239 5.20108 23.6219 3.86357 24.579 2.95187C27.6769 0.000527893 32.3106 -0.854292 36.1821 1.02446C37.2493 1.54239 37.6891 2.10578 38.5529 2.73711C39.1503 3.17351 39.5553 3.59848 40.0193 4.22479C42.8393 8.03012 42.6359 13.1808 39.6788 16.8479C38.6195 18.1618 37.3155 19.2692 36.154 20.4924L40.6304 24.9672C44.9264 30.2676 42.5699 38.3015 35.8899 40.1744C27.3122 42.5795 20.3944 32.674 25.845 25.4399C28.8187 21.4936 33.5422 18.0626 36.8028 14.2402C39.6519 10.2151 37.6304 4.82022 32.627 4.02045C31.0834 3.77382 28.7794 4.27831 27.6487 5.40896L21.4859 11.5717H21.308L15.1441 5.40762C13.8665 4.13017 11.0999 3.66879 9.39526 4.12195C4.92926 5.30913 3.24959 10.7768 6.07674 14.3556C9.3789 17.9764 13.404 21.2561 16.6326 24.9056C22.2109 31.2111 16.9207 41.2798 8.51011 40.4878C0.969436 39.7776 -2.61238 30.731 2.16234 24.9634L6.64183 20.4895C4.45675 18.3158 2.18063 16.3719 1.23235 13.3476C-1.05185 6.06245 5.36827 -1.2796 12.8912 0.189108C14.0649 0.418291 16.5077 1.31958 17.3363 2.14822L21.3074 6.11932ZM33.4286 23.2183L28.7176 27.9293C28.5323 28.1146 27.9605 29.6615 27.8954 30.0035C26.6494 36.5503 36.0277 39.3241 38.5404 33.0863C40.2782 28.7721 36.357 26.4357 33.8675 23.7809C33.6956 23.5976 33.5997 23.3936 33.4286 23.2183ZM14.0793 27.9278L9.36736 23.2158C8.98493 23.4897 8.75031 23.9379 8.45371 24.2528C6.12063 26.7289 3.09927 28.4772 4.0439 32.3714C5.12538 36.8296 10.858 38.0579 13.7683 34.5652C15.1824 32.8684 15.4189 29.7294 14.0793 27.9278Z" fill="#00CFF4" />
                  <path d="M30.6122 8.72812C31.0252 8.43988 32.103 8.50462 32.5085 8.79488C33.5706 9.55492 33.8161 10.5661 33.2135 11.6915L22.6675 22.2394L21.3982 24.1054L20.1285 22.239L9.58088 11.689C8.48093 9.91394 10.3558 7.78839 12.2404 8.79253L21.0714 17.6223L21.4569 17.8833L30.6122 8.72812Z" fill="#00CFF4" />
                </svg>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-[#00A8C8]">
                  Carrie
                </span>
                <span className="rounded-full bg-[#E0F7FA] px-2 py-0.5 text-[10px] font-semibold text-[#0EA5E9]">
                  AI advisor
                </span>
              </div>
              <h2 className="mt-4 text-xl font-semibold text-[#132329]">
                Not sure where to start?
              </h2>
              <p className="mt-2 text-sm text-[#64748b]">
                Talk to Carrie, your AI care advisor for quick, personalized guidance.
              </p>
              <div className="mt-5 grid gap-2 text-xs text-[#475569]">
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00CFF4]" />
                  Get curated matches in minutes
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00CFF4]" />
                  Ask about pricing, care levels, and tours
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("carematch:open-chat-request"),
                  )
                }
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#132329] px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
              >
                Get personalized help
              </button>
              <Link
                to="/find-care"
                className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-[#00CFF4] bg-white px-5 py-3 text-sm font-semibold text-[#00A8C8] hover:bg-[#E0F7FA]"
              >
                Find Facilities
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
