import React, { useState, useEffect, useRef } from "react";
import { TiltCard } from "@/components/ui/tilt-card";

const HEADING_TEXT = "Your Journey To Better Care";
const TYPE_SPEED_MS = 65;
const CURSOR_BLINK_MS = 520;
const CARD_STAGGER_MS = 100;
const CARD_DURATION_MS = 500;
const TYPEWRITER_PAUSE_BEFORE_RESTART_MS = 2500;

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
  const [headingLength, setHeadingLength] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  const [cardsVisible, setCardsVisible] = useState(false);
  const [sectionInView, setSectionInView] = useState(false);
  const sectionRef = useRef(null);

  // Typewriter for heading (runs only when section is in view)
  useEffect(() => {
    if (!sectionInView || headingLength >= HEADING_TEXT.length) return;
    const t = setTimeout(() => setHeadingLength((n) => n + 1), TYPE_SPEED_MS);
    return () => clearTimeout(t);
  }, [sectionInView, headingLength]);

  // When typewriter completes, wait then restart (only while section is in view)
  useEffect(() => {
    if (!sectionInView || headingLength < HEADING_TEXT.length) return;
    const t = setTimeout(() => setHeadingLength(0), TYPEWRITER_PAUSE_BEFORE_RESTART_MS);
    return () => clearTimeout(t);
  }, [sectionInView, headingLength]);

  useEffect(() => {
    const t = setInterval(() => setShowCursor((c) => !c), CURSOR_BLINK_MS);
    return () => clearInterval(t);
  }, []);

  // Cards + typewriter: run every time section enters view, reset when it leaves
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSectionInView(true);
          setTimeout(() => setCardsVisible(true), 80);
        } else {
          setSectionInView(false);
          setHeadingLength(0);
          setCardsVisible(false);
        }
      },
      { threshold: 0, rootMargin: "0px 0px -50px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const headingComplete = headingLength >= HEADING_TEXT.length;

  return (
    <section
      id="simple-process-section"
      ref={sectionRef}
      className="relative w-full overflow-hidden py-10 sm:py-12 md:py-16 lg:py-20 min-[1280px]:py-24 min-[1920px]:py-28"
      style={{ backgroundColor: "#142A54" }}
    >
      <div className="container mx-auto min-w-0 px-4 sm:px-6 md:px-8 lg:max-w-6xl lg:px-8 min-[1280px]:max-w-[1400px] min-[1280px]:px-10 min-[1536px]:max-w-[1600px] min-[1536px]:px-12 min-[1920px]:max-w-[1800px] min-[1920px]:px-14">
        {/* Tag + title + subtitle */}
        <div className="mx-auto max-w-3xl text-center">
          <span
            className="inline-block rounded-lg px-3 py-1 text-xs font-medium text-[#00CFF4] sm:px-4 sm:py-1.5 sm:text-sm md:text-base min-[1920px]:px-5 min-[1920px]:py-3 min-[1920px]:text-base"
            style={{ backgroundColor: "#00CFF41A" }}
          >
            Simple Process
          </span>
          <h2 className="mt-3 text-xl font-bold tracking-tight text-white sm:mt-4 sm:text-2xl md:mt-5 md:text-3xl lg:mt-5 lg:text-3xl lg:leading-tight min-[1280px]:mt-6 min-[1280px]:text-[2.75rem] min-[1920px]:text-[56px] min-[1920px]:leading-tight">
            {HEADING_TEXT.slice(0, headingLength)}
            <span
              aria-hidden
              className={`inline-block h-[0.9em] w-0.5 align-middle bg-white ml-0.5 ${
                showCursor && !headingComplete ? "opacity-100" : "opacity-0"
              }`}
            />
          </h2>
          <p className="mt-2 text-sm text-white/95 sm:mt-3 sm:text-base md:mt-4 md:text-lg min-[1920px]:text-xl">
            We've Helped Over 2 Million Families Find The Perfect Senior Living
            Solution
          </p>
        </div>

        {/* Process cards: 1 col mobile, 2 cols at md/lg (1024), 3 cols from 1280 */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 sm:gap-6 md:grid-cols-2 md:gap-6 lg:mt-10 lg:gap-6 min-[1280px]:mt-14 min-[1280px]:grid-cols-3 min-[1280px]:gap-10">
          {STEPS.map((step, index) => (
            <div
              key={step.title}
              className="h-full"
              style={{
                opacity: cardsVisible ? 1 : 0,
                transform: cardsVisible ? "translateY(0)" : "translateY(24px)",
                transition: `opacity ${CARD_DURATION_MS}ms ease-out, transform ${CARD_DURATION_MS}ms ease-out`,
                transitionDelay: cardsVisible ? `${index * CARD_STAGGER_MS}ms` : "0ms",
              }}
            >
              <TiltCard
                className="h-full"
                innerClassName="flex min-w-0 flex-col rounded-xl p-4 sm:rounded-2xl sm:p-5 md:p-5 lg:p-6 min-[1280px]:p-8 h-full"
                innerStyle={{ backgroundColor: "#00C9F0" }}
              >
                <div>
                  <h3 className="text-base font-bold text-white sm:text-lg md:text-xl lg:text-lg min-[1280px]:text-xl min-[1920px]:text-2xl">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-white sm:mt-2 sm:text-base lg:text-sm min-[1280px]:text-base min-[1920px]:text-lg">
                    {step.description}
                  </p>
                </div>
              </TiltCard>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
