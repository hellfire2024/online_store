import { pool, withTransaction } from "../db/connection.js";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { v4 as uuidv4 } from "uuid";

type QueryableConnection = {
  query: <T = any>(sql: string, values?: any[]) => Promise<[T, any]>;
};

type ProductColumnConfig = {
  image: string;
  lowStockThreshold: string;
  enableAIIdeas: string;
  galleryId: string;
  allowCustomImageUpload: string;
  customImageUploadPrice: string;
  allowCustomText: string;
  customTextPricePerChar: string;
  customTextMaxLength: string;
  isArchived: string;
  saleType: string;
  saleValue: string;
  saleStartAt: string;
  saleEndAt: string;
  reorderPricingMode: string;
  packageWeight: string;
  packageLength: string;
  packageWidth: string;
  packageHeight: string;
  packageVolume: string;
};

type ProductSchemaConfig = {
  products: ProductColumnConfig;
  optionLists: {
    productFk: string;
    maxSelections: string;
    orderCol: string;
  };
  options: {
    listFk: string;
    priceDelta: string;
    orderCol: string;
  };
};

let productSchemaConfigPromise: Promise<ProductSchemaConfig> | null = null;

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

function getRowValue<T>(row: RowDataPacket, camel: string, snake: string): T {
  const value = row[camel] !== undefined ? row[camel] : row[snake];
  return value as T;
}

function numberOrUndefined(value: any): number | undefined {
  if (value === null || value === undefined) return undefined;
  return Number(value);
}

async function hasColumn(table: string, column: string): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SHOW COLUMNS FROM \`${table}\` LIKE ?`,
    [column],
  );
  return rows.length > 0;
}

async function resolveColumnName(
  table: string,
  camelCaseColumn: string,
  snakeCaseColumn: string,
): Promise<string> {
  if (await hasColumn(table, camelCaseColumn)) {
    return camelCaseColumn;
  }
  return snakeCaseColumn;
}

