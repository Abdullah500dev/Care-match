/** Position Google Places `.pac-container` (appended to document.body) under the active input. */

export function pickPacContainer(inputEl) {
  const pacContainers = Array.from(document.querySelectorAll(".pac-container"));
  if (pacContainers.length === 0) return null;

  const visible = pacContainers.filter(
    (pac) => pac.style.display !== "none" && pac.offsetParent !== null
  );
  if (visible.length === 1) return visible[0];

  if (visible.length > 1 && inputEl) {
    const inputRect = inputEl.getBoundingClientRect();
    return visible.reduce((best, pac) => {
      const distance = Math.abs(pac.getBoundingClientRect().top - inputRect.bottom);
      const bestDistance = Math.abs(best.getBoundingClientRect().top - inputRect.bottom);
      return distance < bestDistance ? pac : best;
    }, visible[0]);
  }

  return pacContainers[pacContainers.length - 1];
}

export function hidePacContainers() {
  document.querySelectorAll(".pac-container").forEach((node) => {
    node.style.display = "none";
    node.style.visibility = "hidden";
    node.style.pointerEvents = "none";
  });
}

export function syncPacContainer(inputEl) {
  if (!inputEl) return;
  const pac = pickPacContainer(inputEl);
  if (!pac) return;

  const rect = inputEl.getBoundingClientRect();
  const inViewport = rect.bottom > 80 && rect.top < window.innerHeight;
  if (!inViewport) {
    hidePacContainers();
    return;
  }

  pac.style.position = "fixed";
  pac.style.top = `${Math.round(rect.bottom + 2)}px`;
  pac.style.left = `${Math.round(rect.left)}px`;
  pac.style.width = `${Math.round(rect.width)}px`;
  pac.style.zIndex = "11000";
  pac.style.display = "block";
  pac.style.visibility = "visible";
  pac.style.pointerEvents = "auto";

  document.querySelectorAll(".pac-container").forEach((node) => {
    if (node !== pac) {
      node.style.display = "none";
      node.style.visibility = "hidden";
      node.style.pointerEvents = "none";
    }
  });
}
