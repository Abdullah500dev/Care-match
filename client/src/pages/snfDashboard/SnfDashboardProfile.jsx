import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import SEO from "@/components/common/SEO";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/services/api";
import FacilityAddressZipFields from "@/components/dashboard/facilities/FacilityAddressZipFields";
import FacilityImagesManager from "@/components/facilityDashboard/FacilityImagesManager";
import { extractZipFromAddress, formatZipInput, validateAddressZipPair } from "@/lib/facilityAddressGeo";
import { normalizeFacilityWebsite } from "@/lib/facilityWebsite";
import { formatPhoneInput, phoneDigitsOnly } from "@/lib/formatPhone";

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  website: "",
  address: "",
  zip_code: "",
  pricing: "",
  services: "",
  amenities: "",
  care_levels: "",
  units: "",
  occupancy: "",
};

const toCsv = (arr) => (Array.isArray(arr) ? arr.join(", ") : "");

function formatPricingInput(value) {
  const raw = String(value || "");
  let body = raw.replace(/\$/g, "").replace(/,/g, "");
  body = body.replace(/[^\d\s-]/g, "");
  const parts = body.split(/\s*-\s*/);
  const leftDigits = (parts[0] ?? "").replace(/\D/g, "").slice(0, 8);
  const rightDigits =
    parts.length > 1 ? parts.slice(1).join("").replace(/\D/g, "").slice(0, 8) : "";
  const fmt = (digits) => {
    if (!digits) return "";
    const num = Number.parseInt(digits, 10);
    if (Number.isNaN(num)) return "";
    return `$${num.toLocaleString("en-US")}`;
  };
  if (parts.length > 1) {
    return rightDigits ? `${fmt(leftDigits)}-${fmt(rightDigits)}` : `${fmt(leftDigits)}-`;
  }
  return fmt(leftDigits);
}

