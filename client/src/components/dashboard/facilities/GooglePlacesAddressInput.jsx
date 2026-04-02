import React, { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { getGoogleMapsApiKey, loadGoogleMapsScript } from "@/lib/loadGoogleMaps";
import { cn } from "@/lib/utils";

/**
 * Address field with Google Places suggestions when VITE_GOOGLE_MAPS_API_KEY is set.
 * Otherwise falls back to a normal text input.
 *
 * Restrict the API key to your domains (e.g. http://localhost:5173/*) in Google Cloud Console.
 */
export default function GooglePlacesAddressInput({
  value,
  onChange,
  enabled = true,
  className,
  ...rest
}) {
  const inputRef = useRef(null);
  const acRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const apiKey = getGoogleMapsApiKey();

  useEffect(() => {
    if (!apiKey || !enabled) return;

    let cancelled = false;

    const attach = () => {
      const el = inputRef.current;
      if (!el || cancelled || !window.google?.maps?.places) return;

      if (acRef.current) {
        window.google.maps.event.clearInstanceListeners(acRef.current);
        acRef.current = null;
      }

      const ac = new window.google.maps.places.Autocomplete(el, {
        types: ["address"],
        fields: ["formatted_address", "geometry"],
      });
      acRef.current = ac;

      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        const addr = place?.formatted_address;
        if (addr) {
          onChangeRef.current({ target: { value: addr } });
        }
      });
    };

    let t;
    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (cancelled) return;
        t = window.setTimeout(attach, 0);
      })
      .catch(() => {
        /* fallback: plain input */
      });

    return () => {
      cancelled = true;
      if (t) window.clearTimeout(t);
      if (acRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(acRef.current);
        acRef.current = null;
      }
    };
  }, [apiKey, enabled]);

  if (!apiKey) {
    return (
      <Input
        className={cn(className)}
        value={value}
        onChange={onChange}
        autoComplete="street-address"
        {...rest}
      />
    );
  }

  return (
    <div className="space-y-1">
      <Input
        ref={inputRef}
        className={cn(className)}
        value={value}
        onChange={onChange}
        autoComplete="off"
        {...rest}
      />
      <p className="text-xs text-slate-500">
        Start typing — pick an address from the list for best results.
      </p>
    </div>
  );
}
