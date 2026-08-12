import React, { useEffect } from "react";
import SEO from "../../../components/common/SEO";

const SECTION_CLASS = "mb-6";
const TITLE_CLASS = "text-lg font-bold text-[#132329] mb-2";
const PARA_CLASS = "text-[#64748b] text-sm sm:text-base leading-relaxed mb-3 last:mb-0";

export default function Terms() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <SEO title="Terms of Service - CareMatch AI" />
      <div className="min-h-screen bg-[#F9FAFB]">
        <div className="container mx-auto px-4 py-8 sm:px-6 lg:max-w-6xl lg:px-8 min-[1280px]:max-w-[1400px] min-[1280px]:px-10 min-[1536px]:max-w-[1600px] min-[1536px]:px-12">
          <div className="mx-auto max-w-3xl">
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0f172a] mb-1">
                Carematch AI – Terms of Service
              </h1>
              <p className="text-sm text-[#64748b]">Effective Date: March 9, 2026</p>
            </div>

            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 sm:p-8 shadow-sm">
              <section className={SECTION_CLASS}>
                <h2 className={TITLE_CLASS}>1. Description of Services</h2>
                <p className={PARA_CLASS}>
                  Carematch AI ("Carematch AI," "we," "us," or "our") provides an informational
                  platform designed to assist individuals and families in identifying and connecting
                  with care providers and related services. Carematch AI may collect information
                  about user preferences, care needs, and location in order to help match users with
                  providers that may meet those needs.
                </p>
                <p className={PARA_CLASS}>
                  Carematch AI does not provide medical, healthcare, legal, or financial advice and
                  does not directly provide care services.
                </p>
                <p className={PARA_CLASS}>
                  Carematch AI is not responsible for the actions, services, or representations of
                  any care provider, facility, agency, or other third party.
                </p>
              </section>

              <section className={SECTION_CLASS}>
                <h2 className={TITLE_CLASS}>2. Eligibility</h2>
                <p className={PARA_CLASS}>
                  You must be at least 18 years old to use the Services. By using Carematch AI, you
                  represent and warrant that you are at least 18 years of age and have the legal
                  capacity to enter into these Terms.
                </p>
              </section>

              <section className={SECTION_CLASS}>
                <h2 className={TITLE_CLASS}>3. User Information and Accuracy</h2>
                <p className={PARA_CLASS}>
                  You agree to provide accurate and truthful information when using the Services.
                  This includes information related to care needs, contact information, and any other
                  details submitted through forms or questionnaires.
                </p>
                <p className={PARA_CLASS}>
                  Providing inaccurate or misleading information may limit our ability to connect
                  you with appropriate services.
                </p>
              </section>

              <section className={SECTION_CLASS}>
                <h2 className={TITLE_CLASS}>4. Consent to Communications (TCPA Consent)</h2>
                <p className={PARA_CLASS}>
                  By submitting your information through Carematch AI, you expressly consent to be
                  contacted by Carematch AI and by care providers, agencies, partners, or service
                  providers regarding services that may match your needs.
                </p>
                <p className={PARA_CLASS}>
                  You agree that these communications may be made using phone calls, emails, text
                  messages (SMS), automated dialing systems, or artificial or prerecorded voice
                  messages.
                </p>
                <p className={PARA_CLASS}>
                  These communications may be made to the phone number or email address you
                  provided, even if the number is registered on a state or federal Do Not Call
                  registry.
                </p>
                <p className={PARA_CLASS}>
                  Your consent to receive communications is not a condition of purchasing any goods or
                  services.
                </p>
                <p className={PARA_CLASS}>
                  You may opt out of certain communications at any time by requesting removal
                  through email.
                </p>
              </section>

              <section className={SECTION_CLASS}>
                <h2 className={TITLE_CLASS}>5. Third-Party Providers</h2>
                <p className={PARA_CLASS}>
                  Carematch AI may connect users with independent care providers or service
                  partners. These providers operate independently from Carematch AI.
                </p>
                <p className={PARA_CLASS}>
                  Carematch AI does not endorse specific providers, guarantee the quality of
                  services, verify licensing or credentials of all providers, or supervise or
                  control the services delivered.
                </p>
                <p className={PARA_CLASS}>
                  Users are responsible for conducting their own evaluation before engaging any
                  provider.
                </p>
              </section>

              <section className={SECTION_CLASS}>
                <h2 className={TITLE_CLASS}>6. No Medical or Professional Advice</h2>
                <p className={PARA_CLASS}>
                  Information provided through the Services is for informational purposes only and
                  should not be considered medical, healthcare, legal, or financial advice.
                </p>
                <p className={PARA_CLASS}>
                  Users should consult qualified professionals for advice regarding care decisions.
                </p>
              </section>

              <section className={SECTION_CLASS}>
                <h2 className={TITLE_CLASS}>7. Intellectual Property</h2>
                <p className={PARA_CLASS}>
                  All content, software, technology, and materials available through the Services
                  are the property of Carematch AI or its licensors and are protected by applicable
                  intellectual property laws.
                </p>
                <p className={PARA_CLASS}>
                  You may not copy, reproduce, distribute, modify, or create derivative works from
                  any portion of the Services without written permission from Carematch AI.
                </p>
              </section>

              <section className={SECTION_CLASS}>
                <h2 className={TITLE_CLASS}>8. Acceptable Use</h2>
                <p className={PARA_CLASS}>
                  You agree not to use the Services in any way that violates applicable laws or
                  regulations, infringes on the rights of others, attempts to disrupt or interfere
                  with the platform, attempts unauthorized access to systems or data, or transmits
                  harmful or malicious code.
                </p>
              </section>

              <section className={SECTION_CLASS}>
                <h2 className={TITLE_CLASS}>9. Disclaimer of Warranties</h2>
                <p className={PARA_CLASS}>
                  The Services are provided on an "as is" and "as available" basis without warranties
                  of any kind. Carematch AI does not guarantee that the platform will operate
                  without interruption, that the results of provider matching will meet your
                  expectations, or that information on the platform is completely accurate or
                  current.
                </p>
              </section>

              <section className={SECTION_CLASS}>
                <h2 className={TITLE_CLASS}>10. Limitation of Liability</h2>
                <p className={PARA_CLASS}>
                  To the fullest extent permitted by law, Carematch AI shall not be liable for any
                  indirect, incidental, consequential, special, or punitive damages arising from or
                  related to the use of the Services. This includes damages related to interactions
                  with care providers, decisions made based on information obtained through the
                  platform, or interruptions or errors in the Services.
                </p>
              </section>

              <section className={SECTION_CLASS}>
                <h2 className={TITLE_CLASS}>11. Indemnification</h2>
                <p className={PARA_CLASS}>
                  You agree to indemnify and hold harmless Carematch AI and its affiliates from any
                  claims, damages, losses, liabilities, or expenses resulting from your use of the
                  Services, your violation of these Terms, or your interactions with third-party
                  providers.
                </p>
              </section>

              <section className={SECTION_CLASS}>
                <h2 className={TITLE_CLASS}>12. Termination</h2>
                <p className={PARA_CLASS}>
                  Carematch AI may suspend or terminate access to the Services at any time if we
                  believe a user has violated these Terms or misused the platform.
                </p>
              </section>

              <section className={SECTION_CLASS}>
                <h2 className={TITLE_CLASS}>13. Changes to the Terms</h2>
                <p className={PARA_CLASS}>
                  Carematch AI may update these Terms periodically. When updates occur, the effective
                  date will be revised accordingly. Continued use of the Services after updates
                  constitutes acceptance of the revised Terms.
                </p>
              </section>

              <section className={SECTION_CLASS}>
                <h2 className={TITLE_CLASS}>14. Governing Law</h2>
                <p className={PARA_CLASS}>
                  These Terms are governed by the laws of the State of New York, without regard to
                  conflict of law principles.
                </p>
              </section>

              <section className={SECTION_CLASS}>
                <h2 className={TITLE_CLASS}>15. Contact Information</h2>
                <p className={PARA_CLASS}>
                  For questions regarding these Terms, please contact:{" "}
                  <a
                    href="mailto:info@carematchai.com"
                    className="text-[#00CFF4] hover:underline"
                  >
                    info@carematchai.com
                  </a>
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
