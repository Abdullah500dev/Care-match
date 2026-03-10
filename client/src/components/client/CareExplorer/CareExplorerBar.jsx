import React from "react";
import { List, Map, Send, ChevronDown, Heart } from "lucide-react";

const CareExplorerBar = () => {
  return (
    <div
      className="border-b border-[#E2E8F0] bg-white"
      style={{ background: "linear-gradient(to bottom, #fff 0%, #f8fafc 100%)" }}
    >
      <div className="container mx-auto px-6 sm:px-8 md:px-10 lg:max-w-6xl lg:px-12 min-[1280px]:max-w-[1400px] min-[1280px]:px-16 min-[1536px]:max-w-[1600px] min-[1536px]:px-20 min-[1800px]:px-16 min-[1920px]:max-w-[1800px] min-[1920px]:px-12 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 py-3">
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00CFF4] text-white">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-[#132329]">Care Explorer</h2>
            <p className="text-xs text-[#64748b]">
              5 personalized matches in{" "}
              <span className="text-[#16191d] font-bold">San Francisco</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 lg:gap-6 shrink-0">
          <div className="flex items-center border border-[#E2E8F0] rounded-2xl overflow-hidden bg-[#E2E8F0] p-1">
            <button
              type="button"
              className="px-4 py-2 text-sm bg-white text-[#132329] font-bold flex items-center gap-2 rounded-full shadow-sm"
            >
              <List className="w-4 h-4" /> Listing
            </button>
            <button
              type="button"
              className="px-4 py-2 text-sm text-[#64748b] font-bold flex items-center gap-2 hover:text-[#132329] transition-colors"
            >
              <Map className="w-4 h-4" /> Map View
            </button>
          </div>
          <div className="flex items-center border border-[#E2E8F0] rounded-2xl overflow-hidden bg-[#F1F5F9] p-1">
            <button
              type="button"
              className="px-6 py-2 text-sm bg-[#00CFF4] text-white font-bold rounded-full hover:bg-[#00b8d8] transition-colors"
              style={{ boxShadow: "0 3px 6px rgba(0, 0, 0, 0.25)" }}
            >
              All
            </button>
            <button
              type="button"
              className="px-6 py-2 text-sm text-[#64748b] font-bold flex items-center gap-2 hover:text-[#132329] transition-colors"
            >
              <Heart className="w-4 h-4" /> Saved
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CareExplorerBar;
