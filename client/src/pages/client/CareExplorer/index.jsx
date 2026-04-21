import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import SEO from "../../../components/common/SEO";
import CareExplorerBar from "../../../components/client/CareExplorer/CareExplorerBar";
import FiltersSidebar from "../../../components/client/CareExplorer/FiltersSidebar";
import FacilityCard from "../../../components/client/CareExplorer/FacilityCard";

const API_BASE =
  typeof import.meta.env.VITE_REACT_APP_API_BASE_URL === "string"
    ? import.meta.env.VITE_REACT_APP_API_BASE_URL.replace(/\/$/, "")
    : "";

function resolveFacilityImageUrl(path) {
  if (!path || typeof path !== "string") return null;
  if (/^https?:\/\//i.test(path)) return path;
  if (!API_BASE) return path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

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

const DEFAULT_CARD_IMAGE = "/assets/images/imgForFindCare.svg";
const DEFAULT_PRICE_RANGE = "$4,000 - $6,500/mo";

function formatPriceRange(rawPricing) {
  const raw = String(rawPricing || "").trim();
  const nums = [...raw.matchAll(/(\d[\d,]*)/g)]
    .map((m) => Number.parseInt(m[1].replace(/,/g, ""), 10))
    .filter((n) => !Number.isNaN(n) && n > 0);

  if (nums.length === 0) return DEFAULT_PRICE_RANGE;
  if (nums.length === 1) return `$${nums[0].toLocaleString("en-US")}/mo`;
  const low = Math.min(...nums);
  const high = Math.max(...nums);
  return `$${low.toLocaleString("en-US")} - $${high.toLocaleString("en-US")}/mo`;
}

function parsePriceRangeNumbers(rawPricing) {
  const raw = String(rawPricing || "").trim();
  const nums = [...raw.matchAll(/(\d[\d,]*)/g)]
    .map((m) => Number.parseInt(m[1].replace(/,/g, ""), 10))
    .filter((n) => !Number.isNaN(n) && n > 0);
  if (nums.length === 0) return { min: null, max: null };
  if (nums.length === 1) return { min: nums[0], max: nums[0] };
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

function titleCase(s) {
  return String(s || "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const CareExplorer = () => {
  const location = useLocation();
  const carrieMatches = location.state?.carrieMatches;
  const carrieFilters = location.state?.carrieFilters;
  const fromCarrie = Boolean(location.state?.fromCarrie);

  const [view, setView] = useState("listing");
  const [layout, setLayout] = useState("single");
  const [scope, setScope] = useState("all");
  const [mobileFiltersCollapsed, setMobileFiltersCollapsed] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    searchQuery: "",
    maxMiles: "",
    budgetMin: 1000,
    budgetMax: 15000,
    selectedCareTypes: [],
    selectedAvailability: ["Within 30 Days"],
    selectedAmenities: [],
  });

  const liveFacilities = useMemo(() => {
    if (!Array.isArray(carrieMatches) || carrieMatches.length === 0) return null;
    return carrieMatches.map((m) => {
      const firstImg = Array.isArray(m.images) && m.images.length ? m.images[0] : null;
      const imageSrc = resolveFacilityImageUrl(firstImg) || DEFAULT_CARD_IMAGE;
      const category =
        Array.isArray(m.care_levels) && m.care_levels.length
          ? m.care_levels.join(" · ").toUpperCase()
          : "SENIOR LIVING";
      const features = Array.isArray(m.reasons) && m.reasons.length
        ? m.reasons.map((r) => String(r).replace(/^[✓○]\s*/, "").trim())
        : ["Review listing details and tour to validate fit"];
      const priceRange = formatPriceRange(m.pricing);
      const numericPrice = parsePriceRangeNumbers(m.pricing);
      const distance =
        m.address && String(m.address).trim()
          ? String(m.address).trim().slice(0, 48) + (String(m.address).length > 48 ? "…" : "")
          : "Address on file";
      return {
        key: m.facilityId || m.name,
        matchPercent: typeof m.score === "number" ? m.score : 0,
        imageSrc,
        category,
        name: m.name || "Community",
        priceRange,
        priceMin: numericPrice.min,
        priceMax: numericPrice.max,
        distance,
        features,
        address: m.address || "",
        website: m.website || "",
        specialty: Array.isArray(m.specialty) ? m.specialty : [],
        description: m.description || "",
        sourcePlatform: m.source_platform || "",
        isExternal: Boolean(m.is_external),
        careLevels: Array.isArray(m.care_levels) ? m.care_levels : [],
        amenities: Array.isArray(m.amenities) ? m.amenities : [],
        services: Array.isArray(m.services) ? m.services : [],
        availability: "Within 30 Days",
      };
    });
  }, [carrieMatches]);

  const careTypeOptions = useMemo(() => {
    const base = liveFacilities
      ? [...new Set(liveFacilities.flatMap((f) => f.careLevels.map((x) => titleCase(x))))]
      : ["Assisted Living"];
    return base.length ? base : ["Assisted Living"];
  }, [liveFacilities]);

  const amenityOptions = useMemo(() => {
    const base = liveFacilities
      ? [
          ...new Set(
            liveFacilities.flatMap((f) =>
              [...(f.amenities || []), ...(f.services || [])].map((x) => titleCase(x))
            )
          ),
        ]
      : ["24/7 Care", "Private Rooms", "Therapy Services", "Pet Friendly"];
    return base.slice(0, 12).length
      ? base.slice(0, 12)
      : ["24/7 Care", "Private Rooms", "Therapy Services", "Pet Friendly"];
  }, [liveFacilities]);

  useEffect(() => {
    if (!fromCarrie || !carrieFilters) return;
    const maxBudget =
      Number.isFinite(Number(carrieFilters.budgetMaxMonthly)) && Number(carrieFilters.budgetMaxMonthly) > 0
        ? Number(carrieFilters.budgetMaxMonthly)
        : 15000;
    const safeMax = Math.min(15000, Math.max(1000, Math.round(maxBudget)));
    setFilters((prev) => ({
      ...prev,
      budgetMax: safeMax,
      selectedCareTypes: Array.isArray(carrieFilters.careLevels)
        ? carrieFilters.careLevels.map((x) => titleCase(x))
        : prev.selectedCareTypes,
      selectedAmenities: Array.isArray(carrieFilters.amenityMustHaves)
        ? carrieFilters.amenityMustHaves.map((x) => titleCase(x))
        : prev.selectedAmenities,
      maxMiles:
        carrieFilters.maxDistanceMiles != null && !Number.isNaN(Number(carrieFilters.maxDistanceMiles))
          ? String(carrieFilters.maxDistanceMiles)
          : prev.maxMiles,
    }));
  }, [fromCarrie, carrieFilters]);

  const scopedFacilities =
    scope === "saved" && liveFacilities
      ? liveFacilities.filter((_, idx) => idx % 2 === 0)
      : liveFacilities
        ? liveFacilities
        : scope === "saved"
          ? FACILITIES.filter((_, idx) => idx % 2 === 0)
          : FACILITIES;

  const filteredFacilities = useMemo(() => {
    const q = String(filters.searchQuery || "").trim().toLowerCase();
    const maxMilesNum = Number.parseFloat(String(filters.maxMiles || "").trim());
    const budgetMin = Number(filters.budgetMin) || 1000;
    const budgetMax = Number(filters.budgetMax) || 15000;
    const selectedCare = new Set((filters.selectedCareTypes || []).map((x) => String(x).toLowerCase()));
    const selectedAmenities = (filters.selectedAmenities || []).map((x) => String(x).toLowerCase());
    const selectedAvailability = new Set(
      (filters.selectedAvailability || []).map((x) => String(x).toLowerCase())
    );

    return scopedFacilities.filter((f) => {
      if (q) {
        const text = `${f.name || ""} ${f.category || ""} ${f.address || ""} ${(f.features || []).join(" ")}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      if (f.priceMin != null || f.priceMax != null) {
        const low = f.priceMin ?? f.priceMax;
        const high = f.priceMax ?? f.priceMin;
        if (low != null && high != null) {
          const overlaps = low <= budgetMax && high >= budgetMin;
          if (!overlaps) return false;
        }
      }

      if (selectedCare.size > 0) {
        const levels = (f.careLevels || []).map((x) => String(x).toLowerCase());
        const hasCare = [...selectedCare].some((c) => levels.some((l) => l.includes(c) || c.includes(l)));
        if (!hasCare) return false;
      }

      if (selectedAmenities.length > 0) {
        const pool = [...(f.amenities || []), ...(f.services || []), ...(f.features || [])]
          .map((x) => String(x).toLowerCase());
        const hasAmenity = selectedAmenities.some((a) => pool.some((p) => p.includes(a) || a.includes(p)));
        if (!hasAmenity) return false;
      }

      if (selectedAvailability.size > 0) {
        const a = String(f.availability || "").toLowerCase();
        if (a && !selectedAvailability.has(a)) return false;
      }

      if (!Number.isNaN(maxMilesNum) && maxMilesNum > 0) {
        const milesMatch = String(f.distance || "").match(/(\d+(?:\.\d+)?)\s*miles?/i);
        if (milesMatch) {
          const facilityMiles = Number.parseFloat(milesMatch[1]);
          if (!Number.isNaN(facilityMiles) && facilityMiles > maxMilesNum) return false;
        }
      }

      return true;
    });
  }, [filters, scopedFacilities]);

  const showFullCarrieList = Boolean(fromCarrie && liveFacilities?.length);
  const pageSize = showFullCarrieList
    ? Math.max(filteredFacilities.length, 1)
    : layout === "single"
      ? 3
      : layout === "two"
        ? 4
        : 12;
  const totalPages = Math.max(1, Math.ceil(filteredFacilities.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const listingItems = filteredFacilities.slice(startIdx, endIdx);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) return [1, 2, 3, 4, 5, "...", totalPages];
    if (currentPage >= totalPages - 3) {
      return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
  }, [currentPage, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [layout, scope, fromCarrie, carrieMatches?.length]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

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
                {fromCarrie && liveFacilities ? (
                  <>
                    These communities are{" "}
                    <span className="font-semibold text-[#132329]">ranked from your chat with Carrie</span>{" "}
                    using care level fit, must-have amenities, budget vs listed pricing, location keywords, and
                    visitation-friendly signals. Always confirm details on a tour.
                  </>
                ) : (
                  <>
                    Prioritized for{" "}
                    <span className="font-semibold text-[#132329]">Assisted Living</span>, budget around{" "}
                    <span className="font-semibold text-[#132329]">$3,000/mo</span>, and your specific{" "}
                    <span className="font-semibold text-[#222c2e]">mobility needs</span>.
                  </>
                )}
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
              <FiltersSidebar
                filters={filters}
                onFiltersChange={setFilters}
                onReset={() =>
                  setFilters({
                    searchQuery: "",
                    maxMiles: "",
                    budgetMin: 1000,
                    budgetMax: 15000,
                    selectedCareTypes: [],
                    selectedAvailability: ["Within 30 Days"],
                    selectedAmenities: [],
                  })
                }
                careTypeOptions={careTypeOptions}
                amenityOptions={amenityOptions}
              />
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
              {listingItems.map((f) => (
                <div key={f.key ?? f.matchPercent} className={layout !== "single" ? "min-w-0 overflow-hidden" : undefined}>
                  <FacilityCard
                    matchPercent={f.matchPercent}
                    imageSrc={f.imageSrc}
                    name={f.name}
                    category={f.category}
                    priceRange={f.priceRange}
                    distance={f.distance}
                    features={f.features}
                    website={f.website}
                    sourcePlatform={f.sourcePlatform}
                    compact={layout !== "single"}
                    gridView={layout === "grid"}
                  />
                </div>
              ))}

              {!showFullCarrieList && totalPages > 1 && (
                <div className="col-span-full mt-2 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm text-[#132329] disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <span className="text-sm text-[#64748B]">
                    Page {currentPage} of {totalPages}
                  </span>
                  <div className="mx-1 flex items-center gap-1">
                    {pageNumbers.map((p, idx) =>
                      p === "..." ? (
                        <span key={`ellipsis-${idx}`} className="px-1 text-sm text-[#94A3B8]">
                          ...
                        </span>
                      ) : (
                        <button
                          key={`page-${p}`}
                          type="button"
                          onClick={() => setPage(Number(p))}
                          className={`rounded-lg border px-2.5 py-1.5 text-sm ${
                            currentPage === p
                              ? "border-[#00CFF4] bg-[#00CFF4] text-white"
                              : "border-[#E2E8F0] bg-white text-[#132329]"
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm text-[#132329] disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Map view: same template, 2x2 grid of cards (no map) */
            <div className="flex-1 min-w-0 w-full max-w-full lg:max-w-5xl">
              <div className="grid grid-cols-1 min-[500px]:grid-cols-2 gap-3 sm:gap-4">
                {scopedFacilities.map((f) => (
                  <FacilityCard
                    key={f.key ?? f.matchPercent}
                    matchPercent={f.matchPercent}
                    imageSrc={f.imageSrc}
                    name={f.name}
                    category={f.category}
                    priceRange={f.priceRange}
                    distance={f.distance}
                    features={f.features}
                    website={f.website}
                    sourcePlatform={f.sourcePlatform}
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
