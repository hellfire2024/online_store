import { Router } from "express";
import Stripe from "stripe";
const router = Router();
/**
 * Tax calculation endpoint using Stripe Tax API
 * Requires Stripe API key to be configured
 */
router.post("/calculate", async (req, res) => {
    try {
        const { cartItems, shippingCost, shippingState, shippingZip } = req.body;
        // Get Stripe API key from environment
        const stripeApiKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeApiKey) {
            return res.status(500).json({
                error: "Stripe API key not configured",
                usesFallback: true,
            });
        }
        const stripe = new Stripe(stripeApiKey);
        // Calculate subtotal and prepare line items for Stripe Tax
        const subtotal = calculateSubtotal(cartItems);
        // Build line items for Stripe Tax calculation
        const lineItems = cartItems.map((item) => {
            const itemPrice = item.product.price +
                (item.selectedOptions
                    ? Object.values(item.selectedOptions).reduce((sum, optionId) => {
                        const optionList = item.product.optionLists?.find((ol) => ol.options.some((o) => o.id === optionId));
                        const option = optionList?.options.find((o) => o.id === optionId);
                        return sum + (option?.priceDelta || 0);
                    }, 0)
                    : 0);
            return {
                amount: Math.round(itemPrice * item.quantity * 100), // Convert to cents
                tax_code: "txcd_10000000", // General sales tax (Stripe default)
            };
        });
        // Call Stripe Tax calculation
        // Note: In demo mode or without Stripe account, this will fail
        // In production, you'd have a Stripe account with Tax enabled
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
            const taxAmount = (taxCalculation.tax_amount_exclusive || 0) / 100; // Convert cents to dollars
            const taxRate = subtotal > 0 ? (taxAmount / subtotal) * 100 : 0;
            return res.json({
                subtotal,
                taxableAmount: subtotal,
                taxRate: Math.round(taxRate * 100) / 100, // Round to 2 decimals
                taxAmount: Math.round(taxAmount * 100) / 100,
                total: Math.round((subtotal + shippingCost + taxAmount) * 100) / 100,
                stripeTaxTransactionId: taxCalculation.id,
            });
        }
        catch (stripeError) {
            // Fallback to simple calculation if Stripe Tax fails
            console.warn("Stripe Tax calculation failed, using fallback:", stripeError.message);
            return res.json({
                subtotal,
                taxableAmount: subtotal,
                taxRate: 0,
                taxAmount: 0,
                total: subtotal + shippingCost,
                stripeTaxTransactionId: null,
                usesFallback: true,
            });
        }
    }
    catch (error) {
        console.error("Tax calculation error:", error);
        return res.status(500).json({ error: "Tax calculation failed" });
    }
});
/**
 * Calculate subtotal from cart items
 */
function calculateSubtotal(cartItems) {
    return cartItems.reduce((total, item) => {
        const basePrice = item.product.price;
        const optionsDelta = item.selectedOptions
            ? Object.values(item.selectedOptions).reduce((sum, optionId) => {
                const optionList = item.product.optionLists?.find((ol) => ol.options.some((o) => o.id === optionId));
                const option = optionList?.options.find((o) => o.id === optionId);
                return sum + (option?.priceDelta || 0);
            }, 0)
            : 0;
        return total + (basePrice + optionsDelta) * item.quantity;
    }, 0);
}
export default router;
//# sourceMappingURL=tax.js.map