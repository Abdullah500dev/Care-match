import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SEO from "../../../components/common/SEO";
import AnimateOnScroll from "../../../components/common/AnimateOnScroll";

const SECTION_CLASS = "mb-10 last:mb-0";
const TITLE_CLASS = "text-xl font-bold text-[#132329] mb-3";
const SUBTITLE_CLASS = "text-lg font-semibold text-[#0f172a] mb-2";
const PARA_CLASS = "text-[#64748b] text-sm sm:text-base leading-relaxed mb-3 last:mb-0";

function imgSrc(file) {
  const base = import.meta.env.BASE_URL || "/";
  const path = `assets/images/${file}`;
  return base.endsWith("/") ? `${base}${path}` : `${base}/${path}`;
}

// Why Us imagery — order matches page sections top to bottom
const WHY_US_IMAGES = {
  section1: imgSrc("1.webp"),
  section2: imgSrc("2.webp"),
  section3: imgSrc("3.webp"),
  section4: imgSrc("4.webp"),
  section5: imgSrc("5.webp"),
};

function SparkleIcon({ className = "" }) {
  return (
    <img
      src="/assets/images/ai-assistant.svg"
      alt=""
      aria-hidden
      className={`h-5 w-5 shrink-0 sm:h-6 sm:w-6 ${className}`}
    />
  );
}

