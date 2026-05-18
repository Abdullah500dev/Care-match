/**
 * Master switch for Apify integration (scheduler + manual import).
 * Set to true only when Apify quota is available and APIFY_SYNC_ENABLED=true in env.
 */
export const APIFY_INTEGRATION_ENABLED = false;

export const isApifyIntegrationEnabled = () => {
  if (!APIFY_INTEGRATION_ENABLED) return false;
  return String(process.env.APIFY_SYNC_ENABLED || "").toLowerCase() === "true";
};

export const APIFY_DISABLED_RESULT = {
  disabled: true,
  runId: null,
  totalScraped: 0,
  created: 0,
  updated: 0,
};
