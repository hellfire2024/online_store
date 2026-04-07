import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export interface SquarePaymentSectionHandle {
  pay(
    amount: number,
    orderNumber: string,
    billingDetails: { name: string; email: string },
  ): Promise<PaymentResult>;
}

interface SquarePaymentSectionProps {
  config: {
    applicationId: string;
    locationId: string;
    sandbox: boolean;
  };
}

declare global {
  interface Window {
    Square?: any;
  }
}

/**
 * Square Web Payments SDK card form.
 * Loads Square's SDK from the CDN, initialises the Card element, and exposes
 * a pay() method that tokenises the card and calls our backend.
 */
const SquarePaymentSection = forwardRef<
  SquarePaymentSectionHandle,
  SquarePaymentSectionProps
>(({ config }, ref) => {
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<any>(null);
  const paymentsRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setIsReady(false);
    setLoadError(null);

    if (!config.applicationId || !config.locationId) {
      setLoadError(
        "Square Application ID and Location ID are not configured in Settings → Payment.",
      );
      return;
    }

    const sandboxScriptUrl = "https://sandbox.web.squarecdn.com/v1/square.js";
    const productionScriptUrl = "https://web.squarecdn.com/v1/square.js";
    const scriptUrl = config.sandbox ? sandboxScriptUrl : productionScriptUrl;
    const oppositeUrl = config.sandbox ? productionScriptUrl : sandboxScriptUrl;

    let cancelled = false;

    // Remove the script for the opposite environment to force a clean re-init
    // when switching between sandbox and production.
    const oppositeScript = document.querySelector(
      `script[src="${oppositeUrl}"]`,
    );
    if (oppositeScript) {
      oppositeScript.remove();
      // Clear the global so initSquare always re-initialises from the right SDK.
      delete (window as any).Square;
    }

    // Destroy any existing card to release the previous payments instance.
    if (cardRef.current) {
      cardRef.current.destroy?.().catch(() => {});
      cardRef.current = null;
    }
    paymentsRef.current = null;

    const existingScript = document.querySelector(
      `script[src="${scriptUrl}"]`,
    );

    const loadAndInit = () => {
      if (window.Square) {
        initSquare();
      } else {
        const interval = setInterval(() => {
          if (window.Square) {
            clearInterval(interval);
            if (!cancelled) initSquare();
          }
        }, 100);
      }
    };

    if (!existingScript) {
      const script = document.createElement("script");
      script.src = scriptUrl;
      script.async = true;
      document.body.appendChild(script);
      script.onload = () => { if (!cancelled) initSquare(); };
      script.onerror = () => { if (!cancelled) setLoadError("Failed to load Square payment SDK."); };
    } else {
      loadAndInit();
    }

    async function initSquare() {
      try {
        const payments = window.Square.payments(
          config.applicationId,
          config.locationId,
        );
        paymentsRef.current = payments;
        const card = await payments.card();
        cardRef.current = card;
        if (cardContainerRef.current) {
          await card.attach(cardContainerRef.current);
        }
        if (!cancelled) setIsReady(true);
      } catch (err: any) {
        if (!cancelled)
          setLoadError(err?.message || "Failed to initialise Square card form.");
      }
    }

    return () => {
      cancelled = true;
      cardRef.current?.destroy?.().catch(() => {});
      cardRef.current = null;
      paymentsRef.current = null;
    };
  }, [config.applicationId, config.locationId, config.sandbox]);

  useImperativeHandle(ref, () => ({
    async pay(amount, orderNumber) {
      if (!cardRef.current || !isReady) {
        return {
          success: false,
          error:
            "Square payment form is not ready. Please wait for the card form to load.",
        };
      }
      try {
        const result = await cardRef.current.tokenize();
        if (result.status !== "OK") {
          const errorMsg =
            result.errors?.[0]?.message || "Card tokenisation failed.";
          return { success: false, error: errorMsg };
        }

        const res = await fetch("/api/orders/create-square-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nonce: result.token,
            amount,
            orderNumber,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          return {
            success: false,
            error: data.error || "Square charge failed.",
          };
        }
        return { success: true, transactionId: data.paymentId };
      } catch (err: any) {
        return {
          success: false,
          error: err?.message || "Square payment error.",
        };
      }
    },
  }));

  if (loadError) {
    return (
      <div className="p-3 bg-amber-900/30 border border-amber-500/50 rounded-md text-amber-200 text-sm">
        {loadError}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!isReady && (
        <p className="text-sm text-gray-400">Loading Square payment form…</p>
      )}
      <div
        ref={cardContainerRef}
        className="p-3 bg-slate-900 border border-slate-600 rounded-md"
        style={{ minHeight: 56 }}
      />
    </div>
  );
});

SquarePaymentSection.displayName = "SquarePaymentSection";
export default SquarePaymentSection;
