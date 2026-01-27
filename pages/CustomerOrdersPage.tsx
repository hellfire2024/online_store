import React, { useEffect, useState } from "react";
import { useCustomerAuth } from "../context/CustomerAuthContext";
import { useNavigate } from "react-router-dom";
import { CustomerOrder } from "../types";
import Pagination from "../components/Pagination";
import { downloadInvoiceHTML, InvoiceData } from "../services/invoiceService";

const CustomerOrdersPage: React.FC = () => {
  const { customer, isAuthenticated, fetchOrders } = useCustomerAuth();
  const navigate = useNavigate();
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchOrders();
  }, [isAuthenticated, navigate, fetchOrders]);

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

  const handleDownloadInvoice = (order: CustomerOrder) => {
    const invoiceData: InvoiceData = {
      orderNumber: order.orderNumber,
      orderDate: order.date,
      customerName: order.shippingAddress.fullName,
      customerEmail: customer?.email || 'N/A',
      customerPhone: order.shippingAddress.phone,
      shippingAddress: {
        street: order.shippingAddress.streetAddress,
        city: order.shippingAddress.city,
        state: order.shippingAddress.state,
        zip: order.shippingAddress.zipCode,
        country: 'USA',
      },
      items: order.items.map(item => ({
        id: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        total: item.product.price * item.quantity,
      })),
      subtotal: order.total * 0.9, // Estimate 10% tax
      tax: order.total * 0.1,
      shipping: 0,
      total: order.total,
      trackingNumber: order.trackingNumber,
      paymentMethod: 'Credit Card',
      notes: `Order Status: ${order.status}`,
    };
    downloadInvoiceHTML(invoiceData);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-white">My Orders</h1>

      {customer && customer.orders.length > 0 && (
        <div className="bg-slate-800 p-4 rounded-lg">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 rounded bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="all">All Orders</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      )}

      {!customer || customer.orders.length === 0 ? (
        <div className="bg-slate-800 p-8 rounded-lg border border-slate-700 text-center">
          <p className="text-gray-400 mb-4">No orders yet. Start shopping to place your first order!</p>
          <a href="/store" className="px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700">Browse Products</a>
        </div>
      ) : (
        <>
          {(() => {
            const filteredOrders = filterStatus === 'all'
              ? customer.orders
              : customer.orders.filter(o => o.status === filterStatus);
            const paginatedOrders = itemsPerPage === -1
              ? filteredOrders
              : filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

            return (
              <div className="space-y-4">
                {paginatedOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-slate-800 rounded-lg overflow-hidden hover:bg-slate-700/50 transition cursor-pointer"
                    onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                  >
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-white">Order #{order.orderNumber}</h3>
                          <p className="text-gray-400 text-sm">{new Date(order.date).toLocaleDateString()}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div><p className="text-gray-400 text-sm">Total</p><p className="text-white font-bold">${order.total.toFixed(2)}</p></div>
                        <div><p className="text-gray-400 text-sm">Items</p><p className="text-white font-bold">{order.items.length}</p></div>
                        {order.trackingNumber && <div><p className="text-gray-400 text-sm">Tracking</p><p className="text-sky-400 font-mono text-sm">{order.trackingNumber}</p></div>}
                      </div>
                    </div>

                    {selectedOrder?.id === order.id && (
                      <div className="bg-slate-700/50 p-6 border-t border-slate-600 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-semibold text-gray-300 mb-2">Shipping Address</h4>
                            <p className="text-white text-sm">{order.shippingAddress.fullName}</p>
                            <p className="text-gray-300 text-sm">{order.shippingAddress.streetAddress}</p>
                            <p className="text-gray-300 text-sm">{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</p>
                            <p className="text-gray-300 text-sm mt-2">{order.shippingAddress.phone}</p>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-gray-300 mb-3">Items</h4>
                          <div className="space-y-2">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-sm text-gray-300">
                                <span>{item.product.name} x {item.quantity}</span>
                                <span>${(item.product.price * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="border-t border-slate-600 pt-4 flex gap-2">
                          <button className="flex-1 px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700">Contact Support</button>
                          <button className="flex-1 px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-500">Reorder</button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadInvoice(order);
                            }}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            Download Invoice
                          </button>
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
            totalItems={filterStatus === 'all' ? (customer?.orders.length || 0) : (customer?.orders.filter(o => o.status === filterStatus).length || 0)}
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
