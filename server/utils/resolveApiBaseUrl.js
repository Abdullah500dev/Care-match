const trimTrailingSlashes = (value) => String(value || "").trim().replace(/\/+$/, "");

const isLocalHostUrl = (value) => {
  if (!value) return false;
  try {
    const host = new URL(value.includes("://") ? value : `http://${value}`).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?/i.test(value);
  }
};

/**
 * Public base URL used inside emails (tracking pixels / links).
 * Must be reachable from phones and Gmail image proxies — never localhost.
 */
export const resolveEmailTrackingBaseUrl = (req) => {
  const configuredTracking = trimTrailingSlashes(process.env.EMAIL_TRACKING_BASE_URL);
  if (configuredTracking && !isLocalHostUrl(configuredTracking)) {
    return configuredTracking;
  }

  const configuredApi = trimTrailingSlashes(process.env.API_BASE_URL);
  if (configuredApi && !isLocalHostUrl(configuredApi)) {
    return configuredApi;
  }

  const forwardedHost = trimTrailingSlashes(req?.headers?.["x-forwarded-host"]);
  const forwardedProto =
    trimTrailingSlashes(req?.headers?.["x-forwarded-proto"]) || "https";
  const host = trimTrailingSlashes(req?.headers?.host);
  const proto = trimTrailingSlashes(req?.protocol) || "http";

  const requestBase = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : host
      ? `${proto}://${host}`
      : "";

  if (requestBase && !isLocalHostUrl(requestBase)) {
    return requestBase;
  }

  // Last resort — will NOT work for mobile email clients.
  return configuredApi || requestBase || "http://localhost:5274";
};

/** @deprecated Prefer resolveEmailTrackingBaseUrl for email embeds */
export const resolveApiBaseUrl = resolveEmailTrackingBaseUrl;
