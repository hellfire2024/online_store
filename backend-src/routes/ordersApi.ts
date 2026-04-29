import { Router, Request, Response } from "express";
import axios from "axios";
import { pool } from "../db/connection.js";
import { RowDataPacket } from "mysql2";
import { v4 as uuidv4 } from "uuid";
import Stripe from "stripe";
import {
  sendOrderConfirmationEmail,
  sendShippingNotificationEmail,
  sendPaymentLinkEmail,
  sendContactFormEmail,
} from "../services/emailService.js";
import {
  requireAdmin,
  requireCustomer,
  AuthenticatedRequest,
} from "../middleware/auth.js";

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

const getSiteSettingsRecordId = (): number => {
  const configuredId = getConfiguredSiteSettingsId();
  if (configuredId !== null) {
    return configuredId;
  }

  const env = getRuntimeAppEnv();
  const fallbackId = env === "dev" ? 2 : env === "staging" ? 3 : 1;

  if (String(process.env.NODE_ENV || "").toLowerCase() === "production") {
    console.warn(
      `[ordersApi] SITE_SETTINGS_ID not set in production. Falling back to id=${fallbackId} (APP_ENV=${process.env.APP_ENV || "unset"}). ` +
      "Set SITE_SETTINGS_ID in your deployment env vars to enforce per-project isolation.",
    );
  }

  return fallbackId;
};

type PaymentStatus =
  | "unpaid"
  | "paid"
  | "refund_issued"
  | "declined"
  | "pending_offline"
  | "cash_on_pickup_requested"
  | "cash_on_pickup_paid";

interface OrderRow extends RowDataPacket {
  id: string;
  customer_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  order_number: string;
  order_data: string | null;
  subtotal: number | null;
  tax_amount: number | null;
  shipping_cost: number | null;
  total: number;
  status: string;
  tracking_number: string | null;
  shipper: string | null;
  created_at: Date;
  updated_at: Date;
}

interface SettingsRow extends RowDataPacket {
  settings: any;
}

const parseSettings = (raw: unknown) => {
  if (!raw) {
    return {};
  }

  // mysql2 can return JSON columns as already-parsed objects.
  if (typeof raw === "object") {
    if (Array.isArray(raw)) {
      const first = raw[0];
      return first && typeof first === "object" ? first : {};
    }
    return raw;
  }

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (
        Array.isArray(parsed) &&
        parsed.length > 0 &&
        typeof parsed[0] === "object"
      ) {
        return parsed[0];
      }
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  return {};
};

const readSiteSettings = async (): Promise<any> => {
  const settingsId = getSiteSettingsRecordId();
  const [rows] = await pool.query<SettingsRow[]>(
    "SELECT settings FROM site_settings WHERE id = ? LIMIT 1",
    [settingsId],
  );

  return rows.length ? parseSettings(rows[0].settings) : {};
};

const parseOrderData = (raw: string | null): Record<string, unknown> => {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Ignore parse failures and return an empty object.
  }

  return {};
};

const hasText = (value: unknown): value is string =>
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

  // Backward-compatible default to match historical config testing behavior.
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

const normalizePaymentStatus = (value: unknown): PaymentStatus | null => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  const allowed: PaymentStatus[] = [
    "unpaid",
    "paid",
    "refund_issued",
    "declined",
    "pending_offline",
    "cash_on_pickup_requested",
    "cash_on_pickup_paid",
  ];

  return allowed.includes(normalized as PaymentStatus)
    ? (normalized as PaymentStatus)
    : null;
};

const normalizeRequestedPaymentMethod = (value: unknown): string => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (normalized === "cash_on_pickup") {
    return "cash_on_pickup";
  }

  if (normalized === "online_card") {
    return "online_card";
  }

  if (normalized === "invoice") {
    return "invoice";
  }

  return "unspecified";
};

const normalizeOrderStatus = (value: unknown): string | null => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  const allowed = [
    "approval_requested",
    "pending",
    "processing",
    "ready_for_pickup",
    "shipped",
    "delivered",
    "cancelled",
  ];

  return allowed.includes(normalized) ? normalized : null;
};

type PaymentCollectionMethod = "cash" | "card" | "bank_transfer" | "other";

const normalizePaymentCollectionMethod = (
  value: unknown,
): PaymentCollectionMethod | null => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  const allowed: PaymentCollectionMethod[] = [
    "cash",
    "card",
    "bank_transfer",
    "other",
  ];

  return allowed.includes(normalized as PaymentCollectionMethod)
    ? (normalized as PaymentCollectionMethod)
    : null;
};

const isStandardStatusTransitionAllowed = (
  currentStatus: string,
  nextStatus: string,
): boolean => {
  if (currentStatus === nextStatus) return true;

  const allowedTransitions: Record<string, string[]> = {
    approval_requested: ["processing", "ready_for_pickup", "cancelled"],
    pending: [
      "approval_requested",
      "processing",
      "ready_for_pickup",
      "cancelled",
    ],
    processing: ["ready_for_pickup", "shipped", "delivered", "cancelled"],
    ready_for_pickup: ["processing", "delivered", "cancelled"],
    shipped: ["delivered", "cancelled"],
    delivered: [],
    cancelled: [],
  };

  return (allowedTransitions[currentStatus] || []).includes(nextStatus);
};

const isLikelyEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const readSalesRecipients = async (): Promise<string[]> => {
  const parsed = await readSiteSettings();

  const candidates = [
    parsed?.salesEmail,
    parsed?.orderNotificationEmail,
    parsed?.supportEmail,
    parsed?.contactEmail,
    parsed?.footerContactEmail,
    parsed?.footerConfig?.contactEmail,
    parsed?.contactPage?.targetEmail,
    process.env.SALES_EMAIL,
    process.env.CONTACT_EMAIL,
  ]
    .map((value) => String(value || "").trim())
    .filter((value) => value.length > 0)
    .filter(isLikelyEmail);

  return Array.from(new Set(candidates));
};

