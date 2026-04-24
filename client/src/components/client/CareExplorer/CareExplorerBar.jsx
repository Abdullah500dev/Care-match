import React from "react";
import { List, Map, Send, Heart, LayoutList, Columns2, LayoutGrid } from "lucide-react";

const CareExplorerBar = ({
  view = "listing",
  onViewChange,
  layout = "single",
  onLayoutChange,
  scope = "all",
  onScopeChange,
  matchCount = 0,
  locationLabel = "your area",
  isDiscoverLoading = false,
}) => {
  const isListing = view === "listing";
  const isMapView = view === "map";
  const isAllScope = scope === "all";
  const isSavedScope = scope === "saved";

  return (
    <div
      className="border-b border-[#E2E8F0] bg-white"
      style={{ background: "linear-gradient(to bottom, #fff 0%, #f8fafc 100%)" }}
    >
      <div className="container mx-auto px-2 sm:px-6 md:px-8 lg:max-w-6xl lg:px-12 min-[1280px]:max-w-[1400px] min-[1280px]:px-16 min-[1536px]:max-w-[1600px] min-[1536px]:px-20 min-[1920px]:max-w-[1800px] min-[1920px]:px-12 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 py-2.5 sm:py-3 min-w-0 overflow-x-hidden">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-[#00CFF4] text-white">
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-[#132329] text-sm sm:text-base truncate">Care Explorer</h2>
            <p className="text-xs text-[#64748b] truncate">
              {isDiscoverLoading ? (
                <>Refreshing listings for your filters…</>
              ) : (
                <>
                  {matchCount} personalized {matchCount === 1 ? "match" : "matches"} in{" "}
                  <span className="text-[#16191d] font-bold">{locationLabel}</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="justify-center md:justify-start flex flex-wrap items-center gap-2 sm:gap-3 lg:gap-6 shrink-0 min-w-0 overflow-x-auto overflow-y-hidden py-0.5 sm:py-0">
          <div className="flex items-center border border-[#E2E8F0] rounded-2xl overflow-hidden bg-[#E2E8F0] p-0.5 sm:p-1">
            <button
              type="button"
              onClick={() => onViewChange?.("listing")}
              className={`px-3 py-2 sm:px-4 text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 rounded-full min-h-[36px] sm:min-h-0 transition-colors ${isListing ? "bg-white text-[#132329] shadow-sm" : "text-[#64748b] hover:text-[#132329]"}`}
            >
              <List className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> <span className="whitespace-nowrap">Listing</span>
            </button>
            <button
              type="button"
              onClick={() => onViewChange?.("map")}
              className={`px-3 py-2 sm:px-4 text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 rounded-full min-h-[36px] sm:min-h-0 transition-colors ${isMapView ? "bg-white text-[#132329] shadow-sm" : "text-[#64748b] hover:text-[#132329]"}`}
            >
              <Map className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> <span className="whitespace-nowrap">Map View</span>
            </button>
          </div>
          {isListing && (
            <div className="flex items-center border border-[#E2E8F0] rounded-2xl overflow-hidden bg-[#E2E8F0] p-0.5 sm:p-1">
              <button
                type="button"
                onClick={() => onLayoutChange?.("single")}
                title="Single column"
                aria-label="Single column layout"
                className={`p-2 sm:px-3 sm:py-2 rounded-full min-h-[36px] sm:min-h-0 transition-colors ${layout === "single" ? "bg-white text-[#132329] shadow-sm" : "text-[#64748b] hover:text-[#132329]"}`}
              >
                <LayoutList className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              </button>
              <button
                type="button"
                onClick={() => onLayoutChange?.("two")}
                title="Two columns"
                aria-label="Two column layout"
                className={`p-2 sm:px-3 sm:py-2 rounded-full min-h-[36px] sm:min-h-0 transition-colors ${layout === "two" ? "bg-white text-[#132329] shadow-sm" : "text-[#64748b] hover:text-[#132329]"}`}
              >
                <Columns2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              </button>
              <button
                type="button"
                onClick={() => onLayoutChange?.("grid")}
                title="Grid (4 columns)"
                aria-label="Grid layout"
                className={`p-2 sm:px-3 sm:py-2 rounded-full min-h-[36px] sm:min-h-0 transition-colors ${layout === "grid" ? "bg-white text-[#132329] shadow-sm" : "text-[#64748b] hover:text-[#132329]"}`}
              >
                <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-1 sm:gap-2 border border-[#E2E8F0] rounded-2xl overflow-hidden bg-[#F1F5F9] p-0.5 sm:p-1">
            <button
              type="button"
              onClick={() => onScopeChange?.("all")}
              className={`px-4 py-2 sm:px-6 text-xs sm:text-sm font-bold rounded-full transition-colors min-h-[36px] sm:min-h-0 ${
                isAllScope
                  ? "bg-[#00CFF4] text-white hover:bg-[#00b8d8]"
                  : "text-[#64748b] hover:text-[#132329]"
              }`}
              style={{ boxShadow: "0 3px 6px rgba(0, 0, 0, 0.25)" }}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => onScopeChange?.("saved")}
              className={`px-4 py-2 sm:px-6 text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 transition-colors min-h-[36px] sm:min-h-0 ${
                isSavedScope
                  ? "bg-white text-[#132329] rounded-full shadow-sm"
                  : "text-[#64748b] hover:text-[#132329]"
              }`}
            >
              <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> <span className="whitespace-nowrap">Saved</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CareExplorerBar;
