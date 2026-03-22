import { Router, Request, Response } from "express";
import multer from "multer";
import sharp from "sharp";

const router = Router();

// Use memory storage instead of disk storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (jpeg, jpg, png, gif, webp) are allowed"));
    }
  },
});

// Upload single image - returns base64 data URL
router.post(
  "/image",
  upload.single("image"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const target = String(req.body?.target || "generic").toLowerCase();
      const sizing =
        target === "background"
          ? { width: 2560, height: 1440, quality: 86 }
          : target === "gallery"
            ? { width: 2048, height: 2048, quality: 84 }
            : { width: 1600, height: 1600, quality: 82 };

      const processedBuffer = await sharp(req.file.buffer)
        .rotate() // auto-apply EXIF orientation
        .resize({
          width: sizing.width,
          height: sizing.height,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: sizing.quality })
        .toBuffer();

      // Convert processed buffer to base64
      const base64 = processedBuffer.toString("base64");
      const mimeType = "image/webp";
      const imageUrl = `data:${mimeType};base64,${base64}`;

      return res.json({
        success: true,
        imageUrl,
        filename: req.file.originalname,
        target,
        originalSize: req.file.size,
        processedSize: processedBuffer.length,
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      return res.status(500).json({ error: "Failed to upload image" });
    }
  },
);

// Delete image - no-op for database storage
router.delete("/image", (_req: Request, res: Response) => {
  try {
    return res.json({ success: true });
  } catch (error) {
    console.error("Error deleting image:", error);
    return res.status(500).json({ error: "Failed to delete image" });
  }
});

export default router;
