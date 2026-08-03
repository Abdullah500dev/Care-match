import { apiClient } from "@/services/api";
import { getGoogleMapsApiKey, loadGoogleMapsScript } from "@/lib/loadGoogleMaps";

export function formatZipInput(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 5);
}

/** First 5-digit ZIP found in a free-text address (e.g. "Avenel, NJ 07001, USA"). */
export function extractZipFromAddress(address) {
  const m = String(address || "").match(/\b(\d{5})(?:-\d{4})?\b/);
  return m ? formatZipInput(m[1]) : "";
}

export function readPostalCodeFromComponents(components) {
  if (!Array.isArray(components)) return "";
  const postal = components.find((c) => c.types?.includes("postal_code"));
  const raw = postal?.long_name || postal?.short_name || "";
  return formatZipInput(raw);
}

export function readPostalCodeFromPlace(place) {
  return readPostalCodeFromComponents(place?.address_components);
}

export function readPostalCodeFromGeocodeResult(result) {
  return readPostalCodeFromComponents(result?.address_components);
}

export function readCityStateFromGeocodeResult(result) {
  const components = result?.address_components;
  if (!Array.isArray(components)) return "";
  const city = components.find(
    (c) =>
      c.types?.includes("locality") ||
      c.types?.includes("sublocality") ||
      c.types?.includes("postal_town")
  );
  const state = components.find((c) => c.types?.includes("administrative_area_level_1"));
  const cityName = city?.long_name || city?.short_name || "";
  const stateCode = state?.short_name || state?.long_name || "";
  return [cityName, stateCode].filter(Boolean).join(", ");
}

function emptyResolved(query = "") {
  return {
    formattedAddress: query,
    zipCode: "",
    zipOptions: [],
    cityState: "",
  };
}

/** Primary path: server-side Google Geocoding (reliable, no browser CORS/script issues). */
export async function resolveZipForAddressViaApi(address) {
  const query = String(address || "").trim();
  if (query.length < 3) return emptyResolved(query);

  try {
    const { data } = await apiClient.get("/api/facilities/resolve-zip", {
      params: { address: query },
    });
    if (data?.success) {
      const zipOptions = Array.isArray(data.zipOptions) ? data.zipOptions : [];
      const zipCode = formatZipInput(data.zipCode) || zipOptions[0] || "";
      return {
        formattedAddress: data.formattedAddress || query,
        zipCode,
        zipOptions,
        cityState: data.cityState || "",
        error: data.error || "",
      };
    }
  } catch {
    /* fall through to client geocoder */
  }

  return null;
}

function readLatLng(location) {
  if (!location) return null;
  const lat = typeof location.lat === "function" ? location.lat() : location.lat;
  const lng = typeof location.lng === "function" ? location.lng() : location.lng;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

let geocoderInstance = null;
let geocoderInitPromise = null;

async function getGeocoder() {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) return null;

  if (geocoderInstance) return geocoderInstance;

  if (!geocoderInitPromise) {
    geocoderInitPromise = loadGoogleMapsScript(apiKey)
      .then(() => {
        if (!window.google?.maps?.Geocoder) return null;
        geocoderInstance = new window.google.maps.Geocoder();
        return geocoderInstance;
      })
      .catch(() => null);
  }

  return geocoderInitPromise;
}

function geocodeRequestAll(geocoder, request) {
  return new Promise((resolve) => {
    geocoder.geocode(
      { ...request, componentRestrictions: { country: "US" } },
      (results, status) => {
        if (status === "OK" && Array.isArray(results) && results.length > 0) {
          resolve(results);
          return;
        }
        resolve([]);
      }
    );
  });
}

async function resolveZipClientSide(address, place = null) {
  const query = String(address || "").trim();
  const zipOptions = new Set();
  let formattedAddress = query;
  let cityState = "";

  if (place && typeof place === "object") {
    const fromPlace = readPostalCodeFromPlace(place);
    if (fromPlace) zipOptions.add(fromPlace);
    if (place.formatted_address) formattedAddress = place.formatted_address;

    const coords = readLatLng(place.geometry?.location);
    if (coords) {
      const geocoder = await getGeocoder();
      if (geocoder) {
        const results = await geocodeRequestAll(geocoder, { location: coords });
        collectZipsFromGeocodeResults(results).forEach((z) => zipOptions.add(z));
      }
    }
  }

  const geocoder = await getGeocoder();
  if (geocoder && query.length >= 3) {
    const results = await geocodeRequestAll(geocoder, { address: query });
    if (results.length > 0) {
      const primary = results[0];
      formattedAddress = primary.formatted_address || formattedAddress;
      cityState = readCityStateFromGeocodeResult(primary);
      collectZipsFromGeocodeResults(results).forEach((z) => zipOptions.add(z));

      if (zipOptions.size === 0) {
        const coords = readLatLng(primary.geometry?.location);
        if (coords) {
          const rev = await geocodeRequestAll(geocoder, { location: coords });
          collectZipsFromGeocodeResults(rev).forEach((z) => zipOptions.add(z));
        }
      }
    }
  }

  const list = [...zipOptions];
  return {
    formattedAddress,
    zipCode: list[0] || "",
    zipOptions: list,
    cityState,
  };
}

