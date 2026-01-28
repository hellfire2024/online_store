/**
 * TaxCloud Service
 * https://taxcloud.net/apicenter
 */

export interface TaxCloudLineItem {
  Index: number;
  ItemID: string;
  TIC: string; // Tax Item Code
  Price: number;
  Qty: number;
}

export interface TaxCloudLookupRequest {
  apiLoginID: string;
  apiKey: string;
  CustomerID: string;
  CartID: string;
  CartItems: TaxCloudLineItem[];
  Origin: {
    Address1: string;
    Address2?: string;
    City: string;
    State: string;
    Zip5: string;
    Zip4?: string;
  };
  Destination: {
    Address1: string;
    Address2?: string;
    City: string;
    State: string;
    Zip5: string;
    Zip4?: string;
  };
  DeliveryType?: number;
}

export interface TaxCloudLookupResponse {
  LookupID: string;
  CartItems: Array<{
    Index: number;
    ItemID: string;
    TIC: string;
    Price: number;
    Qty: number;
    Tax: number;
  }>;
  CartItemsShipping: Array<{
    Index: number;
    Tax: number;
  }>;
  Header: {
    TotalShipping: number;
    TotalTax: number;
    CartTotal: number;
  };
}

export async function calculateTaxWithTaxCloud(
  apiKey: string,
  userId: string,
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
  if (!apiKey || !userId) {
    throw new Error('TaxCloud credentials not configured');
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

    const cartItems_: TaxCloudLineItem[] = cartItems.map((item: any, index: number) => ({
      Index: index,
      ItemID: item.product.id,
      TIC: '00000', // Default tax code
      Price:
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
      Qty: item.quantity,
    }));

    const request: TaxCloudLookupRequest = {
      apiLoginID: userId,
      apiKey: apiKey,
      CustomerID: 'CUSTOMER_' + Date.now(), // Unique customer ID
      CartID: 'CART_' + Date.now(), // Unique cart ID
      CartItems: cartItems_,
      Origin: {
        Address1: '100 Main St',
        City: 'Irvine',
        State: 'CA',
        Zip5: '92614',
      },
      Destination: {
        Address1: '123 Main St',
        City: shippingCity || 'Unknown',
        State: shippingState,
        Zip5: shippingZip.substring(0, 5),
        Zip4: shippingZip.substring(5, 9),
      },
      DeliveryType: 0, // Standard delivery
    };

    const response = await fetch(
      'https://api.taxcloud.net/v2/transactions/lookup',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`TaxCloud API error: ${error.Message || response.statusText}`);
    }

    const data = (await response.json()) as TaxCloudLookupResponse;

    const taxAmount = data.Header.TotalTax;
    const taxRate = subtotal > 0 ? (taxAmount / subtotal) * 100 : 0;

    return {
      subtotal,
      taxableAmount: subtotal,
      taxRate: Math.round(taxRate * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round((subtotal + shippingCost + taxAmount) * 100) / 100,
      provider: 'TaxCloud',
    };
  } catch (error) {
    console.error('TaxCloud tax calculation failed:', error);
    throw error;
  }
}