async function resolveProductSchemaConfig(): Promise<ProductSchemaConfig> {
  if (!productSchemaConfigPromise) {
    productSchemaConfigPromise = (async () => {
      const [
        image,
        lowStockThreshold,
        enableAIIdeas,
        galleryId,
        allowCustomImageUpload,
        customImageUploadPrice,
        allowCustomText,
        customTextPricePerChar,
        customTextMaxLength,
        isArchived,
        saleType,
        saleValue,
        saleStartAt,
        saleEndAt,
        reorderPricingMode,
        packageWeight,
        packageLength,
        packageWidth,
        packageHeight,
        packageVolume,
        optionListProductFk,
        optionListMaxSelections,
        optionListOrder,
        optionListFk,
        optionPriceDelta,
        optionOrder,
      ] = await Promise.all([
        resolveColumnName("products", "imageUrl", "image_url"),
        resolveColumnName(
          "products",
          "lowStockThreshold",
          "low_stock_threshold",
        ),
        resolveColumnName("products", "enableAIIdeas", "enable_ai_ideas"),
        resolveColumnName("products", "galleryId", "gallery_id"),
        resolveColumnName(
          "products",
          "allowCustomImageUpload",
          "allow_custom_image_upload",
        ),
        resolveColumnName(
          "products",
          "customImageUploadPrice",
          "custom_image_upload_price",
        ),
        resolveColumnName("products", "allowCustomText", "allow_custom_text"),
        resolveColumnName(
          "products",
          "customTextPricePerChar",
          "custom_text_price_per_char",
        ),
        resolveColumnName(
          "products",
          "customTextMaxLength",
          "custom_text_max_length",
        ),
        resolveColumnName("products", "isArchived", "is_archived"),
        resolveColumnName("products", "saleType", "sale_type"),
        resolveColumnName("products", "saleValue", "sale_value"),
        resolveColumnName("products", "saleStartAt", "sale_start_at"),
        resolveColumnName("products", "saleEndAt", "sale_end_at"),
        resolveColumnName(
          "products",
          "reorderPricingMode",
          "reorder_pricing_mode",
        ),
        resolveColumnName("products", "packageWeight", "package_weight"),
        resolveColumnName("products", "packageLength", "package_length"),
        resolveColumnName("products", "packageWidth", "package_width"),
        resolveColumnName("products", "packageHeight", "package_height"),
        resolveColumnName("products", "packageVolume", "package_volume"),
        resolveColumnName("product_option_lists", "productId", "product_id"),
        resolveColumnName(
          "product_option_lists",
          "maxSelections",
          "max_selections",
        ),
        resolveColumnName("product_option_lists", "listOrder", "list_order"),
        resolveColumnName("product_options", "listId", "list_id"),
        resolveColumnName("product_options", "priceDelta", "price_delta"),
        resolveColumnName("product_options", "optionOrder", "option_order"),
      ]);

      return {
        products: {
          image,
          lowStockThreshold,
          enableAIIdeas,
          galleryId,
          allowCustomImageUpload,
          customImageUploadPrice,
          allowCustomText,
          customTextPricePerChar,
          customTextMaxLength,
          isArchived,
          saleType,
          saleValue,
          saleStartAt,
          saleEndAt,
          reorderPricingMode,
          packageWeight,
          packageLength,
          packageWidth,
          packageHeight,
          packageVolume,
        },
        optionLists: {
          productFk: optionListProductFk,
          maxSelections: optionListMaxSelections,
          orderCol: optionListOrder,
        },
        options: {
          listFk: optionListFk,
          priceDelta: optionPriceDelta,
          orderCol: optionOrder,
        },
      };
    })();
  }

  return productSchemaConfigPromise;
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
    imageUrl: getRowValue<string | undefined>(row, "imageUrl", "image_url"),
    lowStockThreshold: numberOrUndefined(
      getRowValue<any>(row, "lowStockThreshold", "low_stock_threshold"),
    ),
    enableAIIdeas: Boolean(
      getRowValue<any>(row, "enableAIIdeas", "enable_ai_ideas"),
    ),
    galleryId: getRowValue<string | undefined>(row, "galleryId", "gallery_id"),
    allowCustomImageUpload: Boolean(
      getRowValue<any>(
        row,
        "allowCustomImageUpload",
        "allow_custom_image_upload",
      ),
    ),
    customImageUploadPrice: numberOrUndefined(
      getRowValue<any>(
        row,
        "customImageUploadPrice",
        "custom_image_upload_price",
      ),
    ),
    allowCustomText: Boolean(
      getRowValue<any>(row, "allowCustomText", "allow_custom_text"),
    ),
    customTextPricePerChar: numberOrUndefined(
      getRowValue<any>(
        row,
        "customTextPricePerChar",
        "custom_text_price_per_char",
      ),
    ),
    customTextMaxLength: numberOrUndefined(
      getRowValue<any>(row, "customTextMaxLength", "custom_text_max_length"),
    ),
    isArchived: Boolean(getRowValue<any>(row, "isArchived", "is_archived")),
    saleType: (getRowValue<string>(row, "saleType", "sale_type") || "none") as
      | "none"
      | "percent"
      | "fixed",
    saleValue: numberOrUndefined(
      getRowValue<any>(row, "saleValue", "sale_value"),
    ),
    saleStartAt: (() => {
      const value = getRowValue<any>(row, "saleStartAt", "sale_start_at");
      return value ? new Date(value).toISOString() : undefined;
    })(),
    saleEndAt: (() => {
      const value = getRowValue<any>(row, "saleEndAt", "sale_end_at");
      return value ? new Date(value).toISOString() : undefined;
    })(),
    reorderPricingMode: (getRowValue<string>(
      row,
      "reorderPricingMode",
      "reorder_pricing_mode",
    ) || "current") as "current" | "historical",
    packageWeight: numberOrUndefined(
      getRowValue<any>(row, "packageWeight", "package_weight"),
    ),
    packageLength: numberOrUndefined(
      getRowValue<any>(row, "packageLength", "package_length"),
    ),
    packageWidth: numberOrUndefined(
      getRowValue<any>(row, "packageWidth", "package_width"),
    ),
    packageHeight: numberOrUndefined(
      getRowValue<any>(row, "packageHeight", "package_height"),
    ),
    packageVolume: numberOrUndefined(
      getRowValue<any>(row, "packageVolume", "package_volume"),
    ),
  };

  const pricing = computeEffectivePricing(product);
  product.effectivePrice = pricing.effectivePrice;
  product.salePrice = pricing.salePrice;
  product.isOnSale = pricing.isOnSale;

  return product;
}

