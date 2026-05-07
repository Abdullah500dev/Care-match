import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  Heart,
  MapPin,
  MessageCircle,
  Search,
  Signal,
  SlidersHorizontal,
  User,
  Users,
  UsersRound,
  X,
  Zap,
} from "lucide-react";
import SEO from "../../../components/common/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider, BudgetRangeSlider } from "@/components/ui/slider";
import { TiltCard } from "@/components/ui/tilt-card";
import { cn } from "@/lib/utils";
import {
  postDiscoverFacilities,
  postMatchRecommendations,
} from "@/services/matchService";
import { getGoogleMapsApiKey, loadGoogleMapsScript } from "@/lib/loadGoogleMaps";
import { getUser } from "@/store/auth/authSlice";
import { toast } from "sonner";

const BUDGET_SLIDER_MIN = 2000;
const BUDGET_SLIDER_MAX = 15000;
const BUDGET_SLIDER_STEP = 500;

const MILES_SLIDER_MIN = 5;
const MILES_SLIDER_MAX = 100;
const MILES_SLIDER_STEP = 5;

const TOTAL_STEPS = 8;
const INTAKE_DRAFT_STORAGE_KEY = "carematch_intake_draft_v1";
const ZIP_CODE_REGEX = /\b(\d{5})(?:-\d{4})?\b/;

const WHO_OPTIONS = [
  { id: "spouse", label: "My Spouse", desc: "Finding exceptional care for my lifelong partner.", Icon: Heart },
  { id: "parent", label: "My Parent", desc: "Expert assistance for a cherished mother or father.", Icon: Users },
  { id: "myself", label: "Myself", desc: "Proactive planning for my own secure future.", Icon: User },
  { id: "other", label: "Someone Else", desc: "Helping a relative, friend, or member of community.", Icon: UsersRound },
];

const AGE_OPTIONS = [
  { id: "under60", label: "Less Than 60", Icon: Heart },
  { id: "under70", label: "60-69", Icon: Users },
  { id: "under80", label: "70-79", Icon: Signal },
  { id: "above80", label: "Above 80", Icon: Zap },
];

const CARE_TIMELINE_OPTIONS = [
  { id: "immediately", label: "Immediately", desc: "Urgent need within a few days", Icon: Heart },
  { id: "within30", label: "Within 30 Days", desc: "Need care within the next month", Icon: Users },
  { id: "within60", label: "Within 60 Days", desc: "Planning ahead for next 2 months", Icon: Signal },
  { id: "noRush", label: "No Rush", desc: "Exploring options for future planning", Icon: Zap },
];

const LIVING_NOW_OPTIONS = [
  { id: "homeAlone", label: "Home (Alone)", Icon: Heart },
  { id: "homeFamily", label: "Home (w/ Family)", Icon: Users },
  { id: "retirement", label: "Retirement Home", Icon: Signal },
  { id: "assisted", label: "Assisted Living", Icon: Zap },
  { id: "rehab", label: "Rehab Facility", Icon: Signal },
  { id: "hospital", label: "Hospital", Icon: Zap },
];

const MOBILITY_OPTIONS = [
  { id: "great", label: "Great", desc: "Can get around independently", Icon: Heart },
  { id: "walkWithHelp", label: "Can Walk With Help", desc: "Uses a cane/walker for support", Icon: User },
  { id: "wheelchair", label: "Wheelchair", desc: "Primarily uses wheelchair", Icon: Heart },
  { id: "immobile", label: "Immobile", desc: "Temporary or permanent immobility", Icon: Zap },
];

const LOVED_ONE_CARE_OPTIONS = [
  { id: "dailyActivities", label: "Help With Daily Activities (Bathing, Dressing, Eating)" },
  { id: "memoryCare", label: "Memory Care / Dementia Support" },
  { id: "medication", label: "Medication Management" },
  { id: "mobilityAssist", label: "Mobility Assistance" },
  { id: "medicalMonitoring", label: "Regular Medical Monitoring" },
  { id: "socialEngagement", label: "Social Engagement & Activities" },
];

const LEVEL_OF_CARE_OPTIONS = [
  { id: "assisted", label: "Assisted Living", desc: "Needs help with daily tasks, medication, but still fairly independent", Icon: Users },
  { id: "independent", label: "Independent Living", desc: "Active seniors who are mostly independent but want amenities and community", Icon: Heart },
  { id: "memory", label: "Memory Care", desc: "Specialized support for dementia, Alzheimer's, or cognitive decline", Icon: Heart },
  { id: "snf", label: "Skilled Nursing", desc: "24/7 medical care, post-hospital recovery, or complex health needs", Icon: Heart },
];

const CARE_TYPES = [
  { id: "memory", label: "Memory Care" },
  { id: "assisted", label: "Assisted Living" },
  { id: "snf", label: "Skilled Nursing (SNF)" },
  { id: "independent", label: "Independent Living" },
  { id: "respite", label: "Respite / Short-term" },
];

const BUDGET_RANGES = [
  { id: "under3", label: "Under $3,000/mo" },
  { id: "3-5", label: "$3,000 – $5,000/mo" },
  { id: "5-7", label: "$5,000 – $7,000/mo" },
  { id: "7-10", label: "$7,000 – $10,000/mo" },
  { id: "10plus", label: "$10,000+/mo" },
];

const URGENCY_OPTIONS = [
  { id: "asap", label: "As soon as possible" },
  { id: "1month", label: "Within 1 month" },
  { id: "1-3", label: "1 – 3 months" },
  { id: "3plus", label: "3+ months / Planning ahead" },
];

const SPECIAL_NEEDS_PREFERENCES = [
  { id: "privateRoom", label: "Private room preferred" },
  { id: "petFriendly", label: "Pet-friendly" },
  { id: "couples", label: "Couples accommodation" },
  { id: "cultural", label: "Cultural or language-specific care" },
  { id: "faithBased", label: "Faith-based community" },
  { id: "lgbtq", label: "LGBTQ+ welcoming" },
  { id: "diabetes", label: "Diabetes management" },
  { id: "physicalTherapy", label: "Physical therapy" },
  { id: "hospice", label: "Hospice care" },
  { id: "respiratory", label: "Respiratory support" },
  { id: "dialysis", label: "Dialysis access nearby" },
];

const defaultFormData = {
  who: "",
  parentAge: "",
  careTimeline: "",
  livingNow: "",
  mobility: "",
  lovedOneCare: [],
  location: "",
  budgetMin: 3000,
  budgetMax: 6000,
  levelOfCare: "assisted",
  specialNeedsPreferences: [],
  careTypes: [],
  budget: "",
  urgency: "",
  amenities: [],
  maxMiles: "",
  maxTravelMiles: 25,
  visitFrequency: "",
  lifestyle: "",
  specialNeeds: "",
};

const FINDING_MATCHES_DURATION_MS = 4000;
const TIMELINE_TO_AVAILABILITY = {
  immediately: "Immediate",
  within30: "Within 30 Days",
  within60: "Future Planning",
  noRush: "Future Planning",
};
const LEVEL_TO_CARE_LEVEL = {
  assisted: "assisted living",
  independent: "independent living",
  memory: "memory care",
  snf: "skilled nursing",
};
const CARE_TO_AMENITY = {
  dailyActivities: "24/7 Care",
  memoryCare: "Memory Care",
  medication: "Medication Management",
  mobilityAssist: "Mobility Assistance",
  medicalMonitoring: "Medical Monitoring",
  socialEngagement: "Social Engagement",
};
const SPECIAL_NEED_TO_AMENITY = {
  privateRoom: "Private Rooms",
  petFriendly: "Pet Friendly",
  physicalTherapy: "Therapy Services",
  respiratory: "Respiratory Support",
  dialysis: "Dialysis Access",
};

