import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const thumbClass = "block h-5 w-5 rounded-full border-2 border-[#00CFF4] bg-white shadow-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00CFF4] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

const Slider = React.forwardRef(({ className, ...props }, ref) => {
  const val = props.value ?? props.defaultValue;
  const isRange = Array.isArray(val) && val.length === 2;
  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      {...props}
    >
      <SliderPrimitive.Track
        className="relative h-3 w-full grow overflow-hidden rounded-full bg-[#f8fafc]"
      >
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-[#00CFF4]" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className={thumbClass} />
      {isRange ? <SliderPrimitive.Thumb className={thumbClass} /> : null}
    </SliderPrimitive.Root>
  );
})
Slider.displayName = SliderPrimitive.Root.displayName

/** Uncontrolled range slider with two thumbs for budget min/max. Uses defaultValue so both thumbs stay draggable. */
function BudgetRangeSlider({ budgetMin, budgetMax, min, max, step, onRangeChange, className }) {
  return (
    <SliderPrimitive.Root
      className={cn("relative flex w-full touch-none select-none items-center py-4", className)}
      defaultValue={[budgetMin, budgetMax]}
      min={min}
      max={max}
      step={step}
      onValueChange={(v) => {
        if (Array.isArray(v) && v.length >= 2) onRangeChange(v[0], v[1]);
      }}
    >
      <SliderPrimitive.Track className="relative h-3 w-full grow overflow-hidden rounded-full bg-[#f8fafc]">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-[#00CFF4]" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className={thumbClass} />
      <SliderPrimitive.Thumb className={thumbClass} />
    </SliderPrimitive.Root>
  );
}

export { Slider, BudgetRangeSlider }
