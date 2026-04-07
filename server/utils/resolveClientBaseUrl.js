const trimTrailingSlashes = (value) => String(value || "").trim().replace(/\/+$/, "");

const isLocalHostUrl = (value) => {
  if (!value) return false;
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?$/i.test(value);
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

  const requestOrigin = trimTrailingSlashes(req?.headers?.origin);

  // If env is still localhost in a deployed environment, prefer actual request origin.
  if (
    configuredBase &&
    isLocalHostUrl(configuredBase) &&
    requestOrigin &&
    !isLocalHostUrl(requestOrigin)
  ) {
    return requestOrigin;
  }

  if (configuredBase) return configuredBase;
  if (requestOrigin) return requestOrigin;

  // Local dev fallback.
  return "http://localhost:5173";
};

