import React, { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCustomerAuth } from "../context/CustomerAuthContext";
import { useToast } from "../hooks/useToast";
import { useSiteSettings } from "../context/SiteSettingsContext";
import { useCart } from "../context/CartContext";
import { useProducts } from "../context/ProductContext";
import { CustomerOrder, CartItem } from "../types";
import Pagination from "../components/Pagination";
import {
  downloadInvoicePDF,
  InvoiceData,
  DEFAULT_TEMPLATE,
} from "../services/pdfInvoiceGenerator";
import { apiClient } from "../services/apiClient";

interface CustomerQuoteLineItem {
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  productId?: string;
  imageUrl?: string;
  requiresPhotoUpload?: boolean;
}

interface CustomerQuote {
  id: string;
  quoteNumber: string;
  status: "draft" | "sent" | "accepted" | "expired" | "cancelled";
  notes?: string;
  lineItems: CustomerQuoteLineItem[];
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  total: number;
  createdAt: string;
  sentAt?: string;
  acceptedAt?: string;
}

// Watermarked Image Component for Order Display
const WatermarkedOrderImage: React.FC<{ src: string }> = ({ src }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw the image
      ctx.drawImage(img, 0, 0);

      // Add AdaptiveGIS watermark
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.font = "bold 48px Arial";
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Rotate and add watermark text diagonally
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(-Math.PI / 4);

      // Add watermark text multiple times for coverage
      ctx.fillText("AdaptiveGIS", 0, -100);
      ctx.fillText("AdaptiveGIS", 0, 0);
      ctx.fillText("AdaptiveGIS", 0, 100);

      ctx.restore();
    };
    img.src = src;
  }, [src]);

  return (
    <canvas
      ref={canvasRef}
      className="w-16 h-16 object-cover rounded border-2 border-slate-600"
      style={{ maxWidth: "100%", height: "auto" }}
    />
  );
};

