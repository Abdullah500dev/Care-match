import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  formatZipInput,
  resolveZipForAddress,
  validateAddressZipPair,
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

export default function FacilityAddressZipFields({
  address,
  zipCode,
  onAddressChange,
  onZipCodeChange,
  enabled = true,
  addressRequired = true,
  zipRequired = true,
}) {
  const zipListId = useId();
  const [zipOptions, setZipOptions] = useState([]);
  const [showZipList, setShowZipList] = useState(false);
  const [geoStatus, setGeoStatus] = useState({ state: "idle", message: "" });
  const validateTimerRef = useRef(null);
  const resolveTimerRef = useRef(null);
  const resolvingRef = useRef(false);
  const lastResolvedAddressRef = useRef("");

  const scheduleValidation = useCallback((addr, zip, { immediate = false } = {}) => {
    if (validateTimerRef.current) {
      clearTimeout(validateTimerRef.current);
      validateTimerRef.current = null;
    }

    const run = async () => {
      setGeoStatus({ state: "checking", message: "Verifying with Maps…" });
      const result = await validateAddressZipPair(addr, zip);
      if (result.zipOptions?.length) {
        setZipOptions(result.zipOptions);
        setShowZipList(true);
      }
      setGeoStatus(result);
    };

    if (immediate) {
      run();
      return;
    }

    validateTimerRef.current = window.setTimeout(run, 550);
  }, []);

  const applyResolvedZip = useCallback(
    (resolved, { validateExisting = true } = {}) => {
      if (!resolved) return;

      const list = resolved.zipOptions?.length
        ? resolved.zipOptions
        : resolved.zipCode
          ? [resolved.zipCode]
          : [];

      if (list.length > 0) {
        setZipOptions(list);
        setShowZipList(true);
      }

      const primaryZip = resolved.zipCode || list[0] || "";

      if (primaryZip) {
        onZipCodeChange(primaryZip);
        setGeoStatus({
          state: "match",
          message:
            list.length > 1
              ? `${list.length} ZIP codes found — pick one below or edit.`
              : "ZIP code filled from address.",
        });
        if (validateExisting) {
          scheduleValidation(
            String(address || resolved.formattedAddress || "").trim(),
            primaryZip,
            { immediate: true }
          );
        }
        return;
      }

      if (resolved.error) {
        setGeoStatus({ state: "mismatch", message: resolved.error });
      }
    },
    [address, zipCode, onZipCodeChange, scheduleValidation]
  );

  useEffect(() => {
    return () => {
      if (validateTimerRef.current) clearTimeout(validateTimerRef.current);
      if (resolveTimerRef.current) clearTimeout(resolveTimerRef.current);
    };
  }, []);

  const resolveFromAddress = useCallback(
    async (addr, place = null) => {
      const trimmed = String(addr || "").trim();
      if (trimmed.length < 3 || resolvingRef.current) return null;
      if (trimmed === lastResolvedAddressRef.current && !place) return null;

      resolvingRef.current = true;
      setGeoStatus({ state: "checking", message: "Looking up ZIP codes for address…" });
      try {
        const resolved = await resolveZipForAddress(trimmed, place);
        if (resolved?.zipCode || resolved?.zipOptions?.length) {
          lastResolvedAddressRef.current = trimmed;
          applyResolvedZip(resolved, { validateExisting: true });
        } else {
          lastResolvedAddressRef.current = "";
          setGeoStatus({
            state: "mismatch",
            message:
              resolved?.error ||
              "Could not find a ZIP for this address. Pick from the address dropdown or add a street address.",
          });
        }
        return resolved;
      } finally {
        resolvingRef.current = false;
      }
    },
    [applyResolvedZip]
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
        applyResolvedZip(resolved, { validateExisting: true });
      }
    },
    [address, applyResolvedZip]
  );

  const handleAddressChange = (e) => {
    lastResolvedAddressRef.current = "";
    onAddressChange(e);
    setShowZipList(false);
    setZipOptions([]);
    if (geoStatus.state !== "idle") {
      setGeoStatus({ state: "idle", message: "" });
    }
  };

  const handleAddressBlur = async () => {
    const addr = String(address || "").trim();
    if (!addr) return;
    await resolveFromAddress(addr, null);
  };

  const handleZipChange = (e) => {
    const next = formatZipInput(e.target.value);
    onZipCodeChange(next);

    if (validateTimerRef.current) {
      clearTimeout(validateTimerRef.current);
      validateTimerRef.current = null;
    }

    if (next.length !== 5) {
      setGeoStatus({ state: "idle", message: "" });
      return;
    }

    scheduleValidation(String(address || "").trim(), next);
  };

  const pickSuggestedZip = (zip) => {
    onZipCodeChange(zip);
    scheduleValidation(String(address || "").trim(), zip, { immediate: true });
  };

  const selectedZip = formatZipInput(zipCode);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_7.5rem]">
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
          placeholder="Start typing street or city — select from suggestions"
          required={addressRequired}
        />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-900">
            Zip code
          </label>
          <Input
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            list={zipOptions.length > 0 ? zipListId : undefined}
            maxLength={5}
            value={zipCode}
            onChange={handleZipChange}
            onFocus={() => {
              if (zipOptions.length > 0) setShowZipList(true);
            }}
            onBlur={() => {
              const zip = formatZipInput(zipCode);
              if (zip.length === 5) {
                scheduleValidation(String(address || "").trim(), zip, { immediate: true });
              }
            }}
            placeholder="98101"
            required={zipRequired}
            className={cn(
              geoStatus.state === "match" && "border-emerald-500 focus-visible:ring-emerald-500/30",
              geoStatus.state === "mismatch" && "border-red-500 focus-visible:ring-red-500/30"
            )}
            aria-invalid={geoStatus.state === "mismatch"}
            aria-describedby={geoStatus.message ? "facility-zip-geo-hint" : undefined}
          />
          {zipOptions.length > 0 && (
            <datalist id={zipListId}>
              {zipOptions.map((z) => (
                <option key={z} value={z} />
              ))}
            </datalist>
          )}
          {geoStatus.message ? (
            <p
              id="facility-zip-geo-hint"
              className={cn("text-xs leading-snug", STATUS_STYLES[geoStatus.state])}
              role={geoStatus.state === "mismatch" ? "alert" : "status"}
            >
              {geoStatus.message}
            </p>
          ) : null}
        </div>
      </div>

      {showZipList && zipOptions.length > 0 && (
        <div
          className="rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm"
          role="listbox"
          aria-label="ZIP codes for selected address"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
            ZIP codes for this address
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Click a ZIP to use it{zipOptions.length > 1 ? ` (${zipOptions.length} found)` : ""}.
          </p>
          <div className="mt-2 flex max-h-32 flex-wrap gap-2 overflow-y-auto">
            {zipOptions.map((z) => (
              <button
                key={z}
                type="button"
                role="option"
                aria-selected={selectedZip === z}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickSuggestedZip(z)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                  selectedZip === z
                    ? "border-[#00B8DB] bg-[#00B8DB] text-white"
                    : "border-slate-200 bg-white text-slate-800 hover:border-[#00B8DB]/50 hover:bg-cyan-50"
                )}
              >
                {z}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
