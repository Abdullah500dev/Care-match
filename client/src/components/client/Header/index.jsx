import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, User } from "lucide-react";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { label: "How It Works", target: "how-it-works", isScroll: true },
    { label: "Care Types", target: "care-types", isScroll: true },
    { label: "Why Us", target: "why-us", isScroll: true },
    { label: "Resources", target: "resources", isScroll: true },
    { label: "Contact", target: "contact", isScroll: true },
  ];

  const handleNavClick = (e, item) => {
    if (item.isScroll) {
      e.preventDefault();

      if (location.pathname === "/") {
        const el = document.getElementById(item.target);
        if (el) {
          const yOffset = -80;
          const y = el.getBoundingClientRect().top + window.scrollY + yOffset;
          window.scrollTo({ top: y, behavior: "smooth" });
          setIsMenuOpen(false);
        }
      } else {
        navigate("/", { state: { scrollTo: item.target } });
      }
    }
  };

  return (
    <nav className="z-50 border-b border-gray-100 bg-white/90 backdrop-blur-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8  min-[1024px]:max-w-6xl min-[1280px]:max-w-6xl min-[1280px]:px-10 min-[1536px]:max-w-[1400px] min-[1536px]:px-12">
        <div className="flex h-16 items-center justify-between sm:h-[72px] md:h-20">
          {/* Logo (left) */}
          <div className="flex items-center gap-6 sm:gap-8 lg:gap-10 min-[1280px]:gap-8 min-[1536px]:gap-10">
            <Link to="/" className="flex shrink-0 items-center gap-2">
              <img
                src="/assets/images/favicon/favicon.svg"
                alt="CareMatch AI"
                className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 min-[1024px]:h-8 min-[1024px]:w-8 min-[1280px]:h-9 min-[1280px]:w-9 min-[1536px]:h-10 min-[1536px]:w-10"
              />
              <span className="text-lg font-bold text-[#132329] sm:text-xl md:text-2xl min-[1280px]:text-xl min-[1536px]:text-2xl">
                CareMatch AI
              </span>
            </Link>
          </div>

          {/* Desktop: Nav links | For Providers | User (from lg 1024px to avoid overlap at 768–1023) */}
          <div className="hidden shrink-0 items-center lg:flex lg:gap-5 min-[1280px]:gap-5 min-[1536px]:gap-6">
            <div className="hidden items-center lg:flex lg:gap-5 lg:text-sm min-[1536px]:gap-6 min-[1536px]:text-base">
              {menuItems.map((item) =>
                item.isScroll ? (
                  <a
                    key={item.label}
                    href={`/#${item.target}`}
                    onClick={(e) => handleNavClick(e, item)}
                    className="font-semibold text-[#364153] transition-colors hover:text-[#132329]"
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.label}
                    to={item.path}
                    className="font-semibold text-[#364153] transition-colors hover:text-[#132329]"
                  >
                    {item.label}
                  </Link>
                )
              )}
            </div>
            <Link
              to="/for-providers"
              className="rounded-full bg-[#132329] px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 md:px-5 md:py-2.5 min-[1024px]:px-4 min-[1024px]:py-2 min-[1024px]:text-sm min-[1280px]:px-4 min-[1280px]:py-2 min-[1280px]:text-sm min-[1536px]:px-5 min-[1536px]:py-2.5"
            >
              For Providers
            </Link>
            <span
              className="h-5 w-[2px] rounded-full bg-gray-300 min-[1536px]:h-6"
              aria-hidden
            />
            <button
              type="button"
              className="flex items-center gap-2 text-[#364153] transition-colors hover:text-[#364153]"
              aria-label="Profile"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full md:h-8 md:w-8 min-[1024px]:h-8 min-[1024px]:w-8 min-[1280px]:h-8 min-[1280px]:w-8 min-[1536px]:h-9 min-[1536px]:w-9">
                <User className="h-4 w-4 text-[#364153] md:h-5 md:w-5 min-[1280px]:h-4 min-[1536px]:h-5 min-[1536px]:w-5" />
              </span>
              <span className="font-medium text-[#364153] text-sm md:text-base min-[1024px]:text-sm min-[1280px]:text-sm min-[1536px]:text-base">
                Sarah Miller
              </span>
            </button>
          </div>

          {/* Mobile menu button (shown until lg 1024px) */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 text-gray-600 hover:text-gray-900 lg:hidden"
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile dropdown (shown until lg 1024px) */}
        {isMenuOpen && (
          <div className="border-t border-gray-100 py-3 lg:hidden sm:py-4">
            <div className="flex flex-col gap-3 sm:gap-4">
              {menuItems.map((item) =>
                item.isScroll ? (
                  <a
                    key={item.label}
                    href={`/#${item.target}`}
                    onClick={(e) => handleNavClick(e, item)}
                    className="px-1 font-medium text-gray-600 hover:text-gray-900 text-sm sm:text-base"
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.label}
                    to={item.path}
                    className="px-1 font-medium text-gray-600 hover:text-gray-900 text-sm sm:text-base"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                )
              )}
              <div className="mt-2 flex flex-col gap-3 border-t border-gray-100 pt-4">
                <Link
                  to="/for-providers"
                  className="inline-flex justify-center rounded-full bg-[#132329] px-5 py-2.5 text-sm font-medium text-white"
                  onClick={() => setIsMenuOpen(false)}
                >
                  For Providers
                </Link>
                <button
                  type="button"
                  className="flex items-center gap-2 px-1"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100">
                    <User className="h-5 w-5 text-gray-600" />
                  </span>
                  <span className="font-medium text-gray-700 text-sm sm:text-base">Sarah Miller</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
