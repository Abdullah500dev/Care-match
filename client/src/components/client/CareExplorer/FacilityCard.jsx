import React from "react";
import { Heart, Star, CheckCircle2, ArrowRight, MapPin, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=280&fit=crop";

const FacilityCard = ({
  matchPercent = 96,
  category = "ASSISTED LIVING & MEMORY CARE",
  name = "Sunrise Senior Living",
  rating = 4.8,
  reviewCount = 127,
  priceRange = "$5,200 - $7,800",
  distance = "2.3 MILES AWAY",
  features = [
    "Strong memory care program",
    "Within your budget range",
    "Pet-friendly community",
    "24/7 medical staff on-site",
  ],
  imageSrc = DEFAULT_IMAGE,
}) => {
  return (
    <div
      className="flex flex-col sm:flex-row max-w-[820px] overflow-hidden rounded-2xl bg-white"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}
    >
      {/* Image Section - ~1/3 width on desktop */}
      <div className="relative sm:w-[33.333%] w-full min-h-[200px] sm:min-h-[220px] flex-shrink-0">
        <img src={imageSrc} alt={name} className="h-full w-full object-cover" />
        {/* Match Badge - dark semi-transparent oval */}
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-sm">
          <span className="h-2 w-2 rounded-full bg-[#00CFF4]" />
          {matchPercent}% Personalized Match
        </div>
        {/* Heart - white semi-transparent with thin border */}
        <button
          type="button"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/70 backdrop-blur-sm hover:bg-white/90 transition-colors"
          aria-label="Save to favorites"
        >
          <Heart className="h-4 w-4 text-[#132329] stroke-[2]" />
        </button>
        {/* Distance - dark semi-transparent oval */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
          <MapPin className="h-3 w-3" />
          {distance}
        </div>
      </div>

      {/* Content Section - ~2/3 width */}
      <div className="flex flex-1 flex-col justify-between px-6 py-5 bg-white">
        {/* Top row */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold tracking-widest text-[#155DFC] uppercase">
              {category}
            </p>
            <h3 className="mt-1 text-xl font-bold text-[#132329]">{name}</h3>
            <div className="mt-1.5 flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-[#FEFCE8]/55 px-2.5 py-1">
                <Star className="h-4 w-4 fill-[#FBBF24] text-[#FBBF24]" />
                <span className="font-semibold text-[#132329]">{rating}</span>
              </div>
              <span className="text-[#64748b]">{reviewCount} family reviews</span>
            </div>
          </div>
          {/* Monthly Investment - light grey box */}
          <div className="flex-shrink-0 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2.5 text-right">
            <p className="text-[10px] font-bold tracking-wider text-[#64748b] uppercase">
              MONTHLY INVESTMENT
            </p>
            <p className="mt-0.5 text-base font-bold text-[#132329]">
              {priceRange}
              <span className="text-sm font-normal text-[#64748b]"> /mo</span>
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="mt-4">
          <p className="text-[11px] font-bold tracking-wider text-[#64748b] uppercase flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-[#155DFC]" />
            WHY THIS FITS
          </p>
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5">
            {features.map((feature, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-[#132329]">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[#00CFF4]" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-5 flex gap-3">
          <Link
            to="/contact"
            className="flex items-center gap-2 rounded-xl bg-[#0F172A] px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1e293b]"
          >
            Explore <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            className="rounded-xl border border-[#E2E8F0] bg-white px-8 py-3 text-sm font-semibold text-[#132329] transition-colors hover:bg-[#F8FAFC]"
          >
            Request a Tour
          </button>
        </div>
      </div>
    </div>
  );
};

export default FacilityCard;
