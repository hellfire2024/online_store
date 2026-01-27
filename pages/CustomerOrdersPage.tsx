import React, { useEffect, useState } from "react";
import { useCustomerAuth } from "../context/CustomerAuthContext";
import { CustomerOrder } from "../types";
import Pagination from "../components/Pagination";

const CustomerOrdersPage: React.FC = () => {
  const { customer, fetchOrders, getOrder } = useCustomerAuth();
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(
    null,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchOrders();
  }, []);

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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-white mb-8">Order History</h1>

      {customer.orders.length === 0 ? (
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 text-center">
          <p className="text-gray-400">
            No orders yet. Start shopping to place your first order!
          </p>
        </div>
      ) : (
        <>
          {(() => {
            const paginatedOrders = itemsPerPage === -1 
              ? customer.orders 
              : customer.orders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
            
            return (
              <div className="space-y-4">
                {paginatedOrders.map((order) => (
            <div
              key={order.id}
              className="bg-slate-800 p-6 rounded-lg border border-slate-700 cursor-pointer hover:border-sky-500 transition"
              onClick={() =>
                setSelectedOrder(selectedOrder?.id === order.id ? null : order)
              }
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Order #{order.orderNumber}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {new Date(order.date).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(order.status)}`}
                >
                  {order.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-gray-400 text-sm">Total</p>
                  <p className="text-white font-bold">
                    ${order.total.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Items</p>
                  <p className="text-white font-bold">
                    {order.items.length} item
                    {order.items.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              {order.trackingNumber && (
                <div className="mb-4">
                  <p className="text-gray-400 text-sm">Tracking Number</p>
                  <p className="text-sky-400 font-mono">
                    {order.trackingNumber}
                  </p>
                </div>
              )}

              {/* Expanded Details */}
              {selectedOrder?.id === order.id && (
                <div className="mt-6 pt-6 border-t border-slate-700">
                  <div className="mb-4">
                    <h4 className="text-lg font-bold text-white mb-2">
                      Shipping Address
                    </h4>
                    <div className="text-gray-300 text-sm">
                      <p>{order.shippingAddress.fullName}</p>
                      <p>{order.shippingAddress.streetAddress}</p>
                      <p>
                        {order.shippingAddress.city},{" "}
                        {order.shippingAddress.state}{" "}
                        {order.shippingAddress.zipCode}
                      </p>
                      <p className="mt-2">{order.shippingAddress.phone}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-bold text-white mb-2">Items</h4>
                    <div className="space-y-2">
                      {order.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between text-gray-300 text-sm"
                        >
                          <span>
                            {item.product.name} x {item.quantity}
                          </span>
                          <span>
                            ${(item.product.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
                ))}
              </div>
            );
          })()}
          <Pagination
            currentPage={currentPage}
            totalItems={customer.orders.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(value) => {
              setItemsPerPage(value);
              setCurrentPage(1);
            }}
          />
        </>
      )}
    </div>
  );
};

export default CustomerOrdersPage;
