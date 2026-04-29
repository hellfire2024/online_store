import Stripe from "stripe";
import { Router, Request, Response } from "express";
import { pool } from "../db/connection.js";
import { RowDataPacket } from "mysql2";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

const getRuntimeAppEnv = (): "dev" | "staging" | "prod" => {
  const appEnv = String(process.env.APP_ENV || "")
    .trim()
    .toLowerCase();
  if (appEnv === "dev" || appEnv === "development") return "dev";
  if (appEnv === "staging" || appEnv === "stage" || appEnv === "test") {
    return "staging";
  }

  const nodeEnv = String(process.env.NODE_ENV || "")
    .trim()
    .toLowerCase();
  if (nodeEnv === "development") return "dev";

  return "prod";
};

const getConfiguredSiteSettingsId = (): number | null => {
  const configured = String(process.env.SITE_SETTINGS_ID || "").trim();
  if (!configured) {
    return null;
  }

  const parsed = Number.parseInt(configured, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(
      `Invalid SITE_SETTINGS_ID='${configured}'. Expected a positive integer.`,
    );
  }

  return parsed;
};

const isUsingExplicitSiteSettingsId = (): boolean =>
  getConfiguredSiteSettingsId() !== null;

const getSiteSettingsRecordId = (): number => {
  const configuredId = getConfiguredSiteSettingsId();
  if (configuredId !== null) {
    return configuredId;
  }

  const env = getRuntimeAppEnv();
  const fallbackId = env === "dev" ? 2 : env === "staging" ? 3 : 1;

  if (String(process.env.NODE_ENV || "").toLowerCase() === "production") {
    throw new Error(
      "SITE_SETTINGS_ID is required in production to enforce per-project isolation.",
    );
  }

  return fallbackId;
};

const normalizeUrl = (value: string): string => value.trim().replace(/\/$/, "");

const getCanonicalApiBaseUrl = (): string => {
  const forceExternal = process.env.USE_EXTERNAL_API_BASE === "1";

  // Best-practice default for SPA + reverse proxy: keep API same-origin.
  // This avoids frontend dependence on external DNS/API host drift.
  if (!forceExternal) {
    return "/api";
  }

  const serviceUrl = normalizeUrl(process.env.SERVICE_URL_BACKEND || "");
  if (serviceUrl) {
    return serviceUrl.endsWith("/api") ? serviceUrl : `${serviceUrl}/api`;
  }

  const prodDomain = normalizeUrl(process.env.PROD_API_DOMAIN || "");
  if (prodDomain) {
    const withScheme =
      prodDomain.startsWith("http://") || prodDomain.startsWith("https://")
        ? prodDomain
        : `https://${prodDomain}`;
    return withScheme.endsWith("/api") ? withScheme : `${withScheme}/api`;
  }

  return "/api";
};

const applyProductionSettingsGuard = (settings: any): any => {
  if (process.env.NODE_ENV !== "production") {
    return settings;
  }

  return {
    ...settings,
    apiBaseUrl: getCanonicalApiBaseUrl(),
  };
};

