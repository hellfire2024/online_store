import { pool, withTransaction } from "../db/connection.js";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { v4 as uuidv4 } from "uuid";

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  effectivePrice?: number;
  isOnSale?: boolean;
  salePrice?: number;
  isArchived?: boolean;
  saleType?: "none" | "percent" | "fixed";
  saleValue?: number;
  saleStartAt?: string;
  saleEndAt?: string;
  reorderPricingMode?: "current" | "historical";
  imageUrl?: string;
  inventory: number;
  lowStockThreshold?: number;
  customizable: boolean;
  enableAIIdeas?: boolean;
  galleryId?: string;
  allowCustomImageUpload?: boolean;
  customImageUploadPrice?: number;
  allowCustomText?: boolean;
  customTextPricePerChar?: number;
  customTextMaxLength?: number;
  optionLists?: ProductOptionList[];
  // Shipping/package fields
  packageWeight?: number;
  packageLength?: number;
  packageWidth?: number;
  packageHeight?: number;
  packageVolume?: number;
}

interface ProductOptionList {
  id: string;
  name: string;
  required: boolean;
  maxSelections?: number;
  order: number;
  options: ProductOption[];
}

interface ProductOption {
  id: string;
  name: string;
  priceDelta: number;
  order: number;
}

// Helper function to sanitize image URLs
// Now accepts both base64 data URLs and file paths
function sanitizeImageUrl(imageUrl?: string): string | null {
  if (!imageUrl) {
    return null;
  }

  return imageUrl || null;
}

function computeEffectivePricing(product: Product): {
  effectivePrice: number;
  salePrice?: number;
  isOnSale: boolean;
} {
  const basePrice = Number(product.price || 0);
  const saleType = product.saleType || "none";
  const saleValue = Number(product.saleValue || 0);

  const now = new Date();
  const startsAt = product.saleStartAt ? new Date(product.saleStartAt) : null;
  const endsAt = product.saleEndAt ? new Date(product.saleEndAt) : null;

  const isInWindow =
    (!startsAt || startsAt <= now) && (!endsAt || endsAt >= now);

  if (!isInWindow || saleType === "none" || saleValue <= 0) {
    return { effectivePrice: basePrice, isOnSale: false };
  }

  let computedSalePrice = basePrice;
  if (saleType === "percent") {
    computedSalePrice = basePrice * (1 - saleValue / 100);
  } else if (saleType === "fixed") {
    computedSalePrice = saleValue;
  }

  computedSalePrice = Math.max(0, Number(computedSalePrice.toFixed(2)));

  if (computedSalePrice >= basePrice) {
    return { effectivePrice: basePrice, isOnSale: false };
  }

  return {
    effectivePrice: computedSalePrice,
    salePrice: computedSalePrice,
    isOnSale: true,
  };
}

function normalizeProductRow(row: RowDataPacket): Product {
  const product: Product = {
    ...(row as Product),
    isArchived: Boolean(row.isArchived),
    saleType: (row.saleType || "none") as "none" | "percent" | "fixed",
    saleValue:
      row.saleValue === null || row.saleValue === undefined
        ? undefined
        : Number(row.saleValue),
    saleStartAt: row.saleStartAt
      ? new Date(row.saleStartAt).toISOString()
      : undefined,
    saleEndAt: row.saleEndAt
      ? new Date(row.saleEndAt).toISOString()
      : undefined,
    reorderPricingMode: (row.reorderPricingMode || "current") as
      | "current"
      | "historical",
  };

  const pricing = computeEffectivePricing(product);
  product.effectivePrice = pricing.effectivePrice;
  product.salePrice = pricing.salePrice;
  product.isOnSale = pricing.isOnSale;

  return product;
}

