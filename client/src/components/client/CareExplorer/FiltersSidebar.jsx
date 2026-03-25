import React, { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { BudgetRangeSlider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";

const careTypes = ["Assisted Living"];

const availability = ["Immediate", "Within 30 Days", "Future Planning"];

const amenities = ["24/7 Care", "Private Rooms", "Therapy Services", "Pet Friendly"];

const FiltersSidebar = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [maxMiles, setMaxMiles] = useState("");
  const [budgetMin, setBudgetMin] = useState(1000);
  const [budgetMax, setBudgetMax] = useState(4500);

  return (
    <aside className="w-full flex flex-col gap-3 sm:gap-5 min-w-0 max-w-full">
      <div className="rounded-xl border border-[#F7F4EF] bg-white p-2.5 sm:p-4 font-['Rethink_Sans'] font-medium" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06), 0 0 0 1px rgba(230,225,215,0.15)" }}>
        <h3 className="hidden lg:block font-semibold text-sm text-[#364153] mb-3">Filters</h3>
        <div className="relative mb-4">
          <Input
            placeholder="Define your search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9 h-10 rounded-lg border-[#E2E8F0]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#364153] hover:text-[#132329]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-xs text-[#20252c] font-bold mb-2">How far are you willing to travel?</p>
        <Input
          id="maxDistance"
          type="text"
          inputMode="numeric"
          placeholder="Max distance (miles)"
          value={maxMiles}
          onChange={(e) => setMaxMiles(e.target.value)}
          className="h-10 rounded-lg border-[#E2E8F0] mb-4"
        />
        <p className="text-xs text-[#20252c] font-bold mb-2">Monthly Budget</p>
        <BudgetRangeSlider
          budgetMin={budgetMin}
          budgetMax={budgetMax}
          min={1000}
          max={15000}
          step={100}
          onRangeChange={(minVal, maxVal) => {
            setBudgetMin(minVal);
            setBudgetMax(maxVal);
          }}
          className="mb-3"
        />
        <div className="flex justify-between gap-2">
          <span className="rounded-lg px-3 py-1.5 text-sm font-semibold text-[#00CFF4] bg-[#00CFF4]/10">
            ${budgetMin.toLocaleString()}
          </span>
          <span className="rounded-lg px-3 py-1.5 text-sm font-semibold text-[#00CFF4] bg-[#00CFF4]/10">
            ${budgetMax.toLocaleString()}
          </span>
        </div>

        <div className="my-4 border-t border-[#E2E8F0]" />

        <h3 className="font-semibold text-sm text-[#132329] mb-3">Care Type</h3>
        <div className="space-y-2.5">
          {careTypes.map((type) => (
            <label
              key={type}
              className="flex items-center gap-2 text-sm text-[#364153] cursor-pointer"
            >
              <Checkbox defaultChecked={type === "Assisted Living"} className="border-[#00CFF4] bg-[#64748b]/10 data-[state=checked]:bg-[#00CFF4] data-[state=checked]:border-[#00CFF4] focus-visible:ring-[#00CFF4]" />
              {type}
            </label>
          ))}
        </div>

        <div className="my-4 border-t border-[#E2E8F0]" />

        <h3 className="font-semibold text-sm text-[#364153] mb-3">Availability</h3>
        <div className="space-y-2.5">
          {availability.map((item) => (
            <label
              key={item}
              className="flex items-center gap-2 text-sm text-[#364153] cursor-pointer"
            >
              <Checkbox defaultChecked={item === "Within 30 Days"} className="border-[#00CFF4] bg-[#64748b]/10 data-[state=checked]:bg-[#00CFF4] data-[state=checked]:border-[#00CFF4] focus-visible:ring-[#00CFF4]" />
              {item}
            </label>
          ))}
        </div>

        <div className="my-4 border-t border-[#E2E8F0]" />

        <h3 className="font-semibold text-sm text-[#364153] mb-3">Must-Have Amenities</h3>
        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-2.5">
          {amenities.map((item) => (
            <label
              key={item}
              className="flex items-center gap-2 text-sm text-[#364153] cursor-pointer"
            >
              <Checkbox className="border-[#00CFF4] bg-[#64748b]/10 data-[state=checked]:bg-[#00CFF4] data-[state=checked]:border-[#00CFF4] focus-visible:ring-[#00CFF4]" />
              {item}
            </label>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            setSearchQuery("");
            setMaxMiles("");
            setBudgetMin(1000);
            setBudgetMax(4500);
          }}
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
