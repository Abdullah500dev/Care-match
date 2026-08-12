import React from "react";
import {
  Heart,
  ArrowRight,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  Globe,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  isAggregatorListingUrl,
  normalizeFacilityWebsite,
} from "@/lib/facilityWebsite";
import { apiClient } from "@/services/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CAREMATCH_PLACEHOLDER_IMAGE = "/assets/images/footer-logo.svg";
const DEFAULT_IMAGE = CAREMATCH_PLACEHOLDER_IMAGE;
const POST_LOGIN_REDIRECT_KEY = "carematch_post_login_redirect";

const isPlaceholderEmail = (value) =>
  /@external\.carematch\.local$/i.test(String(value || "").trim());

/** Show ZIP once — only append when address does not already include it. */
const formatAddressWithZip = (address, zipCode) => {
  let addr = String(address || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s*[·|]\s*/g, ", ");
  const zipFromField = String(zipCode || "").replace(/\D/g, "").slice(0, 5);
  const zipFromAddr = (addr.match(/\b(\d{5})(?:-\d{4})?\b/) || [])[1] || "";
  const zip = zipFromField || zipFromAddr;

  if (zip) {
    const leading = addr.match(new RegExp(`^${zip}\\s+`));
    if (leading && new RegExp(`\\b${zip}\\b`).test(addr.slice(leading[0].length))) {
      addr = addr.slice(leading[0].length).trim();
    }
    const firstIdx = addr.search(new RegExp(`\\b${zip}\\b`));
    if (firstIdx >= 0) {
      let end = firstIdx + 5;
      const after = addr.slice(end);
      const usaMatch = after.match(/^\s*,?\s*USA\b/i);
      if (usaMatch) end += usaMatch[0].length;
      addr = addr.slice(0, end).trim().replace(/[,\s]+$/g, "");
    }
  }

  if (!addr && !zip) return "N/A";
  if (!addr) return zip || "N/A";
  if (!zip) return addr;
  if (new RegExp(`\\b${zip}\\b`).test(addr)) return addr;
  return `${addr}, ${zip}`;
};

const TagList = ({ items = [] }) => {
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
};

