import { CartItem, TaxConfig, TaxRule } from "../types";

/**
 * Tax calculation service that handles state-specific tax rules
 * and product category exemptions
 */

export interface TaxCalculationResult {
  subtotal: number;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

/**
 * Find the applicable tax rate for a given state and cart items
 * Uses priority-based rule matching (higher priority wins)
 */
export const getTaxRateForState = (
  state: string,
  _cartItems: CartItem[],
  taxConfig: TaxConfig,
): number => {
  if (!taxConfig.enableTaxCollection) {
    return 0;
  }

  // Filter enabled rules that apply to this state
  const applicableRules = taxConfig.rules
    .filter((rule) => rule.enabled && rule.states.includes(state.toUpperCase()))
    .sort((a, b) => b.priority - a.priority); // Sort by priority descending

  if (applicableRules.length === 0) {
    return taxConfig.defaultTaxRate;
  }

  // Use the highest priority rule
  // In a more complex system, you could blend multiple rules or apply them sequentially
  return applicableRules[0].taxRate;
};

/**
 * Determine if a product is taxable based on its ID and the applicable rule
 */
const isProductTaxable = (productId: string, rule: TaxRule): boolean => {
  // If exempted product IDs are specified and this product is in the list, it's not taxable
  if (rule.exemptedProductIds && rule.exemptedProductIds.includes(productId)) {
    return false;
  }

  // If product categories are specified, only tax products in those categories
  // For now, we don't have product categories, so we assume all products are taxable
  // if no exemptions apply
  return true;
};

/**
 * Calculate the taxable subtotal based on which items are actually subject to tax
 */
const calculateTaxableSubtotal = (
  cartItems: CartItem[],
  rule: TaxRule,
): number => {
  return cartItems.reduce((total, item) => {
    if (isProductTaxable(item.product.id, rule)) {
      const itemPrice = item.product.price;
      const optionsDelta = item.selectedOptions
        ? Object.values(item.selectedOptions).flat().reduce((sum, optionId) => {
            // Find the option to get its priceDelta
            const optionList = item.product.optionLists?.find((ol) =>
              ol.options.some((o) => o.id === optionId),
            );
            const option = optionList?.options.find((o) => o.id === optionId);
            return sum + (option?.priceDelta || 0);
          }, 0)
        : 0;

      return total + (itemPrice + optionsDelta) * item.quantity;
    }
    return total;
  }, 0);
};

/**
 * Calculate full order totals including tax
 * @param cartItems Array of items in the cart
 * @param shippingCost Flat shipping cost (typically not taxed)
 * @param shippingState State for shipping address (used to determine tax rate)
 * @param taxConfig Tax configuration with rules
 * @returns Tax calculation result with subtotal, tax amount, and total
 */
export const calculateTax = (
  cartItems: CartItem[],
  shippingCost: number,
  shippingState: string,
  taxConfig: TaxConfig,
): TaxCalculationResult => {
  if (!taxConfig.enableTaxCollection || cartItems.length === 0) {
    const subtotal = calculateSubtotal(cartItems);
    return {
      subtotal,
      taxableAmount: 0,
      taxRate: 0,
      taxAmount: 0,
      total: subtotal + shippingCost,
    };
  }

  const subtotal = calculateSubtotal(cartItems);
  const taxRate = getTaxRateForState(shippingState, cartItems, taxConfig);

  // Calculate taxable amount (could exclude certain products based on rules)
  const applicableRules = taxConfig.rules
    .filter((rule) =>
      rule.enabled && rule.states.includes(shippingState.toUpperCase()),
    )
    .sort((a, b) => b.priority - a.priority);

  const taxableAmount =
    applicableRules.length > 0
      ? calculateTaxableSubtotal(cartItems, applicableRules[0])
      : subtotal;

  const taxAmount = Math.round((taxableAmount * taxRate) / 100 * 100) / 100; // Round to 2 decimals
  const total = subtotal + shippingCost + taxAmount;

  return {
    subtotal,
    taxableAmount,
    taxRate,
    taxAmount,
    total,
  };
};

/**
 * Simple subtotal calculation
 */
export const calculateSubtotal = (cartItems: CartItem[]): number => {
  return cartItems.reduce((total, item) => {
    const basePrice = item.product.price;
    const optionsDelta = item.selectedOptions
      ? Object.values(item.selectedOptions).flat().reduce((sum, optionId) => {
          const optionList = item.product.optionLists?.find((ol) =>
            ol.options.some((o) => o.id === optionId),
          );
          const option = optionList?.options.find((o) => o.id === optionId);
          return sum + (option?.priceDelta || 0);
        }, 0)
      : 0;

    return total + (basePrice + optionsDelta) * item.quantity;
  }, 0);
};

/**
 * Get all US state codes for reference
 */
export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];
