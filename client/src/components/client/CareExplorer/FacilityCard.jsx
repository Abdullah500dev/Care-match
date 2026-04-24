import React from "react";
import { Heart, Star, ArrowRight, MapPin, Hash, PhoneCall } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const CAREMATCH_PLACEHOLDER_IMAGE = "/assets/images/footer-logo.svg";
const DEFAULT_IMAGE = CAREMATCH_PLACEHOLDER_IMAGE;
const POST_LOGIN_REDIRECT_KEY = "carematch_post_login_redirect";

const FacilityCard = ({
  facilityId,
  matchPercent = 96,
  category = "ASSISTED LIVING & MEMORY CARE",
  name = "Sunrise Senior Living",
  rating = 4.8,
  reviewCount = 127,
  ratingLabel = "family reviews",
  priceRange = "Price on call",
  distance = "2.3 MILES AWAY",
  address = "",
  zipCode = "",
  phone = "",
  imageSrc = DEFAULT_IMAGE,
  website = "",
  sourcePlatform = "",
  isExternal = false,
  externalSourceUrl = "",
  compact = false,
  gridView = false,
  isFavorite = false,
  onToggleFavorite,
}) => {
  const [cardImageSrc, setCardImageSrc] = React.useState(imageSrc || DEFAULT_IMAGE);
  const isUsingPlaceholderImage = cardImageSrc === CAREMATCH_PLACEHOLDER_IMAGE;
  const hasReviewCount = Number.isFinite(Number(reviewCount)) && Number(reviewCount) > 0;
  const ratingMetaText = hasReviewCount ? `${reviewCount} ${ratingLabel}` : ratingLabel;
  const displayPriceRange =
    String(priceRange || "").trim() && String(priceRange || "").trim().toUpperCase() !== "N/A"
      ? String(priceRange).trim()
      : "Price on call";

  React.useEffect(() => {
    setCardImageSrc(imageSrc || DEFAULT_IMAGE);
  }, [imageSrc]);

  const handleImageError = () => {
    if (cardImageSrc !== CAREMATCH_PLACEHOLDER_IMAGE) {
      setCardImageSrc(CAREMATCH_PLACEHOLDER_IMAGE);
    }
  };

  const hasWebsite = typeof website === "string" && /^https?:\/\//i.test(website);
  const hasExternalSourceUrl =
    typeof externalSourceUrl === "string" && /^https?:\/\//i.test(externalSourceUrl);
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
    onToggleFavorite?.(facilityId || name);
  };
  const openExploreDestination = () => {
    if (!requireLoginForFacilityAction()) return;
    if (hasWebsite) {
      window.open(website, "_blank", "noopener,noreferrer");
      return;
    }
    if (hasExternalSourceUrl) {
      window.open(externalSourceUrl, "_blank", "noopener,noreferrer");
      return;
    }
    const query = [name, sourcePlatform, distance].filter(Boolean).join(" ").trim();
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query || `${name} senior living`)}`;
    window.open(googleUrl, "_blank", "noopener,noreferrer");
  };
  const handleRequestTourClick = () => {
    if (isExternal) return;
    if (!requireLoginForFacilityAction()) return;
    navigate("/portal/messages", {
      state: { facilityId: facilityId || name, facilityName: name },
    });
  };
  // Dedicated, simplified card for grid view (4-per-row) – matches provided design
  if (gridView) {
    return (
      <div
        className="w-full max-w-full sm:max-w-[400px] mx-auto overflow-hidden rounded-2xl bg-white border border-[#E2E8F0] shadow-[0_4px_24px_rgba(15,23,42,0.08)]"
      >
        {/* Image Section */}
        <div className="relative">
          <img
            src={cardImageSrc}
            alt={name}
            onError={handleImageError}
            className={`w-full h-[110px] min-[400px]:h-[120px] sm:h-[125px] md:h-[135px] ${isUsingPlaceholderImage ? "object-contain bg-white p-4" : "object-cover"
              }`}
          />
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
        <div className="px-2.5 pt-2.5 pb-2 sm:px-3 sm:pt-3 sm:pb-2">
          <p className="mb-0.5 text-[9px] min-[400px]:text-[10px] sm:text-[11px] font-semibold tracking-[0.18em] uppercase" style={{ color: "#155DFC" }}>
            {category}
          </p>
          <h3 className="mb-1.5 sm:mb-2 text-[13px] min-[400px]:text-[14px] sm:text-[15px] font-semibold tracking-tight text-[#132329]">
            {name}
          </h3>

          <p className="mb-0.5 text-[9px] sm:text-[10px] font-medium tracking-[0.14em] uppercase text-[#64748b]">
            Monthly Investment
          </p>
          <p className="text-[13px] sm:text-sm font-semibold text-[#132329] tabular-nums">
            {displayPriceRange}
          </p>

          {/* Buttons */}
          <div className="mt-2 sm:mt-2.5 flex gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={openExploreDestination}
              className="flex-1 min-w-0 rounded-full bg-[#0F172A] py-1.5 text-center text-[12px] sm:text-[13px] font-medium text-white transition-colors hover:bg-[#1e293b]"
            >
              Explore
            </button>
            <button
              type="button"
              className="flex-1 min-w-0 rounded-full border border-[#E2E8F0] bg-white py-1.5 text-center text-[11px] sm:text-[12px] font-medium text-[#132329] transition-colors hover:bg-[#F1F5F9] disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleRequestTourClick}
              disabled={isExternal}
              title={
                isExternal
                  ? "Messaging is available only for facilities added in admin panel."
                  : "Request a tour / message this facility"
              }
            >
              Request a Tour
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
        <img
          src={cardImageSrc}
          alt={name}
          onError={handleImageError}
          className={`h-full w-full ${isUsingPlaceholderImage ? "object-contain bg-white p-6" : "object-cover"}`}
        />
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
          {/* Monthly Investment - grid view: full width so it doesn't steal space from name */}
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

            <div className={`grid grid-cols-1 min-[390px]:grid-cols-3 gap-2 ${compact ? "text-[10px] sm:text-xs" : "text-xs sm:text-sm"}`}>
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

              <div className="rounded-xl border border-[#E2E8F0] bg-white/85 px-2.5 py-2">
                <p className="flex items-center gap-1.5 font-semibold text-[#64748b] uppercase tracking-wide text-[10px]">
                  <PhoneCall className="h-3.5 w-3.5 text-[#155DFC]" />
                  Phone
                </p>
                <p className="mt-1 break-words font-medium text-[#132329]">
                  {String(phone || "").trim() || "N/A"}
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
            className={`inline-flex min-w-0 flex-1 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-[#132329] transition-colors hover:bg-[#F8FAFC] text-center disabled:cursor-not-allowed disabled:opacity-50 ${compact ? "px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm min-h-[36px] sm:min-h-0" : "px-6 py-3 sm:px-10 sm:py-3.5 min-h-[44px] sm:min-h-0"}`}
            style={compact ? {} : { fontFamily: "Rethink Sans, sans-serif", fontWeight: 400, fontSize: "clamp(14px, 4vw, 18px)", lineHeight: "28px", letterSpacing: "-0.44px" }}
            onClick={handleRequestTourClick}
            disabled={isExternal}
            title={
              isExternal
                ? "Messaging is available only for facilities added in admin panel."
                : "Request a tour / message this facility"
            }
          >
            Request a Tour
          </button>
        </div>
      </div>
    </div>
  );
};

export default FacilityCard;
