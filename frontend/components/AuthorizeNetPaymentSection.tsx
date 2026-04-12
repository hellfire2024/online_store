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

export interface AuthorizeNetPaymentSectionHandle {
  pay(
    amount: number,
    orderNumber: string,
    billingDetails: { name: string; email: string },
  ): Promise<PaymentResult>;
}

interface AuthorizeNetPaymentSectionProps {
  config: {
    apiLoginId: string;
    publicClientKey: string;
    sandbox: boolean;
  };
}

declare global {
  interface Window {
    Accept?: {
      dispatchData: (
        secureData: {
          authData: { clientKey: string; apiLoginID: string };
          cardData: {
            cardNumber: string;
            month: string;
            year: string;
            cardCode: string;
          };
        },
        callback: (response: any) => void,
      ) => void;
    };
  }
}

const inputClasses =
  "w-full p-2 bg-slate-900 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-sky-500";

/**
 * Authorize.Net Accept.js payment form.
 * Card data is tokenised by Accept.js before touching our servers (PCI SAQ A-EP).
 */
const AuthorizeNetPaymentSection = forwardRef<
  AuthorizeNetPaymentSectionHandle,
  AuthorizeNetPaymentSectionProps
>(({ config }, ref) => {
  const [cardNumber, setCardNumber] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [cvc, setCvc] = useState("");
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Format card number with spaces
  const handleCardNumberChange = (value: string) => {
    const digits = value.replace(/\D/g, "").substring(0, 16);
    const formatted = digits.replace(/(.{4})/g, "$1 ").trim();
    setCardNumber(formatted);
  };

  // Format expiry as MM/YY
  const handleExpiryChange = (value: string) => {
    const digits = value.replace(/\D/g, "").substring(0, 4);
    if (digits.length >= 3) {
      setExpiryMonth(digits.substring(0, 2));
      setExpiryYear(digits.substring(2));
    } else {
      setExpiryMonth(digits.substring(0, 2));
      setExpiryYear("");
    }
  };

  const expiryDisplay =
    expiryMonth +
    (expiryYear ? "/" + expiryYear : expiryMonth.length === 2 ? "/" : "");

  useEffect(() => {
    if (!config.apiLoginId || !config.publicClientKey) {
      setLoadError(
        "Authorize.Net API Login ID or Public Client Key not configured in Settings → Payment.",
      );
      return;
    }

    setLoadError(null);
    setIsScriptLoaded(false);

    const sandboxUrl = "https://jstest.authorize.net/v1/Accept.js";
    const productionUrl = "https://js.authorize.net/v1/Accept.js";
    const scriptSrc = config.sandbox ? sandboxUrl : productionUrl;
    const oppositeSrc = config.sandbox ? productionUrl : sandboxUrl;

    // Remove opposite env script so Accept.js matches the selected mode.
    document
      .querySelectorAll(`script[src="${oppositeSrc}"]`)
      .forEach((node) => node.parentElement?.removeChild(node));

    // Force reload to avoid stale global Accept instance between env switches.
    document
      .querySelectorAll(`script[src="${scriptSrc}"]`)
      .forEach((node) => node.parentElement?.removeChild(node));

    const script = document.createElement("script");
    script.src = scriptSrc;
    script.async = true;
    script.onload = () => setIsScriptLoaded(true);
    script.onerror = () =>
      setLoadError("Failed to load Authorize.Net Accept.js.");
    document.body.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, [config.apiLoginId, config.publicClientKey, config.sandbox]);

  useImperativeHandle(ref, () => ({
    async pay(amount, orderNumber) {
      if (!isScriptLoaded || !window.Accept) {
        return {
          success: false,
          error: "Authorize.Net payment SDK is not ready.",
        };
      }

      const rawCard = cardNumber.replace(/\s/g, "");
      if (!rawCard || rawCard.length < 15) {
        return { success: false, error: "Please enter a valid card number." };
      }
      if (!expiryMonth || !expiryYear) {
        return { success: false, error: "Please enter the card expiry date." };
      }
      if (!cvc || cvc.length < 3) {
        return { success: false, error: "Please enter the CVV/CVC code." };
      }

      return new Promise<PaymentResult>((resolve) => {
        const secureData = {
          authData: {
            clientKey: config.publicClientKey,
            apiLoginID: config.apiLoginId,
          },
          cardData: {
            cardNumber: rawCard,
            month: expiryMonth,
            year: expiryYear.length === 2 ? "20" + expiryYear : expiryYear,
            cardCode: cvc,
          },
        };

        window.Accept!.dispatchData(secureData, async (response: any) => {
          if (response.messages.resultCode === "Error") {
            const codes: string[] = (response.messages.message || []).map(
              (m: any) => m.code || "",
            );
            const texts: string[] = (response.messages.message || []).map(
              (m: any) => m.text || "",
            );
            console.error("[Authorize.Net Accept.js error]", { codes, texts, response });
            let msg = texts[0] || "Card tokenisation failed.";
            // E_WC_14 = authentication failed → Public Client Key mismatch
            if (
              codes.includes("E_WC_14") ||
              msg.toLowerCase().includes("authentication")
            ) {
              msg =
                msg +
                " — Your Public Client Key in Settings → Payment is invalid or does not match your API Login ID. " +
                "Log into " +
                (config.sandbox ? "sandbox.authorize.net" : "authorize.net") +
                " → Account → Settings → General Security Settings → Manage Public Client Key and paste the correct key.";
            }
            resolve({ success: false, error: msg });
            return;
          }

          const { dataDescriptor, dataValue } = response.opaqueData;

          try {
            const res = await fetch("/api/orders/charge-authorize-net", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                dataDescriptor,
                dataValue,
                amount,
                orderNumber,
              }),
            });
            const data = await res.json();
            if (!res.ok) {
              resolve({
                success: false,
                error: data.error || "Authorize.Net charge failed.",
              });
            } else {
              resolve({ success: true, transactionId: data.transactionId });
            }
          } catch (err: any) {
            resolve({
              success: false,
              error: err?.message || "Authorize.Net payment error.",
            });
          }
        });
      });
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
    <div className="space-y-4 p-4 bg-slate-900/50 border border-slate-700 rounded-lg">
      <div>
        <label className="block text-xs text-gray-400 mb-1">Card Number</label>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="1234 5678 9012 3456"
          value={cardNumber}
          onChange={(e) => handleCardNumberChange(e.target.value)}
          maxLength={19}
          className={inputClasses}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Expiry (MM/YY)
          </label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM/YY"
            value={expiryDisplay}
            onChange={(e) => handleExpiryChange(e.target.value)}
            maxLength={5}
            className={inputClasses}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">CVV</label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="123"
            value={cvc}
            onChange={(e) =>
              setCvc(e.target.value.replace(/\D/g, "").substring(0, 4))
            }
            maxLength={4}
            className={inputClasses}
          />
        </div>
      </div>
      {!isScriptLoaded && (
        <p className="text-xs text-gray-500">
          Loading Authorize.Net secure payment…
        </p>
      )}
    </div>
  );
});

AuthorizeNetPaymentSection.displayName = "AuthorizeNetPaymentSection";
export default AuthorizeNetPaymentSection;
