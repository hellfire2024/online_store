import { pool, withTransaction } from '../db/connection.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  inventory: number;
  lowStockThreshold?: number;
  customizable: boolean;
  enableAIIdeas?: boolean;
  galleryId?: string;
  optionLists?: ProductOptionList[];
}

interface ProductOptionList {
  id: string;
  name: string;
  required: boolean;
  order: number;
  options: ProductOption[];
}

interface ProductOption {
  id: string;
  name: string;
  priceDelta: number;
  order: number;
}

export async function findAll(): Promise<Product[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, name, description, price, image_url as imageUrl, inventory, 
            low_stock_threshold as lowStockThreshold, customizable, 
            enable_ai_ideas as enableAIIdeas, gallery_id as galleryId
     FROM products ORDER BY name`
  );

  const products = rows as Product[];

  // Load option lists for each product
  for (const product of products) {
    product.optionLists = await findOptionLists(product.id);
  }

  return products;
}

export async function findById(id: string): Promise<Product | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, name, description, price, image_url as imageUrl, inventory,
            low_stock_threshold as lowStockThreshold, customizable,
            enable_ai_ideas as enableAIIdeas, gallery_id as galleryId
     FROM products WHERE id = ?`,
    [id]
  );

  if (rows.length === 0) return null;

  const product = rows[0] as Product;
  product.optionLists = await findOptionLists(id);

  return product;
}

async function findOptionLists(productId: string): Promise<ProductOptionList[]> {
  const [lists] = await pool.query<RowDataPacket[]>(
    `SELECT id, name, required, list_order as 'order'
     FROM product_option_lists WHERE product_id = ? ORDER BY list_order`,
    [productId]
  );

  const optionLists: ProductOptionList[] = [];

  for (const list of lists) {
    const [options] = await pool.query<RowDataPacket[]>(
      `SELECT id, name, price_delta as priceDelta, option_order as 'order'
       FROM product_options WHERE list_id = ? ORDER BY option_order`,
      [list.id]
    );

    optionLists.push({
      id: list.id,
      name: list.name,
      required: Boolean(list.required),
      order: list.order,
      options: options as ProductOption[],
    });
  }

  return optionLists;
}

export async function create(data: Partial<Product>): Promise<Product> {
  return withTransaction(async (connection) => {
    const id = uuidv4();

    await connection.query(
      `INSERT INTO products (id, name, description, price, image_url, inventory,
                             low_stock_threshold, customizable, enable_ai_ideas, gallery_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.name,
        data.description || null,
        data.price,
        data.imageUrl || null,
        data.inventory || 0,
        data.lowStockThreshold || 20,
        data.customizable || false,
        data.enableAIIdeas || false,
        data.galleryId || null,
      ]
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

export async function update(id: string, data: Partial<Product>): Promise<Product | null> {
  return withTransaction(async (connection) => {
    const [result] = await connection.query<ResultSetHeader>(
      `UPDATE products SET name = ?, description = ?, price = ?, image_url = ?,
                          inventory = ?, low_stock_threshold = ?, customizable = ?,
                          enable_ai_ideas = ?, gallery_id = ?
       WHERE id = ?`,
      [
        data.name,
        data.description || null,
        data.price,
        data.imageUrl || null,
        data.inventory,
        data.lowStockThreshold || 20,
        data.customizable || false,
        data.enableAIIdeas || false,
        data.galleryId || null,
        id,
      ]
    );

    if (result.affectedRows === 0) return null;

    // Update option lists
    if (data.optionLists) {
      // Delete existing options
      await connection.query('DELETE FROM product_option_lists WHERE product_id = ?', [id]);
      
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
  list: ProductOptionList
): Promise<void> {
  await connection.query(
    `INSERT INTO product_option_lists (id, product_id, name, required, list_order)
     VALUES (?, ?, ?, ?, ?)`,
    [list.id, productId, list.name, list.required, list.order]
  );

  for (const option of list.options) {
    await connection.query(
      `INSERT INTO product_options (id, list_id, name, price_delta, option_order)
       VALUES (?, ?, ?, ?, ?)`,
      [option.id, list.id, option.name, option.priceDelta, option.order]
    );
  }
}

export async function remove(id: string): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>('DELETE FROM products WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