export async function findAll(includeArchived = true): Promise<Product[]> {
  // Use camelCase columns directly (after migration)
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM products ${includeArchived ? "" : "WHERE isArchived = FALSE"} ORDER BY name`,
  );

  const products = rows.map(normalizeProductRow);

  // Load option lists for each product
  for (const product of products) {
    product.optionLists = await findOptionLists(product.id);
    // Convert 0 to undefined for customImageUploadPrice when feature is not enabled
    if (
      !product.allowCustomImageUpload ||
      product.customImageUploadPrice === 0
    ) {
      product.customImageUploadPrice = undefined;
    }
    // Convert 0 to undefined for customTextPricePerChar when feature is not enabled
    if (!product.allowCustomText || product.customTextPricePerChar === 0) {
      product.customTextPricePerChar = undefined;
    }
  }

  return products;
}

export async function findById(id: string): Promise<Product | null> {
  // Use camelCase columns directly (after migration)
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM products WHERE id = ?`,
    [id],
  );

  if (rows.length === 0) return null;

  const product = normalizeProductRow(rows[0]);
  product.optionLists = await findOptionLists(id);
  // Convert 0 to undefined for customImageUploadPrice when feature is not enabled
  if (!product.allowCustomImageUpload || product.customImageUploadPrice === 0) {
    product.customImageUploadPrice = undefined;
  }
  // Convert 0 to undefined for customTextPricePerChar when feature is not enabled
  if (!product.allowCustomText || product.customTextPricePerChar === 0) {
    product.customTextPricePerChar = undefined;
  }

  return product;
}

async function findOptionLists(
  productId: string,
): Promise<ProductOptionList[]> {
  const [lists] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM product_option_lists WHERE productId = ? ORDER BY listOrder`,
    [productId],
  );

  const optionLists: ProductOptionList[] = [];

  for (const list of lists) {
    const [options] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM product_options WHERE listId = ? ORDER BY optionOrder`,
      [list.id],
    );

    optionLists.push({
      id: list.id,
      name: list.name,
      required: Boolean(list.required),
      maxSelections:
        list.maxSelections === null ? undefined : Number(list.maxSelections),
      order: list.listOrder,
      options: options as ProductOption[],
    });
  }

  return optionLists;
}

