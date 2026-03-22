import { Router, Request, Response } from "express";
import { pool } from "../db/connection.js";
import { RowDataPacket } from "mysql2";
import { v4 as uuidv4 } from "uuid";
import {
  sendOrderConfirmationEmail,
  sendShippingNotificationEmail,
  sendContactFormEmail,
} from "../services/emailService.js";
import {
  requireAdmin,
  requireCustomer,
  AuthenticatedRequest,
} from "../middleware/auth.js";

const router = Router();

type PaymentStatus =
  | "unpaid"
  | "paid"
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
  settings: string | null;
}

const parseSettings = (raw: string | null) => {
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
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

const normalizePaymentStatus = (value: unknown): PaymentStatus | null => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  const allowed: PaymentStatus[] = [
    "unpaid",
    "paid",
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
    "shipped",
    "delivered",
    "cancelled",
  ];

  return allowed.includes(normalized) ? normalized : null;
};

const isStandardStatusTransitionAllowed = (
  currentStatus: string,
  nextStatus: string,
): boolean => {
  if (currentStatus === nextStatus) return true;

  const allowedTransitions: Record<string, string[]> = {
    approval_requested: ["processing", "cancelled"],
    pending: ["approval_requested", "processing", "cancelled"],
    processing: ["shipped", "delivered", "cancelled"],
    shipped: ["delivered", "cancelled"],
    delivered: [],
    cancelled: [],
  };

  return (allowedTransitions[currentStatus] || []).includes(nextStatus);
};

const isLikelyEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const readSalesRecipients = async (): Promise<string[]> => {
  const [rows] = await pool.query<SettingsRow[]>(
    "SELECT settings FROM site_settings WHERE id = 1 LIMIT 1",
  );

  const parsed = rows.length ? parseSettings(rows[0].settings) : {};

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
router.post("/", async (req: Request, res: Response) => {
  try {
    const { orderNumber, customerId, customerEmail, customerName, orderData } =
      req.body;

    if (!orderNumber || !customerEmail || !customerName || !orderData) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const orderId = uuidv4();
    const subtotal = Number(orderData.subtotal || 0);
    const taxAmount = Number(orderData.tax || 0);
    const shippingCost = Number(orderData.shipping || 0);
    const total = Number(orderData.total || 0);

    const requestedMethod = normalizeRequestedPaymentMethod(
      orderData?.paymentMethod,
    );
    const explicitPaymentStatus = normalizePaymentStatus(
      orderData?.paymentStatus,
    );
    const paymentStatus = explicitPaymentStatus || "unpaid";

    const normalizedOrderData = attachPaymentWorkflowToOrderData(
      { ...(orderData as Record<string, unknown>) },
      paymentStatus,
      requestedMethod,
      {
        collectedOnSite: false,
      },
    );

    // Insert order into database
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

    // Send order confirmation email
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
      Math.random() * 900 + 100,
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

      const normalizedRequestedPaymentMethod = normalizeRequestedPaymentMethod(
        requestedPaymentMethod || existingPayment.requestedMethod,
      );

      if (normalizedPaymentStatus === "paid" && !isSuperAdmin) {
        res.status(400).json({
          error:
            "Direct paid status updates are restricted. Use payment provider integration or super-admin override.",
        });
        return;
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
      const paymentMarkedPaid =
        normalizedPaymentStatus === "paid" ||
        normalizedPaymentStatus === "cash_on_pickup_paid";

      const resolvedStatus =
        normalizedStatus === "approval_requested" &&
        (shouldApproveWithoutPayment || paymentMarkedPaid)
          ? "processing"
          : normalizedStatus;

      const forceOverrideRequested = Boolean(forceStatusOverride);

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

      res.json({
        success: true,
        orderNumber,
        status: resolvedStatus,
        statusOverrideApplied,
        payment: updatedOrderData.payment,
        approval: updatedOrderData.approval,
        trackingNumber: nextTrackingNumber,
        shipper: nextShipper,
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

export default router;
