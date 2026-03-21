import { Router, Request, Response } from "express";
import { pool } from "../db/connection.js";
import { RowDataPacket } from "mysql2";

const router = Router();

const hasText = (value: unknown): boolean =>
  typeof value === "string" && value.trim().length > 0;

const readSettings = async (): Promise<any> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT settings FROM site_settings WHERE id = 1",
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
  if (!fromAddress || typeof fromAddress !== "object") {
    return false;
  }

  return (
    hasText(fromAddress.firstName) &&
    hasText(fromAddress.lastName) &&
    hasText(fromAddress.street1) &&
    hasText(fromAddress.city) &&
    hasText(fromAddress.state) &&
    hasText(fromAddress.zip) &&
    hasText(fromAddress.country)
  );
};

const buildCommerceStatus = (settings: any) => {
  const paymentProvider = String(settings?.paymentProvider || "none");
  const paymentApiKeys = settings?.paymentApiKeys || {};
  const paymentKey = String(paymentApiKeys?.[paymentProvider] || "").trim();
  const paymentConfigured = paymentProvider !== "none";
  const paymentAvailable = paymentConfigured && paymentKey.length > 0;

  const shippingCarriers = settings?.shippingCarriers || {};
  const shippingCarrierStatuses = ["easypost", "shippo", "shipstation"].map(
    (carrier) => {
      const carrierConfig = shippingCarriers?.[carrier] || {};
      const enabled = Boolean(carrierConfig.enabled);
      const hasApiKey = hasText(carrierConfig.apiKey);
      const hasApiSecret =
        carrier !== "shipstation" || hasText(carrierConfig.apiSecret);
      const configured = enabled && hasApiKey && hasApiSecret;

      return {
        carrier,
        enabled,
        configured,
        reason:
          enabled && !configured
            ? carrier === "shipstation"
              ? "ShipStation requires API key and API secret"
              : `${carrier} requires API key`
            : null,
      };
    },
  );

  const enabledShippingCarriers = shippingCarrierStatuses.filter(
    (item) => item.enabled,
  );
  const hasConfiguredShippingCarrier = enabledShippingCarriers.some(
    (item) => item.configured,
  );
  const senderAddressReady = isFromAddressComplete(settings?.fromAddress);
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
          : "Sender address is incomplete",
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
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT settings FROM site_settings WHERE id = 1",
    );

    if (rows.length === 0) {
      return res.json({});
    }

    // Parse JSON if it's stored as a string
    const settings =
      typeof rows[0].settings === "string"
        ? JSON.parse(rows[0].settings)
        : rows[0].settings;

    return res.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return res.status(500).json({ error: "Failed to fetch settings" });
  }
});

// Update settings
router.put("/", async (req: Request, res: Response) => {
  try {
    console.log(
      "Received settings update request, body size:",
      JSON.stringify(req.body).length,
      "bytes",
    );

    const settingsJson = JSON.stringify(req.body);

    const [result] = await pool.query(
      `INSERT INTO site_settings (id, settings) VALUES (1, ?)
       ON DUPLICATE KEY UPDATE settings = ?`,
      [settingsJson, settingsJson],
    );

    console.log(
      "Settings saved successfully to database, affected rows:",
      (result as any).affectedRows,
    );
    return res.json(req.body);
  } catch (error) {
    console.error("Error updating settings:", error);
    return res
      .status(500)
      .json({
        error: "Failed to update settings",
        details: error instanceof Error ? error.message : String(error),
      });
  }
});

export default router;
