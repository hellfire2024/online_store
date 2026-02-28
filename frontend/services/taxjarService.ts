/**
 * TaxJar Tax Calculation Service
 * https://www.taxjar.com/api/
 */

export interface TaxJarLineItem {
  id: string;
  quantity: number;
  unit_price: number;
  product_tax_code?: string;
}

export interface TaxJarCalculateRequest {
  from_country: string;
  from_state: string;
  from_zip: string;
  from_city?: string;
  to_country: string;
  to_state: string;
  to_zip: string;
  to_city?: string;
  amount: number;
  shipping: number;
  line_items: TaxJarLineItem[];
}

export interface TaxJarCalculateResponse {
  tax: {
    order_total_amount: number;
    shipping: number;
    taxable_amount: number;
    amount_to_collect: number;
    rate: number;
    has_nexus: boolean;
    freight_taxable: boolean;
    tax_source: string;
    jurisdictions: {
      country: string;
      state: string;
      county: string;
      city: string;
    };
    breakdown: {
      city_tax_collectable_amount?: number;
      county_tax_collectable_amount?: number;
      state_tax_collectable_amount?: number;
      district_tax_collectable_amount?: number;
    };
  };
}

export async function calculateTaxWithTaxJar(
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
    throw new Error('TaxJar API key not configured');
  }

  try {
    const subtotal = cartItems.reduce((sum: number, item: any) => {
      const basePrice = item.product.price;
      const optionsDelta = item.selectedOptions
        ? Object.values(item.selectedOptions).reduce((optSum: number, optionId: any) => {
            const optionList = item.product.optionLists?.find((ol: any) =>
              ol.options.some((o: any) => o.id === optionId),
            );
            const option = optionList?.options.find((o: any) => o.id === optionId);
            return optSum + (option?.priceDelta || 0);
          }, 0)
        : 0;
      return sum + (basePrice + optionsDelta) * item.quantity;
    }, 0);

    const lineItems: TaxJarLineItem[] = cartItems.map((item: any) => ({
      id: item.product.id,
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
      product_tax_code: 'P0000000', // General product code
    }));

    const request: TaxJarCalculateRequest = {
      from_country: 'US',
      from_state: 'CA', // Default origin state
      from_zip: '90210',
      to_country: 'US',
      to_state: shippingState,
      to_zip: shippingZip,
      to_city: shippingCity,
      amount: subtotal,
      shipping: shippingCost,
      line_items: lineItems,
    };

    const response = await fetch('https://api.taxjar.com/v2/taxes', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`TaxJar API error: ${error.error?.message || response.statusText}`);
    }

    const data = (await response.json()) as TaxJarCalculateResponse;

    const taxAmount = data.tax.amount_to_collect;
    const taxRate = data.tax.rate * 100; // Convert to percentage

    return {
      subtotal,
      taxableAmount: data.tax.taxable_amount,
      taxRate: Math.round(taxRate * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round((subtotal + shippingCost + taxAmount) * 100) / 100,
      provider: 'TaxJar',
    };
  } catch (error) {
    console.error('TaxJar tax calculation failed:', error);
    throw error;
  }
}
