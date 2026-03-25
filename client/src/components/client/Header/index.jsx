import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Menu, X, User, Search } from "lucide-react";
import { getUser } from "@/store/auth/authSlice.js";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, userData } = useSelector(getUser);

  const menuItems = [
    // { label: "How it Works", target: "how-it-works", isScroll: true },
    // { label: "Client Types", target: "care-types", isScroll: true },
    { label: "Why Us", path: "/why-us", isScroll: false },
    { label: "Resources", target: "resources", isScroll: true },
    { label: "Contact", path: "/contact", isScroll: false },
  ];

  const scrollToTop = () => {
    document.getElementById("page-top")?.scrollIntoView({ behavior: "smooth", block: "start" });
    document.scrollingElement?.scrollTo({ top: 0, behavior: "smooth" });
    document.documentElement?.scrollTo({ top: 0, behavior: "smooth" });
    document.body?.scrollTo?.({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
    <nav className="border-b border-gray-100 bg-gray-50/95 backdrop-blur-md">
      <div className="container mx-auto px-6 sm:px-8 md:px-10 lg:max-w-6xl lg:px-12 min-[1280px]:max-w-[1400px] min-[1280px]:px-16 min-[1536px]:max-w-[1600px] min-[1536px]:px-20 min-[1920px]:max-w-[1800px] min-[1920px]:px-24">
        <div className="flex h-16 items-center justify-between sm:h-[72px] md:h-20">
          {/* Logo (left) – always scroll to top of home when clicked */}
          <div className="flex items-center gap-6 sm:gap-8 lg:gap-10 min-[1280px]:gap-8 min-[1536px]:gap-10">
            <Link
              to="/"
              className="flex shrink-0 items-center gap-2"
              onClick={(e) => {
                if (location.pathname === "/") {
                  e.preventDefault();
                  scrollToTop();
                }
              }}
            >
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
          <div className="hidden shrink-0 items-center lg:flex lg:-ml-4 lg:gap-5 min-[1280px]:-ml-6 min-[1280px]:gap-5 min-[1536px]:-ml-8 min-[1536px]:gap-6">
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
              to="/dashboard"
              className="rounded-full bg-[#00B8DB] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 md:px-5 md:py-2.5 min-[1024px]:px-4 min-[1024px]:py-2 min-[1024px]:text-sm min-[1280px]:px-4 min-[1280px]:py-2 min-[1280px]:text-sm min-[1536px]:px-5 min-[1536px]:py-2.5"
            >
              Facilities
            </Link>
            <span
              className="h-5 w-[2px] rounded-full bg-gray-300 min-[1536px]:h-6"
              aria-hidden
            />
            {isAuthenticated && userData ? (
              <Link
                to="/profile"
                className="flex items-center gap-2 text-[#364153] transition-colors hover:text-[#364153]"
                aria-label="Profile"
              >
                <Search className="h-4 w-4 text-[#364153] md:h-5 md:w-5" />
                <span className="flex h-8 w-8 items-center justify-center rounded-full md:h-8 md:w-8 min-[1024px]:h-8 min-[1024px]:w-8 min-[1280px]:h-8 min-[1280px]:w-8 min-[1536px]:h-9 min-[1536px]:w-9">
                  <User className="h-4 w-4 text-[#364153] md:h-5 md:w-5 min-[1280px]:h-4 min-[1536px]:h-5 min-[1536px]:w-5" />
                </span>
                <span className="font-medium text-[#364153] text-sm md:text-base min-[1024px]:text-sm min-[1280px]:text-sm min-[1536px]:text-base">
                  {userData.name || "Profile"}
                </span>
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                {/* <Link
                  to="/register"
                  className="font-medium text-[#364153] text-sm md:text-base hover:text-[#132329] transition-colors min-[1024px]:text-sm min-[1280px]:text-sm min-[1536px]:text-base"
                >
                  Sign-up
                </Link> */}
                <div className="flex items-center gap-1.5">
                  <Link
                    to="/register"
                    className="font-medium text-[#364153] text-sm md:text-base hover:text-[#132329] transition-colors min-[1024px]:text-sm min-[1280px]:text-sm min-[1536px]:text-base"
                  >
                    Signup
                  </Link>
                  <span className="text-[#364153]">/</span>
                  <Link
                    to="/signin"
                    className="font-medium text-[#364153] text-sm md:text-base hover:text-[#132329] transition-colors min-[1024px]:text-sm min-[1280px]:text-sm min-[1536px]:text-base"
                  >
                    Login
                  </Link>
                </div>
              </div>
            )}
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
              <div className="md:mt-2 flex flex-col gap-3 border-t border-gray-100 md:pt-4">
                {isAuthenticated && userData ? (
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 px-1"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100">
                      <User className="h-5 w-5 text-gray-600" />
                    </span>
                    <span className="font-medium text-gray-700 text-sm sm:text-base">
                      {userData.name || "Profile"}
                    </span>
                  </Link>
                ) : (
                  <div className="flex items-center gap-1.5 px-1">
                    <Link
                      to="/register"
                      className="font-medium text-gray-700 text-sm sm:text-base hover:text-[#132329]"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Sign-in
                    </Link>
                    <span className="text-[#364153]">/</span>
                    <Link
                      to="/signin"
                      className="font-medium text-gray-700 text-sm sm:text-base hover:text-[#132329]"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Login
                    </Link>
                  </div>
                )}
                <Link
                  to="/dashboard"
                  className="mt-1 inline-flex justify-center rounded-full bg-[#00B8DB] px-5 py-2.5 text-sm font-medium text-white"
                  onClick={() => setIsMenuOpen(false)}
                >
                  For Providers
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
