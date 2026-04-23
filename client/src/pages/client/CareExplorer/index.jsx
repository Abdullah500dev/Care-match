import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import axios from "axios";
import { apiClient } from "../../../services/api";
import { getUser } from "../../../store/auth/authSlice";
import SEO from "../../../components/common/SEO";
import CareExplorerBar from "../../../components/client/CareExplorer/CareExplorerBar";
import FiltersSidebar from "../../../components/client/CareExplorer/FiltersSidebar";
import FacilityCard from "../../../components/client/CareExplorer/FacilityCard";
import {
  getGoogleMapsApiKey,
  loadGoogleMapsScript,
} from "../../../lib/loadGoogleMaps";
import { scrollToCarrieHeroThenOpenChat } from "../../../utils/scrollToCarrieHeroTagline";

const API_BASE =
  typeof import.meta.env.VITE_REACT_APP_API_BASE_URL === "string"
    ? import.meta.env.VITE_REACT_APP_API_BASE_URL.replace(/\/$/, "")
    : "";

function resolveFacilityImageUrl(path) {
  if (!path || typeof path !== "string") return null;
  if (/^https?:\/\//i.test(path)) return path;
  if (!API_BASE) return path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

const DEFAULT_CARD_IMAGE = "/assets/images/imgForFindCare.svg";
const DEFAULT_PRICE_RANGE = "N/A";
const DEFAULT_MAP_CENTER = { lat: 40.7128, lng: -74.006 };
const DEFAULT_NEARBY_RADIUS_MILES = 30;
const FAVORITE_FACILITY_IDS_STORAGE_KEY = "carematch_favorite_facility_ids";

function formatPriceRange(rawPricing) {
  const raw = String(rawPricing || "").trim();
  const nums = [...raw.matchAll(/(\d[\d,]*)/g)]
    .map((m) => Number.parseInt(m[1].replace(/,/g, ""), 10))
    .filter((n) => !Number.isNaN(n) && n > 0);

  if (nums.length === 0) return DEFAULT_PRICE_RANGE;
  if (nums.length === 1) return `$${nums[0].toLocaleString("en-US")}/mo`;
  const low = Math.min(...nums);
  const high = Math.max(...nums);
  return `$${low.toLocaleString("en-US")} - $${high.toLocaleString("en-US")}/mo`;
}

function parsePriceRangeNumbers(rawPricing) {
  const raw = String(rawPricing || "").trim();
  const nums = [...raw.matchAll(/(\d[\d,]*)/g)]
    .map((m) => Number.parseInt(m[1].replace(/,/g, ""), 10))
    .filter((n) => !Number.isNaN(n) && n > 0);
  if (nums.length === 0) return { min: null, max: null };
  if (nums.length === 1) return { min: nums[0], max: nums[0] };
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

function averagePriceFromText(rawPricing) {
  const { min, max } = parsePriceRangeNumbers(rawPricing);
  if (min != null && max != null) return Math.round((min + max) / 2);
  if (min != null) return min;
  if (max != null) return max;
  return null;
}

function distanceMiles(a, b) {
  const toRad = (n) => (n * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(h));
}

function titleCase(s) {
  return String(s || "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// US state name → abbreviation lookup for location filter
const US_STATE_ABBR = {
  alabama: "al", alaska: "ak", arizona: "az", arkansas: "ar", california: "ca",
  colorado: "co", connecticut: "ct", delaware: "de", florida: "fl", georgia: "ga",
  hawaii: "hi", idaho: "id", illinois: "il", indiana: "in", iowa: "ia",
  kansas: "ks", kentucky: "ky", louisiana: "la", maine: "me", maryland: "md",
  massachusetts: "ma", michigan: "mi", minnesota: "mn", mississippi: "ms",
  missouri: "mo", montana: "mt", nebraska: "ne", nevada: "nv",
  "new hampshire": "nh", "new jersey": "nj", "new mexico": "nm", "new york": "ny",
  "north carolina": "nc", "north dakota": "nd", ohio: "oh", oklahoma: "ok",
  oregon: "or", pennsylvania: "pa", "rhode island": "ri", "south carolina": "sc",
  "south dakota": "sd", tennessee: "tn", texas: "tx", utah: "ut",
  vermont: "vt", virginia: "va", washington: "wa", "west virginia": "wv",
  wisconsin: "wi", wyoming: "wy", "district of columbia": "dc",
};

/**
 * Returns true if the facility's full address matches the location query.
 * Handles: city names, state full names, state abbreviations, zip codes.
 */
function addressMatchesLocation(fullAddress, locationQuery) {
  if (!locationQuery) return true;
  const addr = String(fullAddress || "").toLowerCase();
  const query = locationQuery.toLowerCase().trim();
  if (!query) return true;

  // If facility has no address data, don't hide it — incomplete data shouldn't remove results
  if (!addr) return true;

  // 1. Direct substring match (city names, zip codes, full state name spelled out)
  if (addr.includes(query)) return true;

  // 2. State full name → try abbreviation match in address (e.g. "new jersey" → "nj")
  const abbr = US_STATE_ABBR[query];
  if (abbr) {
    // Word-boundary match — catches ", NJ", " NJ ", "NJ,", "NJ 07030" etc.
    if (new RegExp(`\\b${abbr}\\b`).test(addr)) return true;
  }

  // 3. Handle "City, State" queries e.g. "Newark, NJ" or "Newark, New Jersey"
  if (query.includes(",")) {
    const [city, stateRaw] = query.split(",").map((s) => s.trim());
    const stateAbbr = US_STATE_ABBR[stateRaw] || stateRaw;
    if (city && addr.includes(city)) {
      if (addr.includes(stateAbbr)) return true;
      if (stateRaw && addr.includes(stateRaw)) return true;
    }
  }

  // 4. User typed a 2-letter abbreviation like "NJ" — word-boundary match
  if (/^[a-z]{2}$/.test(query)) {
    if (new RegExp(`\\b${query}\\b`).test(addr)) return true;
    // Also try reverse: "nj" → find "new jersey" in address
    const fullName = Object.keys(US_STATE_ABBR).find((k) => US_STATE_ABBR[k] === query);
    if (fullName && addr.includes(fullName)) return true;
  }

  return false;
}

function normalizeFacilityForCard(m) {
  const externalData =
    m && typeof m.external_data === "object" && m.external_data
      ? m.external_data
      : {};
  const googlePlaces =
    externalData && typeof externalData.google_places === "object"
      ? externalData.google_places
      : {};
  const firstImg =
    Array.isArray(m.images) && m.images.length ? m.images[0] : null;
  const imageSrc = resolveFacilityImageUrl(firstImg) || DEFAULT_CARD_IMAGE;
  const category =
    Array.isArray(m.care_levels) && m.care_levels.length
      ? m.care_levels.join(" · ").toUpperCase()
      : "SENIOR LIVING";
  const features =
    Array.isArray(m.reasons) && m.reasons.length
      ? m.reasons.map((r) =>
        String(r)
          .replace(/^[✓○]\s*/, "")
          .trim(),
      )
      : ["Review listing details and tour to validate fit"];
  const pricingTextFromFields =
    String(m.pricing || "").trim() || String(externalData.pricing || "").trim();
  const finesAmount = Number(externalData.total_fines_amount);
  const pricingText =
    pricingTextFromFields ||
    (Number.isFinite(finesAmount) && finesAmount > 0
      ? `$${finesAmount.toLocaleString("en-US")}/mo`
      : "");
  const priceRange = formatPriceRange(pricingText);
  const numericPrice = parsePriceRangeNumbers(pricingText);
  const overallRating =
    externalData.overall_rating != null &&
      !Number.isNaN(Number(externalData.overall_rating))
      ? Number(externalData.overall_rating)
      : googlePlaces.total_score != null &&
        !Number.isNaN(Number(googlePlaces.total_score))
        ? Number(googlePlaces.total_score)
        : null;
  const reviewCountRaw =
    googlePlaces.review_count ??
    m?.apify_raw?.reviewsCount ??
    m?.apify_raw?.reviews_count ??
    null;
  const reviewCountValue =
    reviewCountRaw != null && !Number.isNaN(Number(reviewCountRaw))
      ? Number(reviewCountRaw)
      : null;
  const providerUrl = String(externalData.provider_url || "").trim();
  const distance =
    m.address && String(m.address).trim()
      ? String(m.address).trim().slice(0, 48) +
      (String(m.address).length > 48 ? "…" : "")
      : "Address on file";
  return {
    key: m.facilityId || m._id || m.name,
    matchPercent: typeof m.score === "number" ? m.score : 0,
    imageSrc,
    category,
    name: m.name || "Community",
    priceRange,
    priceMin: numericPrice.min,
    priceMax: numericPrice.max,
    distance,
    features,
    address: m.address || "",
    website: m.website || "",
    rating: overallRating != null ? overallRating : 4.8,
    reviewCount: overallRating != null ? 1 : 127,
    ratingLabel: overallRating != null ? "CMS rating" : "family reviews",
    specialty: Array.isArray(m.specialty) ? m.specialty : [],
    description: m.description || "",
    sourcePlatform: m.source_platform || "",
    isExternal: Boolean(m.is_external),
    externalSourceUrl: m.external_source_url || providerUrl,
    careLevels: Array.isArray(m.care_levels) ? m.care_levels : [],
    amenities: Array.isArray(m.amenities) ? m.amenities : [],
    services: Array.isArray(m.services) ? m.services : [],
    availability: m.availability || "Within 30 Days",
    lat: googlePlaces.latitude ?? externalData.latitude ?? m.latitude ?? null,
    lng: googlePlaces.longitude ?? externalData.longitude ?? m.longitude ?? null,
  };
}

const CareExplorer = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const carrieMatches = location.state?.carrieMatches;
  const carrieFilters = location.state?.carrieFilters;
  const fromCarrie = Boolean(location.state?.fromCarrie);
  const carrieLocationQuery = String(
    carrieFilters?.locationQuery || carrieFilters?.searchLocation || "",
  ).trim();

  const [view, setView] = useState("listing");
  const [layout, setLayout] = useState("single");
  const [scope, setScope] = useState("all");
  const [mobileFiltersCollapsed, setMobileFiltersCollapsed] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    locationQuery: carrieLocationQuery,
    searchQuery: "",
    maxMiles: "",
    budgetMin: 1000,
    budgetMax: 15000,
    selectedCareTypes: [],
    selectedAvailability: ["Within 30 Days"],
    selectedAmenities: [],
  });
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const mapMarkersRef = useRef([]);
  const geocoderRef = useRef(null);
  const [mapError, setMapError] = useState("");
  const [mapsReady, setMapsReady] = useState(false);
  const [currentCoords, setCurrentCoords] = useState(null);
  const [nearbyMapFacilityKeys, setNearbyMapFacilityKeys] = useState([]);
  const [directoryFacilities, setDirectoryFacilities] = useState([]);
  const { isAuthenticated, userData } = useSelector(getUser);
  const [favoriteFacilityIds, setFavoriteFacilityIds] = useState([]);

  // Preload Google Maps + Places so the location autocomplete works immediately
  useEffect(() => {
    const apiKey = getGoogleMapsApiKey();
    if (apiKey) loadGoogleMapsScript(apiKey).catch(() => {});
  }, []);

  // Load initial favorites from backend or local storage
  useEffect(() => {
    const loadFavorites = async () => {
      if (isAuthenticated) {
        try {
          const response = await apiClient.get("/api/auth/favorites");
          if (response.data.success) {
            setFavoriteFacilityIds(response.data.favorites.map(id => String(id)));
            return;
          }
        } catch (error) {
          console.error("Failed to fetch favorites from database", error);
        }
      }

      // Fallback to local storage if not authenticated or API fails
      try {
        const raw = localStorage.getItem(FAVORITE_FACILITY_IDS_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        setFavoriteFacilityIds(Array.isArray(parsed) ? parsed.map((id) => String(id)) : []);
      } catch {
        setFavoriteFacilityIds([]);
      }
    };

    loadFavorites();
  }, [isAuthenticated]);

  const handleAskCarrie = () => {
    if (location.pathname !== "/") {
      navigate("/");
      window.setTimeout(() => {
        scrollToCarrieHeroThenOpenChat({ source: "care-explorer" });
      }, 120);
      return;
    }
    scrollToCarrieHeroThenOpenChat({ source: "care-explorer" });
  };

  const handleToggleFavorite = async (facilityId) => {
    const safeId = String(facilityId || "").trim();
    if (!safeId) return;

    // Optimistic UI update
    setFavoriteFacilityIds((prev) =>
      prev.includes(safeId)
        ? prev.filter((id) => id !== safeId)
        : [...prev, safeId],
    );

    if (isAuthenticated) {
      try {
        await apiClient.post("/api/auth/toggle-favorite", { facilityId: safeId });
      } catch (error) {
        console.error("Failed to sync favorite with database", error);
        // Rollback on failure if you want to be strict, but for likes usually it's fine
      }
    }
  };

  useEffect(() => {
    localStorage.setItem(
      FAVORITE_FACILITY_IDS_STORAGE_KEY,
      JSON.stringify(favoriteFacilityIds),
    );
  }, [favoriteFacilityIds]);

  const liveFacilities = useMemo(() => {
    if (!Array.isArray(carrieMatches) || carrieMatches.length === 0)
      return null;
    return carrieMatches.map(normalizeFacilityForCard);
  }, [carrieMatches]);

  const baseFacilities = useMemo(() => {
    if (liveFacilities?.length) return liveFacilities;
    if (directoryFacilities.length) return directoryFacilities;
    return [];
  }, [liveFacilities, directoryFacilities]);

  const careTypeOptions = useMemo(() => {
    const base = [
      ...new Set(
        baseFacilities.flatMap((f) =>
          (f.careLevels || []).map((x) => titleCase(x)),
        ),
      ),
    ];
    return base.length ? base : ["Assisted Living"];
  }, [baseFacilities]);

  const amenityOptions = useMemo(() => {
    const base = [
      ...new Set(
        baseFacilities.flatMap((f) =>
          [...(f.amenities || []), ...(f.services || [])].map((x) =>
            titleCase(x),
          ),
        ),
      ),
    ];
    return base.slice(0, 60).length
      ? base.slice(0, 60)
      : ["24/7 Care", "Private Rooms", "Therapy Services", "Pet Friendly"];
  }, [baseFacilities]);
  const availabilityOptions = useMemo(() => {
    const base = [
      ...new Set(
        baseFacilities
          .map((f) => String(f.availability || "").trim())
          .filter(Boolean),
      ),
    ];
    return base.length ? base : ["Immediate", "Within 30 Days", "Future Planning"];
  }, [baseFacilities]);

  useEffect(() => {
    if (!fromCarrie || !carrieFilters) return;
    const maxBudget =
      Number.isFinite(Number(carrieFilters.budgetMaxMonthly)) &&
        Number(carrieFilters.budgetMaxMonthly) > 0
        ? Number(carrieFilters.budgetMaxMonthly)
        : 15000;
    const safeMax = Math.min(15000, Math.max(1000, Math.round(maxBudget)));
    setFilters((prev) => ({
      ...prev,
      locationQuery: carrieLocationQuery,
      budgetMax: safeMax,
      selectedCareTypes: Array.isArray(carrieFilters.careLevels)
        ? carrieFilters.careLevels.map((x) => titleCase(x))
        : prev.selectedCareTypes,
      selectedAmenities: Array.isArray(carrieFilters.amenityMustHaves)
        ? carrieFilters.amenityMustHaves.map((x) => String(x).trim())
        : prev.selectedAmenities,
      selectedAvailability:
        typeof carrieFilters.availability === "string" &&
          carrieFilters.availability.trim()
          ? [carrieFilters.availability.trim()]
          : prev.selectedAvailability,
      maxMiles:
        carrieFilters.maxDistanceMiles != null &&
          !Number.isNaN(Number(carrieFilters.maxDistanceMiles))
          ? String(carrieFilters.maxDistanceMiles)
          : prev.maxMiles,
    }));
  }, [fromCarrie, carrieFilters, carrieLocationQuery]);

  useEffect(() => {
    if (fromCarrie || !API_BASE) return;
    let cancelled = false;
    axios
      .get(`${API_BASE}/api/facilities/public`, { withCredentials: true })
      .then((res) => {
        if (cancelled) return;
        const rows = Array.isArray(res?.data?.facilities)
          ? res.data.facilities
          : [];
        setDirectoryFacilities(rows.map(normalizeFacilityForCard));
      })
      .catch(() => {
        if (cancelled) return;
        setDirectoryFacilities([]);
      });
    return () => {
      cancelled = true;
    };
  }, [fromCarrie]);

  const scopedFacilities = useMemo(() => {
    if (scope !== "saved") return baseFacilities;
    const favoriteSet = new Set(favoriteFacilityIds.map((id) => String(id)));
    return baseFacilities.filter((f) =>
      favoriteSet.has(String(f.key ?? f.facilityId ?? f.name)),
    );
  }, [scope, baseFacilities, favoriteFacilityIds]);

  const filteredFacilities = useMemo(() => {
    const q = String(filters.searchQuery || "")
      .trim()
      .toLowerCase();
    const locationQuery = String(filters.locationQuery || carrieLocationQuery || "")
      .trim()
      .toLowerCase();
    const maxMilesNum = Number.parseFloat(
      String(filters.maxMiles || "").trim(),
    );
    const budgetMin = Number(filters.budgetMin) || 1000;
    const budgetMax = Number(filters.budgetMax) || 15000;
    const selectedCare = new Set(
      (filters.selectedCareTypes || []).map((x) => String(x).toLowerCase()),
    );
    const selectedAmenities = (filters.selectedAmenities || []).map((x) =>
      String(x).toLowerCase(),
    );
    const selectedAvailability = new Set(
      (filters.selectedAvailability || []).map((x) => String(x).toLowerCase()),
    );

    return scopedFacilities.filter((f) => {
      if (locationQuery) {
        // Use improved location matching that handles state names and abbreviations
        if (!addressMatchesLocation(f.address, locationQuery)) return false;
      }

      if (q) {
        const text =
          `${f.name || ""} ${f.category || ""} ${f.address || ""} ${(f.features || []).join(" ")}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      if (f.priceMin != null || f.priceMax != null) {
        const low = f.priceMin ?? f.priceMax;
        const high = f.priceMax ?? f.priceMin;
        if (low != null && high != null) {
          const overlaps = low <= budgetMax && high >= budgetMin;
          if (!overlaps) return false;
        }
      }

      if (selectedCare.size > 0) {
        const levels = (f.careLevels || []).map((x) => String(x).toLowerCase());
        const hasCare = [...selectedCare].some((c) =>
          levels.some((l) => l.includes(c) || c.includes(l)),
        );
        if (!hasCare) return false;
      }

      if (selectedAmenities.length > 0) {
        const pool = [
          ...(f.amenities || []),
          ...(f.services || []),
          ...(f.features || []),
        ].map((x) => String(x).toLowerCase());
        const hasAmenity = selectedAmenities.some((a) =>
          pool.some((p) => p.includes(a) || a.includes(p)),
        );
        if (!hasAmenity) return false;
      }

      if (selectedAvailability.size > 0) {
        const a = String(f.availability || "").toLowerCase();
        if (a && !selectedAvailability.has(a)) return false;
      }

      if (!Number.isNaN(maxMilesNum) && maxMilesNum > 0) {
        const facilityMiles =
          Number.isFinite(Number(f.distanceMiles)) &&
            Number(f.distanceMiles) > 0
            ? Number(f.distanceMiles)
            : Number.parseFloat(
              String(f.distance || "").match(
                /(\d+(?:\.\d+)?)\s*miles?/i,
              )?.[1],
            );
        if (!Number.isNaN(facilityMiles) && facilityMiles > maxMilesNum)
          return false;
      }

      return true;
    });
  }, [filters, scopedFacilities, carrieLocationQuery]);

  const mapFacilities = useMemo(
    () =>
      view === "map"
        ? fromCarrie && liveFacilities
          ? filteredFacilities
          : scopedFacilities
        : [],
    [view, fromCarrie, liveFacilities, filteredFacilities, scopedFacilities],
  );

  const visibleMapFacilities = useMemo(() => {
    if (!Array.isArray(mapFacilities)) return [];
    if (
      !Array.isArray(nearbyMapFacilityKeys) ||
      nearbyMapFacilityKeys.length === 0
    )
      return [];
    const allowed = new Set(nearbyMapFacilityKeys);
    return mapFacilities.filter((f) => allowed.has(f.key));
  }, [mapFacilities, nearbyMapFacilityKeys]);

  const pageSize = 5;
  const matchCountForHeader = filteredFacilities.length;
  const locationLabelForHeader =
    String(filters.locationQuery || "").trim() ||
    carrieLocationQuery ||
    String(filters.searchQuery || "").trim() ||
    "your area";
  const summaryCareText =
    filters.selectedCareTypes.length > 0
      ? filters.selectedCareTypes.join(", ")
      : "senior living";
  const summaryBudgetText = `$${Number(filters.budgetMin || 1000).toLocaleString()}-$${Number(filters.budgetMax || 15000).toLocaleString()}/mo`;
  const summaryNeedsText =
    filters.selectedAmenities.length > 0
      ? filters.selectedAmenities.slice(0, 2).join(", ")
      : "your selected preferences";
  const carrieAvailabilityText =
    filters.selectedAvailability.length > 0
      ? filters.selectedAvailability.join(", ")
      : "your preferred timeline";
  const totalPages = Math.max(
    1,
    Math.ceil(filteredFacilities.length / pageSize),
  );
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const listingItems = filteredFacilities.slice(startIdx, endIdx);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) return [1, 2, 3, 4, 5, "...", totalPages];
    if (currentPage >= totalPages - 3) {
      return [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }
    return [
      1,
      "...",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "...",
      totalPages,
    ];
  }, [currentPage, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [layout, scope, fromCarrie, carrieMatches?.length]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    if (view !== "map") {
      mapInstanceRef.current = null;
      setMapsReady(false);
      return;
    }
    const apiKey = getGoogleMapsApiKey();
    if (!apiKey) {
      setMapError("Map is unavailable: missing VITE_GOOGLE_MAPS_API_KEY.");
      setMapsReady(false);
      return;
    }
    let cancelled = false;
    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (cancelled) return;
        setMapError("");
        if (!mapContainerRef.current || mapInstanceRef.current) return;
        mapInstanceRef.current = new window.google.maps.Map(
          mapContainerRef.current,
          {
            center: DEFAULT_MAP_CENTER,
            zoom: 11,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          },
        );
        geocoderRef.current = new window.google.maps.Geocoder();
        setMapsReady(true);
      })
      .catch((err) => {
        if (cancelled) return;
        setMapError(err?.message || "Could not load map.");
        setMapsReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, [view]);

  useEffect(() => {
    if (
      view !== "map" ||
      !mapsReady ||
      !mapInstanceRef.current ||
      !geocoderRef.current
    )
      return;

    mapMarkersRef.current.forEach((m) => {
      if (m.marker) m.marker.setMap(null);
      else if (m.setMap) m.setMap(null); // fallback for any legacy markers
    });
    mapMarkersRef.current = [];
    setNearbyMapFacilityKeys([]);

    const candidates = (mapFacilities || []).filter((f) => f.address).slice(0, 15);
    if (candidates.length === 0) return;

    let cancelled = false;

    const geocodeOne = (address) =>
      new Promise((resolve) => {
        geocoderRef.current.geocode({ address }, (results, status) => {
          if (status === "OK" && results?.[0]?.geometry?.location)
            resolve(results[0].geometry.location);
          else resolve(null);
        });
      });

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    const loadMarkers = async () => {
      const placed = [];
      const cache = {};

      for (let i = 0; i < candidates.length; i++) {
        if (cancelled) break;
        const f = candidates[i];
        
        // Try searching for the specific facility name + address to get exact coordinates
        const queryStr = (f.name && f.name !== "Community") 
          ? `${f.name}, ${f.address}` 
          : f.address;

        let loc = null;
        if (f.lat && f.lng) {
          loc = { lat: () => f.lat, lng: () => f.lng };
        } else {
          let locFromCache = cache[queryStr];
          if (!locFromCache) {
            locFromCache = await geocodeOne(queryStr);
            if (!locFromCache && queryStr !== f.address) {
              locFromCache = await geocodeOne(f.address);
            }
            if (locFromCache) {
              cache[queryStr] = locFromCache;
            }
            if (i < candidates.length - 1) await sleep(300);
          }
          loc = locFromCache;
        }

        if (loc && !cancelled) {
          const latLng = { lat: loc.lat(), lng: loc.lng() };
          
          const avgPrice = averagePriceFromText(f.priceRange);
          const marker = new window.google.maps.Marker({
            map: mapInstanceRef.current,
            position: latLng,
            title: f.name,
            label: avgPrice
              ? {
                text: `$${Math.round(avgPrice / 100) * 100}`,
                color: "#0f172a",
                fontWeight: "700",
              }
              : undefined,
          });
          
          placed.push({ marker, loc, key: f.key, latLng });
        }
      }

      if (cancelled) {
        placed.forEach((p) => p.marker.setMap(null));
        return;
      }

      const valid = placed.filter(Boolean);
      setNearbyMapFacilityKeys(valid.map((x) => x.key));
      valid.forEach((x) => mapMarkersRef.current.push({ marker: x.marker, key: x.key }));
      
      if (valid.length === 0) return;
      
      const bounds = new window.google.maps.LatLngBounds();
      valid.forEach((x) => bounds.extend(x.latLng));
      mapInstanceRef.current.fitBounds(bounds, 60);
    };

    loadMarkers();

    return () => {
      cancelled = true;
    };
  }, [view, mapsReady, mapFacilities, currentCoords, filters.maxMiles]);

  return (
    <>
      <SEO title="Care Explorer - CareMatch AI" />
      <div
        className="min-w-0 bg-no-repeat overflow-x-hidden"
        style={{
          backgroundImage:
            "url(/assets/images/overlay-searchbg.svg), url(/assets/images/seacrh-bg-img.png)",
          backgroundSize: "55% 70%, cover",
          backgroundPosition: "145% 100%, center",
        }}
      >
        <CareExplorerBar
          view={view}
          onViewChange={setView}
          layout={layout}
          onLayoutChange={setLayout}
          scope={scope}
          onScopeChange={setScope}
          matchCount={matchCountForHeader}
          locationLabel={locationLabelForHeader}
        />

        {/* How we matched - bordered card; responsive */}
        <div className="w-full max-w-7xl mx-auto px-2 pt-3 pb-2 sm:px-4 sm:pt-4 sm:pb-2 md:px-6 md:pt-5">
          <div className="flex flex-col md:flex-row items-start md:items-stretch gap-3 md:gap-8 p-3 sm:p-4 bg-white rounded-lg border border-[#E2E8F0] shadow-sm min-w-0">
            <div className="flex flex-col gap-1 shrink-0 py-1 pl-0 sm:pl-2">
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#155DFC]/20 text-[#155DFC]">
                  <Info className="h-3 w-3" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wide text-[#155DFC]">
                  Transparency
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-[#132329]">
                How we matched these
              </h2>
            </div>
            <div className="md:border-l-2 md:border-[#E2E8F0] md:pl-8 flex-1 flex items-center justify-center min-w-0 max-w-5xl w-full">
              <p className="text-xs sm:text-sm text-[#64748b] text-center sm:text-left md:text-center">
                {fromCarrie && liveFacilities ? (
                  <>
                    These communities are{" "}
                    <span className="font-semibold text-[#132329]">
                      ranked from your chat with Carrie
                    </span>{" "}
                    for <span className="font-semibold text-[#132329]">{summaryCareText}</span>{" "}
                    in <span className="font-semibold text-[#132329]">{locationLabelForHeader}</span>,{" "}
                    with a budget around{" "}
                    <span className="font-semibold text-[#132329]">{summaryBudgetText}</span>,{" "}
                    must-have needs like{" "}
                    <span className="font-semibold text-[#132329]">{summaryNeedsText}</span>,{" "}
                    and move-in timeline of{" "}
                    <span className="font-semibold text-[#132329]">{carrieAvailabilityText}</span>.
                    Always confirm details on a tour.
                  </>
                ) : (
                  <>
                    Prioritized for{" "}
                    <span className="font-semibold text-[#132329]">
                      {summaryCareText}
                    </span>
                    {" "}in{" "}
                    <span className="font-semibold text-[#132329]">
                      {locationLabelForHeader}
                    </span>
                    , budget around{" "}
                    <span className="font-semibold text-[#132329]">
                      {summaryBudgetText}
                    </span>
                    , and your specific{" "}
                    <span className="font-semibold text-[#222c2e]">
                      {summaryNeedsText}
                    </span>
                    .
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Main content - sidebar + listing or map view; responsive padding and gap */}
        <div className="w-full max-w-7xl mx-auto px-2 pt-3 pb-8 flex flex-col lg:flex-row gap-3 sm:px-4 sm:pt-4 sm:pb-10 sm:gap-5 min-w-0 min-[1280px]:pb-12 min-[1920px]:pb-16">
          <div className="w-full lg:w-72 flex-shrink-0 min-w-0 max-w-full">
            <div className="lg:hidden rounded-xl border border-[#F7F4EF] bg-white px-3 py-2.5">
              <button
                type="button"
                onClick={() => setMobileFiltersCollapsed((prev) => !prev)}
                className="flex w-full items-center justify-between text-sm font-semibold text-[#364153]"
              >
                <span>Filters</span>
                {mobileFiltersCollapsed ? (
                  <ChevronDown className="h-4 w-4 text-[#64748b]" />
                ) : (
                  <ChevronUp className="h-4 w-4 text-[#64748b]" />
                )}
              </button>
            </div>
            <div
              className={mobileFiltersCollapsed ? "hidden lg:block" : "block"}
            >
              <FiltersSidebar
                filters={filters}
                onFiltersChange={setFilters}
                onReset={() =>
                  setFilters({
                    locationQuery: carrieLocationQuery,
                    searchQuery: "",
                    maxMiles: "",
                    budgetMin: 1000,
                    budgetMax: 15000,
                    selectedCareTypes: [],
                    selectedAvailability: ["Within 30 Days"],
                    selectedAmenities: [],
                  })
                }
                careTypeOptions={careTypeOptions}
                amenityOptions={amenityOptions}
                availabilityOptions={availabilityOptions}
                onAskCarrie={handleAskCarrie}
              />
            </div>
          </div>

          {view === "listing" ? (
            <div
              className={`flex-1 min-w-0 w-full max-w-full lg:max-w-5xl ${layout === "single"
                ? "space-y-3 sm:space-y-4"
                : layout === "two"
                  ? "grid grid-cols-2 md:grid-cols-2 gap-3 sm:gap-4"
                  : "grid grid-cols-2 min-[500px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 justify-items-center"
                }`}
            >
              {listingItems.map((f) => (
                <div
                  key={f.key ?? f.matchPercent}
                  className={
                    layout !== "single" ? "min-w-0 overflow-hidden" : undefined
                  }
                >
                  <FacilityCard
                    facilityId={f.key ?? f.facilityId ?? f.name}
                    matchPercent={f.matchPercent}
                    imageSrc={f.imageSrc}
                    name={f.name}
                    category={f.category}
                    rating={f.rating}
                    reviewCount={f.reviewCount}
                    ratingLabel={f.ratingLabel}
                    priceRange={f.priceRange}
                    distance={f.distance}
                    features={f.features}
                    website={f.website}
                    sourcePlatform={f.sourcePlatform}
                    isExternal={Boolean(f.isExternal)}
                    externalSourceUrl={f.externalSourceUrl}
                    compact={layout !== "single"}
                    gridView={layout === "grid"}
                    isFavorite={favoriteFacilityIds.includes(
                      String(f.key ?? f.facilityId ?? f.name),
                    )}
                    onToggleFavorite={handleToggleFavorite}
                  />
                </div>
              ))}

              {listingItems.length === 0 && (
                <div className="col-span-full rounded-xl border border-[#E2E8F0] bg-white p-6 text-center text-sm text-[#64748b]">
                  No facilities available yet for the selected filters.
                </div>
              )}

              {totalPages > 1 && (
                <div className="col-span-full mt-2 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm text-[#132329] disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <span className="text-sm text-[#64748B]">
                    Page {currentPage} of {totalPages}
                  </span>
                  <div className="mx-1 flex items-center gap-1">
                    {pageNumbers.map((p, idx) =>
                      p === "..." ? (
                        <span
                          key={`ellipsis-${idx}`}
                          className="px-1 text-sm text-[#94A3B8]"
                        >
                          ...
                        </span>
                      ) : (
                        <button
                          key={`page-${p}`}
                          type="button"
                          onClick={() => setPage(Number(p))}
                          className={`rounded-lg border px-2.5 py-1.5 text-sm ${currentPage === p
                            ? "border-[#00CFF4] bg-[#00CFF4] text-white"
                            : "border-[#E2E8F0] bg-white text-[#132329]"
                            }`}
                        >
                          {p}
                        </button>
                      ),
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm text-[#132329] disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 min-w-0 w-full max-w-full lg:max-w-5xl">
              <div className="flex flex-col gap-4">
                <div className="min-h-[520px] rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden w-full flex flex-col">
                  {mapError ? (
                    <div className="flex-1 flex items-center justify-center px-6 text-sm text-[#64748b]">
                      {mapError}
                    </div>
                  ) : (
                    <div ref={mapContainerRef} className="flex-1 w-full min-h-[520px]" />
                  )}
                </div>
                <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 w-full overflow-hidden">
                  <p className="text-sm font-semibold text-[#132329] mb-4">
                    Recommended Matches
                  </p>
                  <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 snap-x scrollbar-hide">
                    {(visibleMapFacilities || []).map((f) => (
                      <div
                        key={`map-${f.key ?? f.matchPercent}`}
                        className="w-[320px] snap-start flex-shrink-0 cursor-pointer transition-transform hover:scale-[1.03]"
                        onClick={(e) => {
                          if (e.target.closest('button') || e.target.closest('a')) return;
                          const markerObj = mapMarkersRef.current.find(m => m.key === f.key);
                          if (markerObj && markerObj.marker && mapInstanceRef.current) {
                            mapInstanceRef.current.panTo(markerObj.marker.getPosition());
                            mapInstanceRef.current.setZoom(15);
                            markerObj.marker.setAnimation(window.google.maps.Animation.BOUNCE);
                            setTimeout(() => {
                              markerObj.marker.setAnimation(null);
                            }, 2100);
                          }
                        }}
                      >
                        <FacilityCard
                          facilityId={f.key ?? f.facilityId ?? f.name}
                          matchPercent={f.matchPercent}
                          imageSrc={f.imageSrc}
                          name={f.name}
                          category={f.category}
                          rating={f.rating}
                          reviewCount={f.reviewCount}
                          ratingLabel={f.ratingLabel}
                          priceRange={f.priceRange}
                          distance={f.distance}
                          features={f.features}
                          website={f.website}
                          sourcePlatform={f.sourcePlatform}
                          isExternal={Boolean(f.isExternal)}
                          externalSourceUrl={f.externalSourceUrl}
                          compact
                          isFavorite={favoriteFacilityIds.includes(
                            String(f.key ?? f.facilityId ?? f.name),
                          )}
                          onToggleFavorite={handleToggleFavorite}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CareExplorer;
