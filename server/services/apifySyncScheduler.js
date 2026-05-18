import { syncFacilitiesFromApify } from "../controllers/facilityController.js";
import { isApifyIntegrationEnabled } from "../config/apify.js";

let timerId = null;
let isRunning = false;
let nextRunAt = null;
const syncStatus = {
  enabled: false,
  intervalMinutes: null,
  maxItems: null,
  isRunning: false,
  lastRunAt: null,
  lastSuccessAt: null,
  lastErrorAt: null,
  lastErrorMessage: "",
  lastResult: null,
  nextRunAt: null,
};

const toPositiveInt = (value, fallback) => {
  const n = Number.parseInt(String(value ?? ""), 10);
  if (Number.isNaN(n) || n <= 0) return fallback;
  return n;
};

const parseActorInputFromEnv = () => {
  const raw = String(process.env.APIFY_SYNC_ACTOR_INPUT_JSON || "").trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    console.error(
      "[apify-sync] APIFY_SYNC_ACTOR_INPUT_JSON is invalid JSON; using empty input"
    );
    return {};
  }
};

export const startApifySyncScheduler = () => {
  syncStatus.enabled = isApifyIntegrationEnabled();
  if (!syncStatus.enabled) {
    console.log("[apify-sync] scheduler not started (Apify integration disabled)");
    return;
  }

  const everyMinutes = toPositiveInt(process.env.APIFY_SYNC_INTERVAL_MINUTES, 360);
  const initialDelaySeconds = toPositiveInt(process.env.APIFY_SYNC_INITIAL_DELAY_SECONDS, 20);
  const maxItems = toPositiveInt(process.env.APIFY_SYNC_MAX_ITEMS, 200);
  const actorId = String(process.env.APIFY_ACTOR_ID || "").trim();
  const actorInputFromEnv = parseActorInputFromEnv();
  syncStatus.intervalMinutes = everyMinutes;
  syncStatus.maxItems = maxItems;

  const runOnce = async () => {
    if (isRunning) return;
    if (!isApifyIntegrationEnabled()) {
      stopApifySyncScheduler();
      syncStatus.enabled = false;
      return;
    }

    isRunning = true;
    syncStatus.isRunning = true;
    syncStatus.lastRunAt = new Date().toISOString();
    try {
      const result = await syncFacilitiesFromApify({
        ...(actorId ? { actorId } : {}),
        ...actorInputFromEnv,
        maxItems,
      });

      if (result?.disabled) {
        stopApifySyncScheduler();
        syncStatus.enabled = false;
        return;
      }

      syncStatus.lastSuccessAt = new Date().toISOString();
      syncStatus.lastErrorAt = null;
      syncStatus.lastErrorMessage = "";
      syncStatus.lastResult = {
        runId: result.runId,
        totalScraped: result.totalScraped,
        created: result.created,
        updated: result.updated,
      };
      console.log(
        `[apify-sync] completed runId=${result.runId} scraped=${result.totalScraped} created=${result.created} updated=${result.updated}`
      );
    } catch (error) {
      syncStatus.lastErrorAt = new Date().toISOString();
      syncStatus.lastErrorMessage = error.message || "Unknown scheduler error";
      console.error("[apify-sync] failed:", error.message);
    } finally {
      isRunning = false;
      syncStatus.isRunning = false;
      if (timerId) {
        nextRunAt = new Date(Date.now() + everyMinutes * 60 * 1000).toISOString();
        syncStatus.nextRunAt = nextRunAt;
      }
    }
  };

  nextRunAt = new Date(Date.now() + initialDelaySeconds * 1000).toISOString();
  syncStatus.nextRunAt = nextRunAt;
  setTimeout(runOnce, initialDelaySeconds * 1000);
  timerId = setInterval(runOnce, everyMinutes * 60 * 1000);
  console.log(
    `[apify-sync] scheduler enabled every ${everyMinutes} minutes (maxItems=${maxItems}, actor=${actorId || "default"})`
  );
};

export const stopApifySyncScheduler = () => {
  if (!timerId) return;
  clearInterval(timerId);
  timerId = null;
  nextRunAt = null;
  syncStatus.nextRunAt = null;
  syncStatus.isRunning = false;
};

export const getApifySyncStatus = () => ({ ...syncStatus, nextRunAt });
