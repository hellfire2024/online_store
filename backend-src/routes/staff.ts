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
    console.log("[Staff API] POST request body:", req.body);
    const { id: clientId, name, role, imageUrl, image_url } = req.body;
    const finalImageUrl = imageUrl || image_url;

    if (!name || !role) {
      console.error("[Staff API] Validation failed: missing name or role");
      return res.status(400).json({ error: "name and role are required" });
    }

    // Use client-provided id if available, otherwise generate UUID
    const staffId =
      clientId ||
      `staff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log("[Staff API] Inserting staff:", {
      id: staffId,
      name,
      role,
      imageUrlLength: finalImageUrl?.length || 0,
      imageUrlPreview: finalImageUrl ? finalImageUrl.substring(0, 100) : "null",
    });

    const insertResult = await pool.query(
      `INSERT INTO staff (id, name, role, image_url, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [staffId, name, role, finalImageUrl || null],
    );
    console.log("[Staff API] Insert result:", insertResult[0]);

    // Verify the insert was successful by immediately reading it back
    const [verifyRows] = await pool.query<RowDataPacket[]>(
      "SELECT id, name, role, LENGTH(image_url) as imageUrlLength FROM staff WHERE id = ?",
      [staffId],
    );
    console.log(
      "[Staff API] Verification - Staff in database:",
      verifyRows && verifyRows.length > 0
        ? verifyRows[0]
        : "NOT FOUND - insert may have failed",
    );

    const responseData = { id: staffId, name, role, imageUrl: finalImageUrl };
    console.log("[Staff API] Staff created successfully:", responseData);
    return res.status(201).json(responseData);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : "";
    console.error("[Staff API] Error creating staff member:", errorMessage);
    if (errorStack) {
      console.error("[Staff API] Error stack:", errorStack);
    }
    return res.status(500).json({
      error: "Failed to create staff member",
      details: errorMessage,
    });
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