function SectionImage({ src, alt, className = "" }) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl shadow-md ring-1 ring-black/5 bg-[#E8EEF4] ${className}`}
      style={{ aspectRatio: "16 / 9" }}
    >
      {failed ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[#E2E8F0] px-4 text-center text-sm text-[#64748b]">
          Image could not be loaded. Check that <code className="text-xs">public/assets/images/</code> includes this file.
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          width={1600}
          height={900}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-center block"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

export default function WhyUs() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <SEO title="Why Us – CareMatch AI" />
      <div className="min-h-screen bg-[#F9FAFB]">
        <div className="container mx-auto px-4 py-8 sm:px-6 lg:max-w-6xl lg:px-8 min-[1280px]:max-w-[1400px] min-[1280px]:px-10 min-[1536px]:max-w-[1600px] min-[1536px]:px-12">
          {/* Hero */}
          <div className="mx-auto max-w-4xl text-center mb-12">
            <h1 className="text-2xl font-bold text-[#0f172a] sm:text-3xl md:text-4xl lg:text-[2.75rem] mb-3">
              Why Families Trust CareMatch AI
            </h1>
            <p className="text-base text-[#64748b] sm:text-lg md:text-xl">
              The Perfect Balance of Advanced Technology and Human Compassion
            </p>
          </div>

          <div className="mx-auto max-w-4xl space-y-16">
            {/* The Core Problem */}
            <section className={SECTION_CLASS}>
              <h2 className={TITLE_CLASS}>The Core Problem: Search Fatigue</h2>
              <p className={PARA_CLASS}>
                Searching for senior living shouldn’t feel like a full-time job—but for most families, it does.
              </p>
              <p className={PARA_CLASS}>
                Outdated directories, endless cold calls, and conflicting information often turn a simple need into an overwhelming process. Many families spend over 40+ hours researching, only to feel more confused than when they began.
              </p>
              <p className={PARA_CLASS}>
                At CareMatch AI, we’ve reimagined this experience.
                <br />
                We’ve replaced the search with a simple, intuitive conversation.
              </p>
              <AnimateOnScroll offsetY={32} durationMs={520} rootMargin="0px 0px -60px 0px" className="mt-6">
                <SectionImage
                  src={WHY_US_IMAGES.section1}
                  alt="A couple reviewing information together on a smartphone outdoors."
                />
              </AnimateOnScroll>
            </section>

            {/* Meet Carrie */}
            <section className={SECTION_CLASS}>
              <h2 className={TITLE_CLASS}>Meet Carrie: Your 24/7 Care Companion</h2>
              <p className={PARA_CLASS}>
                We created Carrie so no family has to navigate this journey alone.
              </p>
              <p className={PARA_CLASS}>
                Carrie isn’t just a chatbot—she’s an intelligent care companion trained to understand the complexities of senior living and your unique needs.
              </p>
              <ul className="space-y-3 mt-4 mb-6">
                <li className="flex gap-3">
                  <span className="font-semibold text-[#132329] shrink-0">Type or Speak Freely</span>
                  <span className={PARA_CLASS.replace("mb-3", "mb-0")}>
                    Whether you prefer typing or using your voice, Carrie listens the way you’re most comfortable.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-[#132329] shrink-0">Smart Understanding</span>
                  <span className={PARA_CLASS.replace("mb-3", "mb-0")}>
                    Carrie identifies what truly matters—medical needs, memory care, lifestyle preferences, pet policies, and more.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-[#132329] shrink-0">Instant Results</span>
                  <span className={PARA_CLASS.replace("mb-3", "mb-0")}>
                    Instead of waiting days, Carrie analyzes your needs and matches you with suitable options in seconds.
                  </span>
                </li>
              </ul>
              <AnimateOnScroll offsetY={32} durationMs={520} rootMargin="0px 0px -60px 0px" className="mt-6">
                <SectionImage
                  src={WHY_US_IMAGES.section2}
                  alt="A caregiver hands a blanket to a senior seated on a sofa; supportive in-home care."
                />
              </AnimateOnScroll>
            </section>

            {/* Triple-Verified Database */}
            <section className={SECTION_CLASS}>
              <h2 className={TITLE_CLASS}>Our Triple-Verified Database</h2>
              <p className={PARA_CLASS}>
                Great recommendations start with great data.
              </p>
              <p className={PARA_CLASS}>
                We don’t rely on outdated listings or scraped information. Our network of 15,000+ senior living communities is built on three trusted pillars:
              </p>
              <ul className="space-y-3 mt-4 mb-6">
                <li>
                  <span className="font-semibold text-[#132329]">State Compliance</span>
                  <p className={PARA_CLASS}>Verified health, safety, and regulatory records.</p>
                </li>
                <li>
                  <span className="font-semibold text-[#132329]">Resident Satisfaction</span>
                  <p className={PARA_CLASS}>Insights gathered from over 2 million families we’ve supported.</p>
                </li>
                <li>
                  <span className="font-semibold text-[#132329]">Real-Time Availability</span>
                  <p className={PARA_CLASS}>Up-to-date pricing and room availability—so you never waste time on unavailable options.</p>
                </li>
              </ul>
              <AnimateOnScroll offsetY={32} durationMs={520} rootMargin="0px 0px -60px 0px" className="mt-6">
                <SectionImage
                  src={WHY_US_IMAGES.section3}
                  alt="A senior couple using a laptop together at home."
                />
              </AnimateOnScroll>
            </section>

            {/* 50 Years of Human Wisdom */}
            <section className={SECTION_CLASS}>
              <h2 className={TITLE_CLASS}>50 Years of Human Wisdom</h2>
              <p className={PARA_CLASS}>
                Technology brings speed—but people bring understanding.
              </p>
              <p className={PARA_CLASS}>
                CareMatch AI is built on 50+ years of combined experience in senior care. Our founders and advisors have worked directly with families, understanding their concerns, emotions, and decisions.
              </p>
              <p className={PARA_CLASS}>
                We let AI handle the data, so our human experts can focus on what matters most—guidance, empathy, and support.
              </p>
              <AnimateOnScroll offsetY={32} durationMs={520} rootMargin="0px 0px -60px 0px" className="mt-6">
                <SectionImage
                  src={WHY_US_IMAGES.section4}
                  alt="Human hand reaching toward a glowing digital network—technology guided by care."
                />
              </AnimateOnScroll>
            </section>

            {/* No-Cost Commitment */}
            <section className={SECTION_CLASS}>
              <h2 className={TITLE_CLASS}>Our No-Cost Commitment</h2>
              <p className={PARA_CLASS}>
                CareMatch AI is completely free for families.
              </p>
              <p className={PARA_CLASS}>
                We’re supported by a trusted network of high-quality care providers, allowing us to offer unbiased guidance without added cost.
              </p>
              <p className="font-semibold text-[#132329] mb-2 mt-4">Here’s what that means for you:</p>
              <ul className="space-y-2 mb-6">
                <li><span className="font-semibold text-[#132329]">Unlimited Searches</span> — Explore as many options as you need—no limits.</li>
                <li><span className="font-semibold text-[#132329]">No Pressure, No Bias</span> — Recommendations are based on your needs, not commissions.</li>
                <li><span className="font-semibold text-[#132329]">End-to-End Support</span> — We help schedule tours and guide you on what to look for.</li>
              </ul>
              <AnimateOnScroll offsetY={32} durationMs={520} rootMargin="0px 0px -60px 0px" className="mt-6">
                <SectionImage
                  src={WHY_US_IMAGES.section5}
                  alt="A family member brings food to a loved one resting comfortably at home."
                />
              </AnimateOnScroll>
            </section>

            {/* CTA */}
            <section className="rounded-2xl border border-[#E2E8F0] bg-white p-6 sm:p-8 md:p-10 shadow-sm text-center">
              <h2 className={TITLE_CLASS}>Start Your Conversation</h2>
              <p className="text-[#64748b] text-base sm:text-lg max-w-2xl mx-auto mb-6">
                Carrie is ready whenever you are.
              </p>
              <p className="text-[#64748b] text-sm sm:text-base max-w-2xl mx-auto mb-8">
                Whether you’re just beginning your search or need immediate help, CareMatch AI is here to guide you every step of the way.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                <Link
                  to="/find-care"
                  className="inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl bg-[#00CFF4] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#00b8d8] sm:w-auto sm:px-8 sm:py-4 sm:text-base"
                  style={{ boxShadow: "0 4px 14px rgba(0, 207, 244, 0.4)" }}
                >
                  Start Chatting with Carrie
                </Link>
                <Link
                  to="/#search-bar"
                   className="inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl border-2 border-[#00CFF4] bg-transparent px-6 py-3 text-sm font-semibold text-[#00CFF4] transition hover:bg-[#00CFF4]/5 sm:w-auto sm:px-8 sm:py-4 sm:text-base"
                >
                  Call a Care Expert
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
