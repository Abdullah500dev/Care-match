/**
 * Password reset tokens: plain token is emailed; hashed value + expiry live on the user document.
 * Override with RESET_PASSWORD_TOKEN_MINUTES in server .env (integer).
 */
const parsed = Number.parseInt(process.env.RESET_PASSWORD_TOKEN_MINUTES ?? "", 10);
export const RESET_PASSWORD_TOKEN_MINUTES =
  Number.isFinite(parsed) && parsed > 0 && parsed <= 24 * 60 ? parsed : 15;
