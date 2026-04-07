import React from "react";
import { Link } from "react-router-dom";
import { Search, List, Map, Phone, User, Send, ChevronDown } from "lucide-react";

const navLinks = [
  { label: "How It Works", path: "/#how-it-works" },
  { label: "Care Types", path: "/#care-types" },
  { label: "About Us", path: "/#about-us" },
  { label: "Resources", path: "/#resources" },
];

const CareExplorerNavbar = () => {
  return (
    <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-50">
      {/* Main nav */}
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#00CFF4] flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="font-bold text-[#132329] text-lg">CareMatch AI</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map(({ label, path }) => (
            <a
              key={label}
              href={path}
              className="text-sm text-[#64748b] hover:text-[#132329] transition-colors"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#00CFF4] text-white text-sm font-medium hover:bg-[#00b8d8] transition-colors"
          >
            For Providers
          </Link>
          <button
            type="button"
            className="p-2 rounded-lg hover:bg-[#F8FAFC] transition-colors"
            aria-label="Search"
          >
            <Search className="w-4 h-4 text-[#64748b]" />
          </button>
          <a
            href="tel:18005551234"
            className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-[#00CFF4]"
          >
            <Phone className="w-4 h-4" />
            1-800-555-1234
          </a>
          <Link
            to="/profile"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E2E8F0] text-[#64748b] hover:bg-[#00CFF4] hover:text-white transition-colors"
            aria-label="Profile"
          >
            <User className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Care Explorer bar - below header */}
      <div
        className="border-b border-[#E2E8F0]"
        style={{ background: "linear-gradient(to bottom, #fff 0%, #f8fafc 100%)" }}
      >
        <div className="max-w-7xl mx-auto px-4 flex items-center py-3">
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00CFF4] text-white">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-[#132329]">Care Explorer</h2>
              <p className="text-xs text-[#64748b]">
                5 personalized matches in{" "}
                <span className="text-[#64748b] font-medium">San Francisco</span>
              </p>
            </div>
          </div>

          <div className="flex-1 min-w-[80px] lg:min-w-[200px] xl:min-w-[280px]" aria-hidden />

          <div className="flex items-center gap-3 lg:gap-4 shrink-0">
            <div className="flex items-center border border-[#E2E8F0] rounded-full overflow-hidden">
              <button
                type="button"
                className="px-4 py-2 text-sm bg-[#F1F5F9] text-[#132329] font-medium flex items-center gap-2"
              >
                <List className="w-4 h-4" /> Listing
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm text-[#64748b] flex items-center gap-2 hover:bg-[#F8FAFC] transition-colors"
              >
                <Map className="w-4 h-4" /> Map View
              </button>
            </div>
            <button
              type="button"
              className="px-4 py-2 rounded-full bg-[#00CFF4] text-white text-sm font-medium hover:bg-[#00b8d8] transition-colors"
            >
              All
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-full border border-[#E2E8F0] text-sm text-[#132329] flex items-center gap-2 hover:bg-[#F8FAFC] transition-colors"
            >
              Saved <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default CareExplorerNavbar;
