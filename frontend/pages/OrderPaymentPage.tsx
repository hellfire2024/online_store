import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../services/apiClient";

const OrderPaymentPage: React.FC = () => {
  const { orderNumber = "" } = useParams<{ orderNumber: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [paymentStatusMessage, setPaymentStatusMessage] = useState(
    "Online payment is not configured for this store.",
  );

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

  useEffect(() => {
    const loadPaymentStatus = async () => {
      try {
        const settings = await apiClient.settings.get();
        const provider = String(settings?.paymentProvider || "none");
        const providerKeys = (settings?.paymentApiKeys || {}) as Record<
          string,
          unknown
        >;
        const providerKey = String(providerKeys[provider] || "").trim();
        const providerConfigured =
          provider !== "none" && providerKey.length > 0;

        if (providerConfigured) {
          setPaymentStatusMessage(
            "Payment gateway is configured, but customer self-service payment capture is not enabled in this build.",
          );
          return;
        }

        setPaymentStatusMessage(
          provider === "none"
            ? "Online payment is not configured for this store."
            : "Payment provider credentials are missing. Online payment is unavailable.",
        );
      } catch {
        setPaymentStatusMessage(
          "Unable to verify payment gateway configuration right now. Please contact support to complete payment.",
        );
      }
    };

    loadPaymentStatus();
  }, []);

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

      <div className="bg-slate-800 border border-amber-600/50 rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold text-amber-200">
          Online Payment Unavailable
        </h2>
        <p className="text-sm text-gray-200">{paymentStatusMessage}</p>
        <p className="text-sm text-gray-300">
          This page does not charge cards and will not mark your order as paid.
          Please contact sales/support to complete payment.
        </p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="w-full px-4 py-3 bg-slate-700 text-white font-semibold rounded-lg hover:bg-slate-600"
        >
          Return Home
        </button>
      </div>
    </div>
  );
};

export default OrderPaymentPage;
