import React, { useState, useEffect, useRef } from "react";

/**
 * Parses a value string like "48", "1,284", "8.4%", "+12%" into
 * { numericValue, prefix, suffix }.
 */
function parseValueString(str) {
  const trimmed = String(str).trim();
  let prefix = "";
  let suffix = "";
  let numStr = trimmed;

  if (trimmed.startsWith("+") || trimmed.startsWith("-")) {
    prefix = trimmed.slice(0, 1);
    numStr = trimmed.slice(1);
  }
  if (numStr.endsWith("%")) {
    suffix = "%";
    numStr = numStr.slice(0, -1);
  }
  const numericValue = parseFloat(numStr.replace(/,/g, "")) || 0;
  const isDecimal = String(numStr).includes(".") || numericValue % 1 !== 0;
  return { numericValue, prefix, suffix, isDecimal };
}

/**
 * Formats a number for display (e.g. 1284 -> "1,284", 8.4 -> "8.4").
 */
function formatDisplayNumber(value, isDecimal) {
  if (isDecimal) {
    return value.toFixed(1);
  }
  const int = Math.round(value);
  return int.toLocaleString();
}

/**
 * Animates from 0 to the target value over duration using easeOutExpo.
 * Optionally starts only when the element is in view.
 */
export default function AnimatedNumber({
  value,
  durationMs = 1500,
  startOnView = true,
  className = "",
}) {
  const { numericValue, prefix, suffix, isDecimal } = parseValueString(value);
  const [displayValue, setDisplayValue] = useState(0);
  const [hasStarted, setHasStarted] = useState(!startOnView);
  const ref = useRef(null);
  const rafRef = useRef(null);

  // IntersectionObserver: start animation when in view
  useEffect(() => {
    if (!startOnView || numericValue === 0) {
      setHasStarted(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setHasStarted(true);
      },
      { threshold: 0.1, rootMargin: "0px 0px -20px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [startOnView, numericValue]);

  // Count-up animation
  useEffect(() => {
    if (!hasStarted || numericValue === 0) {
      setDisplayValue(0);
      return;
    }
    const startTime = performance.now();
    const endValue = numericValue;

    const tick = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / durationMs, 1);
      // easeOutExpo: smooth deceleration at the end
      const eased = t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
      const current = eased * endValue;
      setDisplayValue(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [hasStarted, numericValue, durationMs]);

  const formatted = formatDisplayNumber(displayValue, isDecimal);
  const display = `${prefix}${formatted}${suffix}`;

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