// POST: Test PayPal configuration (Client ID and Secret)
router.post("/paypal-config-test", async (_req: Request, res: Response) => {
  try {
    const settings = await readSettings();
    const clientId = String(settings?.paymentApiKeys?.paypal || "").trim();
    const clientSecret = String(
      (settings?.paymentApiKeys as any)?.paypalSecret || "",
    ).trim();
    if (!clientId || !clientSecret) {
      return res.status(400).json({
        success: false,
        error:
          !clientId && !clientSecret
            ? "Both PayPal Client ID and Secret are missing."
            : !clientId
              ? "PayPal Client ID is missing."
              : "PayPal Client Secret is missing.",
      });
    }
    // Try to get an access token from PayPal using the configured environment.
    const paypalSandbox = Boolean(
      (settings as any)?.paymentConfig?.paypalSandbox,
    );
    const paypalBase = paypalSandbox
      ? "https://api-m.sandbox.paypal.com"
      : "https://api-m.paypal.com";
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const resp = await fetch(`${paypalBase}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const data = (await resp.json()) as any;
    if (resp.ok && data.access_token) {
      return res.json({
        success: true,
        message: "PayPal connection successful.",
      });
    } else {
      return res.status(400).json({
        success: false,
        error:
          data.error_description ||
          "Failed to connect to PayPal. Check your credentials.",
      });
    }
  } catch (error) {
    console.error("Error testing PayPal config:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error while testing PayPal config.",
    });
  }
});

// POST: Test Square configuration (Access Token + Location ID)
router.post("/square-config-test", async (_req: Request, res: Response) => {
  try {
    const settings = await readSettings();
    const accessToken = String(settings?.paymentApiKeys?.square || "").trim();
    const locationId = String(
      (settings?.paymentApiKeys as any)?.squareLocationId || "",
    ).trim();

    if (!accessToken) {
      return res
        .status(400)
        .json({ success: false, error: "Square Access Token is missing." });
    }

    const sandbox = resolveSquareSandbox(settings);
    const baseUrl = sandbox
      ? "https://connect.squareupsandbox.com"
      : "https://connect.squareup.com";

    const headers = { Authorization: `Bearer ${accessToken}` };

    // Step 1: validate the access token via merchant lookup
    const merchantResp = await fetch(`${baseUrl}/v2/merchants/me`, {
      headers,
    });
    const merchantData = (await merchantResp.json()) as any;
    if (!merchantResp.ok) {
      return res.status(400).json({
        success: false,
        error:
          merchantData.errors?.[0]?.detail ||
          "Invalid Square Access Token. Check your credentials.",
      });
    }

    // Step 2: validate the Location ID exists in the same environment
    if (locationId) {
      const locResp = await fetch(`${baseUrl}/v2/locations/${locationId}`, {
        headers,
      });
      const locData = (await locResp.json()) as any;
      if (!locResp.ok) {
        const envLabel = sandbox ? "sandbox" : "production";
        return res.status(400).json({
          success: false,
          error:
            `Location ID "${locationId}" was not found in your Square ${envLabel} account. ` +
            `Make sure you copy the Location ID from the Square Developer Console → ` +
            `${sandbox ? "Sandbox → Locations" : "Locations"}, not from the main Square Dashboard.`,
        });
      }
      return res.json({
        success: true,
        message: `Square connection successful (${sandbox ? "sandbox" : "production"}). Location: ${locData.location?.name || locationId}`,
        merchant: merchantData.merchant,
        location: locData.location,
      });
    }

    return res.json({
      success: true,
      message: `Square access token valid (${sandbox ? "sandbox" : "production"}). Enter a Location ID and re-test to fully verify.`,
      merchant: merchantData.merchant,
    });
  } catch (error) {
    console.error("Error testing Square config:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error while testing Square config.",
    });
  }
});

// POST: Test Authorize.Net configuration (API Login ID and Transaction Key)
router.post(
  "/authorizeNet-config-test",
  async (_req: Request, res: Response) => {
    try {
      const settings = await readSettings();
      const { apiLoginId, transactionKey } = parseAuthorizeNetCredentials(
        settings?.paymentApiKeys?.authorizeNet,
      );
      if (!apiLoginId || !transactionKey) {
        return res.status(400).json({
          success: false,
          error:
            !apiLoginId && !transactionKey
              ? "Both API Login ID and Transaction Key are missing."
              : !apiLoginId
                ? "API Login ID is missing."
                : "Transaction Key is missing.",
        });
      }
      const sandbox = resolveAuthorizeNetSandbox(settings);
      const apiUrl = sandbox
        ? "https://apitest.authorize.net/xml/v1/request.api"
        : "https://api.authorize.net/xml/v1/request.api";

      // Try to authenticate with Authorize.Net in the configured environment.
      const xml = `<?xml version="1.0" encoding="utf-8"?>\n<getMerchantDetailsRequest xmlns="AnetApi/xml/v1/schema/AnetApiSchema.xsd"><merchantAuthentication><name>${apiLoginId}</name><transactionKey>${transactionKey}</transactionKey></merchantAuthentication></getMerchantDetailsRequest>`;
      const resp = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "text/xml" },
        body: xml,
      });
      const text = await resp.text();
      if (resp.ok && text.includes("<messages><resultCode>Ok</resultCode>")) {
        return res.json({
          success: true,
          message: `Authorize.Net connection successful (${sandbox ? "sandbox" : "production"}).`,
        });
      } else {
        const gatewayMessage = extractAuthorizeNetXmlMessage(text);
        return res.status(400).json({
          success: false,
          error:
            gatewayMessage ||
            `Failed to connect to Authorize.Net ${sandbox ? "sandbox" : "production"}. Check your credentials and environment mode.`,
        });
      }
    } catch (error) {
      console.error("Error testing Authorize.Net config:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error while testing Authorize.Net config.",
      });
    }
  },
);

const hasText = (value: unknown): boolean =>
  typeof value === "string" && value.trim().length > 0;

const resolveSquareSandbox = (settings: any): boolean => {
  const explicit = (settings as any)?.paymentConfig?.squareSandbox;
  if (typeof explicit === "boolean") {
    return explicit;
  }

  const applicationId = String(
    (settings?.paymentApiKeys as any)?.squareApplicationId || "",
  )
    .trim()
    .toLowerCase();

  // Square sandbox application IDs start with "sandbox-".
  if (applicationId.startsWith("sandbox-")) {
    return true;
  }

  return false;
};

const resolveAuthorizeNetSandbox = (settings: any): boolean => {
  const explicit = (settings as any)?.paymentConfig?.authorizeNetSandbox;
  if (typeof explicit === "boolean") {
    return explicit;
  }

  // Keep sandbox as the backward-compatible default for legacy settings
  // that predate an explicit Authorize.Net environment toggle.
  return true;
};

const parseAuthorizeNetCredentials = (value: unknown) => {
  const sanitize = (raw: string) =>
    raw
      .replace(/[\u200B\u200C\u200D\uFEFF]/g, "")
      .replace(/\s+/g, "")
      .trim();

  const combined = sanitize(String(value || ""));
  const separatorIndex = combined.indexOf(":");

  if (separatorIndex < 0) {
    return {
      apiLoginId: sanitize(combined),
      transactionKey: "",
    };
  }

  return {
    apiLoginId: sanitize(combined.slice(0, separatorIndex)),
    transactionKey: sanitize(combined.slice(separatorIndex + 1)),
  };
};

const extractAuthorizeNetXmlMessage = (xml: string): string | null => {
  const textMessage = xml.match(/<text>([^<]+)<\/text>/i)?.[1];
  if (textMessage && textMessage.trim()) {
    return textMessage.trim();
  }

  const fallback = xml.match(/<message>([^<]+)<\/message>/i)?.[1];
  if (fallback && fallback.trim()) {
    return fallback.trim();
  }

  return null;
};
const normalizeFromAddress = (fromAddress: any) => {
  if (!fromAddress || typeof fromAddress !== "object") {
    return fromAddress;
  }

  return {
    ...fromAddress,
    country: hasText(fromAddress.country)
      ? String(fromAddress.country).trim()
      : "US",
    street2: hasText(fromAddress.street2)
      ? String(fromAddress.street2).trim()
      : "",
  };
};

const readSettings = async (): Promise<any> => {
  const settingsId = getSiteSettingsRecordId();
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT settings FROM site_settings WHERE id = ? LIMIT 1",
    [settingsId],
  );

  if (!rows.length) {
    return {};
  }

  const raw = rows[0].settings;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  return raw || {};
};

const isFromAddressComplete = (fromAddress: any): boolean => {
  const normalizedFromAddress = normalizeFromAddress(fromAddress);

  if (!normalizedFromAddress || typeof normalizedFromAddress !== "object") {
    return false;
  }

  return (
    hasText(normalizedFromAddress.firstName) &&
    hasText(normalizedFromAddress.lastName) &&
    hasText(normalizedFromAddress.street1) &&
    hasText(normalizedFromAddress.city) &&
    hasText(normalizedFromAddress.state) &&
    hasText(normalizedFromAddress.zip) &&
    hasText(normalizedFromAddress.country)
  );
};

const buildCommerceStatus = (settings: any) => {
  const normalizedFromAddress = normalizeFromAddress(settings?.fromAddress);
  const paymentProvider = String(settings?.paymentProvider || "none");
  const paymentApiKeys = settings?.paymentApiKeys || {};
  const paymentConfigured = paymentProvider !== "none";
  let paymentAvailable = false;
  if (paymentConfigured) {
    if (paymentProvider === "stripe") {
      const stripeSecret = String(paymentApiKeys?.stripe || "").trim();
      const stripePublishable = String(
        paymentApiKeys?.stripePublishableKey || "",
      ).trim();
      paymentAvailable =
        stripeSecret.length > 0 && stripePublishable.length > 0;
    } else if (paymentProvider === "paypal") {
      const paypalClientId = String(paymentApiKeys?.paypal || "").trim();
      const paypalSecret = String(
        (paymentApiKeys as any)?.paypalSecret || "",
      ).trim();
      paymentAvailable = paypalClientId.length > 0 && paypalSecret.length > 0;
    } else {
      const providerKey = String(
        paymentApiKeys?.[paymentProvider] || "",
      ).trim();
      paymentAvailable = providerKey.length > 0;
    }
  }

  const shippingCarriers = settings?.shippingCarriers || {};
  const shippingCarrierStatuses = ["easypost", "shippo", "shipstation"].map(
    (carrier) => {
      const carrierConfig = shippingCarriers?.[carrier] || {};
      const enabled = Boolean(carrierConfig.enabled);
      const hasApiKey = hasText(carrierConfig.apiKey);
      const hasApiSecret = true;
      const configured = enabled && hasApiKey && hasApiSecret;

      return {
        carrier,
        enabled,
        configured,
        reason: enabled && !configured ? `${carrier} requires API key` : null,
      };
    },
  );

  const enabledShippingCarriers = shippingCarrierStatuses.filter(
    (item) => item.enabled,
  );
  const hasConfiguredShippingCarrier = enabledShippingCarriers.some(
    (item) => item.configured,
  );
  const senderAddressReady = isFromAddressComplete(normalizedFromAddress);
  const shippingAvailable = hasConfiguredShippingCarrier && senderAddressReady;

  const taxConfig = settings?.taxConfig || {};
  const taxProvider = String(taxConfig.provider || "manual");
  const taxCredentials = taxConfig.credentials || {};
  const taxEnabled = taxConfig.enableTaxCollection !== false;
  let taxAvailable = false;
  let taxReason = "";

  if (!taxEnabled) {
    taxReason = "Tax collection is disabled";
  } else if (taxProvider === "manual") {
    const defaultTaxRate = Number(taxConfig.defaultTaxRate);
    taxAvailable = Number.isFinite(defaultTaxRate) && defaultTaxRate >= 0;
    if (!taxAvailable) {
      taxReason = "Manual tax requires a valid default tax rate";
    }
  } else if (taxProvider === "stripe") {
    taxAvailable =
      hasText(taxCredentials.stripeApiKey) ||
      hasText(process.env.STRIPE_SECRET_KEY);
    if (!taxAvailable) {
      taxReason = "Stripe tax requires Stripe API credentials";
    }
  } else if (taxProvider === "taxjar") {
    taxAvailable = hasText(taxCredentials.taxjarApiKey);
    if (!taxAvailable) {
      taxReason = "TaxJar requires API key";
    }
  } else if (taxProvider === "avalara") {
    taxAvailable =
      hasText(taxCredentials.avalaraAccountId) &&
      hasText(taxCredentials.avalaraLicenseKey);
    if (!taxAvailable) {
      taxReason = "Avalara requires Account ID and License Key";
    }
  } else if (taxProvider === "taxcloud") {
    taxAvailable =
      hasText(taxCredentials.taxcloudApiKey) &&
      hasText(taxCredentials.taxcloudUserId);
    if (!taxAvailable) {
      taxReason = "TaxCloud requires API key and user ID";
    }
  } else if (taxProvider === "zamp") {
    taxAvailable = hasText(taxCredentials.zampApiKey);
    if (!taxAvailable) {
      taxReason = "Zamp requires API key";
    }
  } else if (taxProvider === "anrok") {
    taxAvailable = hasText(taxCredentials.anrokApiKey);
    if (!taxAvailable) {
      taxReason = "Anrok requires API key";
    }
  } else {
    taxReason = `Unsupported tax provider: ${taxProvider}`;
  }

  return {
    payment: {
      provider: paymentProvider,
      available: paymentAvailable,
      configured: paymentConfigured,
      reason: paymentAvailable
        ? null
        : paymentConfigured
          ? `${paymentProvider} is selected but API credentials are missing`
          : "No payment provider configured",
    },
    shipping: {
      available: shippingAvailable,
      senderAddressReady,
      carriers: shippingCarrierStatuses,
      reason: shippingAvailable
        ? null
        : !hasConfiguredShippingCarrier
          ? "Enable and configure at least one shipping carrier"
          : "Sender address is incomplete. Required fields: first name, last name, street address, city, state, ZIP, and country. Street address line 2 is optional.",
    },
    tax: {
      provider: taxProvider,
      enabled: taxEnabled,
      available: taxAvailable,
      reason: taxAvailable ? null : taxReason,
    },
    overallReady: paymentAvailable && shippingAvailable && taxAvailable,
  };
};

const isSafeTableName = (name: string): boolean => /^[a-zA-Z0-9_]+$/.test(name);

// Tables that should never be overwritten during a safe/content-only restore.
const AUTH_PROTECTED_TABLES = new Set([
  "admins",
  "customers",
  "password_reset_tokens",
  "customer_addresses",
]);

const BACKUP_SINGLE_FILE_MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const DEFAULT_TABLES_PER_CHUNK = 4;

const resolveRestoreMode = (raw: unknown): "safe" | "full" =>
  String(raw || "safe").toLowerCase() === "full" ? "full" : "safe";

const getTargetTablesForMode = (
  tableNames: string[],
  mode: "safe" | "full",
): string[] =>
  tableNames.filter((name) =>
    mode === "full" ? true : !AUTH_PROTECTED_TABLES.has(name),
  );

const getApproxBackupBytes = async (tableNames: string[]): Promise<number> => {
  if (!tableNames.length) {
    return 0;
  }

  const placeholders = tableNames.map(() => "?").join(", ");
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT SUM(COALESCE(data_length, 0) + COALESCE(index_length, 0)) AS totalBytes
     FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name IN (${placeholders})`,
    tableNames,
  );

  const value = Number((rows[0] as any)?.totalBytes || 0);
  return Number.isFinite(value) ? value : 0;
};

const getAllBaseTables = async (): Promise<string[]> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT table_name AS tableName
     FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_type = 'BASE TABLE'
     ORDER BY table_name ASC`,
  );

  return rows
    .map((row) => String((row as any).tableName || ""))
    .filter((name) => isSafeTableName(name));
};

const getTableColumns = async (table: string): Promise<string[]> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SHOW COLUMNS FROM \`${table}\``,
  );
  return rows
    .map((row) => String((row as any).Field || ""))
    .filter((column) => column.length > 0);
};