export default function SnfDashboardProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [partner, setPartner] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState(null);

  const hasPartner = Boolean(partner);

  const parseCsv = (value) =>
    String(value || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

  const fillForm = (doc) => {
    const nextForm = {
      name: doc?.name || "",
      email: doc?.email || "",
      phone: formatPhoneInput(doc?.phone || ""),
      website: doc?.website || "",
      address: doc?.address || "",
      zip_code: formatZipInput(doc?.zip_code),
      pricing: formatPricingInput(doc?.pricing || ""),
      services: toCsv(doc?.services),
      amenities: toCsv(doc?.amenities),
      care_levels: toCsv(doc?.care_levels),
      units: doc?.units ?? 0,
      occupancy: doc?.occupancy ?? 0,
    };
    setForm(nextForm);
    setLastSavedSnapshot(JSON.stringify(nextForm));
  };

  const loadPartner = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get("/api/snf-partners/me");
      const doc = data?.partner || null;
      setPartner(doc);
      if (doc) fillForm(doc);
    } catch (error) {
      setPartner(null);
      if (error?.response?.status !== 404) {
        toast.error("Could not load SNF profile", {
          description:
            error?.response?.data?.message ||
            "Ask an admin to onboard your SNF partner account first.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPartner();
  }, []);

  const metrics = useMemo(
    () => [
      { label: "Units", value: form.units || 0 },
      { label: "Occupancy", value: form.occupancy || 0 },
      { label: "Referrals", value: partner?.totalReferrals ?? 0 },
    ],
    [form.occupancy, form.units, partner?.totalReferrals],
  );
  const isPristine = JSON.stringify(form) === lastSavedSnapshot;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!hasPartner) return;
    if (!String(form.name).trim() || !String(form.phone).trim() || !String(form.address).trim()) {
      toast.error("Name, phone, and address are required.");
      return;
    }

    const phoneFormatted = formatPhoneInput(form.phone);
    if (phoneDigitsOnly(phoneFormatted).length !== 10) {
      toast.error("Invalid phone number", {
        description: "Enter a 10-digit US phone number, e.g. (206) 555-0123.",
      });
      return;
    }

    const zipDigits =
      formatZipInput(form.zip_code) || extractZipFromAddress(form.address);
    if (zipDigits.length !== 5) {
      toast.error("ZIP code required", {
        description:
          "Include a valid 5-digit US ZIP in the address (e.g. Avenel, NJ 07001).",
      });
      return;
    }

    const geoCheck = await validateAddressZipPair(form.address, zipDigits);
    if (geoCheck.state === "mismatch") {
      toast.error("Address ZIP could not be verified", {
        description: geoCheck.message,
      });
      return;
    }

    const normalizedWebsite = normalizeFacilityWebsite(form.website);
    if (String(form.website || "").trim() && !normalizedWebsite) {
      toast.error("Invalid website", {
        description: "Enter a valid URL (e.g. https://www.yourfacility.com).",
      });
      return;
    }

    const payload = {
      name: String(form.name).trim(),
      phone: phoneFormatted,
      website: normalizedWebsite,
      address: String(form.address).trim(),
      zip_code: zipDigits,
      pricing: String(form.pricing || "").trim(),
      services: parseCsv(form.services),
      amenities: parseCsv(form.amenities),
      care_levels: parseCsv(form.care_levels),
      units: Number(form.units) || 0,
      occupancy: Number(form.occupancy) || 0,
    };

    try {
      setSaving(true);
      const { data } = await apiClient.put("/api/snf-partners/me", payload);
      const updated = data?.partner;
      if (updated) {
        setPartner(updated);
        fillForm(updated);
      }
      toast.success("SNF profile updated.");
    } catch (error) {
      toast.error("Unable to update SNF profile", {
        description: error?.response?.data?.message || "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <SEO title="My SNF – CareMatch AI" />
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My SNF</h1>
        <p className="text-slate-500">
          This profile is linked to your admin-created skilled nursing partner account.
        </p>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          Loading SNF profile...
        </div>
      ) : !hasPartner ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          No SNF partner is linked to your account yet. Please ask an admin to onboard your
          facility from SNF Partners.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {metrics.map((m) => (
              <div key={m.label} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {m.label}
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{m.value}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleSave} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Facility name</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                <Input value={form.email} disabled className="cursor-not-allowed bg-slate-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
                <Input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, phone: formatPhoneInput(e.target.value) }))
                  }
                  placeholder="(206) 555-0123"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Monthly Pricing</label>
                <Input
                  value={form.pricing}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, pricing: formatPricingInput(e.target.value) }))
                  }
                  placeholder="$4,500 or $4,500-$6,800"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Website</label>
                <Input
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  value={form.website}
                  onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
                  placeholder="https://www.yourfacility.com"
                />
              </div>
            </div>

            <div className="mt-4">
              <FacilityAddressZipFields
                address={form.address}
                zipCode={form.zip_code}
                onAddressChange={(e) =>
                  setForm((p) => ({ ...p, address: e.target.value }))
                }
                onZipCodeChange={(zip) => setForm((p) => ({ ...p, zip_code: zip }))}
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Services (comma separated)
                </label>
                <Input
                  value={form.services}
                  onChange={(e) => setForm((p) => ({ ...p, services: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Amenities (comma separated)
                </label>
                <Input
                  value={form.amenities}
                  onChange={(e) => setForm((p) => ({ ...p, amenities: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Care levels (comma separated)
                </label>
                <Input
                  value={form.care_levels}
                  onChange={(e) => setForm((p) => ({ ...p, care_levels: e.target.value }))}
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Units</label>
                <Input
                  type="number"
                  min="0"
                  value={form.units}
                  onChange={(e) => setForm((p) => ({ ...p, units: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Occupancy</label>
                <Input
                  type="number"
                  min="0"
                  value={form.occupancy}
                  onChange={(e) => setForm((p) => ({ ...p, occupancy: e.target.value }))}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={saving || isPristine}
              className="mt-5 bg-[#00B8DB] hover:bg-[#00B8DB]/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : isPristine ? "Saved" : "Save SNF profile"}
            </Button>
          </form>

          <FacilityImagesManager
            facility={partner}
            onFacilityUpdated={(updated) => {
              setPartner(updated);
              fillForm(updated);
            }}
            updateUrl="/api/snf-partners/me"
            responseKey="partner"
            title="Change SNF images"
            description="Upload, replace, or remove photos for your skilled nursing facility (max 8)."
          />
        </>
      )}
    </div>
  );
}