export async function findAll(includeArchived = true): Promise<Product[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM products ORDER BY name",
  );

  let products = rows.map(normalizeProductRow);
  if (!includeArchived) {
    products = products.filter((product) => !product.isArchived);
  }

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
  const schema = await resolveProductSchemaConfig();
  const [lists] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM product_option_lists WHERE ${schema.optionLists.productFk} = ? ORDER BY ${schema.optionLists.orderCol}`,
    [productId],
  );

  const optionLists: ProductOptionList[] = [];

  for (const list of lists) {
    const [options] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM product_options WHERE ${schema.options.listFk} = ? ORDER BY ${schema.options.orderCol}`,
      [list.id],
    );

    optionLists.push({
      id: list.id,
      name: list.name,
      required: Boolean(list.required),
      maxSelections:
        getRowValue<any>(
          list,
          schema.optionLists.maxSelections,
          schema.optionLists.maxSelections,
        ) === null
          ? undefined
          : Number(
              getRowValue<any>(
                list,
                schema.optionLists.maxSelections,
                schema.optionLists.maxSelections,
              ),
            ),
      order: Number(
        getRowValue<any>(
          list,
          schema.optionLists.orderCol,
          schema.optionLists.orderCol,
        ) || 0,
      ),
      options: options.map((option) => ({
        id: option.id,
        name: option.name,
        priceDelta: Number(
          getRowValue<any>(
            option,
            schema.options.priceDelta,
            schema.options.priceDelta,
          ) || 0,
        ),
        order: Number(
          getRowValue<any>(
            option,
            schema.options.orderCol,
            schema.options.orderCol,
          ) || 0,
        ),
      })),
    });
  }

  return optionLists;
}

export async function create(data: Partial<Product>): Promise<Product> {
  return withTransaction(async (connection) => {
    const schema = await resolveProductSchemaConfig();
    const productColumns = schema.products;
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
      `INSERT INTO products (id, name, description, price, ${productColumns.image}, inventory,
                             ${productColumns.lowStockThreshold}, customizable, ${productColumns.enableAIIdeas}, ${productColumns.galleryId},
                             ${productColumns.allowCustomImageUpload}, ${productColumns.customImageUploadPrice},
                             ${productColumns.allowCustomText}, ${productColumns.customTextPricePerChar}, ${productColumns.customTextMaxLength},
                             ${productColumns.isArchived}, ${productColumns.saleType}, ${productColumns.saleValue}, ${productColumns.saleStartAt}, ${productColumns.saleEndAt}, ${productColumns.reorderPricingMode},
                             ${productColumns.packageWeight}, ${productColumns.packageLength}, ${productColumns.packageWidth}, ${productColumns.packageHeight}, ${productColumns.packageVolume})
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
    const schema = await resolveProductSchemaConfig();
    const productColumns = schema.products;
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
      `UPDATE products SET name = ?, description = ?, price = ?, ${productColumns.image} = ?,
                          inventory = ?, ${productColumns.lowStockThreshold} = ?, customizable = ?,
                          ${productColumns.enableAIIdeas} = ?, ${productColumns.galleryId} = ?,
                          ${productColumns.allowCustomImageUpload} = ?, ${productColumns.customImageUploadPrice} = ?,
                          ${productColumns.allowCustomText} = ?, ${productColumns.customTextPricePerChar} = ?, ${productColumns.customTextMaxLength} = ?,
                          ${productColumns.isArchived} = ?, ${productColumns.saleType} = ?, ${productColumns.saleValue} = ?, ${productColumns.saleStartAt} = ?, ${productColumns.saleEndAt} = ?,
                          ${productColumns.reorderPricingMode} = ?,
                          ${productColumns.packageWeight} = ?, ${productColumns.packageLength} = ?, ${productColumns.packageWidth} = ?, ${productColumns.packageHeight} = ?, ${productColumns.packageVolume} = ?
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
        `DELETE FROM product_option_lists WHERE ${schema.optionLists.productFk} = ?`,
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
  connection: QueryableConnection,
  productId: string,
  list: ProductOptionList,
): Promise<void> {
  // Always use snake_case column names as defined in the migration
  await connection.query(
    `INSERT INTO product_option_lists (id, product_id, name, required, max_selections, list_order)
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
      `INSERT INTO product_options (id, list_id, name, price_delta, option_order
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
