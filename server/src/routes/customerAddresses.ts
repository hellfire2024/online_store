import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { pool } from "../db/connection.js";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { v4 as uuidv4 } from "uuid";
import { requireCustomer, AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

interface AddressRow extends RowDataPacket {
  id: string;
  customer_id: string;
  type: "shipping" | "billing";
  first_name: string;
  last_name: string;
  full_name: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  phone: string;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}

// GET all addresses for customer
router.get("/:customerId", async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;

    const [addresses] = await pool.query<AddressRow[]>(
      `SELECT id, type, first_name, last_name, full_name, street_address, city, state, zip_code, 
              country, phone, is_default FROM customer_addresses WHERE customer_id = ? ORDER BY created_at DESC`,
      [customerId],
    );

    const normalized = addresses.map((addr) => ({
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
      isDefault: addr.is_default,
    }));

    return res.json(normalized);
  } catch (error) {
    console.error("Error fetching addresses:", error);
    return res.status(500).json({ error: "Failed to fetch addresses" });
  }
});

// POST add new address
router.post(
  "/:customerId",
  requireCustomer,
  [
    body("type")
      .isIn(["shipping", "billing"])
      .withMessage("Invalid address type"),
    body("firstName").trim().notEmpty().withMessage("First name required"),
    body("lastName").trim().notEmpty().withMessage("Last name required"),
    body("streetAddress")
      .trim()
      .notEmpty()
      .withMessage("Street address required"),
    body("city").trim().notEmpty().withMessage("City required"),
    body("state").trim().notEmpty().withMessage("State required"),
    body("zipCode").trim().notEmpty().withMessage("ZIP code required"),
    body("country").trim().notEmpty().withMessage("Country required"),
    body("phone").optional().trim(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { customerId } = req.params;
      const authUser = (req as AuthenticatedRequest).authUser;

      // Verify customer can only add addresses for themselves
      if (authUser && authUser.id !== customerId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const {
        type,
        firstName,
        lastName,
        streetAddress,
        city,
        state,
        zipCode,
        country,
        phone,
        isDefault,
      } = req.body;

      const id = uuidv4();
      const fullName = `${firstName} ${lastName}`;

      // If setting as default, unset any other defaults of the same type
      if (isDefault) {
        await pool.query(
          `UPDATE customer_addresses SET is_default = FALSE WHERE customer_id = ? AND type = ?`,
          [customerId, type],
        );
      }

      await pool.query(
        `INSERT INTO customer_addresses 
         (id, customer_id, type, first_name, last_name, full_name, street_address, city, state, zip_code, country, phone, is_default)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          customerId,
          type,
          firstName,
          lastName,
          fullName,
          streetAddress,
          city,
          state,
          zipCode,
          country,
          phone || null,
          isDefault ? 1 : 0,
        ],
      );

      return res.status(201).json({
        id,
        type,
        firstName,
        lastName,
        fullName,
        streetAddress,
        city,
        state,
        zipCode,
        country,
        phone: phone || "",
        isDefault: !!isDefault,
      });
    } catch (error) {
      console.error("Error creating address:", error);
      return res.status(500).json({ error: "Failed to create address" });
    }
  },
);

// PUT update address
router.put(
  "/:customerId/:addressId",
  requireCustomer,
  [
    body("type")
      .isIn(["shipping", "billing"])
      .withMessage("Invalid address type"),
    body("firstName").trim().notEmpty().withMessage("First name required"),
    body("lastName").trim().notEmpty().withMessage("Last name required"),
    body("streetAddress")
      .trim()
      .notEmpty()
      .withMessage("Street address required"),
    body("city").trim().notEmpty().withMessage("City required"),
    body("state").trim().notEmpty().withMessage("State required"),
    body("zipCode").trim().notEmpty().withMessage("ZIP code required"),
    body("country").trim().notEmpty().withMessage("Country required"),
    body("phone").optional().trim(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { customerId, addressId } = req.params;
      const authUser = (req as AuthenticatedRequest).authUser;

      // Verify customer can only update their own addresses
      if (authUser && authUser.id !== customerId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const {
        type,
        firstName,
        lastName,
        streetAddress,
        city,
        state,
        zipCode,
        country,
        phone,
        isDefault,
      } = req.body;

      const fullName = `${firstName} ${lastName}`;

      // If setting as default, unset any other defaults of the same type
      if (isDefault) {
        await pool.query(
          `UPDATE customer_addresses SET is_default = FALSE WHERE customer_id = ? AND type = ? AND id != ?`,
          [customerId, type, addressId],
        );
      }

      const [result] = await pool.query<ResultSetHeader>(
        `UPDATE customer_addresses 
         SET type = ?, first_name = ?, last_name = ?, full_name = ?, street_address = ?, city = ?, state = ?, zip_code = ?, country = ?, phone = ?, is_default = ?
         WHERE id = ? AND customer_id = ?`,
        [
          type,
          firstName,
          lastName,
          fullName,
          streetAddress,
          city,
          state,
          zipCode,
          country,
          phone || null,
          isDefault ? 1 : 0,
          addressId,
          customerId,
        ],
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Address not found" });
      }

      return res.json({
        id: addressId,
        type,
        firstName,
        lastName,
        fullName,
        streetAddress,
        city,
        state,
        zipCode,
        country,
        phone: phone || "",
        isDefault: !!isDefault,
      });
    } catch (error) {
      console.error("Error updating address:", error);
      return res.status(500).json({ error: "Failed to update address" });
    }
  },
);

// DELETE address
router.delete(
  "/:customerId/:addressId",
  requireCustomer,
  async (req: Request, res: Response) => {
    try {
      const { customerId, addressId } = req.params;
      const authUser = (req as AuthenticatedRequest).authUser;

      // Verify customer can only delete their own addresses
      if (authUser && authUser.id !== customerId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const [result] = await pool.query<ResultSetHeader>(
        "DELETE FROM customer_addresses WHERE id = ? AND customer_id = ?",
        [addressId, customerId],
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Address not found" });
      }

      return res.status(204).send();
    } catch (error) {
      console.error("Error deleting address:", error);
      return res.status(500).json({ error: "Failed to delete address" });
    }
  },
);

export default router;