const attachPaymentWorkflowToOrderData = (
  orderData: Record<string, unknown>,
  paymentStatus: PaymentStatus,
  requestedPaymentMethod: string,
  extras?: Record<string, unknown>,
): Record<string, unknown> => {
  const existingPayment =
    orderData.payment && typeof orderData.payment === "object"
      ? (orderData.payment as Record<string, unknown>)
      : {};

  return {
    ...orderData,
    payment: {
      ...existingPayment,
      status: paymentStatus,
      requestedMethod:
        String(existingPayment.requestedMethod || "") || requestedPaymentMethod,
      lastUpdatedAt: new Date().toISOString(),
      ...extras,
    },
  };
};

// GET all orders (admin)
router.get("/", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<OrderRow[]>(
      `SELECT * FROM orders ORDER BY created_at DESC LIMIT 100`,
    );
    // Always return an array, even if empty
    res.json(Array.isArray(rows) ? rows : []);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// GET orders for a specific customer
router.get(
  "/customer/:customerId",
  requireCustomer,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { customerId } = req.params;
      const authUser = (req as AuthenticatedRequest).authUser;
      const normalizedCustomerId = String(customerId || "").trim();

      // Security: only allow customers to see their own orders
      if (authUser && String(authUser.id) !== normalizedCustomerId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      let rows: OrderRow[] = [];

      if (authUser?.email) {
        const [emailAwareRows] = await pool.query<OrderRow[]>(
          `SELECT * FROM orders
           WHERE customer_id = ?
              OR LOWER(customer_email) = LOWER(?)
           ORDER BY created_at DESC
           LIMIT 100`,
          [normalizedCustomerId, authUser.email],
        );
        rows = Array.isArray(emailAwareRows) ? emailAwareRows : [];
      } else {
        const [idOnlyRows] = await pool.query<OrderRow[]>(
          `SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 100`,
          [normalizedCustomerId],
        );
        rows = Array.isArray(idOnlyRows) ? idOnlyRows : [];
      }

      res.json(Array.isArray(rows) ? rows : []);
    } catch (error) {
      console.error("Error fetching customer orders:", error);
      res.status(500).json({ error: "Failed to fetch customer orders" });
    }
  },
);

