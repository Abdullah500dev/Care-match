import React from "react";
import { Info } from "lucide-react";
import SEO from "../../../components/common/SEO";
import CareExplorerBar from "../../../components/client/CareExplorer/CareExplorerBar";
import FiltersSidebar from "../../../components/client/CareExplorer/FiltersSidebar";
import FacilityCard from "../../../components/client/CareExplorer/FacilityCard";

const CareExplorer = () => {
  return (
    <>
      <SEO title="Care Explorer - CareMatch AI" />
      <div
        className="min-h-screen bg-no-repeat"
        style={{
          backgroundImage: "url(/assets/images/overlay-searchbg.svg), url(/assets/images/seacrh-bg-img.png)",
          backgroundSize: "55% 70%, cover",
          backgroundPosition: "145% 100%, center",
        }}
      >
        <CareExplorerBar />

        {/* How we matched - bordered card */}
        <div className="max-w-7xl mx-auto px-4 pt-5 pb-2">
          <div className="flex flex-col md:flex-row items-start md:items-stretch gap-4 md:gap-8 p-4 bg-white rounded-lg border border-[#E2E8F0] shadow-sm">
            <div className="flex flex-col gap-1 shrink-0 py-1 pl-2">
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#155DFC]/20 text-[#155DFC]">
                  <Info className="h-3 w-3" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wide text-[#155DFC]">Transparency</span>
              </div>
              <h2 className="text-base font-bold text-[#132329]">How we matched these</h2>
            </div>
            <div className="md:border-l-2 md:border-[#E2E8F0] md:pl-8 flex-1 flex items-center justify-center">
              <p className="text-sm text-[#64748b] text-center">
                Prioritized for{" "}
                <span className="font-semibold text-[#132329]">Assisted Living</span>, budget around{" "}
                <span className="font-semibold text-[#132329]">$3,000/mo</span>, and your specific{" "}
                <span className="font-semibold text-[#222c2e]">mobility needs</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col lg:flex-row gap-5">
          <div className="lg:w-72 flex-shrink-0">
            <FiltersSidebar />
          </div>

          <div className="flex-1 space-y-4">
            <FacilityCard matchPercent={98} />
            <FacilityCard matchPercent={95} />
            <FacilityCard matchPercent={92} />
          </div>
        </div>
      </div>
    </>
  );
};

export default CareExplorer;
