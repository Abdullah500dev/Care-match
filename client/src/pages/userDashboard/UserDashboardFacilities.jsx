import React, { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import SEO from "@/components/common/SEO";
import FacilityCard from "@/components/client/CareExplorer/FacilityCard";
import { apiClient } from "@/services/api";
import { savedFacilityToCardProps } from "@/lib/savedFacilityCard";
import { toast } from "sonner";

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

  const handleToggleFavorite = async (facilityId, facilityData) => {
    const safeId = String(facilityId || "").trim();
    if (!safeId) return;

    setSavedIds((prev) => prev.filter((id) => id !== safeId));
    setFacilities((prev) => prev.filter((f) => String(f.facilityId || "") !== safeId));

    try {
      await apiClient.post("/api/auth/toggle-favorite", {
        facilityId: safeId,
        facilityData: facilityData || null,
      });
    } catch {
      toast.error("Failed to remove facility.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <SEO title="Saved Facilities – CareMatch AI" />
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Saved Facilities</h1>
        <p className="mt-1 text-sm text-slate-500">
          {loading
            ? "Loading…"
            : `${facilities.length} saved ${facilities.length === 1 ? "facility" : "facilities"}`}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-2xl border border-[#E2E8F0] bg-white"
            />
          ))}
        </div>
      ) : facilities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Heart className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="font-medium text-slate-500">No saved facilities yet.</p>
          <p className="mt-1 text-sm text-slate-400">
            Heart a facility in Care Explorer to save it here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {facilities.map((f) => {
            const cardProps = savedFacilityToCardProps(f);
            const id = String(f.facilityId || cardProps.facilityId || "");

            return (
              <div key={id || f.name} className="min-w-0">
                <FacilityCard
                  {...cardProps}
                  compact
                  gridView
                  isFavorite
                  onToggleFavorite={handleToggleFavorite}
                />
                {f.savedAt && (
                  <p className="mt-2 text-center text-[10px] text-slate-400">
                    Saved{" "}
                    {new Date(f.savedAt).toLocaleDateString("en-US", {
                      timeZone: "America/New_York",
                    })}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
