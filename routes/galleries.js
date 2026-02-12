import { Router } from "express";
import { pool } from "../db/connection.js";
import { randomUUID } from "crypto";
const router = Router();
// Get all galleries
router.get("/", async (_req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM galleries ORDER BY name");
        return res.json(rows);
    }
    catch (error) {
        return res.status(500).json({ error: "Failed to fetch galleries" });
    }
});
// Get gallery images
router.get("/:id/images", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT id, name, image_url as imageUrl FROM gallery_images WHERE gallery_id = ?", [req.params.id]);
        return res.json(rows);
    }
    catch (error) {
        return res.status(500).json({ error: "Failed to fetch images" });
    }
});
// Create gallery
router.post("/", async (req, res) => {
    try {
        const id = randomUUID();
        await pool.query("INSERT INTO galleries (id, name) VALUES (?, ?)", [
            id,
            req.body.name,
        ]);
        return res.status(201).json({ id, name: req.body.name });
    }
    catch (error) {
        return res.status(500).json({ error: "Failed to create gallery" });
    }
});
// Add image to gallery
router.post("/:id/images", async (req, res) => {
    try {
        const id = randomUUID();
        await pool.query("INSERT INTO gallery_images (id, gallery_id, name, image_url) VALUES (?, ?, ?, ?)", [id, req.params.id, req.body.name, req.body.imageUrl]);
        return res
            .status(201)
            .json({ id, name: req.body.name, imageUrl: req.body.imageUrl });
    }
    catch (error) {
        return res.status(500).json({ error: "Failed to add image" });
    }
});
// Delete gallery
router.delete("/:id", async (req, res) => {
    try {
        await pool.query("DELETE FROM galleries WHERE id = ?", [req.params.id]);
        return res.status(204).send();
    }
    catch (error) {
        return res.status(500).json({ error: "Failed to delete gallery" });
    }
});
// Delete image
router.delete("/:galleryId/images/:imageId", async (req, res) => {
    try {
        await pool.query("DELETE FROM gallery_images WHERE id = ?", [
            req.params.imageId,
        ]);
        return res.status(204).send();
    }
    catch (error) {
        return res.status(500).json({ error: "Failed to delete image" });
    }
});
// Update image
router.put("/:galleryId/images/:imageId", async (req, res) => {
    try {
        const updates = [];
        const values = [];
        if (req.body.name !== undefined) {
            updates.push("name = ?");
            values.push(req.body.name);
        }
        if (req.body.imageUrl !== undefined) {
            updates.push("image_url = ?");
            values.push(req.body.imageUrl);
        }
        if (updates.length === 0) {
            return res.status(400).json({ error: "No fields to update" });
        }
        values.push(req.params.imageId);
        await pool.query(`UPDATE gallery_images SET ${updates.join(", ")} WHERE id = ?`, values);
        return res.json({
            id: req.params.imageId,
            name: req.body.name,
            imageUrl: req.body.imageUrl,
        });
    }
    catch (error) {
        return res.status(500).json({ error: "Failed to update image" });
    }
});
export default router;
//# sourceMappingURL=galleries.js.map