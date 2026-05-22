import React, { useRef, useState } from "react";
import { TiltCard } from "@/components/ui/tilt-card";

const MOBILE_SWIPE_ANIM_MS = 180;
const MOBILE_AUTO_SLIDE_MS = 3500;

/** Five filled yellow stars for rating */
function StarRating() {
  return (
    <span className="inline-flex shrink-0 gap-0.5" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <img
          src="/assets/images/star.svg"
          alt=""
          aria-hidden
          key={i}
          className="h-4 w-4 sm:h-5 sm:w-5 min-[1920px]:h-6 min-[1920px]:w-6"
        />
      ))}
    </span>
  );
}

const TESTIMONIALS = [
  {
    quote:
      "The AI assistant was incredible! Within 10 minutes, I had 5 perfect matches for my mom. The advisor walked us through every option and we found an amazing community nearby.",
    name: "Micheal Thompson",
    relationship: "Son",
    location: "Los Angeles, CA",
  },
  {
    quote:
      "Finding memory care for my father was overwhelming. CareMatch understood our needs and budget perfectly. Grateful!",
    name: "Sarah Rodriguez",
    relationship: "Daughter",
    location: "Miami, FL",
  },
  {
    quote:
      "Best decision was using CareMatch. They saved us months of research. Our advisor was patient, knowledgeable, and truly cared about finding the right fit.",
    name: "James Chen",
    relationship: "Son",
    location: "New York, NY",
  },
];

