import React, { useState, useEffect, useRef } from "react";

const DEFAULT_DURATION_MS = 600;
const DEFAULT_OFFSET_PX = 40;

/**
 * Wraps children and animates them (fade-in + slide-up) when the element enters the viewport.
 * Use once per section so sections animate as you scroll to them.
 */
export default function AnimateOnScroll({
  children,
  className = "",
  durationMs = DEFAULT_DURATION_MS,
  offsetY = 24,
  rootMargin = `0px 0px -${DEFAULT_OFFSET_PX}px 0px`,
  threshold = 0,
}) {
  const [inView, setInView] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { threshold, rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : `translateY(${offsetY}px)`,
        transition: `opacity ${durationMs}ms ease-out, transform ${durationMs}ms ease-out`,
      }}
    >
      {children}
    </div>
  );
}
