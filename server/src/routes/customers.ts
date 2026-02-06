import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { pool } from "../db/connection.js";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";

const router = Router();

// Get all customers
router.get("/", async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT c.id, c.first_name as firstName, c.last_name as lastName, c.name, c.email, c.phone, c.is_active as isActive,
              c.created_at as createdAt, c.last_login as lastLogin,
              COUNT(DISTINCT o.id) as orderCount,
              COALESCE(SUM(o.total), 0) as totalSpent,
              CASE WHEN COUNT(DISTINCT o.id) > 0 THEN COALESCE(SUM(o.total), 0) / COUNT(DISTINCT o.id) ELSE 0 END as averageOrderValue,
              MAX(o.created_at) as lastOrderDate
       FROM customers c
       LEFT JOIN orders o ON c.id = o.customer_id
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
    );
    return res.json(rows);
  } catch (error) {
    console.error("Error fetching customers:", error);
    return res.status(500).json({ error: "Failed to fetch customers" });
  }
});

// Get single customer with orders
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const [customerRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, first_name as firstName, last_name as lastName, name, email, phone, email_preferences as emailPreferences,
              is_active as isActive, created_at as createdAt, last_login as lastLogin
       FROM customers WHERE id = ?`,
      [req.params.id],
    );

    if (customerRows.length === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const customer = customerRows[0];
    customer.emailPreferences = JSON.parse(customer.emailPreferences || "{}");

    // Get customer's addresses
    const [addresses] = await pool.query<RowDataPacket[]>(
      `SELECT id, type, first_name, last_name, full_name, street_address, city, state, zip_code, 
              country, phone, is_default FROM customer_addresses WHERE customer_id = ?`,
      [req.params.id],
    );

    // Normalize address fields to camelCase
    customer.addresses = addresses.map((addr: any) => ({
      id: addr.id,
      type: addr.type,
      firstName: addr.first_name,
      lastName: addr.last_name,
      fullName: addr.full_name,
      streetAddress: addr.street_address,
      city: addr.city,
      state: addr.state,
      zipCode: addr.zip_code,
      country: addr.country,
      phone: addr.phone,
      isDefault: !!addr.is_default,
    }));

    // Get customer's orders
    const [orders] = await pool.query<RowDataPacket[]>(
      `SELECT id, order_number as orderNumber, total, status, created_at as date, 
              subtotal, shipping_cost as shippingCost, tax_amount as taxAmount, 
              tracking_number as trackingNumber, order_data as orderData
       FROM orders WHERE customer_id = ? ORDER BY created_at DESC`,
      [req.params.id],
    );

    // Parse order_data for each order to extract items
    customer.orders = orders.map((order: any) => {
      let orderData = null;
      try {
        orderData = order.orderData ? JSON.parse(order.orderData) : null;
      } catch (parseError) {
        console.error(
          "Failed to parse order_data for order",
          order.id,
          parseError,
        );
      }
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.status,
        date: order.date,
        subtotal: order.subtotal,
        shippingCost: order.shippingCost,
        taxAmount: order.taxAmount,
        trackingNumber: order.trackingNumber,
        items: orderData?.items || [],
        orderData,
      };
    });

    return res.json(customer);
  } catch (error) {
    console.error("Error fetching customer:", error);
    return res.status(500).json({ error: "Failed to fetch customer" });
  }
});

// Register customer (customer-facing endpoint)
router.post(
  "/register",
  [
    body("firstName").trim().notEmpty().withMessage("First name is required"),
    body("lastName").trim().notEmpty().withMessage("Last name is required"),
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
    body("phone").optional().trim(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { firstName, lastName, email, password, phone } = req.body;

      // Check if email exists
      const [existing] = await pool.query<RowDataPacket[]>(
        "SELECT id FROM customers WHERE email = ?",
        [email],
      );

      if (existing.length > 0) {
        return res.status(400).json({ error: "Email already in use" });
      }

      const id = uuidv4();
      const fullName = `${firstName} ${lastName}`;
      const hashedPassword = await bcrypt.hash(password, 10);

      await pool.query(
        `INSERT INTO customers (id, first_name, last_name, name, email, phone, password_hash, email_preferences, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
        [
          id,
          firstName,
          lastName,
          fullName,
          email,
          phone || null,
          hashedPassword,
          JSON.stringify({
            marketing: true,
            orderUpdates: true,
            announcements: true,
          }),
        ],
      );

      return res.status(201).json({
        id,
        firstName,
        lastName,
        name: fullName,
        email,
        phone: phone || null,
        isActive: true,
        orderCount: 0,
        totalSpent: 0,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error registering customer:", error);
      return res.status(500).json({ error: "Failed to register customer" });
    }
  },
);

