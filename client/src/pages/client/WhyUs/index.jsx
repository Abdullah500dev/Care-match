import React, { useEffect } from "react";
import SEO from "../../../components/common/SEO";

const SECTION_CLASS = "mb-8 last:mb-0";
const TITLE_CLASS = "text-lg font-bold text-[#132329] mb-2";
const PARA_CLASS = "text-[#64748b] text-sm sm:text-base leading-relaxed mb-3 last:mb-0";

export default function WhyUs() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <SEO title="Why Us – CareMatch AI" />
      <div className="min-h-screen bg-[#F9FAFB]">
        <div className="container mx-auto px-4 py-8 sm:px-6 lg:max-w-6xl lg:px-8 min-[1280px]:max-w-[1400px] min-[1280px]:px-10 min-[1536px]:max-w-[1600px] min-[1536px]:px-12">
          <div className="mx-auto max-w-3xl">
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0f172a] mb-1">
                Why CareMatch AI?
              </h1>
              <p className="text-sm text-[#64748b]">
                We’re here to simplify your search for the right senior care—so you can focus on what matters most.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 sm:p-8 shadow-sm">
              <section className={SECTION_CLASS}>
                <h2 className={TITLE_CLASS}>Personalized, not generic</h2>
                <p className={PARA_CLASS}>
                  Every family’s situation is different. CareMatch AI uses your answers about care needs, budget, location, and preferences to recommend options that actually fit—instead of a long list of facilities that don’t.
                </p>
              </section>

              <section className={SECTION_CLASS}>
                <h2 className={TITLE_CLASS}>Verified communities you can trust</h2>
                <p className={PARA_CLASS}>
                  We work with thousands of assisted living, memory care, and skilled nursing communities across the country. Our network is vetted so you can explore options with confidence.
                </p>
              </section>

              <section className={SECTION_CLASS}>
                <h2 className={TITLE_CLASS}>100% free for families</h2>
                <p className={PARA_CLASS}>
                  Searching for care is stressful enough. We don’t charge families to use our platform. You can compare matches, get guidance, and connect with providers at no cost.
                </p>
              </section>

              <section className={SECTION_CLASS}>
                <h2 className={TITLE_CLASS}>Save time and reduce overwhelm</h2>
                <p className={PARA_CLASS}>
                  Instead of spending hours on Google or calling dozens of places, you answer a short set of questions. Our AI does the heavy lifting and surfaces the best matches so you can decide with clarity.
                </p>
              </section>

              <section className={SECTION_CLASS}>
                <h2 className={TITLE_CLASS}>Built for how you search</h2>
                <p className={PARA_CLASS}>
                  Whether you’re planning ahead or need care soon, you tell us your timeline, budget, and location. We show you options that align—so you can schedule tours and talk to providers without the guesswork.
                </p>
              </section>

              <section className={SECTION_CLASS}>
                <h2 className={TITLE_CLASS}>Your choices, your control</h2>
                <p className={PARA_CLASS}>
                  Our recommendations are just that—recommendations. You’re never locked in. You can explore other facilities, request more options, or take your time. We’re here to support your decision, not push you into one.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
