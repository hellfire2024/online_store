import React from "react";
import { PayPalButtons } from "@paypal/react-paypal-js";

export interface PayPalPaymentSectionProps {
  onCreateOrder: () => Promise<string>;
  onApprove: (captureId: string) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

/**
 * Renders PayPal smart buttons.  Flow:
 * 1. User clicks "Pay with PayPal"
 * 2. onCreateOrder() → calls our backend → returns the PayPal orderId
 * 3. PayPal popup opens; user approves
 * 4. Our backend captures → captureId returned
 * 5. onApprove(captureId) is called so the parent can complete the order
 */
const PayPalPaymentSection: React.FC<PayPalPaymentSectionProps> = ({
  onCreateOrder,
  onApprove,
  onError,
  disabled = false,
}) => {
  return (
    <div className="space-y-3 rounded-lg bg-white p-4 border border-slate-300">
      <p className="text-sm text-slate-700">
        Click the button below to pay via PayPal. You will be redirected to
        complete payment.
      </p>
      <div className={disabled ? "opacity-50 pointer-events-none" : ""}>
        <PayPalButtons
          style={{
            layout: "vertical",
            color: "gold",
            shape: "rect",
            label: "paypal",
          }}
          createOrder={async () => {
            try {
              return await onCreateOrder();
            } catch (err: any) {
              onError(err?.message || "Failed to create PayPal order");
              throw err;
            }
          }}
          onApprove={async (data) => {
            try {
              const res = await fetch("/api/orders/capture-paypal-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: data.orderID }),
              });
              const result = await res.json();
              if (!res.ok) {
                onError(result.error || "Failed to capture PayPal payment");
                return;
              }
              onApprove(result.captureId);
            } catch (err: any) {
              onError(err?.message || "PayPal capture failed");
            }
          }}
          onError={(err) => {
            console.error("PayPal error:", err);
            onError("PayPal encountered an error. Please try again.");
          }}
          onCancel={() => {
            onError("PayPal payment was cancelled.");
          }}
        />
      </div>
    </div>
  );
};

export default PayPalPaymentSection;
