/**
 * Generate a URL-friendly slug from a product name
 * Example: "Custom Red T-Shirt" -> "custom-red-t-shirt"
 */
export const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

/**
 * Create a product URL using slug and ID
 * This allows the slug to be optional in the URL for flexibility
 */
export const getProductUrl = (productId: string, productName: string): string => {
  const slug = generateSlug(productName);
  return `/product/${slug}/${productId}`;
};

/**
 * Extract product ID from URL params
 * The slug is optional but the ID is always present
 */
export const extractProductId = (id?: string): string | null => {
  return id || null;
};
