import React, { useEffect } from "react";
import SEO from "../../../components/common/SEO";

const FAQ_ITEMS = [
  {
    q: "What is CareMatch AI?",
    a: "CareMatch AI is an intelligent platform that helps families find the most suitable senior care options based on their unique needs, preferences, and location. Instead of manually searching through hundreds of care providers, our AI analyzes your information and recommends the best matches.",
  },
  {
    q: "How does CareMatch AI work?",
    a: "You answer a few questions about your care needs, preferences, budget, and location. Our system analyzes the information and suggests care providers that best match those requirements.",
  },
  {
    q: "Who should use CareMatch AI?",
    a: "CareMatch AI is designed for: Families searching for senior care; Individuals planning future care; Care coordinators or discharge planners; Anyone looking for assisted living, memory care, or nursing care options.",
  },
  {
    q: "How accurate are the matches?",
    a: "CareMatch AI analyzes multiple factors such as care needs, preferences, availability, and location to provide highly relevant matches. The system is designed to improve recommendations as more data becomes available.",
  },
  {
    q: "Can I compare multiple care options?",
    a: "Yes. After completing the matching process, you can view and compare multiple care providers side-by-side to determine which option is best for you or your loved one.",
  },
  {
    q: "Do I have to choose from the AI recommendations?",
    a: "No. The AI simply helps narrow down the best options. You are always free to explore other providers or request additional recommendations.",
  },
  {
    q: "Is CareMatch AI free to use?",
    a: "Yes. Families can use CareMatch AI to search for and compare care options at no cost.",
  },
  {
    q: "Do I pay CareMatch AI or the care provider?",
    a: "If you choose a care provider, payments are made directly to the care provider. CareMatch AI does not collect payments for care services.",
  },
  {
    q: "Is my personal information secure?",
    a: "Yes. We take privacy seriously and implement industry-standard security measures to protect your information.",
  },
  {
    q: "Will my information be shared with care providers?",
    a: "Your information may be shared with relevant care providers in order to help connect you with appropriate care options.",
  },
  {
    q: "How long does the matching process take?",
    a: "The initial questionnaire usually takes 1–3 minutes to complete. After that, you can immediately see recommended matches.",
  },
  {
    q: "What happens after I find a match?",
    a: "You can contact the provider directly, request more information, or schedule a tour.",
  },
];

const SECTION_CLASS = "mb-6 last:mb-0";
const QUESTION_CLASS = "text-lg font-bold text-[#132329] mb-2";
const ANSWER_CLASS = "text-[#64748b] text-sm sm:text-base leading-relaxed";

export default function FAQ() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <SEO title="FAQs – CareMatch AI" />
      <div className="min-h-screen bg-[#F9FAFB]">
        <div className="container mx-auto px-4 py-8 sm:px-6 lg:max-w-6xl lg:px-8 min-[1280px]:max-w-[1400px] min-[1280px]:px-10 min-[1536px]:max-w-[1600px] min-[1536px]:px-12">
          <div className="mx-auto max-w-3xl">
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0f172a] mb-1">
                FAQs – CareMatch AI
              </h1>
              <p className="text-sm text-[#64748b]">
                Common questions about how CareMatch AI works and how we can help you find the right care.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 sm:p-8 shadow-sm">
              {FAQ_ITEMS.map((item, index) => (
                <section key={index} className={SECTION_CLASS}>
                  <h2 className={QUESTION_CLASS}>{item.q}</h2>
                  <p className={ANSWER_CLASS}>{item.a}</p>
                </section>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
