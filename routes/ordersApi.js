import { Router } from "express";
import { pool } from "../db/connection.js";
import { v4 as uuidv4 } from "uuid";
import { sendOrderConfirmationEmail, sendShippingNotificationEmail, } from "../services/emailService.js";
import { requireCustomer } from "../middleware/auth.js";
const router = Router();
// GET all orders (admin)
router.get("/", async (_req, res) => {
    try {
        const [rows] = await pool.query(`SELECT * FROM orders ORDER BY created_at DESC LIMIT 100`);
        // Always return an array, even if empty
        res.json(Array.isArray(rows) ? rows : []);
    }
    catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ error: "Failed to fetch orders" });
    }
});
// GET orders for a specific customer
router.get("/customer/:customerId", requireCustomer, async (req, res) => {
    try {
        const { customerId } = req.params;
        const authUser = req.authUser;
        const normalizedCustomerId = String(customerId || "").trim();
        // Security: only allow customers to see their own orders
        if (authUser && String(authUser.id) !== normalizedCustomerId) {
            res.status(403).json({ error: "Forbidden" });
            return;
        }
        let rows = [];
        if (authUser === null || authUser === void 0 ? void 0 : authUser.email) {
            const [emailAwareRows] = await pool.query(`SELECT * FROM orders
           WHERE customer_id = ?
              OR LOWER(customer_email) = LOWER(?)
           ORDER BY created_at DESC
           LIMIT 100`, [normalizedCustomerId, authUser.email]);
            rows = Array.isArray(emailAwareRows) ? emailAwareRows : [];
        }
        else {
            const [idOnlyRows] = await pool.query(`SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 100`, [normalizedCustomerId]);
            rows = Array.isArray(idOnlyRows) ? idOnlyRows : [];
        }
        res.json(Array.isArray(rows) ? rows : []);
    }
    catch (error) {
        console.error("Error fetching customer orders:", error);
        res.status(500).json({ error: "Failed to fetch customer orders" });
    }
});
// GET single order
router.get("/:orderNumber", async (req, res) => {
    try {
        const { orderNumber } = req.params;
        const [rows] = await pool.query("SELECT * FROM orders WHERE order_number = ?", [orderNumber]);
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
    }
    catch (error) {
        console.error("Error fetching order:", error);
        res.status(500).json({ error: "Failed to fetch order" });
    }
});
// POST create order and send confirmation email
router.post("/", async (req, res) => {
    try {
        const { orderNumber, customerId, customerEmail, customerName, orderData } = req.body;
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
        await pool.query(`INSERT INTO orders (
        id, customer_id, customer_email, customer_name, order_number, order_data,
        subtotal, tax_amount, shipping_cost, total, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`, [
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
        ]);
        // Send order confirmation email
        const emailResult = await sendOrderConfirmationEmail(customerEmail, customerName, orderNumber, orderData);
        res.status(201).json({
            success: true,
            message: "Order created successfully",
            orderNumber,
            emailSent: emailResult.success,
        });
    }
    catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ error: "Failed to create order" });
    }
});
// PUT update order with shipping info
router.put("/:orderNumber/ship", async (req, res) => {
    try {
        const { orderNumber } = req.params;
        const { trackingNumber, shipper, shippingUrl } = req.body;
        if (!trackingNumber || !shipper) {
            res.status(400).json({ error: "Missing tracking number or shipper" });
            return;
        }
        // Get order details
        const [rows] = await pool.query("SELECT * FROM orders WHERE order_number = ?", [orderNumber]);
        if (rows.length === 0) {
            res.status(404).json({ error: "Order not found" });
            return;
        }
        const order = rows[0];
        // Update order with shipping info
        await pool.query(`UPDATE orders SET status = 'shipped', tracking_number = ?, shipper = ?, updated_at = NOW()
       WHERE order_number = ?`, [trackingNumber, shipper, orderNumber]);
        // Send shipping notification email
        let emailResult = {
            success: false,
            message: "Customer email not available",
        };
        if (order.customer_email && order.customer_name) {
            emailResult = await sendShippingNotificationEmail(order.customer_email, order.customer_name, orderNumber, trackingNumber, shipper, shippingUrl);
        }
        res.json({
            success: true,
            message: "Order updated with shipping info",
            emailSent: emailResult.success,
        });
    }
    catch (error) {
        console.error("Error updating order:", error);
        res.status(500).json({ error: "Failed to update order" });
    }
});
export default router;
//# sourceMappingURL=ordersApi.js.map