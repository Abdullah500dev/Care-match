import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToHash() {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;

    const targetId = hash.replace("#", "");
    const topOffset = 100;
    let timeoutId;
    let attempts = 0;
    const maxAttempts = 20;

    const scrollToTarget = () => {
      const el = document.getElementById(targetId);

      if (!el) {
        if (attempts < maxAttempts) {
          attempts += 1;
          timeoutId = window.setTimeout(scrollToTarget, 75);
        }
        return;
      }

      const y = Math.max(0, el.getBoundingClientRect().top + window.scrollY - topOffset);
      window.scrollTo({ top: y, behavior: "smooth" });
    };

    scrollToTarget();

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [hash]);

  return null;
}