const trimTrailingSlashes = (value) => String(value || "").trim().replace(/\/+$/, "");

const isLocalHostUrl = (value) => {
  if (!value) return false;
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?$/i.test(value);
};

const originFromUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    return trimTrailingSlashes(new URL(raw).origin);
  } catch {
    return "";
  }
};

const resolveRequestBase = (req) => {
  const requestOrigin = trimTrailingSlashes(req?.headers?.origin);
  if (requestOrigin) return requestOrigin;

  const refererOrigin = originFromUrl(req?.headers?.referer);
  if (refererOrigin) return refererOrigin;

  const forwardedHost = trimTrailingSlashes(req?.headers?.["x-forwarded-host"]);
  const forwardedProto = trimTrailingSlashes(req?.headers?.["x-forwarded-proto"]) || "https";
  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`;

  const host = trimTrailingSlashes(req?.headers?.host);
  const proto = trimTrailingSlashes(req?.protocol) || "http";
  if (host) return `${proto}://${host}`;

  return "";
};

export const resolveClientBaseUrl = (req) => {
  const configuredBase = [
    process.env.CLIENT_BASE_URL,
    process.env.FRONTEND_URL,
    process.env.APP_BASE_URL,
    process.env.WEB_BASE_URL,
  ]
    .map(trimTrailingSlashes)
    .find(Boolean);

  const requestBase = resolveRequestBase(req);

  // If env is still localhost in a deployed environment, prefer actual request origin.
  if (
    configuredBase &&
    isLocalHostUrl(configuredBase) &&
    requestBase &&
    !isLocalHostUrl(requestBase)
  ) {
    return requestBase;
  }

  if (configuredBase) return configuredBase;
  if (requestBase) return requestBase;

  // Local dev fallback.
  return "http://localhost:5173";
};

