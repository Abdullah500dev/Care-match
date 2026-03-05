import React from "react";
import { Link } from "react-router-dom";
import { Phone, MessageCircle, Twitter, Linkedin, Facebook } from "lucide-react";

const quickLinks = [
  { label: "About Us", path: "/about" },
  { label: "Care Types", path: "/care-types" },
  { label: "Locations", path: "/locations" },
  { label: "Expert Advice", path: "/expert-advice" },
];

const forProvidersLinks = [
  { label: "List Your Facility", path: "/dashboard/communities" },
  { label: "Provider Portal", path: "/dashboard" },
  { label: "Marketing Tools", path: "/marketing-tools" },
  { label: "Success Stories", path: "/success-stories" },
];

const socialLinks = [
  { label: "Facebook", href: "https://facebook.com", Icon: Facebook },
  { label: "Twitter", href: "https://twitter.com", Icon: Twitter },
  { label: "LinkedIn", href: "https://linkedin.com", Icon: Linkedin },
];

export default function DashboardFooter() {
  return (
    <footer className="mt-auto w-full border-t border-slate-200 bg-slate-100">
      <div
        className="mx-auto w-full px-4 py-10 sm:px-6 md:px-8 lg:max-w-[1800px] lg:px-10"
        style={{ paddingLeft: "max(1.5rem, 5vw)", paddingRight: "max(1.5rem, 5vw)" }}
      >
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* CareMatch AI branding */}
          <div className="flex flex-col">
            <Link to="/" className="inline-flex items-center gap-2">
              <img
                src="/assets/images/favicon/favicon.svg"
                alt="CareMatch AI"
                className="h-8 w-8"
              />
              <span className="text-lg font-bold text-slate-900">CareMatch AI</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-slate-600">
              Helping families find the perfect senior care match through personalized
              AI-driven recommendations.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-slate-900">Quick Links</h3>
            <ul className="mt-3 space-y-2">
              {quickLinks.map(({ label, path }) => (
                <li key={label}>
                  <Link
                    to={path}
                    className="text-sm text-slate-600 transition-colors hover:text-slate-900"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* For Providers */}
          <div>
            <h3 className="font-semibold text-slate-900">For Providers</h3>
            <ul className="mt-3 space-y-2">
              {forProvidersLinks.map(({ label, path }) => (
                <li key={label}>
                  <Link
                    to={path}
                    className="text-sm text-slate-600 transition-colors hover:text-slate-900"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-slate-900">Contact</h3>
            <ul className="mt-3 space-y-3">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-[#00B8DB]" />
                <a
                  href="tel:1-888-227-3669"
                  className="text-sm font-medium text-slate-700 hover:text-slate-900"
                >
                  1-888-CARE-NOW
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 shrink-0 text-[#00B8DB]" />
                <span className="text-sm text-slate-600">24/7 Expert Support</span>
              </li>
            </ul>
            <div className="mt-4 flex gap-3">
              {socialLinks.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-slate-600 transition-colors hover:bg-[#00B8DB] hover:text-white"
                  aria-label={label}
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