export async function create(data: Partial<Product>): Promise<Product> {
  return withTransaction(async (connection) => {
    const id = uuidv4();
    const sanitizedImageUrl = sanitizeImageUrl(data.imageUrl);
    const saleType = data.saleType || "none";
    const normalizedSaleValue =
      saleType === "none" ? null : (data.saleValue ?? null);
    const normalizedSaleStartAt =
      saleType === "none" || !data.saleStartAt
        ? null
        : new Date(data.saleStartAt);
    const normalizedSaleEndAt =
      saleType === "none" || !data.saleEndAt ? null : new Date(data.saleEndAt);

    await connection.query(
      `INSERT INTO products (id, name, description, price, imageUrl, inventory,
                             lowStockThreshold, customizable, enableAIIdeas, galleryId,
                             allowCustomImageUpload, customImageUploadPrice,
                             allowCustomText, customTextPricePerChar, customTextMaxLength,
                             isArchived, saleType, saleValue, saleStartAt, saleEndAt, reorderPricingMode,
                             packageWeight, packageLength, packageWidth, packageHeight, packageVolume)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
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
        data.allowCustomText || false,
        data.customTextPricePerChar ?? null,
        data.customTextMaxLength ?? 100,
        data.isArchived || false,
        saleType,
        normalizedSaleValue,
        normalizedSaleStartAt,
        normalizedSaleEndAt,
        data.reorderPricingMode || "current",
        data.packageWeight ?? null,
        data.packageLength ?? null,
        data.packageWidth ?? null,
        data.packageHeight ?? null,
        data.packageVolume ?? null,
      ],
    );

    // Save option lists if provided
    if (data.optionLists) {
      for (const list of data.optionLists) {
        await saveOptionList(connection, id, list);
      }
    }

    const product = await findById(id);
    return product!;
  });
}

export async function update(
  id: string,
  data: Partial<Product>,
): Promise<Product | null> {
  return withTransaction(async (connection) => {
    // Fetch current product to preserve imageUrl if not provided
    const currentProduct = await findById(id);
    if (!currentProduct) return null;

    // Only update imageUrl if explicitly provided and valid
    let finalImageUrl = currentProduct.imageUrl;
    if (data.imageUrl !== undefined) {
      const sanitized = sanitizeImageUrl(data.imageUrl);
      if (sanitized !== null) {
        finalImageUrl = sanitized;
      }
      // If sanitized is null (base64), keep current imageUrl
    }

    const resolvedSaleType = data.saleType ?? currentProduct.saleType ?? "none";
    const resolvedSaleValue =
      resolvedSaleType === "none"
        ? null
        : (data.saleValue ?? currentProduct.saleValue ?? null);

    const resolveDate = (
      incomingValue: string | null | undefined,
      currentValue?: string,
    ) => {
      if (resolvedSaleType === "none") return null;
      if (incomingValue === null || incomingValue === "") return null;
      if (incomingValue) return new Date(incomingValue);
      return currentValue ? new Date(currentValue) : null;
    };

    const resolvedSaleStartAt = resolveDate(
      data.saleStartAt as string | null | undefined,
      currentProduct.saleStartAt,
    );
    const resolvedSaleEndAt = resolveDate(
      data.saleEndAt as string | null | undefined,
      currentProduct.saleEndAt,
    );

    const [result] = await connection.query<ResultSetHeader>(
      `UPDATE products SET name = ?, description = ?, price = ?, imageUrl = ?,
                          inventory = ?, lowStockThreshold = ?, customizable = ?,
                          enableAIIdeas = ?, galleryId = ?,
                          allowCustomImageUpload = ?, customImageUploadPrice = ?,
                          allowCustomText = ?, customTextPricePerChar = ?, customTextMaxLength = ?,
                          isArchived = ?, saleType = ?, saleValue = ?, saleStartAt = ?, saleEndAt = ?,
                          reorderPricingMode = ?,
                          packageWeight = ?, packageLength = ?, packageWidth = ?, packageHeight = ?, packageVolume = ?
       WHERE id = ?`,
      [
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
        data.customImageUploadPrice ??
          currentProduct.customImageUploadPrice ??
          null,
        data.allowCustomText ?? currentProduct.allowCustomText,
        data.customTextPricePerChar ??
          currentProduct.customTextPricePerChar ??
          null,
        data.customTextMaxLength ?? currentProduct.customTextMaxLength ?? 100,
        data.isArchived ?? currentProduct.isArchived ?? false,
        resolvedSaleType,
        resolvedSaleValue,
        resolvedSaleStartAt,
        resolvedSaleEndAt,
        data.reorderPricingMode ??
          currentProduct.reorderPricingMode ??
          "current",
        data.packageWeight ?? currentProduct.packageWeight ?? null,
        data.packageLength ?? currentProduct.packageLength ?? null,
        data.packageWidth ?? currentProduct.packageWidth ?? null,
        data.packageHeight ?? currentProduct.packageHeight ?? null,
        data.packageVolume ?? currentProduct.packageVolume ?? null,
        id,
      ],
    );

    if (result.affectedRows === 0) return null;

    // Update option lists
    if (data.optionLists) {
      // Delete existing options
      await connection.query(
        "DELETE FROM product_option_lists WHERE product_id = ?",
        [id],
      );

      // Re-create options
      for (const list of data.optionLists) {
        await saveOptionList(connection, id, list);
      }
    }

    return await findById(id);
  });
}

async function saveOptionList(
  connection: any,
  productId: string,
  list: ProductOptionList,
): Promise<void> {
  await connection.query(
    `INSERT INTO product_option_lists (id, productId, name, required, maxSelections, listOrder)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      list.id,
      productId,
      list.name,
      list.required,
      list.maxSelections ?? null,
      list.order,
    ],
  );

  for (const option of list.options) {
    await connection.query(
      `INSERT INTO product_options (id, listId, name, priceDelta, optionOrder)
       VALUES (?, ?, ?, ?, ?)`,
      [option.id, list.id, option.name, option.priceDelta, option.order],
    );
  }
}

export async function remove(id: string): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    "DELETE FROM products WHERE id = ?",
    [id],
  );
  return result.affectedRows > 0;
}
