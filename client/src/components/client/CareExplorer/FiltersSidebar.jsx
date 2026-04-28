import React, { useEffect, useRef, useState } from "react";
import { MessageCircle, MapPin, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { BudgetRangeSlider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  getGoogleMapsApiKey,
  loadGoogleMapsScript,
} from "../../../lib/loadGoogleMaps";

// ─── Google Places Autocomplete Input ───────────────────────────────────────

function LocationAutocompleteInput({ value, onChange, placeholder, className }) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [ready, setReady] = useState(false);

  // Load Maps + Places library once
  useEffect(() => {
    const apiKey = getGoogleMapsApiKey();
    if (!apiKey) return;
    loadGoogleMapsScript(apiKey)
      .then(() => setReady(true))
      .catch(() => {});
  }, []);

  // Attach autocomplete once the library is ready and the input is mounted
  useEffect(() => {
    if (!ready || !inputRef.current || autocompleteRef.current) return;

    const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ["(regions)"],          // cities, states, countries
      fields: ["formatted_address", "name", "address_components"],
    });

    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      // Build a clean "City, ST" or "State" string from components
      let label = "";
      const comps = place.address_components || [];
      const locality      = comps.find((c) => c.types.includes("locality"))?.long_name;
      const admin1Short   = comps.find((c) => c.types.includes("administrative_area_level_1"))?.short_name;
      const admin1Long    = comps.find((c) => c.types.includes("administrative_area_level_1"))?.long_name;
      const country       = comps.find((c) => c.types.includes("country"))?.short_name;

      if (locality && admin1Short && country === "US") {
        label = `${locality}, ${admin1Short}`;
      } else if (admin1Long && country === "US") {
        label = admin1Long;
      } else {
        label = place.name || place.formatted_address || "";
      }

      onChange(label);
    });

    autocompleteRef.current = ac;
  }, [ready, onChange]);

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94a3b8] pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full pl-9 pr-8 h-10 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#364153] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#00CFF4]/40 focus:border-[#00CFF4] transition-colors ${className ?? ""}`}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#364153] transition-colors"
          aria-label="Clear location"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const amenities = ["24/7 Care", "Private Rooms", "Therapy Services", "Pet Friendly"];

const toggleInArray = (arr, value) =>
  arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];

const normalizeLabel = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const hasSemanticSelection = (selectedValues, optionValue) => {
  const option = normalizeLabel(optionValue);
  if (!option) return false;
  return selectedValues.some((item) => {
    const selected = normalizeLabel(item);
    if (!selected) return false;
    
    // Basic fuzzy match: handle singular/plural and overlaps
    const s1 = selected.replace(/s$/i, "");
    const s2 = option.replace(/s$/i, "");

    return (
      s1 === s2 ||
      selected === option ||
      selected.includes(option) ||
      option.includes(selected) ||
      s1.includes(s2) ||
      s2.includes(s1)
    );
  });
};

// ─── FiltersSidebar ─────────────────────────────────────────────────────────

