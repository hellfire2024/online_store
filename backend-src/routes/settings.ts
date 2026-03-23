import Stripe from "stripe";
import { Router, Request, Response } from "express";
import { pool } from "../db/connection.js";
import { RowDataPacket } from "mysql2";

const router = Router();

const hasText = (value: unknown): boolean =>
  typeof value === "string" && value.trim().length > 0;

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

// Safe: returns only the publishable key (never the secret key)
router.get("/stripe-config", async (_req: Request, res: Response) => {
  try {
    const settings = await readSettings();
    const publishableKey = String(
      settings?.paymentApiKeys?.stripePublishableKey || "",
    ).trim();
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
    const sandbox = Boolean((settings as any)?.paymentConfig?.paypalSandbox);
    return res.json({ clientId, sandbox });
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
    const sandbox = Boolean((settings as any)?.paymentConfig?.squareSandbox);
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
    const authorizeNetKey = String(
      settings?.paymentApiKeys?.authorizeNet || "",
    ).trim();
    const apiLoginId = authorizeNetKey.includes(":")
      ? authorizeNetKey.split(":")[0]
      : authorizeNetKey;
    const publicClientKey = String(
      (settings?.paymentApiKeys as any)?.authorizeNetPublicKey || "",
    ).trim();
    const sandbox = Boolean(
      (settings as any)?.paymentConfig?.authorizeNetSandbox,
    );
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

    if (settings?.fromAddress) {
      settings.fromAddress = normalizeFromAddress(settings.fromAddress);
    }

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

    if (req.body?.fromAddress) {
      req.body.fromAddress = normalizeFromAddress(req.body.fromAddress);
    }

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

    try {
      const stripe = new Stripe(secretKey);
      // Try to fetch the account as a simple test
      const account = await stripe.accounts.retrieve();
      // Optionally, check if publishableKey looks valid (starts with 'pk_')
      if (!publishableKey.startsWith("pk_")) {
        return res.status(400).json({
          success: false,
          error: "Stripe publishable key format is invalid.",
        });
      }
      return res.json({
        success: true,
        accountName:
          account?.display_name || account?.business_profile?.name || null,
        accountId: account?.id,
        message: "Stripe connection successful. Keys are valid.",
      });
    } catch (stripeErr: any) {
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
