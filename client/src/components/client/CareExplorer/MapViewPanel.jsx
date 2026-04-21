import React, { useEffect, useMemo, useRef, useState } from "react";
import { loadGoogleMapsScript, getGoogleMapsApiKey } from "@/lib/loadGoogleMaps";

const DEFAULT_CENTER = { lat: 37.7749, lng: -122.4194 };

export default function MapViewPanel({ facilities = [] }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const geocoderRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [coordsById, setCoordsById] = useState({});

  const mappableFacilities = useMemo(
    () =>
      facilities.filter(
        (f) => f && typeof f.address === "string" && f.address.trim().length > 2
      ),
    [facilities]
  );

  useEffect(() => {
    const apiKey = getGoogleMapsApiKey();
    if (!apiKey || !mapRef.current) return;
    let cancelled = false;

    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (cancelled || !mapRef.current || !window.google?.maps) return;
        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
            center: DEFAULT_CENTER,
            zoom: 10,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          });
        }
        if (!geocoderRef.current) {
          geocoderRef.current = new window.google.maps.Geocoder();
        }
        setReady(true);
      })
      .catch(() => {
        setReady(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !geocoderRef.current || !mappableFacilities.length) return;
    let cancelled = false;

    const geocodeMissing = async () => {
      for (const facility of mappableFacilities) {
        if (cancelled) return;
        if (coordsById[facility.key]) continue;
        const coords = await new Promise((resolve) => {
          geocoderRef.current.geocode(
            { address: facility.address },
            (results, status) => {
              if (status === "OK" && results?.[0]?.geometry?.location) {
                const location = results[0].geometry.location;
                resolve({ lat: location.lat(), lng: location.lng() });
                return;
              }
              resolve(null);
            }
          );
        });
        if (coords) {
          setCoordsById((prev) => ({ ...prev, [facility.key]: coords }));
        }
      }
    };

    geocodeMissing();
    return () => {
      cancelled = true;
    };
  }, [ready, mappableFacilities, coordsById]);

  useEffect(() => {
    if (!ready || !mapInstanceRef.current) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const bounds = new window.google.maps.LatLngBounds();
    const mapped = mappableFacilities
      .map((f) => ({ facility: f, coords: coordsById[f.key] }))
      .filter((x) => x.coords);

    mapped.forEach(({ facility, coords }) => {
      const marker = new window.google.maps.Marker({
        map: mapInstanceRef.current,
        position: coords,
        title: facility.name,
      });
      const info = new window.google.maps.InfoWindow({
        content: `<div style="font-family: Arial, sans-serif; min-width: 180px;"><strong>${facility.name}</strong><br/>${facility.address}</div>`,
      });
      marker.addListener("click", () => info.open({ anchor: marker, map: mapInstanceRef.current }));
      markersRef.current.push(marker);
      bounds.extend(coords);
    });

    if (mapped.length === 1) {
      mapInstanceRef.current.setCenter(mapped[0].coords);
      mapInstanceRef.current.setZoom(12);
    } else if (mapped.length > 1) {
      mapInstanceRef.current.fitBounds(bounds, 80);
    }
  }, [ready, mappableFacilities, coordsById]);

  if (!getGoogleMapsApiKey()) {
    return (
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 text-sm text-[#64748b]">
        Map view needs `VITE_GOOGLE_MAPS_API_KEY` in client env.
      </div>
    );
  }

  return (
    <div className="h-[480px] w-full overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
      <div ref={mapRef} className="h-full w-full" />
    </div>
  );
}

