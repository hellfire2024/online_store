import { Router, Request, Response } from "express";
import { RowDataPacket } from "mysql2";
import { v4 as uuidv4 } from "uuid";
import { pool } from "../db/connection.js";
import {
  AuthenticatedRequest,
  requireAdmin,
  requireCustomer,
} from "../middleware/auth.js";

const router = Router();

interface QuoteLineItem {
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  productId?: string;
  imageUrl?: string;
  requiresPhotoUpload?: boolean;
}

interface QuoteRow extends RowDataPacket {
  id: string;
  customer_id: string;
  customer_email: string | null;
  customer_name: string | null;
  quote_number: string;
  status: string;
  notes: string | null;
  line_items: string;
  subtotal: number;
  tax_amount: number;
  shipping_cost: number;
  total: number;
  created_by: string | null;
  created_at: Date;
  sent_at: Date | null;
  accepted_at: Date | null;
}

const parseJsonSafely = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const mapQuote = (row: QuoteRow) => ({
  id: row.id,
  customerId: row.customer_id,
  customerEmail: row.customer_email || undefined,
  customerName: row.customer_name || undefined,
  quoteNumber: row.quote_number,
  status: row.status,
  notes: row.notes || undefined,
  lineItems: parseJsonSafely<QuoteLineItem[]>(row.line_items, []),
  subtotal: Number(row.subtotal || 0),
  taxAmount: Number(row.tax_amount || 0),
  shippingCost: Number(row.shipping_cost || 0),
  total: Number(row.total || 0),
  createdBy: row.created_by || undefined,
  createdAt: row.created_at,
  sentAt: row.sent_at || undefined,
  acceptedAt: row.accepted_at || undefined,
});

const normalizeLineItems = (lineItems: unknown): QuoteLineItem[] => {
  if (!Array.isArray(lineItems)) return [];

  return lineItems
    .map((item: any) => ({
      name: String(item?.name || "").trim(),
      description: item?.description
        ? String(item.description).trim()
        : undefined,
      quantity: Number(item?.quantity || 0),
      unitPrice: Number(item?.unitPrice || 0),
      productId: item?.productId ? String(item.productId) : undefined,
      imageUrl: item?.imageUrl ? String(item.imageUrl) : undefined,
      requiresPhotoUpload: Boolean(item?.requiresPhotoUpload),
    }))
    .filter(
      (item) =>
        item.name && Number.isFinite(item.quantity) && item.quantity > 0,
    )
    .map((item) => ({
      ...item,
      unitPrice:
        Number.isFinite(item.unitPrice) && item.unitPrice >= 0
          ? item.unitPrice
          : 0,
    }));
};

const buildQuoteNumber = () => {
  const stamp = Date.now().toString().slice(-10);
  const rand = Math.floor(Math.random() * 900 + 100);
  return `Q-${stamp}-${rand}`;
};

router.get(
  "/admin/customer/:customerId",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const [rows] = await pool.query<QuoteRow[]>(
        `SELECT * FROM custom_quotes
         WHERE customer_id = ?
         ORDER BY created_at DESC`,
        [customerId],
      );

      res.json((rows || []).map(mapQuote));
    } catch (error) {
      console.error("Error fetching admin customer quotes:", error);
      res.status(500).json({ error: "Failed to fetch customer quotes" });
    }
  },
);

router.post(
  "/customer/:customerId",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const { lineItems, notes, taxAmount, shippingCost } = req.body;
      const authUser = (req as AuthenticatedRequest).authUser;

      const normalizedLineItems = normalizeLineItems(lineItems);
      if (normalizedLineItems.length === 0) {
        res
          .status(400)
          .json({ error: "At least one valid line item is required" });
        return;
      }

      const [customerRows] = await pool.query<RowDataPacket[]>(
        `SELECT id, first_name, last_name, email FROM customers WHERE id = ? LIMIT 1`,
        [customerId],
      );

      if (!customerRows || customerRows.length === 0) {
        res.status(404).json({ error: "Customer not found" });
        return;
      }

      const customer = customerRows[0] as any;
      const customerName =
        `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
        undefined;
      const safeTax = Number.isFinite(Number(taxAmount))
        ? Number(taxAmount)
        : 0;
      const safeShipping = Number.isFinite(Number(shippingCost))
        ? Number(shippingCost)
        : 0;
      const subtotal = normalizedLineItems.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0,
      );
      const total = subtotal + safeTax + safeShipping;

      const quoteId = uuidv4();
      const quoteNumber = buildQuoteNumber();

      await pool.query(
        `INSERT INTO custom_quotes (
          id, customer_id, customer_email, customer_name, quote_number, status,
          notes, line_items, subtotal, tax_amount, shipping_cost, total, created_by, sent_at
        ) VALUES (?, ?, ?, ?, ?, 'sent', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          quoteId,
          customer.id,
          customer.email || null,
          customerName || null,
          quoteNumber,
          notes ? String(notes).trim() : null,
          JSON.stringify(normalizedLineItems),
          subtotal,
          safeTax,
          safeShipping,
          total,
          authUser?.id || null,
          new Date(),
        ],
      );

      const [rows] = await pool.query<QuoteRow[]>(
        `SELECT * FROM custom_quotes WHERE id = ? LIMIT 1`,
        [quoteId],
      );

      if (!rows || rows.length === 0) {
        res
          .status(500)
          .json({ error: "Quote created but could not be reloaded" });
        return;
      }

      res.status(201).json(mapQuote(rows[0]));
    } catch (error) {
      console.error("Error creating custom quote:", error);
      res.status(500).json({ error: "Failed to create custom quote" });
    }
  },
);

router.get(
  "/customer/:customerId",
  requireCustomer,
  async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const authUser = (req as AuthenticatedRequest).authUser;

      if (authUser && String(authUser.id) !== String(customerId)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const [rows] = await pool.query<QuoteRow[]>(
        `SELECT * FROM custom_quotes
         WHERE customer_id = ?
         ORDER BY created_at DESC`,
        [customerId],
      );

      res.json((rows || []).map(mapQuote));
    } catch (error) {
      console.error("Error fetching customer quotes:", error);
      res.status(500).json({ error: "Failed to fetch custom quotes" });
    }
  },
);

router.post(
  "/:quoteId/accept",
  requireCustomer,
  async (req: Request, res: Response) => {
    try {
      const { quoteId } = req.params;
      const authUser = (req as AuthenticatedRequest).authUser;

      const [rows] = await pool.query<QuoteRow[]>(
        `SELECT * FROM custom_quotes WHERE id = ? LIMIT 1`,
        [quoteId],
      );

      if (!rows || rows.length === 0) {
        res.status(404).json({ error: "Quote not found" });
        return;
      }

      const quote = rows[0];
      if (authUser && String(authUser.id) !== String(quote.customer_id)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      if (quote.status !== "accepted") {
        await pool.query(
          `UPDATE custom_quotes
         SET status = 'accepted', accepted_at = NOW()
         WHERE id = ?`,
          [quoteId],
        );
      }

      const [updatedRows] = await pool.query<QuoteRow[]>(
        `SELECT * FROM custom_quotes WHERE id = ? LIMIT 1`,
        [quoteId],
      );

      res.json(mapQuote(updatedRows[0]));
    } catch (error) {
      console.error("Error accepting quote:", error);
      res.status(500).json({ error: "Failed to accept quote" });
    }
  },
);

export default router;
