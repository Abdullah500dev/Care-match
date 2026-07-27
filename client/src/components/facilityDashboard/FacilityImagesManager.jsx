import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/services/api";
import { toast } from "sonner";

const MAX_IMAGES = 8;

function resolveSingleImageUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const base = import.meta.env.VITE_REACT_APP_API_BASE_URL || "";
  return `${String(base).replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Upload / remove facility images for the logged-in facility user.
 */
export default function FacilityImagesManager({
  facility,
  onFacilityUpdated,
  className = "",
}) {
  const [keptImagePaths, setKeptImagePaths] = useState([]);
  const [selectedImages, setSelectedImages] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setKeptImagePaths(Array.isArray(facility?.images) ? [...facility.images] : []);
    setSelectedImages([]);
  }, [facility?._id, facility?.images]);

  const previewUrls = useMemo(
    () => selectedImages.map((file) => URL.createObjectURL(file)),
    [selectedImages],
  );

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const slotsMax = Math.max(0, MAX_IMAGES - keptImagePaths.length);
  const slotsLeft = Math.max(0, slotsMax - selectedImages.length);
  const dirty =
    selectedImages.length > 0 ||
    JSON.stringify(keptImagePaths) !== JSON.stringify(facility?.images || []);

  const addFiles = useCallback(
    (fileList) => {
      const incoming = Array.from(fileList || []).filter((f) =>
        String(f.type || "").startsWith("image/"),
      );
      if (!incoming.length) return;
      setSelectedImages((prev) => {
        const room = Math.max(0, MAX_IMAGES - keptImagePaths.length - prev.length);
        if (room <= 0) {
          toast.error("Image limit reached", {
            description: `You can upload up to ${MAX_IMAGES} images.`,
          });
          return prev;
        }
        return [...prev, ...incoming.slice(0, room)];
      });
    },
    [keptImagePaths.length],
  );

  const handleSaveImages = async () => {
    if (!facility?._id && !facility?.name) {
      toast.error("No facility linked to this account.");
      return;
    }
    try {
      setSaving(true);
      const payload = new FormData();
      // Keep existing profile fields so multipart update doesn't wipe them.
      payload.append("name", facility.name || "");
      payload.append("phone", facility.phone || "");
      payload.append("address", facility.address || "");
      const zip = String(facility.zip_code || "").replace(/\D/g, "").slice(0, 5);
      if (zip.length === 5) payload.append("zip_code", zip);
      payload.append("website", facility.website || "");
      payload.append("pricing", facility.pricing || "");
      payload.append("units", String(facility.units ?? 0));
      payload.append("occupancy", String(facility.occupancy ?? 0));
      payload.append("active_leads", String(facility.active_leads ?? 0));
      (facility.services || []).forEach((s) => payload.append("services", s));
      (facility.amenities || []).forEach((a) => payload.append("amenities", a));
      (facility.care_levels || []).forEach((c) => payload.append("care_levels", c));
      payload.append("keep_image_paths", JSON.stringify(keptImagePaths));
      selectedImages.forEach((file) => payload.append("images", file));

      const { data } = await apiClient.put("/api/facilities/me", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const updated = data?.facility;
      if (updated) {
        onFacilityUpdated?.(updated);
        setKeptImagePaths(Array.isArray(updated.images) ? [...updated.images] : []);
        setSelectedImages([]);
      }
      toast.success("Facility images saved.");
    } catch (error) {
      toast.error("Unable to save images", {
        description: error?.response?.data?.message || "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 ${className}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900">Facility images</h2>
          <p className="text-sm text-slate-500">
            Add photos for your community (max {MAX_IMAGES}).
          </p>
        </div>
        <Button
          type="button"
          disabled={saving || !dirty}
          onClick={handleSaveImages}
          className="bg-[#00B8DB] hover:bg-[#00B8DB]/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save images"}
        </Button>
      </div>

      {keptImagePaths.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-3">
          {keptImagePaths.map((imgPath) => (
            <div
              key={imgPath}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <img
                src={resolveSingleImageUrl(imgPath)}
                alt=""
                className="h-20 w-20 object-cover"
              />
              <button
                type="button"
                onClick={() =>
                  setKeptImagePaths((prev) => prev.filter((p) => p !== imgPath))
                }
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/75 text-white opacity-0 transition hover:bg-red-600 group-hover:opacity-100"
                aria-label="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {slotsMax === 0 ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-xs font-medium text-amber-950">
          Image limit reached ({MAX_IMAGES} total). Remove an image to add more.
        </p>
      ) : (
        <div
          className="relative overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-gradient-to-br from-slate-50 via-white to-cyan-50/40 transition hover:border-[#00B8DB]/50"
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            addFiles(e.dataTransfer?.files);
          }}
        >
          <input
            id="facility-dashboard-images-input"
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <label
            htmlFor="facility-dashboard-images-input"
            className="relative flex cursor-pointer flex-col items-center gap-2 px-4 py-8"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00B8DB] to-cyan-600 text-white shadow-lg shadow-cyan-500/25">
              <ImagePlus className="h-7 w-7" strokeWidth={1.75} />
            </div>
            <span className="text-sm font-semibold text-slate-800">
              Drop images here or click to browse
            </span>
            <span className="text-center text-xs text-slate-500">
              JPG, PNG, WebP — {slotsLeft} of {slotsMax} upload slot
              {slotsMax === 1 ? "" : "s"} left
            </span>
          </label>
        </div>
      )}

      {selectedImages.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {selectedImages.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="group relative overflow-hidden rounded-2xl border border-cyan-100 bg-white shadow-sm"
            >
              <img
                src={previewUrls[index]}
                alt=""
                className="h-24 w-full object-cover"
              />
              <button
                type="button"
                onClick={() =>
                  setSelectedImages((prev) => prev.filter((_, i) => i !== index))
                }
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/75 text-white hover:bg-red-600"
                aria-label="Remove new image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <p className="truncate px-2 py-1 text-[10px] text-slate-600">{file.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
