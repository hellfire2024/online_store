import { Router, Request, Response } from "express";
import { pool } from "../db/connection.js";
import { RowDataPacket } from "mysql2";
import { randomUUID } from "crypto";

const router = Router();

interface ServiceColumns {
  hasTitle: boolean;
  hasName: boolean;
  hasIcon: boolean;
  hasPrice: boolean;
}

const getServiceColumns = async (): Promise<ServiceColumns> => {
  const [columnRows] = await pool.query<RowDataPacket[]>(
    "SHOW COLUMNS FROM services",
  );
  const columnNames = new Set(columnRows.map((row) => String(row.Field)));

  return {
    hasTitle: columnNames.has("title"),
    hasName: columnNames.has("name"),
    hasIcon: columnNames.has("icon"),
    hasPrice: columnNames.has("price"),
  };
};

const normalizeServiceResponse = (row: any) => ({
  id: row.id,
  title: row.title ?? row.name ?? "",
  description: row.description ?? "",
  icon: row.icon ?? "service",
});

// Get all services
router.get("/", async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM services ORDER BY created_at DESC",
    );

    const normalizedRows = (rows || []).map(normalizeServiceResponse);
    return res.json(normalizedRows);
  } catch (error) {
    console.error("Error fetching services:", error);
    return res.status(500).json({ error: "Failed to fetch services" });
  }
});

// Get single service
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM services WHERE id = ?",
      [req.params.id],
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "Service not found" });
    }

    return res.json(normalizeServiceResponse(rows[0]));
  } catch (error) {
    console.error("Error fetching service:", error);
    return res.status(500).json({ error: "Failed to fetch service" });
  }
});

// Create service
router.post("/", async (req: Request, res: Response) => {
  try {
    const { title, description, icon } = req.body;
    const id = randomUUID();

    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: "title is required" });
    }

    const columns = await getServiceColumns();

    if (columns.hasTitle && columns.hasIcon) {
      await pool.query(
        `INSERT INTO services (id, title, description, icon, created_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [id, title, description || "", icon || "service"],
      );
    } else if (columns.hasTitle) {
      await pool.query(
        `INSERT INTO services (id, title, description, created_at)
         VALUES (?, ?, ?, NOW())`,
        [id, title, description || ""],
      );
    } else if (columns.hasName) {
      await pool.query(
        `INSERT INTO services (id, name, description, price, created_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [id, title, description || "", columns.hasPrice ? 0 : null],
      );
    } else {
      return res.status(500).json({ error: "Unsupported services schema" });
    }

    return res.status(201).json({
      id,
      title: String(title),
      description: description || "",
      icon: icon || "service",
    });
  } catch (error) {
    console.error("Error creating service:", error);
    return res.status(500).json({ error: "Failed to create service" });
  }
});

// Update service
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { title, description, icon } = req.body;
    const columns = await getServiceColumns();

    let result: any;

    if (columns.hasTitle && columns.hasIcon) {
      const [updateResult] = await pool.query(
        `UPDATE services SET title = ?, description = ?, icon = ? WHERE id = ?`,
        [title, description || "", icon || "service", req.params.id],
      );
      result = updateResult;
    } else if (columns.hasTitle) {
      const [updateResult] = await pool.query(
        `UPDATE services SET title = ?, description = ? WHERE id = ?`,
        [title, description || "", req.params.id],
      );
      result = updateResult;
    } else if (columns.hasName) {
      const [updateResult] = await pool.query(
        `UPDATE services SET name = ?, description = ? WHERE id = ?`,
        [title, description || "", req.params.id],
      );
      result = updateResult;
    } else {
      return res.status(500).json({ error: "Unsupported services schema" });
    }

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: "Service not found" });
    }

    return res.json({
      id: req.params.id,
      title: title || "",
      description: description || "",
      icon: icon || "service",
    });
  } catch (error) {
    console.error("Error updating service:", error);
    return res.status(500).json({ error: "Failed to update service" });
  }
});

// Delete service
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const [result] = await pool.query("DELETE FROM services WHERE id = ?", [
      req.params.id,
    ]);

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: "Service not found" });
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting service:", error);
    return res.status(500).json({ error: "Failed to delete service" });
  }
});

export default router;
