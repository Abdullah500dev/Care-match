import React, { useEffect, useMemo, useState } from "react";
import { Hospital, MapPin, Phone } from "lucide-react";
import { useLocation, useSearchParams } from "react-router-dom";
import SEO from "@/components/common/SEO";
import SnfInfoDialog from "@/components/snf/SnfInfoDialog";
import { apiClient } from "@/services/api";
import { resolveSnfImageUrl } from "@/lib/snfReferral";
import { toast } from "sonner";

const PLACEHOLDER_IMAGE = "/assets/images/footer-logo.svg";

export default function UserDashboardSnfs() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(location.state?.partner || null);

  const openId = String(searchParams.get("open") || "").trim();

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await apiClient.get("/api/snf-partners/my-scans");
        setPartners(Array.isArray(data?.partners) ? data.partners : []);
      } catch {
        toast.error("Failed to load scanned SNFs.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!openId || loading) return;
    const match = partners.find((item) => String(item.id) === openId);
    if (match) setSelected(match);
  }, [loading, openId, partners]);

  const countLabel = useMemo(() => {
    if (loading) return "Loading…";
    return `${partners.length} scanned ${partners.length === 1 ? "SNF" : "SNFs"}`;
  }, [loading, partners.length]);

  const openPartner = (partner) => {
    setSelected(partner);
    if (partner?.id) {
      setSearchParams({ open: String(partner.id) }, { replace: true });
    }
  };

  const handleDialogChange = (open) => {
    if (open) return;
    setSelected(null);
    if (openId) setSearchParams({}, { replace: true });
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <SEO title="Scanned SNFs – CareMatch AI" />
      <div>
        <h1 className="text-2xl font-bold text-slate-900">SNF</h1>
        <p className="mt-1 text-sm text-slate-500">
          Skilled nursing partners you opened from a referral QR or copied link. {countLabel}.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl border border-[#E2E8F0] bg-white" />
          ))}
        </div>
      ) : partners.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Hospital className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="font-medium text-slate-500">No scanned SNFs yet.</p>
          <p className="mt-1 text-sm text-slate-400">
            Scan a partner QR code or open a copied referral link, then sign in to save it here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {partners.map((partner) => {
            const imgSrc = resolveSnfImageUrl(partner.images?.[0]) || PLACEHOLDER_IMAGE;
            const isPlaceholder = imgSrc === PLACEHOLDER_IMAGE;
            return (
              <button
                key={partner.id}
                type="button"
                onClick={() => openPartner(partner)}
                className="flex flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white text-left shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative h-40 flex-shrink-0">
                  <img
                    src={imgSrc}
                    alt={partner.name}
                    onError={(e) => {
                      e.currentTarget.src = PLACEHOLDER_IMAGE;
                    }}
                    className={`h-full w-full ${isPlaceholder ? "object-contain bg-white p-6" : "object-cover"}`}
                  />
                  {partner.scannedAt ? (
                    <div className="absolute bottom-2 left-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm">
                      Scanned{" "}
                      {new Date(partner.scannedAt).toLocaleDateString("en-US", {
                        timeZone: "America/New_York",
                      })}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <p className="truncate text-[10px] font-bold uppercase tracking-widest text-[#00B8DB]">
                    {partner.partnershipType || "Skilled Nursing"}
                  </p>
                  <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-[#132329]">
                    {partner.name || "Unknown SNF"}
                  </h3>
                  {partner.address ? (
                    <div className="flex items-start gap-1.5 text-xs text-[#64748b]">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#00B8DB]" />
                      <span className="line-clamp-2">{partner.address}</span>
                    </div>
                  ) : null}
                  {partner.phone ? (
                    <div className="flex items-center gap-1.5 text-xs text-[#64748b]">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-[#00B8DB]" />
                      <span>{partner.phone}</span>
                    </div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <SnfInfoDialog
        open={Boolean(selected)}
        onOpenChange={handleDialogChange}
        partner={selected}
      />
    </div>
  );
}
