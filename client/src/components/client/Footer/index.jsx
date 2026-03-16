import React from "react";
import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";

const FOOTER_BG = "#0A122C";
const ACCENT = "#00CFF4";
const TEXT_MUTED = "text-white/70";

export default function Footer() {
  const resourcesLinks = [
    { label: "Care Guides", path: "/care-explorer" },
    { label: "Cost Calculator", path: "/cost-calculator" },
    { label: "Blog", path: "/blog" },
    { label: "FAQs", path: "/faqs" },
  ];

  const socialLinks = [
    { label: "Facebook", href: "https://facebook.com" },
    { label: "Twitter", href: "https://twitter.com" },
    { label: "LinkedIn", href: "https://linkedin.com" },
  ];

  return (
    <footer
      className="w-full overflow-hidden"
      style={{ backgroundColor: FOOTER_BG }}
    >
      <div className="container mx-auto min-w-0 px-4 py-10 sm:px-6 sm:py-12 md:py-14 lg:max-w-6xl lg:px-8 lg:py-14 min-[1280px]:max-w-[1400px] min-[1280px]:px-10 min-[1536px]:max-w-[70vw] min-[1536px]:px-12 min-[1920px]:max-w-[70vw] min-[1920px]:px-14 min-[1920px]:py-16">
        {/* Top section: 3 columns */}
        <div className="grid grid-cols-1 gap-8 sm:gap-10 md:grid-cols-[2fr_1fr_1fr] md:gap-12 lg:gap-16">
          {/* Left: Logo, name, tagline, social */}
          <div className="flex flex-col items-start text-left">
            <Link to="/" className="inline-flex items-center gap-2">
              <img
                src="/assets/images/footer-logo.svg"
                alt="CareMatch AI"
                className="h-9 w-auto object-contain sm:h-10"
                style={{ color: ACCENT }}
              />
             
            </Link>
            <p
              className={`mt-3 max-w-sm text-sm leading-relaxed sm:mt-4 w-[65%] sm:text-base ${TEXT_MUTED}`}
            >
              A personalized senior care search and match engine powered by millions of families nationwide.
            </p>
            <div className="mt-4 flex flex-wrap gap-4 sm:mt-6 sm:gap-6">
              {socialLinks.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 text-sm ${TEXT_MUTED} transition hover:text-white sm:text-base`}
                >
                  {/* <Icon className="h-4 w-4 sm:h-5 sm:w-5" /> */}
                  <span>{label}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Middle: Resources */}
          <div>
            <h3 className="font-semibold text-white text-base sm:text-lg">
              Resources
            </h3>
            <ul className="mt-2 space-y-1.5 sm:mt-3 sm:space-y-1.5">
              {resourcesLinks.map(({ label, path }) => (
                <li key={label}>
                  <Link
                    to={path}
                    className={`text-sm ${TEXT_MUTED} transition hover:text-white sm:text-base`}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: Contact Us */}
          <div>
            <h3 className="font-semibold text-white text-base sm:text-lg">
              Support
            </h3>
            <ul className="mt-4 space-y-2.5 sm:mt-5 sm:space-y-3">
            
              <li className={`text-sm ${TEXT_MUTED} sm:text-base`}>
                <Link to="/contact" className=" transition-colors">
                  Contact Us
                </Link>
              </li>
              <li className={`text-sm ${TEXT_MUTED} sm:text-base`}>
                AI Assistance – Carrie
               
              </li>
              <li className={`text-sm ${TEXT_MUTED} sm:text-base`}>
              <a
                  href="mailto:info@carematchai.com"
                  className={` transition-colors`}
                >
                  info@carematchai.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div
          className="mt-8 h-px w-full sm:mt-10 min-[1920px]:mt-12"
          style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
        />

        {/* Bottom bar */}
        <div className="mt-6 flex flex-col gap-2 sm:mt-8 md:flex-row md:items-center md:justify-center">
          <p className={`order-2 text-left text-xs sm:order-1 sm:text-sm ${TEXT_MUTED}`}>
            © 2026 CareMatch AI. All rights reserved.
          </p>
          <div className="order-1 flex flex-wrap items-center justify-start gap-2 sm:order-2 sm:gap-3 md:justify-end">
          <span className={`text-xs ${TEXT_MUTED} sm:text-sm`}>|</span>
            <Link
              to="/privacy"
              className={`text-xs ${TEXT_MUTED} transition hover:text-white sm:text-sm`}
            >
              Privacy Policy
            </Link>
            <span className={`text-xs ${TEXT_MUTED} sm:text-sm`}>|</span>
            <Link
              to="/terms"
              className={`text-xs ${TEXT_MUTED} transition hover:text-white sm:text-sm`}
            >
              Terms of Service
            </Link>
            {/* <span className={`text-xs ${TEXT_MUTED} sm:text-sm`}>|</span>
            <Link
              to="/accessibility"
              className={`text-xs ${TEXT_MUTED} transition hover:text-white sm:text-sm`}
            >
              Accessibility
            </Link> */}
          </div>
        </div>
      </div>
    </footer>
  );
}
