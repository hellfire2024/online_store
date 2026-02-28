/**
 * Zamp Tax Service
 * https://www.zamp.com/
 */

export interface ZampLineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_category: string;
}

export interface ZampCalculateRequest {
  transaction_type: 'sale' | 'refund';
  origin_country: string;
  origin_state?: string;
  origin_zip?: string;
  destination_country: string;
  destination_state: string;
  destination_zip: string;
  destination_city?: string;
  shipping_amount: number;
  line_items: ZampLineItem[];
  currency: string;
}

export interface ZampCalculateResponse {
  transaction_id: string;
  total_amount: number;
  subtotal: number;
  shipping_amount: number;
  total_tax: number;
  effective_tax_rate: number;
  line_items: Array<{
    id: string;
    tax: number;
    tax_rate: number;
  }>;
  tax_jurisdictions: Array<{
    jurisdiction_name: string;
    jurisdiction_type: string;
    tax_rate: number;
    tax_amount: number;
  }>;
}

export async function calculateTaxWithZamp(
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
    throw new Error('Zamp API key not configured');
  }

  try {
    const lineItems: ZampLineItem[] = cartItems.map((item: any) => ({
      id: item.product.id,
      description: item.product.name,
      quantity: item.quantity,
      unit_price:
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
      tax_category: 'standard',
    }));

    const request: ZampCalculateRequest = {
      transaction_type: 'sale',
      origin_country: 'US',
      origin_state: 'CA',
      origin_zip: '90210',
      destination_country: 'US',
      destination_state: shippingState,
      destination_zip: shippingZip,
      destination_city: shippingCity,
      shipping_amount: shippingCost,
      line_items: lineItems,
      currency: 'USD',
    };

    const response = await fetch('https://api.zamp.com/v1/calculate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Zamp API error: ${error.message || response.statusText}`);
    }

    const data = (await response.json()) as ZampCalculateResponse;

    const taxAmount = data.total_tax;
    const taxRate = data.effective_tax_rate * 100; // Convert to percentage

    return {
      subtotal: data.subtotal,
      taxableAmount: data.subtotal,
      taxRate: Math.round(taxRate * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round((data.subtotal + shippingCost + taxAmount) * 100) / 100,
      provider: 'Zamp',
    };
  } catch (error) {
    console.error('Zamp tax calculation failed:', error);
    throw error;
  }
}
