import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Star } from "lucide-react";

const FACILITIES_DATA = [
  {
    id: 1,
    type: "Assisted Living",
    rating: "4.9",
    name: "Sunrise Villa Senior Living",
    location: "Los Angeles, CA",
    units: "120",
    occupancy: "92%",
    activeLeads: "24",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=220&fit=crop",
  },
  {
    id: 2,
    type: "Memory Care",
    rating: "4.7",
    name: "Golden Years Memory",
    location: "Los Angeles, CA",
    units: "45",
    occupancy: "85%",
    activeLeads: "24",
    image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=400&h=220&fit=crop",
  },
];

export default function Communities() {
  return (
    <div
      className="mx-auto w-full min-w-0 max-w-5xl space-y-6"
      style={{ fontFamily: "Rethink Sans, sans-serif" }}
    >
      {/* Header */}
      <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex flex-col">
          <h1
            className="flex items-center text-xl font-bold tracking-tight text-slate-900 sm:text-2xl md:text-3xl lg:h-9"
            style={{ maxWidth: "100%" }}
          >
            Facilities
          </h1>
          <p
            className="mt-1 text-sm text-slate-500 md:text-base lg:h-6"
            style={{ maxWidth: "100%" }}
          >
            Manage your facilities and track performance.
          </p>
        </div>
      </div>

      {/* Facility cards grid */}
      <div className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2">
        {FACILITIES_DATA.map((facility) => (
          <Card
            key={facility.id}
            className="min-w-0 overflow-hidden rounded-[28px] border-slate-200 bg-white shadow-sm"
          >
            {/* Image section with overlays - name & location on picture */}
            <div className="relative aspect-[400/220] w-full overflow-hidden rounded-t-[28px] bg-slate-200">
              <img
                src={facility.image}
                alt={facility.name}
                className="h-full w-full object-cover"
              />
              {/* Gradient overlay so text is readable */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              {/* Type + Rating pills - top left, side by side */}
              <div className="absolute left-3 top-3 flex items-center gap-2">
                <span
                  className="rounded-full px-3 py-1 text-xs font-medium text-white"
                  style={{ backgroundColor: "#00B8DB" }}
                >
                  {facility.type}
                </span>
                <span className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-900 shadow-sm">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {facility.rating}
                </span>
              </div>
              {/* Name & location - bottom left on image, white text */}
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <h3 className="text-lg font-bold drop-shadow-md sm:text-xl">
                  {facility.name}
                </h3>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-white/95 drop-shadow-md">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {facility.location}
                </p>
              </div>
            </div>

            <CardContent className="space-y-4 p-4 sm:p-5">
              {/* Data cards - exact match to picture: #F8F8FA bg, rounded, light grey labels */}
              <div className="grid grid-cols-3 gap-2">
                <div
                  className="rounded-2xl px-3 py-3 text-center"
                  style={{ backgroundColor: "#F8F8FA" }}
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Units
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {facility.units}
                  </p>
                </div>
                <div
                  className="rounded-2xl px-3 py-3 text-center"
                  style={{ backgroundColor: "#F8F8FA" }}
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Occupancy
                  </p>
                  <p className="mt-1 text-xl font-bold text-emerald-600">
                    {facility.occupancy}
                  </p>
                </div>
                <div
                  className="rounded-2xl px-3 py-3 text-center"
                  style={{ backgroundColor: "#F8F8FA" }}
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Active Leads
                  </p>
                  <p className="mt-1 text-xl font-bold text-[#00B8DB]">
                    {facility.activeLeads}
                  </p>
                </div>
              </div>

              {/* Action buttons - 70% Manage Facility, 30% View Analytics */}
              <div className="flex gap-2 pt-1">
                <Button
                  size="default"
                  className="w-[70%] shrink-0 rounded-2xl font-semibold text-white"
                  style={{ background: "#1A1E2F" }}
                >
                  Manage Facility
                </Button>
                <Button
                  variant="outline"
                  size="default"
                  className="w-[30%] shrink-0 rounded-2xl border-slate-200 font-semibold text-slate-900"
                >
                  View Analytics
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
