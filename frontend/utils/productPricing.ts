import { Product } from "../types";

export const getCurrentProductPrice = (product: Product): number => {
  const effective = Number(product.effectivePrice);
  if (Number.isFinite(effective) && effective >= 0) {
    return effective;
  }

  return Number(product.price || 0);
};

export const isProductArchived = (product: Product): boolean => {
  return Boolean(product.isArchived);
};

export const isProductOnSale = (product: Product): boolean => {
  if (typeof product.isOnSale === "boolean") {
    return product.isOnSale;
  }

  const basePrice = Number(product.price || 0);
  const currentPrice = getCurrentProductPrice(product);
  return currentPrice < basePrice;
};
