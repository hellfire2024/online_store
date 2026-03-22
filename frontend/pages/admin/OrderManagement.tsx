import React, { useState, useEffect } from "react";
import { EditIcon, TrashIcon } from "../../components/Icons";
import { useToast } from "../../hooks/useToast";
import Pagination from "../../components/Pagination";
import { apiClient } from "../../services/apiClient";

interface OrderItem {
  productName: string;
  quantity: number;
  price: number;
  customization?: {
    type: "gallery" | "upload";
    value: string;
    fileName?: string;
  };
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  date: string;
  total: number;
  status:
    | "pending"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "approval_requested";
  items: OrderItem[];
  trackingNumber?: string;
  notes?: string;
  paymentStatus?: string;
  requestedPaymentMethod?: string;
}

const isCashOnPickupOrder = (order: Pick<Order, "requestedPaymentMethod">) =>
  order.requestedPaymentMethod === "cash_on_pickup";

const isCashOnPickupPaid = (
  order: Pick<Order, "requestedPaymentMethod" | "paymentStatus" | "status">,
) =>
  isCashOnPickupOrder(order) &&
  order.paymentStatus === "cash_on_pickup_paid" &&
  order.status === "delivered";

const OrderManagement: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "total" | "status">("date");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [formData, setFormData] = useState({
    status: "pending",
    trackingNumber: "",
    shipper: "UPS",
    notes: "",
  });
  const { addToast } = useToast();
  const [workflowNotes, setWorkflowNotes] = useState("");
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [paymentLink, setPaymentLink] = useState("");

  const shippers = ["UPS", "FedEx", "USPS", "DHL", "Other"];

  useEffect(() => {
    const loadOrders = async () => {
      setIsLoading(true);
      try {
        // Try to load orders from API
        const apiOrders = await apiClient.orders.getAll();

        // Ensure we have an array
        const ordersArray = Array.isArray(apiOrders) ? apiOrders : [];

        // Transform API orders to match UI format if needed
        const transformedOrders = ordersArray.map((order: any) => {
          let orderData;
          try {
            orderData =
              typeof order.order_data === "string"
                ? JSON.parse(order.order_data)
                : order.order_data;
          } catch {
            orderData = {};
          }

          const normalizedOrder = {
            id: order.id?.toString() || "",
            orderNumber: order.order_number || "",
            customerName:
              order.customer_name || orderData.customerName || "Unknown",
            customerEmail:
              order.customer_email || orderData.customerEmail || "",
            date: order.created_at || new Date().toISOString(),
            total: orderData.total || 0,
            status: order.status || "pending",
            items: orderData.items || [],
            trackingNumber: order.tracking_number || undefined,
            notes: orderData.notes || undefined,
            paymentStatus: (orderData.payment as any)?.status || undefined,
            requestedPaymentMethod:
              (orderData.payment as any)?.requestedMethod || undefined,
          };

          // Guard against inconsistent legacy states where CoP was marked paid
          // before it was actually delivered.
          if (
            normalizedOrder.requestedPaymentMethod === "cash_on_pickup" &&
            normalizedOrder.paymentStatus === "cash_on_pickup_paid" &&
            normalizedOrder.status !== "delivered"
          ) {
            normalizedOrder.paymentStatus = "cash_on_pickup_requested";
          }

          return normalizedOrder;
        });

        setOrders(transformedOrders);
        setFilteredOrders(transformedOrders);

        if (transformedOrders.length === 0) {
          addToast("No orders found in database", "info");
        }
      } catch (error) {
        console.error(
          "Failed to load orders from API, using mock data:",
          error,
        );

        // Fallback to mock orders when API fails or DB is empty
        const mockOrders: Order[] = [
          {
            id: "1",
            orderNumber: "AGIS-0000000001",
            customerName: "John Doe",
            customerEmail: "john@example.com",
            date: "2026-01-20T10:30:00Z",
            total: 156.99,
            status: "delivered",
            items: [
              { productName: "Custom T-Shirt", quantity: 2, price: 34.99 },
              { productName: "Design Services", quantity: 1, price: 87.01 },
            ],
            trackingNumber: "TRK123456789",
            notes: "Customer requested rush delivery",
          },
          {
            id: "2",
            orderNumber: "AGIS-0000000002",
            customerName: "Jane Smith",
            customerEmail: "jane@example.com",
            date: "2026-01-24T14:15:00Z",
            total: 89.5,
            status: "shipped",
            items: [{ productName: "Hoodie", quantity: 1, price: 89.5 }],
            trackingNumber: "TRK987654321",
          },
          {
            id: "3",
            orderNumber: "AGIS-0000000003",
            customerName: "Bob Johnson",
            customerEmail: "bob@example.com",
            date: "2026-01-26T09:00:00Z",
            total: 45.0,
            status: "processing",
            items: [{ productName: "Cap", quantity: 1, price: 45.0 }],
          },
        ];
        setOrders(mockOrders);
        setFilteredOrders(mockOrders);
        addToast("Using demo orders - backend not connected", "info");
      } finally {
        setIsLoading(false);
      }
    };

    loadOrders();
  }, [addToast]);

  useEffect(() => {
    let filtered = orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    if (filterStatus === "cash_on_pickup") {
      filtered = filtered.filter(
        (o) => isCashOnPickupOrder(o),
      );
    } else if (filterStatus === "cop_awaiting_payment") {
      filtered = filtered.filter(
        (o) =>
          isCashOnPickupOrder(o) &&
          !isCashOnPickupPaid(o) &&
          o.status !== "cancelled",
      );
    } else if (filterStatus !== "all") {
      filtered = filtered.filter((o) => o.status === filterStatus);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "total":
          return b.total - a.total;
        case "status":
          return a.status.localeCompare(b.status);
        case "date":
        default:
          return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });

    setFilteredOrders(filtered);
    setCurrentPage(1);
  }, [searchTerm, filterStatus, sortBy, orders]);

  const handleOpenModal = (order: Order) => {
    setEditingOrder(order);
    setFormData({
      status: order.status,
      trackingNumber: order.trackingNumber || "",
      shipper: "UPS",
      notes: order.notes || "",
    });
    setWorkflowNotes("");
    setPaymentLink("");
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingOrder) return;

    // If marking as shipped, send API call to trigger email
    if (formData.status === "shipped" && formData.trackingNumber) {
      try {
        const response = await fetch(
          `/api/orders/${editingOrder.orderNumber}/ship`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              trackingNumber: formData.trackingNumber,
              shipper: formData.shipper,
            }),
          },
        );

        if (response.ok) {
          addToast("Shipping notification sent to customer!", "success");
        } else {
          addToast("Order updated but email may not have been sent", "error");
        }
      } catch (error) {
        console.error("Error sending shipping notification:", error);
        addToast("Order updated (backend may be offline)", "error");
      }
    }

    const updated = orders.map((o) =>
      o.id === editingOrder.id
        ? {
            ...o,
            status: formData.status as Order["status"],
            trackingNumber: formData.trackingNumber,
            notes: formData.notes,
          }
        : o,
    );
    setOrders(updated);
    setIsModalOpen(false);
    addToast("Order updated successfully", "success");
  };

  const handleDelete = (orderId: string) => {
    setOrders(orders.filter((o) => o.id !== orderId));
    addToast("Order deleted", "success");
  };

  const handleApprovalAction = async (
    order: Order,
    action:
      | "approve_with_payment"
      | "approve_without_payment"
      | "approve_for_pickup"
      | "mark_cash_paid"
      | "decline",
  ) => {
    setWorkflowLoading(true);
    try {
      let workflowData: Record<string, unknown> = {};
      switch (action) {
        case "approve_with_payment":
          workflowData = {
            status: "processing",
            paymentStatus: "pending_offline",
            approvalNotes: workflowNotes || undefined,
          };
          break;
        case "approve_without_payment":
          workflowData = {
            approvedWithoutPayment: true,
            approvalNotes: workflowNotes || undefined,
          };
          break;
        case "approve_for_pickup":
          // Approve CoP order: move to processing but leave paymentStatus as
          // cash_on_pickup_requested until cash is physically received.
          workflowData = {
            status: "processing",
            paymentStatus: "cash_on_pickup_requested",
            approvalNotes: workflowNotes || undefined,
          };
          break;
        case "mark_cash_paid":
          // Admin confirms cash was received in person.
          workflowData = {
            status: "delivered",
            paymentStatus: "cash_on_pickup_paid",
            approvalNotes: workflowNotes || undefined,
          };
          break;
        case "decline":
          workflowData = {
            status: "cancelled",
            paymentStatus: "declined",
            approvalNotes: workflowNotes || undefined,
          };
          break;
      }

      await apiClient.orders.updateWorkflow(order.orderNumber, workflowData);

      const newStatus =
        action === "decline"
          ? ("cancelled" as const)
          : action === "mark_cash_paid"
            ? ("delivered" as const)
            : ("processing" as const);

      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? {
                ...o,
                status: newStatus,
                paymentStatus:
                  (workflowData.paymentStatus as string | undefined) ??
                  o.paymentStatus,
              }
            : o,
        ),
      );

      if (action === "approve_with_payment") {
        const link = `${window.location.origin}/#/pay/${order.orderNumber}`;
        setPaymentLink(link);
        addToast(
          "Order approved. Copy the payment link and share it with the customer.",
          "success",
        );
      } else if (action === "approve_without_payment") {
        setIsModalOpen(false);
        addToast("Order approved without payment requirement.", "success");
      } else if (action === "approve_for_pickup") {
        setIsModalOpen(false);
        addToast(
          "Order approved for cash on pickup — awaiting customer.",
          "success",
        );
      } else if (action === "mark_cash_paid") {
        setIsModalOpen(false);
        addToast(
          "Cash received — order marked as paid and delivered.",
          "success",
        );
      } else if (action === "decline") {
        setIsModalOpen(false);
        addToast("Order request declined.", "success");
      }
    } catch (err) {
      console.error("Approval action failed:", err);
      addToast("Failed to update order. Check your connection.", "error");
    } finally {
      setWorkflowLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approval_requested":
        return "bg-purple-900 text-purple-200";
      case "pending":
        return "bg-orange-900 text-orange-200";
      case "processing":
        return "bg-yellow-900 text-yellow-200";
      case "shipped":
        return "bg-blue-900 text-blue-200";
      case "delivered":
        return "bg-green-900 text-green-200";
      case "cancelled":
        return "bg-red-900 text-red-200";
      default:
        return "bg-gray-900 text-gray-200";
    }
  };

  // Returns badge info for cash-on-pickup orders based on their payment sub-state.
  const getCopBadge = (
    order: Order,
  ): { className: string; label: string } | null => {
    if (!isCashOnPickupOrder(order)) return null;
    if (isCashOnPickupPaid(order))
      return {
        className: "bg-emerald-900 text-emerald-200",
        label: "CoP: Paid ✓",
      };
    if (order.status === "delivered")
      return {
        className: "bg-amber-900 text-amber-200",
        label: "CoP: Delivered - Payment Pending",
      };
    if (order.status === "processing")
      return {
        className: "bg-cyan-900 text-cyan-200",
        label: "CoP: Awaiting Pickup",
      };
    return { className: "bg-teal-900 text-teal-200", label: "Cash on Pickup" };
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        Loading orders...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Order Management</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800 p-4 rounded-lg">
          <input
            type="text"
            placeholder="Search by order #, customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="bg-slate-800 p-4 rounded-lg">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-4 py-2 rounded bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="all">All Status</option>
            <option value="approval_requested">Approval Requested</option>
            <option value="cash_on_pickup">Cash on Pickup (All)</option>
            <option value="cop_awaiting_payment">
              Cash on Pickup – Unpaid
            </option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="bg-slate-800 p-4 rounded-lg">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full px-4 py-2 rounded bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="date">Sort by Date (Newest)</option>
            <option value="total">Sort by Total</option>
            <option value="status">Sort by Status</option>
          </select>
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-700">
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                Order #
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                Date
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">
                Items
              </th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-300">
                Total
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                Status
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedOrders.map((order) => (
              <tr
                key={order.id}
                className="border-t border-slate-700 hover:bg-slate-700/50 cursor-pointer"
                onClick={() =>
                  setSelectedOrder(
                    selectedOrder?.id === order.id ? null : order,
                  )
                }
              >
                <td className="px-6 py-4 text-white font-medium">
                  {order.orderNumber}
                </td>
                <td className="px-6 py-4">
                  <div className="text-white">{order.customerName}</div>
                  <div className="text-gray-400 text-sm">
                    {order.customerEmail}
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-300">
                  {new Date(order.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-gray-300 text-center">
                  {order.items.length}
                </td>
                <td className="px-6 py-4 text-right text-white font-medium">
                  ${Number(order.total).toFixed(2)}
                </td>
                <td className="px-6 py-4">
                  {(() => {
                    const copBadge = getCopBadge(order);
                    if (copBadge) {
                      return (
                        <span
                          className={`px-3 py-1 rounded text-xs font-semibold ${copBadge.className}`}
                        >
                          {copBadge.label}
                        </span>
                      );
                    }
                    return (
                      <span
                        className={`px-3 py-1 rounded text-xs font-semibold ${getStatusColor(order.status)}`}
                      >
                        {order.status === "approval_requested"
                          ? "Approval Request"
                          : order.status.charAt(0).toUpperCase() +
                            order.status.slice(1)}
                      </span>
                    );
                  })()}
                </td>
                <td
                  className="px-6 py-4 space-x-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => handleOpenModal(order)}
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <EditIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(order.id)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedOrder && (
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-4">
            {selectedOrder.orderNumber} Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-gray-400 text-sm">Customer</p>
              <p className="text-white">{selectedOrder.customerName}</p>
              <p className="text-gray-300 text-sm">
                {selectedOrder.customerEmail}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Order Date</p>
              <p className="text-white">
                {new Date(selectedOrder.date).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="mb-4">
            <p className="text-gray-400 text-sm mb-2">Items</p>
            <div className="space-y-3">
              {selectedOrder.items.map((item, idx) => {
                const customUploadImageUrl =
                  item.customization?.type === "upload"
                    ? item.customization.value
                    : undefined;
                const customUploadFileName =
                  item.customization?.type === "upload"
                    ? item.customization.fileName
                    : undefined;

                return (
                  <div key={idx} className="text-gray-300 text-sm">
                    <div>
                      {item.productName} x {item.quantity} = $
                      {(item.price * item.quantity).toFixed(2)}
                    </div>
                    {customUploadImageUrl && (
                      <div className="mt-2">
                        <a
                          href={customUploadImageUrl}
                          download={
                            customUploadFileName ||
                            `${item.productName}-custom-upload.png`
                          }
                          className="inline-flex items-center gap-1 rounded-md border border-slate-600 bg-slate-700 px-2 py-1 text-xs text-sky-300 hover:bg-slate-600 hover:text-sky-200"
                        >
                          Download original upload
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="border-t border-slate-600 pt-4">
            <p className="text-gray-400 text-sm">Total</p>
            <p className="text-2xl font-bold text-white">
              ${Number(selectedOrder.total).toFixed(2)}
            </p>
          </div>
        </div>
      )}

      <Pagination
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        totalItems={filteredOrders.length}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
      />

      {isModalOpen && editingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 p-6 rounded-lg max-w-md w-full">
            <h2 className="text-xl font-bold text-white mb-4">
              Update Order {editingOrder.orderNumber}
            </h2>
            <div className="space-y-4">
              {/* ── Cash on Pickup dedicated panel ─────────────────────── */}
              {isCashOnPickupOrder(editingOrder) &&
                !isCashOnPickupPaid(editingOrder) &&
                editingOrder.status !== "cancelled" && (
                  <div className="rounded-lg border border-teal-500/60 bg-teal-500/10 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-teal-200 font-semibold text-sm">
                        💵 Cash on Pickup
                      </p>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          editingOrder.status === "processing"
                            ? "bg-cyan-900 text-cyan-200"
                            : "bg-teal-900 text-teal-200"
                        }`}
                      >
                        {editingOrder.status === "processing"
                          ? "Awaiting Pickup & Payment"
                          : "Pending Approval"}
                      </span>
                    </div>
                    <p className="text-xs text-teal-300">
                      {editingOrder.status === "processing"
                        ? "Order is approved. Mark as paid once cash is collected in person."
                        : "Approve this order to release it for in-person cash pickup."}
                    </p>
                    <textarea
                      value={workflowNotes}
                      onChange={(e) => setWorkflowNotes(e.target.value)}
                      placeholder="Admin notes (optional)..."
                      rows={2}
                      className="w-full px-3 py-2 rounded bg-slate-700 text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <div className="flex gap-2">
                      {editingOrder.status === "approval_requested" && (
                        <button
                          type="button"
                          disabled={workflowLoading}
                          onClick={() =>
                            handleApprovalAction(
                              editingOrder,
                              "approve_for_pickup",
                            )
                          }
                          className="flex-1 px-3 py-2 text-xs bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
                        >
                          {workflowLoading ? "Saving…" : "Approve for Pickup"}
                        </button>
                      )}
                      {editingOrder.status === "processing" && (
                        <button
                          type="button"
                          disabled={workflowLoading}
                          onClick={() =>
                            handleApprovalAction(editingOrder, "mark_cash_paid")
                          }
                          className="flex-1 px-3 py-2 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                        >
                          {workflowLoading ? "Saving…" : "Mark Cash Received"}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={workflowLoading}
                        onClick={() =>
                          handleApprovalAction(editingOrder, "decline")
                        }
                        className="px-3 py-2 text-xs bg-red-700 text-white rounded-lg hover:bg-red-800 disabled:opacity-50 transition-colors"
                      >
                        {workflowLoading ? "Saving…" : "Decline"}
                      </button>
                    </div>
                  </div>
                )}
              {isCashOnPickupPaid(editingOrder) && (
                <div className="rounded-lg border border-emerald-500/60 bg-emerald-500/10 p-3 flex items-center gap-2">
                  <span className="text-emerald-300 text-sm font-semibold">
                    ✓ Cash on Pickup — Payment Received
                  </span>
                </div>
              )}
              {/* ── Regular approval panel (non-CoP orders only) ──────── */}
              {editingOrder.status === "approval_requested" &&
                editingOrder.requestedPaymentMethod !== "cash_on_pickup" && (
                  <div className="rounded-lg border border-amber-500/60 bg-amber-500/10 p-4 space-y-3">
                    <p className="text-amber-200 font-semibold text-sm">
                      ⚠ Approval Request
                    </p>
                    {editingOrder.requestedPaymentMethod &&
                      editingOrder.requestedPaymentMethod !== "unspecified" && (
                        <p className="text-xs text-amber-300">
                          Requested method:{" "}
                          <span className="font-medium capitalize">
                            {editingOrder.requestedPaymentMethod.replace(
                              /_/g,
                              " ",
                            )}
                          </span>
                        </p>
                      )}
                    <textarea
                      value={workflowNotes}
                      onChange={(e) => setWorkflowNotes(e.target.value)}
                      placeholder="Admin notes for this approval (optional)..."
                      rows={2}
                      className="w-full px-3 py-2 rounded bg-slate-700 text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    {paymentLink && (
                      <div>
                        <p className="text-xs text-gray-400 mb-1">
                          Payment link — copy and share with customer:
                        </p>
                        <div className="flex gap-2">
                          <input
                            readOnly
                            value={paymentLink}
                            className="flex-1 px-2 py-1 text-xs rounded bg-slate-900 text-sky-300 border border-slate-600 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(paymentLink);
                              addToast("Payment link copied!", "success");
                            }}
                            className="px-3 py-1 text-xs bg-slate-600 text-white rounded hover:bg-slate-500 whitespace-nowrap"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={workflowLoading}
                        onClick={() =>
                          handleApprovalAction(
                            editingOrder,
                            "approve_with_payment",
                          )
                        }
                        className="px-3 py-2 text-xs bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50 transition-colors"
                      >
                        {workflowLoading
                          ? "Saving…"
                          : "Approve & Get Payment Link"}
                      </button>
                      <button
                        type="button"
                        disabled={workflowLoading}
                        onClick={() =>
                          handleApprovalAction(
                            editingOrder,
                            "approve_without_payment",
                          )
                        }
                        className="px-3 py-2 text-xs bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-50 transition-colors"
                      >
                        {workflowLoading ? "Saving…" : "Approve (No Payment)"}
                      </button>
                      <button
                        type="button"
                        disabled={workflowLoading}
                        onClick={() =>
                          handleApprovalAction(editingOrder, "decline")
                        }
                        className="px-3 py-2 text-xs bg-red-700 text-white rounded-lg hover:bg-red-800 disabled:opacity-50 transition-colors"
                      >
                        {workflowLoading ? "Saving…" : "Decline Request"}
                      </button>
                    </div>
                  </div>
                )}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="approval_requested">Approval Requested</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tracking Number
                </label>
                <input
                  type="text"
                  value={formData.trackingNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, trackingNumber: e.target.value })
                  }
                  placeholder="e.g., TRK123456789"
                  className="w-full px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {formData.status === "shipped" && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Shipper
                  </label>
                  <select
                    value={formData.shipper}
                    onChange={(e) =>
                      setFormData({ ...formData, shipper: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    {shippers.map((shipper) => (
                      <option key={shipper} value={shipper}>
                        {shipper}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Add order notes..."
                  rows={3}
                  className="w-full px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;
