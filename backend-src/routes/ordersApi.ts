import { Router, Request, Response } from "express";
import { pool } from "../db/connection.js";
import { RowDataPacket } from "mysql2";
import { v4 as uuidv4 } from "uuid";
import {
  sendOrderConfirmationEmail,
  sendShippingNotificationEmail,
  sendContactFormEmail,
} from "../services/emailService.js";
import { requireCustomer, AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

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

const readSalesEmail = async (): Promise<string | null> => {
  const [rows] = await pool.query<SettingsRow[]>(
    "SELECT settings FROM site_settings WHERE id = 1 LIMIT 1",
  );

  if (!rows.length) {
    return process.env.CONTACT_EMAIL || null;
  }

  const parsed = parseSettings(rows[0].settings);
  const supportEmail = String(parsed?.supportEmail || "").trim();
  const footerEmail = String(parsed?.footerConfig?.contactEmail || "").trim();

  return supportEmail || footerEmail || process.env.CONTACT_EMAIL || null;
};

// GET all orders (admin)
router.get("/", async (_req: Request, res: Response) => {
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
    const orderData = order.order_data ? JSON.parse(order.order_data) : null;

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
        JSON.stringify(orderData),
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
      orderData,
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

    const requestPayload = {
      ...orderData,
      requestType: "approval_request",
      unavailableServices: normalizedUnavailableServices,
      requestNotes: String(requestNotes || "").trim() || undefined,
      requestSubmittedAt: new Date().toISOString(),
    };

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

    try {
      const salesEmail = await readSalesEmail();
      if (salesEmail) {
        const emailResult = await sendContactFormEmail(
          salesEmail,
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

        emailSent = Boolean(emailResult.success);
        emailMessage = emailResult.message || emailMessage;
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
    });
  } catch (error) {
    console.error("Error creating assisted checkout request:", error);
    res
      .status(500)
      .json({ error: "Failed to submit assisted checkout request" });
  }
});

// PUT update order with shipping info
router.put("/:orderNumber/ship", async (req: Request, res: Response) => {
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
});

export default router;
