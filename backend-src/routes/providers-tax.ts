import { Router, Request, Response } from "express";
import Stripe from "stripe";

const router = Router();

/**
 * Stripe Tax calculation endpoint
 */
router.post("/stripe", async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      cartItems,
      shippingCost,
      shippingState,
      shippingZip,
      stripeApiKey,
    } = req.body;

    const resolvedStripeApiKey =
      String(stripeApiKey || "").trim() || process.env.STRIPE_SECRET_KEY;
    if (!resolvedStripeApiKey) {
      return res.status(500).json({
        error: "Stripe API key not configured",
        usesFallback: true,
      });
    }

    const stripe = new Stripe(resolvedStripeApiKey);

    const subtotal = calculateSubtotal(cartItems);

    const lineItems = cartItems.map((item: any) => {
      const itemPrice =
        item.product.price +
        (item.selectedOptions
          ? Object.values(item.selectedOptions).reduce((sum, optionId) => {
              const optionList = item.product.optionLists?.find((ol: any) =>
                ol.options.some((o: any) => o.id === optionId),
              );
              const option = optionList?.options.find(
                (o: any) => o.id === optionId,
              );
              return (sum as number) + (option?.priceDelta || 0);
            }, 0)
          : 0);

      return {
        amount: Math.round(itemPrice * item.quantity * 100),
        tax_code: "txcd_10000000",
      };
    });

    try {
      const taxCalculation = await stripe.tax.calculations.create({
        currency: "usd",
        line_items: lineItems,
        customer_details: {
          address: {
            state: shippingState,
            postal_code: shippingZip,
            country: "US",
          },
        },
      });

      const taxAmount = (taxCalculation.tax_amount_exclusive || 0) / 100;
      const taxRate = subtotal > 0 ? (taxAmount / subtotal) * 100 : 0;

      return res.json({
        subtotal,
        taxableAmount: subtotal,
        taxRate: Math.round(taxRate * 100) / 100,
        taxAmount: Math.round(taxAmount * 100) / 100,
        total: Math.round((subtotal + shippingCost + taxAmount) * 100) / 100,
        stripeTaxTransactionId: taxCalculation.id,
        provider: "Stripe Tax",
      });
    } catch (stripeError: any) {
      console.warn("Stripe Tax calculation failed:", stripeError.message);
      return res.json({
        subtotal,
        taxableAmount: subtotal,
        taxRate: 0,
        taxAmount: 0,
        total: subtotal + shippingCost,
        stripeTaxTransactionId: null,
        usesFallback: true,
        provider: "Stripe Tax",
      });
    }
  } catch (error) {
    console.error("Tax calculation error:", error);
    return res.status(500).json({ error: "Tax calculation failed" });
  }
});

/**
 * TaxJar tax calculation endpoint
 */
