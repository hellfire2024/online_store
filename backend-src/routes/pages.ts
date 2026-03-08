import { Router, Request, Response } from "express";
import { pool } from "../db/connection.js";
import { RowDataPacket } from "mysql2";

const router = Router();

// Helper function to sanitize content data
// Base64 images are allowed and stored in the database
function sanitizeContentData(contentData: any): any {
  return contentData;
}

function parseContentDataSafely(contentData: any, pageId?: string): any {
  if (contentData == null) {
    return {};
  }

  if (typeof contentData !== "string") {
    return contentData;
  }

  try {
    return JSON.parse(contentData);
  } catch (error) {
    console.warn("Invalid content_data JSON for page:", pageId, error);
    return {};
  }
}

// Cache for available columns in pages table
let availableColumnsCache: Set<string> | null = null;

async function getAvailableColumns(): Promise<Set<string>> {
  if (availableColumnsCache !== null) {
    return availableColumnsCache;
  }

  try {
    const [rows] = await pool.query<RowDataPacket[]>("SHOW COLUMNS FROM pages");
    availableColumnsCache = new Set(
      (rows || []).map((row: any) => row.Field.toLowerCase()),
    );
    console.log("Available pages columns:", Array.from(availableColumnsCache));
  } catch (error) {
    console.warn(
      "Failed to detect pages table columns; assuming minimal schema",
      error,
    );
    availableColumnsCache = new Set([
      "id",
      "title",
      "content",
      "content_data",
      "created_at",
      "updated_at",
    ]);
  }

  return availableColumnsCache;
}

function inferPath(pageType?: string, pageId?: string): string {
  if (pageType === "home") return "/";
  if (pageType === "about") return "/about";
  if (pageType === "contact") return "/contact";
  if (pageId) return `/${pageId}`;
  return "/";
}

function inferPageTypeFromRow(row: any, cols: Set<string>): string {
  if (cols.has("page_type") && row.page_type) {
    return row.page_type;
  }

  const id = String(row.id || "").toLowerCase();
  const path = String(row.path || "").toLowerCase();
  const slug = String(row.slug || "").toLowerCase();
  const title = String(row.title || "").toLowerCase();

  const identity = [id, path, slug, title].join("|");

  if (
    identity.includes("home-page") ||
    identity.includes("/home") ||
    path === "/" ||
    title === "home"
  ) {
    return "home";
  }

  if (
    identity.includes("about-us-page") ||
    identity.includes("about") ||
    path === "/about"
  ) {
    return "about";
  }

  if (
    identity.includes("contact-page") ||
    identity.includes("contact") ||
    path === "/contact"
  ) {
    return "contact";
  }

  return "page";
}

// Convert JavaScript Date to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
function toMySQLDateTime(date: Date): string {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

// Generate a slug from title or id
function generateSlug(title?: string, id?: string): string {
  const text = title || id || "page";
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 255);
}

// Get all pages
router.get("/", async (_req: Request, res: Response) => {
  try {
    const cols = await getAvailableColumns();
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM pages ORDER BY created_at DESC",
    );

    // Transform snake_case to camelCase for API response
    const transformedRows = (rows || []).map((row: any) => {
      const inferredPageType = inferPageTypeFromRow(row, cols);

      return {
        id: row.id,
        title: row.title || "",
        path: cols.has("path") ? row.path : inferPath(inferredPageType, row.id),
        pageType: inferredPageType,
        content: row.content || "",
        contentData: parseContentDataSafely(row.content_data, row.id),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });

    return res.json(transformedRows);
  } catch (error) {
    console.error("Error fetching pages:", error);
    return res.status(500).json({ error: "Failed to fetch pages" });
  }
});

// Get single page
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const cols = await getAvailableColumns();
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM pages WHERE id = ?",
      [req.params.id],
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "Page not found" });
    }

    const row = rows[0];
    // Transform snake_case to camelCase for API response
    const inferredPageType = inferPageTypeFromRow(row, cols);
    const page = {
      id: row.id,
      title: row.title || "",
      path: cols.has("path")
        ? row.path
        : inferPath(inferredPageType, row.id),
      pageType: inferredPageType,
      content: row.content || "",
      contentData: parseContentDataSafely(row.content_data, row.id),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return res.json(page);
  } catch (error) {
    console.error("Error fetching page:", error);
    return res.status(500).json({ error: "Failed to fetch page" });
  }
});

