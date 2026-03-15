import React, { useEffect } from "react";
import SEO from "../../../components/common/SEO";

const SECTION_CLASS = "mb-6";
const TITLE_CLASS = "text-lg font-bold text-[#132329] mb-2";
const PARA_CLASS = "text-[#64748b] text-sm sm:text-base leading-relaxed mb-3 last:mb-0";

export default function Privacy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <SEO title="Privacy Policy - CareMatch AI" />
      <div className="min-h-screen bg-[#F9FAFB]">
        <div className="container mx-auto px-4 py-8 sm:px-6 lg:max-w-6xl lg:px-8 min-[1280px]:max-w-[1400px] min-[1280px]:px-10 min-[1536px]:max-w-[1600px] min-[1536px]:px-12">
          <div className="mx-auto max-w-3xl">
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0f172a] mb-1">
                Carematch AI – Privacy Policy
              </h1>
              <p className="text-sm text-[#64748b]">Effective Date: March 9, 2026</p>
            </div>

            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 sm:p-8 shadow-sm">
              <section className={SECTION_CLASS}>
                <h2 className={TITLE_CLASS}>Information We Collect</h2>
                <p className={PARA_CLASS}>
                  We may collect personal information including name, email address, phone number,
                  location information, and details about care needs or preferences when users
                  submit forms, questionnaires, or requests for assistance.
                </p>
                <p className={PARA_CLASS}>
                  We may also automatically collect usage information such as device type, browser
                  type, IP address, pages visited, and interaction with features on the platform.
                </p>
              </section>

              <section className={SECTION_CLASS}>
                <h2 className={TITLE_CLASS}>How We Use Information</h2>
                <p className={PARA_CLASS}>
                  We use information collected to provide and improve services, connect users with
                  care providers, respond to inquiries, personalize user experiences, communicate
                  with users about services or updates, monitor platform performance, and maintain
                  security.
                </p>
              </section>

              <section className={SECTION_CLASS}>
                <h2 className={TITLE_CLASS}>Sharing of Information</h2>
                <p className={PARA_CLASS}>
                  If users request assistance or information about care services, Carematch AI may
                  share relevant information with care providers, agencies, or partners so they can
                  contact the user and provide services or information related to their needs.
                </p>
                <p className={PARA_CLASS}>
                  Information may also be shared with vendors or service providers that help operate
                  our platform, such as technology or analytics providers, or when required by law.
                </p>
              </section>

              <section className={SECTION_CLASS}>
                <h2 className={TITLE_CLASS}>Consent to Communications</h2>
                <p className={PARA_CLASS}>
                  By submitting information through the Carematch AI platform, users consent to
                  receive communications from Carematch AI and from care providers or partners
                  regarding services that may meet their needs.
                </p>
                <p className={PARA_CLASS}>
                  These communications may include phone calls, emails, text messages, or automated
                  dialing technologies. Consent to receive communications is not required to use
                  the services, and users may opt out of certain communications where permitted.
                </p>
              </section>

              <section className={SECTION_CLASS}>
                <h2 className={TITLE_CLASS}>Cookies and Tracking Technologies</h2>
                <p className={PARA_CLASS}>
                  Carematch AI may use cookies or similar technologies to improve platform
                  functionality, analyze user behavior, and enhance user experience. Users may
                  manage cookie preferences through their browser settings.
                </p>
              </section>

              <section className={SECTION_CLASS}>
                <h2 className={TITLE_CLASS}>Data Security</h2>
                <p className={PARA_CLASS}>
                  Carematch AI takes reasonable administrative and technical measures to protect
                  personal information from unauthorized access, misuse, or disclosure. However, no
                  system can be guaranteed to be completely secure.
                </p>
              </section>

              <section className={SECTION_CLASS}>
                <h2 className={TITLE_CLASS}>Data Retention</h2>
                <p className={PARA_CLASS}>
                  Personal information may be retained for as long as necessary to provide services,
                  comply with legal obligations, resolve disputes, and enforce agreements.
                </p>
              </section>

              <section className={SECTION_CLASS}>
                <h2 className={TITLE_CLASS}>Children's Privacy</h2>
                <p className={PARA_CLASS}>
                  Carematch AI services are not intended for individuals under the age of 18, and
                  we do not knowingly collect personal information from children.
                </p>
              </section>

              <section className={SECTION_CLASS}>
                <h2 className={TITLE_CLASS}>Changes to this Policy</h2>
                <p className={PARA_CLASS}>
                  Carematch AI may update this Privacy Policy periodically. When changes are made,
                  the updated policy will reflect a revised effective date. Continued use of the
                  platform constitutes acceptance of the updated policy.
                </p>
              </section>

              <section className={SECTION_CLASS}>
                <h2 className={TITLE_CLASS}>Contact</h2>
                <p className={PARA_CLASS}>
                  For questions regarding this Privacy Policy, please contact{" "}
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
