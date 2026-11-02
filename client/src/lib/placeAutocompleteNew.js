/**
 * Places Autocomplete (New) — required for API keys / projects created after
 * March 1, 2025. Legacy google.maps.places.Autocomplete returns no suggestions
 * for those customers.
 *
 * Requires Places API (New) enabled on the Google Cloud project and allowed on the key.
 */
import { getGoogleMapsApiKey, loadGoogleMapsScript } from "@/lib/loadGoogleMaps";

export async function ensurePlacesLibrary() {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    throw new Error("VITE_GOOGLE_MAPS_API_KEY is missing");
  }
  await loadGoogleMapsScript(apiKey);
  if (typeof window.google?.maps?.importLibrary !== "function") {
    throw new Error("Google Maps importLibrary is unavailable");
  }
  return window.google.maps.importLibrary("places");
}

export async function createAutocompleteSessionToken() {
  const { AutocompleteSessionToken } = await ensurePlacesLibrary();
  return new AutocompleteSessionToken();
}

/**
 * @param {string} input
 * @param {{ sessionToken?: unknown, includedRegionCodes?: string[] }} [options]
 */
export async function fetchPlaceSuggestions(input, options = {}) {
  const trimmed = String(input || "").trim();
  if (trimmed.length < 2) {
    return { suggestions: [], sessionToken: options.sessionToken || null };
  }

  const { AutocompleteSuggestion, AutocompleteSessionToken } =
    await ensurePlacesLibrary();
  const sessionToken =
    options.sessionToken || new AutocompleteSessionToken();

  const request = {
    input: trimmed,
    language: "en-US",
    region: "us",
    includedRegionCodes: options.includedRegionCodes || ["us"],
    sessionToken,
  };

  const { suggestions = [] } =
    await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

  return {
    sessionToken,
    suggestions: suggestions
      .map((item, index) => {
        const prediction = item?.placePrediction;
        if (!prediction) return null;
        const label =
          prediction.text?.toString?.() ||
          prediction.mainText?.toString?.() ||
          "";
        if (!label) return null;
        return {
          id: String(prediction.placeId || `${label}-${index}`),
          label,
          placePrediction: prediction,
        };
      })
      .filter(Boolean),
  };
}

const findComponent = (components, type) =>
  (components || []).find((c) =>
    Array.isArray(c?.types) ? c.types.includes(type) : false,
  );

/**
 * Resolve a selected prediction into city/state/ZIP + coords for our search UI.
 * @param {object} placePrediction
 */
export async function resolvePlacePrediction(placePrediction) {
  if (!placePrediction?.toPlace) {
    throw new Error("Invalid place prediction");
  }

  const place = placePrediction.toPlace();
  await place.fetchFields({
    fields: ["addressComponents", "formattedAddress", "location", "displayName"],
  });

  const components = place.addressComponents || [];
  const city =
    findComponent(components, "locality")?.longText ||
    findComponent(components, "postal_town")?.longText ||
    findComponent(components, "administrative_area_level_2")?.longText ||
    "";
  const state =
    findComponent(components, "administrative_area_level_1")?.shortText || "";
  const zip = findComponent(components, "postal_code")?.longText || "";

  let label = "";
  if (city && state) label = `${city}, ${state}`;
  else {
    label =
      place.formattedAddress ||
      place.displayName ||
      placePrediction.text?.toString?.() ||
      "";
  }

  let coords = null;
  const loc = place.location;
  if (loc) {
    try {
      coords = {
        lat: typeof loc.lat === "function" ? loc.lat() : Number(loc.lat),
        lng: typeof loc.lng === "function" ? loc.lng() : Number(loc.lng),
      };
      if (!Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) {
        coords = null;
      }
    } catch {
      coords = null;
    }
  }

  const queryLabel = [label, zip].filter(Boolean).join(" ").trim();
  return {
    queryLabel,
    city,
    state,
    zip,
    coords,
    formattedAddress: place.formattedAddress || queryLabel,
  };
}
