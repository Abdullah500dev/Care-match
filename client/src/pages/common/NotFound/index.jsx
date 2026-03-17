import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Home, Search, ArrowLeft } from "lucide-react";
import SEO from "../../../components/common/SEO";

const STAGGER_MS = 100;

export default function NotFound() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(() => setMounted(true));
    });
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <div
      className="relative flex min-h-[calc(100vh-14rem)] flex-col items-center justify-center overflow-hidden px-4 py-12"
      style={{
        background: "linear-gradient(135deg, #E0F7FB 0%, #F0FBFF 25%, #ffffff 50%, #E0F7FB 75%, #F0FBFF 100%)",
        backgroundSize: "200% 200%",
        animation: "notfound-gradient-shift 12s ease infinite",
      }}
    >
      <SEO title="Page Not Found - CareMatch AI" />

      {/* Decorative blobs – theme: teal #00CFF4, dark #0A122C / #132329 */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div
          className="absolute top-[15%] left-[10%] w-64 h-64 rounded-full bg-[#00CFF4]/15 animate-[notfound-blob_12s_ease-in-out_infinite]"
          style={{ animationDelay: "0s" }}
        />
        <div
          className="absolute bottom-[20%] right-[8%] w-48 h-48 rounded-full bg-[#0A122C]/[0.06] animate-[notfound-blob_14s_ease-in-out_infinite]"
          style={{ animationDelay: "-3s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-[#00CFF4]/[0.08] animate-[notfound-blob_18s_ease-in-out_infinite]"
          style={{ animationDelay: "-6s" }}
        />
        <div
          className="absolute top-[25%] right-[15%] w-32 h-32 rounded-full bg-[#00CFF4]/10 animate-[notfound-float-alt_8s_ease-in-out_infinite]"
          style={{ animationDelay: "-2s" }}
        />
        <div
          className="absolute bottom-[30%] left-[12%] w-40 h-40 rounded-full bg-[#132329]/[0.05] animate-[notfound-float-alt_10s_ease-in-out_infinite]"
          style={{ animationDelay: "-5s" }}
        />
        <div
          className="absolute top-[60%] right-[25%] w-20 h-20 rounded-full border-2 border-[#00CFF4]/25 animate-[notfound-rotate-slow_20s_linear_infinite]"
          style={{ animationDelay: "0s" }}
        />
      </div>

      <div className="relative z-10 max-w-lg w-full text-center">
        {/* 404 – theme teal #00CFF4 to match header / Facilities / Carrie */}
        <div
          className="inline-flex justify-center animate-[notfound-pulse-soft_3s_ease-in-out_infinite]"
          style={{
            textShadow: "0 4px 40px rgba(0, 207, 244, 0.25), 0 0 80px rgba(0, 207, 244, 0.12)",
          }}
        >
          <span
            className="text-8xl sm:text-[10rem] font-bold select-none leading-none text-[#00CFF4] animate-[notfound-float_4s_ease-in-out_infinite] inline-block"
            style={{ animationDelay: "0s" }}
          >
            4
          </span>
          <span
            className="text-8xl sm:text-[10rem] font-bold select-none leading-none text-[#00CFF4] animate-[notfound-float_4s_ease-in-out_infinite] inline-block"
            style={{ animationDelay: "0.2s" }}
          >
            0
          </span>
          <span
            className="text-8xl sm:text-[10rem] font-bold select-none leading-none text-[#00CFF4] animate-[notfound-float_4s_ease-in-out_infinite] inline-block"
            style={{ animationDelay: "0.4s" }}
          >
            4
          </span>
        </div>

        <h1
          className="text-xl sm:text-2xl font-bold text-[#132329] mt-4 opacity-0"
          style={{
            animation: mounted ? "notfound-slide-up 0.5s ease-out forwards" : "none",
          }}
        >
          Page not found
        </h1>
        <p
          className="text-[#64748b] mt-2 text-sm sm:text-base opacity-0"
          style={{
            animation: mounted ? "notfound-slide-up 0.5s ease-out forwards" : "none",
            animationDelay: `${STAGGER_MS}ms`,
          }}
        >
          The page you’re looking for doesn’t exist or may have been moved.
        </p>
        <div
          className="flex flex-col sm:flex-row gap-3 justify-center mt-8 opacity-0"
          style={{
            animation: mounted ? "notfound-slide-up 0.5s ease-out forwards" : "none",
            animationDelay: `${STAGGER_MS * 2}ms`,
          }}
        >
          <Link
            to="/"
            className="group inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#00CFF4] text-white font-semibold shadow-lg shadow-[#00CFF4]/30 hover:bg-[#00b8d8] hover:shadow-[#00CFF4]/40 transition-all duration-300 hover:scale-[1.05] active:scale-[0.98]"
          >
            <Home className="h-4 w-4 group-hover:animate-[notfound-icon-bounce_0.6s_ease-in-out_infinite]" />
            Back to Home
          </Link>
          <Link
            to="/find-care"
            className="group inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-[#00CFF4] text-[#00CFF4] font-semibold bg-white/80 hover:bg-[#F0FBFF] transition-all duration-300 hover:scale-[1.05] active:scale-[0.98]"
          >
            <Search className="h-4 w-4 group-hover:animate-[notfound-icon-bounce_0.6s_ease-in-out_infinite]" />
            Find Care
          </Link>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="group inline-flex items-center gap-1.5 mt-6 text-sm text-[#64748b] hover:text-[#132329] transition-all duration-200 opacity-0 hover:gap-2"
          style={{
            animation: mounted ? "notfound-slide-up 0.5s ease-out forwards" : "none",
            animationDelay: `${STAGGER_MS * 3}ms`,
          }}
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform duration-200" />
          Go back
        </button>
      </div>
    </div>
  );
}