// Admin-only full site export for backup/restore portability.
router.get(
  "/backup-export",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const mode = resolveRestoreMode(req.query.mode);
      const tableNames = getTargetTablesForMode(await getAllBaseTables(), mode);
      const approxBytes = await getApproxBackupBytes(tableNames);

      if (approxBytes > BACKUP_SINGLE_FILE_MAX_BYTES) {
        return res.status(413).json({
          error:
            "Backup is too large for single-file export. Use chunked export endpoints.",
          mode,
          approxBytes,
          maxSingleFileBytes: BACKUP_SINGLE_FILE_MAX_BYTES,
          chunkHint: {
            manifestEndpoint: "/api/settings/backup-export-manifest",
            chunkEndpoint: "/api/settings/backup-export-chunk",
            defaultTablesPerChunk: DEFAULT_TABLES_PER_CHUNK,
          },
        });
      }

      const tables: Record<string, any[]> = {};

      for (const tableName of tableNames) {
        const [rows] = await pool.query<RowDataPacket[]>(
          `SELECT * FROM \`${tableName}\``,
        );
        tables[tableName] = rows;
      }

      return res.json({
        version: 1,
        exportedAt: new Date().toISOString(),
        restoreMode: mode,
        protectedTablesForSafeRestore: Array.from(AUTH_PROTECTED_TABLES),
        tableCount: tableNames.length,
        tables,
      });
    } catch (error) {
      console.error("Error exporting site backup:", error);
      return res.status(500).json({ error: "Failed to export site backup" });
    }
  },
);