export default function SuccessStories() {
  const [mobileReviewIndex, setMobileReviewIndex] = useState(0);
  const [mobileSwipePhase, setMobileSwipePhase] = useState("idle");
  const [mobileSwipeDirection, setMobileSwipeDirection] = useState(1);
  const touchStartXRef = useRef(0);
  const swipeTimeoutRef = useRef(null);

  const goToAdjacentReview = (direction) => {
    if (mobileSwipePhase !== "idle") return;

    setMobileSwipeDirection(direction);
    setMobileSwipePhase("exit");

    if (swipeTimeoutRef.current) clearTimeout(swipeTimeoutRef.current);
    swipeTimeoutRef.current = setTimeout(() => {
      setMobileReviewIndex((prev) => (prev + direction + TESTIMONIALS.length) % TESTIMONIALS.length);
      setMobileSwipePhase("enter");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setMobileSwipePhase("idle"));
      });
    }, MOBILE_SWIPE_ANIM_MS);
  };

  const handleTouchStart = (e) => {
    touchStartXRef.current = e.changedTouches[0]?.clientX ?? 0;
  };

  const handleTouchEnd = (e) => {
    const endX = e.changedTouches[0]?.clientX ?? 0;
    const deltaX = endX - touchStartXRef.current;
    const SWIPE_THRESHOLD = 40;

    if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;
    if (deltaX < 0) goToAdjacentReview(1);
    else goToAdjacentReview(-1);
  };

  const activeReview = TESTIMONIALS[mobileReviewIndex];

  React.useEffect(() => {
    return () => {
      if (swipeTimeoutRef.current) clearTimeout(swipeTimeoutRef.current);
    };
  }, []);

  React.useEffect(() => {
    const intervalId = setInterval(() => {
      goToAdjacentReview(1);
    }, MOBILE_AUTO_SLIDE_MS);

    return () => clearInterval(intervalId);
  }, [mobileSwipePhase]);

  return (
    <section id="success-stories-section" className="relative w-full overflow-hidden bg-white py-10 sm:py-12 md:py-16 lg:py-20 min-[1280px]:py-20 min-[1920px]:py-24">
      <div className="container relative z-10 mx-auto min-w-0 px-4 sm:px-6 md:px-8 lg:max-w-6xl lg:px-8 min-[1280px]:max-w-[1400px] min-[1280px]:px-10 min-[1536px]:max-w-[1600px] min-[1536px]:px-12 min-[1920px]:max-w-[1800px] min-[1920px]:px-14">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <span
            className="inline-block w-fit rounded-md px-3 py-1 text-xs font-medium sm:px-4 sm:py-1.5 sm:text-sm md:text-base min-[1920px]:px-5 min-[1920px]:py-3 min-[1920px]:text-base"
            style={{ backgroundColor: "#00CFF41A", color: "#00CFF4" }}
          >
            Success Stories
          </span>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-[#101828] sm:mt-4 sm:text-2xl md:mt-5 md:text-3xl lg:mt-5 lg:text-3xl lg:leading-tight min-[1280px]:mt-6 min-[1280px]:text-[2.75rem] min-[1920px]:mt-10 min-[1920px]:text-[56px] min-[1920px]:leading-tight">
            What Families Are Saying
          </h2>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 sm:mt-3 sm:gap-2 min-[1920px]:mt-4">
            <StarRating />
            <span className="text-xs text-[#132329B2] italic font-medium sm:text-sm md:text-base min-[1920px]:text-lg">
              4.9 out of 5 stars from 28,417 reviews
            </span>
          </div>
        </div>

        {/* Mobile: swipe horizontally through reviews */}
        <div className="mt-6 md:hidden" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <div
            className="h-[170px] sm:h-[185px]"
            style={{
              opacity: mobileSwipePhase === "idle" ? 1 : 0,
              transform:
                mobileSwipePhase === "exit"
                  ? `translateX(${mobileSwipeDirection > 0 ? "-18px" : "18px"})`
                  : mobileSwipePhase === "enter"
                  ? `translateX(${mobileSwipeDirection > 0 ? "18px" : "-18px"})`
                  : "translateX(0)",
              transition: `opacity ${MOBILE_SWIPE_ANIM_MS}ms ease-out, transform ${MOBILE_SWIPE_ANIM_MS}ms ease-out`,
            }}
          >
            <TiltCard
              className="h-full"
              innerClassName="flex min-w-0 flex-col rounded-xl bg-[#F9F9F9] border border-[#0000000D] p-4 h-full"
            >
              <p className="flex-1 text-sm leading-relaxed text-[#101828]">
                &ldquo;{activeReview.quote}&rdquo;
              </p>
              <div className="mt-3">
                <p className="text-base font-semibold text-[#101828]">
                  {activeReview.name}
                </p>
                <p className="mt-0.5 text-xs text-[#10182880]">
                  {activeReview.relationship} - {activeReview.location}
                </p>
              </div>
            </TiltCard>
          </div>
          <div className="mt-3 flex items-center justify-center gap-1.5">
            {TESTIMONIALS.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  mobileReviewIndex === idx ? "w-5 bg-[#00CFF4]" : "w-1.5 bg-[#94A3B8]"
                }`}
                aria-hidden
              />
            ))}
          </div>
        </div>

        {/* Desktop/tablet grid (unchanged) */}
        <div className="hidden md:grid mt-6 grid-cols-1 gap-4 sm:mt-8 sm:gap-6 md:grid-cols-2 md:gap-6 lg:mt-10 lg:gap-6 min-[1280px]:mt-14 min-[1280px]:grid-cols-3 min-[1280px]:gap-10 min-[1920px]:gap-10">
          {TESTIMONIALS.map(({ quote, name, relationship, location }) => (
            <TiltCard
              key={name}
              className="h-full"
              innerClassName="flex min-w-0 flex-col rounded-xl bg-[#F9F9F9] border border-[#0000000D] p-4 sm:rounded-2xl sm:p-6 lg:p-6 min-[1280px]:p-8 min-[1920px]:p-10 h-full"
            >
              <p className="flex-1 text-sm leading-relaxed text-[#101828] sm:text-base md:text-lg lg:text-base min-[1280px]:text-lg min-[1920px]:text-[22px]">
                &ldquo;{quote}&rdquo;
              </p>
              <div className="mt-3 sm:mt-4 lg:mt-4 min-[1280px]:mt-6 min-[1920px]:mt-10">
                <p className="text-base font-semibold text-[#101828] sm:text-lg lg:text-lg min-[1280px]:text-xl min-[1920px]:text-2xl">
                  {name}
                </p>
                <p className="mt-0.5 text-xs text-[#10182880] sm:text-sm lg:text-sm min-[1280px]:text-base min-[1920px]:text-[18px]">
                  {relationship} - {location}
                </p>
              </div>
            </TiltCard>
          ))}
        </div>
      </div>
    </section>
  );
}
