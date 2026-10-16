import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, FileUp, Loader2, MessageCircle, Mic } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { sendChatMessages, transcribeAudioBlob } from "@/services/chatService";
import {
  postDiscoverFacilities,
  postExtractSearchZip,
} from "@/services/matchService";
import { getGoogleMapsApiKey, loadGoogleMapsScript } from "@/lib/loadGoogleMaps";
import LoadingOverlay from "@/components/client/LoadingOverlay";

const UPLOAD_MEDICAL_DOC_TIP =
  "Get better matches by uploading a medical document. We only use it to find better facilities for you, and it does not breach the patient's privacy policy.";

const HOME_MEDICAL_DOC_INPUT_ID = "home-marketplace-medical-doc-upload";

export default function SearchBar() {
  const navigate = useNavigate();
  const DEFAULT_SEARCH_MAX_MILES = 25;
  /** Default Care Explorer slider after quick search (discover does not filter by this on the server). */
  const DEFAULT_BUDGET_MIN = 3000;
  const DEFAULT_BUDGET_MAX = 9000;
  const thinkingMessages = [
    "Reviewing care preferences",
    "Comparing nearby communities",
    "Ranking the strongest matches",
    "Checking care and lifestyle fit",
  ];
  const [query, setQuery] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatComposer, setChatComposer] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [isQuickSearching, setIsQuickSearching] = useState(false);
  const [isExtractingZip, setIsExtractingZip] = useState(false);
  const [thinkingMessageIndex, setThinkingMessageIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [queryCoords, setQueryCoords] = useState(null);
  const inputRef = useRef(null);
  const docUploadRef = useRef(null);
  const chatComposerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const audioChunksRef = useRef([]);
  const typingTimerRef = useRef(null);
  const recordingToastIdRef = useRef(null);
  const transcribingToastIdRef = useRef(null);
  const isChatOpenRef = useRef(false);
  const chatMessagesRef = useRef(chatMessages);
  const locationAutocompleteRef = useRef(null);
  const locationGeocoderRef = useRef(null);
  const activePacInputRef = useRef(null);

  useEffect(() => {
    chatMessagesRef.current = chatMessages;
  }, [chatMessages]);

  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
    window.dispatchEvent(
      new CustomEvent("carematch:chat-open-change", {
        detail: { isOpen: isChatOpen },
      })
    );
  }, [isChatOpen]);

  useEffect(() => {
    if (!isChatOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatOpen]);

  useEffect(() => {
    if (!isChatOpen) return;
    const id = window.setTimeout(() => {
      chatComposerRef.current?.focus();
    }, 200);
    return () => window.clearTimeout(id);
  }, [isChatOpen]);

  useEffect(() => {
    const apiKey = getGoogleMapsApiKey();
    if (!apiKey || !inputRef.current) return;
    let cancelled = false;
    const attachAutocomplete = () => {
      if (cancelled || !inputRef.current || !window.google?.maps?.places) return;
      if (locationAutocompleteRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(locationAutocompleteRef.current);
      }
      locationAutocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          types: ["geocode"],
          componentRestrictions: { country: "us" },
          fields: ["address_components", "formatted_address", "geometry", "name"],
        },
      );
      locationGeocoderRef.current = new window.google.maps.Geocoder();
      locationAutocompleteRef.current.addListener("place_changed", () => {
        const place = locationAutocompleteRef.current.getPlace();
        if (!place || cancelled) return;
        const comps = place.address_components || [];
        const city =
          comps.find((c) => c.types.includes("locality"))?.long_name ||
          comps.find((c) => c.types.includes("postal_town"))?.long_name ||
          comps.find((c) => c.types.includes("administrative_area_level_2"))?.long_name ||
          "";
        const state =
          comps.find((c) => c.types.includes("administrative_area_level_1"))?.short_name ||
          "";
        let zip =
          comps.find((c) => c.types.includes("postal_code"))?.long_name || "";
        let label = "";
        if (city && state) {
          label = `${city}, ${state}`;
        } else {
          label = place.formatted_address || place.name || "";
        }
        const geocodeByLocation = (geoLocation, fallbackText = "") => {
          const geocoder = locationGeocoderRef.current;
          if (!geocoder || !geoLocation) return;
          geocoder.geocode({ location: geoLocation }, (results, status) => {
            if (status !== "OK" || !Array.isArray(results) || !results[0]) return;
            const zipComp =
              results[0].address_components?.find((c) => c.types.includes("postal_code"))?.long_name ||
              "";
            if (zipComp) {
              zip = zipComp;
              setQuery(`${fallbackText} ${zipComp}`.trim());
            } else {
              setQuery(fallbackText.trim());
            }
          });
        };
        if (!zip && place?.geometry?.location) {
          try {
            setQueryCoords({
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            });
          } catch {
            setQueryCoords(null);
          }
          geocodeByLocation(place.geometry.location, label);
          return;
        }
        if (place?.geometry?.location) {
          try {
            setQueryCoords({
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            });
          } catch {
            setQueryCoords(null);
          }
        }
        setQuery([label, zip].filter(Boolean).join(" ").trim());
      });
    };

    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (cancelled) return;
        attachAutocomplete();
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (locationAutocompleteRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(locationAutocompleteRef.current);
      }
    };
  }, []);

  const pickPacContainer = () => {
    const pacContainers = Array.from(document.querySelectorAll(".pac-container"));
    if (pacContainers.length === 0) return null;
    const visible = pacContainers.filter(
      (pac) => pac.style.display !== "none" && pac.offsetParent !== null,
    );
    if (visible.length === 1) return visible[0];
    if (visible.length > 1 && inputRef.current) {
      const inputRect = inputRef.current.getBoundingClientRect();
      return visible.reduce((best, pac) => {
        const distance = Math.abs(pac.getBoundingClientRect().top - inputRect.bottom);
        const bestDistance = Math.abs(best.getBoundingClientRect().top - inputRect.bottom);
        return distance < bestDistance ? pac : best;
      }, visible[0]);
    }
    return pacContainers[pacContainers.length - 1];
  };

  const hidePacContainers = () => {
    const pacContainers = Array.from(document.querySelectorAll(".pac-container"));
    pacContainers.forEach((node) => {
      node.style.display = "none";
      node.style.visibility = "hidden";
      node.style.pointerEvents = "none";
    });
  };

  const syncPacContainer = () => {
    if (!inputRef.current) return;
    const pacContainers = Array.from(document.querySelectorAll(".pac-container"));
    const pac = pickPacContainer();
    if (!pac) return;
    const rect = inputRef.current.getBoundingClientRect();
    const isInViewport = rect.bottom > 100 && rect.top < window.innerHeight;
    if (!isInViewport) {
      hidePacContainers();
      return;
    }
    // Keep dropdown aligned with input while page scrolls.
    pac.style.position = "absolute";
    pac.style.top = `${Math.round(rect.bottom + window.scrollY + 2)}px`;
    pac.style.left = `${Math.round(rect.left + window.scrollX)}px`;
    pac.style.width = `${Math.round(rect.width)}px`;
    pac.style.zIndex = "1001";
    pac.style.display = "block";
    pac.style.visibility = "visible";
    pac.style.pointerEvents = "auto";
    pacContainers.forEach((node) => {
      if (node !== pac) {
        node.style.display = "none";
        node.style.visibility = "hidden";
        node.style.pointerEvents = "none";
      }
    });
  };

  useEffect(() => {
    const handleSync = () => {
      if (document.activeElement !== inputRef.current) {
        hidePacContainers();
        return;
      }
      syncPacContainer();
    };
    window.addEventListener("scroll", handleSync, true);
    window.addEventListener("resize", handleSync);
    return () => {
      window.removeEventListener("scroll", handleSync, true);
      window.removeEventListener("resize", handleSync);
    };
  }, []);

  useEffect(() => {
    if (typeof MutationObserver === "undefined") return undefined;
    let frame = null;
    const observer = new MutationObserver(() => {
      if (document.activeElement !== activePacInputRef.current) return;
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        syncPacContainer();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!chatSending) {
      setThinkingMessageIndex(0);
      return;
    }
    const intervalId = window.setInterval(() => {
      setThinkingMessageIndex((prev) => (prev + 1) % thinkingMessages.length);
    }, 1800);
    return () => window.clearInterval(intervalId);
  }, [chatSending]);

  useEffect(() => {
    const onOpenChatRequest = () => {
      openChatPanel();
    };
    window.addEventListener("carematch:open-chat-request", onOpenChatRequest);
    return () => {
      window.removeEventListener("carematch:open-chat-request", onOpenChatRequest);
    };
  }, []);

  const handleSearch = () => {
    navigate("/find-care");
  };

  const focusChatComposer = () => {
    window.requestAnimationFrame(() => {
      chatComposerRef.current?.focus();
    });
  };

  const openChatPanel = () => {
    setIsChatOpen(true);
    focusChatComposer();
  };

  const buildApiMessages = (priorMessages, userText) => [
    ...priorMessages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.text })),
    { role: "user", content: userText },
  ];

  const toFiveDigitZip = (value) =>
    String(value || "")
      .replace(/\D/g, "")
      .slice(0, 5);

  const toPositiveNumberOrNull = (value) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const parseBudgetNumber = (value) => {
    if (value == null) return null;
    const parsed = Number.parseInt(String(value).replace(/[^\d]+/g, ""), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };

  const hasBudgetRangeInCarriePrefs = (prefs) => {
    const safePrefs = prefs && typeof prefs === "object" ? prefs : {};
    const minBudget = parseBudgetNumber(
      safePrefs.budgetMinMonthly ?? safePrefs.budgetMin ?? safePrefs.budget_min
    );
    const maxBudget = parseBudgetNumber(
      safePrefs.budgetMaxMonthly ?? safePrefs.budgetMax ?? safePrefs.budget_max
    );
    return minBudget != null || maxBudget != null;
  };

  const buildDiscoverPayloadFromCarriePrefs = (prefs) => {
    const safePrefs = prefs && typeof prefs === "object" ? prefs : {};
    const rawLocation =
      String(safePrefs.searchLocation || safePrefs.locationQuery || "").trim();
    const zipFromPrefs = toFiveDigitZip(safePrefs.searchZipCode);
    const zipFromLocation = toFiveDigitZip(rawLocation.match(/\b(\d{5})(?:-\d{4})?\b/)?.[1]);
    const zipCode = zipFromPrefs || zipFromLocation;
    const location = rawLocation || zipCode;
    const careLevels = Array.isArray(safePrefs.careLevels)
      ? safePrefs.careLevels.map((x) => String(x || "").trim()).filter(Boolean)
      : [];
    const maxDistance =
      toPositiveNumberOrNull(
        safePrefs.maxDistanceMiles ??
          safePrefs.max_distance_miles ??
          DEFAULT_SEARCH_MAX_MILES,
      ) ?? DEFAULT_SEARCH_MAX_MILES;

    return {
      zip_code: zipCode || location,
      location,
      care_levels: careLevels.length > 0 ? careLevels : resolvedCareLevels,
      amenities: Array.isArray(safePrefs.amenityMustHaves)
        ? safePrefs.amenityMustHaves.map((x) => String(x || "").trim()).filter(Boolean)
        : [],
      services: [],
      keywords: [],
      max_distance_miles: Math.round(maxDistance),
    };
  };

  const sendCarrieReply = async (text, { restoreToQuery, restoreToComposer } = {}) => {
    const trimmed = text.trim();
    if (!trimmed || chatSending) return;
    const userEntry = { id: `${Date.now()}-u`, role: "user", text: trimmed };
    const apiPayload = buildApiMessages(chatMessagesRef.current, trimmed);

    setChatSending(true);
    setChatMessages((prev) => [...prev, userEntry]);
    setIsChatOpen(true);

    try {
      const { data } = await sendChatMessages(apiPayload);
      const reply = data?.message;
      let matches = Array.isArray(data?.matchedFacilities) ? data.matchedFacilities : [];
      const matchedPreferences = data?.matchedPreferences;

      if (matchedPreferences) {
        const discoverPayload = buildDiscoverPayloadFromCarriePrefs(matchedPreferences);
        const canRunDiscover =
          String(discoverPayload?.location || "").trim().length > 0 ||
          String(discoverPayload?.zip_code || "").trim().length > 0;

        if (canRunDiscover) {
          try {
            const discoverRes = await postDiscoverFacilities(discoverPayload);
            const discoverMatches = Array.isArray(discoverRes?.data?.facilities)
              ? discoverRes.data.facilities
              : [];
            if (discoverMatches.length > 0 || matches.length === 0) {
              matches = discoverMatches;
            }
          } catch (discoverErr) {
            console.error(
              "[SearchBar] discover fetch from chat preferences failed:",
              discoverErr?.message || discoverErr
            );
          }
        }

        setIsChatOpen(false);
        navigate("/care-explorer", {
          state: {
            carrieMatches: Array.isArray(matches) ? matches : [],
            carrieFilters: {
              ...(matchedPreferences || {}),
              // Preserve user-entered budget range from chat when present; otherwise keep default slider.
              skipInitialBudgetPrefill: !hasBudgetRangeInCarriePrefs(matchedPreferences),
            },
            fromCarrie: true,
            searchSource: "carrie",
          },
        });
        return;
      }

      if (reply?.role === "assistant" && reply?.content) {
        setChatMessages((prev) => [
          ...prev,
          { id: `${Date.now()}-a`, role: "assistant", text: reply.content },
        ]);
      } else {
        toast.error("No reply from Carrie");
        setChatMessages((prev) => prev.filter((m) => m.id !== userEntry.id));
        if (restoreToQuery) setQuery(trimmed);
        if (restoreToComposer) setChatComposer(trimmed);
      }
    } catch (err) {
      const desc =
        err?.response?.data?.message || err?.message || "Chat request failed.";
      toast.error("Carrie couldn’t respond", { description: desc });
      setChatMessages((prev) => prev.filter((m) => m.id !== userEntry.id));
      if (restoreToQuery) setQuery(trimmed);
      if (restoreToComposer) setChatComposer(trimmed);
    } finally {
      setChatSending(false);
      focusChatComposer();
    }
  };

  const resolvedCareLevels = useMemo(() => ["assisted living"], []);

  const resolvePlaceFromAddress = async (address) => {
    const q = String(address || "").trim();
    if (!q) return null;
    try {
      const apiKey = getGoogleMapsApiKey();
      if (apiKey) await loadGoogleMapsScript(apiKey);
    } catch {
      // continue if Maps already loaded
    }
    if (!window.google?.maps?.Geocoder) return null;
    const geocoder = locationGeocoderRef.current || new window.google.maps.Geocoder();
    return new Promise((resolve) => {
      geocoder.geocode({ address: q, componentRestrictions: { country: "US" } }, (results, status) => {
        if (status !== "OK" || !Array.isArray(results) || !results[0]) {
          resolve(null);
          return;
        }
        const place = results[0];
        const loc = place.geometry?.location;
        const comps = place.address_components || [];
        const city =
          comps.find((c) => c.types.includes("locality"))?.long_name ||
          comps.find((c) => c.types.includes("postal_town"))?.long_name ||
          comps.find((c) => c.types.includes("sublocality"))?.long_name ||
          "";
        const state =
          comps.find((c) => c.types.includes("administrative_area_level_1"))?.short_name ||
          "";
        const postal =
          comps.find((c) => c.types.includes("postal_code"))?.long_name || "";
        const cityLabel =
          city && state ? `${city}, ${state}` : city || state || "";
        resolve({
          latitude:
            loc && Number.isFinite(loc.lat()) ? loc.lat() : null,
          longitude:
            loc && Number.isFinite(loc.lng()) ? loc.lng() : null,
          cityLabel,
          zip: String(postal || "").replace(/\D/g, "").slice(0, 5),
        });
      });
    });
  };

  const runQuickSearch = async (text, options = {}) => {
    const zipOnly = options.zipOnly === true;
    const trimmed = String(text || "").trim();
    if (!trimmed || chatSending) {
      if (!trimmed) {
        toast.error("Enter a city or ZIP code to search.");
      }
      return;
    }
    const zipMatch = trimmed.match(/\b(\d{5})(?:-\d{4})?\b/);
    const zipCode = zipMatch?.[1] || "";
    setIsQuickSearching(true);
    setChatSending(true);
    try {
      let resolvedCoords = null;
      let locationForUi = zipOnly ? "" : trimmed;
      let locationForSearch = zipOnly && zipCode ? zipCode : trimmed;
      const zipForSearch = zipOnly && zipCode ? zipCode : zipCode || trimmed;

      if (zipOnly && zipCode) {
        const place = await resolvePlaceFromAddress(zipCode);
        if (
          place?.latitude != null &&
          place?.longitude != null &&
          !(Math.abs(place.latitude) < 0.01 && Math.abs(place.longitude) < 0.01)
        ) {
          resolvedCoords = {
            latitude: place.latitude,
            longitude: place.longitude,
          };
        }
        // City field gets "Denver, CO"; ZIP field stays 80220 — never put ZIP in city.
        locationForUi = place?.cityLabel || "";
        // Discover uses city when known (better directory hits); ZIP stays authoritative.
        locationForSearch = locationForUi || zipCode;
        setQuery(locationForUi || zipCode);
        setQueryCoords(
          resolvedCoords
            ? { lat: resolvedCoords.latitude, lng: resolvedCoords.longitude }
            : null,
        );
      } else {
        setQuery(trimmed);
        if (
          queryCoords &&
          Number.isFinite(Number(queryCoords.lat)) &&
          Number.isFinite(Number(queryCoords.lng))
        ) {
          resolvedCoords = {
            latitude: Number(queryCoords.lat),
            longitude: Number(queryCoords.lng),
          };
        } else {
          const place = await resolvePlaceFromAddress(trimmed);
          if (
            place?.latitude != null &&
            place?.longitude != null &&
            !(Math.abs(place.latitude) < 0.01 && Math.abs(place.longitude) < 0.01)
          ) {
            resolvedCoords = {
              latitude: place.latitude,
              longitude: place.longitude,
            };
          }
        }
      }

      const displayLocation =
        locationForUi || (zipOnly ? zipForSearch : locationForSearch);

      const payload = {
        zip_code: zipForSearch,
        location: locationForSearch,
        care_levels: resolvedCareLevels,
        max_distance_miles: DEFAULT_SEARCH_MAX_MILES,
        ...(resolvedCoords || {}),
      };
      const { data } = await postDiscoverFacilities(payload);
      const matches = Array.isArray(data?.facilities) ? data.facilities : [];
      navigate("/care-explorer", {
        state: {
          fromCarrie: true,
          searchSource: zipOnly ? "documentZip" : "manual",
          carrieMatches: matches,
          carrieFilters: {
            source: zipOnly ? "documentZip" : "quickSearch",
            locationQuery: locationForUi,
            searchLocation: locationForUi || locationForSearch,
            searchZipCode: zipCode || undefined,
            budgetMinMonthly: DEFAULT_BUDGET_MIN,
            budgetMaxMonthly: DEFAULT_BUDGET_MAX,
            maxDistanceMiles: DEFAULT_SEARCH_MAX_MILES,
            careLevels: resolvedCareLevels,
            displayCriteria: {
              location: displayLocation,
              budgetMinMonthly: DEFAULT_BUDGET_MIN,
              budgetMaxMonthly: DEFAULT_BUDGET_MAX,
              maxDistanceMiles: DEFAULT_SEARCH_MAX_MILES,
            },
          },
        },
      });
    } catch (err) {
      const desc =
        err?.response?.data?.message || err?.message || "Search request failed.";
      toast.error("Search failed", { description: desc });
      const zipOnlyZip = zipOnly
        ? String(trimmed).match(/\b(\d{5})(?:-\d{4})?\b/)?.[1] || ""
        : "";
      navigate("/care-explorer", {
        state: {
          fromCarrie: true,
          searchSource: zipOnly ? "documentZip" : "manual",
          carrieMatches: [],
          carrieFilters: {
            source: zipOnly ? "documentZip" : "quickSearch",
            locationQuery: zipOnly ? "" : trimmed,
            searchLocation: zipOnly ? zipOnlyZip || trimmed : trimmed,
            searchZipCode: zipCode || undefined,
            budgetMinMonthly: DEFAULT_BUDGET_MIN,
            budgetMaxMonthly: DEFAULT_BUDGET_MAX,
            maxDistanceMiles: DEFAULT_SEARCH_MAX_MILES,
            careLevels: resolvedCareLevels,
            displayCriteria: {
              location: zipOnly ? zipOnlyZip || trimmed : trimmed,
              budgetMinMonthly: DEFAULT_BUDGET_MIN,
              budgetMaxMonthly: DEFAULT_BUDGET_MAX,
              maxDistanceMiles: DEFAULT_SEARCH_MAX_MILES,
            },
          },
        },
      });
    } finally {
      setChatSending(false);
      setIsQuickSearching(false);
    }
  };

  const handleDocumentUpload = async (event) => {
    const file = event?.target?.files?.[0];
    if (event?.target) event.target.value = "";
    if (!file || chatSending || isExtractingZip || isQuickSearching) return;

    setIsExtractingZip(true);
    const toastId = toast.loading("Reading ZIP code from document…");
    try {
      const formData = new FormData();
      formData.append("documents", file);
      const { data } = await postExtractSearchZip(formData);
      const zip = String(data?.zip_code || "")
        .replace(/\D/g, "")
        .slice(0, 5);
      toast.dismiss(toastId);
      if (!data?.success || zip.length !== 5) {
        toast.error("No ZIP found", {
          description:
            data?.message ||
            "Could not find a 5-digit ZIP in that document. Enter one manually.",
        });
        setIsExtractingZip(false);
        return;
      }
      setQuery(zip);
      toast.success(`Found ZIP ${zip}`, {
        description: "Searching communities near that ZIP…",
      });
      setIsExtractingZip(false);
      await runQuickSearch(zip, { zipOnly: true });
    } catch (err) {
      toast.dismiss(toastId);
      setIsExtractingZip(false);
      toast.error("Document upload failed", {
        description:
          err?.response?.data?.message ||
          err?.message ||
          "Could not read that file.",
      });
    }
  };

  const handleChatSubmit = () => {
    runQuickSearch(query);
  };

  const handlePanelSend = () => {
    const text = chatComposer.trim();
    if (!text || chatSending) return;
    setChatComposer("");
    sendCarrieReply(text, { restoreToComposer: true });
  };

  const handleCarrieClick = () => {
    openChatPanel();
  };

  const clearTypingAnimation = () => {
    if (typingTimerRef.current) {
      window.clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearTypingAnimation();
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.onresult = null;
        speechRecognitionRef.current.onerror = null;
        speechRecognitionRef.current.onend = null;
        speechRecognitionRef.current.stop?.();
      }
      if (recordingToastIdRef.current) {
        toast.dismiss(recordingToastIdRef.current);
      }
      if (transcribingToastIdRef.current) {
        toast.dismiss(transcribingToastIdRef.current);
      }
    };
  }, []);

  const typeTextWithAnimation = (text) => {
    clearTypingAnimation();
    setQuery("");

    if (!text) return;

    let index = 0;
    typingTimerRef.current = window.setInterval(() => {
      index += 1;
      setQuery(text.slice(0, index));
      if (index >= text.length) {
        clearTypingAnimation();
      }
    }, 24);
  };

  const handleChange = (e) => {
    clearTypingAnimation();
    setQuery(e.target.value);
    setQueryCoords(null);
    syncPacContainer();
  };

  const handleKeyDown = (e) => {
    if (
      e.key === "Shift" ||
      e.key === "Control" ||
      e.key === "Alt" ||
      e.key === "Meta" ||
      e.key === "Fn"
    ) {
      syncPacContainer();
    }
  };

  const transcribeAudio = async (audioBlob) => {
    setIsTranscribing(true);
    transcribingToastIdRef.current = toast.loading("Transcribing your voice...");

    try {
      const { data } = await transcribeAudioBlob(audioBlob);
      const transcript = (data?.text || "").trim();

      if (!transcript) {
        const message = "No speech detected. Please try speaking clearly.";
        toast.error("Transcription failed", { id: transcribingToastIdRef.current, description: message });
        transcribingToastIdRef.current = null;
        return;
      }

      if (isChatOpenRef.current) {
        setChatComposer((prev) => (prev ? `${prev.trim()} ${transcript}` : transcript));
        focusChatComposer();
      } else {
        typeTextWithAnimation(transcript);
      }
      toast.success("Voice captured", {
        id: transcribingToastIdRef.current,
        description: isChatOpenRef.current ? "Transcript added to chat." : "Transcript added to search bar.",
      });
      transcribingToastIdRef.current = null;
    } catch (error) {
      const message = error.message || "Voice transcription failed.";
      toast.error("Transcription failed", {
        id: transcribingToastIdRef.current,
        description: message,
      });
      transcribingToastIdRef.current = null;
    } finally {
      setIsTranscribing(false);
    }
  };

  const startBrowserSpeechRecognition = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Voice input unavailable", {
        description: "Speech recognition is not supported in this browser.",
      });
      return;
    }

    const recognition = new SpeechRecognition();
    speechRecognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsRecording(true);
    recordingToastIdRef.current = toast.loading("Listening... speak now");

    recognition.onresult = (event) => {
      const transcript = event?.results?.[0]?.[0]?.transcript?.trim() || "";
      if (!transcript) return;
      if (isChatOpenRef.current) {
        setChatComposer((prev) => (prev ? `${prev.trim()} ${transcript}` : transcript));
        focusChatComposer();
      } else {
        typeTextWithAnimation(transcript);
      }
      toast.success("Voice captured", {
        description: isChatOpenRef.current ? "Transcript added to chat." : "Transcript added to search bar.",
      });
    };

    recognition.onerror = (event) => {
      toast.error("Voice input failed", {
        description: event?.error || "Please allow mic access and try again.",
      });
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (recordingToastIdRef.current) {
        toast.dismiss(recordingToastIdRef.current);
        recordingToastIdRef.current = null;
      }
    };

    recognition.start();
  };

  const startRecording = async () => {
    clearTypingAnimation();

    if (typeof MediaRecorder === "undefined") {
      startBrowserSpeechRecognition();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      const message = "This browser does not support voice input.";
      toast.error("Voice input unavailable", { description: message });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      recordingToastIdRef.current = toast.loading("Listening... tap mic again to stop");
    } catch {
      const message = "Microphone access was blocked. Please allow mic permission.";
      toast.error("Microphone blocked", { description: message });
    }
  };

  const stopRecording = () => {
    openChatPanel();
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop?.();
      speechRecognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingToastIdRef.current) {
      toast.dismiss(recordingToastIdRef.current);
      recordingToastIdRef.current = null;
    }
  };

  const handleMicClick = () => {
    if (isTranscribing) return;
    if (isRecording) {
      stopRecording();
      return;
    }
    startRecording();
  };

  return (
    <div className="w-full" id="search-bar">
      <div className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 shadow-sm">
        <label className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">Location</label>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => {
            activePacInputRef.current = inputRef.current;
            syncPacContainer();
          }}
          onBlur={hidePacContainers}
          onKeyDown={(e) => {
            handleKeyDown(e);
            if (e.key === "Enter") {
              e.preventDefault();
              handleChatSubmit();
            }
          }}
          placeholder="City or ZIP code"
          className="mt-2 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm text-[#132329] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#00CFF4]/40"
        />
      </div>

      <input
        id={HOME_MEDICAL_DOC_INPUT_ID}
        ref={docUploadRef}
        type="file"
        accept=".pdf,.doc,.docx,image/jpeg,image/png,image/webp,image/gif,application/pdf"
        className="sr-only"
        onChange={handleDocumentUpload}
      />

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[#64748b]">
          Within {DEFAULT_SEARCH_MAX_MILES} miles · ${DEFAULT_BUDGET_MIN.toLocaleString()}–$
          {DEFAULT_BUDGET_MAX.toLocaleString()}/mo
        </p>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                {/* Native <label> so mobile opens the file picker on first tap. */}
                <label
                  htmlFor={HOME_MEDICAL_DOC_INPUT_ID}
                  className={`inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#00CFF4] bg-white px-4 py-3 text-sm font-semibold text-[#00A8C8] hover:bg-[#E0F7FA] sm:w-auto sm:px-5 ${
                    chatSending || isExtractingZip || isQuickSearching
                      ? "pointer-events-none opacity-50"
                      : ""
                  }`}
                >
                  {isExtractingZip ? (
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
                  ) : (
                    <FileUp className="h-4 w-4" strokeWidth={2.5} />
                  )}
                  {isExtractingZip ? "Reading doc…" : "Upload medical document"}
                </label>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                collisionPadding={12}
                className="z-[80] hidden max-w-[280px] border border-[#E2E8F0] bg-white px-3 py-2 text-left text-xs leading-relaxed text-[#334155] shadow-md sm:block"
              >
                {UPLOAD_MEDICAL_DOC_TIP}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <button
            type="button"
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#00CFF4] px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 sm:w-auto"
            onClick={handleChatSubmit}
            disabled={chatSending || isExtractingZip}
          >
            {chatSending && !isExtractingZip ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
            ) : (
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            )}
            Search
          </button>
        </div>
      </div>

      {/* Mobile: tip always visible (hover tooltip is desktop-only). */}
      <p className="mt-3 text-xs leading-relaxed text-[#64748b] sm:hidden">
        {UPLOAD_MEDICAL_DOC_TIP}
      </p>

      <Sheet open={isChatOpen} onOpenChange={setIsChatOpen}>
        <SheetContent
          side="right"
          className="z-[100] flex h-full max-h-screen w-full flex-col gap-0 border-l border-slate-200 p-0 sm:max-w-md [&>button]:text-slate-600"
        >
          <SheetHeader className="shrink-0 space-y-1 border-b border-slate-200 px-4 py-4 text-left">
            <SheetTitle className="flex items-center gap-2 text-lg text-[#132329]">
              <MessageCircle className="h-5 w-5 shrink-0 text-[#00CFF4]" aria-hidden />
              Carrie – AI Advisor
            </SheetTitle>
            <SheetDescription className="text-left text-sm text-slate-600">
              Ask about senior living options. Use the microphone to speak, or type your message. Sign in for AI replies.
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {chatMessages.length === 0 && !chatSending ? (
              <p className="text-sm text-slate-500">Send a message from the search bar or type below to get started.</p>
            ) : (
              <>
                {chatMessages.map((m) => (
                  <div
                    key={m.id}
                    className={`mb-3 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                        m.role === "user"
                          ? "bg-[#00CFF4] text-white"
                          : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
                {chatSending && (
                  <div className="mb-3 flex justify-start">
                    <div className="carrie-thinking-card max-w-[92%] rounded-3xl px-3 py-3 text-sm text-slate-700 sm:px-4">
                      <div className="flex items-start gap-3">
                        <div className="carrie-thinking-orb mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#00CFF4]/15 text-[#00A8C8]">
                          <MessageCircle className="h-5 w-5" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-[#132329]">Carrie is thinking</p>
                            <div className="flex items-center gap-1" aria-hidden>
                              <span className="carrie-thinking-dot h-1.5 w-1.5 rounded-full bg-[#00CFF4]" />
                              <span
                                className="carrie-thinking-dot h-1.5 w-1.5 rounded-full bg-[#00CFF4]"
                                style={{ animationDelay: "0.18s" }}
                              />
                              <span
                                className="carrie-thinking-dot h-1.5 w-1.5 rounded-full bg-[#00CFF4]"
                                style={{ animationDelay: "0.36s" }}
                              />
                            </div>
                          </div>
                          <p className="mt-1 text-sm text-slate-600">
                            {thinkingMessages[thinkingMessageIndex]}
                          </p>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E2E8F0]">
                            <div className="carrie-thinking-progress h-full rounded-full" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="shrink-0 border-t border-slate-200 bg-white p-4">
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <textarea
                  ref={chatComposerRef}
                  value={chatComposer}
                  onChange={(e) => setChatComposer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handlePanelSend();
                    }
                  }}
                  placeholder="Type your message..."
                  rows={1}
                  disabled={chatSending}
                  className="h-11 min-h-[44px] w-full max-w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-[#132329] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00CFF4]/50 disabled:opacity-60"
                />
              </div>
              <div className="mb-2 flex shrink-0 items-end gap-2">
                <button
                  type="button"
                  className={`flex h-11 w-11 items-center justify-center rounded-xl text-[#132329] ${
                    isRecording
                      ? "bg-[#FEE2E2] text-[#B91C1C] shadow-[0_0_0_3px_rgba(239,68,68,0.35)] mic-recording-pulse"
                      : isTranscribing
                        ? "bg-[#DBEAFE] text-[#1D4ED8] mic-transcribing-pulse"
                        : "bg-[#E2E8F0] hover:bg-[#CBD5F1]"
                  }`}
                  aria-label={
                    isRecording
                      ? "Stop recording"
                      : isTranscribing
                        ? "Transcribing voice"
                        : "Start voice input"
                  }
                  onClick={handleMicClick}
                  disabled={isTranscribing}
                >
                  {isTranscribing ? (
                    <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.5} />
                  ) : (
                    <Mic className="h-5 w-5" strokeWidth={2.5} />
                  )}
                </button>
                <button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00CFF4] text-white hover:opacity-90 disabled:opacity-40"
                  aria-label="Send message"
                  onClick={handlePanelSend}
                  disabled={!chatComposer.trim() || chatSending}
                >
                  {chatSending ? (
                    <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.5} />
                  ) : (
                    <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Subtext */}
      <p className="mt-4 text-center text-xs font-medium text-[#94a3b8] sm:text-sm">
        Verified communities · 100% free service · Expert guidance
      </p>

      <style jsx global>{`
        .pac-container {
          z-index: 2000 !important;
        }

        @keyframes gradientShift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes micPulse {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5);
          }
          70% {
            transform: scale(1.04);
            box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
          }
        }

        .mic-recording-pulse {
          animation: micPulse 1.3s ease-out infinite;
        }

        @keyframes transcribingPulse {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.45);
          }
          70% {
            transform: scale(1.04);
            box-shadow: 0 0 0 8px rgba(59, 130, 246, 0);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
          }
        }

        .mic-transcribing-pulse {
          animation: transcribingPulse 1.2s ease-out infinite;
        }

        @keyframes carrieThinkingFloat {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-2px);
          }
        }

        @keyframes carrieThinkingDot {
          0%, 80%, 100% {
            transform: translateY(0);
            opacity: 0.45;
          }
          40% {
            transform: translateY(-3px);
            opacity: 1;
          }
        }

        @keyframes carrieThinkingProgress {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(220%);
          }
        }

        .carrie-thinking-card {
          background:
            linear-gradient(135deg, rgba(255,255,255,0.96), rgba(240,249,255,0.98)),
            linear-gradient(90deg, rgba(0,207,244,0.08), rgba(99,102,241,0.08));
          border: 1px solid rgba(14, 165, 233, 0.14);
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
        }

        .carrie-thinking-orb {
          animation: carrieThinkingFloat 2.1s ease-in-out infinite;
          box-shadow: 0 8px 20px rgba(0, 207, 244, 0.18);
        }

        .carrie-thinking-dot {
          animation: carrieThinkingDot 1.1s ease-in-out infinite;
        }

        .carrie-thinking-progress {
          width: 42%;
          background: linear-gradient(90deg, #00cff4, #60a5fa, #818cf8);
          animation: carrieThinkingProgress 1.8s ease-in-out infinite;
        }
      `}</style>
      <LoadingOverlay open={isQuickSearching || isExtractingZip} />
    </div>
  );
}