// Admin-only export manifest for chunked backup downloads.
router.get(
  "/backup-export-manifest",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const mode = resolveRestoreMode(req.query.mode);
      const requestedChunk = Number(
        req.query.tablesPerChunk || DEFAULT_TABLES_PER_CHUNK,
      );
      const tablesPerChunk =
        Number.isFinite(requestedChunk) && requestedChunk > 0
          ? Math.floor(requestedChunk)
          : DEFAULT_TABLES_PER_CHUNK;

      const tableNames = getTargetTablesForMode(await getAllBaseTables(), mode);
      const chunkCount = Math.max(
        1,
        Math.ceil(tableNames.length / tablesPerChunk),
      );
      const approxBytes = await getApproxBackupBytes(tableNames);

      return res.json({
        version: 1,
        exportedAt: new Date().toISOString(),
        restoreMode: mode,
        tablesPerChunk,
        tableCount: tableNames.length,
        chunkCount,
        tableNames,
        approxBytes,
        maxSingleFileBytes: BACKUP_SINGLE_FILE_MAX_BYTES,
        protectedTablesForSafeRestore: Array.from(AUTH_PROTECTED_TABLES),
      });
    } catch (error) {
      console.error("Error building backup export manifest:", error);
      return res
        .status(500)
        .json({ error: "Failed to build backup export manifest" });
    }
  },
);

