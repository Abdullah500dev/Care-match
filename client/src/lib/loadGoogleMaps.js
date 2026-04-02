/**
 * Loads Maps JavaScript API + Places library once.
 * Enable in Google Cloud: Maps JavaScript API + Places API.
 * Key: VITE_GOOGLE_MAPS_API_KEY
 */
const SCRIPT_ID = "google-maps-js";

export function getGoogleMapsApiKey() {
  const k = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  return typeof k === "string" && k.trim() ? k.trim() : "";
}

export function loadGoogleMapsScript(apiKey) {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("No window"));
  }
  if (window.google?.maps?.places) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      const done = () =>
        window.google?.maps?.places ? resolve() : reject(new Error("Google Maps failed"));
      if (window.google?.maps?.places) {
        resolve();
        return;
      }
      existing.addEventListener("load", done);
      existing.addEventListener("error", () => reject(new Error("Google Maps script error")));
      return;
    }

    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.async = true;
    s.defer = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    s.onload = () => {
      if (window.google?.maps?.places) resolve();
      else reject(new Error("Places library not available"));
    };
    s.onerror = () => reject(new Error("Could not load Google Maps"));
    document.head.appendChild(s);
  });
}
