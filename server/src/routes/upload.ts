import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

const router = Router();

// Ensure upload directories exist
const uploadsDir = path.join(process.cwd(), "public", "uploads");
const productsDir = path.join(uploadsDir, "products");
const pagesDir = path.join(uploadsDir, "pages");

[uploadsDir, productsDir, pagesDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, productsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${randomUUID()}${ext}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (jpeg, jpg, png, gif, webp) are allowed"));
    }
  },
});

// Upload single image
router.post("/image", upload.single("image"), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const type = (req.body?.type as string) || "products";
    const imageUrl = `/uploads/${type}/${req.file.filename}`;

    return res.json({
      success: true,
      imageUrl,
      filename: req.file.filename,
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    return res.status(500).json({ error: "Failed to upload image" });
  }
});

// Delete image
router.delete("/image", (req: Request, res: Response) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl || !imageUrl.startsWith("/uploads/")) {
      return res.status(400).json({ error: "Invalid image URL" });
    }

    const filePath = path.join(process.cwd(), "public", imageUrl);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return res.json({ success: true });
    } else {
      return res.status(404).json({ error: "Image not found" });
    }
  } catch (error) {
    console.error("Error deleting image:", error);
    return res.status(500).json({ error: "Failed to delete image" });
  }
});

export default router;
