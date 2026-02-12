import { Router } from "express";
import { pool } from "../db/connection.js";
import { randomUUID } from "crypto";
const router = Router();
// Get all services
router.get("/", async (_req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM services ORDER BY created_at DESC");
        return res.json(rows || []);
    }
    catch (error) {
        console.error("Error fetching services:", error);
        return res.status(500).json({ error: "Failed to fetch services" });
    }
});
// Get single service
router.get("/:id", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM services WHERE id = ?", [req.params.id]);
        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: "Service not found" });
        }
        return res.json(rows[0]);
    }
    catch (error) {
        console.error("Error fetching service:", error);
        return res.status(500).json({ error: "Failed to fetch service" });
    }
});
// Create service
router.post("/", async (req, res) => {
    try {
        const { title, description, icon } = req.body;
        const id = randomUUID();
        if (!title) {
            return res.status(400).json({ error: "title is required" });
        }
        await pool.query(`INSERT INTO services (id, title, description, icon, created_at)
       VALUES (?, ?, ?, ?, NOW())`, [id, title, description || "", icon || "service"]);
        return res.status(201).json({ id, title, description, icon });
    }
    catch (error) {
        console.error("Error creating service:", error);
        return res.status(500).json({ error: "Failed to create service" });
    }
});
// Update service
router.put("/:id", async (req, res) => {
    try {
        const { title, description, icon } = req.body;
        const [result] = await pool.query(`UPDATE services SET title = ?, description = ?, icon = ? WHERE id = ?`, [title, description || "", icon || "", req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Service not found" });
        }
        return res.json({ id: req.params.id, title, description, icon });
    }
    catch (error) {
        console.error("Error updating service:", error);
        return res.status(500).json({ error: "Failed to update service" });
    }
});
// Delete service
router.delete("/:id", async (req, res) => {
    try {
        const [result] = await pool.query("DELETE FROM services WHERE id = ?", [
            req.params.id,
        ]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Service not found" });
        }
        return res.status(204).send();
    }
    catch (error) {
        console.error("Error deleting service:", error);
        return res.status(500).json({ error: "Failed to delete service" });
    }
});
export default router;
//# sourceMappingURL=services.js.map