/**
 * Greeting name for transactional emails: prefer the friendly name derived from the
 * recipient's email local part (e.g. saad.khan@mail.com → "Saad Khan") so it matches their
 * inbox identity, then fall back to the stored profile name.
 */
export function greetingNameForEmail(user) {
  const profileName = typeof user?.name === "string" ? user.name.trim() : "";
  const email = typeof user?.email === "string" ? user.email.trim() : "";

  if (email.includes("@")) {
    const local = email.split("@")[0] || "";
    const fromEmail = local
      .replace(/[._-]+/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => {
        const w = word.toLowerCase();
        if (!w) return "";
        return w.charAt(0).toUpperCase() + w.slice(1);
      })
      .filter(Boolean)
      .join(" ");

    if (fromEmail.length > 0) return fromEmail;
  }

  if (profileName.length > 0) return profileName;
  return "there";
}
