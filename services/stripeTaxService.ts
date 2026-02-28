import { CartItem } from "../types";

/**
 * Stripe Tax Service
 * Integrates with Stripe Tax API for automatic tax calculation
 * Handles nexus rules, compliance, and accurate state/local tax rates
 */

export interface StripeTaxCalculationInput {
  cartItems: CartItem[];
  shippingCost: number;
  shippingState: string;
  shippingZip: string;
  stripeApiKey: string;
}

export interface StripeTaxCalculationResult {
  subtotal: number;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  stripeTaxTransactionId?: string; // For record keeping
}

async function parseJsonResponse(response: Response): Promise<any> {
  const contentType = (
    response.headers.get("content-type") || ""
  ).toLowerCase();
  const raw = await response.text();

  if (!contentType.includes("application/json")) {
    throw new Error(
      `Tax calculation returned non-JSON response (${contentType || "unknown"})`,
    );
  }

  if (!raw.trim()) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Tax calculation returned invalid JSON");
  }
}

/**
 * Calculate tax using Stripe Tax API
 * This would be called from the backend to keep API key secure
 */
export const calculateTaxWithStripe = async (
  input: StripeTaxCalculationInput,
): Promise<StripeTaxCalculationResult> => {
  // This function would call your backend endpoint
  // which securely calls Stripe Tax API
  const response = await fetch("/api/tax/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cartItems: input.cartItems,
      shippingCost: input.shippingCost,
      shippingState: input.shippingState,
      shippingZip: input.shippingZip,
    }),
  });

  if (!response.ok) {
    throw new Error(`Tax calculation failed: ${response.statusText}`);
  }

  return parseJsonResponse(response);
};

/**
 * Fallback: Simple tax calculation (in case Stripe API unavailable)
 */
export const calculateSubtotal = (cartItems: CartItem[]): number => {
  return cartItems.reduce((total, item) => {
    const basePrice = item.product.price;
    const optionsDelta = item.selectedOptions
      ? Object.values(item.selectedOptions)
          .flat()
          .reduce((sum, optionId) => {
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
