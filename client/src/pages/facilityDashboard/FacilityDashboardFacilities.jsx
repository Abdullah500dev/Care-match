import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import SEO from "@/components/common/SEO";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/services/api";

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  address: "",
  pricing: "",
  services: "",
  amenities: "",
  care_levels: "",
  units: "",
  occupancy: "",
  active_leads: "",
};

const toCsv = (arr) => (Array.isArray(arr) ? arr.join(", ") : "");

export default function FacilityDashboardFacilities() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [facility, setFacility] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState(null);

  const hasFacility = Boolean(facility);

  const parseCsv = (value) =>
    String(value || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

  const fillForm = (doc) => {
    const nextForm = {
      name: doc?.name || "",
      email: doc?.email || "",
      phone: doc?.phone || "",
      address: doc?.address || "",
      pricing: doc?.pricing || "",
      services: toCsv(doc?.services),
      amenities: toCsv(doc?.amenities),
      care_levels: toCsv(doc?.care_levels),
      units: doc?.units ?? 0,
      occupancy: doc?.occupancy ?? 0,
      active_leads: doc?.active_leads ?? 0,
    };
    setForm(nextForm);
    setLastSavedSnapshot(JSON.stringify(nextForm));
  };

  const loadFacility = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get("/api/facilities/me");
      const doc = data?.facility || null;
      setFacility(doc);
      if (doc) fillForm(doc);
    } catch (error) {
      setFacility(null);
      toast.error("Could not load facility profile", {
        description:
          error?.response?.data?.message ||
          "Ask an admin to create/link your facility account first.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFacility();
  }, []);

  const metrics = useMemo(
    () => [
      { label: "Units", value: form.units || 0 },
      { label: "Occupancy", value: form.occupancy || 0 },
      { label: "Active Leads", value: form.active_leads || 0 },
    ],
    [form.active_leads, form.occupancy, form.units]
  );
  const isPristine = JSON.stringify(form) === lastSavedSnapshot;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!hasFacility) return;
    if (!String(form.name).trim() || !String(form.phone).trim() || !String(form.address).trim()) {
      toast.error("Name, phone, and address are required.");
      return;
    }

    const payload = {
      name: String(form.name).trim(),
      phone: String(form.phone).trim(),
      address: String(form.address).trim(),
      pricing: String(form.pricing || "").trim(),
      services: parseCsv(form.services),
      amenities: parseCsv(form.amenities),
      care_levels: parseCsv(form.care_levels),
      units: Number(form.units) || 0,
      occupancy: Number(form.occupancy) || 0,
      active_leads: Number(form.active_leads) || 0,
    };

    try {
      setSaving(true);
      const { data } = await apiClient.put("/api/facilities/me", payload);
      const updated = data?.facility;
      if (updated) {
        setFacility(updated);
        fillForm(updated);
      }
      toast.success("Facility profile updated.");
    } catch (error) {
      toast.error("Unable to update facility profile", {
        description: error?.response?.data?.message || "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <SEO title="My Facility – CareMatch AI" />
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Facility</h1>
        <p className="text-slate-500">
          This profile is linked to your admin-created facility account.
        </p>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          Loading facility profile...
        </div>
      ) : !hasFacility ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          No facility is linked to your account yet. Please ask an admin to create your facility
          entry from the admin Facilities section.
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
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Pricing</label>
                <Input
                  value={form.pricing}
                  onChange={(e) => setForm((p) => ({ ...p, pricing: e.target.value }))}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
              <Input
                value={form.address}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
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

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
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
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Active leads</label>
                <Input
                  type="number"
                  min="0"
                  value={form.active_leads}
                  onChange={(e) => setForm((p) => ({ ...p, active_leads: e.target.value }))}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={saving || isPristine}
              className="mt-5 bg-[#00B8DB] hover:bg-[#00B8DB]/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : isPristine ? "Saved" : "Save facility profile"}
            </Button>
          </form>
        </>
      )}
    </div>
  );
}

