/** Offset below sticky header (TopBar + nav) so the hero tagline is fully visible. */
export const CARRIE_HERO_SCROLL_OFFSET_PX = 128;

export const CHAT_OPEN_AFTER_CARRIE_SCROLL_MS = 400;

/**
 * Scroll to the hero banner “Let Carrie help you discover…” copy (not the search bar).
 */
export function scrollToCarrieHeroTagline(options = {}) {
  const behavior = options.behavior ?? "auto";
  const el = document.getElementById("carrie-hero-tagline");
  if (!el) return;
  const top =
    el.getBoundingClientRect().top + window.scrollY - CARRIE_HERO_SCROLL_OFFSET_PX;
  window.scrollTo({ top: Math.max(0, top), behavior });
}

export function scrollToCarrieHeroThenOpenChat(detail = {}) {
  scrollToCarrieHeroTagline({ behavior: "auto" });
  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent("carematch:open-chat-request", { detail }));
  }, CHAT_OPEN_AFTER_CARRIE_SCROLL_MS);
}