// GET single order
router.get("/:orderNumber", async (req: Request, res: Response) => {
  try {
    const { orderNumber } = req.params;
    const [rows] = await pool.query<OrderRow[]>(
      "SELECT * FROM orders WHERE order_number = ?",
      [orderNumber],
    );

    if (rows.length === 0) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const order = rows[0];
    const orderData = parseOrderData(order.order_data);

    res.json({
      id: order.id,
      orderNumber: order.order_number,
      customerEmail: order.customer_email,
      customerName: order.customer_name,
      status: order.status,
      trackingNumber: order.tracking_number,
      shipper: order.shipper,
      orderData,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

// POST create order and send confirmation email
// ─── Helper: exchange PayPal client credentials for an access token ───────────
async function getPayPalAccessToken(
  clientId: string,
  clientSecret: string,
  sandbox: boolean,
): Promise<string> {
  const baseUrl = sandbox
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );
  const response = await axios.post(
    `${baseUrl}/v1/oauth2/token`,
    "grant_type=client_credentials",
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );
  return response.data.access_token;
}

const getPayPalBaseUrl = (sandbox: boolean): string =>
  sandbox ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";

const buildPayPalErrorPayload = (error: any) => {
  const status = Number(error?.response?.status) || 500;
  const data = error?.response?.data;
  const details = Array.isArray(data?.details)
    ? data.details
        .map((detail: any) => {
          const issue = String(detail?.issue || "").trim();
          const description = String(detail?.description || "").trim();
          return issue && description
            ? `${issue}: ${description}`
            : issue || description;
        })
        .filter(Boolean)
    : [];

  const baseMessage =
    String(data?.message || "").trim() ||
    String(data?.error_description || "").trim() ||
    String(data?.error || "").trim() ||
    String(error?.message || "").trim() ||
    "PayPal request failed";

  const detailMessage = details.length > 0 ? ` (${details.join("; ")})` : "";
  const configuredEnv = data?.debug_id
    ? `${baseMessage}${detailMessage} (debug_id: ${data.debug_id})`
    : `${baseMessage}${detailMessage}`;

  return {
    status,
    message: configuredEnv,
    raw: data,
  };
};

const getPayPalAuthWithFallback = async (
  clientId: string,
  clientSecret: string,
  preferredSandbox: boolean,
) => {
  try {
    const accessToken = await getPayPalAccessToken(
      clientId,
      clientSecret,
      preferredSandbox,
    );
    return {
      accessToken,
      sandbox: preferredSandbox,
      baseUrl: getPayPalBaseUrl(preferredSandbox),
      fallbackUsed: false,
    };
  } catch (firstError: any) {
    const fallbackSandbox = !preferredSandbox;
    try {
      const accessToken = await getPayPalAccessToken(
        clientId,
        clientSecret,
        fallbackSandbox,
      );
      console.warn(
        `[PayPal] OAuth succeeded after switching environment from ${preferredSandbox ? "sandbox" : "live"} to ${fallbackSandbox ? "sandbox" : "live"}.`,
      );
      return {
        accessToken,
        sandbox: fallbackSandbox,
        baseUrl: getPayPalBaseUrl(fallbackSandbox),
        fallbackUsed: true,
      };
    } catch {
      throw firstError;
    }
  }
};

const parseAmountToCents = (rawAmount: unknown): number | null => {
  if (typeof rawAmount === "number" && Number.isFinite(rawAmount)) {
    const cents = Math.round(rawAmount * 100);
    return cents > 0 ? cents : null;
  }

  if (typeof rawAmount === "string") {
    const normalized = rawAmount.replace(/[^0-9.-]/g, "").trim();
    if (!normalized) {
      return null;
    }

    const numericAmount = Number(normalized);
    if (!Number.isFinite(numericAmount)) {
      return null;
    }

    const cents = Math.round(numericAmount * 100);
    return cents > 0 ? cents : null;
  }

  return null;
};

const resolvePaymentAmountCents = (
  body: Record<string, unknown>,
): number | null => {
  const rawCents = body?.amountCents;
  if (typeof rawCents === "number" && Number.isFinite(rawCents)) {
    const sanitized = Math.round(rawCents);
    if (sanitized > 0) {
      return sanitized;
    }
  }

  if (typeof rawCents === "string") {
    const sanitizedString = rawCents.replace(/[^0-9-]/g, "").trim();
    const parsedCents = Number(sanitizedString);
    if (Number.isFinite(parsedCents)) {
      const rounded = Math.round(parsedCents);
      if (rounded > 0) {
        return rounded;
      }
    }
  }

  return parseAmountToCents(body?.amount);
};

// POST create Stripe PaymentIntent for direct checkout
router.post(
  "/create-payment-intent",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const amountCents = resolvePaymentAmountCents(
        (req.body || {}) as Record<string, unknown>,
      );

      if (!amountCents) {
        console.warn("[Stripe] Invalid payment amount received:", req.body);
        return res.status(400).json({
          error: "Invalid payment amount",
          details: "Amount must be a positive number.",
        });
      }

      if (amountCents > 10_000_000) {
        return res.status(400).json({
          error: "Invalid payment amount",
          details: "Amount exceeds the maximum allowed value.",
        });
      }

      // Load Stripe secret key from settings
      const rawSettings = await readSiteSettings();
      console.log(
        "[Stripe] settings from DB:",
        JSON.stringify(rawSettings, null, 2),
      );
      if (rawSettings && Object.keys(rawSettings).length > 0) {
        try {
          let parsed: any = rawSettings;
          console.log(
            "[Stripe] settings parsed (final):",
            JSON.stringify(parsed, null, 2),
          );
          const paymentApiKeys = parsed?.paymentApiKeys;
          const stripeSecretKey = paymentApiKeys?.stripe
            ? String(paymentApiKeys.stripe).trim()
            : "";
          // Debug logging
          console.log("[Stripe] PaymentIntent debug:", {
            paymentApiKeys,
            stripeSecretKey,
            fullSettings: parsed,
            keys: Object.keys(parsed),
          });
          if (!stripeSecretKey) {
            console.error(
              "[Stripe] FATAL: Secret key missing in DB settings. Settings:",
              paymentApiKeys,
            );
            return res.status(500).json({
              error:
                "Stripe is not configured. Add your secret key in Settings → Payment.",
            });
          }
          const stripe = new Stripe(stripeSecretKey);
          const paymentIntent = await stripe.paymentIntents.create({
            amount: amountCents,
            currency: "usd",
            ...req.body.intentOptions,
          });
          return res.json({ clientSecret: paymentIntent.client_secret });
        } catch (e) {
          console.error("[Stripe] Error creating payment intent:", e);
          return res
            .status(500)
            .json({ error: "Failed to create payment intent" });
        }
      } else {
        return res
          .status(500)
          .json({ error: "Stripe settings not found in DB" });
      }
    } catch (e) {
      console.error("[Stripe] Unexpected error in payment intent endpoint:", e);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.post("/", async (req: Request, res: Response) => {
  try {
    const { orderNumber, customerId, customerEmail, customerName, orderData } =
      req.body;

    if (!orderNumber || !customerEmail || !customerName || !orderData) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const rawSettings = await readSiteSettings();

    const orderId = uuidv4();
    const subtotal = Number(orderData.subtotal || 0);
    const taxAmount = Number(orderData.tax || 0);
    const shippingCost = Number(orderData.shipping || 0);
    const total = Number(orderData.total || 0);
    const requestedMethod = normalizeRequestedPaymentMethod(
      orderData?.paymentMethod,
    );

    let explicitPaymentStatus = normalizePaymentStatus(
      orderData?.paymentStatus,
    );

    let verifiedPaymentIntentId: string | null = null;
    let verifiedPaypalCaptureId: string | null = null;
    let verifiedSquarePaymentId: string | null = null;
    let verifiedAuthorizeNetTxId: string | null = null;

    const incomingPaymentIntentId = String(
      orderData?.paymentIntentId || "",
    ).trim();
    const incomingPaypalCaptureId = String(
      orderData?.paypalCaptureId || "",
    ).trim();
    const incomingSquarePaymentId = String(
      orderData?.squarePaymentId || "",
    ).trim();
    const incomingAuthorizeNetTxId = String(
      orderData?.authorizeNetTransactionId || "",
    ).trim();

    if (incomingPaymentIntentId && incomingPaymentIntentId.startsWith("pi_")) {
      try {
        const stripeSecretKey = String(
          rawSettings?.paymentApiKeys?.stripe || "",
        ).trim();
        if (stripeSecretKey) {
          const stripe = new Stripe(stripeSecretKey);
          const intent = await stripe.paymentIntents.retrieve(
            incomingPaymentIntentId,
          );
          if (intent.status === "succeeded") {
            verifiedPaymentIntentId = incomingPaymentIntentId;
            explicitPaymentStatus = "paid";
          }
        }
      } catch (stripeErr: any) {
        console.warn(
          `[Order ${orderNumber}] Could not verify PaymentIntent:`,
          stripeErr?.message,
        );
      }
    }

    if (incomingPaypalCaptureId && explicitPaymentStatus !== "paid") {
      try {
        const clientId = String(
          rawSettings?.paymentApiKeys?.paypal || "",
        ).trim();
        const clientSecret = String(
          (rawSettings?.paymentApiKeys as any)?.paypalSecret || "",
        ).trim();
        if (clientId && clientSecret) {
          const sandbox = Boolean(
            (rawSettings as any)?.paymentConfig?.paypalSandbox,
          );
          const baseUrl = sandbox
            ? "https://api-m.sandbox.paypal.com"
            : "https://api-m.paypal.com";
          const token = await getPayPalAccessToken(
            clientId,
            clientSecret,
            sandbox,
          );
          const captureResp = await axios.get(
            `${baseUrl}/v2/payments/captures/${incomingPaypalCaptureId}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (captureResp.data?.status === "COMPLETED") {
            verifiedPaypalCaptureId = incomingPaypalCaptureId;
            explicitPaymentStatus = "paid";
          }
        }
      } catch (ppErr: any) {
        console.warn(
          `[Order ${orderNumber}] Could not verify PayPal capture:`,
          ppErr?.message,
        );
      }
    }

    if (incomingSquarePaymentId && explicitPaymentStatus !== "paid") {
      try {
        const squareToken = String(
          rawSettings?.paymentApiKeys?.square || "",
        ).trim();
        if (squareToken) {
          const sandbox = resolveSquareSandbox(rawSettings);
          const baseUrl = sandbox
            ? "https://connect.squareupsandbox.com"
            : "https://connect.squareup.com";
          const paymentResp = await axios.get(
            `${baseUrl}/v2/payments/${incomingSquarePaymentId}`,
            {
              headers: {
                Authorization: `Bearer ${squareToken}`,
                "Square-Version": "2024-01-18",
              },
            },
          );
          if (paymentResp.data?.payment?.status === "COMPLETED") {
            verifiedSquarePaymentId = incomingSquarePaymentId;
            explicitPaymentStatus = "paid";
          }
        }
      } catch (sqErr: any) {
        console.warn(
          `[Order ${orderNumber}] Could not verify Square payment:`,
          sqErr?.message,
        );
      }
    }

    if (incomingAuthorizeNetTxId && explicitPaymentStatus !== "paid") {
      try {
        const { apiLoginId, transactionKey } = parseAuthorizeNetCredentials(
          rawSettings?.paymentApiKeys?.authorizeNet,
        );
        if (apiLoginId && transactionKey) {
          const sandbox = resolveAuthorizeNetSandbox(rawSettings);
          const apiUrl = sandbox
            ? "https://apitest.authorize.net/xml/v1/request.api"
            : "https://api.authorize.net/xml/v1/request.api";
          const detailsResp = await axios.post(apiUrl, {
            getTransactionDetailsRequest: {
              merchantAuthentication: {
                name: apiLoginId,
                transactionKey,
              },
              transId: incomingAuthorizeNetTxId,
            },
          });
          const txStatus = detailsResp.data?.transaction?.transactionStatus;
          if (
            [
              "settledSuccessfully",
              "capturedPendingSettlement",
              "authorizedPendingCapture",
            ].includes(txStatus)
          ) {
            verifiedAuthorizeNetTxId = incomingAuthorizeNetTxId;
            explicitPaymentStatus = "paid";
          }
        }
      } catch (anErr: any) {
        console.warn(
          `[Order ${orderNumber}] Could not verify Authorize.Net transaction:`,
          anErr?.message,
        );
      }
    }

    const paymentStatus = explicitPaymentStatus || "unpaid";

    const normalizedOrderData = attachPaymentWorkflowToOrderData(
      { ...(orderData as Record<string, unknown>) },
      paymentStatus,
      requestedMethod,
      {
        collectedOnSite: false,
        ...(verifiedPaymentIntentId && {
          stripePaymentIntentId: verifiedPaymentIntentId,
          paidAt: new Date().toISOString(),
        }),
        ...(verifiedPaypalCaptureId && {
          paypalCaptureId: verifiedPaypalCaptureId,
          paidAt: new Date().toISOString(),
        }),
        ...(verifiedSquarePaymentId && {
          squarePaymentId: verifiedSquarePaymentId,
          paidAt: new Date().toISOString(),
        }),
        ...(verifiedAuthorizeNetTxId && {
          authorizeNetTransactionId: verifiedAuthorizeNetTxId,
          paidAt: new Date().toISOString(),
        }),
        invoiceIssuedAt:
          requestedMethod === "invoice" || paymentStatus === "pending_offline"
            ? new Date().toISOString()
            : undefined,
      },
    );

    await pool.query(
      `INSERT INTO orders (
        id, customer_id, customer_email, customer_name, order_number, order_data,
        subtotal, tax_amount, shipping_cost, total, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        orderId,
        customerId || null,
        customerEmail,
        customerName,
        orderNumber,
        JSON.stringify(normalizedOrderData),
        subtotal,
        taxAmount,
        shippingCost,
        total,
      ],
    );

    const emailResult = await sendOrderConfirmationEmail(
      customerEmail,
      customerName,
      orderNumber,
      normalizedOrderData,
    );

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      orderNumber,
      emailSent: emailResult.success,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// POST request assisted checkout approval when payment/shipping/tax are unavailable
router.post("/request-approval", async (req: Request, res: Response) => {
  try {
    const {
      customerId,
      customerEmail,
      customerName,
      orderData,
      unavailableServices,
      requestNotes,
      requestedPaymentMethod,
    } = req.body || {};

    if (!customerEmail || !customerName || !orderData) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const requestId = uuidv4();
    const requestNumber = `REQ-${Date.now().toString().slice(-8)}-${Math.floor(
      1000 + Math.random() * 9000,
    )}`;
    const subtotal = Number(orderData.subtotal || 0);
    const taxAmount = Number(orderData.tax || 0);
    const shippingCost = Number(orderData.shipping || 0);
    const total = Number(
      orderData.total || subtotal + taxAmount + shippingCost,
    );

    const normalizedUnavailableServices = Array.isArray(unavailableServices)
      ? unavailableServices.map((service) => String(service))
      : [];

    const paymentMethodRequested = normalizeRequestedPaymentMethod(
      requestedPaymentMethod || orderData?.paymentMethod,
    );

    const requestedPaymentStatus: PaymentStatus =
      paymentMethodRequested === "cash_on_pickup"
        ? "cash_on_pickup_requested"
        : "pending_offline";

    const requestPayload = attachPaymentWorkflowToOrderData(
      {
        ...(orderData as Record<string, unknown>),
        requestType: "approval_request",
        unavailableServices: normalizedUnavailableServices,
        requestNotes: String(requestNotes || "").trim() || undefined,
        requestSubmittedAt: new Date().toISOString(),
      },
      requestedPaymentStatus,
      paymentMethodRequested,
      {
        collectedOnSite: false,
        invoiceIssuedAt:
          requestedPaymentStatus === "pending_offline"
            ? new Date().toISOString()
            : undefined,
      },
    );

    await pool.query(
      `INSERT INTO orders (
        id, customer_id, customer_email, customer_name, order_number, order_data,
        subtotal, tax_amount, shipping_cost, total, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approval_requested')`,
      [
        requestId,
        customerId || null,
        customerEmail,
        customerName,
        requestNumber,
        JSON.stringify(requestPayload),
        subtotal,
        taxAmount,
        shippingCost,
        total,
      ],
    );

    let emailSent = false;
    let emailMessage = "Sales request saved. Email was not sent.";
    let deliveredTo: string[] = [];
    const failedRecipients: Array<{ recipient: string; message: string }> = [];

    try {
      const salesRecipients = await readSalesRecipients();
      if (salesRecipients.length > 0) {
        for (const recipient of salesRecipients) {
          const emailResult = await sendContactFormEmail(
            recipient,
            customerEmail,
            customerName,
            `Order Approval Request ${requestNumber}`,
            [
              {
                id: "requestNumber",
                type: "text",
                label: "Request Number",
                required: true,
                value: requestNumber,
              },
              {
                id: "customerEmail",
                type: "email",
                label: "Customer Email",
                required: true,
                value: customerEmail,
              },
              {
                id: "services",
                type: "text",
                label: "Unavailable Services",
                required: false,
                value:
                  normalizedUnavailableServices.length > 0
                    ? normalizedUnavailableServices.join(", ")
                    : "Not provided",
              },
              {
                id: "requestedPaymentMethod",
                type: "text",
                label: "Requested Payment Method",
                required: false,
                value: paymentMethodRequested,
              },
              {
                id: "paymentStatus",
                type: "text",
                label: "Payment Status",
                required: true,
                value: requestedPaymentStatus,
              },
              {
                id: "orderTotal",
                type: "text",
                label: "Requested Order Total",
                required: true,
                value: `$${total.toFixed(2)}`,
              },
              {
                id: "message",
                type: "textarea",
                label: "Customer Notes",
                required: false,
                value:
                  String(requestNotes || "").trim() ||
                  "No additional notes provided.",
              },
            ],
          );

          if (emailResult.success) {
            deliveredTo.push(recipient);
          } else {
            failedRecipients.push({
              recipient,
              message: String(emailResult.message || "Delivery failed"),
            });
          }
        }

        emailSent = deliveredTo.length > 0;
        emailMessage = emailSent
          ? `Sales request emailed to ${deliveredTo.join(", ")}`
          : "Sales request saved, but email delivery failed for all recipients.";
      } else {
        emailMessage =
          "Sales request saved but no sales email recipient is configured.";
      }
    } catch (emailError) {
      console.error(
        "Failed to send assisted checkout request email:",
        emailError,
      );
      emailMessage = "Sales request saved, but email delivery failed.";
    }

    res.status(201).json({
      success: true,
      requestNumber,
      emailSent,
      message: emailMessage,
      deliveredTo,
      failedRecipients,
    });
  } catch (error) {
    console.error("Error creating assisted checkout request:", error);
    res
      .status(500)
      .json({ error: "Failed to submit assisted checkout request" });
  }
});

// PUT update admin workflow data for an order (payment state, approval state, status)
router.put(
  "/:orderNumber/workflow",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { orderNumber } = req.params;
      const authUser = (req as AuthenticatedRequest).authUser;
      const isSuperAdmin = authUser?.role === "super_admin";
      const {
        status,
        paymentStatus,
        requestedPaymentMethod,
        paymentCollectionMethod,
        paymentCollectedAt,
        invoiceIssuedAt,
        paymentDeclineReason,
        approvalNotes,
        approvedWithoutPayment,
        forceStatusOverride,
        statusOverrideReason,
        trackingNumber,
        shipper,
      } = req.body || {};

      const [rows] = await pool.query<OrderRow[]>(
        "SELECT * FROM orders WHERE order_number = ?",
        [orderNumber],
      );

      if (!rows.length) {
        res.status(404).json({ error: "Order not found" });
        return;
      }

      const existingOrder = rows[0];
      const existingOrderData = parseOrderData(existingOrder.order_data);
      const existingPayment =
        existingOrderData.payment &&
        typeof existingOrderData.payment === "object"
          ? (existingOrderData.payment as Record<string, unknown>)
          : {};

      const normalizedPaymentStatus =
        normalizePaymentStatus(paymentStatus) ||
        normalizePaymentStatus(existingPayment.status) ||
        "unpaid";

      const existingNormalizedPaymentStatus =
        normalizePaymentStatus(existingPayment.status) || "unpaid";

      const existingRequestedPaymentMethod = normalizeRequestedPaymentMethod(
        existingPayment.requestedMethod,
      );

      const normalizedRequestedPaymentMethod = normalizeRequestedPaymentMethod(
        requestedPaymentMethod || existingPayment.requestedMethod,
      );

      const normalizedCollectionMethod = normalizePaymentCollectionMethod(
        paymentCollectionMethod,
      );

      const hasCollectedAtInput = hasText(paymentCollectedAt);
      const resolvedCollectedAt = hasCollectedAtInput
        ? paymentCollectedAt.trim()
        : undefined;

      const existingInvoiceIssuedAt = hasText(existingPayment.invoiceIssuedAt)
        ? String(existingPayment.invoiceIssuedAt)
        : undefined;

      const resolvedInvoiceIssuedAt = hasText(invoiceIssuedAt)
        ? invoiceIssuedAt.trim()
        : existingInvoiceIssuedAt ||
          (normalizedPaymentStatus === "pending_offline"
            ? new Date().toISOString()
            : undefined);

      const existingPaymentWasReceived =
        existingNormalizedPaymentStatus === "paid" ||
        existingNormalizedPaymentStatus === "cash_on_pickup_paid";

      const nextPaymentIsReceived =
        normalizedPaymentStatus === "paid" ||
        normalizedPaymentStatus === "cash_on_pickup_paid";

      const requestedMethodSwitchesCashToCard =
        String(existingPayment.requestedMethod || "") === "cash_on_pickup" &&
        normalizedRequestedPaymentMethod === "online_card";

      if (requestedMethodSwitchesCashToCard && existingPaymentWasReceived) {
        res.status(409).json({
          error:
            "Cannot switch payment method from cash to card after payment is already received.",
        });
        return;
      }

      if (
        normalizedPaymentStatus === "refund_issued" &&
        !existingPaymentWasReceived
      ) {
        res.status(409).json({
          error: "Refund can only be issued after payment has been received.",
        });
        return;
      }

      if (normalizedPaymentStatus === "paid" && !isSuperAdmin) {
        const canRecordCashCollection = normalizedCollectionMethod === "cash";
        if (!canRecordCashCollection) {
          res.status(400).json({
            error:
              "Direct paid status updates are restricted unless recording a cash collection.",
          });
          return;
        }
      }

      if (
        normalizedPaymentStatus === "cash_on_pickup_paid" &&
        normalizedRequestedPaymentMethod !== "cash_on_pickup"
      ) {
        res.status(400).json({
          error: "cash_on_pickup_paid is only valid for cash-on-pickup orders.",
        });
        return;
      }

      const normalizedStatus =
        normalizeOrderStatus(status) ||
        String(existingOrder.status || "pending");

      const currentStatus =
        normalizeOrderStatus(existingOrder.status) ||
        String(existingOrder.status);

      const shouldApproveWithoutPayment = Boolean(approvedWithoutPayment);
      const paymentMarkedPaid = nextPaymentIsReceived;

      const resolvedStatus =
        normalizedStatus === "approval_requested" &&
        (shouldApproveWithoutPayment || paymentMarkedPaid)
          ? "processing"
          : normalizedStatus;

      const forceOverrideRequested = Boolean(forceStatusOverride);

      if (
        resolvedStatus === "ready_for_pickup" &&
        normalizedRequestedPaymentMethod !== "cash_on_pickup" &&
        !(forceOverrideRequested && isSuperAdmin)
      ) {
        res.status(400).json({
          error:
            "ready_for_pickup is only valid for cash-on-pickup orders unless force overridden by a super admin.",
        });
        return;
      }

      if (
        normalizedPaymentStatus === "cash_on_pickup_paid" &&
        resolvedStatus !== "delivered" &&
        !(forceOverrideRequested && isSuperAdmin)
      ) {
        res.status(400).json({
          error:
            "cash_on_pickup_paid requires the order status to be delivered unless force overridden by a super admin.",
        });
        return;
      }

      if (forceOverrideRequested && !isSuperAdmin) {
        res.status(403).json({
          error: "Only super admins can force status overrides.",
        });
        return;
      }

      if (
        resolvedStatus !== currentStatus &&
        !forceOverrideRequested &&
        !isStandardStatusTransitionAllowed(currentStatus, resolvedStatus)
      ) {
        res.status(409).json({
          error: `Invalid status transition from ${currentStatus} to ${resolvedStatus}.`,
        });
        return;
      }

      const statusOverrideApplied =
        forceOverrideRequested &&
        isSuperAdmin &&
        resolvedStatus !== currentStatus;

      const updatedOrderData = {
        ...existingOrderData,
        approval: {
          ...(existingOrderData.approval &&
          typeof existingOrderData.approval === "object"
            ? (existingOrderData.approval as Record<string, unknown>)
            : {}),
          approvedWithoutPayment: shouldApproveWithoutPayment,
          notes: hasText(approvalNotes) ? approvalNotes.trim() : undefined,
          approvedAt:
            shouldApproveWithoutPayment || paymentMarkedPaid
              ? new Date().toISOString()
              : undefined,
          statusOverride: statusOverrideApplied
            ? {
                fromStatus: currentStatus,
                toStatus: resolvedStatus,
                reason: hasText(statusOverrideReason)
                  ? statusOverrideReason.trim()
                  : hasText(approvalNotes)
                    ? approvalNotes.trim()
                    : undefined,
                overriddenBy: authUser?.id || null,
                overriddenByRole: authUser?.role || "admin",
                overriddenAt: new Date().toISOString(),
              }
            : undefined,
        },
        payment: {
          ...existingPayment,
          status: normalizedPaymentStatus,
          requestedMethod: normalizedRequestedPaymentMethod,
          invoiceIssuedAt: resolvedInvoiceIssuedAt,
          collectionMethod:
            normalizedCollectionMethod ||
            (typeof existingPayment.collectionMethod === "string"
              ? existingPayment.collectionMethod
              : undefined),
          collectedAt:
            normalizedPaymentStatus === "paid" ||
            normalizedPaymentStatus === "cash_on_pickup_paid"
              ? resolvedCollectedAt ||
                (typeof existingPayment.collectedAt === "string"
                  ? existingPayment.collectedAt
                  : new Date().toISOString())
              : undefined,
          paidAt:
            normalizedPaymentStatus === "paid" ||
            normalizedPaymentStatus === "cash_on_pickup_paid"
              ? resolvedCollectedAt ||
                (typeof existingPayment.paidAt === "string"
                  ? existingPayment.paidAt
                  : new Date().toISOString())
              : undefined,
          refundedAt:
            normalizedPaymentStatus === "refund_issued"
              ? new Date().toISOString()
              : undefined,
          refundedBy:
            normalizedPaymentStatus === "refund_issued"
              ? authUser?.id || null
              : undefined,
          refundReason:
            normalizedPaymentStatus === "refund_issued" &&
            hasText(approvalNotes)
              ? approvalNotes.trim()
              : undefined,
          collectedBy:
            normalizedPaymentStatus === "paid" ||
            normalizedPaymentStatus === "cash_on_pickup_paid"
              ? authUser?.id || null
              : undefined,
          declineReason: hasText(paymentDeclineReason)
            ? paymentDeclineReason.trim()
            : undefined,
          lastUpdatedAt: new Date().toISOString(),
        },
      };

      const nextTrackingNumber =
        typeof trackingNumber === "string"
          ? trackingNumber.trim() || null
          : existingOrder.tracking_number;

      const nextShipper =
        typeof shipper === "string"
          ? shipper.trim() || null
          : existingOrder.shipper;

      await pool.query(
        `UPDATE orders
       SET status = ?,
           tracking_number = ?,
           shipper = ?,
           order_data = ?,
           updated_at = NOW()
       WHERE order_number = ?`,
        [
          resolvedStatus,
          nextTrackingNumber,
          nextShipper,
          JSON.stringify(updatedOrderData),
          orderNumber,
        ],
      );

      const shouldSendPaymentLinkEmail =
        normalizedRequestedPaymentMethod === "online_card" &&
        normalizedPaymentStatus === "pending_offline" &&
        (existingRequestedPaymentMethod !== "online_card" ||
          existingNormalizedPaymentStatus !== "pending_offline") &&
        hasText(existingOrder.customer_email);

      let paymentLinkEmail: {
        attempted: boolean;
        sent: boolean;
        message: string;
        paymentLink?: string;
      } | null = null;

      if (shouldSendPaymentLinkEmail) {
        const frontendBaseUrl =
          String(process.env.FRONTEND_URL || "").trim() ||
          "https://customthreadsonline.com";
        const paymentLink = `${frontendBaseUrl.replace(/\/$/, "")}/#/pay/${orderNumber}`;

        const emailResult = await sendPaymentLinkEmail(
          String(existingOrder.customer_email),
          String(existingOrder.customer_name || "Customer"),
          orderNumber,
          paymentLink,
        );

        paymentLinkEmail = {
          attempted: true,
          sent: Boolean(emailResult.success),
          message: String(
            emailResult.message || "Payment link email processed.",
          ),
          paymentLink,
        };
      }

      res.json({
        success: true,
        orderNumber,
        status: resolvedStatus,
        statusOverrideApplied,
        payment: updatedOrderData.payment,
        approval: updatedOrderData.approval,
        trackingNumber: nextTrackingNumber,
        shipper: nextShipper,
        paymentLinkEmail,
      });
    } catch (error) {
      console.error("Error updating order workflow:", error);
      res.status(500).json({ error: "Failed to update order workflow" });
    }
  },
);

// PUT update order with shipping info
router.put(
  "/:orderNumber/ship",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { orderNumber } = req.params;
      const { trackingNumber, shipper, shippingUrl } = req.body;

      if (!trackingNumber || !shipper) {
        res.status(400).json({ error: "Missing tracking number or shipper" });
        return;
      }

      // Get order details
      const [rows] = await pool.query<OrderRow[]>(
        "SELECT * FROM orders WHERE order_number = ?",
        [orderNumber],
      );

      if (rows.length === 0) {
        res.status(404).json({ error: "Order not found" });
        return;
      }

      const order = rows[0];

      // Update order with shipping info
      await pool.query(
        `UPDATE orders SET status = 'shipped', tracking_number = ?, shipper = ?, updated_at = NOW()
       WHERE order_number = ?`,
        [trackingNumber, shipper, orderNumber],
      );

      // Send shipping notification email
      let emailResult = {
        success: false,
        message: "Customer email not available",
      };
      if (order.customer_email && order.customer_name) {
        emailResult = await sendShippingNotificationEmail(
          order.customer_email,
          order.customer_name,
          orderNumber,
          trackingNumber,
          shipper,
          shippingUrl,
        );
      }

      res.json({
        success: true,
        message: "Order updated with shipping info",
        emailSent: emailResult.success,
      });
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ error: "Failed to update order" });
    }
  },
);

// POST create PayPal order for checkout
router.post(
  "/create-paypal-order",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { amount } = req.body;
      if (!amount || Number(amount) <= 0) {
        return res.status(400).json({ error: "Invalid payment amount" });
      }

      const rawSettings = await readSiteSettings();
      const clientId = String(rawSettings?.paymentApiKeys?.paypal || "").trim();
      const clientSecret = String(
        (rawSettings?.paymentApiKeys as any)?.paypalSecret || "",
      ).trim();

      if (!clientId || !clientSecret) {
        return res.status(400).json({
          error: "PayPal credentials not configured in Settings → Payment.",
        });
      }

      const sandbox = Boolean(
        (rawSettings as any)?.paymentConfig?.paypalSandbox,
      );
      const authContext = await getPayPalAuthWithFallback(
        clientId,
        clientSecret,
        sandbox,
      );
      const {
        accessToken,
        baseUrl,
        fallbackUsed,
        sandbox: resolvedSandbox,
      } = authContext;

      const orderResponse = await axios.post(
        `${baseUrl}/v2/checkout/orders`,
        {
          intent: "CAPTURE",
          purchase_units: [
            {
              amount: {
                currency_code: "USD",
                value: Number(amount).toFixed(2),
              },
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      return res.json({
        orderId: orderResponse.data.id,
        sandbox: resolvedSandbox,
        environmentFallbackUsed: fallbackUsed,
      });
    } catch (error: any) {
      const normalized = buildPayPalErrorPayload(error);
      console.error("PayPal create order error:", normalized.raw || error);
      return res.status(normalized.status).json({ error: normalized.message });
    }
  },
);

// POST capture PayPal payment after user approval
router.post(
  "/capture-paypal-payment",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { orderId } = req.body;
      if (!orderId) {
        return res.status(400).json({ error: "PayPal orderId is required" });
      }

      const rawSettings = await readSiteSettings();
      const clientId = String(rawSettings?.paymentApiKeys?.paypal || "").trim();
      const clientSecret = String(
        (rawSettings?.paymentApiKeys as any)?.paypalSecret || "",
      ).trim();

      if (!clientId || !clientSecret) {
        return res
          .status(400)
          .json({ error: "PayPal credentials not configured." });
      }

      const sandbox = Boolean(
        (rawSettings as any)?.paymentConfig?.paypalSandbox,
      );
      const authContext = await getPayPalAuthWithFallback(
        clientId,
        clientSecret,
        sandbox,
      );
      let { accessToken, baseUrl, sandbox: resolvedSandbox } = authContext;

      let captureResponse;
      try {
        captureResponse = await axios.post(
          `${baseUrl}/v2/checkout/orders/${orderId}/capture`,
          {},
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          },
        );
      } catch (firstCaptureError: any) {
        const fallbackSandbox = !resolvedSandbox;
        try {
          accessToken = await getPayPalAccessToken(
            clientId,
            clientSecret,
            fallbackSandbox,
          );
          baseUrl = getPayPalBaseUrl(fallbackSandbox);
          resolvedSandbox = fallbackSandbox;
          console.warn(
            `[PayPal] Capture retrying in ${fallbackSandbox ? "sandbox" : "live"} environment.`,
          );
          captureResponse = await axios.post(
            `${baseUrl}/v2/checkout/orders/${orderId}/capture`,
            {},
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
            },
          );
        } catch {
          throw firstCaptureError;
        }
      }

      const captureData = captureResponse.data;
      if (captureData.status !== "COMPLETED") {
        return res.status(400).json({
          error: `PayPal order not completed. Status: ${captureData.status}`,
        });
      }

      const captureId =
        captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id;
      return res.json({
        captureId,
        status: captureData.status,
        sandbox: resolvedSandbox,
      });
    } catch (error: any) {
      const normalized = buildPayPalErrorPayload(error);
      console.error("PayPal capture error:", normalized.raw || error);
      return res.status(normalized.status).json({ error: normalized.message });
    }
  },
);

// POST create Square payment using a card nonce from the frontend SDK
router.post(
  "/create-square-payment",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { nonce, amount, orderNumber } = req.body;
      if (!nonce || !amount || Number(amount) <= 0) {
        return res.status(400).json({ error: "Invalid payment data" });
      }

      const rawSettings = await readSiteSettings();
      const accessToken = String(
        rawSettings?.paymentApiKeys?.square || "",
      ).trim();
      const locationId = String(
        (rawSettings?.paymentApiKeys as any)?.squareLocationId || "",
      ).trim();

      if (!accessToken || !locationId) {
        return res.status(400).json({
          error:
            "Square credentials not configured. Add Access Token and Location ID in Settings → Payment.",
        });
      }

      const sandbox = resolveSquareSandbox(rawSettings);
      const baseUrl = sandbox
        ? "https://connect.squareupsandbox.com"
        : "https://connect.squareup.com";

      console.log(
        `[Square] Charging via ${sandbox ? "SANDBOX" : "PRODUCTION"} API (${baseUrl}), locationId=${locationId}`,
      );

      const idempotencyKey = uuidv4();
      const response = await axios.post(
        `${baseUrl}/v2/payments`,
        {
          source_id: nonce,
          idempotency_key: idempotencyKey,
          amount_money: {
            amount: Math.round(Number(amount) * 100),
            currency: "USD",
          },
          location_id: locationId,
          reference_id: orderNumber
            ? String(orderNumber).substring(0, 40)
            : undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "Square-Version": "2024-01-18",
          },
        },
      );

      const payment = response.data?.payment;
      if (!payment || payment.status !== "COMPLETED") {
        return res.status(400).json({
          error: `Square payment not completed. Status: ${payment?.status || "unknown"}`,
        });
      }

      console.log(
        `[Square] Payment ${payment.id} COMPLETED in ${sandbox ? "sandbox" : "production"} environment.`,
      );
      return res.json({
        paymentId: payment.id,
        status: payment.status,
        sandbox,
      });
    } catch (error: any) {
      const squareData = error?.response?.data;
      console.error(
        "[Square] Payment error:",
        JSON.stringify(squareData || error?.message),
      );
      const squareError =
        squareData?.errors?.[0]?.detail ||
        squareData?.errors?.[0]?.code ||
        error?.message;
      return res
        .status(error?.response?.status || 500)
        .json({ error: squareError || "Failed to create Square payment" });
    }
  },
);

