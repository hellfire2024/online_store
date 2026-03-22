import React, { forwardRef, useImperativeHandle } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

export interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  error?: string;
}

export interface StripePaymentSectionHandle {
  pay: (
    amount: number,
    orderNumber: string,
    billingDetails: { name: string; email: string },
  ) => Promise<PaymentResult>;
}

const StripePaymentSection = forwardRef<StripePaymentSectionHandle>(
  (_props, ref) => {
    const stripe = useStripe();
    const elements = useElements();

    useImperativeHandle(ref, () => ({
      pay: async (amount, orderNumber, billingDetails) => {
        if (!stripe || !elements) {
          return {
            success: false,
            error: "Payment system not ready. Please wait and try again.",
          };
        }

        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
          return { success: false, error: "Card input not found." };
        }

        // Step 1: Create PaymentIntent on the backend
        let clientSecret: string;
        try {
          const response = await fetch("/api/orders/create-payment-intent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount, orderNumber }),
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            return {
              success: false,
              error:
                errData.error ||
                "Failed to initialize payment. Please try again.",
            };
          }

          const data = await response.json();
          clientSecret = data.clientSecret;
        } catch {
          return {
            success: false,
            error: "Network error while starting payment.",
          };
        }

        // Step 2: Confirm card payment using Stripe.js (card never touches our server)
        const result = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: billingDetails,
          },
        });

        if (result.error) {
          return { success: false, error: result.error.message };
        }

        if (result.paymentIntent?.status === "succeeded") {
          return { success: true, paymentIntentId: result.paymentIntent.id };
        }

        return {
          success: false,
          error: "Payment was not completed. Please try again.",
        };
      },
    }));

    const cardElementOptions = {
      style: {
        base: {
          color: "#ffffff",
          fontFamily: "inherit",
          fontSize: "16px",
          "::placeholder": { color: "#9ca3af" },
        },
        invalid: { color: "#ef4444" },
      },
    };

    return (
      <div className="p-3 bg-slate-700 border border-slate-600 rounded-md shadow-sm focus-within:ring-2 focus-within:ring-sky-500 focus-within:border-sky-500">
        <CardElement options={cardElementOptions} />
      </div>
    );
  },
);

StripePaymentSection.displayName = "StripePaymentSection";

export default StripePaymentSection;
