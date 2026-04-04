import React, { useState, useEffect, useRef, useMemo } from "react";
import { ShippingRate, ShippingRateRequest } from "../types";

interface ShippingRateSelectorProps {
  rateRequest: ShippingRateRequest;
  selectedRate: ShippingRate | null;
  onSelectRate: (rate: ShippingRate) => void;
  disabled?: boolean;
}

const ShippingRateSelector: React.FC<ShippingRateSelectorProps> = ({
  rateRequest,
  selectedRate,
  onSelectRate,
  disabled,
}) => {
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [isUnavailable, setIsUnavailable] = useState(false);
  // Track the last zip+state we fetched for, to avoid duplicate requests
  const lastFetchKey = useRef<string>("");

  const resolveCarrierNetwork = (rate: ShippingRate): string => {
    const haystack = `${rate.serviceName} ${rate.service}`.toLowerCase();

    if (haystack.includes("usps")) return "USPS";
    if (haystack.includes("ups")) return "UPS";
    if (haystack.includes("fedex")) return "FedEx";
    if (haystack.includes("dhl")) return "DHL";

    return "Other";
  };

  const groupedRates = useMemo(() => {
    const groups: Record<string, ShippingRate[]> = {
      USPS: [],
      UPS: [],
      FedEx: [],
      DHL: [],
      Other: [],
    };

    rates.forEach((rate) => {
      const network = resolveCarrierNetwork(rate);
      groups[network].push(rate);
    });

    return groups;
  }, [rates]);

  const carrierOrder = ["USPS", "UPS", "FedEx", "DHL", "Other"];

  useEffect(() => {
    const zip = rateRequest.toAddress?.zip || "";
    const state = rateRequest.toAddress?.state || "";
    const street1 = rateRequest.toAddress?.street1 || "";
    const fromZip = rateRequest.fromAddress?.zip || "";

    // Need at least a complete to-address zip AND a configured from-address zip
    if (!zip || !state || !street1 || !fromZip) return;

    const fetchKey = `${zip}|${state}|${fromZip}`;
    if (fetchKey === lastFetchKey.current) return;
    lastFetchKey.current = fetchKey;

    const fetchRates = async () => {
      setIsLoading(true);
      setError(null);
      setWarning(null);
      setIsUnavailable(false);

      try {
        const response = await fetch("/api/shipping/rates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rateRequest),
        });
        const raw = await response.text();
        const data = raw.trim() ? JSON.parse(raw) : {};

        if (!response.ok) {
          throw new Error(data?.error || "Shipping rates request failed");
        }

        const warnings = Array.isArray(data?.warnings) ? data.warnings : [];
        const backendErrors =
          data?.errors && typeof data.errors === "object"
            ? Object.values(data.errors)
            : [];
        const noteText = [...warnings, ...backendErrors]
          .filter((entry) => typeof entry === "string" && entry.trim().length)
          .join(" ");
        if (noteText) {
          setWarning(noteText);
        }

        if (
          data.unavailable ||
          (Array.isArray(data.rates) && data.rates.length === 0)
        ) {
          setIsUnavailable(true);
          setRates([]);
          return;
        }

        const fetchedRates: ShippingRate[] = data.rates || [];
        // Sort by price ascending
        fetchedRates.sort((a, b) => a.rate - b.rate);
        setRates(fetchedRates);

        // Auto-select cheapest when none selected or selected rate is no longer valid
        const stillValid =
          !!selectedRate &&
          fetchedRates.some((rate) => rate.id === selectedRate.id);
        if (fetchedRates.length > 0 && !stillValid) {
          onSelectRate(fetchedRates[0]);
        }
      } catch (err) {
        setError("Could not load shipping rates. Flat rate will apply.");
        setRates([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    rateRequest.toAddress?.zip,
    rateRequest.toAddress?.state,
    rateRequest.toAddress?.street1,
    rateRequest.fromAddress?.zip,
  ]);

  if (isLoading) {
    return (
      <div className="py-4 text-center text-gray-400 text-sm animate-pulse">
        Getting shipping rates…
      </div>
    );
  }

  if (isUnavailable || rates.length === 0) {
    return (
      <div className="text-xs text-amber-400 mt-2">
        {warning ||
          error ||
          "No live shipping rates available. Flat rate will apply."}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-gray-400">
        Carrier breakdown:{" "}
        {carrierOrder
          .map((carrier) => ({ carrier, count: groupedRates[carrier].length }))
          .filter(({ count }) => count > 0)
          .map(({ carrier, count }) => `${carrier} (${count})`)
          .join(" • ")}
      </div>

      {carrierOrder.map((carrier) => {
        const carrierRates = groupedRates[carrier];
        if (!carrierRates.length) return null;

        return (
          <div key={carrier} className="space-y-2">
            <div className="text-[11px] uppercase tracking-wide text-slate-400">
              {carrier}
            </div>
            {carrierRates.map((rate) => (
              <label
                key={rate.id}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedRate?.id === rate.id
                    ? "border-sky-500 bg-sky-500/10 text-white"
                    : "border-slate-600 text-gray-300 hover:border-slate-500"
                } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="shippingRate"
                    checked={selectedRate?.id === rate.id}
                    onChange={() => !disabled && onSelectRate(rate)}
                    disabled={disabled}
                    className="accent-sky-500"
                  />
                  <div>
                    <span className="font-medium text-sm">
                      {rate.serviceName}
                    </span>
                    {rate.estimatedDays > 0 && (
                      <span className="text-xs text-gray-400 ml-2">
                        {rate.estimatedDays === 1
                          ? "1 business day"
                          : `${rate.estimatedDays} business days`}
                      </span>
                    )}
                  </div>
                </div>
                <span className="font-semibold text-sm">
                  ${(rate.rate / 100).toFixed(2)}
                </span>
              </label>
            ))}
          </div>
        );
      })}
      {warning && <p className="text-xs text-amber-400 mt-1">{warning}</p>}
      {error && <p className="text-xs text-amber-400 mt-1">{error}</p>}
    </div>
  );
};

export default ShippingRateSelector;
