import { Router } from "express";
import { pool } from "../db/connection.js";
const router = Router();
// Helper function to sanitize content data
// Base64 images are allowed and stored in the database
function sanitizeContentData(contentData) {
    return contentData;
}
// Get all pages
router.get("/", async (_req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM pages ORDER BY created_at DESC");
        // Transform snake_case to camelCase for API response
        const transformedRows = (rows || []).map((row) => ({
            id: row.id,
            title: row.title,
            path: row.path,
            pageType: row.page_type,
            content: row.content,
            contentData: typeof row.content_data === "string"
                ? JSON.parse(row.content_data)
                : row.content_data,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        }));
        return res.json(transformedRows);
    }
    catch (error) {
        console.error("Error fetching pages:", error);
        return res.status(500).json({ error: "Failed to fetch pages" });
    }
});
// Get single page
router.get("/:id", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM pages WHERE id = ?", [req.params.id]);
        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: "Page not found" });
        }
        const row = rows[0];
        // Transform snake_case to camelCase for API response
        const page = {
            id: row.id,
            title: row.title,
            path: row.path,
            pageType: row.page_type,
            content: row.content,
            contentData: typeof row.content_data === "string"
                ? JSON.parse(row.content_data)
                : row.content_data,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
        return res.json(page);
    }
    catch (error) {
        console.error("Error fetching page:", error);
        return res.status(500).json({ error: "Failed to fetch page" });
    }
});
// Create page
router.post("/", async (req, res) => {
    try {
        const { id, pageType, title, path, content, contentData } = req.body;
        if (!id || !pageType) {
            return res.status(400).json({ error: "id and pageType are required" });
        }
        // Sanitize content data to remove base64 images
        const sanitizedContentData = sanitizeContentData(contentData);
        const contentDataJson = typeof sanitizedContentData === "string"
            ? sanitizedContentData
            : JSON.stringify(sanitizedContentData || {});
        await pool.query(`INSERT INTO pages (id, title, path, page_type, content, content_data, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`, [id, title || "", path || "/", pageType, content || "", contentDataJson]);
        return res.status(201).json({
            id,
            pageType,
            title,
            path,
            content,
            contentData: sanitizedContentData,
        });
    }
    catch (error) {
        console.error("Error creating page:", error);
        return res.status(500).json({ error: "Failed to create page" });
    }
});
// Update page
router.put("/:id", async (req, res) => {
    try {
        const { pageType, title, path, content, contentData } = req.body;
        // Sanitize content data to remove base64 images
        const sanitizedContentData = sanitizeContentData(contentData);
        const contentDataJson = typeof sanitizedContentData === "string"
            ? sanitizedContentData
            : JSON.stringify(sanitizedContentData || {});
        const [result] = await pool.query(`UPDATE pages SET title = ?, path = ?, page_type = ?, content = ?, content_data = ?, updated_at = NOW()
       WHERE id = ?`, [
            title || "",
            path || "/",
            pageType,
            content || "",
            contentDataJson,
            req.params.id,
        ]);
        let updatedId = req.params.id;
        if (result.affectedRows === 0) {
            let whereClause = "";
            let whereValue;
            if (pageType) {
                whereClause = "page_type = ?";
                whereValue = pageType;
            }
            else if (path) {
                whereClause = "path = ?";
                whereValue = path;
            }
            if (whereClause && whereValue) {
                const [fallbackResult] = await pool.query(`UPDATE pages SET title = ?, path = ?, page_type = ?, content = ?, content_data = ?, updated_at = NOW()
           WHERE ${whereClause}`, [
                    title || "",
                    path || "/",
                    pageType,
                    content || "",
                    contentDataJson,
                    whereValue,
                ]);
                if (fallbackResult.affectedRows === 0) {
                    await pool.query(`INSERT INTO pages (id, title, path, page_type, content, content_data, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`, [
                        req.params.id,
                        title || "",
                        path || "/",
                        pageType,
                        content || "",
                        contentDataJson,
                    ]);
                    updatedId = req.params.id;
                }
                else {
                    const [rows] = await pool.query(`SELECT id FROM pages WHERE ${whereClause} LIMIT 1`, [whereValue]);
                    if (rows && rows.length > 0) {
                        updatedId = rows[0].id;
                    }
                }
            }
            else {
                await pool.query(`INSERT INTO pages (id, title, path, page_type, content, content_data, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`, [
                    req.params.id,
                    title || "",
                    path || "/",
                    pageType,
                    content || "",
                    contentDataJson,
                ]);
                updatedId = req.params.id;
            }
        }
        return res.json({
            id: updatedId,
            pageType,
            title,
            path,
            content,
            contentData: sanitizedContentData,
        });
    }
    catch (error) {
        console.error("Error updating page:", error);
        return res.status(500).json({ error: "Failed to update page" });
    }
});
// Delete page
router.delete("/:id", async (req, res) => {
    try {
        const [result] = await pool.query("DELETE FROM pages WHERE id = ?", [
            req.params.id,
        ]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Page not found" });
        }
        return res.status(204).send();
    }
    catch (error) {
        console.error("Error deleting page:", error);
        return res.status(500).json({ error: "Failed to delete page" });
    }
});
export default router;
//# sourceMappingURL=pages.js.map