router.post("/taxjar", async (req: Request, res: Response): Promise<any> => {
  try {
    const { cartItems, shippingCost, shippingState, shippingZip, apiKey } =
      req.body;

    if (!apiKey) {
      return res.status(400).json({ error: "TaxJar API key required" });
    }

    const subtotal = calculateSubtotal(cartItems);

    const lineItems = cartItems.map((item: any) => ({
      id: item.product.id,
      quantity: item.quantity,
      unit_price:
        item.product.price +
        (item.selectedOptions
          ? Object.values(item.selectedOptions).reduce((sum, optionId) => {
              const optionList = item.product.optionLists?.find((ol: any) =>
                ol.options.some((o: any) => o.id === optionId),
              );
              const option = optionList?.options.find(
                (o: any) => o.id === optionId,
              );
              return (sum as number) + (option?.priceDelta || 0);
            }, 0)
          : 0),
      product_tax_code: "P0000000",
    }));

    const request = {
      from_country: "US",
      from_state: "CA",
      from_zip: "90210",
      to_country: "US",
      to_state: shippingState,
      to_zip: shippingZip,
      amount: subtotal,
      shipping: shippingCost,
      line_items: lineItems,
    };

    const response = await fetch("https://api.taxjar.com/v2/taxes", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = (await response.json()) as any;
      throw new Error(
        `TaxJar API error: ${error.error?.message || response.statusText}`,
      );
    }

    const data = (await response.json()) as any;
    const taxAmount = data.tax.amount_to_collect;
    const taxRate = data.tax.rate * 100;

    return res.json({
      subtotal,
      taxableAmount: data.tax.taxable_amount,
      taxRate: Math.round(taxRate * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round((subtotal + shippingCost + taxAmount) * 100) / 100,
      provider: "TaxJar",
    });
  } catch (error: any) {
    console.error("TaxJar error:", error);
    return res
      .status(500)
      .json({ error: error.message || "TaxJar calculation failed" });
  }
});

/**
 * Avalara AvaTax calculation endpoint
 */
router.post("/avalara", async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      cartItems,
      shippingCost,
      shippingState,
      shippingZip,
      accountId,
      licenseKey,
      environment,
    } = req.body;

    if (!accountId || !licenseKey) {
      return res.status(400).json({ error: "Avalara credentials required" });
    }

    const baseUrl =
      environment === "sandbox"
        ? "https://sandbox-rest.avatax.com/api/v2"
        : "https://rest.avatax.com/api/v2";

    const subtotal = calculateSubtotal(cartItems);

    const lines = cartItems.map((item: any, index: number) => {
      const unitPrice =
        item.product.price +
        (item.selectedOptions
          ? Object.values(item.selectedOptions).reduce((sum, optionId) => {
              const optionList = item.product.optionLists?.find((ol: any) =>
                ol.options.some((o: any) => o.id === optionId),
              );
              const option = optionList?.options.find(
                (o: any) => o.id === optionId,
              );
              return (sum as number) + (option?.priceDelta || 0);
            }, 0)
          : 0);
      return {
        number: String(index + 1),
        description: item.product.name,
        quantity: item.quantity,
        amount: unitPrice * item.quantity,
        taxCode: "P0000000",
      };
    });

    if (shippingCost > 0) {
      lines.push({
        number: String(lines.length + 1),
        description: "Shipping",
        quantity: 1,
        amount: shippingCost,
        taxCode: "FR010100",
      });
    }

    const request = {
      companyCode: accountId,
      type: "SalesOrder",
      date: new Date().toISOString().split("T")[0],
      lines,
      addresses: {
        ShipTo: {
          region: shippingState,
          postalCode: shippingZip,
          country: "US",
        },
      },
      currency: "USD",
    };

    const auth = Buffer.from(`${accountId}:${licenseKey}`).toString("base64");

    const response = await fetch(`${baseUrl}/transactions/create`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = (await response.json()) as any;
      throw new Error(
        `Avalara API error: ${error.errors?.[0]?.message || response.statusText}`,
      );
    }

    const data = (await response.json()) as any;
    const taxAmount = data.totalTaxCalculated || data.totalTax || 0;
    const taxableAmount = data.totalTaxable || subtotal;
    const taxRate = taxableAmount > 0 ? (taxAmount / taxableAmount) * 100 : 0;

    return res.json({
      subtotal,
      taxableAmount,
      taxRate: Math.round(taxRate * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round((subtotal + shippingCost + taxAmount) * 100) / 100,
      provider: "Avalara AvaTax",
    });
  } catch (error: any) {
    console.error("Avalara error:", error);
    return res
      .status(500)
      .json({ error: error.message || "Avalara calculation failed" });
  }
});

/**
 * TaxCloud tax calculation endpoint
 */
router.post("/taxcloud", async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      cartItems,
      shippingCost,
      shippingState,
      shippingZip,
      apiKey,
      userId,
    } = req.body;

    if (!apiKey || !userId) {
      return res.status(400).json({ error: "TaxCloud credentials required" });
    }

    const subtotal = calculateSubtotal(cartItems);

    const cartItems_ = cartItems.map((item: any, index: number) => ({
      Index: index,
      ItemID: item.product.id,
      TIC: "00000",
      Price:
        item.product.price +
        (item.selectedOptions
          ? Object.values(item.selectedOptions).reduce((sum, optionId) => {
              const optionList = item.product.optionLists?.find((ol: any) =>
                ol.options.some((o: any) => o.id === optionId),
              );
              const option = optionList?.options.find(
                (o: any) => o.id === optionId,
              );
              return (sum as number) + (option?.priceDelta || 0);
            }, 0)
          : 0),
      Qty: item.quantity,
    }));

    const request = {
      apiLoginID: userId,
      apiKey: apiKey,
      CustomerID: "CUSTOMER_" + Date.now(),
      CartID: "CART_" + Date.now(),
      CartItems: cartItems_,
      Origin: {
        Address1: "100 Main St",
        City: "Irvine",
        State: "CA",
        Zip5: "92614",
      },
      Destination: {
        Address1: "123 Main St",
        City: "Unknown",
        State: shippingState,
        Zip5: shippingZip.substring(0, 5),
        Zip4: shippingZip.substring(5, 9),
      },
      DeliveryType: 0,
    };

    const response = await fetch(
      "https://api.taxcloud.net/v2/transactions/lookup",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      },
    );

    if (!response.ok) {
      const error = (await response.json()) as any;
      throw new Error(
        `TaxCloud API error: ${error.Message || response.statusText}`,
      );
    }

    const data = (await response.json()) as any;
    const taxAmount = data.Header.TotalTax;
    const taxRate = subtotal > 0 ? (taxAmount / subtotal) * 100 : 0;

    return res.json({
      subtotal,
      taxableAmount: subtotal,
      taxRate: Math.round(taxRate * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round((subtotal + shippingCost + taxAmount) * 100) / 100,
      provider: "TaxCloud",
    });
  } catch (error: any) {
    console.error("TaxCloud error:", error);
    return res
      .status(500)
      .json({ error: error.message || "TaxCloud calculation failed" });
  }
});

