import React, { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_PERIOD,
  PERIOD_OPTIONS,
  resolveDateRange,
} from "@/lib/dateRangePresets";

/**
 * Analytics / admin date filter dropdown.
 * Always offers: Today … Last Year + Custom.
 */
export default function DateRangeFilter({
  period = DEFAULT_PERIOD,
  customFrom = "",
  customTo = "",
  onPeriodChange,
  onCustomChange,
  className = "",
  triggerClassName = "",
}) {
  const range = useMemo(
    () => resolveDateRange(period, customFrom, customTo),
    [period, customFrom, customTo],
  );

  return (
    <div className={`flex flex-wrap items-end gap-2 ${className}`}>
      <Select value={period} onValueChange={onPeriodChange}>
        <SelectTrigger
          className={`h-9 w-[180px] rounded-xl border-slate-200 bg-white text-sm font-medium ${triggerClassName}`}
        >
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          {PERIOD_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-sm">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {period === "custom" && (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              From
            </label>
            <Input
              type="date"
              value={customFrom}
              max={customTo || undefined}
              onChange={(e) =>
                onCustomChange?.({ from: e.target.value, to: customTo })
              }
              className="h-9 w-[150px] rounded-xl border-slate-200 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              To
            </label>
            <Input
              type="date"
              value={customTo}
              min={customFrom || undefined}
              onChange={(e) =>
                onCustomChange?.({ from: customFrom, to: e.target.value })
              }
              className="h-9 w-[150px] rounded-xl border-slate-200 text-sm"
            />
          </div>
        </>
      )}

      {period !== "custom" && range && (
        <span className="hidden text-xs text-slate-400 sm:inline">
          {range.from} → {range.to}
        </span>
      )}
    </div>
  );
}
