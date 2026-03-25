import React, { useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import SEO from "../../../components/common/SEO";
import CareExplorerBar from "../../../components/client/CareExplorer/CareExplorerBar";
import FiltersSidebar from "../../../components/client/CareExplorer/FiltersSidebar";
import FacilityCard from "../../../components/client/CareExplorer/FacilityCard";

const FACILITIES = [
  { matchPercent: 98, imageSrc: "/assets/images/imgForFindCare.svg" },
  { matchPercent: 95, imageSrc: "/assets/images/imgForFindCare.svg" },
  { matchPercent: 92, imageSrc: "/assets/images/imgForFindCare.svg" },
  { matchPercent: 90, imageSrc: "/assets/images/imgForFindCare.svg" },
  { matchPercent: 88, imageSrc: "/assets/images/imgForFindCare.svg" },
  { matchPercent: 86, imageSrc: "/assets/images/imgForFindCare.svg" },
  { matchPercent: 84, imageSrc: "/assets/images/imgForFindCare.svg" },
  { matchPercent: 82, imageSrc: "/assets/images/imgForFindCare.svg" },
  { matchPercent: 80, imageSrc: "/assets/images/imgForFindCare.svg" },
  { matchPercent: 78, imageSrc: "/assets/images/imgForFindCare.svg" },
  { matchPercent: 76, imageSrc: "/assets/images/imgForFindCare.svg" },
  { matchPercent: 74, imageSrc: "/assets/images/imgForFindCare.svg" },
];

const CareExplorer = () => {
  const [view, setView] = useState("listing");
  const [layout, setLayout] = useState("single");
  const [scope, setScope] = useState("all");
  const [mobileFiltersCollapsed, setMobileFiltersCollapsed] = useState(true);

  const scopedFacilities =
    scope === "saved" ? FACILITIES.filter((_, idx) => idx % 2 === 0) : FACILITIES;

  return (
    <>
      <SEO title="Care Explorer - CareMatch AI" />
      <div
        className="min-w-0 bg-no-repeat overflow-x-hidden"
        style={{
          backgroundImage: "url(/assets/images/overlay-searchbg.svg), url(/assets/images/seacrh-bg-img.png)",
          backgroundSize: "55% 70%, cover",
          backgroundPosition: "145% 100%, center",
        }}
      >
        <CareExplorerBar
          view={view}
          onViewChange={setView}
          layout={layout}
          onLayoutChange={setLayout}
          scope={scope}
          onScopeChange={setScope}
        />

        {/* How we matched - bordered card; responsive */}
        <div className="w-full max-w-7xl mx-auto px-2 pt-3 pb-2 sm:px-4 sm:pt-4 sm:pb-2 md:px-6 md:pt-5">
          <div className="flex flex-col md:flex-row items-start md:items-stretch gap-3 md:gap-8 p-3 sm:p-4 bg-white rounded-lg border border-[#E2E8F0] shadow-sm min-w-0">
            <div className="flex flex-col gap-1 shrink-0 py-1 pl-0 sm:pl-2">
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#155DFC]/20 text-[#155DFC]">
                  <Info className="h-3 w-3" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wide text-[#155DFC]">Transparency</span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-[#132329]">How we matched these</h2>
            </div>
            <div className="md:border-l-2 md:border-[#E2E8F0] md:pl-8 flex-1 flex items-center justify-center min-w-0 max-w-5xl w-full">
              <p className="text-xs sm:text-sm text-[#64748b] text-center sm:text-left md:text-center">
                Prioritized for{" "}
                <span className="font-semibold text-[#132329]">Assisted Living</span>, budget around{" "}
                <span className="font-semibold text-[#132329]">$3,000/mo</span>, and your specific{" "}
                <span className="font-semibold text-[#222c2e]">mobility needs</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Main content - sidebar + listing or map view; responsive padding and gap */}
        <div className="w-full max-w-7xl mx-auto px-2 pt-3 pb-8 flex flex-col lg:flex-row gap-3 sm:px-4 sm:pt-4 sm:pb-10 sm:gap-5 min-w-0 min-[1280px]:pb-12 min-[1920px]:pb-16">
          <div className="w-full lg:w-72 flex-shrink-0 min-w-0 max-w-full">
            <div className="lg:hidden rounded-xl border border-[#F7F4EF] bg-white px-3 py-2.5">
              <button
                type="button"
                onClick={() => setMobileFiltersCollapsed((prev) => !prev)}
                className="flex w-full items-center justify-between text-sm font-semibold text-[#364153]"
              >
                <span>Filters</span>
                {mobileFiltersCollapsed ? (
                  <ChevronDown className="h-4 w-4 text-[#64748b]" />
                ) : (
                  <ChevronUp className="h-4 w-4 text-[#64748b]" />
                )}
              </button>
            </div>
            <div className={mobileFiltersCollapsed ? "hidden lg:block" : "block"}>
              <FiltersSidebar />
            </div>
          </div>

          {view === "listing" ? (
            <div
              className={`flex-1 min-w-0 w-full max-w-full lg:max-w-5xl ${
                layout === "single"
                  ? "space-y-3 sm:space-y-4"
                  : layout === "two"
                    ? "grid grid-cols-2 md:grid-cols-2 gap-3 sm:gap-4"
                    : "grid grid-cols-2 min-[500px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 justify-items-center"
              }`}
            >
              {(layout === "single"
                ? scopedFacilities.slice(0, 3)
                : layout === "two"
                  ? scopedFacilities.slice(0, 4)
                  : scopedFacilities.slice(0, 12)
              ).map((f) => (
                <div key={f.matchPercent} className={layout !== "single" ? "min-w-0 overflow-hidden" : undefined}>
                  <FacilityCard
                    matchPercent={f.matchPercent}
                    imageSrc={f.imageSrc}
                    compact={layout !== "single"}
                    gridView={layout === "grid"}
                  />
                </div>
              ))}
            </div>
          ) : (
            /* Map view: same template, 2x2 grid of cards (no map) */
            <div className="flex-1 min-w-0 w-full max-w-full lg:max-w-5xl">
              <div className="grid grid-cols-1 min-[500px]:grid-cols-2 gap-3 sm:gap-4">
                {scopedFacilities.map((f) => (
                  <FacilityCard
                    key={f.matchPercent}
                    matchPercent={f.matchPercent}
                    imageSrc={f.imageSrc}
                    compact
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CareExplorer;