// Admin-only export chunk for large backups.
router.get(
  "/backup-export-chunk",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const mode = resolveRestoreMode(req.query.mode);
      const requestedChunk = Number(
        req.query.tablesPerChunk || DEFAULT_TABLES_PER_CHUNK,
      );
      const tablesPerChunk =
        Number.isFinite(requestedChunk) && requestedChunk > 0
          ? Math.floor(requestedChunk)
          : DEFAULT_TABLES_PER_CHUNK;
      const chunkIndex = Number(req.query.chunkIndex || 0);

      if (!Number.isFinite(chunkIndex) || chunkIndex < 0) {
        return res.status(400).json({ error: "Invalid chunkIndex" });
      }

      const tableNames = getTargetTablesForMode(await getAllBaseTables(), mode);
      const chunkCount = Math.max(
        1,
        Math.ceil(tableNames.length / tablesPerChunk),
      );
      if (chunkIndex >= chunkCount) {
        return res
          .status(400)
          .json({ error: "chunkIndex out of range", chunkCount });
      }

      const start = chunkIndex * tablesPerChunk;
      const chunkTableNames = tableNames.slice(start, start + tablesPerChunk);
      const tables: Record<string, any[]> = {};
      for (const tableName of chunkTableNames) {
        const [rows] = await pool.query<RowDataPacket[]>(
          `SELECT * FROM \`${tableName}\``,
        );
        tables[tableName] = rows;
      }

      return res.json({
        version: 1,
        exportedAt: new Date().toISOString(),
        restoreMode: mode,
        chunkIndex,
        chunkCount,
        tablesPerChunk,
        tableNames: chunkTableNames,
        tables,
      });
    } catch (error) {
      console.error("Error exporting backup chunk:", error);
      return res.status(500).json({ error: "Failed to export backup chunk" });
    }
  },
);

