import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Mic } from "lucide-react";

export default function SearchBar() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleSearch = () => {
    navigate("/find-care");
  };

  return (
    <div className="mx-auto mt-6 w-full max-w-4xl sm:mt-8 lg:mt-10 min-[1280px]:mt-8 min-[1280px]:max-w-3xl min-[1536px]:mt-10 min-[1536px]:max-w-4xl">
      <div
        className="rounded-2xl p-[2px] shadow-sm min-[1280px]:rounded-3xl"
        style={{
          background: "linear-gradient(90deg, #00CFF4, #FECACB, #FCFCFC, #00CFF4, #00CFF4)",
          backgroundSize: "300% 100%",
          animation: "gradientShift 6s ease-in-out infinite",
        }}
      >
        <div className="flex min-h-44 flex-col justify-between rounded-[14px] bg-white p-4 sm:min-h-48 sm:p-5 md:min-h-52 md:p-6 min-[1280px]:min-h-48 min-[1280px]:rounded-[22px] min-[1280px]:p-5 min-[1536px]:min-h-52 min-[1536px]:p-6">
          <div className="flex items-center gap-2 rounded-lg">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try: 'Looking for memory care in Los Angeles under $6000/month'"
              className="min-w-0 flex-1 rounded-lg bg-transparent text-[#132329] placeholder:italic placeholder:text-[#0000004D] focus:outline-none text-sm placeholder:text-base sm:text-base sm:placeholder:text-lg min-[1280px]:text-base min-[1280px]:placeholder:text-base min-[1536px]:text-lg min-[1536px]:placeholder:text-lg"
            />
            <Mic className="h-4 w-4 shrink-0 text-[#132329] sm:h-5 sm:w-5 min-[1280px]:h-4 min-[1280px]:w-4 min-[1536px]:h-5 min-[1536px]:w-5" strokeWidth={2} aria-hidden />
          </div>

          <div className="mt-2 flex items-center justify-end gap-2">
            <button className="flex items-center gap-2 rounded-lg bg-[#132329] px-3 py-3.5 text-white font-medium hover:opacity-90 text-sm sm:rounded-xl sm:px-4 sm:py-4 sm:text-base min-[1280px]:rounded-xl min-[1280px]:px-4 min-[1280px]:py-4 min-[1536px]:py-5">
              <span className="whitespace-nowrap">Carrie – AI Advisor</span>
            </button>

            <button
              className="flex items-center justify-center rounded-lg bg-[#00CFF4] px-3 py-3.5 text-white hover:opacity-90 sm:rounded-xl sm:px-4 sm:py-4 min-[1536px]:py-5 min-[1536px]:px-5"
              aria-label="Search"
              onClick={handleSearch}
            >
              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Subtext */}
      <p className="mt-3 text-center text-sm font-medium italic text-[#132329B2] sm:mt-4 sm:text-base min-[1280px]:mt-4 min-[1280px]:text-sm min-[1536px]:text-base">
        Verified Communities, 100% Free Service, Expert Guidance
      </p>

      <div className="mt-4 flex justify-center sm:mt-5">
        <button
          type="button"
          onClick={handleSearch}
          className="rounded-xl px-5 py-3.5 text-sm font-semibold text-white transition hover:opacity-90 sm:px-6 sm:py-4 sm:text-base"
          style={{ backgroundColor: "#00ccf4" }}
        >
          Find the Facilities
        </button>
      </div>

      <style jsx global>{`
        @keyframes gradientShift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
      `}</style>
    </div>
  );
}