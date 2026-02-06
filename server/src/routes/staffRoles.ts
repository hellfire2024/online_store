import { Router, Request, Response } from "express";
import { pool } from "../db/connection.js";
import { RowDataPacket } from "mysql2";

const router = Router();

// Get all staff roles
router.get("/", async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM staff_roles ORDER BY created_at DESC",
    );

    if (!rows || rows.length === 0) {
      // Return default roles if table is empty
      return res.json([
        {
          key: "manager",
          label: "Manager",
          description: "Manages staff and operations",
        },
        {
          key: "designer",
          label: "Designer",
          description: "Creates and designs content",
        },
        { key: "sales", label: "Sales", description: "Handles customer sales" },
        {
          key: "support",
          label: "Support",
          description: "Customer support team",
        },
        {
          key: "content_creator",
          label: "Content Creator",
          description: "Creates marketing content",
        },
        {
          key: "accountant",
          label: "Accountant",
          description: "Manages financial records",
        },
      ]);
    }

    return res.json(rows);
  } catch (error) {
    console.error("Error fetching staff roles:", error);
    return res.status(500).json({ error: "Failed to fetch staff roles" });
  }
});

// Create staff role
router.post("/", async (req: Request, res: Response) => {
  try {
    const { key, label, description } = req.body;

    if (!key || !label) {
      return res.status(400).json({ error: "key and label are required" });
    }

    await pool.query(
      `INSERT INTO staff_roles (key, label, description, created_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE label = VALUES(label), description = VALUES(description)`,
      [key, label, description || null],
    );

    return res.status(201).json({ key, label, description });
  } catch (error) {
    console.error("Error creating staff role:", error);
    return res.status(500).json({ error: "Failed to create staff role" });
  }
});

// Update staff role
router.put("/:key", async (req: Request, res: Response) => {
  try {
    const { label, description } = req.body;

    const [result] = await pool.query(
      `UPDATE staff_roles SET label = ?, description = ? WHERE key = ?`,
      [label, description || null, req.params.key],
    );

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: "Staff role not found" });
    }

    return res.json({ key: req.params.key, label, description });
  } catch (error) {
    console.error("Error updating staff role:", error);
    return res.status(500).json({ error: "Failed to update staff role" });
  }
});

export default router;