// Admin-only full site restore from a backup-export payload.
router.post(
  "/backup-import",
  requireAdmin,
  async (req: Request, res: Response) => {
    const restoreModeRaw = String(req.body?.mode || "safe").toLowerCase();
    const restoreMode =
      restoreModeRaw === "full" ? "full" : ("safe" as "safe" | "full");

    // Backward-compatible payload support:
    // 1) legacy: { tables: { ... } }
    // 2) new:    { mode: "safe"|"full", backup: { tables: { ... } } }
    const backup = req.body?.backup?.tables ? req.body.backup : req.body;
    const incomingTables = backup?.tables;

    if (!incomingTables || typeof incomingTables !== "object") {
      return res
        .status(400)
        .json({ error: "Invalid backup payload: missing tables object" });
    }

    const providedTableNames = Object.keys(incomingTables).filter((name) =>
      isSafeTableName(name),
    );

    if (!providedTableNames.length) {
      return res
        .status(400)
        .json({ error: "Invalid backup payload: no valid table names" });
    }

    const dbTableSet = new Set(await getAllBaseTables());
    const targetTables = providedTableNames
      .filter((name) => dbTableSet.has(name))
      .filter((name) =>
        restoreMode === "full" ? true : !AUTH_PROTECTED_TABLES.has(name),
      );

    if (!targetTables.length) {
      return res.status(400).json({
        error:
          restoreMode === "safe"
            ? "No non-protected matching tables found for safe restore"
            : "No matching tables found in current database",
      });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query("SET FOREIGN_KEY_CHECKS = 0");

      for (const tableName of targetTables) {
        await conn.query(`DELETE FROM \`${tableName}\``);
      }

      const importedRows: Record<string, number> = {};
      for (const tableName of targetTables) {
        const rows = Array.isArray(incomingTables[tableName])
          ? incomingTables[tableName]
          : [];
        importedRows[tableName] = rows.length;

        if (!rows.length) {
          continue;
        }

        const allowedColumns = new Set(await getTableColumns(tableName));
        for (const row of rows) {
          const entries = Object.entries(row || {}).filter(([key]) =>
            allowedColumns.has(key),
          );

          if (!entries.length) {
            continue;
          }

          const columnNames = entries.map(([key]) => `\`${key}\``).join(", ");
          const placeholders = entries.map(() => "?").join(", ");
          const values = entries.map(([, value]) => value);

          await conn.query(
            `INSERT INTO \`${tableName}\` (${columnNames}) VALUES (${placeholders})`,
            values,
          );
        }
      }

      await conn.query("SET FOREIGN_KEY_CHECKS = 1");
      await conn.commit();

      return res.json({
        success: true,
        mode: restoreMode,
        skippedProtectedTables:
          restoreMode === "safe"
            ? providedTableNames.filter((name) =>
                AUTH_PROTECTED_TABLES.has(name),
              )
            : [],
        importedTableCount: targetTables.length,
        importedRows,
      });
    } catch (error) {
      await conn.rollback();
      try {
        await conn.query("SET FOREIGN_KEY_CHECKS = 1");
      } catch {
        // no-op
      }
      console.error("Error importing site backup:", error);
      return res.status(500).json({ error: "Failed to import site backup" });
    } finally {
      conn.release();
    }
  },
);