// POST charge via Authorize.Net using an Accept.js opaque data token
router.post(
  "/charge-authorize-net",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { dataDescriptor, dataValue, amount, orderNumber } = req.body;
      if (!dataDescriptor || !dataValue || !amount || Number(amount) <= 0) {
        return res.status(400).json({ error: "Invalid payment data" });
      }

      const rawSettings = await readSiteSettings();
      const { apiLoginId, transactionKey } = parseAuthorizeNetCredentials(
        rawSettings?.paymentApiKeys?.authorizeNet,
      );

      if (!apiLoginId || !transactionKey) {
        return res.status(400).json({
          error:
            "Authorize.Net credentials not configured. Add API Login ID and Transaction Key in Settings → Payment.",
        });
      }

      const sandbox = resolveAuthorizeNetSandbox(rawSettings);
      const apiUrl = sandbox
        ? "https://apitest.authorize.net/xml/v1/request.api"
        : "https://api.authorize.net/xml/v1/request.api";

      const response = await axios.post(apiUrl, {
        createTransactionRequest: {
          merchantAuthentication: { name: apiLoginId, transactionKey },
          refId: orderNumber ? String(orderNumber).substring(0, 20) : undefined,
          transactionRequest: {
            transactionType: "authCaptureTransaction",
            amount: Number(amount).toFixed(2),
            payment: {
              opaqueData: { dataDescriptor, dataValue },
            },
          },
        },
      });

      const messages = response.data?.messages;
      const transactionResponse = response.data?.transactionResponse;

      if (messages?.resultCode === "Error") {
        const errorMsg =
          messages?.message?.[0]?.text || "Transaction rejected by gateway";
        return res.status(400).json({ error: errorMsg });
      }

      if (transactionResponse?.responseCode !== "1") {
        const errorMsg =
          transactionResponse?.errors?.error?.[0]?.errorText ||
          "Transaction declined";
        return res.status(400).json({ error: errorMsg });
      }

      return res.json({
        transactionId: transactionResponse.transId,
        authCode: transactionResponse.authCode,
      });
    } catch (error: any) {
      const gatewayMessage =
        error?.response?.data?.messages?.message?.[0]?.text ||
        error?.response?.data?.transactionResponse?.errors?.error?.[0]
          ?.errorText ||
        error?.response?.data?.transactionResponse?.messages?.message?.[0]
          ?.description;
      console.error(
        "Authorize.Net charge error:",
        error?.response?.data || error?.message,
      );
      return res.status(500).json({
        error: gatewayMessage || error?.message || "Failed to process payment",
      });
    }
  },
);

export default router;
