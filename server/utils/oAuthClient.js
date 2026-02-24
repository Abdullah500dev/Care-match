import { google } from "googleapis";
import config from "../config/env.js";

const { OAuth2 } = google.auth;

const oAuth2Client = new OAuth2(
  config.O_AUTH_2_CLIENT_CLIENT_ID,
  config.O_AUTH_2_CLIENT_CLIENT_SECRET,
  `${config.CLIENT_BASE_URL}/oauth2callback`
);

oAuth2Client.setCredentials({
  refresh_token: config.O_AUTH_2_CLIENT_REFRESH_TOKEN,
});

const content = google.content({
  version: "v2.1",
  auth: oAuth2Client,
  timeout: 30000,
});

const MAX_RETRIES = 5;
const RETRY_DELAY_BASE = 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const retryWithExponentialBackoff = async (fn, retries = MAX_RETRIES) => {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error.message);
      if (
        attempt === retries - 1 ||
        ![500, 502, 503, 504].includes(error.code)
      ) {
        throw error;
      }
      const delay = RETRY_DELAY_BASE * Math.pow(2, attempt);
      console.log(`Retrying in ${delay}ms...`);
      await sleep(delay);
      attempt++;
    }
  }
};

export default { content, retryWithExponentialBackoff, sleep };