// Admin-only chunked import endpoint for large backups.
router.post(
  "/backup-import-chunk",
  requireAdmin,
  async (req: Request, res: Response) => {
    const restoreMode = resolveRestoreMode(req.body?.mode);
    const clearExisting = Boolean(req.body?.clearExisting);
    const incomingTables = req.body?.tables;

    if (!incomingTables || typeof incomingTables !== "object") {
      return res
        .status(400)
        .json({ error: "Invalid chunk payload: missing tables object" });
    }

    const providedTableNames = Object.keys(incomingTables).filter((name) =>
      isSafeTableName(name),
    );
    if (!providedTableNames.length) {
      return res
        .status(400)
        .json({ error: "Invalid chunk payload: no valid table names" });
    }

    const dbTableSet = new Set(await getAllBaseTables());
    const targetTables = getTargetTablesForMode(
      providedTableNames.filter((name) => dbTableSet.has(name)),
      restoreMode,
    );
    if (!targetTables.length) {
      return res
        .status(400)
        .json({ error: "No matching tables found in this chunk" });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query("SET FOREIGN_KEY_CHECKS = 0");

      if (clearExisting) {
        const allTablesForMode = getTargetTablesForMode(
          await getAllBaseTables(),
          restoreMode,
        );
        for (const tableName of allTablesForMode) {
          await conn.query(`DELETE FROM \`${tableName}\``);
        }
      }

      const importedRows: Record<string, number> = {};
      for (const tableName of targetTables) {
        const rows = Array.isArray(incomingTables[tableName])
          ? incomingTables[tableName]
          : [];
        importedRows[tableName] = rows.length;

        if (!rows.length) {
          continue;
        }

        const allowedColumns = new Set(await getTableColumns(tableName));
        for (const row of rows) {
          const entries = Object.entries(row || {}).filter(([key]) =>
            allowedColumns.has(key),
          );
          if (!entries.length) {
            continue;
          }

          const columnNames = entries.map(([key]) => `\`${key}\``).join(", ");
          const placeholders = entries.map(() => "?").join(", ");
          const values = entries.map(([, value]) => value);

          await conn.query(
            `INSERT INTO \`${tableName}\` (${columnNames}) VALUES (${placeholders})`,
            values,
          );
        }
      }

      await conn.query("SET FOREIGN_KEY_CHECKS = 1");
      await conn.commit();

      return res.json({
        success: true,
        mode: restoreMode,
        clearExisting,
        importedTableCount: targetTables.length,
        importedRows,
      });
    } catch (error) {
      await conn.rollback();
      try {
        await conn.query("SET FOREIGN_KEY_CHECKS = 1");
      } catch {
        // no-op
      }
      console.error("Error importing backup chunk:", error);
      return res.status(500).json({ error: "Failed to import backup chunk" });
    } finally {
      conn.release();
    }
  },
);

// Safe: returns only the publishable key (never the secret key)
router.get("/stripe-config", async (_req: Request, res: Response) => {
  try {
    const settings = await readSettings();
    let publishableKey = String(
      settings?.paymentApiKeys?.stripePublishableKey || "",
    ).trim();
    let source = "database";
    if (!publishableKey && process.env.STRIPE_PUBLISHABLE_KEY) {
      publishableKey = String(process.env.STRIPE_PUBLISHABLE_KEY).trim();
      source = "env";
    }
    if (!publishableKey) {
      console.error("[Stripe] No publishable key found in DB or env");
      return res
        .status(500)
        .json({ error: "Stripe publishable key not configured" });
    }
    console.log(`[Stripe] Returning publishable key from ${source}`);
    return res.json({ publishableKey });
  } catch (error) {
    console.error("Error fetching stripe config:", error);
    return res.status(500).json({ error: "Failed to fetch stripe config" });
  }
});

// Safe: returns only the PayPal Client ID (never the Client Secret)
router.get("/paypal-config", async (_req: Request, res: Response) => {
  try {
    const settings = await readSettings();
    const clientId = String(settings?.paymentApiKeys?.paypal || "").trim();
    const hasSecret = Boolean(
      String((settings?.paymentApiKeys as any)?.paypalSecret || "").trim(),
    );
    const sandbox = Boolean((settings as any)?.paymentConfig?.paypalSandbox);
    return res.json({ clientId, sandbox, hasSecret });
  } catch (error) {
    console.error("Error fetching paypal config:", error);
    return res.status(500).json({ error: "Failed to fetch paypal config" });
  }
});

// Safe: returns Square Application ID and Location ID (never the Access Token)
router.get("/square-config", async (_req: Request, res: Response) => {
  try {
    const settings = await readSettings();
    const applicationId = String(
      (settings?.paymentApiKeys as any)?.squareApplicationId || "",
    ).trim();
    const locationId = String(
      (settings?.paymentApiKeys as any)?.squareLocationId || "",
    ).trim();
    const sandbox = resolveSquareSandbox(settings);
    return res.json({ applicationId, locationId, sandbox });
  } catch (error) {
    console.error("Error fetching square config:", error);
    return res.status(500).json({ error: "Failed to fetch square config" });
  }
});

// Safe: returns Authorize.Net API Login ID and Public Client Key (never the Transaction Key)
router.get("/authorizedotnet-config", async (_req: Request, res: Response) => {
  try {
    const settings = await readSettings();
    const { apiLoginId } = parseAuthorizeNetCredentials(
      settings?.paymentApiKeys?.authorizeNet,
    );
    const publicClientKey = String(
      (settings?.paymentApiKeys as any)?.authorizeNetPublicKey || "",
    ).trim();
    const sandbox = resolveAuthorizeNetSandbox(settings);
    return res.json({ apiLoginId, publicClientKey, sandbox });
  } catch (error) {
    console.error("Error fetching authorize.net config:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch authorize.net config" });
  }
});

