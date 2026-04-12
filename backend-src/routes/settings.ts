import Stripe from "stripe";
import { Router, Request, Response } from "express";
import { pool } from "../db/connection.js";
import { RowDataPacket } from "mysql2";

const router = Router();

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
      const xml = `<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<getMerchantDetailsRequest xmlns=\"AnetApi/xml/v1/schema/AnetApiSchema.xsd\"><merchantAuthentication><name>${apiLoginId}</name><transactionKey>${transactionKey}</transactionKey></merchantAuthentication></getMerchantDetailsRequest>`;
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
  const combined = String(value || "").trim();
  const separatorIndex = combined.indexOf(":");

  if (separatorIndex < 0) {
    return {
      apiLoginId: combined.trim(),
      transactionKey: "",
    };
  }

  return {
    apiLoginId: combined.slice(0, separatorIndex).trim(),
    transactionKey: combined.slice(separatorIndex + 1).trim(),
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

    // Debug: print the settings being saved
    console.log("[Settings] Saving to DB:", JSON.stringify(req.body, null, 2));

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
