import React, { useMemo } from "react";
import { Globe, Mail, MapPin, Phone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { resolveSnfImageUrl } from "@/lib/snfReferral";

const PLACEHOLDER_IMAGE = "/assets/images/footer-logo.svg";

function TagList({ items = [] }) {
  const list = (Array.isArray(items) ? items : [])
    .map((item) => String(item || "").trim())
    .filter(Boolean);
  if (list.length === 0) {
    return <p className="text-sm text-[#94A3B8]">Not listed</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map((item) => (
        <span
          key={item}
          className="rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1 text-xs font-medium text-[#334155]"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export default function SnfInfoDialog({ open, onOpenChange, partner }) {
  const imageUrl = useMemo(() => {
    const first = Array.isArray(partner?.images) ? partner.images[0] : "";
    return resolveSnfImageUrl(first) || PLACEHOLDER_IMAGE;
  }, [partner]);
  const isPlaceholder = imageUrl === PLACEHOLDER_IMAGE;
  const website = String(partner?.website || "").trim();
  const hasWebsite = /^https?:\/\//i.test(website);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto rounded-2xl border-[#E2E8F0] p-0 sm:rounded-2xl">
        <div className="overflow-hidden">
          <div className="h-40 w-full bg-[#F1F5F9] sm:h-48">
            <img
              src={imageUrl}
              alt={partner?.name || "SNF"}
              className={`h-full w-full ${isPlaceholder ? "object-contain bg-white p-8" : "object-cover"}`}
            />
          </div>
          <div className="space-y-5 p-5 sm:p-6">
            <DialogHeader className="space-y-2 text-left">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#00B8DB]">
                {partner?.partnershipType || "Skilled Nursing"}
              </p>
              <DialogTitle className="text-xl text-[#132329] sm:text-2xl">
                {partner?.name || "SNF partner"}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-[#64748b]">
                Welcome to CareMatch! The easy solution to find Assisted Living Facilities for you
                or your loved one! It looks like you found us as a referral from{" "}
                {partner?.name || "a partner facility"}. Welcome!
              </DialogDescription>
            </DialogHeader>

            {partner?.pricing ? (
              <p className="text-sm font-semibold text-[#132329]">{partner.pricing}</p>
            ) : null}

            <div className="space-y-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                <div className="min-w-0 flex-1">
                  <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-[#00B8DB]" />
                    Address
                  </p>
                  <p className="break-words text-sm text-[#132329]">
                    {[partner?.address, partner?.zip_code].filter(Boolean).join(", ") || "N/A"}
                  </p>
                </div>
                <div className="w-full shrink-0 sm:w-[11.5rem] sm:text-right">
                  <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#64748b] sm:justify-end">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-[#00B8DB]" />
                    Phone
                  </p>
                  <p className="break-words text-sm text-[#132329]">{partner?.phone || "N/A"}</p>
                </div>
              </div>
              {(partner?.email || hasWebsite) && (
                <div className="grid gap-3 border-t border-[#E2E8F0] pt-3 sm:grid-cols-2">
                  {partner?.email ? (
                    <div>
                      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
                        <Mail className="h-3.5 w-3.5 text-[#00B8DB]" />
                        Email
                      </p>
                      <p className="break-all text-sm text-[#132329]">{partner.email}</p>
                    </div>
                  ) : null}
                  {hasWebsite ? (
                    <div>
                      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
                        <Globe className="h-3.5 w-3.5 text-[#00B8DB]" />
                        Website
                      </p>
                      <a
                        href={website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-sm text-[#00B8DB] hover:underline"
                      >
                        {website}
                      </a>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-bold text-[#132329]">Care levels</h4>
              <TagList items={partner?.care_levels} />
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-[#132329]">Services</h4>
              <TagList items={partner?.services} />
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-[#132329]">Amenities</h4>
              <TagList items={partner?.amenities} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
