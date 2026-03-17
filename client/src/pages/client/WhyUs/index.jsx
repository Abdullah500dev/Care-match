import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import SEO from "../../../components/common/SEO";

const SECTION_CLASS = "mb-10 last:mb-0";
const TITLE_CLASS = "text-xl font-bold text-[#132329] mb-3";
const SUBTITLE_CLASS = "text-lg font-semibold text-[#0f172a] mb-2";
const PARA_CLASS = "text-[#64748b] text-sm sm:text-base leading-relaxed mb-3 last:mb-0";

// Unsplash images (free to use). Replace with your own assets when ready.
const WHY_US_IMAGES = {
  overwhelmedCaregiver: "https://images.unsplash.com/photo-1545235617-9465d2a55698?w=800&q=80",
  carrieInAction: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80",
  networkMap: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",
  advisor: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&q=80",
  peaceOfMind: "https://images.unsplash.com/photo-1609220136736-443140cffec6?w=800&q=80",
};

function SectionImage({ src, alt, short = false, className = "" }) {
  return (
    <div className={`overflow-hidden rounded-xl shadow-md ${short ? "h-[275px] sm:h-[320px]" : ""} ${className}`}>
      <img
        src={src}
        alt={alt}
        className={`h-full w-full object-cover ${short ? "" : "min-h-[200px] sm:min-h-[260px]"}`}
      />
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
              <SectionImage src={WHY_US_IMAGES.overwhelmedCaregiver} alt="A concerned caregiver looking at a laptop. Soft, natural lighting." short className="mt-6" />
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
              <SectionImage src={WHY_US_IMAGES.carrieInAction} alt="Person using technology for care search—clean, modern interface." short className="mt-6" />
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
              <SectionImage src={WHY_US_IMAGES.networkMap} alt="Data and network visualization representing nationwide coverage." short className="mt-6" />
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
              <SectionImage src={WHY_US_IMAGES.advisor} alt="Care professional offering warm, reassuring support to a senior." short className="mt-6" />
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
              <SectionImage src={WHY_US_IMAGES.peaceOfMind} alt="A senior enjoying a comfortable, peaceful environment." short className="mt-6" />
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
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/find-care"
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#00CFF4] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#00b8d8] sm:px-8 sm:py-4 sm:text-base"
                  style={{ boxShadow: "0px 4px 14px rgba(0, 207, 244, 0.4)" }}
                >
                  Start Chatting with Carrie
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl border-2 border-[#00CFF4] bg-white px-6 py-3 text-sm font-semibold text-[#00CFF4] transition hover:bg-[#F0FBFF] sm:px-8 sm:py-4 sm:text-base"
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
