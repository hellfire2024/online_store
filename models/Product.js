import { pool, withTransaction } from "../db/connection.js";
import { v4 as uuidv4 } from "uuid";
// Helper function to sanitize image URLs
// Now accepts both base64 data URLs and file paths
function sanitizeImageUrl(imageUrl) {
    if (!imageUrl) {
        return null;
    }
    return imageUrl || null;
}
export async function findAll() {
    const [rows] = await pool.query(`SELECT id, name, description, price, image_url as imageUrl, inventory, 
            low_stock_threshold as lowStockThreshold, customizable, 
            enable_ai_ideas as enableAIIdeas, gallery_id as galleryId,
            allow_custom_image_upload as allowCustomImageUpload,
            custom_image_upload_price as customImageUploadPrice
     FROM products ORDER BY name`);
    const products = rows;
    // Load option lists for each product
    for (const product of products) {
        product.optionLists = await findOptionLists(product.id);
        // Convert 0 to undefined for customImageUploadPrice when feature is not enabled
        if (!product.allowCustomImageUpload || product.customImageUploadPrice === 0) {
            product.customImageUploadPrice = undefined;
        }
    }
    return products;
}
export async function findById(id) {
    const [rows] = await pool.query(`SELECT id, name, description, price, image_url as imageUrl, inventory,
            low_stock_threshold as lowStockThreshold, customizable,
            enable_ai_ideas as enableAIIdeas, gallery_id as galleryId,
            allow_custom_image_upload as allowCustomImageUpload,
            custom_image_upload_price as customImageUploadPrice
     FROM products WHERE id = ?`, [id]);
    if (rows.length === 0)
        return null;
    const product = rows[0];
    product.optionLists = await findOptionLists(id);
    // Convert 0 to undefined for customImageUploadPrice when feature is not enabled
    if (!product.allowCustomImageUpload || product.customImageUploadPrice === 0) {
        product.customImageUploadPrice = undefined;
    }
    return product;
}
async function findOptionLists(productId) {
    const [lists] = await pool.query(`SELECT id, name, required, max_selections as maxSelections, list_order as 'order'
     FROM product_option_lists WHERE product_id = ? ORDER BY list_order`, [productId]);
    const optionLists = [];
    for (const list of lists) {
        const [options] = await pool.query(`SELECT id, name, price_delta as priceDelta, option_order as 'order'
       FROM product_options WHERE list_id = ? ORDER BY option_order`, [list.id]);
        optionLists.push({
            id: list.id,
            name: list.name,
            required: Boolean(list.required),
            maxSelections: list.maxSelections === null ? undefined : Number(list.maxSelections),
            order: list.order,
            options: options,
        });
    }
    return optionLists;
}
export async function create(data) {
    return withTransaction(async (connection) => {
        const id = uuidv4();
        const sanitizedImageUrl = sanitizeImageUrl(data.imageUrl);
        await connection.query(`INSERT INTO products (id, name, description, price, image_url, inventory,
                             low_stock_threshold, customizable, enable_ai_ideas, gallery_id,
                             allow_custom_image_upload, custom_image_upload_price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            id,
            data.name,
            data.description || null,
            data.price,
            sanitizedImageUrl,
            data.inventory || 0,
            data.lowStockThreshold || 20,
            data.customizable || false,
            data.enableAIIdeas || false,
            data.galleryId || null,
            data.allowCustomImageUpload || false,
            data.customImageUploadPrice ?? null,
        ]);
        // Save option lists if provided
        if (data.optionLists) {
            for (const list of data.optionLists) {
                await saveOptionList(connection, id, list);
            }
        }
        const product = await findById(id);
        return product;
    });
}
export async function update(id, data) {
    return withTransaction(async (connection) => {
        // Fetch current product to preserve imageUrl if not provided
        const currentProduct = await findById(id);
        if (!currentProduct)
            return null;
        // Only update imageUrl if explicitly provided and valid
        let finalImageUrl = currentProduct.imageUrl;
        if (data.imageUrl !== undefined) {
            const sanitized = sanitizeImageUrl(data.imageUrl);
            if (sanitized !== null) {
                finalImageUrl = sanitized;
            }
            // If sanitized is null (base64), keep current imageUrl
        }
        const [result] = await connection.query(`UPDATE products SET name = ?, description = ?, price = ?, image_url = ?,
                          inventory = ?, low_stock_threshold = ?, customizable = ?,
                          enable_ai_ideas = ?, gallery_id = ?,
                          allow_custom_image_upload = ?, custom_image_upload_price = ?
       WHERE id = ?`, [
            data.name ?? currentProduct.name,
            data.description ?? currentProduct.description,
            data.price ?? currentProduct.price,
            finalImageUrl,
            data.inventory ?? currentProduct.inventory,
            data.lowStockThreshold ?? currentProduct.lowStockThreshold ?? 20,
            data.customizable ?? currentProduct.customizable,
            data.enableAIIdeas ?? currentProduct.enableAIIdeas,
            data.galleryId ?? currentProduct.galleryId,
            data.allowCustomImageUpload ?? currentProduct.allowCustomImageUpload,
            data.customImageUploadPrice ?? currentProduct.customImageUploadPrice ?? null,
            id,
        ]);
        if (result.affectedRows === 0)
            return null;
        // Update option lists
        if (data.optionLists) {
            // Delete existing options
            await connection.query("DELETE FROM product_option_lists WHERE product_id = ?", [id]);
            // Re-create options
            for (const list of data.optionLists) {
                await saveOptionList(connection, id, list);
            }
        }
        return await findById(id);
    });
}
async function saveOptionList(connection, productId, list) {
    await connection.query(`INSERT INTO product_option_lists (id, product_id, name, required, max_selections, list_order)
     VALUES (?, ?, ?, ?, ?, ?)`, [list.id, productId, list.name, list.required, list.maxSelections ?? null, list.order]);
    for (const option of list.options) {
        await connection.query(`INSERT INTO product_options (id, list_id, name, price_delta, option_order)
       VALUES (?, ?, ?, ?, ?)`, [option.id, list.id, option.name, option.priceDelta, option.order]);
    }
}
export async function remove(id) {
    const [result] = await pool.query("DELETE FROM products WHERE id = ?", [id]);
    return result.affectedRows > 0;
}
//# sourceMappingURL=Product.js.map