router.get("/commerce-status", async (_req: Request, res: Response) => {
  try {
    const settings = await readSettings();
    const status = buildCommerceStatus(settings);
    return res.json(status);
  } catch (error) {
    console.error("Error building commerce status:", error);
    return res.status(500).json({ error: "Failed to build commerce status" });
  }
});

// Get settings
router.get("/", async (_req: Request, res: Response) => {
  try {
    const settingsId = getSiteSettingsRecordId();
    res.setHeader(
      "Cache-Control",
      "private, no-store, no-cache, must-revalidate",
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Vary", "Host, Origin");
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT settings FROM site_settings WHERE id = ? LIMIT 1",
      [settingsId],
    );

    if (rows.length === 0) {
      res.setHeader("x-app-env", getRuntimeAppEnv());
      res.setHeader("x-settings-id", String(settingsId));
      res.setHeader(
        "x-settings-id-source",
        isUsingExplicitSiteSettingsId() ? "explicit" : "fallback",
      );
      return res.json({});
    }

    // Parse JSON if it's stored as a string
    const settings =
      typeof rows[0].settings === "string"
        ? JSON.parse(rows[0].settings)
        : rows[0].settings;

    const safeSettings = applyProductionSettingsGuard(settings);

    if (safeSettings?.fromAddress) {
      safeSettings.fromAddress = normalizeFromAddress(safeSettings.fromAddress);
    }

    res.setHeader("x-app-env", getRuntimeAppEnv());
    res.setHeader("x-settings-id", String(settingsId));
    res.setHeader(
      "x-settings-id-source",
      isUsingExplicitSiteSettingsId() ? "explicit" : "fallback",
    );
    return res.json(safeSettings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return res.status(500).json({ error: "Failed to fetch settings" });
  }
});

// Update settings
router.put("/", requireAdmin, async (req: Request, res: Response) => {
  try {
    const settingsId = getSiteSettingsRecordId();
    const payload = { ...(req.body || {}) };

    console.log(
      "Received settings update request, body size:",
      JSON.stringify(payload).length,
      "bytes",
    );

    // Avoid logging sensitive key values in production.
    console.log("[Settings] Saving keys:", Object.keys(payload));

    if (payload?.fromAddress) {
      payload.fromAddress = normalizeFromAddress(payload.fromAddress);
    }

    const guardedPayload = applyProductionSettingsGuard(payload);

    const settingsJson = JSON.stringify(guardedPayload);

    const [result] = await pool.query(
      `INSERT INTO site_settings (id, settings) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE settings = ?`,
      [settingsId, settingsJson, settingsJson],
    );

    console.log(
      "Settings saved successfully to database, affected rows:",
      (result as any).affectedRows,
    );
    res.setHeader("x-app-env", getRuntimeAppEnv());
    res.setHeader("x-settings-id", String(settingsId));
    res.setHeader(
      "x-settings-id-source",
      isUsingExplicitSiteSettingsId() ? "explicit" : "fallback",
    );
    return res.json(guardedPayload);
  } catch (error) {
    console.error("Error updating settings:", error);
    return res.status(500).json({
      error: "Failed to update settings",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;

// POST: Test Stripe configuration (publishable and secret key)
router.post("/stripe-config-test", async (_req: Request, res: Response) => {
  try {
    const settings = await readSettings();
    const publishableKey = String(
      settings?.paymentApiKeys?.stripePublishableKey || "",
    ).trim();
    const secretKey = String(settings?.paymentApiKeys?.stripe || "").trim();

    if (!publishableKey || !secretKey) {
      return res.status(400).json({
        success: false,
        error:
          !publishableKey && !secretKey
            ? "Both Stripe publishable and secret keys are missing."
            : !publishableKey
              ? "Stripe publishable key is missing."
              : "Stripe secret key is missing.",
      });
    }

    // Log masked keys so we can verify what the DB actually holds
    console.log(
      "[Stripe Test] publishableKey prefix:",
      publishableKey.slice(0, 12) + "...",
      "| secretKey prefix:",
      secretKey.slice(0, 12) + "...",
    );

    try {
      const stripe = new Stripe(secretKey);
      // balance.retrieve() works for all valid secret key types (sk_, rk_, and Connect)
      await stripe.balance.retrieve();
      return res.json({
        success: true,
        message: "Stripe connection successful. Keys are valid.",
      });
    } catch (stripeErr: any) {
      console.error(
        "[Stripe Test] Stripe error:",
        stripeErr?.raw?.message || stripeErr?.message,
      );
      return res.status(400).json({
        success: false,
        error:
          stripeErr?.raw?.message ||
          stripeErr?.message ||
          "Failed to connect to Stripe. Check your keys.",
      });
    }
  } catch (error) {
    console.error("Error testing Stripe config:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error while testing Stripe config.",
    });
  }
});
