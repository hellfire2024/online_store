import { Router, Request, Response } from "express";
import { pool } from "../db/connection.js";
import { RowDataPacket } from "mysql2";
import { randomUUID } from "crypto";

const router = Router();

// Get all galleries
router.get("/", async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM galleries ORDER BY name",
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch galleries" });
  }
});

// Get gallery images
router.get("/:id/images", async (req: Request, res: Response) => {
  try {
    const galleryId = req.params.id;
    console.log(`[Gallery GET] Fetching images for gallery: ${galleryId}`);
    
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, name, image_url as imageUrl FROM gallery_images WHERE gallery_id = ?",
      [galleryId],
    );
    
    console.log(
      `[Gallery GET] Gallery ${galleryId}: found ${rows.length} images in database`,
    );
    
    if (rows.length > 0) {
      console.log(
        `[Gallery GET] Image details:`,
        rows.map((row: any) => ({ id: row.id, name: row.name, urlLength: row.imageUrl?.length || 0 })),
      );
    }
    
    return res.json(rows);
  } catch (error) {
    console.error("[Gallery GET] Failed to fetch images:", error);
    return res.status(500).json({ error: "Failed to fetch images" });
  }
});

// Create gallery
router.post("/", async (req: Request, res: Response) => {
  try {
    const id = randomUUID();
    await pool.query("INSERT INTO galleries (id, name) VALUES (?, ?)", [
      id,
      req.body.name,
    ]);
    return res.status(201).json({ id, name: req.body.name });
  } catch (error) {
    return res.status(500).json({ error: "Failed to create gallery" });
  }
});

// Add image to gallery
router.post("/:id/images", async (req: Request, res: Response) => {
  try {
    const galleryId = req.params.id;
    const imageId = randomUUID();
    const imageName = req.body.name || "untitled";
    const imageUrl = req.body.imageUrl;
    
    console.log(`[Gallery POST] Attempting to insert image into gallery ${galleryId}`);
    console.log(`[Gallery POST] Image details: id=${imageId}, name=${imageName}, urlLength=${imageUrl?.length || 0}`);
    
    if (!imageUrl) {
      console.error("[Gallery POST] ERROR: No imageUrl provided");
      return res.status(400).json({ error: "imageUrl is required" });
    }
    
    const result = await pool.query(
      "INSERT INTO gallery_images (id, gallery_id, name, image_url) VALUES (?, ?, ?, ?)",
      [imageId, galleryId, imageName, imageUrl],
    );
    
    console.log(`[Gallery POST] Image inserted successfully: ${imageId}`);
    console.log(`[Gallery POST] Database result:`, result);
    
    return res
      .status(201)
      .json({ id: imageId, name: imageName, imageUrl: imageUrl });
  } catch (error) {
    console.error("[Gallery POST] Failed to add image:", error);
    if (error instanceof Error) {
      console.error("[Gallery POST] Error details:", error.message, error.stack);
    }
    return res.status(500).json({ error: "Failed to add image" });
  }
});

// Delete gallery
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await pool.query("DELETE FROM galleries WHERE id = ?", [req.params.id]);
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete gallery" });
  }
});

// Delete image
router.delete(
  "/:galleryId/images/:imageId",
  async (req: Request, res: Response) => {
    try {
      await pool.query("DELETE FROM gallery_images WHERE id = ?", [
        req.params.imageId,
      ]);
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ error: "Failed to delete image" });
    }
  },
);

// Update image
router.put(
  "/:galleryId/images/:imageId",
  async (req: Request, res: Response) => {
    try {
      const updates: string[] = [];
      const values: any[] = [];

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

      await pool.query(
        `UPDATE gallery_images SET ${updates.join(", ")} WHERE id = ?`,
        values,
      );

      return res.json({
        id: req.params.imageId,
        name: req.body.name,
        imageUrl: req.body.imageUrl,
      });
    } catch (error) {
      return res.status(500).json({ error: "Failed to update image" });
    }
  },
);

export default router;