function getStepValidationError(step, formData) {
  if (step === 1 && !String(formData?.who || "").trim()) return "Please select who needs care.";
  if (step === 2 && !String(formData?.parentAge || "").trim()) return "Please select an age range.";
  if (step === 3 && !String(formData?.careTimeline || "").trim()) return "Please select a care timeline.";
  if (step === 4 && !String(formData?.livingNow || "").trim()) return "Please select current living situation.";
  if (step === 5 && !String(formData?.mobility || "").trim()) return "Please select mobility status.";
  if (step === 6 && (!Array.isArray(formData?.lovedOneCare) || formData.lovedOneCare.length === 0)) {
    return "Please choose at least one care need.";
  }
  if (step === 7 && !String(formData?.location || "").trim()) return "Please enter preferred location.";
  return null;
}

export default function IntakeSearch() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useSelector(getUser);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(defaultFormData);
  const [isFindingMatches, setIsFindingMatches] = useState(false);
  const [locationError, setLocationError] = useState("");
  const locationInputRef = useRef(null);
  const locationAutocompleteRef = useRef(null);
  const locationGeocoderRef = useRef(null);
  const geocodeRequestIdRef = useRef(0);
  const mapsApiKey = getGoogleMapsApiKey();
  const requiresZipForStepSeven = Boolean(mapsApiKey);
  const currentStepValidationError = getStepValidationError(step, formData);
  const stepSevenZipError =
    step === 7 &&
    requiresZipForStepSeven &&
    String(formData?.location || "").trim().length > 0 &&
    !ZIP_CODE_REGEX.test(String(formData?.location || ""))
      ? "Please select a city suggestion so ZIP can be auto-filled, or enter a valid ZIP code."
      : null;
  const effectiveValidationError =
    currentStepValidationError || (step === 7 ? locationError || stepSevenZipError : null);

  const progressPercent = (step / TOTAL_STEPS) * 100;

  useEffect(() => {
    let draft = null;
    try {
      const raw = sessionStorage.getItem(INTAKE_DRAFT_STORAGE_KEY);
      if (raw) draft = JSON.parse(raw);
    } catch {
      draft = null;
    }

    if (!draft || typeof draft !== "object") return;
    const hasResumeSignal = Boolean(location.state?.resumeIntake);
    if (!hasResumeSignal && !isAuthenticated) return;

    const savedStep = Number(draft.step);
    const safeStep =
      Number.isFinite(savedStep) && savedStep >= 1 && savedStep <= TOTAL_STEPS
        ? Math.round(savedStep)
        : 1;
    const savedFormData =
      draft.formData && typeof draft.formData === "object"
        ? { ...defaultFormData, ...draft.formData }
        : defaultFormData;
    setStep(safeStep);
    setFormData(savedFormData);
  }, [location.state, isAuthenticated]);

  useEffect(() => {
    if (!isFindingMatches) return;
    let cancelled = false;
    const runMatch = async () => {
      const careLevels = [];
      if (formData.levelOfCare && LEVEL_TO_CARE_LEVEL[formData.levelOfCare]) {
        careLevels.push(LEVEL_TO_CARE_LEVEL[formData.levelOfCare]);
      }

      const amenityMustHaves = [
        ...(formData.lovedOneCare || []).map((id) => CARE_TO_AMENITY[id]).filter(Boolean),
        ...(formData.specialNeedsPreferences || [])
          .map((id) => SPECIAL_NEED_TO_AMENITY[id])
          .filter(Boolean),
      ];
      const finalScreenMustHaves = (formData.specialNeedsPreferences || [])
        .map((id) => SPECIAL_NEEDS_PREFERENCES.find((option) => option.id === id)?.label)
        .filter(Boolean);

      const matcherPayload = {
        careLevels: [...new Set(careLevels)],
        amenityMustHaves: [...new Set(amenityMustHaves)],
        budgetMaxMonthly: Number(formData.budgetMax) || null,
        searchLocation: String(formData.location || "").trim(),
        maxDistanceMiles: Number(formData.maxTravelMiles) || null,
        visitationImportance: "medium",
        personalityNotes: "",
        snfReadiness: formData.levelOfCare === "snf",
      };
      const zipFromSearchLocation = String(matcherPayload.searchLocation || "").match(
        /\b(\d{5})(?:-\d{4})?\b/,
      )?.[1] || "";
      const locationQueryForExplorer = zipFromSearchLocation
        ? String(matcherPayload.searchLocation || "")
            .replace(new RegExp(`\\b${zipFromSearchLocation}\\b`, "g"), "")
            .replace(/\s+/g, " ")
            .replace(/,\s*,/g, ", ")
            .replace(/^,\s*|\s*,$/g, "")
            .trim()
        : String(matcherPayload.searchLocation || "").trim();
      const mappedFilters = {
        source: "manualIntake",
        locationQuery: locationQueryForExplorer || matcherPayload.searchLocation,
        searchZipCode: zipFromSearchLocation || undefined,
        budgetMinMonthly: Number(formData.budgetMin) || null,
        budgetMaxMonthly: matcherPayload.budgetMaxMonthly,
        maxDistanceMiles: matcherPayload.maxDistanceMiles,
        careLevels: matcherPayload.careLevels,
        amenityMustHaves: matcherPayload.amenityMustHaves,
        availability: TIMELINE_TO_AVAILABILITY[formData.careTimeline] || "Within 30 Days",
        displayCriteria: {
          location: locationQueryForExplorer || matcherPayload.searchLocation,
          budgetMinMonthly: Number(formData.budgetMin) || null,
          budgetMaxMonthly: matcherPayload.budgetMaxMonthly,
          maxDistanceMiles: matcherPayload.maxDistanceMiles,
          mustHaveNeeds: finalScreenMustHaves,
          availability: formData.careTimeline
            ? TIMELINE_TO_AVAILABILITY[formData.careTimeline] || ""
            : "",
        },
      };
      const discoverPayload = {
        zip_code: matcherPayload.searchLocation,
        location: matcherPayload.searchLocation,
        care_levels:
          matcherPayload.careLevels.length > 0
            ? matcherPayload.careLevels
            : ["assisted living"],
        amenities: matcherPayload.amenityMustHaves,
        services: matcherPayload.amenityMustHaves,
        keywords: [
          mappedFilters.availability,
          String(formData.who || "").trim(),
          String(formData.parentAge || "").trim(),
          String(formData.livingNow || "").trim(),
          String(formData.mobility || "").trim(),
        ].filter(Boolean),
        budget_min: Number(formData.budgetMin) || null,
        budget_max: Number(formData.budgetMax) || null,
        max_distance_miles: Number(formData.maxTravelMiles) || null,
      };

      const startedAt = Date.now();
      try {
        let recs = [];
        let liveDiscoveryError = null;
        try {
          const { data } = await postDiscoverFacilities(discoverPayload);
          recs = Array.isArray(data?.facilities) ? data.facilities : [];
        } catch (error) {
          liveDiscoveryError = error;
        }

        // Fallback when live discovery errors OR returns zero rows.
        if (recs.length === 0) {
          // Fallback keeps the old non-scraping matcher flow alive.
          const { data } = await postMatchRecommendations(matcherPayload);
          recs = Array.isArray(data?.recommendations) ? data.recommendations : [];
        }

        if (recs.length === 0 && liveDiscoveryError) {
          const liveErrorMessage =
            liveDiscoveryError?.response?.data?.message ||
            liveDiscoveryError?.message ||
            "Live discovery could not return any matches.";
          toast.error("No matches found yet", {
            description: String(liveErrorMessage),
          });
        }
        if (cancelled) return;

        const elapsed = Date.now() - startedAt;
        const remaining = Math.max(0, FINDING_MATCHES_DURATION_MS - elapsed);
        window.setTimeout(() => {
          if (cancelled) return;
          navigate("/care-explorer", {
            state: {
              fromCarrie: true,
              carrieMatches: recs,
              carrieFilters: mappedFilters,
            },
          });
        }, remaining);
      } catch {
        if (cancelled) return;
        const elapsed = Date.now() - startedAt;
        const remaining = Math.max(0, FINDING_MATCHES_DURATION_MS - elapsed);
        window.setTimeout(() => {
          if (cancelled) return;
          navigate("/care-explorer", {
            state: {
              fromCarrie: true,
              carrieMatches: [],
              carrieFilters: {
                ...mappedFilters,
              },
            },
          });
        }, remaining);
      }
    };
    runMatch();
    return () => {
      cancelled = true;
    };
  }, [isFindingMatches, navigate, formData]);

  useEffect(() => {
    if (step !== 7 || !mapsApiKey) return;
    let cancelled = false;
    let attachTimer = null;

    const readAddressPart = (components, type, shortName = false) => {
      const list = Array.isArray(components) ? components : [];
      const found = list.find((item) => Array.isArray(item?.types) && item.types.includes(type));
      if (!found) return "";
      return String(shortName ? found.short_name : found.long_name || "").trim();
    };

    const buildLocationLabel = (components, fallback = "") => {
      const city =
        readAddressPart(components, "locality") ||
        readAddressPart(components, "postal_town") ||
        readAddressPart(components, "administrative_area_level_2");
      const state = readAddressPart(components, "administrative_area_level_1", true);
      const zip = readAddressPart(components, "postal_code");
      const cityState = [city, state].filter(Boolean).join(", ").trim();
      if (cityState && zip) return `${cityState} ${zip}`;
      if (cityState) return cityState;
      return String(fallback || "").trim();
    };

    const geocodeByLocation = (geoLocation, fallbackText = "") => {
      const geocoder = locationGeocoderRef.current;
      if (!geocoder || !geoLocation) return;
      geocoder.geocode({ location: geoLocation }, (results, status) => {
        if (cancelled) return;
        if (status !== "OK" || !Array.isArray(results) || !results[0]) return;
        const normalized = buildLocationLabel(results[0].address_components, fallbackText);
        if (normalized) {
          setFormData((prev) => ({ ...prev, location: normalized }));
          setLocationError("");
        }
      });
    };

    const attachAutocomplete = () => {
      const inputEl = locationInputRef.current;
      if (!inputEl || !window.google?.maps?.places) return;

      if (locationAutocompleteRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(locationAutocompleteRef.current);
      }

      locationAutocompleteRef.current = new window.google.maps.places.Autocomplete(inputEl, {
        types: ["(cities)"],
        componentRestrictions: { country: "us" },
        fields: ["address_components", "formatted_address", "geometry", "name"],
      });
      locationGeocoderRef.current = new window.google.maps.Geocoder();

      locationAutocompleteRef.current.addListener("place_changed", () => {
        if (cancelled) return;
        const place = locationAutocompleteRef.current.getPlace();
        const normalized = buildLocationLabel(
          place?.address_components,
          place?.formatted_address || place?.name || ""
        );

        if (normalized) {
          setFormData((prev) => ({ ...prev, location: normalized }));
          setLocationError("");
        }

        if (!ZIP_CODE_REGEX.test(normalized) && place?.geometry?.location) {
          geocodeByLocation(place.geometry.location, normalized);
        }
      });
    };

    loadGoogleMapsScript(mapsApiKey)
      .then(() => {
        if (cancelled) return;
        attachTimer = window.setTimeout(attachAutocomplete, 0);
      })
      .catch(() => {
        // Keep plain input behavior when maps cannot load.
      });

    return () => {
      cancelled = true;
      if (attachTimer) window.clearTimeout(attachTimer);
      if (locationAutocompleteRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(locationAutocompleteRef.current);
      }
    };
  }, [step, mapsApiKey]);

  const handleLocationBlur = () => {
    if (!mapsApiKey) return;
    const geocoder = locationGeocoderRef.current;
    if (!geocoder) return;

    const raw = String(formData.location || "").trim();
    if (!raw) {
      setLocationError("");
      return;
    }

    const requestId = ++geocodeRequestIdRef.current;
    const zipMatch = raw.match(ZIP_CODE_REGEX);
    const readAddressPart = (components, type, shortName = false) => {
      const list = Array.isArray(components) ? components : [];
      const found = list.find((item) => Array.isArray(item?.types) && item.types.includes(type));
      if (!found) return "";
      return String(shortName ? found.short_name : found.long_name || "").trim();
    };
    const buildLocationLabel = (components, fallback = "", zipOverride = "") => {
      const city =
        readAddressPart(components, "locality") ||
        readAddressPart(components, "postal_town") ||
        readAddressPart(components, "administrative_area_level_2");
      const state = readAddressPart(components, "administrative_area_level_1", true);
      const zip = zipOverride || readAddressPart(components, "postal_code");
      const cityState = [city, state].filter(Boolean).join(", ").trim();
      if (cityState && zip) return `${cityState} ${zip}`;
      if (cityState) return cityState;
      return String(fallback || "").trim();
    };

    if (zipMatch?.[1]) {
      const zip = zipMatch[1];
      geocoder.geocode(
        { address: zip, componentRestrictions: { country: "US" } },
        (results, status) => {
          if (requestId !== geocodeRequestIdRef.current) return;
          if (status !== "OK" || !Array.isArray(results) || !results[0]) {
            setLocationError("Please enter a valid US ZIP code.");
            return;
          }
          const firstZip = readAddressPart(results[0].address_components, "postal_code");
          if (firstZip && firstZip !== zip) {
            setLocationError("Please enter a valid US ZIP code.");
            return;
          }
          const normalized = buildLocationLabel(results[0].address_components, raw, zip);
          if (normalized) setFormData((prev) => ({ ...prev, location: normalized }));
          setLocationError("");
        }
      );
      return;
    }

    geocoder.geocode(
      { address: raw, componentRestrictions: { country: "US" } },
      (results, status) => {
        if (requestId !== geocodeRequestIdRef.current) return;
        if (status !== "OK" || !Array.isArray(results) || !results[0]) {
          setLocationError("Could not validate location. Select a city suggestion or add a ZIP code.");
          return;
        }
        const normalized = buildLocationLabel(results[0].address_components, raw);
        if (!ZIP_CODE_REGEX.test(normalized)) {
          setLocationError("Please select a city suggestion so we can auto-fetch ZIP.");
          return;
        }
        setFormData((prev) => ({ ...prev, location: normalized }));
        setLocationError("");
      }
    );
  };

  const goBack = () => {
    if (step > 1) setStep((s) => s - 1);
    else navigate(-1);
  };

  const isStepValid = () => {
    switch (step) {
      case 1: return !!formData.who;
      case 2: return !!formData.parentAge;
      case 3: return !!formData.careTimeline;
      case 4: return !!formData.livingNow;
      case 5: return !!formData.mobility;
      case 6: return formData.lovedOneCare && formData.lovedOneCare.length > 0;
      case 7:
        if (!formData.location || formData.location.trim().length === 0) return false;
        if (!requiresZipForStepSeven) return true;
        return ZIP_CODE_REGEX.test(String(formData.location || ""));
      case 8: return true;
      default: return true;
    }
  };

  const goNext = () => {
    if (!isStepValid()) {
      toast.error("Required Selection Missing", {
        description:
          effectiveValidationError || "Please select an option before moving to the next step.",
      });
      return;
    }

    if (step < TOTAL_STEPS) {
      console.log(`Step ${step} selection:`, formData);
      setStep((s) => s + 1);
    } else {
      console.log("Final Intake JSON:", JSON.stringify(formData, null, 2));
      setIsFindingMatches(true);
    }
  };

  const handleSaveAndFinishLater = () => {
    try {
      sessionStorage.setItem(
        INTAKE_DRAFT_STORAGE_KEY,
        JSON.stringify({ step, formData, savedAt: Date.now() }),
      );
    } catch {
      // Ignore storage write failures and continue auth redirect.
    }
    const hasPersistedSession =
      isAuthenticated ||
      (typeof window !== "undefined" && Boolean(localStorage.getItem("access_token")));

    if (hasPersistedSession) {
      toast.success("Progress saved. You can continue later.");
      navigate("/", { state: { fromIntakeSave: true } });
      return;
    }

    navigate("/register", {
      state: {
        from: {
          pathname: "/find-care",
          state: { resumeIntake: true },
        },
      },
    });
  };

  const update = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  const toggleArray = (key, id) => {
    setFormData((prev) => {
      const arr = prev[key] || [];
      const next = arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
      return { ...prev, [key]: next };
    });
  };

  if (isFindingMatches) {
    return (
      <>
        <SEO title="Finding Matches - CareMatch" />
        <style jsx global>{`
          @keyframes intakeFinderIconFloatStrong {
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

          @keyframes intakeFinderIconBounceStrong {
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

          @keyframes intakeFinderIconSpinStrong {
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

          @keyframes intakeFinderIconWobble {
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

          @keyframes intakeFinderIconRipple {
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

          .animate-intake-icon-float-strong {
            animation: intakeFinderIconFloatStrong 1.45s ease-in-out infinite;
            will-change: transform;
          }

          .animate-intake-icon-bounce-strong {
            animation: intakeFinderIconBounceStrong 1.2s ease-in-out infinite;
            will-change: transform;
          }

          .animate-intake-icon-spin-strong {
            animation: intakeFinderIconSpinStrong 1.3s linear infinite;
            will-change: transform;
          }

          .animate-intake-icon-wobble {
            animation: intakeFinderIconWobble 1.1s ease-in-out infinite;
            will-change: transform;
          }

          .animate-intake-icon-ripple {
            animation:
              intakeFinderIconFloatStrong 1.45s ease-in-out infinite,
              intakeFinderIconRipple 1.7s ease-out infinite;
            will-change: transform, box-shadow;
          }
        `}</style>
        <div
          className="min-h-screen flex flex-col items-center justify-center px-4 py-8 lg:py-12 bg-no-repeat"
          style={{
            backgroundImage: "url(/assets/images/overlay-searchbg.svg), url(/assets/images/seacrh-bg-img.png)",
            backgroundSize: "55% 70%, cover",
            backgroundPosition: "145% 100%, center",
          }}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-[#E2E8F0] bg-white shadow-xl px-8 py-10 sm:px-10 sm:py-12 text-center"
            style={{
              boxShadow: "0px 4px 6px -1px rgba(0,0,0,0.08), 0px 2px 4px -2px rgba(0,0,0,0.06)",
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
                className="absolute -top-1 -left-2 flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#00CFF4]/80 bg-white text-[#00CFF4] animate-intake-icon-float-strong shadow-[0_0_0_0_rgba(0,207,244,0.45)] animate-intake-icon-ripple"
                style={{ animationDelay: "0ms" }}
              >
                <Search className="h-4 w-4" />
              </div>
              <div
                className="absolute -top-1 -right-2 flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#38BDF8]/80 bg-white text-[#0EA5E9] animate-intake-icon-bounce-strong shadow-[0_0_16px_rgba(56,189,248,0.35)]"
                style={{ animationDelay: "100ms" }}
              >
                <MapPin className="h-4 w-4" />
              </div>
              <div
                className="absolute -bottom-1 -right-2 flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#22D3EE]/80 bg-white text-[#0891B2] animate-intake-icon-spin-strong shadow-[0_0_16px_rgba(34,211,238,0.35)]"
                style={{ animationDelay: "180ms" }}
              >
                <Compass className="h-4 w-4" />
              </div>
              <div
                className="absolute -bottom-1 -left-2 flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#2DD4BF]/80 bg-white text-[#0F766E] animate-intake-icon-wobble shadow-[0_0_14px_rgba(45,212,191,0.35)]"
                style={{ animationDelay: "260ms" }}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold italic text-[#1D293D] mb-3">
              Finding Your Matches...
            </h1>
            <p className="text-[#64748b] text-base mb-6 max-w-sm mx-auto">
              Reviewing care preferences
            </p>
            <ul className="text-left max-w-xs mx-auto space-y-2 text-[#334155]">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00CFF4] shrink-0" aria-hidden />
                Matching care needs...
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00CFF4] shrink-0" aria-hidden />
                Checking availability...
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00CFF4] shrink-0" aria-hidden />
                Calculating match scores....
              </li>
            </ul>
            <div className="mt-7 flex items-center justify-center gap-2 text-sm text-slate-600">
              <span className="h-4 w-4 rounded-full border-2 border-[#94a3b8]/40 border-t-[#00CFF4] animate-spin" />
              Please wait
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO title="Find Care - CareMatch" />
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4 py-8 lg:py-10 bg-no-repeat"
        style={{
          backgroundImage: "url(/assets/images/overlay-searchbg.svg), url(/assets/images/seacrh-bg-img.png)",
          backgroundSize: "55% 70%, cover",
          backgroundPosition: "145% 100%, center",
        }}
      >
        {/* Single white card: image left (fixed-height column), form right */}
        <div
          className="w-full max-w-5xl rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden shadow-lg flex flex-col lg:flex-row min-h-[32rem] lg:min-h-0 lg:items-stretch"
          style={{
            boxShadow: "0px 4px 6px -1px rgba(0,0,0,0.08), 0px 2px 4px -2px rgba(0,0,0,0.06)",
          }}
        >
          {/* Left: image in separate fixed-height div so form content changes don't move the picture */}
          <div className="hidden lg:block lg:w-[42%] xl:w-[40%] lg:min-w-0 lg:shrink-0 overflow-hidden rounded-l-2xl">
            <TiltCard className="h-full w-full" innerClassName="h-full w-full overflow-hidden rounded-l-2xl">
              <img
                src={step === 2 ? "/assets/images/youngPeople.svg" : step === 3 ? "/assets/images/girlForFindCare.svg" : step === 4 ? "/assets/images/oldMan.svg" : step === 5 ? "/assets/images/inCar.svg" : step === 6 ? "/assets/images/greetingPeople.svg" : step === 7 ? "/assets/images/crossingRoad.svg" : step === 8 ? "/assets/images/wheelChair.svg" : "/assets/images/search_img.svg"}
                alt=""
                className="h-full w-full object-cover object-center"
                aria-hidden
              />
            </TiltCard>
          </div>

          {/* Right: form content (can grow independently) */}
          <div className="flex-1 flex flex-col lg:min-w-0 min-h-0">
            <Progress value={progressPercent} className="h-1.5 w-full bg-[#e2e8f0] [&>div]:!bg-[#0ea5e9]" />

            <CardShell
              step={step}
              totalSteps={TOTAL_STEPS}
              progressPercent={progressPercent}
              onBack={goBack}
              onContinue={goNext}
              onSaveLater={handleSaveAndFinishLater}
              canContinue={!effectiveValidationError}
            >
              <StepContent
                step={step}
                formData={formData}
                update={update}
                setFormData={setFormData}
                toggleArray={toggleArray}
                locationInputRef={locationInputRef}
                onLocationBlur={handleLocationBlur}
                onLocationInputChange={() => setLocationError("")}
                locationError={locationError}
                requiresZipForStepSeven={requiresZipForStepSeven}
              />
            </CardShell>
          </div>
        </div>
      </div>
    </>
  );
}

function CardShell({
  step,
  totalSteps,
  progressPercent,
  onBack,
  onContinue,
  onSaveLater,
  canContinue = true,
  children,
}) {
  return (
    <div className="flex flex-col flex-1 w-full min-w-0 px-6 sm:px-8 lg:px-10 pt-6 sm:pt-8 lg:pt-10 pb-6 sm:pb-8 lg:pb-10">
      {/* Top section: Back + Step + track bar on top, then divider */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex  items-center gap-1.5 rounded-lg bg-[#F9F9F9] px-3.5 py-2 text-sm font-bold text-[#334155] hover:bg-[#e2e8f0] transition-colors border border-[#e2e8f0]"
            style={{ boxShadow: "0px 1px 2px -1px #0000001A, 0px 1px 3px 0px #0000001A" }}
          >
            <ArrowLeft className="h-4 w-4 text-[#1D293D]" />
            Back
          </button>
          <span className="text-sm font-normal text-[#6B7280]">
            Step {step}/{totalSteps}
          </span>
        </div>
        {/* Track bar: directly under nav, light grey track + cyan fill */}
      </div>
      {/* Divider below track bar, then main content */}
      <div className="border-b border-[#e2e8f0] mb-8" aria-hidden />

      {/* Main question + options - ample vertical spacing */}
      <div className="flex-1 min-h-0">
        {children}
      </div>

      {/* Action buttons: same width, substantial gap above and between */}
      <div className="mt-10 flex flex-col gap-4">
        <Button
          onClick={onContinue}
          disabled={!canContinue}
          className="h-14 w-full rounded-2xl bg-[#00CFF4] text-xl text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {step < totalSteps ? "Continue" : "See matching facilities"}
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
        <Button
          variant="secondary"
          onClick={onSaveLater}
          className="h-14 w-full rounded-2xl bg-[#1D2837] text-xl font-semibold text-white hover:bg-[#151d26] hover:text-white"
        >
          Save and finish later
        </Button>
      </div>
    </div>
  );
}

function StepContent({
  step,
  formData,
  update,
  setFormData,
  toggleArray,
  locationInputRef,
  onLocationBlur,
  onLocationInputChange,
  locationError,
  requiresZipForStepSeven,
}) {
  if (step === 1) {
    return (
      <>
        <h1 className="text-xl sm:text-2xl font-bold italic text-[#0f172a] mb-6 text-center w-full">
          Who is in need of a{" "}
          <span
            className="underline decoration-2 underline-offset-2 bg-clip-text text-transparent  pr-4"
            style={{ background: "linear-gradient(138.09deg, #FAAD60 20.61%, #F2987D 76.35%)", WebkitBackgroundClip: "text" }}
          >
            senior care?
          </span>
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {WHO_OPTIONS.map(({ id, label, desc, Icon }) => {
            const isSelected = formData.who === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => update("who", id)}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-xl border p-4 sm:p-5 text-left transition-all duration-200",
                  isSelected
                    ? "border-2 border-[#00CFF4] bg-[#F0FBFF] shadow-[inset_0_0_24px_rgba(0,207,244,0.04)]"
                    : "border border-[#F0F0F0] bg-white hover:border-[#E2E8F0]"
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    isSelected ? "bg-[#00CFF4]" : "bg-[#F8FAFC]"
                  )}
                  style={
                    !isSelected
                      ? { boxShadow: "0px 1px 2px -1px #0000001A, 0px 1px 3px 0px #0000001A" }
                      : undefined
                  }
                >
                  <Icon className={cn("h-5 w-5 shrink-0", isSelected ? "text-white" : "text-[#94a3b8]")} />
                </span>
                <span className={cn("font-bold", isSelected ? "text-[#00CFF4]" : "text-[#0f172a]")}>{label}</span>
                <span className={cn("text-sm font-normal leading-snug", isSelected ? "text-[#00b4d8]" : "text-[#64748b]")}>{desc}</span>
              </button>
            );
          })}
        </div>
      </>
    );
  }

  if (step === 2) {
    return (
      <>
        <h1 className="text-xl sm:text-2xl font-bold italic text-[#0f172a] mb-6 text-center">
          What&apos;s the{" "}
          <span
            className="underline decoration-2 underline-offset-2 bg-clip-text text-transparent pr-4"
            style={{ background: "linear-gradient(138.09deg, #FAAD60 20.61%, #F2987D 76.35%)", WebkitBackgroundClip: "text" }}
          >
            age?
          </span>

        </h1>
        <div className="grid grid-cols-2 gap-4 sm:gap-5 mb-6">
          {AGE_OPTIONS.map(({ id, label, Icon }) => {
            const isSelected = formData.parentAge === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => update("parentAge", id)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border p-4 sm:p-5 text-center transition-all duration-200",
                  isSelected
                    ? "border-2 border-[#00CFF4] bg-[#F0FBFF] shadow-[inset_0_0_24px_rgba(0,207,244,0.06)]"
                    : "border border-[#F0F0F0] bg-white hover:border-[#E2E8F0]"
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    isSelected ? "bg-[#00CFF4]" : "bg-[#F8FAFC]"
                  )}
                  style={
                    !isSelected
                      ? { boxShadow: "0px 1px 2px -1px #0000001A, 0px 1px 3px 0px #0000001A" }
                      : undefined
                  }
                >
                  <Icon className={cn("h-5 w-5 shrink-0", isSelected ? "text-white" : "text-[#94a3b8]")} />
                </span>
                <span className={cn("font-bold text-sm sm:text-base", isSelected ? "text-[#00CFF4]" : "text-[#0f172a]")}>{label}</span>
              </button>
            );
          })}
        </div>
        <div className="rounded-xl bg-[#F1F5F9] border border-[#E2E8F0] px-4 py-3 text-sm text-[#64748b]">
          <strong className="text-[#334155]">Important:</strong> Due to senior living community requirements, we are only able to assist those 55 years and older.
        </div>
      </>
    );
  }

  if (step === 3) {
    return (
      <>
        <h1 className="text-xl sm:text-2xl font-bold italic text-[#0f172a] mb-6 text-center">
          By when do you need{" "}
          <span
            className="underline decoration-2 underline-offset-2 bg-clip-text text-transparent pr-4"
            style={{ background: "linear-gradient(138.09deg, #FAAD60 20.61%, #F2987D 76.35%)", WebkitBackgroundClip: "text" }}
          >
            care assistance?
          </span>
        </h1>
        <div className="grid grid-cols-2 gap-4 sm:gap-5">
          {CARE_TIMELINE_OPTIONS.map(({ id, label, desc, Icon }) => {
            const isSelected = formData.careTimeline === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => update("careTimeline", id)}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-xl border p-4 sm:p-5 text-left transition-all duration-200",
                  isSelected
                    ? "border-2 border-[#00CFF4] bg-[#F0FBFF] shadow-[inset_0_0_24px_rgba(0,207,244,0.06)]"
                    : "border border-[#F0F0F0] bg-white hover:border-[#E2E8F0]"
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    isSelected ? "bg-[#00CFF4]" : "bg-[#F8FAFC]"
                  )}
                  style={
                    !isSelected
                      ? { boxShadow: "0px 1px 2px -1px #0000001A, 0px 1px 3px 0px #0000001A" }
                      : undefined
                  }
                >
                  <Icon className={cn("h-5 w-5 shrink-0", isSelected ? "text-white" : "text-[#94a3b8]")} />
                </span>
                <span className={cn("font-bold", isSelected ? "text-[#00CFF4]" : "text-[#0f172a]")}>{label}</span>
                <span className={cn("text-sm font-normal leading-snug", isSelected ? "text-[#00b4d8]" : "text-[#64748b]")}>{desc}</span>
              </button>
            );
          })}
        </div>
      </>
    );
  }

  if (step === 4) {
    return (
      <>
        <h1 className="text-xl sm:text-2xl font-bold italic text-[#0f172a] mb-6 text-center pr-3">
          Where are they{" "}
          <span
            className="underline decoration-2 underline-offset-2 bg-clip-text text-transparent pr-4"
            style={{ background: "linear-gradient(138.09deg, #FAAD60 20.61%, #F2987D 76.35%)", WebkitBackgroundClip: "text" }}
          >
            living now?
          </span>
        </h1>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {LIVING_NOW_OPTIONS.map(({ id, label, Icon }) => {
            const isSelected = formData.livingNow === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => update("livingNow", id)}
                className={cn(
                  "flex flex-col sm:flex-row items-center gap-2 rounded-xl border p-3 sm:p-4 text-left transition-all duration-200",
                  isSelected
                    ? "border-2 border-[#00CFF4] bg-[#F0FBFF] shadow-[inset_0_0_24px_rgba(0,207,244,0.06)]"
                    : "border border-[#F0F0F0] bg-white hover:border-[#E2E8F0]"
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    isSelected ? "bg-[#00CFF4]" : "bg-[#F8FAFC]"
                  )}
                  style={
                    !isSelected
                      ? { boxShadow: "0px 1px 2px -1px #0000001A, 0px 1px 3px 0px #0000001A" }
                      : undefined
                  }
                >
                  <Icon className={cn("h-5 w-5 shrink-0", isSelected ? "text-white" : "text-[#94a3b8]")} />
                </span>
                <span className={cn("font-bold text-sm sm:text-base", isSelected ? "text-[#00CFF4]" : "text-[#0f172a]")}>{label}</span>
              </button>
            );
          })}
        </div>
      </>
    );
  }

  if (step === 5) {
    return (
      <>
        <h1 className="text-xl sm:text-2xl font-bold italic text-[#0f172a] mb-6 text-center pr-3">
          What is their mobility{" "}
          <span
            className="underline decoration-2 underline-offset-2 bg-clip-text text-transparent pr-4"
            style={{ background: "linear-gradient(138.09deg, #FAAD60 20.61%, #F2987D 76.35%)", WebkitBackgroundClip: "text" }}
          >
            status?
          </span>
        </h1>
        <div className="grid grid-cols-2 gap-4 sm:gap-5">
          {MOBILITY_OPTIONS.map(({ id, label, desc, Icon }) => {
            const isSelected = formData.mobility === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => update("mobility", id)}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-xl border p-4 sm:p-5 text-left transition-all duration-200",
                  isSelected
                    ? "border-2 border-[#00CFF4] bg-[#F0FBFF] shadow-[inset_0_0_24px_rgba(0,207,244,0.06)]"
                    : "border border-[#F0F0F0] bg-white hover:border-[#E2E8F0]"
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    isSelected ? "bg-[#00CFF4]" : "bg-[#F8FAFC]"
                  )}
                  style={
                    !isSelected
                      ? { boxShadow: "0px 1px 2px -1px #0000001A, 0px 1px 3px 0px #0000001A" }
                      : undefined
                  }
                >
                  <Icon className={cn("h-5 w-5 shrink-0", isSelected ? "text-white" : "text-[#94a3b8]")} />
                </span>
                <span className={cn("font-bold", isSelected ? "text-[#00CFF4]" : "text-[#0f172a]")}>{label}</span>
                <span className={cn("text-sm font-normal leading-snug", isSelected ? "text-[#00b4d8]" : "text-[#64748b]")}>{desc}</span>
              </button>
            );
          })}
        </div>
      </>
    );
  }

  if (step === 6) {
    return (
      <>
        <h1 className="text-xl sm:text-2xl font-bold italic text-[#0f172a] mb-2 text-center">
          What else are you{" "}
          <span
            className="underline decoration-2 underline-offset-2 bg-clip-text text-transparent pr-4"
            style={{ background: "linear-gradient(138.09deg, #FAAD60 20.61%, #F2987D 76.35%)", WebkitBackgroundClip: "text" }}
          >
            looking for?
          </span>
        </h1>
        <p className="text-[#64748b] mb-6 text-center">Select all that apply.</p>
        <div className="space-y-3">
          {LOVED_ONE_CARE_OPTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => toggleArray("lovedOneCare", id)}
              className={cn(
                "w-full rounded-xl border-2 px-4 py-3 text-left font-bold transition-colors text-[#1D293D]",
                formData.lovedOneCare.includes(id)
                  ? "border-[#00CFF4] bg-[#F0FBFF]"
                  : "border-[#e2e8f0] bg-white hover:border-[#94a3b8]"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </>
    );
  }

  if (step === 7) {
    const budgetMin = formData.budgetMin ?? BUDGET_SLIDER_MIN;
    const budgetMax = formData.budgetMax ?? 6000;
    const formatBudget = (n) => (n >= BUDGET_SLIDER_MAX ? "$15,000+" : `$${n.toLocaleString()}`);
    return (
      <>
        <h1 className="text-xl sm:text-2xl font-bold italic text-[#0f172a] mb-2 text-center">
          Any preferred{" "}
          <span
            className="italic underline decoration-2 underline-offset-2 bg-clip-text text-transparent pr-1"
            style={{ background: "linear-gradient(138.09deg, #FAAD60 20.61%, #F2987D 76.35%)", WebkitBackgroundClip: "text" }}
          >
            location
          </span>{" "}
          &{" "}
          <span
            className="italic underline decoration-2 underline-offset-2 bg-clip-text text-transparent pr-1"
            style={{ background: "linear-gradient(138.09deg, #FAAD60 20.61%, #F2987D 76.35%)", WebkitBackgroundClip: "text" }}
          >
            budget
          </span>
          ?
        </h1>
        <p className="text-[#64748b] mb-6 text-center">Tell us your preferred location & budget so we can improve our search.</p>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="preferredLocation" className="text-[#334155] font-bold">Desired Location</Label>
            <Input
              id="preferredLocation"
              placeholder="Enter city, zip code, or address"
              ref={locationInputRef}
              value={formData.location}
              onChange={(e) => {
                update("location", e.target.value);
                if (typeof onLocationInputChange === "function") onLocationInputChange();
              }}
              onBlur={onLocationBlur}
              className="rounded-xl border-[#e2e8f0] h-12 placeholder:italic"
            />
            <p className="text-xs text-[#64748b]">
              {requiresZipForStepSeven
                ? "Start typing your city and choose from suggestions. ZIP will auto-fill."
                : "Enter city, ZIP code, or address."}
            </p>
            {locationError && <p className="text-xs text-[#DC2626]">{locationError}</p>}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[#334155] font-bold">How far are you willing to travel?</Label>
              <span className="text-sm font-semibold text-[#00CFF4]">
                {formData.maxTravelMiles >= MILES_SLIDER_MAX ? `${MILES_SLIDER_MAX}+ mi` : `${formData.maxTravelMiles} mi`}
              </span>
            </div>
            <Slider
              value={[formData.maxTravelMiles ?? MILES_SLIDER_MIN]}
              min={MILES_SLIDER_MIN}
              max={MILES_SLIDER_MAX}
              step={MILES_SLIDER_STEP}
              onValueChange={(v) => update("maxTravelMiles", Array.isArray(v) && v[0] != null ? v[0] : MILES_SLIDER_MIN)}
              className="py-4"
            />
            <div className="flex justify-between text-xs text-[#64748b] -mt-2">
              <span>{MILES_SLIDER_MIN} mi</span>
              <span>{MILES_SLIDER_MAX}+ mi</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[#334155] font-bold">What is your monthly budget?</Label>
              <span className="text-sm font-semibold text-[#00CFF4]">{formatBudget(budgetMin)} – {formatBudget(budgetMax)}</span>
            </div>
            <BudgetRangeSlider
              budgetMin={budgetMin}
              budgetMax={budgetMax}
              min={BUDGET_SLIDER_MIN}
              max={BUDGET_SLIDER_MAX}
              step={BUDGET_SLIDER_STEP}
              onRangeChange={(minVal, maxVal) => {
                setFormData((prev) => ({ ...prev, budgetMin: minVal, budgetMax: maxVal }));
              }}
            />
            <div className="flex justify-between text-xs text-[#64748b] -mt-2">
              <span>{formatBudget(BUDGET_SLIDER_MIN)}</span>
              <span>{formatBudget(BUDGET_SLIDER_MAX)}</span>
            </div>
          </div>
          <div className="rounded-xl bg-[#F1F5F9] border border-[#E2E8F0] px-4 py-3 text-sm text-[#64748b]">
            <strong className="text-[#334155]">Important:</strong> Most assisted living facilities range from $3,500–$7,000/month; memory care is typically $5,000–$9,000/month.
          </div>
        </div>
      </>
    );
  }

  /*
  if (step === 8) {
    const assistedOption = LEVEL_OF_CARE_OPTIONS.find((o) => o.id === "assisted");
    if (!assistedOption) return null;
    const { id, label, desc, Icon } = assistedOption;
    const isSelected = formData.levelOfCare === id;
    return (
      <>
        <h1 className="text-xl sm:text-2xl font-bold italic text-[#0f172a] mb-2 text-center">
          What&apos;s the{" "}
          <span
            className="underline decoration-2 underline-offset-2 bg-clip-text text-transparent pr-0.5"
            style={{ background: "linear-gradient(138.09deg, #FAAD60 20.61%, #F2987D 76.35%)", WebkitBackgroundClip: "text" }}
          >
            level of care
          </span>{" "}
          needed?
        </h1>
        <p className="text-[#64748b] mb-6 text-center">Select an option to help us match you with the facility they need.</p>
        <div className="flex min-h-[220px] items-center justify-center">
          <button
            type="button"
            onClick={() => update("levelOfCare", id)}
            className={cn(
              "w-full max-w-md rounded-2xl border-2 px-6 py-6 sm:px-8 sm:py-8 text-left transition-colors flex gap-4 sm:gap-5 items-start",
              isSelected
                ? "border-[#00CFF4] bg-[#e0f7fb] shadow-[inset_0_0_0_1px_rgba(0,207,244,0.2)]"
                : "border-[#e2e8f0] bg-white text-[#64748b] hover:border-[#94a3b8]"
            )}
          >
            <span
              className={cn(
                "flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-xl items-center justify-center",
                isSelected ? "bg-[#00CFF4]/20 text-[#00CFF4]" : "bg-[#f1f5f9] text-[#64748b]"
              )}
            >
              <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
            </span>
            <div className="min-w-0 flex-1">
              <span className={cn("block font-bold text-lg sm:text-xl text-[#0f172a]")}>
                {label}
              </span>
              <span className="text-sm sm:text-base text-[#64748b] mt-1 block">{desc}</span>
            </div>
          </button>
        </div>
      </>
    );
  }
  */

  if (step === 8) {
    return (
      <>
        <h1 className="text-xl sm:text-2xl font-bold italic text-[#0f172a] mb-2 text-center">
          Do they have other{" "}
          <span
            className="underline decoration-2 underline-offset-2 bg-clip-text text-transparent pr-1"
            style={{ background: "linear-gradient(138.09deg, #FAAD60 20.61%, #F2987D 76.35%)", WebkitBackgroundClip: "text" }}
          >
            special needs
          </span>
          ?
        </h1>
        <p className="text-[#64748b] mb-4 text-center">Optional: select any preferences to improve matching, or continue to see facilities.</p>
        <div className="space-y-2 mb-4">
          <Label className="text-[#334155]">Select Preferences &amp; Needs</Label>
          <div className="min-h-[3.5rem] rounded-xl border-2 border-[#e2e8f0] bg-white px-4 py-3 flex flex-wrap gap-2 items-center">
            {formData.specialNeedsPreferences.length === 0 ? (
              <span className="text-[#64748b] text-sm">Select options below</span>
            ) : (
              formData.specialNeedsPreferences.map((id) => {
                const opt = SPECIAL_NEEDS_PREFERENCES.find((o) => o.id === id);
                return opt ? (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#E0EDFF] px-3 py-1.5 text-sm font-medium text-[#155DFC]"
                  >
                    {opt.label}
                    <button
                      type="button"
                      onClick={() => toggleArray("specialNeedsPreferences", id)}
                      className="p-0.5 rounded hover:bg-[#155DFC]/20 text-[#155DFC]"
                      aria-label={`Remove ${opt.label}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ) : null;
              })
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {SPECIAL_NEEDS_PREFERENCES.map(({ id, label }) => {
            const selected = formData.specialNeedsPreferences.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleArray("specialNeedsPreferences", id)}
                className={cn(
                  "rounded-xl border-2 px-4 py-3 font-bold transition-colors inline-flex items-center gap-2",
                  selected
                    ? "border-[#155DFC] bg-[#E0EDFF] text-[#155DFC]"
                    : "border-[#e2e8f0] bg-[#f8fafc] text-[#62748E] hover:border-[#94a3b8]"
                )}
              >
                {selected && <Check className="h-4 w-4 shrink-0" />}
                {label}
              </button>
            );
          })}
        </div>
      </>
    );
  }

  // Steps 10–16 commented out – flow ends at step 8
  // if (step === 10) {
  //   return (
  //     <>
  //       <h1 className="text-xl sm:text-2xl font-bold italic text-[#0f172a] mb-2">
  //         What type of care do you need?
  //       </h1>
  //       <p className="text-[#64748b] mb-6">Select all that apply.</p>
  //       <div className="flex flex-wrap gap-3">
  //         {CARE_TYPES.map(({ id, label }) => (
  //           <button
  //             key={id}
  //             type="button"
  //             onClick={() => toggleArray("careTypes", id)}
  //             className={cn(
  //               "rounded-xl border-2 px-4 py-3 font-bold transition-colors",
  //               formData.careTypes.includes(id)
  //                 ? "border-[#0ea5e9] bg-[#e0f2fe] text-[#0f172a]"
  //                 : "border-[#e2e8f0] bg-white text-[#64748b] hover:border-[#94a3b8]"
  //             )}
  //           >
  //             {label}
  //           </button>
  //         ))}
  //       </div>
  //     </>
  //   );
  // }

  // if (step === 11) {
  //   return (
  //     <>
  //       <h1 className="text-xl sm:text-2xl font-bold italic text-[#0f172a] mb-2">
  //         What is your budget range?
  //       </h1>
  //       <p className="text-[#64748b] mb-6">Monthly cost estimate helps us match you to affordable options.</p>
  //       <div className="space-y-3">
  //         {BUDGET_RANGES.map(({ id, label }) => (
  //           <button
  //             key={id}
  //             type="button"
  //             onClick={() => update("budget", id)}
  //             className={cn(
  //               "w-full rounded-xl border-2 px-4 py-3 text-left font-bold transition-colors",
  //               formData.budget === id
  //                 ? "border-[#0ea5e9] bg-[#e0f2fe] text-[#0f172a]"
  //                 : "border-[#e2e8f0] bg-white text-[#64748b] hover:border-[#94a3b8]"
  //             )}
  //           >
  //             {label}
  //           </button>
  //         ))}
  //       </div>
  //     </>
  //   );
  // }

  // if (step === 12) {
  //   return (
  //     <>
  //       <h1 className="text-xl sm:text-2xl font-bold italic text-[#0f172a] mb-2">
  //         When do you need care?
  //       </h1>
  //       <p className="text-[#64748b] mb-6">This helps us prioritize your search.</p>
  //       <div className="space-y-3">
  //         {URGENCY_OPTIONS.map(({ id, label }) => (
  //           <button
  //             key={id}
  //             type="button"
  //             onClick={() => update("urgency", id)}
  //             className={cn(
  //               "w-full rounded-xl border-2 px-4 py-3 text-left font-bold transition-colors",
  //               formData.urgency === id
  //                 ? "border-[#0ea5e9] bg-[#e0f2fe] text-[#0f172a]"
  //                 : "border-[#e2e8f0] bg-white text-[#64748b] hover:border-[#94a3b8]"
  //             )}
  //           >
  //             {label}
  //           </button>
  //         ))}
  //       </div>
  //     </>
  //   );
  // }

  // if (step === 13) {
  //   const amenities = [
  //     { id: "dining", label: "Dining / Meals" },
  //     { id: "activities", label: "Activities & outings" },
  //     { id: "therapy", label: "Physical / OT therapy" },
  //     { id: "memory", label: "Memory programs" },
  //     { id: "medical", label: "On-site medical" },
  //     { id: "transport", label: "Transportation" },
  //   ];
  //   return (
  //     <>
  //       <h1 className="text-xl sm:text-2xl font-bold italic text-[#0f172a] mb-2">
  //         Which amenities matter most?
  //       </h1>
  //       <p className="text-[#64748b] mb-6">Select any that are important to you.</p>
  //       <div className="flex flex-wrap gap-3">
  //         {amenities.map(({ id, label }) => (
  //           <button
  //             key={id}
  //             type="button"
  //             onClick={() => toggleArray("amenities", id)}
  //             className={cn(
  //               "rounded-xl border-2 px-4 py-3 font-bold transition-colors",
  //               formData.amenities.includes(id)
  //                 ? "border-[#0ea5e9] bg-[#e0f2fe] text-[#0f172a]"
  //                 : "border-[#e2e8f0] bg-white text-[#64748b] hover:border-[#94a3b8]"
  //             )}
  //           >
  //             {label}
  //           </button>
  //         ))}
  //       </div>
  //     </>
  //   );
  // }

  // if (step === 14) {
  //   return (
  //     <>
  //       <h1 className="text-xl sm:text-2xl font-bold italic text-[#0f172a] mb-2">
  //         How far are you willing to travel?
  //       </h1>
  //       <p className="text-[#64748b] mb-6">Maximum distance from your location for visits.</p>
  //       <div className="space-y-2">
  //         <Label htmlFor="maxMiles" className="text-[#334155]">Max distance (miles)</Label>
  //         <Input
  //           id="maxMiles"
  //           type="number"
  //           placeholder="e.g. 25"
  //           value={formData.maxMiles}
  //           onChange={(e) => update("maxMiles", e.target.value)}
  //           className="rounded-xl border-[#e2e8f0] h-12"
  //         />
  //       </div>
  //     </>
  //   );
  // }

  // if (step === 15) {
  //   const lifestyles = [
  //     { id: "quiet", label: "Quiet & calm" },
  //     { id: "active", label: "Active & social" },
  //     { id: "faith", label: "Faith-based" },
  //     { id: "outdoors", label: "Outdoor access" },
  //   ];
  //   return (
  //     <>
  //       <h1 className="text-xl sm:text-2xl font-bold italic text-[#0f172a] mb-2">
  //         How often will family visit?
  //       </h1>
  //       <p className="text-[#64748b] mb-4">Helps us factor in visitation when matching.</p>
  //       <div className="space-y-2 mb-6">
  //         <Label htmlFor="visitFrequency" className="text-[#334155]">Visit frequency</Label>
  //         <Input
  //           id="visitFrequency"
  //           placeholder="e.g. Weekly, Daily, Monthly"
  //           value={formData.visitFrequency}
  //           onChange={(e) => update("visitFrequency", e.target.value)}
  //           className="rounded-xl border-[#e2e8f0] h-12"
  //         />
  //       </div>
  //       <h2 className="text-lg font-bold text-[#0f172a] mb-2">Lifestyle or personality preferences</h2>
  //       <p className="text-[#64748b] mb-4">Optional — we use this to improve fit.</p>
  //       <div className="flex flex-wrap gap-3 mb-6">
  //         {lifestyles.map(({ id, label }) => (
  //           <button
  //             key={id}
  //             type="button"
  //             onClick={() => update("lifestyle", formData.lifestyle === id ? "" : id)}
  //             className={cn(
  //               "rounded-xl border-2 px-4 py-3 font-bold transition-colors",
  //               formData.lifestyle === id
  //                 ? "border-[#0ea5e9] bg-[#e0f2fe] text-[#0f172a]"
  //                 : "border-[#e2e8f0] bg-white text-[#64748b] hover:border-[#94a3b8]"
  //             )}
  //           >
  //             {label}
  //           </button>
  //         ))}
  //       </div>
  //       <div className="space-y-2">
  //         <Label htmlFor="specialNeeds" className="text-[#334155]">Special needs or notes</Label>
  //         <Input
  //           id="specialNeeds"
  //           placeholder="e.g. diabetic care, wheelchair access"
  //           value={formData.specialNeeds}
  //           onChange={(e) => update("specialNeeds", e.target.value)}
  //           className="rounded-xl border-[#e2e8f0] h-12"
  //         />
  //       </div>
  //     </>
  //   );
  // }

  // if (step === 16) {
  //   const whoLabel = WHO_OPTIONS.find((o) => o.id === formData.who)?.label || "—";
  //   const ageLabel = AGE_OPTIONS.find((a) => a.id === formData.parentAge)?.label || "—";
  //   const timelineLabel = CARE_TIMELINE_OPTIONS.find((t) => t.id === formData.careTimeline)?.label || "—";
  //   const livingNowLabel = LIVING_NOW_OPTIONS.find((l) => l.id === formData.livingNow)?.label || "—";
  //   const mobilityLabel = MOBILITY_OPTIONS.find((m) => m.id === formData.mobility)?.label || "—";
  //   const lovedOneCareLabel = formData.lovedOneCare.length
  //     ? formData.lovedOneCare.map((id) => LOVED_ONE_CARE_OPTIONS.find((o) => o.id === id)?.label).join(", ")
  //     : "—";
  //   const levelOfCareLabel = LEVEL_OF_CARE_OPTIONS.find((o) => o.id === formData.levelOfCare)?.label || "—";
  //   const specialNeedsLabel = formData.specialNeedsPreferences.length
  //     ? formData.specialNeedsPreferences.map((id) => SPECIAL_NEEDS_PREFERENCES.find((o) => o.id === id)?.label).filter(Boolean).join(", ")
  //     : "—";
  //   const careLabel = formData.careTypes.length
  //     ? formData.careTypes.map((id) => CARE_TYPES.find((c) => c.id === id)?.label).join(", ")
  //     : "—";
  //   const budgetLabel = BUDGET_RANGES.find((b) => b.id === formData.budget)?.label || "—";
  //   const urgencyLabel = URGENCY_OPTIONS.find((u) => u.id === formData.urgency)?.label || "—";
  //   const budgetMin = formData.budgetMin ?? BUDGET_SLIDER_MIN;
  //   const budgetMax = formData.budgetMax ?? 6000;
  //   const formatBudget = (n) => (n >= BUDGET_SLIDER_MAX ? "$15,000+" : `$${n.toLocaleString()}`);
  //   const budgetRangeLabel = `${formatBudget(budgetMin)} - ${formatBudget(budgetMax)}`;
  //   return (
  //     <>
  //       <h1 className="text-xl sm:text-2xl font-bold italic text-[#0f172a] mb-2">
  //         Review your search criteria
  //       </h1>
  //       <p className="text-[#64748b] mb-6">
  //         Click &quot;See matching facilities&quot; to get your personalized list.
  //       </p>
  //       <dl className="space-y-3 text-sm">
  //         <div><dt className="text-[#64748b]">Who needs care</dt><dd className="font-medium text-[#0f172a]">{whoLabel}</dd></div>
  //         <div><dt className="text-[#64748b]">Age range</dt><dd className="font-medium text-[#0f172a]">{ageLabel}</dd></div>
  //         <div><dt className="text-[#64748b]">Care timeline</dt><dd className="font-medium text-[#0f172a]">{timelineLabel}</dd></div>
  //         <div><dt className="text-[#64748b]">Living now</dt><dd className="font-medium text-[#0f172a]">{livingNowLabel}</dd></div>
  //         <div><dt className="text-[#64748b]">Mobility</dt><dd className="font-medium text-[#0f172a]">{mobilityLabel}</dd></div>
  //         <div><dt className="text-[#64748b]">Care needs (loved one)</dt><dd className="font-medium text-[#0f172a]">{lovedOneCareLabel}</dd></div>
  //         <div><dt className="text-[#64748b]">Location</dt><dd className="font-medium text-[#0f172a]">{formData.location || "—"}</dd></div>
  //         <div><dt className="text-[#64748b]">Level of care</dt><dd className="font-medium text-[#0f172a]">{levelOfCareLabel}</dd></div>
  //         <div><dt className="text-[#64748b]">Special needs / preferences</dt><dd className="font-medium text-[#0f172a]">{specialNeedsLabel}</dd></div>
  //         <div><dt className="text-[#64748b]">Monthly budget range</dt><dd className="font-medium text-[#0f172a]">{budgetRangeLabel}</dd></div>
  //         <div><dt className="text-[#64748b]">Care type(s)</dt><dd className="font-medium text-[#0f172a]">{careLabel}</dd></div>
  //         <div><dt className="text-[#64748b]">Budget</dt><dd className="font-medium text-[#0f172a]">{budgetLabel}</dd></div>
  //         <div><dt className="text-[#64748b]">When</dt><dd className="font-medium text-[#0f172a]">{urgencyLabel}</dd></div>
  //         <div><dt className="text-[#64748b]">Max distance</dt><dd className="font-medium text-[#0f172a]">{formData.maxMiles ? `${formData.maxMiles} mi` : "—"}</dd></div>
  //       </dl>
  //     </>
  //   );
  // }

  return null;
}