// Create customer (admin - without password requirement for admin-created accounts)
router.post(
  "/",
  [
    body("firstName").optional().trim(),
    body("lastName").optional().trim(),
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().normalizeEmail(),
    body("phone").optional().trim(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { firstName, lastName, name, email, phone } = req.body;

      // Check if email exists
      const [existing] = await pool.query<RowDataPacket[]>(
        "SELECT id FROM customers WHERE email = ?",
        [email],
      );

      if (existing.length > 0) {
        return res.status(400).json({ error: "Email already in use" });
      }

      const id = uuidv4();

      await pool.query(
        `INSERT INTO customers (id, first_name, last_name, name, email, phone, password_hash, email_preferences, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
        [
          id,
          firstName || null,
          lastName || null,
          name,
          email,
          phone || null,
          "", // Empty password for admin-created users
          JSON.stringify({
            marketing: false,
            orderUpdates: true,
            announcements: false,
          }),
        ],
      );

      return res.status(201).json({
        id,
        firstName: firstName || null,
        lastName: lastName || null,
        name,
        email,
        phone: phone || null,
        isActive: true,
        orderCount: 0,
        totalSpent: 0,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error creating customer:", error);
      return res.status(500).json({ error: "Failed to create customer" });
    }
  },
);

// Update customer
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const {
      firstName,
      lastName,
      name,
      email,
      phone,
      isActive,
      emailPreferences,
    } = req.body;

    const updates: string[] = [];
    const values: any[] = [];

    if (firstName !== undefined) {
      updates.push("first_name = ?");
      values.push(firstName || null);
    }
    if (lastName !== undefined) {
      updates.push("last_name = ?");
      values.push(lastName || null);
    }
    if (name !== undefined) {
      updates.push("name = ?");
      values.push(name);
    }
    if (email !== undefined) {
      updates.push("email = ?");
      values.push(email);
    }
    if (phone !== undefined) {
      updates.push("phone = ?");
      values.push(phone || null);
    }
    if (isActive !== undefined) {
      updates.push("is_active = ?");
      values.push(isActive);
    }
    if (emailPreferences !== undefined) {
      updates.push("email_preferences = ?");
      values.push(JSON.stringify(emailPreferences));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(req.params.id);

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE customers SET ${updates.join(", ")} WHERE id = ?`,
      values,
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }

    // Return updated customer
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, first_name as firstName, last_name as lastName, name, email, phone, is_active as isActive FROM customers WHERE id = ?`,
      [req.params.id],
    );

    return res.json(rows[0]);
  } catch (error) {
    console.error("Error updating customer:", error);
    return res.status(500).json({ error: "Failed to update customer" });
  }
});

// Delete customer
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const [result] = await pool.query<ResultSetHeader>(
      "DELETE FROM customers WHERE id = ?",
      [req.params.id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting customer:", error);
    return res.status(500).json({ error: "Failed to delete customer" });
  }
});

// Toggle customer active status
router.patch("/:id/toggle-active", async (req: Request, res: Response) => {
  try {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE customers SET is_active = !is_active WHERE id = ?`,
      [req.params.id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, is_active as isActive FROM customers WHERE id = ?",
      [req.params.id],
    );

    return res.json(rows[0]);
  } catch (error) {
    console.error("Error toggling customer status:", error);
    return res.status(500).json({ error: "Failed to toggle customer status" });
  }
});

export default router;
