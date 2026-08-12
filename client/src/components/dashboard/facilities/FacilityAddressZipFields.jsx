import React, { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  extractZipFromAddress,
  formatZipInput,
  resolveZipForAddress,
} from "@/lib/facilityAddressGeo";
import GooglePlacesAddressInput from "@/components/dashboard/facilities/GooglePlacesAddressInput";

const STATUS_STYLES = {
  idle: "text-slate-500",
  checking: "text-slate-500",
  match: "text-emerald-700",
  mismatch: "text-red-600",
};

function shouldAutoResolveAddress(value) {
  const text = String(value || "").trim();
  return text.length >= 8;
}

/**
 * Address-only field. ZIP is kept inside the address text and synced to
 * zip_code in the background for the API (no separate ZIP UI).
 */
export default function FacilityAddressZipFields({
  address,
  zipCode,
  onAddressChange,
  onZipCodeChange,
  enabled = true,
  addressRequired = true,
}) {
  const [geoStatus, setGeoStatus] = useState({ state: "idle", message: "" });
  const resolveTimerRef = useRef(null);
  const resolvingRef = useRef(false);
  const lastResolvedAddressRef = useRef("");

  const syncZipFromText = useCallback(
    (addr) => {
      const fromText = extractZipFromAddress(addr);
      if (fromText && fromText !== formatZipInput(zipCode)) {
        onZipCodeChange(fromText);
      }
      return fromText;
    },
    [onZipCodeChange, zipCode]
  );

  const applyResolvedZip = useCallback(
    (resolved) => {
      if (!resolved) return;

      const primaryZip =
        resolved.zipCode ||
        resolved.zipOptions?.[0] ||
        extractZipFromAddress(resolved.formattedAddress || address) ||
        "";

      if (primaryZip) {
        onZipCodeChange(primaryZip);
        setGeoStatus({
          state: "match",
          message: "ZIP detected from address.",
        });
        return;
      }

      if (resolved.error) {
        setGeoStatus({ state: "mismatch", message: resolved.error });
      }
    },
    [address, onZipCodeChange]
  );

  useEffect(() => {
    return () => {
      if (resolveTimerRef.current) clearTimeout(resolveTimerRef.current);
    };
  }, []);

  const resolveFromAddress = useCallback(
    async (addr, place = null) => {
      const trimmed = String(addr || "").trim();
      if (trimmed.length < 3 || resolvingRef.current) return null;
      if (trimmed === lastResolvedAddressRef.current && !place) return null;

      const fromText = syncZipFromText(trimmed);
      if (fromText && !place) {
        lastResolvedAddressRef.current = trimmed;
        setGeoStatus({
          state: "match",
          message: "ZIP detected from address.",
        });
        return { zipCode: fromText };
      }

      resolvingRef.current = true;
      setGeoStatus({ state: "checking", message: "Looking up address…" });
      try {
        const resolved = await resolveZipForAddress(trimmed, place);
        if (resolved?.zipCode || resolved?.zipOptions?.length) {
          lastResolvedAddressRef.current = trimmed;
          applyResolvedZip(resolved);
        } else {
          lastResolvedAddressRef.current = "";
          setGeoStatus({
            state: "mismatch",
            message:
              resolved?.error ||
              "Could not find a ZIP in this address. Include a 5-digit ZIP (e.g. Avenel, NJ 07001).",
          });
        }
        return resolved;
      } finally {
        resolvingRef.current = false;
      }
    },
    [applyResolvedZip, syncZipFromText]
  );

  useEffect(() => {
    if (!enabled) return undefined;

    const trimmed = String(address || "").trim();
    if (!shouldAutoResolveAddress(trimmed)) return undefined;

    if (resolveTimerRef.current) clearTimeout(resolveTimerRef.current);
    resolveTimerRef.current = window.setTimeout(() => {
      resolveFromAddress(trimmed, null);
    }, 700);

    return () => {
      if (resolveTimerRef.current) clearTimeout(resolveTimerRef.current);
    };
  }, [address, enabled, resolveFromAddress]);

  const handlePlaceResolved = useCallback(
    async ({ resolved }) => {
      if (resolved) {
        lastResolvedAddressRef.current = String(address || "").trim();
        applyResolvedZip(resolved);
      }
    },
    [address, applyResolvedZip]
  );

  const handleAddressChange = (e) => {
    lastResolvedAddressRef.current = "";
    onAddressChange(e);
    const next = e?.target?.value ?? "";
    syncZipFromText(next);
    if (geoStatus.state !== "idle") {
      setGeoStatus({ state: "idle", message: "" });
    }
  };

  const handleAddressBlur = async () => {
    const addr = String(address || "").trim();
    if (!addr) return;
    await resolveFromAddress(addr, null);
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-900">
        Address
      </label>
      <GooglePlacesAddressInput
        enabled={enabled}
        value={address}
        onChange={handleAddressChange}
        onBlur={handleAddressBlur}
        onZipCodeSelect={(zip) => onZipCodeChange(zip)}
        onPlaceResolved={handlePlaceResolved}
        placeholder="Start typing — pick an address from the list for best results."
        required={addressRequired}
      />
      <p className="text-xs text-slate-500">
        Include the ZIP in the address (e.g. Avenel, NJ 07001, USA).
      </p>
      {geoStatus.message ? (
        <p
          className={cn("text-xs leading-snug", STATUS_STYLES[geoStatus.state])}
          role={geoStatus.state === "mismatch" ? "alert" : "status"}
        >
          {geoStatus.message}
        </p>
      ) : null}
    </div>
  );
}