const CustomerOrdersPage: React.FC = () => {
  const { customer, isAuthenticated, isLoading, fetchOrders } =
    useCustomerAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { siteSettings } = useSiteSettings();
  const { addToCart } = useCart();
  const { products } = useProducts();
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(
    null,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("date-desc");
  const [quotes, setQuotes] = useState<CustomerQuote[]>([]);
  const [loadingQuoteId, setLoadingQuoteId] = useState<string | null>(null);
  const [quoteUploads, setQuoteUploads] = useState<
    Record<string, Record<number, { dataUrl: string; fileName: string }>>
  >({});
  const orderWatermarkText =
    `${siteSettings?.logoText || "AdaptiveGIS"} ${siteSettings?.logoTextAccent || "Store"}`.trim();
  const commissionedWorkIcon = "/commissioned-work.svg";

  const handleQuoteUploadChange = (
    quoteId: string,
    itemIndex: number,
    file: File | null,
  ) => {
    if (!file) {
      setQuoteUploads((prev) => {
        const quoteEntry = { ...(prev[quoteId] || {}) };
        delete quoteEntry[itemIndex];
        return { ...prev, [quoteId]: quoteEntry };
      });
      return;
    }

    if (!file.type.startsWith("image/")) {
      addToast("Please upload an image file", "error");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = String(reader.result || "");
      setQuoteUploads((prev) => ({
        ...prev,
        [quoteId]: {
          ...(prev[quoteId] || {}),
          [itemIndex]: {
            dataUrl,
            fileName: file.name,
          },
        },
      }));
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    fetchOrders();
  }, [isAuthenticated, isLoading, navigate, fetchOrders]);

  useEffect(() => {
    const loadQuotes = async () => {
      if (!customer?.id || !isAuthenticated) {
        setQuotes([]);
        return;
      }

      try {
        const quoteData = await apiClient.quotes.getForCustomer(customer.id);
        setQuotes(Array.isArray(quoteData) ? quoteData : []);
      } catch (error) {
        console.error("Failed to fetch customer quotes:", error);
        setQuotes([]);
      }
    };

    void loadQuotes();
  }, [customer?.id, isAuthenticated]);

  if (!customer) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <p className="text-gray-400">Please log in to view your orders</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-900 text-yellow-200";
      case "processing":
        return "bg-blue-900 text-blue-200";
      case "shipped":
        return "bg-purple-900 text-purple-200";
      case "delivered":
        return "bg-green-900 text-green-200";
      case "cancelled":
        return "bg-red-900 text-red-200";
      default:
        return "bg-gray-900 text-gray-200";
    }
  };

  const handleDownloadInvoice = async (order: CustomerOrder) => {
    const invoiceData: InvoiceData = {
      orderNumber: order.orderNumber,
      orderDate: order.date,
      storeName:
        `${siteSettings?.logoText || "Your"} ${siteSettings?.logoTextAccent || "Store"}`.trim(),
      customerName: order.shippingAddress.fullName,
      customerEmail: customer?.email || "N/A",
      customerPhone: order.shippingAddress.phone,
      shippingAddress: {
        street: order.shippingAddress.streetAddress,
        city: order.shippingAddress.city,
        state: order.shippingAddress.state,
        zip: order.shippingAddress.zipCode,
        country: "USA",
      },
      items: order.items.map((item: any) => ({
        id:
          item.id ||
          (item.product && item.product.id) ||
          `item-${Math.random()}`,
        name:
          item.name || (item.product && item.product.name) || "Unknown Item",
        quantity: item.quantity,
        price: Number(item.price || (item.product && item.product.price) || 0),
        total:
          Number(item.price || (item.product && item.product.price) || 0) *
          item.quantity,
        selectedOptions:
          typeof item.selectedOptions === "string"
            ? item.selectedOptions
            : undefined,
        customText: item.customText,
        customTextCost: item.customTextCost,
        customization: item.customization,
        customImageCost: item.customImageCost,
        optionsBreakdown: item.optionsBreakdown,
      })),
      subtotal: order.subtotal || order.total * 0.9,
      tax: order.taxAmount || order.total * 0.1,
      shipping: order.shippingCost || 0,
      total: order.total,
      trackingNumber: order.trackingNumber,
      paymentMethod: "Credit Card",
      notes: `Order Status: ${order.status}`,
    };
    const template = siteSettings?.invoiceTemplate || DEFAULT_TEMPLATE;
    await downloadInvoicePDF(invoiceData, template);
  };

  const handleReorder = async (order: CustomerOrder) => {
    try {
      let itemsAdded = 0;

      for (const item of order.items) {
        // Get the actual item name - could be in item.name (stored format) or item.product.name (alternate format)
        const itemName =
          (item as any).name ||
          (item.product && item.product.name) ||
          "Unknown Item";

        const productId =
          (item as any).productId ||
          (item.product && item.product.id) ||
          (item as any).product?.id;

        // Find the product by id first, then fallback to name
        const product =
          products.find((p) => p.id === productId) ||
          products.find((p) => p.name === itemName);

        if (!product) {
          addToast(`Product "${itemName}" is no longer available`, "info");
          continue;
        }

        // Reconstruct CartItem from order item
        const rawSelectedOptions =
          (item as any).selectedOptionsRaw || (item as any).selectedOptions;

        const selectedOptions =
          rawSelectedOptions && typeof rawSelectedOptions === "object"
            ? rawSelectedOptions
            : undefined;

        const cartItem: CartItem = {
          product,
          quantity: item.quantity,
          selectedOptions,
          customization: (item as any).customization,
          customText: (item as any).customText,
        };

        addToCart(cartItem);
        itemsAdded++;
      }

      if (itemsAdded > 0) {
        addToast(
          `${itemsAdded} item(s) added to cart from order #${order.orderNumber}`,
          "success",
        );
        navigate("/cart");
      } else {
        addToast("No items could be added to cart", "error");
      }
    } catch (error) {
      console.error("Error during reorder:", error);
      addToast("Failed to reorder items", "error");
    }
  };

  const handleAddQuoteToCart = async (quote: CustomerQuote) => {
    if (loadingQuoteId) return;

    if (!quote.lineItems || quote.lineItems.length === 0) {
      addToast("This quote has no line items", "error");
      return;
    }

    try {
      setLoadingQuoteId(quote.id);
      let added = 0;

      quote.lineItems.forEach((item, idx) => {
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unitPrice || 0);
        if (!item.name || quantity <= 0 || unitPrice < 0) {
          return;
        }

        const uploadedForItem = quoteUploads[quote.id]?.[idx];
        if (item.requiresPhotoUpload && !uploadedForItem?.dataUrl) {
          return;
        }

        const quoteProduct = {
          id: item.productId || `quote-${quote.id}-${idx}`,
          name: item.name,
          price: unitPrice,
          description:
            item.description || `Custom quote item from ${quote.quoteNumber}`,
          imageUrl: commissionedWorkIcon,
          inventory: 9999,
          customizable: Boolean(item.requiresPhotoUpload),
          allowCustomImageUpload: Boolean(item.requiresPhotoUpload),
          customImageUploadPrice: 0,
        };

        addToCart({
          product: quoteProduct,
          quantity,
          customization:
            item.requiresPhotoUpload && uploadedForItem
              ? {
                  type: "upload",
                  value: uploadedForItem.dataUrl,
                  fileName: uploadedForItem.fileName,
                }
              : undefined,
        });
        added += 1;
      });

      if (added === 0) {
        addToast(
          "Please upload required photo(s) before adding this quote to cart",
          "error",
        );
        return;
      }

      await apiClient.quotes.accept(quote.id);
      setQuotes((prev) =>
        prev.map((q) =>
          q.id === quote.id
            ? {
                ...q,
                status: "accepted",
                acceptedAt: new Date().toISOString(),
              }
            : q,
        ),
      );

      addToast(`Quote ${quote.quoteNumber} added to cart`, "success");
      navigate("/cart");
    } catch (error) {
      console.error("Failed to add quote to cart:", error);
      addToast(
        `Failed to add quote to cart: ${error instanceof Error ? error.message : "Unknown error"}`,
        "error",
      );
    } finally {
      setLoadingQuoteId(null);
    }
  };

  const exportOrdersToCSV = () => {
    if (!customer || customer.orders.length === 0) return;

    const ordersToExport = getFilteredOrders();
    const headers = [
      "Order Number",
      "Order Date",
      "Total Amount",
      "Status",
      "Items Count",
      "Tracking Number",
    ];
    const rows = ordersToExport.map((order) => [
      order.orderNumber,
      new Date(order.date).toLocaleDateString(),
      `$${Number(order.total).toFixed(2)}`,
      order.status,
      order.items.length,
      order.trackingNumber || "N/A",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      "",
      "Summary",
      `Total Orders,${ordersToExport.length}`,
      `Total Spent,$${ordersToExport.reduce((sum, order) => sum + order.total, 0).toFixed(2)}`,
      `Average Order Value,$${(ordersToExport.reduce((sum, order) => sum + order.total, 0) / ordersToExport.length).toFixed(2)}`,
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `orders_${customer.email}_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast("Orders exported successfully", "success");
  };

  const getFilteredOrders = (): CustomerOrder[] => {
    if (!customer) return [];

    let filtered = customer.orders;

    // Filter by status
    if (filterStatus !== "all") {
      filtered = filtered.filter((o) => o.status === filterStatus);
    }

    // Filter by date range
    if (filterStartDate) {
      const startDate = new Date(filterStartDate);
      filtered = filtered.filter((o) => new Date(o.date) >= startDate);
    }

    if (filterEndDate) {
      const endDate = new Date(filterEndDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((o) => new Date(o.date) <= endDate);
    }

    return filtered;
  };

  const calculateSummaryStats = () => {
    const orders = getFilteredOrders();
    const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);
    return {
      count: orders.length,
      totalSpent,
      average: orders.length > 0 ? totalSpent / orders.length : 0,
    };
  };

  const sortOrders = (orders: CustomerOrder[]): CustomerOrder[] => {
    const sorted = [...orders];
    switch (sortBy) {
      case "date-desc":
        return sorted.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
      case "date-asc":
        return sorted.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );
      case "amount-desc":
        return sorted.sort((a, b) => b.total - a.total);
      case "amount-asc":
        return sorted.sort((a, b) => a.total - b.total);
      default:
        return sorted;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return "⏳";
      case "processing":
        return "⚙️";
      case "shipped":
        return "🚚";
      case "delivered":
        return "✅";
      case "cancelled":
        return "❌";
      default:
        return "📦";
    }
  };

  const getStatusProgressPercentage = (status: string) => {
    switch (status) {
      case "pending":
        return 25;
      case "processing":
        return 50;
      case "shipped":
        return 75;
      case "delivered":
        return 100;
      case "cancelled":
        return 0;
      default:
        return 0;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">My Orders</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/account")}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-colors flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Account
          </button>
          {customer && customer.orders.length > 0 && (
            <button
              onClick={exportOrdersToCSV}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-md transition-colors inline-flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Export to CSV
            </button>
          )}
        </div>
      </div>

      {/* Summary Statistics */}
      {customer &&
        customer.orders.length > 0 &&
        (() => {
          const stats = calculateSummaryStats();
          return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                <p className="text-gray-400 text-sm">Total Orders</p>
                <p className="text-white text-2xl font-bold">{stats.count}</p>
              </div>
              <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                <p className="text-gray-400 text-sm">Total Spent</p>
                <p className="text-white text-2xl font-bold">
                  ${Number(stats.totalSpent).toFixed(2)}
                </p>
              </div>
              <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                <p className="text-gray-400 text-sm">Average Order</p>
                <p className="text-white text-2xl font-bold">
                  ${Number(stats.average).toFixed(2)}
                </p>
              </div>
            </div>
          );
        })()}

      {/* Custom Quotes */}
      {quotes.length > 0 && (
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Custom Quotes</h2>
            <span className="text-sm text-gray-400">
              {quotes.length} available
            </span>
          </div>

          <div className="space-y-2">
            {quotes.map((quote) => (
              <div
                key={quote.id}
                className="bg-slate-700/50 border border-slate-600 rounded p-3"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <img
                      src={commissionedWorkIcon}
                      alt="Commissioned work"
                      className="w-10 h-10 rounded border border-slate-600 object-cover"
                    />
                    <div>
                      <p className="text-white font-semibold">
                        {quote.quoteNumber}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(quote.createdAt).toLocaleDateString()} •{" "}
                        {quote.lineItems.length} item
                        {quote.lineItems.length !== 1 ? "s" : ""}
                      </p>
                      {quote.notes && (
                        <p className="text-sm text-gray-300 mt-1">
                          {quote.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-white font-bold text-lg">
                      ${Number(quote.total).toFixed(2)}
                    </p>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs capitalize ${
                        quote.status === "accepted"
                          ? "bg-green-900 text-green-200"
                          : quote.status === "sent"
                            ? "bg-blue-900 text-blue-200"
                            : "bg-slate-800 text-gray-300"
                      }`}
                    >
                      {quote.status}
                    </span>
                  </div>
                </div>

                {quote.lineItems.some((item) => item.requiresPhotoUpload) && (
                  <div className="mt-3 mb-3 p-3 bg-slate-800 rounded border border-slate-600">
                    <p className="text-sm text-sky-300 font-medium mb-2">
                      Photo Upload Required
                    </p>
                    <div className="space-y-2">
                      {quote.lineItems.map((item, idx) => {
                        if (!item.requiresPhotoUpload) return null;

                        const uploaded = quoteUploads[quote.id]?.[idx];
                        return (
                          <div
                            key={`${quote.id}-upload-${idx}`}
                            className="flex flex-col md:flex-row md:items-center gap-2"
                          >
                            <label className="text-xs text-gray-300 md:w-72">
                              {item.name}
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) =>
                                handleQuoteUploadChange(
                                  quote.id,
                                  idx,
                                  e.target.files?.[0] || null,
                                )
                              }
                              className="text-xs text-gray-300"
                            />
                            {uploaded?.fileName && (
                              <span className="text-xs text-green-300">
                                Uploaded: {uploaded.fileName}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => handleAddQuoteToCart(quote)}
                    disabled={
                      loadingQuoteId === quote.id ||
                      quote.status === "cancelled" ||
                      quote.status === "expired"
                    }
                    className="px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingQuoteId === quote.id
                      ? "Adding..."
                      : quote.status === "accepted"
                        ? "Add to Cart Again"
                        : "Add Quote to Cart"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters and Sort */}
      {customer && customer.orders.length > 0 && (
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 rounded bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="all">All Orders</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                From Date
              </label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => {
                  setFilterStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 rounded bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => {
                  setFilterEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 rounded bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 rounded bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="amount-desc">Highest Amount</option>
                <option value="amount-asc">Lowest Amount</option>
              </select>
            </div>
          </div>
          {(filterStatus !== "all" || filterStartDate || filterEndDate) && (
            <button
              onClick={() => {
                setFilterStatus("all");
                setFilterStartDate("");
                setFilterEndDate("");
                setCurrentPage(1);
              }}
              className="px-3 py-1 text-sm bg-slate-700 text-gray-300 rounded hover:bg-slate-600"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {!customer || customer.orders.length === 0 ? (
        <div className="bg-slate-800 p-8 rounded-lg border border-slate-700 text-center">
          <p className="text-gray-400 mb-4">
            No orders yet. Start shopping to place your first order!
          </p>
          <Link
            to="/store"
            className="inline-block px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        (() => {
          const filteredOrders = getFilteredOrders();
          const sortedOrders = sortOrders(filteredOrders);
          const paginatedOrders =
            itemsPerPage === -1
              ? sortedOrders
              : sortedOrders.slice(
                  (currentPage - 1) * itemsPerPage,
                  currentPage * itemsPerPage,
                );

          return filteredOrders.length === 0 ? (
            <div className="bg-slate-800 p-8 rounded-lg border border-slate-700 text-center">
              <p className="text-gray-400">No orders match your filters</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {paginatedOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden hover:border-slate-600 transition"
                  >
                    {/* Order Header - Always Visible */}
                    <div
                      className="p-4 cursor-pointer hover:bg-slate-700/30 transition"
                      onClick={() =>
                        setSelectedOrder(
                          selectedOrder?.id === order.id ? null : order,
                        )
                      }
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-lg font-bold text-white">
                              Order #{order.orderNumber}
                            </h3>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(order.status)}`}
                            >
                              {getStatusIcon(order.status)} {order.status}
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="mb-3">
                            <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  order.status === "delivered"
                                    ? "bg-green-500"
                                    : order.status === "cancelled"
                                      ? "bg-red-500"
                                      : "bg-sky-500"
                                }`}
                                style={{
                                  width: `${getStatusProgressPercentage(order.status)}%`,
                                }}
                              />
                            </div>
                          </div>

                          {/* Quick Info */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                            <div>
                              <p className="text-gray-400">Date</p>
                              <p className="text-white font-medium">
                                {new Date(order.date).toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400">Total</p>
                              <p className="text-white font-bold text-lg">
                                ${Number(order.total).toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400">Items</p>
                              <p className="text-white font-medium">
                                {order.items.length} product
                                {order.items.length !== 1 ? "s" : ""}
                              </p>
                            </div>
                            {order.trackingNumber && (
                              <div>
                                <p className="text-gray-400">Tracking</p>
                                <p className="text-sky-400 font-mono text-xs">
                                  {order.trackingNumber}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div
                          className={`ml-4 shrink-0 flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-200 ${
                            selectedOrder?.id === order.id
                              ? "border-sky-400/50 bg-sky-500/15 text-sky-300"
                              : "border-slate-600 bg-slate-700/40 text-slate-300"
                          }`}
                        >
                          <svg
                            className={`w-4 h-4 transition-transform duration-200 ${
                              selectedOrder?.id === order.id ? "rotate-180" : ""
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
                              d="M6 9l6 6 6-6"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Details */}
                    {selectedOrder?.id === order.id && (
                      <div className="bg-slate-700/30 border-t border-slate-600 p-4 space-y-4">
                        {/* Items List */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-300 mb-3">
                            Order Items
                          </h4>
                          <div className="space-y-3 max-h-60 overflow-y-auto">
                            {order.items.map((item: any, idx) => {
                              const productFromItem =
                                item.product ||
                                products.find(
                                  (product) =>
                                    product.id === item.productId ||
                                    product.id === item.product?.id ||
                                    product.name === item.name,
                                );

                              const productName =
                                item.name ||
                                item.productName ||
                                productFromItem?.name ||
                                item.product?.name ||
                                "Unknown Item";

                              const basePrice =
                                item.basePrice ||
                                item.price ||
                                productFromItem?.price ||
                                item.product?.price ||
                                0;

                              const totalItemPrice =
                                basePrice * (item.quantity || 1);
                              const hasOptions =
                                item.optionsBreakdown &&
                                item.optionsBreakdown.length > 0;
                              const customTextCost = item.customTextCost || 0;

                              let selectedOptionsText =
                                typeof item.selectedOptions === "string"
                                  ? item.selectedOptions
                                  : "";

                              if (
                                !selectedOptionsText &&
                                item.selectedOptions &&
                                productFromItem?.optionLists
                              ) {
                                const optionParts: string[] = [];
                                productFromItem.optionLists.forEach(
                                  (list: any) => {
                                    const selectedOptionIds =
                                      item.selectedOptions?.[list.id] || [];
                                    if (Array.isArray(selectedOptionIds)) {
                                      selectedOptionIds.forEach(
                                        (optionId: string) => {
                                          const option = list.options.find(
                                            (o: any) => o.id === optionId,
                                          );
                                          if (option) {
                                            optionParts.push(
                                              `${list.name}: ${option.name}`,
                                            );
                                          }
                                        },
                                      );
                                    }
                                  },
                                );
                                selectedOptionsText = optionParts.join(", ");
                              }

                              const productImageSrc =
                                item.productImage ||
                                item.imageUrl ||
                                productFromItem?.imageUrl ||
                                item.product?.imageUrl ||
                                "";

                              const customImageCost = item.customImageCost || 0;

                              return (
                                <div
                                  key={idx}
                                  className="bg-slate-800/50 rounded border border-slate-700 p-3"
                                >
                                  <div className="flex gap-3">
                                    {productImageSrc && (
                                      <div className="shrink-0">
                                        <div
                                          className="relative w-16 h-16 rounded border border-slate-600 overflow-hidden select-none"
                                          onContextMenu={(e) =>
                                            e.preventDefault()
                                          }
                                          onDragStart={(e) =>
                                            e.preventDefault()
                                          }
                                        >
                                          <img
                                            src={productImageSrc}
                                            alt={productName}
                                            className="w-full h-full object-cover"
                                            draggable={false}
                                            onContextMenu={(e) =>
                                              e.preventDefault()
                                            }
                                            onDragStart={(e) =>
                                              e.preventDefault()
                                            }
                                            onError={(e) => {
                                              (
                                                e.target as HTMLImageElement
                                              ).src =
                                                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23475569' width='100' height='100'/%3E%3Ctext x='50' y='50' font-size='12' fill='%239ca3af' text-anchor='middle' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E";
                                            }}
                                          />
                                          <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                            <div className="absolute -left-1/2 -top-1/3 w-[200%] rotate-[-30deg] opacity-40 text-white text-[7px] font-bold leading-3 whitespace-nowrap [text-shadow:0_0_2px_rgba(0,0,0,0.9)]">
                                              {orderWatermarkText}{" "}
                                              {orderWatermarkText}{" "}
                                              {orderWatermarkText}
                                              <br />
                                              {orderWatermarkText}{" "}
                                              {orderWatermarkText}{" "}
                                              {orderWatermarkText}
                                              <br />
                                              {orderWatermarkText}{" "}
                                              {orderWatermarkText}{" "}
                                              {orderWatermarkText}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-white font-medium truncate">
                                        {productName}
                                      </p>
                                      <div className="text-gray-400 text-xs space-y-1 mt-1">
                                        <div className="flex justify-between">
                                          <span>Base Price:</span>
                                          <span>
                                            ${Number(basePrice).toFixed(2)}
                                          </span>
                                        </div>
                                        {selectedOptionsText && (
                                          <div className="text-sky-400">
                                            Selections: {selectedOptionsText}
                                          </div>
                                        )}
                                        {hasOptions && (
                                          <div className="space-y-1">
                                            <div className="text-gray-300">
                                              Options:
                                            </div>
                                            {item.optionsBreakdown.map(
                                              (option: any, optIdx: number) => (
                                                <div
                                                  key={optIdx}
                                                  className="flex justify-between"
                                                >
                                                  <span>{option.label}</span>
                                                  <span>
                                                    +$
                                                    {Number(
                                                      option.priceDelta,
                                                    ).toFixed(2)}
                                                  </span>
                                                </div>
                                              ),
                                            )}
                                          </div>
                                        )}
                                        {item.customText && (
                                          <div className="text-gray-300">
                                            Custom Text: "{item.customText}"
                                            {customTextCost > 0 && (
                                              <span className="text-gray-400">
                                                {" "}
                                                • +$
                                                {Number(customTextCost).toFixed(
                                                  2,
                                                )}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                        {customImageCost > 0 && (
                                          <div className="text-gray-300">
                                            Custom Image Upload Fee: +$
                                            {Number(customImageCost).toFixed(2)}
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex justify-between font-semibold text-white pt-2 border-t border-slate-600 mt-2 text-sm">
                                        <span>Qty: {item.quantity}</span>
                                        <span>
                                          ${Number(totalItemPrice).toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  {item.customization && (
                                    <div className="mt-3 bg-slate-700/50 p-3 rounded-lg border border-slate-600">
                                      <div className="flex items-start gap-3">
                                        <WatermarkedOrderImage
                                          src={item.customization.value}
                                        />
                                        <div className="flex-1">
                                          <p className="text-sm text-gray-300">
                                            <span className="font-semibold text-sky-400">
                                              {item.customization.type ===
                                              "gallery"
                                                ? "Gallery Design"
                                                : "Uploaded Design"}
                                            </span>
                                            {item.customization.fileName && (
                                              <span className="text-gray-500">
                                                {" "}
                                                • {item.customization.fileName}
                                              </span>
                                            )}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Price Breakdown */}
                        <div className="bg-slate-800/50 p-3 rounded space-y-2 border border-slate-600">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Subtotal</span>
                            <span className="text-white">
                              ${(order.total * 0.9).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">
                              Tax (estimated)
                            </span>
                            <span className="text-white">
                              ${(Number(order.total) * 0.1).toFixed(2)}
                            </span>
                          </div>
                          <div className="border-t border-slate-600 pt-2 flex justify-between">
                            <span className="text-white font-bold">Total</span>
                            <span className="text-white font-bold text-lg">
                              ${Number(order.total).toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Shipping Address */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-slate-800/50 p-3 rounded border border-slate-600">
                            <h5 className="text-sm font-semibold text-gray-300 mb-2">
                              Shipping Address
                            </h5>
                            <p className="text-white text-sm font-medium">
                              {order.shippingAddress.fullName}
                            </p>
                            <p className="text-gray-300 text-sm">
                              {order.shippingAddress.streetAddress}
                            </p>
                            <p className="text-gray-300 text-sm">
                              {order.shippingAddress.city},{" "}
                              {order.shippingAddress.state}{" "}
                              {order.shippingAddress.zipCode}
                            </p>
                            <p className="text-gray-300 text-xs mt-2">
                              {order.shippingAddress.phone}
                            </p>
                          </div>
                          <div className="bg-slate-800/50 p-3 rounded border border-slate-600">
                            <h5 className="text-sm font-semibold text-gray-300 mb-2">
                              Order Information
                            </h5>
                            <p className="text-gray-300 text-sm">
                              <span className="text-gray-400">Status:</span>{" "}
                              <span className="capitalize text-white font-medium">
                                {order.status}
                              </span>
                            </p>
                            <p className="text-gray-300 text-sm">
                              <span className="text-gray-400">Order Date:</span>{" "}
                              <span className="text-white font-medium">
                                {new Date(order.date).toLocaleDateString()}
                              </span>
                            </p>
                            {order.trackingNumber && (
                              <p className="text-gray-300 text-sm">
                                <span className="text-gray-400">Tracking:</span>{" "}
                                <span className="text-sky-400 font-mono text-xs">
                                  {order.trackingNumber}
                                </span>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate("/support", {
                                state: {
                                  orderId: order.id,
                                  orderNumber: order.orderNumber,
                                  orderDate: order.date,
                                  subject: `Order ${order.orderNumber} support request`,
                                },
                              });
                            }}
                            className="flex-1 px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 transition text-sm"
                          >
                            📧 Contact Support
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReorder(order);
                            }}
                            className="flex-1 px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-500 transition text-sm"
                          >
                            🔄 Reorder
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadInvoice(order);
                            }}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm"
                          >
                            📄 Invoice
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <Pagination
                currentPage={currentPage}
                totalItems={sortedOrders.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(value) => {
                  setItemsPerPage(value);
                  setCurrentPage(1);
                }}
              />
            </>
          );
        })()
      )}
    </div>
  );
};

export default CustomerOrdersPage;