function collectZipsFromGeocodeResults(results) {
  const zips = new Set();
  for (const result of results) {
    const zip = readPostalCodeFromGeocodeResult(result);
    if (zip) zips.add(zip);
  }
  return [...zips];
}

/**
 * Resolve ZIP(s) for an address — server API first, browser Geocoder fallback.
 */
export async function resolveZipForAddress(address, place = null) {
  const query = String(address || place?.formatted_address || "").trim();
  if (query.length < 3) return emptyResolved(query);

  const fromApi = await resolveZipForAddressViaApi(query);
  if (fromApi && (fromApi.zipCode || fromApi.zipOptions.length > 0)) {
    return fromApi;
  }

  const fromClient = await resolveZipClientSide(query, place);
  if (fromClient.zipCode || fromClient.zipOptions.length > 0) {
    return fromClient;
  }

  return fromApi || fromClient || emptyResolved(query);
}

export async function geocodeAddress(address) {
  const resolved = await resolveZipForAddress(address, null);
  if (!resolved.zipCode && !resolved.zipOptions.length) return null;
  return {
    formattedAddress: resolved.formattedAddress,
    zipCode: resolved.zipCode,
    zipOptions: resolved.zipOptions,
    cityState: resolved.cityState,
    location: null,
  };
}

export async function geocodeUsZip(zip) {
  const normalized = formatZipInput(zip);
  if (normalized.length !== 5) return null;

  const fromApi = await resolveZipForAddressViaApi(`${normalized}, USA`);
  if (fromApi?.zipCode) {
    return {
      zipCode: fromApi.zipCode,
      cityState: fromApi.cityState,
      formattedAddress: fromApi.formattedAddress,
    };
  }

  const geocoder = await getGeocoder();
  if (!geocoder) return null;

  const results = await geocodeRequestAll(geocoder, { address: `${normalized}, USA` });
  const primary = results[0];
  if (!primary) return null;

  return {
    zipCode: readPostalCodeFromGeocodeResult(primary) || normalized,
    cityState: readCityStateFromGeocodeResult(primary),
    formattedAddress: primary.formatted_address || "",
  };
}

export async function validateAddressZipPair(address, zip) {
  const addr = String(address || "").trim();
  const normalizedZip = formatZipInput(zip);

  if (normalizedZip.length !== 5) {
    return { state: "idle", message: "" };
  }

  if (!addr || addr.length < 5) {
    const zipResult = await geocodeUsZip(normalizedZip);
    if (!zipResult) {
      return { state: "mismatch", message: "This ZIP code could not be verified." };
    }
    const area = zipResult.cityState || "this area";
    return { state: "match", message: `Valid ZIP (${area}). Add address to confirm they match.` };
  }

  const resolved = await resolveZipForAddress(addr, null);
  if (!resolved.zipCode && resolved.zipOptions.length === 0) {
    return {
      state: "mismatch",
      message:
        resolved.error ||
        "Could not verify this address. Select from suggestions or check spelling.",
    };
  }

  const geocodedZip = resolved.zipCode;
  const zipList = resolved.zipOptions;

  if (geocodedZip === normalizedZip || zipList.includes(normalizedZip)) {
    return { state: "match", message: "Address and ZIP code match." };
  }

  const zipResult = await geocodeUsZip(normalizedZip);
  const zipArea = zipResult?.cityState;
  const addrArea = resolved.cityState;

  if (zipArea && addrArea && zipArea === addrArea) {
    return {
      state: "match",
      message: `Address and ZIP are in the same area (${zipArea}).`,
    };
  }

  const suggestions = zipList.filter((z) => z !== normalizedZip).slice(0, 6);
  const hint = suggestions.length
    ? ` Try: ${suggestions.join(", ")}.`
    : geocodedZip
      ? ` Address maps to ZIP ${geocodedZip}.`
      : "";

  return {
    state: "mismatch",
    message: `ZIP ${normalizedZip} does not match this address.${hint}`,
    zipOptions: zipList,
  };
}

// Kept for backwards compatibility if imported elsewhere
export async function reverseGeocodeLatLng(lat, lng) {
  const geocoder = await getGeocoder();
  if (!geocoder || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const results = await geocodeRequestAll(geocoder, { location: { lat, lng } });
  if (!results.length) return null;

  const primary = results[0];
  const zipOptions = collectZipsFromGeocodeResults(results);
  return {
    zipCode: zipOptions[0] || readPostalCodeFromGeocodeResult(primary),
    zipOptions,
    cityState: readCityStateFromGeocodeResult(primary),
    formattedAddress: primary.formatted_address || "",
  };
}