const FiltersSidebar = ({
  filters,
  onFiltersChange,
  onReset,
  amenityOptions = amenities,
  onAskCarrie,
}) => {
  const DEFAULT_AMENITIES_VISIBLE = 12;

  const locationQuery = filters?.locationQuery ?? "";
  const zipCode = filters?.zipCode ?? "";
  const maxMiles = filters?.maxMiles ?? "";
  const sortBy = filters?.sortBy ?? "bestMatch";
  const budgetMin = Number.isFinite(filters?.budgetMin) ? filters.budgetMin : 1000;
  const budgetMax = Number.isFinite(filters?.budgetMax) ? filters.budgetMax : 15000;
  const selectedAmenities = Array.isArray(filters?.selectedAmenities)
    ? filters.selectedAmenities
    : [];
  const [showAllAmenities, setShowAllAmenities] = useState(false);

  const normalizedAmenityOptions = [...new Set(
    amenityOptions
      .map((item) => String(item || "").trim())
      .filter(Boolean),
  )];
  const visibleAmenities = showAllAmenities
    ? normalizedAmenityOptions
    : normalizedAmenityOptions.filter(
      (item, index) =>
        index < DEFAULT_AMENITIES_VISIBLE ||
        hasSemanticSelection(selectedAmenities, item),
    );

  const setFilters = (patch) => {
    onFiltersChange?.({ ...filters, ...patch });
  };

  return (
    <aside className="w-full flex flex-col gap-3 sm:gap-5 min-w-0 max-w-full">
      <div className="rounded-xl border border-[#F7F4EF] bg-white p-2.5 sm:p-4 font-['Rethink_Sans'] font-medium" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06), 0 0 0 1px rgba(230,225,215,0.15)" }}>
        <h3 className="hidden lg:block font-semibold text-sm text-[#364153] mb-1">Filters</h3>
        <p className="hidden lg:block text-xs text-[#64748b] mb-3 leading-relaxed">
          Add a city plus ZIP for the strongest match, set a travel radius, and include custom needs like accessibility or lifestyle preferences to refresh ranked results automatically.
        </p>

        {/* Location autocomplete */}
        <div className="mb-3">
          <LocationAutocompleteInput
            placeholder="City or state"
            value={locationQuery}
            onChange={(val) => setFilters({ locationQuery: val })}
          />
        </div>

        <div className="mb-4">
          <p className="text-xs text-[#20252c] font-bold mb-2">ZIP Code</p>
          <Input
            id="zipCode"
            type="text"
            inputMode="numeric"
            maxLength={5}
            placeholder="e.g. 32811"
            value={zipCode}
            onChange={(e) =>
              setFilters({
                zipCode: String(e.target.value || "")
                  .replace(/\D/g, "")
                  .slice(0, 5),
              })}
            className="h-10 rounded-lg border-[#E2E8F0]"
          />
        </div>

        <p className="text-xs text-[#20252c] font-bold mb-2">How far are you willing to travel?</p>
        <Input
          id="maxDistance"
          type="text"
          inputMode="numeric"
          placeholder="Max distance (miles)"
          value={maxMiles}
          onChange={(e) => setFilters({ maxMiles: e.target.value })}
          className="h-10 rounded-lg border-[#E2E8F0] mb-4"
        />

        <div className="mb-4">
          <p className="text-xs text-[#20252c] font-bold mb-2">Rank Results By</p>
          <select
            value={sortBy}
            onChange={(e) => setFilters({ sortBy: e.target.value })}
            className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm text-[#364153] focus:outline-none focus:ring-2 focus:ring-[#00CFF4]/40 focus:border-[#00CFF4]"
          >
            <option value="bestMatch">Best overall match</option>
            <option value="overallQuality">Overall quality</option>
            <option value="nearest">Nearest first</option>
            <option value="lowestPrice">Lowest estimated price</option>
          </select>
        </div>

        <p className="text-xs text-[#20252c] font-bold mb-2">Monthly Budget</p>
        <BudgetRangeSlider
          budgetMin={budgetMin}
          budgetMax={budgetMax}
          min={1000}
          max={15000}
          step={100}
          onRangeChange={(minVal, maxVal) => {
            setFilters({ budgetMin: minVal, budgetMax: maxVal });
          }}
          className="mb-3"
        />
        <div className="flex justify-between gap-2">
          <span className="rounded-lg px-3 py-1.5 text-sm font-semibold text-[#00CFF4] bg-[#00CFF4]/10">
            ${budgetMin.toLocaleString()}
          </span>
          <span className="rounded-lg px-3 py-1.5 text-sm font-semibold text-[#00CFF4] bg-[#00CFF4]/10">
            ${budgetMax.toLocaleString()}+
          </span>
        </div>

        <div className="my-4 border-t border-[#E2E8F0]" />

        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-semibold text-sm text-[#364153]">Must-Have Amenities</h3>
          {selectedAmenities.length > 0 && (
            <span className="rounded-full bg-[#00CFF4]/10 px-2 py-0.5 text-[11px] font-semibold text-[#00A8C8]">
              {selectedAmenities.length} selected
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-2.5">
          {visibleAmenities.map((item) => (
            <label
              key={item}
              className="flex items-center gap-2 text-sm text-[#364153] cursor-pointer"
            >
              <Checkbox
                checked={hasSemanticSelection(selectedAmenities, item)}
                onCheckedChange={() =>
                  setFilters({
                    selectedAmenities: toggleInArray(selectedAmenities, item),
                  })
                }
                className="border-[#00CFF4] bg-[#64748b]/10 data-[state=checked]:bg-[#00CFF4] data-[state=checked]:border-[#00CFF4] focus-visible:ring-[#00CFF4]"
              />
              {item}
            </label>
          ))}
        </div>
        {normalizedAmenityOptions.length > DEFAULT_AMENITIES_VISIBLE && (
          <button
            type="button"
            onClick={() => setShowAllAmenities((prev) => !prev)}
            className="mt-2 text-xs font-semibold text-[#00A8C8] hover:text-[#008BA7]"
          >
            {showAllAmenities
              ? "Show less amenities"
              : `Show more amenities (${normalizedAmenityOptions.length - visibleAmenities.length} more)`}
          </button>
        )}

        <button
          type="button"
          onClick={onReset}
          className="mt-5 w-full py-2.5 px-4 rounded-xl border-[1.5px] border-[#00CFF4] bg-white text-[#00CFF4] text-sm font-medium"
        >
          Reset All Filters
        </button>
      </div>

      <div className="rounded-xl p-3 sm:p-4 bg-white border border-[#F7F4EF] font-['Rethink_Sans'] font-medium" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06), 0 0 0 1px rgba(230,225,215,0.15)" }}>
          <div className="flex items-start gap-3 mb-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{
                background: "linear-gradient(135deg, #00CFF4 0%, #E0F7FA 50%, #FCE4EC 100%)",
              }}
            >
              <svg
                viewBox="0 0 43 41"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                aria-hidden
              >
                <path d="M21.3074 6.11932C21.4439 6.15187 21.5074 6.08291 21.6036 6.00692C22.6239 5.20108 23.6219 3.86357 24.579 2.95187C27.6769 0.000527893 32.3106 -0.854292 36.1821 1.02446C37.2493 1.54239 37.6891 2.10578 38.5529 2.73711C39.1503 3.17351 39.5553 3.59848 40.0193 4.22479C42.8393 8.03012 42.6359 13.1808 39.6788 16.8479C38.6195 18.1618 37.3155 19.2692 36.154 20.4924L40.6304 24.9672C44.9264 30.2676 42.5699 38.3015 35.8899 40.1744C27.3122 42.5795 20.3944 32.674 25.845 25.4399C28.8187 21.4936 33.5422 18.0626 36.8028 14.2402C39.6519 10.2151 37.6304 4.82022 32.627 4.02045C31.0834 3.77382 28.7794 4.27831 27.6487 5.40896L21.4859 11.5717H21.308L15.1441 5.40762C13.8665 4.13017 11.0999 3.66879 9.39526 4.12195C4.92926 5.30913 3.24959 10.7768 6.07674 14.3556C9.3789 17.9764 13.404 21.2561 16.6326 24.9056C22.2109 31.2111 16.9207 41.2798 8.51011 40.4878C0.969436 39.7776 -2.61238 30.731 2.16234 24.9634L6.64183 20.4895C4.45675 18.3158 2.18063 16.3719 1.23235 13.3476C-1.05185 6.06245 5.36827 -1.2796 12.8912 0.189108C14.0649 0.418291 16.5077 1.31958 17.3363 2.14822L21.3074 6.11932ZM33.4286 23.2183L28.7176 27.9293C28.5323 28.1146 27.9605 29.6615 27.8954 30.0035C26.6494 36.5503 36.0277 39.3241 38.5404 33.0863C40.2782 28.7721 36.357 26.4357 33.8675 23.7809C33.6956 23.5976 33.5997 23.3936 33.4286 23.2183ZM14.0793 27.9278L9.36736 23.2158C8.98493 23.4897 8.75031 23.9379 8.45371 24.2528C6.12063 26.7289 3.09927 28.4772 4.0439 32.3714C5.12538 36.8296 10.858 38.0579 13.7683 34.5652C15.1824 32.8684 15.4189 29.7294 14.0793 27.9278Z" fill="#00CFF4" />
                <path d="M30.6122 8.72812C31.0252 8.43988 32.103 8.50462 32.5085 8.79488C33.5706 9.55492 33.8161 10.5661 33.2135 11.6915L22.6675 22.2394L21.3982 24.1054L20.1285 22.239L9.58088 11.689C8.48093 9.91394 10.3558 7.78839 12.2404 8.79253L21.0714 17.6223L21.4569 17.8833L30.6122 8.72812Z" fill="#00CFF4" />
              </svg>
            </div>
            <div>
              <h3
                className="text-[#4A5565] font-normal"
                style={{
                  fontFamily: "Rethink Sans, sans-serif",
                  fontSize: "14px",
                  lineHeight: "20px",
                  letterSpacing: "-0.15px",
                  fontWeight: "bold",
                }}
              >
                Got Questions?
              </h3>
              <p
                className="text-[#4A5565] font-normal mt-0.5"
                style={{
                  fontFamily: "Rethink Sans, sans-serif",
                  fontSize: "14px",
                  lineHeight: "20px",
                  letterSpacing: "-0.15px",
                }}
              >
                Chat with Carrie – AI assistant for instant answers.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onAskCarrie?.()}
            className="w-full py-2.5 px-4 rounded-xl bg-[#00CFF4] hover:bg-[#00b8d8] text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
          style={{ boxShadow: "0 4px 14px rgba(0, 0, 0, 0.25)" }}
          >
            <MessageCircle className="w-4 h-4" />
            Ask Carrie
          </button>
        </div>
    </aside>
  );
};

export default FiltersSidebar;
