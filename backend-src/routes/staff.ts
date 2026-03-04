import { Router, Request, Response } from "express";
import { pool } from "../db/connection.js";
import { RowDataPacket } from "mysql2";

const router = Router();

// Get all staff
router.get("/", async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, name, role, image_url as imageUrl, created_at as createdAt FROM staff ORDER BY created_at DESC",
    );
    return res.json(rows || []);
  } catch (error) {
    console.error("Error fetching staff:", error);
    return res.status(500).json({ error: "Failed to fetch staff" });
  }
});

// Get single staff member
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, name, role, image_url as imageUrl, created_at as createdAt FROM staff WHERE id = ?",
      [req.params.id],
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    return res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching staff member:", error);
    return res.status(500).json({ error: "Failed to fetch staff member" });
  }
});

// Create staff member
router.post("/", async (req: Request, res: Response) => {
  try {
    const { id, name, role, imageUrl, image_url } = req.body;
    const finalImageUrl = imageUrl || image_url;

    if (!id || !name || !role) {
      return res.status(400).json({ error: "id, name, and role are required" });
    }

    await pool.query(
      `INSERT INTO staff (id, name, role, image_url, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [id, name, role, finalImageUrl || null],
    );

    return res.status(201).json({ id, name, role, imageUrl: finalImageUrl });
  } catch (error) {
    console.error("Error creating staff member:", error);
    return res.status(500).json({ error: "Failed to create staff member" });
  }
});

// Update staff member
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { name, role, imageUrl, image_url } = req.body;
    const finalImageUrl = imageUrl || image_url;

    const [result] = await pool.query(
      `UPDATE staff SET name = ?, role = ?, image_url = ? WHERE id = ?`,
      [name, role, finalImageUrl || null, req.params.id],
    );

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    return res.json({ id: req.params.id, name, role, imageUrl: finalImageUrl });
  } catch (error) {
    console.error("Error updating staff member:", error);
    return res.status(500).json({ error: "Failed to update staff member" });
  }
});

// Delete staff member
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const [result] = await pool.query("DELETE FROM staff WHERE id = ?", [
      req.params.id,
    ]);

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting staff member:", error);
    return res.status(500).json({ error: "Failed to delete staff member" });
  }
});

export default router;
