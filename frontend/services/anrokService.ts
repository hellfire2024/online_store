/**
 * Anrok Tax Service
 * https://www.anrok.com/
 */

export interface AnrokLineItem {
  id: string;
  description: string;
  quantity: number;
  unit_amount: number;
  tax_code?: string;
}

export interface AnrokCalculateTaxRequest {
  currency_code: string;
  line_items: AnrokLineItem[];
  shipping_amount?: number;
  customer_id?: string;
  customer_email?: string;
  billing_address?: {
    country_code?: string;
    state_province_region?: string;
    postal_code?: string;
    city?: string;
  };
  delivery_address?: {
    country_code?: string;
    state_province_region?: string;
    postal_code?: string;
    city?: string;
  };
}

export interface AnrokLineItemTax {
  id: string;
  tax_amount: number;
  tax_rate: number;
  tax_type?: string;
}

export interface AnrokCalculateTaxResponse {
  calculation_id: string;
  currency_code: string;
  subtotal: number;
  tax_amount: number;
  shipping_amount?: number;
  total: number;
  effective_tax_rate: number;
  line_items: AnrokLineItemTax[];
}

export async function calculateTaxWithAnrok(
  apiKey: string,
  cartItems: any[],
  shippingCost: number,
  shippingState: string,
  shippingZip: string,
  shippingCity?: string,
): Promise<{
  subtotal: number;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  provider: string;
}> {
  if (!apiKey) {
    throw new Error('Anrok API key not configured');
  }

  try {
    const lineItems: AnrokLineItem[] = cartItems.map((item: any) => ({
      id: item.product.id,
      description: item.product.name,
      quantity: item.quantity,
      unit_amount:
        item.product.price +
        (item.selectedOptions
          ? Object.values(item.selectedOptions).reduce((sum, optionId) => {
              const optionList = item.product.optionLists?.find((ol: any) =>
                ol.options.some((o: any) => o.id === optionId),
              );
              const option = optionList?.options.find((o: any) => o.id === optionId);
              return (sum as number) + (option?.priceDelta || 0);
            }, 0)
          : 0),
      tax_code: 'standard',
    }));

    const request: AnrokCalculateTaxRequest = {
      currency_code: 'USD',
      line_items: lineItems,
      shipping_amount: shippingCost,
      delivery_address: {
        country_code: 'US',
        state_province_region: shippingState,
        postal_code: shippingZip,
        city: shippingCity,
      },
    };

    const response = await fetch('https://api.anrok.com/v1/tax/calculate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Anrok API error: ${error.message || response.statusText}`);
    }

    const data = (await response.json()) as AnrokCalculateTaxResponse;

    const taxAmount = data.tax_amount;
    const taxRate = data.effective_tax_rate * 100; // Convert to percentage

    return {
      subtotal: data.subtotal,
      taxableAmount: data.subtotal,
      taxRate: Math.round(taxRate * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round((data.subtotal + shippingCost + taxAmount) * 100) / 100,
      provider: 'Anrok',
    };
  } catch (error) {
    console.error('Anrok tax calculation failed:', error);
    throw error;
  }
}
