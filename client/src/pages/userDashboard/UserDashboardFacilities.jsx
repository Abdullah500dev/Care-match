import React, { useEffect, useState } from "react";
import { Heart, MapPin, Phone, ExternalLink, Star } from "lucide-react";
import SEO from "@/components/common/SEO";
import { apiClient } from "@/services/api";
import { toast } from "sonner";

const PLACEHOLDER_IMAGE = "/assets/images/footer-logo.svg";

export default function UserDashboardFacilities() {
  const [facilities, setFacilities] = useState([]);
  const [savedIds, setSavedIds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const { data } = await apiClient.get("/api/auth/favorites");
        if (data.success) {
          setSavedIds((data.favorites || []).map(String));
          setFacilities(Array.isArray(data.facilityDetails) ? data.facilityDetails : []);
        }
      } catch {
        toast.error("Failed to load saved facilities.");
      } finally {
        setLoading(false);
      }
    };
    fetchFavorites();
  }, []);

  const handleRemove = async (facilityId) => {
    const safeId = String(facilityId || "").trim();
    setSavedIds((prev) => prev.filter((id) => id !== safeId));
    setFacilities((prev) => prev.filter((f) => String(f.facilityId || "") !== safeId));
    try {
      await apiClient.post("/api/auth/toggle-favorite", { facilityId: safeId });
    } catch {
      toast.error("Failed to remove facility.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <SEO title="Saved Facilities – CareMatch AI" />
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Saved Facilities</h1>
        <p className="text-slate-500 text-sm mt-1">
          {loading ? "Loading…" : `${facilities.length} saved ${facilities.length === 1 ? "facility" : "facilities"}`}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-[#E2E8F0] bg-white animate-pulse h-64" />
          ))}
        </div>
      ) : facilities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Heart className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-slate-500 font-medium">No saved facilities yet.</p>
          <p className="text-slate-400 text-sm mt-1">
            Heart a facility in Care Explorer to save it here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {facilities.map((f) => {
            const id = String(f.facilityId || "");
            const imgSrc = f.imageSrc || PLACEHOLDER_IMAGE;
            const isPlaceholder = imgSrc === PLACEHOLDER_IMAGE;
            const hasWebsite = typeof f.website === "string" && /^https?:\/\//i.test(f.website);
            const rating = Number(f.rating);
            const hasRating = Number.isFinite(rating) && rating > 0;

            return (
              <div
                key={id || f.name}
                className="rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col"
              >
                <div className="relative h-40 flex-shrink-0">
                  <img
                    src={imgSrc}
                    alt={f.name}
                    onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMAGE; }}
                    className={`h-full w-full ${isPlaceholder ? "object-contain bg-white p-6" : "object-cover"}`}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemove(id)}
                    className="absolute right-3 top-3 flex items-center justify-center rounded-full border border-white/60 bg-white/80 backdrop-blur-sm hover:bg-white transition-colors h-8 w-8"
                    aria-label="Remove from saved"
                  >
                    <Heart className="h-4 w-4 text-red-500 fill-red-500 stroke-[2]" />
                  </button>
                  {f.savedAt && (
                    <div className="absolute bottom-2 left-2 rounded-full bg-black/50 text-white text-[10px] px-2 py-0.5 backdrop-blur-sm">
                      Saved {new Date(f.savedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div className="flex flex-col flex-1 p-4 gap-2">
                  {f.category && (
                    <p className="text-[10px] font-bold tracking-widest uppercase text-[#155DFC] truncate">
                      {f.category}
                    </p>
                  )}
                  <h3 className="font-semibold text-[#132329] text-sm leading-tight line-clamp-2">
                    {f.name || "Unknown Facility"}
                  </h3>

                  {hasRating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-[#FBBF24] text-[#FBBF24]" />
                      <span className="text-xs font-semibold text-[#132329]">{rating}</span>
                      {f.reviewCount > 0 && (
                        <span className="text-xs text-[#64748b]">({f.reviewCount})</span>
                      )}
                    </div>
                  )}

                  {f.priceRange && String(f.priceRange).trim().toUpperCase() !== "N/A" && (
                    <p className="text-xs font-semibold text-[#132329]">{f.priceRange}</p>
                  )}

                  {f.address && (
                    <div className="flex items-start gap-1.5 text-xs text-[#64748b]">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[#155DFC]" />
                      <span className="line-clamp-2">{f.address}</span>
                    </div>
                  )}

                  {f.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-[#64748b]">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-[#155DFC]" />
                      <span>{f.phone}</span>
                    </div>
                  )}

                  <div className="mt-auto pt-2 flex gap-2">
                    {hasWebsite && (
                      <a
                        href={f.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0F172A] text-white text-xs font-medium py-2 px-3 hover:bg-[#1e293b] transition-colors"
                      >
                        Explore <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemove(id)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white text-xs font-medium py-2 px-3 text-[#64748b] hover:bg-[#F8FAFC] transition-colors"
                    >
                      <Heart className="h-3.5 w-3.5 text-red-400" />
                      Unsave
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

