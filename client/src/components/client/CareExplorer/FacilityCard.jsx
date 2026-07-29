import React from "react";
import { Heart, Star, ArrowRight, MapPin, Hash, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  isAggregatorListingUrl,
  normalizeFacilityWebsite,
} from "@/lib/facilityWebsite";
import { apiClient } from "@/services/api";

const CAREMATCH_PLACEHOLDER_IMAGE = "/assets/images/footer-logo.svg";
const DEFAULT_IMAGE = CAREMATCH_PLACEHOLDER_IMAGE;
const POST_LOGIN_REDIRECT_KEY = "carematch_post_login_redirect";

const FacilityCard = ({
  facilityId,
  matchPercent = 96,
  category = "ASSISTED LIVING",
  name = "Sunrise Senior Living",
  rating = 4.8,
  reviewCount = 127,
  ratingLabel = "family reviews",
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
  isExternal = false,
  externalSourceUrl = "",
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
  const safeImageUrls = React.useMemo(() => {
    const filtered = normalizedImageUrls.filter((url) => !failedImageUrls.has(url));
    return filtered.length > 0 ? filtered : [DEFAULT_IMAGE];
  }, [normalizedImageUrls, failedImageUrls]);
  const hasReviewCount = Number.isFinite(Number(reviewCount)) && Number(reviewCount) > 0;
  const ratingMetaText = hasReviewCount ? `${reviewCount} ${ratingLabel}` : ratingLabel;
  const rawPrice = String(priceRange || "").trim();
  const displayPriceRange =
    rawPrice &&
    rawPrice.toUpperCase() !== "N/A" &&
    !/^price\s+on\s+call$/i.test(rawPrice)
      ? rawPrice
      : "";
  const hasDisplayPrice = Boolean(displayPriceRange);
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
      rating,
      reviewCount,
      imageSrc,
      imageUrls: safeImageUrls,
      distance,
      sourcePlatform,
      externalSourceUrl,
      isExternal,
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

  const openExploreDestination = () => {
    if (!requireLoginForFacilityAction()) return;

    const destinationUrl = resolveFacilitySiteUrl();

    // Fire-and-forget email notify. Do not navigate to facility URL on Explore.
    apiClient
      .post("/api/facilities/explore-click", {
        facilityId: facilityId || "",
        facilityName: name,
        address,
        zipCode,
        phone: String(phone || "").trim() === "N/A" ? "" : phone,
        email,
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
      description: "We emailed the facility contacts for more information.",
    });
  };
  const handleMoreInformationClick = () => {
    if (!requireLoginForFacilityAction()) return;
    window.open(resolveFacilitySiteUrl(), "_blank", "noopener,noreferrer");
  };
  // Dedicated, simplified card for grid view (4-per-row) – matches provided design
  if (gridView) {
    return (
      <div
        className="mx-auto flex h-auto min-h-[305px] w-full max-w-full flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_4px_24px_rgba(15,23,42,0.08)] min-[400px]:min-h-[320px] sm:min-h-[340px]"
      >
        {/* Image Section */}
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
          {/* Match Badge */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-full bg-black/70 text-white backdrop-blur-sm px-2.5 py-1 text-[11px] font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00CFF4]" />
            {matchPercent}% Personalized Match
          </div>
          {/* Heart - save to favorites */}
          <button
            type="button"
            className="absolute right-3 top-3 flex items-center justify-center rounded-full border border-white/60 bg-white/70 backdrop-blur-sm hover:bg-white/90 transition-colors h-8 w-8"
            aria-label="Save to favorites"
            onClick={handleFavoriteClick}
          >
            <Heart
              className={`stroke-[2] h-4 w-4 ${isFavorite ? "text-red-500 fill-red-500" : "text-[#132329]"
                }`}
            />
          </button>
        </div>

        {/* Content Section */}
        <div className="flex flex-1 flex-col px-2.5 pt-2.5 pb-2 sm:px-3 sm:pt-3 sm:pb-2">
          <p className="mb-0.5 line-clamp-3 text-[9px] min-[400px]:text-[10px] sm:text-[11px] font-semibold tracking-[0.18em] uppercase" style={{ color: "#155DFC" }}>
            {category}
          </p>
          <h3 className="mb-1.5 truncate text-[13px] font-semibold tracking-tight text-[#132329] min-[400px]:text-[14px] sm:mb-2 sm:text-[15px]" title={name}>
            {name}
          </h3>

          {hasDisplayPrice ? (
            <>
              <p className="mb-0.5 text-[9px] sm:text-[10px] font-medium tracking-[0.14em] uppercase text-[#64748b]">
                Monthly Investment
              </p>
              <p className="truncate text-[13px] font-semibold text-[#132329] tabular-nums sm:text-sm" title={displayPriceRange}>
                {displayPriceRange}
              </p>
            </>
          ) : null}

          {/* Buttons */}
          <div className="mt-auto flex gap-2 pt-2 sm:gap-2.5 sm:pt-2.5">
            <button
              type="button"
              onClick={openExploreDestination}
              className="flex-1 min-w-0 rounded-full bg-[#0F172A] py-1.5 text-center text-[12px] sm:text-[13px] font-medium text-white transition-colors hover:bg-[#1e293b]"
            >
              Explore
            </button>
            <button
              type="button"
              className="flex-1 min-w-0 rounded-full border border-[#E2E8F0] bg-white py-1.5 text-center text-[11px] sm:text-[12px] font-medium text-[#132329] transition-colors hover:bg-[#F1F5F9]"
              onClick={handleMoreInformationClick}
              title="Open facility website for more information"
            >
              More Information
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default full card (listing + two-column)
  return (
    <div
      className={`flex h-full w-full max-w-full overflow-hidden rounded-2xl bg-white ${compact ? "min-w-0 flex-col" : "flex-col sm:flex-row"}`}
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}
    >
      {/* Image Section - compact: always on top ~45–50%; listing: side-by-side on sm+ */}
      <div className={`relative w-full flex-shrink-0 ${compact ? "aspect-[4/3] min-h-[180px]" : "sm:w-[33.333%] min-h-[180px] min-[400px]:min-h-[200px] sm:min-h-[220px]"}`}>
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
        {/* Match Badge - dark semi-transparent oval */}
        <div className={`absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 text-white backdrop-blur-sm font-bold ${compact ? "px-2 py-1 text-[11px]" : "px-2.5 py-1 text-[11px] sm:text-xs"}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-[#00CFF4] shrink-0" />
          {matchPercent}% Personalized Match
        </div>
        {/* Heart - white semi-transparent with thin border */}
        <button
          type="button"
          className={`absolute right-3 top-3 flex items-center justify-center rounded-full border border-white/60 bg-white/70 backdrop-blur-sm hover:bg-white/90 transition-colors ${compact ? "h-7 w-7" : "h-9 w-9"}`}
          aria-label="Save to favorites"
          onClick={handleFavoriteClick}
        >
          <Heart
            className={`stroke-[2] ${compact ? "h-3.5 w-3.5" : "h-4 w-4"} ${isFavorite ? "text-red-500 fill-red-500" : "text-[#132329]"
              }`}
          />
        </button>
        {/* Distance - glassmorphism pill */}
        <div
          className={`absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wide text-white ${compact ? "px-2.5 py-1 text-[9px]" : "px-3 py-1.5 text-[11px]"}`}
          style={{
            backdropFilter: "blur(16px) saturate(1.4)",
            WebkitBackdropFilter: "blur(16px) saturate(1.4)",
            backgroundColor: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.28)",
            boxShadow: "0 2px 10px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2)",
            textShadow: "0 1px 4px rgba(0,0,0,0.7), 0 0 8px rgba(0,0,0,0.4)",
          }}
        >
          <MapPin className={`text-[#00CFF4] shrink-0 drop-shadow-sm ${compact ? "h-2.5 w-2.5" : "h-3 w-3"}`} strokeWidth={2} />
          {distance}
        </div>
      </div>

      {/* Content Section - ~2/3 width */}
      <div className={`flex flex-1 flex-col justify-between bg-white min-w-0 ${compact ? "px-3 py-2.5 sm:px-4 sm:py-3" : "px-4 py-4 sm:px-6 sm:py-5"}`}>
        {/* Top row - grid view: always stack so name gets full width; otherwise compact/two use default */}
        <div className={`flex gap-2 sm:gap-3 ${gridView ? "flex-col" : "flex-col sm:flex-row sm:items-start sm:justify-between"}`}>
          <div className="min-w-0">
            <p className={`font-bold tracking-widest uppercase truncate max-w-full ${compact ? "text-[9px] sm:text-[10px]" : "text-[10px] sm:text-[11px]"}`} style={{ color: "#155DFC" }}>
              {category}
            </p>
            <h3
              className={`mt-0.5 font-bold text-[#132329] ${gridView ? "truncate" : "break-words"} ${compact ? "text-sm sm:text-base" : "mt-1 text-lg sm:text-xl"}`}
              title={name}
            >
              {name}
            </h3>
            <div className={`flex flex-wrap items-center gap-1.5 ${compact ? "mt-1 text-[10px] sm:text-xs" : "mt-1.5 gap-2 text-xs sm:text-sm"}`}>
              <div className="flex items-center gap-1 rounded-full bg-[#FEFCE8]/55 px-2 py-0.5">
                <Star className={`fill-[#FBBF24] text-[#FBBF24] shrink-0 ${compact ? "h-3 w-3" : "h-3.5 w-3.5 sm:h-4 sm:w-4"}`} />
                <span className="font-semibold text-[#132329]">{rating}</span>
              </div>
              <span className={`text-[#64748b] ${gridView ? "truncate" : ""}`}>{ratingMetaText}</span>
            </div>
          </div>
          {/* Monthly Investment — only when a real price is available */}
          {hasDisplayPrice ? (
            <div
              className={`rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] ${gridView ? "w-full shrink-0 text-left" : "flex-shrink-0 text-left sm:text-right w-fit sm:w-auto"} ${compact ? "px-2 py-1.5 sm:px-3 sm:py-2" : "px-3 py-2 sm:px-4 sm:py-2.5"}`}
            >
              <p className="text-[10px] font-bold tracking-wider text-[#64748b] uppercase">
                MONTHLY INVESTMENT
              </p>
              <p className={`font-bold text-[#132329] ${compact ? "mt-0.5 text-xs sm:text-sm" : "mt-0.5 text-sm sm:text-base"}`}>
                {displayPriceRange}
              </p>
            </div>
          ) : null}
        </div>

        {/* Contact details – hide in grid view so compact cards match the simpler design */}
        {!gridView && (
          <div
            className={`overflow-hidden ${compact ? "mt-2 rounded-xl px-2.5 py-2 sm:px-3 sm:py-2.5" : "mt-3 sm:mt-4 rounded-2xl sm:rounded-3xl px-3 py-2.5 sm:px-4 sm:py-3"}`}
            style={{
              background: "linear-gradient(135deg, rgba(248,250,252,0.94), rgba(241,245,249,0.9))",
              borderRadius: "16px",
              border: "1px solid #E2E8F0",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.65)",
            }}
          >
            <p className={`font-bold tracking-wider text-[#64748b] uppercase ${compact ? "text-[9px] sm:text-[10px] mb-1.5" : "text-[10px] sm:text-[11px] mb-2"}`}>
              Contact Details
            </p>

            <div className={`grid grid-cols-1 min-[390px]:grid-cols-2 gap-2 ${compact ? "text-[10px] sm:text-xs" : "text-xs sm:text-sm"}`}>
              <div className="rounded-xl border border-[#E2E8F0] bg-white/85 px-2.5 py-2">
                <p className="flex items-center gap-1.5 font-semibold text-[#64748b] uppercase tracking-wide text-[10px]">
                  <MapPin className="h-3.5 w-3.5 text-[#155DFC]" />
                  Address
                </p>
                <p className="mt-1 break-words font-medium text-[#132329]">
                  {String(address || "").trim() || "N/A"}
                </p>
              </div>

              <div className="rounded-xl border border-[#E2E8F0] bg-white/85 px-2.5 py-2">
                <p className="flex items-center gap-1.5 font-semibold text-[#64748b] uppercase tracking-wide text-[10px]">
                  <Hash className="h-3.5 w-3.5 text-[#155DFC]" />
                  Zip Code
                </p>
                <p className="mt-1 break-words font-medium text-[#132329]">
                  {String(zipCode || "").trim() || "N/A"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Buttons - full width on mobile, flex on larger */}
        <div className={`flex flex-col sm:flex-row flex-wrap ${compact ? "mt-2 gap-2 sm:gap-3" : "mt-4 sm:mt-5 gap-3 sm:gap-4"}`}>
          <button
            type="button"
            onClick={openExploreDestination}
            className={`inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#0F172A] text-white transition-colors hover:bg-[#1e293b] text-center ${compact ? "px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm min-h-[36px] sm:min-h-0" : "px-6 py-3 sm:px-10 sm:py-3.5 min-h-[44px] sm:min-h-0"}`}
            style={compact ? {} : { fontFamily: "Rethink Sans, sans-serif", fontWeight: 400, fontSize: "clamp(14px, 4vw, 18px)", lineHeight: "28px", letterSpacing: "-0.44px" }}
          >
            Explore <ArrowRight className={`shrink-0 ${compact ? "h-3.5 w-3.5" : "h-4 w-4"}`} />
          </button>
          <button
            type="button"
            className={`inline-flex min-w-0 flex-1 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-[#132329] transition-colors hover:bg-[#F8FAFC] text-center ${compact ? "px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm min-h-[36px] sm:min-h-0" : "px-6 py-3 sm:px-10 sm:py-3.5 min-h-[44px] sm:min-h-0"}`}
            style={compact ? {} : { fontFamily: "Rethink Sans, sans-serif", fontWeight: 400, fontSize: "clamp(14px, 4vw, 18px)", lineHeight: "28px", letterSpacing: "-0.44px" }}
            onClick={handleMoreInformationClick}
            title="Open facility website for more information"
          >
            More Information
          </button>
        </div>
      </div>
    </div>
  );
};

export default FacilityCard;
