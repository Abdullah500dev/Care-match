const GOOGLE_KEY = String(
  process.env.GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    ""
).trim();

const formatZip = (value) => String(value || "").replace(/\D/g, "").slice(0, 5);

const readZipFromComponents = (components) => {
  if (!Array.isArray(components)) return "";
  const postal = components.find((c) => c.types?.includes("postal_code"));
  return formatZip(postal?.long_name || postal?.short_name || "");
};

const readCityState = (components) => {
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
};

async function fetchGeocode(params) {
  if (!GOOGLE_KEY) return [];
  const qs = new URLSearchParams({ ...params, key: GOOGLE_KEY });
  const url = `https://maps.googleapis.com/maps/api/geocode/json?${qs.toString()}`;
  try {
    const res = await fetch(url);
    const payload = await res.json().catch(() => ({}));
    if (payload?.status === "OK" && Array.isArray(payload.results)) {
      return payload.results;
    }
  } catch {
    /* ignore */
  }
  return [];
}

async function reverseGeocodeLatLng(lat, lng) {
  return fetchGeocode({
    latlng: `${lat},${lng}`,
    result_type: "postal_code",
  });
}

async function discoverZipsFromViewport(viewport) {
  if (!viewport?.northeast || !viewport?.southwest) return [];

  const north = Number(viewport.northeast.lat);
  const east = Number(viewport.northeast.lng);
  const south = Number(viewport.southwest.lat);
  const west = Number(viewport.southwest.lng);
  if (![north, east, south, west].every(Number.isFinite)) return [];

  const zips = new Set();
  const grid = [0.2, 0.5, 0.8];

  for (const latRatio of grid) {
    for (const lngRatio of grid) {
      const lat = south + (north - south) * latRatio;
      const lng = west + (east - west) * lngRatio;
      const results = await reverseGeocodeLatLng(lat, lng);
      for (const result of results) {
        const zip = readZipFromComponents(result.address_components);
        if (zip) zips.add(zip);
      }
      if (zips.size >= 12) break;
    }
    if (zips.size >= 12) break;
  }

  return [...zips].sort();
}

/**
 * Resolve ZIP code(s) for a US address string using Google Geocoding API (server-side).
 */
export async function resolveZipForAddressQuery(address) {
  const query = String(address || "").trim();
  if (!query) {
    return {
      formattedAddress: "",
      zipCode: "",
      zipOptions: [],
      cityState: "",
    };
  }

  if (!GOOGLE_KEY) {
    return {
      formattedAddress: query,
      zipCode: "",
      zipOptions: [],
      cityState: "",
      error: "Google Maps API key is not configured on the server.",
    };
  }

  const zipOptions = new Set();
  const results = await fetchGeocode({
    address: query,
    components: "country:US",
  });

  if (!results.length) {
    return {
      formattedAddress: query,
      zipCode: "",
      zipOptions: [],
      cityState: "",
      error: "Address could not be found.",
    };
  }

  const primary = results[0];
  const formattedAddress = primary.formatted_address || query;
  const cityState = readCityState(primary.address_components);

  for (const result of results) {
    const zip = readZipFromComponents(result.address_components);
    if (zip) zipOptions.add(zip);
  }

  const loc = primary.geometry?.location;
  if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
    const reverseResults = await reverseGeocodeLatLng(loc.lat, loc.lng);
    for (const result of reverseResults) {
      const zip = readZipFromComponents(result.address_components);
      if (zip) zipOptions.add(zip);
    }
  }

  const viewport = primary.geometry?.viewport || primary.geometry?.bounds;
  const viewportZips = await discoverZipsFromViewport(viewport);
  viewportZips.forEach((z) => zipOptions.add(z));

  const list = [...zipOptions].sort();

  return {
    formattedAddress,
    zipCode: list[0] || "",
    zipOptions: list,
    cityState,
  };
}
