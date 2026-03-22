import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../services/apiClient";
import { useToast } from "../hooks/useToast";

const formatCardNumber = (value: string): string =>
  value
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();

const formatCvc = (value: string): string =>
  value.replace(/\D/g, "").slice(0, 4);

const OrderPaymentPage: React.FC = () => {
  const { orderNumber = "" } = useParams<{ orderNumber: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [cardNumber, setCardNumber] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [cvc, setCvc] = useState("");

  useEffect(() => {
    const loadOrder = async () => {
      try {
        const response = await apiClient.orders.getById(orderNumber);
        setOrder(response || null);
      } catch (error) {
        console.error("Failed to load payment order:", error);
        setOrder(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (!orderNumber) {
      setIsLoading(false);
      return;
    }

    loadOrder();
  }, [orderNumber]);

  const orderTotal = useMemo(() => {
    const totalFromData = Number(order?.orderData?.total || 0);
    if (totalFromData > 0) return totalFromData;
    return Number(order?.total || 0);
  }, [order]);

  const isCardReady =
    cardNumber.replace(/\s/g, "").length === 16 &&
    expiryMonth.length > 0 &&
    expiryYear.length > 0 &&
    cvc.length >= 3;

  const handleSubmitPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!orderNumber || !isCardReady || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await apiClient.orders.updateWorkflow(orderNumber, {
        status: "processing",
        paymentStatus: "paid",
        approvalNotes: "Customer completed payment via payment link.",
      });

      addToast("Payment submitted successfully.", "success");
      navigate(
        `/order-confirmation?orderNumber=${encodeURIComponent(orderNumber)}`,
      );
    } catch (error) {
      console.error("Payment submission failed:", error);
      addToast("Unable to process payment right now.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center text-gray-300 py-10">
        Loading payment link...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-xl mx-auto bg-slate-800 border border-slate-700 rounded-lg p-6 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">
          Payment Link Not Found
        </h1>
        <p className="text-gray-300 mb-4">
          This payment link is invalid or the order could not be loaded.
        </p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h1 className="text-2xl font-bold text-white">
          Complete Order Payment
        </h1>
        <p className="text-gray-300 mt-2">Order {order.orderNumber}</p>
        <p className="text-sky-300 text-xl font-semibold mt-3">
          ${orderTotal.toFixed(2)}
        </p>
      </div>

      <form
        onSubmit={handleSubmitPayment}
        className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4"
      >
        <h2 className="text-xl font-semibold text-white">Payment Details</h2>
        <input
          type="text"
          placeholder="Card Number"
          value={cardNumber}
          onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
          className="w-full px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400"
          inputMode="numeric"
          maxLength={19}
          required
        />
        <div className="grid grid-cols-3 gap-3">
          <select
            value={expiryMonth}
            onChange={(e) => setExpiryMonth(e.target.value)}
            className="px-4 py-2 rounded bg-slate-700 text-white"
            required
          >
            <option value="">Month</option>
            {Array.from({ length: 12 }, (_, i) =>
              String(i + 1).padStart(2, "0"),
            ).map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
          <select
            value={expiryYear}
            onChange={(e) => setExpiryYear(e.target.value)}
            className="px-4 py-2 rounded bg-slate-700 text-white"
            required
          >
            <option value="">Year</option>
            {Array.from({ length: 11 }, (_, i) =>
              String(new Date().getFullYear() + i),
            ).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="CVC"
            value={cvc}
            onChange={(e) => setCvc(formatCvc(e.target.value))}
            className="px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400"
            inputMode="numeric"
            required
          />
        </div>
        <button
          type="submit"
          disabled={!isCardReady || isSubmitting}
          className="w-full px-4 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 disabled:opacity-50"
        >
          {isSubmitting ? "Processing Payment..." : "Pay Now"}
        </button>
      </form>
    </div>
  );
};

export default OrderPaymentPage;