// Create page
router.post("/", async (req: Request, res: Response) => {
  try {
    const { id, pageType, title, path, content, contentData } = req.body;

    if (!id) {
      return res.status(400).json({ error: "id is required" });
    }

    // Check if page already exists
    const [existingRows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM pages WHERE id = ?",
      [id],
    );

    if (existingRows && existingRows.length > 0) {
      // Page already exists, return it
      const row = existingRows[0];
      const cols = await getAvailableColumns();
      const inferredPageType = inferPageTypeFromRow(row, cols);
      return res.status(200).json({
        id: row.id,
        title: row.title || "",
        path: cols.has("path")
          ? row.path
          : inferPath(inferredPageType, row.id),
        pageType: inferredPageType,
        content: row.content || "",
        contentData: parseContentDataSafely(row.content_data, row.id),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
    }

    const cols = await getAvailableColumns();

    // Sanitize content data
    const sanitizedContentData = sanitizeContentData(contentData);
    const contentDataJson =
      typeof sanitizedContentData === "string"
        ? sanitizedContentData
        : JSON.stringify(sanitizedContentData || {});

    // Build INSERT statement dynamically based on available columns and constraints
    const columns: string[] = ["id"];
    const values: any[] = [id];
    const placeholders: string[] = ["?"];

    if (cols.has("slug")) {
      // slug is required with no default
      columns.push("slug");
      values.push(generateSlug(title, id));
      placeholders.push("?");
    }

    if (cols.has("title")) {
      columns.push("title");
      values.push(title || "");
      placeholders.push("?");
    }

    if (cols.has("path")) {
      columns.push("path");
      values.push(path || inferPath(pageType, id));
      placeholders.push("?");
    }

    if (cols.has("page_type")) {
      columns.push("page_type");
      values.push(pageType || "page");
      placeholders.push("?");
    }

    if (cols.has("content")) {
      columns.push("content");
      values.push(content || "");
      placeholders.push("?");
    }

    if (cols.has("content_data")) {
      columns.push("content_data");
      values.push(contentDataJson);
      placeholders.push("?");
    }

    if (cols.has("created_at")) {
      columns.push("created_at");
      values.push(toMySQLDateTime(new Date()));
      placeholders.push("?");
    }

    if (cols.has("updated_at")) {
      columns.push("updated_at");
      values.push(toMySQLDateTime(new Date()));
      placeholders.push("?");
    }

    const insertSQL = `INSERT INTO pages (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`;
    console.log("Executing INSERT with columns:", columns, "values:", values);
    await pool.query(insertSQL, values);

    return res.status(201).json({
      id,
      pageType: pageType || "page",
      title: title || "",
      path: path || inferPath(pageType, id),
      content: content || "",
      contentData: sanitizedContentData,
    });
  } catch (error) {
    console.error("Error creating page:", error);
    return res.status(500).json({ error: "Failed to create page" });
  }
});

// Update page
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { pageType, title, path, content, contentData } = req.body;
    const cols = await getAvailableColumns();

    // Sanitize content data
    const sanitizedContentData = sanitizeContentData(contentData);
    const contentDataJson =
      typeof sanitizedContentData === "string"
        ? sanitizedContentData
        : JSON.stringify(sanitizedContentData || {});

    // Build UPDATE statement dynamically
    const setClauses: string[] = [];
    const values: any[] = [];

    if (cols.has("title")) {
      setClauses.push("title = ?");
      values.push(title || "");
    }

    if (cols.has("path")) {
      setClauses.push("path = ?");
      values.push(path || inferPath(pageType, req.params.id));
    }

    if (cols.has("page_type")) {
      setClauses.push("page_type = ?");
      values.push(pageType || "page");
    }

    if (cols.has("content")) {
      setClauses.push("content = ?");
      values.push(content || "");
    }

    if (cols.has("content_data")) {
      setClauses.push("content_data = ?");
      values.push(contentDataJson);
    }

    if (cols.has("updated_at")) {
      setClauses.push("updated_at = ?");
      values.push(toMySQLDateTime(new Date()));
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: "No updatable columns available" });
    }

    values.push(req.params.id);

    const updateSQL = `UPDATE pages SET ${setClauses.join(", ")} WHERE id = ?`;
    console.log("Executing UPDATE with columns:", setClauses);
    const [result] = await pool.query(updateSQL, values);

    // If no rows updated, try to create the page instead
    if ((result as any).affectedRows === 0) {
      // Build INSERT statement dynamically
      const insertColumns: string[] = ["id"];
      const insertValues: any[] = [req.params.id];
      const insertPlaceholders: string[] = ["?"];

      if (cols.has("slug")) {
        insertColumns.push("slug");
        insertValues.push(generateSlug(title, req.params.id));
        insertPlaceholders.push("?");
      }

      if (cols.has("title")) {
        insertColumns.push("title");
        insertValues.push(title || "");
        insertPlaceholders.push("?");
      }

      if (cols.has("path")) {
        insertColumns.push("path");
        insertValues.push(path || inferPath(pageType, req.params.id));
        insertPlaceholders.push("?");
      }

      if (cols.has("page_type")) {
        insertColumns.push("page_type");
        insertValues.push(pageType || "page");
        insertPlaceholders.push("?");
      }

      if (cols.has("content")) {
        insertColumns.push("content");
        insertValues.push(content || "");
        insertPlaceholders.push("?");
      }

      if (cols.has("content_data")) {
        insertColumns.push("content_data");
        insertValues.push(contentDataJson);
        insertPlaceholders.push("?");
      }

      if (cols.has("created_at")) {
        insertColumns.push("created_at");
        insertValues.push(toMySQLDateTime(new Date()));
        insertPlaceholders.push("?");
      }

      if (cols.has("updated_at")) {
        insertColumns.push("updated_at");
        insertValues.push(toMySQLDateTime(new Date()));
        insertPlaceholders.push("?");
      }

      const insertSQL = `INSERT INTO pages (${insertColumns.join(", ")}) VALUES (${insertPlaceholders.join(", ")})`;
      console.log("Page not found, inserting with columns:", insertColumns);
      await pool.query(insertSQL, insertValues);
    }

    return res.json({
      id: req.params.id,
      pageType: pageType || "page",
      title: title || "",
      path: path || inferPath(pageType, req.params.id),
      content: content || "",
      contentData: sanitizedContentData,
    });
  } catch (error) {
    console.error("Error updating page:", error);
    return res.status(500).json({ error: "Failed to update page" });
  }
});

// Delete page
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const [result] = await pool.query("DELETE FROM pages WHERE id = ?", [
      req.params.id,
    ]);

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: "Page not found" });
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting page:", error);
    return res.status(500).json({ error: "Failed to delete page" });
  }
});

export default router;