/**
 * Zamp tax calculation endpoint
 */
router.post("/zamp", async (req: Request, res: Response): Promise<any> => {
  try {
    const { cartItems, shippingCost, shippingState, shippingZip, apiKey } =
      req.body;

    if (!apiKey) {
      return res.status(400).json({ error: "Zamp API key required" });
    }

    const lineItems = cartItems.map((item: any) => ({
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
              const option = optionList?.options.find(
                (o: any) => o.id === optionId,
              );
              return (sum as number) + (option?.priceDelta || 0);
            }, 0)
          : 0),
      tax_category: "standard",
    }));

    const request = {
      transaction_type: "sale",
      origin_country: "US",
      origin_state: "CA",
      origin_zip: "90210",
      destination_country: "US",
      destination_state: shippingState,
      destination_zip: shippingZip,
      shipping_amount: shippingCost,
      line_items: lineItems,
      currency: "USD",
    };

    const response = await fetch("https://api.zamp.com/v1/calculate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = (await response.json()) as any;
      throw new Error(
        `Zamp API error: ${error.message || response.statusText}`,
      );
    }

    const data = (await response.json()) as any;
    const taxAmount = data.total_tax;
    const taxRate = data.effective_tax_rate * 100;

    return res.json({
      subtotal: data.subtotal,
      taxableAmount: data.subtotal,
      taxRate: Math.round(taxRate * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round((data.subtotal + shippingCost + taxAmount) * 100) / 100,
      provider: "Zamp",
    });
  } catch (error: any) {
    console.error("Zamp error:", error);
    return res
      .status(500)
      .json({ error: error.message || "Zamp calculation failed" });
  }
});

/**
 * Anrok tax calculation endpoint
 */
router.post("/anrok", async (req: Request, res: Response): Promise<any> => {
  try {
    const { cartItems, shippingCost, shippingState, shippingZip, apiKey } =
      req.body;

    if (!apiKey) {
      return res.status(400).json({ error: "Anrok API key required" });
    }

    const lineItems = cartItems.map((item: any) => ({
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
              const option = optionList?.options.find(
                (o: any) => o.id === optionId,
              );
              return (sum as number) + (option?.priceDelta || 0);
            }, 0)
          : 0),
      tax_code: "standard",
    }));

    const request = {
      currency_code: "USD",
      line_items: lineItems,
      shipping_amount: shippingCost,
      delivery_address: {
        country_code: "US",
        state_province_region: shippingState,
        postal_code: shippingZip,
      },
    };

    const response = await fetch("https://api.anrok.com/v1/tax/calculate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = (await response.json()) as any;
      throw new Error(
        `Anrok API error: ${error.message || response.statusText}`,
      );
    }

    const data = (await response.json()) as any;
    const taxAmount = data.tax_amount;
    const taxRate = data.effective_tax_rate * 100;

    return res.json({
      subtotal: data.subtotal,
      taxableAmount: data.subtotal,
      taxRate: Math.round(taxRate * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round((data.subtotal + shippingCost + taxAmount) * 100) / 100,
      provider: "Anrok",
    });
  } catch (error: any) {
    console.error("Anrok error:", error);
    return res
      .status(500)
      .json({ error: error.message || "Anrok calculation failed" });
  }
});

function calculateSubtotal(cartItems: any[]): number {
  return cartItems.reduce((total, item) => {
    const basePrice = item.product.price;
    const optionsDelta = item.selectedOptions
      ? Object.values(item.selectedOptions).reduce((sum, optionId) => {
          const optionList = item.product.optionLists?.find((ol: any) =>
            ol.options.some((o: any) => o.id === optionId),
          );
          const option = optionList?.options.find(
            (o: any) => o.id === optionId,
          );
          return (sum as number) + (option?.priceDelta || 0);
        }, 0)
      : 0;

    return total + (basePrice + optionsDelta) * item.quantity;
  }, 0);
}

export default router;
