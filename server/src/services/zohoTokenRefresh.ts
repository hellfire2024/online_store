import { pool } from "../db/connection.js";
import { decryptData } from "../utils/encryption.js";
import axios from "axios";

interface EmailConfig {
  zoho_client_id: string;
  zoho_client_secret: string;
  zoho_refresh_token: string;
  zoho_token_expires_at?: string;
}

/**
 * Detect if token is a Self Client token (permanent) or OAuth refresh token
 */
function isSelfClientToken(token: string): boolean {
  return token.includes(".") && token.split(".").length === 3;
}

/**
 * Automatically refresh Zoho access token if close to expiration
 * This runs periodically to ensure we always have valid tokens
 * Skip for Self Client tokens (they don't expire)
 */
export async function refreshZohoTokenIfNeeded() {
  try {
    const [rows]: any = await pool.query(
      "SELECT zoho_client_id, zoho_client_secret, zoho_refresh_token, zoho_token_expires_at FROM email_config WHERE id = 1",
    );

    if (!rows?.length) {
      console.log("[Zoho Token Refresh] No email config found");
      return;
    }

    const config: EmailConfig = rows[0];

    // If no Zoho config, skip
    if (!config.zoho_client_id || !config.zoho_refresh_token) {
      console.log("[Zoho Token Refresh] Zoho not configured, skipping");
      return;
    }

    // Decrypt secrets
    let clientSecret = config.zoho_client_secret;
    let refreshToken = config.zoho_refresh_token;

    try {
      clientSecret = decryptData(clientSecret);
      refreshToken = decryptData(refreshToken);
    } catch (err) {
      console.error("[Zoho Token Refresh] Failed to decrypt secrets:", err);
      return;
    }

    // Check if this is a Self Client token (permanent, no refresh needed)
    if (isSelfClientToken(refreshToken)) {
      console.log(
        "[Zoho Token Refresh] Using Self Client token (permanent, no refresh needed)",
      );
      return { success: true, isSelfClient: true };
    }

    // Check if token is close to expiration (refresh if < 5 minutes left)
    const expiresAt = config.zoho_token_expires_at
      ? new Date(config.zoho_token_expires_at).getTime()
      : 0;
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    const fiveMinutes = 5 * 60 * 1000;

    if (timeUntilExpiry > fiveMinutes) {
      console.log(
        `[Zoho Token Refresh] Token still valid for ${Math.round(timeUntilExpiry / 1000 / 60)} minutes`,
      );
      return;
    }

    console.log(
      "[Zoho Token Refresh] Token expiring soon or expired, refreshing...",
    );

    // Exchange refresh token for new access token
    const tokenResponse = await axios.post(
      "https://accounts.zoho.com/oauth/v2/token",
      new URLSearchParams({
        client_id: config.zoho_client_id,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
      { timeout: 10000 },
    );

    const expiresIn = tokenResponse.data.expires_in || 3600;

    // Calculate new expiration time
    const newExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Store new expiration time (we don't store access token, we refresh on demand)
    await pool.query(
      "UPDATE email_config SET zoho_token_expires_at = ? WHERE id = 1",
      [newExpiresAt],
    );

    console.log(
      `[Zoho Token Refresh] Success! Token refreshed, valid until ${newExpiresAt}`,
    );

    return { success: true, expiresAt: newExpiresAt };
  } catch (error: any) {
    console.error(
      "[Zoho Token Refresh] Failed to refresh token:",
      error.message,
    );
    console.error("[Zoho Token Refresh] Response:", error.response?.data);
    return { success: false, error: error.message };
  }
}

/**
 * Get a valid Zoho access token, refreshing if necessary
 * For Self Client tokens, returns the token directly
 * For OAuth refresh tokens, exchanges them for an access token
 */
export async function getValidZohoAccessToken(): Promise<string | null> {
  try {
    // First try to refresh if needed (OAuth tokens only)
    await refreshZohoTokenIfNeeded();

    // Now get token for this request
    const [rows]: any = await pool.query(
      "SELECT zoho_client_id, zoho_client_secret, zoho_refresh_token FROM email_config WHERE id = 1",
    );

    if (!rows?.length) {
      console.error("[Zoho Token] No email config found");
      return null;
    }

    const config = rows[0];

    if (!config.zoho_client_id || !config.zoho_refresh_token) {
      console.error("[Zoho Token] Zoho not configured");
      return null;
    }

    // Decrypt
    let clientSecret = decryptData(config.zoho_client_secret);
    let refreshToken = decryptData(config.zoho_refresh_token);

    // If this is a Self Client token, use it directly
    if (isSelfClientToken(refreshToken)) {
      console.log("[Zoho Token] Using Self Client token directly");
      return refreshToken;
    }

    // Otherwise, exchange OAuth refresh token for access token
    console.log("[Zoho Token] Exchanging OAuth refresh token for access token");
    const tokenResponse = await axios.post(
      "https://accounts.zoho.com/oauth/v2/token",
      new URLSearchParams({
        client_id: config.zoho_client_id,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
      { timeout: 10000 },
    );

    return tokenResponse.data.access_token;
  } catch (error: any) {
    console.error("[Zoho Token] Failed to get access token:", error.message);
    return null;
  }
}

/**
 * Start background task to refresh Zoho token every 30 minutes
 */
export function startZohoTokenRefreshSchedule() {
  console.log("[Zoho Token Refresh] Starting background refresh schedule...");

  // Run immediately on startup
  refreshZohoTokenIfNeeded().catch((err) =>
    console.error("[Zoho Token Refresh] Initial refresh failed:", err),
  );

  // Then every 30 minutes
  setInterval(
    () => {
      refreshZohoTokenIfNeeded().catch((err) =>
        console.error("[Zoho Token Refresh] Scheduled refresh failed:", err),
      );
    },
    30 * 60 * 1000,
  );
}
