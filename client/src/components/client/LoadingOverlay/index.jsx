import React from "react";
import { Compass, MapPin, Search, SlidersHorizontal } from "lucide-react";

const DEFAULT_STEPS = [
  "Matching care needs...",
  "Checking availability...",
  "Calculating match scores...",
];

export default function LoadingOverlay({
  open = false,
  title = "Finding Your Matches...",
  subtitle = "Reviewing care preferences",
  steps = DEFAULT_STEPS,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-white/70 px-4 py-10 backdrop-blur-sm">
      <div
        className="w-full max-w-lg rounded-3xl border border-[#E2E8F0] bg-white px-8 py-10 text-center shadow-xl sm:px-10 sm:py-12"
        style={{
          boxShadow:
            "0px 4px 6px -1px rgba(0,0,0,0.08), 0px 2px 4px -2px rgba(0,0,0,0.06)",
        }}
      >
        <div className="relative mb-8 flex h-24 items-center justify-center">
          <div className="absolute flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e0f7fb] text-[#00CFF4] animate-pulse">
            <img
              src="/assets/images/favicon/favicon.svg"
              alt="CareMatch"
              className="h-9 w-9 object-contain"
            />
          </div>
          <div
            className="absolute -top-1 -left-2 flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#00CFF4]/80 bg-white text-[#00CFF4] animate-icon-float-strong shadow-[0_0_0_0_rgba(0,207,244,0.45)] animate-icon-ripple"
            style={{ animationDelay: "0ms" }}
          >
            <Search className="h-4 w-4" />
          </div>
          <div
            className="absolute -top-1 -right-2 flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#38BDF8]/80 bg-white text-[#0EA5E9] animate-icon-bounce-strong shadow-[0_0_16px_rgba(56,189,248,0.35)]"
            style={{ animationDelay: "100ms" }}
          >
            <MapPin className="h-4 w-4" />
          </div>
          <div
            className="absolute -bottom-1 -right-2 flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#22D3EE]/80 bg-white text-[#0891B2] animate-icon-spin-strong shadow-[0_0_16px_rgba(34,211,238,0.35)]"
            style={{ animationDelay: "180ms" }}
          >
            <Compass className="h-4 w-4" />
          </div>
          <div
            className="absolute -bottom-1 -left-2 flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#2DD4BF]/80 bg-white text-[#0F766E] animate-icon-wobble shadow-[0_0_14px_rgba(45,212,191,0.35)]"
            style={{ animationDelay: "260ms" }}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </div>
        </div>
        <h1 className="mb-3 text-2xl font-bold italic text-[#1D293D] sm:text-3xl">
          {title}
        </h1>
        <p className="mx-auto mb-6 max-w-sm text-base text-[#64748b]">
          {subtitle}
        </p>
        <ul className="mx-auto max-w-xs space-y-2 text-left text-[#334155]">
          {(Array.isArray(steps) ? steps : DEFAULT_STEPS).map((step) => (
            <li key={step} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#00CFF4]" aria-hidden />
              {step}
            </li>
          ))}
        </ul>
        <div className="mt-7 flex items-center justify-center gap-2 text-sm text-slate-600">
          <span className="h-4 w-4 rounded-full border-2 border-[#94a3b8]/40 border-t-[#00CFF4] animate-spin" />
          Please wait
        </div>
      </div>
      <style jsx global>{`
        @keyframes careExplorerIconFloatStrong {
          0%, 100% {
            transform: translateY(0px) translateX(0px) scale(1);
          }
          25% {
            transform: translateY(-6px) translateX(2px) scale(1.05);
          }
          50% {
            transform: translateY(-2px) translateX(5px) scale(1.1);
          }
          75% {
            transform: translateY(4px) translateX(-1px) scale(1.03);
          }
        }

        @keyframes careExplorerIconBounceStrong {
          0%, 100% {
            transform: translateY(0px) scale(1);
          }
          20% {
            transform: translateY(-7px) scale(1.06);
          }
          40% {
            transform: translateY(1px) scale(0.98);
          }
          60% {
            transform: translateY(-4px) scale(1.04);
          }
          80% {
            transform: translateY(0px) scale(1);
          }
        }

        @keyframes careExplorerIconSpinStrong {
          0% {
            transform: rotate(0deg) scale(1);
          }
          40% {
            transform: rotate(160deg) scale(1.08);
          }
          70% {
            transform: rotate(280deg) scale(1.02);
          }
          100% {
            transform: rotate(360deg) scale(1);
          }
        }

        @keyframes careExplorerIconWobble {
          0%, 100% {
            transform: rotate(0deg) translateY(0px) scale(1);
          }
          15% {
            transform: rotate(-12deg) translateY(-2px) scale(1.05);
          }
          30% {
            transform: rotate(10deg) translateY(2px) scale(1.02);
          }
          45% {
            transform: rotate(-8deg) translateY(-1px) scale(1.06);
          }
          60% {
            transform: rotate(6deg) translateY(2px) scale(1.03);
          }
          75% {
            transform: rotate(-4deg) translateY(-1px) scale(1.01);
          }
        }

        @keyframes careExplorerIconRipple {
          0% {
            box-shadow: 0 0 0 0 rgba(0, 207, 244, 0.45);
          }
          70% {
            box-shadow: 0 0 0 14px rgba(0, 207, 244, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(0, 207, 244, 0);
          }
        }

        .animate-icon-float-strong {
          animation: careExplorerIconFloatStrong 1.45s ease-in-out infinite;
          will-change: transform;
        }

        .animate-icon-bounce-strong {
          animation: careExplorerIconBounceStrong 1.2s ease-in-out infinite;
          will-change: transform;
        }

        .animate-icon-spin-strong {
          animation: careExplorerIconSpinStrong 1.3s linear infinite;
          will-change: transform;
        }

        .animate-icon-wobble {
          animation: careExplorerIconWobble 1.1s ease-in-out infinite;
          will-change: transform;
        }

        .animate-icon-ripple {
          animation:
            careExplorerIconFloatStrong 1.45s ease-in-out infinite,
            careExplorerIconRipple 1.7s ease-out infinite;
          will-change: transform, box-shadow;
        }
      `}</style>
    </div>
  );
}