const FacilityCard = ({
  facilityId,
  matchPercent = 96,
  category = "ASSISTED LIVING",
  name = "Sunrise Senior Living",
  priceRange = "",
  distance = "2.3 MILES AWAY",
  address = "",
  zipCode = "",
  phone = "",
  email = "",
  imageSrc = DEFAULT_IMAGE,
  imageUrls = [],
  website = "",
  sourcePlatform = "",
  isExternal = true,
  externalSourceUrl = "",
  description = "",
  careLevels = [],
  amenities = [],
  services = [],
  compact = false,
  gridView = false,
  isFavorite = false,
  onToggleFavorite,
}) => {
  const normalizedImageUrls = React.useMemo(() => {
    const list = Array.isArray(imageUrls) ? imageUrls : [];
    const unique = [...new Set(list.map((x) => String(x || "").trim()).filter(Boolean))];
    if (unique.length > 0) return unique;
    return [String(imageSrc || DEFAULT_IMAGE)];
  }, [imageUrls, imageSrc]);
  const [activeImageIndex, setActiveImageIndex] = React.useState(0);
  const [failedImageUrls, setFailedImageUrls] = React.useState(() => new Set());
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const safeImageUrls = React.useMemo(() => {
    const filtered = normalizedImageUrls.filter((url) => !failedImageUrls.has(url));
    return filtered.length > 0 ? filtered : [DEFAULT_IMAGE];
  }, [normalizedImageUrls, failedImageUrls]);
  const rawPrice = String(priceRange || "").trim();
  const displayPriceRange =
    rawPrice &&
    rawPrice.toUpperCase() !== "N/A" &&
    !/^price\s+on\s+call$/i.test(rawPrice)
      ? rawPrice
      : "";
  const hasDisplayPrice = Boolean(displayPriceRange);
  const displayPhone = String(phone || "").trim();
  const displayEmail = String(email || "").trim();
  const hasRealEmail = displayEmail && !isPlaceholderEmail(displayEmail);
  const careLevelList = Array.isArray(careLevels) ? careLevels : [];
  const amenityList = Array.isArray(amenities) ? amenities : [];
  const serviceList = Array.isArray(services) ? services : [];
  const descriptionText = String(description || "").trim();
  React.useEffect(() => {
    setFailedImageUrls(new Set());
    setActiveImageIndex(0);
  }, [normalizedImageUrls]);
  React.useEffect(() => {
    if (activeImageIndex >= safeImageUrls.length) {
      setActiveImageIndex(0);
    }
  }, [activeImageIndex, safeImageUrls.length]);

  const handleImageError = (failedUrl) => {
    const normalizedFailed = String(failedUrl || "").trim();
    if (normalizedFailed && normalizedFailed !== DEFAULT_IMAGE) {
      setFailedImageUrls((prev) => {
        const next = new Set(prev);
        next.add(normalizedFailed);
        return next;
      });
    }
  };
  const showSliderControls = safeImageUrls.length > 1;
  const goPrevImage = () => {
    if (!showSliderControls) return;
    setActiveImageIndex((idx) => (idx - 1 + safeImageUrls.length) % safeImageUrls.length);
  };
  const goNextImage = () => {
    if (!showSliderControls) return;
    setActiveImageIndex((idx) => (idx + 1) % safeImageUrls.length);
  };

  const normalizedWebsite = normalizeFacilityWebsite(website);
  const hasOperatorWebsite = Boolean(normalizedWebsite);
  const listingUrl =
    typeof externalSourceUrl === "string" && /^https?:\/\//i.test(externalSourceUrl.trim())
      ? externalSourceUrl.trim()
      : "";
  const hasListingUrl = Boolean(listingUrl);
  const listingIsAggregator = hasListingUrl && isAggregatorListingUrl(listingUrl);
  // Admin / CareMatch account facilities can open details; scraped/external stay disabled.
  const isOwnedFacility =
    isExternal === false ||
    String(sourcePlatform || "").toLowerCase() === "carematch" ||
    String(facilityId || "").startsWith("owned-");
  const navigate = useNavigate();
  const location = useLocation();
  const isLoggedIn = Boolean(localStorage.getItem("access_token"));

  const requireLoginForFacilityAction = () => {
    if (isLoggedIn) return true;
    try {
      sessionStorage.setItem(
        POST_LOGIN_REDIRECT_KEY,
        JSON.stringify({
          pathname: location.pathname || "/care-explorer",
          search: location.search || "",
          hash: location.hash || "",
          state: location.state,
        }),
      );
    } catch {
      // Ignore storage failures and still route to sign in.
    }
    toast.info("Please sign in to continue", {
      description: "Sign in is required to save data or interact with facilities.",
    });
    navigate("/signin", {
      state: { from: location },
    });
    return false;
  };
  const handleFavoriteClick = () => {
    if (!requireLoginForFacilityAction()) return;
    onToggleFavorite?.(facilityId || name, {
      name,
      category,
      address,
      zipCode,
      phone,
      website,
      priceRange,
      imageSrc,
      imageUrls: safeImageUrls,
      distance,
      sourcePlatform,
      externalSourceUrl,
      isExternal,
      description,
      careLevels: careLevelList,
      amenities: amenityList,
      services: serviceList,
    });
  };
  const resolveFacilitySiteUrl = () => {
    if (hasOperatorWebsite) return normalizedWebsite;
    if (!isExternal && hasListingUrl && !listingIsAggregator) return listingUrl;
    const query = [name, address, zipCode].filter(Boolean).join(" ").trim();
    return `https://www.google.com/search?q=${encodeURIComponent(
      query || `${name} senior living official website`,
    )}`;
  };

  const openContactDestination = () => {
    if (!requireLoginForFacilityAction()) return;

    const destinationUrl = resolveFacilitySiteUrl();

    apiClient
      .post("/api/facilities/explore-click", {
        facilityId: facilityId || "",
        facilityName: name,
        address,
        zipCode,
        phone: String(phone || "").trim() === "N/A" ? "" : phone,
        email: hasRealEmail ? displayEmail : "",
        website: normalizedWebsite || website || "",
        destinationUrl,
        sourcePlatform,
        careType: "Assisted Living",
        category: "Assisted Living",
      })
      .catch(() => {
        // Ignore notify failures so UX is not blocked.
      });
    toast.success("Request sent", {
      description: "We contacted the facility contact to reach out to you.",
    });
  };
  const handleMoreInformationClick = () => {
    if (!isOwnedFacility) return;
    if (!requireLoginForFacilityAction()) return;
    setDetailsOpen(true);
  };

  const moreInfoButtonClass = (size) =>
    size === "grid"
      ? "flex-1 min-w-0 rounded-full border border-[#E2E8F0] bg-white py-1.5 text-center text-[11px] sm:text-[12px] font-medium text-[#132329] transition-colors hover:bg-[#F1F5F9] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-white"
      : `inline-flex min-w-0 flex-1 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-[#132329] transition-colors hover:bg-[#F8FAFC] text-center disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-white ${compact ? "px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm min-h-[36px] sm:min-h-0" : "px-6 py-3 sm:px-10 sm:py-3.5 min-h-[44px] sm:min-h-0"}`;

  const moreInfoButton = (size = "full") => (
    <button
      type="button"
      className={moreInfoButtonClass(size)}
      style={
        size === "grid" || compact
          ? undefined
          : {
              fontFamily: "Rethink Sans, sans-serif",
              fontWeight: 400,
              fontSize: "clamp(14px, 4vw, 18px)",
              lineHeight: "28px",
              letterSpacing: "-0.44px",
            }
      }
      onClick={handleMoreInformationClick}
      disabled={!isOwnedFacility}
      title={
        isOwnedFacility
          ? "View facility details, amenities, and services"
          : "More Information is available after this facility creates a CareMatch account"
      }
    >
      More Information
    </button>
  );

  const detailsDialog = (
    <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto rounded-2xl border-[#E2E8F0] p-0 sm:rounded-2xl">
        <div className="overflow-hidden">
          <div className="h-40 w-full bg-[#F1F5F9] sm:h-48">
            <img
              src={safeImageUrls[0] || DEFAULT_IMAGE}
              alt={name}
              className={`h-full w-full ${
                safeImageUrls[0] === CAREMATCH_PLACEHOLDER_IMAGE ||
                safeImageUrls[0] === DEFAULT_IMAGE
                  ? "object-contain bg-white p-8"
                  : "object-cover"
              }`}
            />
          </div>
          <div className="space-y-5 p-5 sm:p-6">
            <DialogHeader className="space-y-2 text-left">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#155DFC]">
                {category}
              </p>
              <DialogTitle className="text-xl text-[#132329] sm:text-2xl">{name}</DialogTitle>
              <DialogDescription className="text-sm text-[#64748b]">
                Facility details added on CareMatch AI
              </DialogDescription>
            </DialogHeader>

            {(descriptionText || hasDisplayPrice) && (
              <div className="space-y-2">
                {hasDisplayPrice ? (
                  <p className="text-sm font-semibold text-[#132329]">
                    Monthly Price Range: {displayPriceRange}
                  </p>
                ) : null}
                {descriptionText ? (
                  <p className="text-sm leading-relaxed text-[#475569]">{descriptionText}</p>
                ) : null}
              </div>
            )}

            <div className="space-y-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                <div className="min-w-0 flex-1">
                  <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-[#155DFC]" />
                    Address
                  </p>
                  <p className="break-words text-sm text-[#132329]">
                    {formatAddressWithZip(address, zipCode)}
                  </p>
                </div>
                <div className="w-full shrink-0 sm:w-[11.5rem] sm:text-right">
                  <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#64748b] sm:justify-end">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-[#155DFC]" />
                    Phone
                  </p>
                  <p className="break-words text-sm text-[#132329]">
                    {displayPhone && displayPhone !== "N/A" ? displayPhone : "N/A"}
                  </p>
                </div>
              </div>
              {(hasRealEmail || hasOperatorWebsite) && (
                <div className="grid gap-3 border-t border-[#E2E8F0] pt-3 sm:grid-cols-2">
                  {hasRealEmail ? (
                    <div>
                      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
                        <Mail className="h-3.5 w-3.5 text-[#155DFC]" />
                        Email
                      </p>
                      <p className="break-all text-sm text-[#132329]">{displayEmail}</p>
                    </div>
                  ) : null}
                  {hasOperatorWebsite ? (
                    <div>
                      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
                        <Globe className="h-3.5 w-3.5 text-[#155DFC]" />
                        Website
                      </p>
                      <a
                        href={normalizedWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-sm text-[#155DFC] hover:underline"
                      >
                        {normalizedWebsite}
                      </a>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-bold text-[#132329]">Care levels</h4>
              <TagList items={careLevelList.length ? careLevelList : ["Assisted Living"]} />
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-[#132329]">Services</h4>
              <TagList items={serviceList} />
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-[#132329]">Amenities</h4>
              <TagList items={amenityList} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  // Dedicated, simplified card for grid view (4-per-row)
  if (gridView) {
    return (
      <>
        <div className="mx-auto flex h-auto min-h-[305px] w-full max-w-full flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_4px_24px_rgba(15,23,42,0.08)] min-[400px]:min-h-[320px] sm:min-h-[340px]">
          <div className="relative">
            <div className="h-[110px] min-[400px]:h-[120px] sm:h-[125px] md:h-[135px] overflow-hidden">
              <div
                className="flex h-full transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${activeImageIndex * 100}%)` }}
              >
                {safeImageUrls.map((url, idx) => {
                  const usingPlaceholder =
                    url === CAREMATCH_PLACEHOLDER_IMAGE || url === DEFAULT_IMAGE;
                  return (
                    <div key={`${url}-${idx}`} className="h-full w-full shrink-0">
                      <img
                        src={url}
                        alt={`${name} image ${idx + 1}`}
                        onError={() => handleImageError(url)}
                        className={`h-full w-full ${usingPlaceholder ? "object-contain bg-white p-4" : "object-cover"}`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            {showSliderControls && (
              <>
                <button
                  type="button"
                  onClick={goPrevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-1.5 text-white"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={goNextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-1.5 text-white"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            <div className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-full bg-black/70 text-white backdrop-blur-sm px-2.5 py-1 text-[11px] font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00CFF4]" />
              {matchPercent}% Personalized Match
            </div>
            <button
              type="button"
              className="absolute right-3 top-3 flex items-center justify-center rounded-full border border-white/60 bg-white/70 backdrop-blur-sm hover:bg-white/90 transition-colors h-8 w-8"
              aria-label="Save to favorites"
              onClick={handleFavoriteClick}
            >
              <Heart
                className={`stroke-[2] h-4 w-4 ${
                  isFavorite ? "text-red-500 fill-red-500" : "text-[#132329]"
                }`}
              />
            </button>
          </div>

          <div className="flex flex-1 flex-col px-2.5 pt-2.5 pb-2 sm:px-3 sm:pt-3 sm:pb-2">
            <p
              className="mb-0.5 line-clamp-3 text-[9px] min-[400px]:text-[10px] sm:text-[11px] font-semibold tracking-[0.18em] uppercase"
              style={{ color: "#155DFC" }}
            >
              {category}
            </p>
            <h3
              className="mb-1.5 truncate text-[13px] font-semibold tracking-tight text-[#132329] min-[400px]:text-[14px] sm:mb-2 sm:text-[15px]"
              title={name}
            >
              {name}
            </h3>

            {hasDisplayPrice ? (
              <>
                <p className="mb-0.5 text-[9px] sm:text-[10px] font-medium tracking-[0.14em] uppercase text-[#64748b]">
                  Monthly Price Range
                </p>
                <p
                  className="truncate text-[13px] font-semibold text-[#132329] tabular-nums sm:text-sm"
                  title={displayPriceRange}
                >
                  {displayPriceRange}
                </p>
              </>
            ) : null}

            <div className="mt-auto flex gap-2 pt-2 sm:gap-2.5 sm:pt-2.5">
              <button
                type="button"
                onClick={openContactDestination}
                className="flex-1 min-w-0 rounded-full bg-[#0F172A] py-1.5 text-center text-[12px] sm:text-[13px] font-medium text-white transition-colors hover:bg-[#1e293b]"
              >
                Contact
              </button>
              {moreInfoButton("grid")}
            </div>
          </div>
        </div>
        {detailsDialog}
      </>
    );
  }

  return (
    <>
      <div
        className={`flex h-full w-full max-w-full overflow-hidden rounded-2xl bg-white ${compact ? "min-w-0 flex-col" : "flex-col sm:flex-row"}`}
        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}
      >
        <div
          className={`relative w-full flex-shrink-0 ${compact ? "aspect-[4/3] min-h-[180px]" : "sm:w-[33.333%] min-h-[180px] min-[400px]:min-h-[200px] sm:min-h-[220px]"}`}
        >
          <div className="h-full w-full overflow-hidden">
            <div
              className="flex h-full transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${activeImageIndex * 100}%)` }}
            >
              {safeImageUrls.map((url, idx) => {
                const usingPlaceholder =
                  url === CAREMATCH_PLACEHOLDER_IMAGE || url === DEFAULT_IMAGE;
                return (
                  <div key={`${url}-${idx}`} className="h-full w-full shrink-0">
                    <img
                      src={url}
                      alt={`${name} image ${idx + 1}`}
                      onError={() => handleImageError(url)}
                      className={`h-full w-full ${usingPlaceholder ? "object-contain bg-white p-6" : "object-cover"}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          {showSliderControls && (
            <>
              <button
                type="button"
                onClick={goPrevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-1.5 text-white"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={goNextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-1.5 text-white"
                aria-label="Next image"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          <div
            className={`absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 text-white backdrop-blur-sm font-bold ${compact ? "px-2 py-1 text-[11px]" : "px-2.5 py-1 text-[11px] sm:text-xs"}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#00CFF4] shrink-0" />
            {matchPercent}% Personalized Match
          </div>
          <button
            type="button"
            className={`absolute right-3 top-3 flex items-center justify-center rounded-full border border-white/60 bg-white/70 backdrop-blur-sm hover:bg-white/90 transition-colors ${compact ? "h-7 w-7" : "h-9 w-9"}`}
            aria-label="Save to favorites"
            onClick={handleFavoriteClick}
          >
            <Heart
              className={`stroke-[2] ${compact ? "h-3.5 w-3.5" : "h-4 w-4"} ${
                isFavorite ? "text-red-500 fill-red-500" : "text-[#132329]"
              }`}
            />
          </button>
          <div
            className={`absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wide text-white ${compact ? "px-2.5 py-1 text-[9px]" : "px-3 py-1.5 text-[11px]"}`}
            style={{
              backdropFilter: "blur(16px) saturate(1.4)",
              WebkitBackdropFilter: "blur(16px) saturate(1.4)",
              backgroundColor: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.28)",
              boxShadow:
                "0 2px 10px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2)",
              textShadow: "0 1px 4px rgba(0,0,0,0.7), 0 0 8px rgba(0,0,0,0.4)",
            }}
          >
            <MapPin
              className={`text-[#00CFF4] shrink-0 drop-shadow-sm ${compact ? "h-2.5 w-2.5" : "h-3 w-3"}`}
              strokeWidth={2}
            />
            {distance}
          </div>
        </div>

        <div
          className={`flex flex-1 flex-col justify-between bg-white min-w-0 ${compact ? "px-3 py-2.5 sm:px-4 sm:py-3" : "px-4 py-4 sm:px-6 sm:py-5"}`}
        >
          <div
            className={`flex gap-2 sm:gap-3 ${gridView ? "flex-col" : "flex-col sm:flex-row sm:items-start sm:justify-between"}`}
          >
            <div className="min-w-0">
              <p
                className={`font-bold tracking-widest uppercase truncate max-w-full ${compact ? "text-[9px] sm:text-[10px]" : "text-[10px] sm:text-[11px]"}`}
                style={{ color: "#155DFC" }}
              >
                {category}
              </p>
              <h3
                className={`mt-0.5 font-bold text-[#132329] ${gridView ? "truncate" : "break-words"} ${compact ? "text-sm sm:text-base" : "mt-1 text-lg sm:text-xl"}`}
                title={name}
              >
                {name}
              </h3>
            </div>
            {hasDisplayPrice ? (
              <div
                className={`rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] ${gridView ? "w-full shrink-0 text-left" : "flex-shrink-0 text-left sm:text-right w-fit sm:w-auto"} ${compact ? "px-2 py-1.5 sm:px-3 sm:py-2" : "px-3 py-2 sm:px-4 sm:py-2.5"}`}
              >
                <p className="text-[10px] font-bold tracking-wider text-[#64748b] uppercase">
                  MONTHLY PRICE RANGE
                </p>
                <p
                  className={`font-bold text-[#132329] ${compact ? "mt-0.5 text-xs sm:text-sm" : "mt-0.5 text-sm sm:text-base"}`}
                >
                  {displayPriceRange}
                </p>
              </div>
            ) : null}
          </div>

          {!gridView && (
            <div
              className={`overflow-hidden ${compact ? "mt-2 rounded-xl px-2.5 py-2 sm:px-3 sm:py-2.5" : "mt-3 sm:mt-4 rounded-2xl sm:rounded-3xl px-3 py-2.5 sm:px-4 sm:py-3"}`}
              style={{
                background:
                  "linear-gradient(135deg, rgba(248,250,252,0.94), rgba(241,245,249,0.9))",
                borderRadius: "16px",
                border: "1px solid #E2E8F0",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.65)",
              }}
            >
              <p
                className={`font-bold tracking-wider text-[#64748b] uppercase ${compact ? "text-[9px] sm:text-[10px] mb-1.5" : "text-[10px] sm:text-[11px] mb-2"}`}
              >
                Contact Details
              </p>

              <div
                className={`grid grid-cols-1 min-[390px]:grid-cols-2 gap-2 ${compact ? "text-[10px] sm:text-xs" : "text-xs sm:text-sm"}`}
              >
                <div className="min-w-0 rounded-xl border border-[#E2E8F0] bg-white/85 px-2.5 py-2">
                  <p className="flex items-center gap-1.5 font-semibold text-[#64748b] uppercase tracking-wide text-[10px]">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-[#155DFC]" />
                    Address
                  </p>
                  <p className="mt-1 break-words font-medium text-[#132329]">
                    {formatAddressWithZip(address, zipCode)}
                  </p>
                </div>

                <div className="min-w-0 rounded-xl border border-[#E2E8F0] bg-white/85 px-2.5 py-2">
                  <p className="flex items-center gap-1.5 font-semibold text-[#64748b] uppercase tracking-wide text-[10px]">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-[#155DFC]" />
                    Phone
                  </p>
                  <p className="mt-1 break-words font-medium text-[#132329]">
                    {displayPhone && displayPhone !== "N/A" ? displayPhone : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div
            className={`flex flex-col sm:flex-row flex-wrap ${compact ? "mt-2 gap-2 sm:gap-3" : "mt-4 sm:mt-5 gap-3 sm:gap-4"}`}
          >
            <button
              type="button"
              onClick={openContactDestination}
              className={`inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#0F172A] text-white transition-colors hover:bg-[#1e293b] text-center ${compact ? "px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm min-h-[36px] sm:min-h-0" : "px-6 py-3 sm:px-10 sm:py-3.5 min-h-[44px] sm:min-h-0"}`}
              style={
                compact
                  ? {}
                  : {
                      fontFamily: "Rethink Sans, sans-serif",
                      fontWeight: 400,
                      fontSize: "clamp(14px, 4vw, 18px)",
                      lineHeight: "28px",
                      letterSpacing: "-0.44px",
                    }
              }
            >
              Contact{" "}
              <ArrowRight
                className={`shrink-0 ${compact ? "h-3.5 w-3.5" : "h-4 w-4"}`}
              />
            </button>
            {moreInfoButton("full")}
          </div>
        </div>
      </div>
      {detailsDialog}
    </>
  );
};

export default FacilityCard;
