/**
 * Avalara AvaTax Service
 * https://developer.avalara.com/api/avatax/
 */

export interface AvaTaxLineItem {
  number: string;
  description: string;
  quantity: number;
  amount: number;
  taxCode: string;
}

export interface AvaTaxRequest {
  companyCode: string;
  type: 'SalesOrder' | 'PurchaseOrder' | 'ReturnOrder' | 'ReverseChargeOrder' | 'Any';
  date: string;
  lines: AvaTaxLineItem[];
  addresses: {
    ShipFrom?: { latitude?: number; longitude?: number };
    ShipTo: { city?: string; region: string; postalCode: string; country: string };
  };
  currency?: string;
}

export interface AvaTaxResponse {
  id: number;
  status: string;
  totalTax: number;
  totalTaxable: number;
  totalTaxCalculated: number;
  lines: Array<{
    lineNumber: string;
    taxableAmount: number;
    tax: number;
    taxCalculated: number;
    lineAmount: number;
  }>;
  summary: Array<{
    country: string;
    region: string;
    taxName: string;
    taxable: number;
    tax: number;
    rate: number;
    tax_calculated: number;
    nonTaxable: number;
  }>;
}

export async function calculateTaxWithAvalara(
  accountId: string,
  licenseKey: string,
  environment: 'sandbox' | 'production',
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
  if (!accountId || !licenseKey) {
    throw new Error('Avalara AvaTax credentials not configured');
  }

  try {
    const baseUrl =
      environment === 'sandbox'
        ? 'https://sandbox-rest.avatax.com/api/v2'
        : 'https://rest.avatax.com/api/v2';

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

    const lines: AvaTaxLineItem[] = cartItems.map((item: any, index: number) => {
      const unitPrice =
        item.product.price +
        (item.selectedOptions
          ? Object.values(item.selectedOptions).reduce((sum, optionId) => {
              const optionList = item.product.optionLists?.find((ol: any) =>
                ol.options.some((o: any) => o.id === optionId),
              );
              const option = optionList?.options.find((o: any) => o.id === optionId);
              return (sum as number) + (option?.priceDelta || 0);
            }, 0)
          : 0);
      return {
        number: String(index + 1),
        description: item.product.name,
        quantity: item.quantity,
        amount: unitPrice * item.quantity,
        taxCode: 'P0000000', // General product
      };
    });

    // Add shipping as a line item
    if (shippingCost > 0) {
      lines.push({
        number: String(lines.length + 1),
        description: 'Shipping',
        quantity: 1,
        amount: shippingCost,
        taxCode: 'FR010100', // Freight
      });
    }

    const request: AvaTaxRequest = {
      companyCode: accountId,
      type: 'SalesOrder',
      date: new Date().toISOString().split('T')[0],
      lines,
      addresses: {
        ShipTo: {
          region: shippingState,
          postalCode: shippingZip,
          country: 'US',
          city: shippingCity,
        },
      },
      currency: 'USD',
    };

    const auth = Buffer.from(`${accountId}:${licenseKey}`).toString('base64');

    const response = await fetch(`${baseUrl}/transactions/create`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Avalara API error: ${error.errors?.[0]?.message || response.statusText}`);
    }

    const data = (await response.json()) as AvaTaxResponse;

    const taxAmount = data.totalTaxCalculated || data.totalTax || 0;
    const taxableAmount = data.totalTaxable || subtotal;
    const taxRate = taxableAmount > 0 ? (taxAmount / taxableAmount) * 100 : 0;

    return {
      subtotal,
      taxableAmount,
      taxRate: Math.round(taxRate * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round((subtotal + shippingCost + taxAmount) * 100) / 100,
      provider: 'Avalara AvaTax',
    };
  } catch (error) {
    console.error('Avalara tax calculation failed:', error);
    throw error;
  }
}
