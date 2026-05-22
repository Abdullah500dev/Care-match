import React, { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { getGoogleMapsApiKey, loadGoogleMapsScript } from "@/lib/loadGoogleMaps";
import { hidePacContainers, syncPacContainer } from "@/lib/googlePlacesPac";
import { readPostalCodeFromPlace, resolveZipForAddress } from "@/lib/facilityAddressGeo";
import { cn } from "@/lib/utils";

/**
 * Address field with Google Places suggestions when VITE_GOOGLE_MAPS_API_KEY is set.
 * Uses an uncontrolled <input> so React re-renders do not break Autocomplete.
 */
export default function GooglePlacesAddressInput({
  value,
  onChange,
  onBlur,
  onZipCodeSelect,
  onPlaceResolved,
  enabled = true,
  className,
  ...rest
}) {
  const inputRef = useRef(null);
  const acRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const onBlurRef = useRef(onBlur);
  const onZipCodeSelectRef = useRef(onZipCodeSelect);
  const onPlaceResolvedRef = useRef(onPlaceResolved);
  const externalValueRef = useRef(value);
  const mapsReadyRef = useRef(false);
  const [mapsStatus, setMapsStatus] = React.useState("idle");

  onChangeRef.current = onChange;
  onBlurRef.current = onBlur;
  onZipCodeSelectRef.current = onZipCodeSelect;
  onPlaceResolvedRef.current = onPlaceResolved;

  const apiKey = getGoogleMapsApiKey();

  const syncPac = () => {
    if (inputRef.current && document.activeElement === inputRef.current) {
      syncPacContainer(inputRef.current);
    }
  };

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return undefined;
    if (String(value ?? "") !== String(externalValueRef.current ?? "")) {
      externalValueRef.current = value;
      el.value = value ?? "";
    }
  }, [value]);

  useEffect(() => {
    if (!apiKey || !enabled) {
      mapsReadyRef.current = false;
      setMapsStatus(apiKey ? "idle" : "no-key");
      return undefined;
    }

    let cancelled = false;
    let attachTimer = null;
    let observer = null;
    let observerFrame = null;
    let listenersAttached = false;

    const handleInput = () => {
      externalValueRef.current = inputRef.current?.value ?? "";
      onChangeRef.current({ target: { value: externalValueRef.current } });
      syncPac();
    };

    const handleFocus = () => syncPac();

    const handleBlur = (e) => {
      window.setTimeout(() => hidePacContainers(), 150);
      onBlurRef.current?.(e);
    };

    const handleWindowSync = () => {
      if (document.activeElement !== inputRef.current) {
        hidePacContainers();
        return;
      }
      syncPac();
    };

    const attach = () => {
      const el = inputRef.current;
      if (!el || cancelled || !window.google?.maps?.places) return;

      if (acRef.current) {
        window.google.maps.event.clearInstanceListeners(acRef.current);
        acRef.current = null;
      }

      el.value = externalValueRef.current ?? "";

      const ac = new window.google.maps.places.Autocomplete(el, {
        types: ["geocode"],
        componentRestrictions: { country: "us" },
        fields: ["formatted_address", "geometry", "address_components"],
      });
      acRef.current = ac;
      mapsReadyRef.current = true;
      setMapsStatus("ready");

      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        const addr = place?.formatted_address || el.value || "";
        if (addr) {
          externalValueRef.current = addr;
          el.value = addr;
          onChangeRef.current({ target: { value: addr } });
        }

        const runResolve = async () => {
          const resolved = await resolveZipForAddress(addr, place);
          const zip =
            resolved.zipCode ||
            readPostalCodeFromPlace(place) ||
            resolved.zipOptions?.[0] ||
            "";
          if (zip && onZipCodeSelectRef.current) {
            onZipCodeSelectRef.current(zip);
          }
          if (onPlaceResolvedRef.current) {
            await onPlaceResolvedRef.current({ address: addr, place, resolved });
          }
        };
        runResolve();
        window.requestAnimationFrame(syncPac);
      });
    };

    const bindInputListeners = () => {
      const el = inputRef.current;
      if (!el || listenersAttached) return;
      el.addEventListener("input", handleInput);
      el.addEventListener("focus", handleFocus);
      el.addEventListener("blur", handleBlur);
      listenersAttached = true;
    };

    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (cancelled) return;
        bindInputListeners();
        attachTimer = window.setTimeout(attach, 50);

        window.addEventListener("scroll", handleWindowSync, true);
        window.addEventListener("resize", handleWindowSync);

        if (typeof MutationObserver !== "undefined") {
          observer = new MutationObserver(() => {
            if (document.activeElement !== inputRef.current) return;
            if (observerFrame) cancelAnimationFrame(observerFrame);
            observerFrame = requestAnimationFrame(syncPac);
          });
          observer.observe(document.body, { childList: true, subtree: true });
        }
      })
      .catch(() => {
        if (!cancelled) setMapsStatus("error");
      });

    return () => {
      cancelled = true;
      mapsReadyRef.current = false;
      if (attachTimer) window.clearTimeout(attachTimer);
      if (observerFrame) cancelAnimationFrame(observerFrame);
      observer?.disconnect();
      const el = inputRef.current;
      if (el && listenersAttached) {
        el.removeEventListener("input", handleInput);
        el.removeEventListener("focus", handleFocus);
        el.removeEventListener("blur", handleBlur);
        listenersAttached = false;
      }
      window.removeEventListener("scroll", handleWindowSync, true);
      window.removeEventListener("resize", handleWindowSync);
      if (acRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(acRef.current);
        acRef.current = null;
      }
      hidePacContainers();
    };
  }, [apiKey, enabled]);

  const helperText = !apiKey
    ? "Google Maps API key missing — add VITE_GOOGLE_MAPS_API_KEY for address suggestions."
    : mapsStatus === "error"
      ? "Could not load Google Maps. Check API key and enable Maps JavaScript + Places APIs."
      : "Start typing — pick an address from the list for best results.";

  if (!apiKey) {
    return (
      <div className="space-y-1">
        <Input
          className={cn(className)}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          autoComplete="street-address"
          {...rest}
        />
        <p className="text-xs text-amber-700">{helperText}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Input
        ref={inputRef}
        className={cn(className)}
        defaultValue={value}
        autoComplete="off"
        name="facility-address-places"
        {...rest}
      />
      <p
        className={cn(
          "text-xs",
          mapsStatus === "error" ? "text-amber-700" : "text-slate-500"
        )}
      >
        {helperText}
      </p>
    </div>
  );
}
