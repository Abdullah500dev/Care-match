import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { label: "Section 1", target: "section-1", isScroll: true },
    { label: "Section 2", target: "section-2", isScroll: true },
    { label: "Page 1", path: "/page_1" },
    { label: "Page 2", path: "/page_2" },
  ];

  const handleNavClick = (e, item) => {
    if (item.isScroll) {
      e.preventDefault();

      if (location.pathname === "/") {
        // If already on home, just scroll
        const el = document.getElementById(item.target);
        if (el) {
          const yOffset = -80;
          const y = el.getBoundingClientRect().top + window.scrollY + yOffset;
          window.scrollTo({ top: y, behavior: "smooth" });
          setIsMenuOpen(false);
        }
      } else {
        // If on another page, go to home and scroll
        navigate("/", { state: { scrollTo: item.target } });
      }
    }
  };

  return (
    <nav className="z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img src="/assets/images/favicon/favicon.svg" alt="logo" width="70" />
            <span className="text-2xl font-bold text-[#132329]">Care Match AI</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            {menuItems.map((item) =>
              item.isScroll ? (
                <a
                  key={item.label}
                  href={`/#${item.target}`}
                  onClick={(e) => handleNavClick(e, item)}
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.label}
                  to={item.path}
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  {item.label}
                </Link>
              )
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-gray-600 hover:text-gray-900"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col space-y-4">
              {menuItems.map((item) =>
                item.isScroll ? (
                  <a
                    key={item.label}
                    href={`/#${item.target}`}
                    onClick={(e) => handleNavClick(e, item)}
                    className="text-gray-600 hover:text-gray-900 font-medium px-4"
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.label}
                    to={item.path}
                    className="text-gray-600 hover:text-gray-900 font-medium px-4"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
