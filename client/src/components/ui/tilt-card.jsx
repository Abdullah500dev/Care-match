import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Wrapper that adds a 3D tilt effect on hover. Use on any card or element.
 * @param {number} maxTilt - Max rotation in degrees (default 20)
 * @param {number} perspective - CSS perspective value (default 1000)
 */
const TiltCard = React.forwardRef(
  ({ className, innerClassName, innerStyle, children, maxTilt = 20, perspective = 1000, ...props }, ref) => {
    const cardRef = React.useRef(null);
    const innerRef = ref ?? cardRef;

    React.useEffect(() => {
      const card = innerRef?.current ?? cardRef.current;
      if (!card) return;

      // Only enable tilt on devices that support hover (desktop); skip on touch devices
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const supportsHover = window.matchMedia("(hover: hover)").matches;
      if (prefersReducedMotion || !supportsHover) return;

      const handleMouseMove = (e) => {
        const { width, height, left, top } = card.getBoundingClientRect();
        const x = e.clientX - left;
        const y = e.clientY - top;
        const rotateX = ((y / height) - 0.5) * -maxTilt;
        const rotateY = ((x / width) - 0.5) * maxTilt;
        card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      };

      const handleMouseLeave = () => {
        card.style.transform = "rotateX(0deg) rotateY(0deg)";
      };

      card.addEventListener("mousemove", handleMouseMove);
      card.addEventListener("mouseleave", handleMouseLeave);
      return () => {
        card.removeEventListener("mousemove", handleMouseMove);
        card.removeEventListener("mouseleave", handleMouseLeave);
      };
    }, [maxTilt]);

    return (
      <div
        className={cn("tilt-container min-w-0", className)}
        style={{ perspective }}
        {...props}
      >
        <div
          ref={innerRef}
          className={cn("tilt-card h-full w-full min-w-0", innerClassName)}
          style={{
            transformStyle: "preserve-3d",
            willChange: "transform",
            transition: "transform 0.1s ease",
            ...innerStyle,
          }}
        >
          {children}
        </div>
      </div>
    );
  }
);
TiltCard.displayName = "TiltCard";

export { TiltCard };
