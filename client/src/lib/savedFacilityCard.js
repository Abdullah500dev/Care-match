const PLACEHOLDER_IMAGE = "/assets/images/footer-logo.svg";

function resolveFacilityImageUrl(path) {
  const raw = String(path || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw) || raw.startsWith("data:")) return raw;
  if (raw.startsWith("/")) return raw;
  return `/${raw.replace(/^\/+/, "")}`;
}

export function isCareMatchPartnerSavedFacility(saved) {
  if (!saved || typeof saved !== "object") return false;
  if (saved.isExternal === false || saved.is_external === false) return true;
  const platform = String(saved.sourcePlatform || saved.source_platform || "").toLowerCase();
  if (platform === "carematch") return true;
  const key = String(saved.facilityId || saved.id || "");
  return key.startsWith("owned-") || key.startsWith("snf-");
}

export function savedFacilityToCardProps(saved) {
  const src = saved && typeof saved === "object" ? saved : {};
  const rawId = String(src.facilityId || src.id || src._id || "").trim();
  const owned = isCareMatchPartnerSavedFacility(src);

  let facilityId = rawId;
  if (owned && rawId && !rawId.startsWith("owned-") && !rawId.startsWith("snf-")) {
    if (/^[a-f\d]{24}$/i.test(rawId)) facilityId = `owned-${rawId}`;
  }

  const imageUrls = Array.isArray(src.imageUrls)
    ? src.imageUrls.map((img) => resolveFacilityImageUrl(img)).filter(Boolean)
    : [];
  const imageSrc =
    resolveFacilityImageUrl(src.imageSrc) || imageUrls[0] || PLACEHOLDER_IMAGE;

  const careLevels = Array.isArray(src.careLevels)
    ? src.careLevels
    : Array.isArray(src.care_levels)
      ? src.care_levels
      : [];
  const amenities = Array.isArray(src.amenities) ? src.amenities : [];
  const services = Array.isArray(src.services) ? src.services : [];
  const features = Array.isArray(src.features) ? src.features : [];

  return {
    facilityId: facilityId || String(src.name || "saved-facility"),
    name: String(src.name || "Community"),
    category: String(src.category || "ASSISTED LIVING"),
    priceRange: String(src.priceRange || src.pricing || "").trim(),
    distance: String(src.distance || src.address || "Saved facility").trim(),
    address: String(src.address || ""),
    zipCode: String(src.zipCode || src.zip_code || ""),
    phone: String(src.phone || ""),
    email: String(src.email || ""),
    website: String(src.website || ""),
    imageSrc,
    imageUrls: imageUrls.length ? imageUrls : [imageSrc],
    sourcePlatform: String(src.sourcePlatform || src.source_platform || (owned ? "CareMatch" : "")),
    isExternal: !owned,
    externalSourceUrl: String(src.externalSourceUrl || src.external_source_url || ""),
    description: String(src.description || ""),
    careLevels,
    amenities,
    services,
    features,
    savedAt: src.savedAt || null,
  };
}
