import React, { useState, useEffect } from 'react';
import { EditIcon, TrashIcon } from '../../components/Icons';
import { useToast } from '../../hooks/useToast';
import Pagination from '../../components/Pagination';

interface OrderItem {
  productName: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  date: string;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: OrderItem[];
  trackingNumber?: string;
  notes?: string;
}

const OrderManagement: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'total' | 'status'>('date');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [formData, setFormData] = useState({ status: 'pending', trackingNumber: '', shipper: 'UPS', notes: '' });
  const { addToast } = useToast();

  const shippers = ['UPS', 'FedEx', 'USPS', 'DHL', 'Other'];

  useEffect(() => {
    const mockOrders: Order[] = [
      {
        id: '1',
        orderNumber: 'AGIS-0000000001',
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        date: '2026-01-20T10:30:00Z',
        total: 156.99,
        status: 'delivered',
        items: [
          { productName: 'Custom T-Shirt', quantity: 2, price: 34.99 },
          { productName: 'Design Services', quantity: 1, price: 87.01 },
        ],
        trackingNumber: 'TRK123456789',
        notes: 'Customer requested rush delivery',
      },
      {
        id: '2',
        orderNumber: 'AGIS-0000000002',
        customerName: 'Jane Smith',
        customerEmail: 'jane@example.com',
        date: '2026-01-24T14:15:00Z',
        total: 89.50,
        status: 'shipped',
        items: [{ productName: 'Hoodie', quantity: 1, price: 89.50 }],
        trackingNumber: 'TRK987654321',
      },
      {
        id: '3',
        orderNumber: 'AGIS-0000000003',
        customerName: 'Bob Johnson',
        customerEmail: 'bob@example.com',
        date: '2026-01-26T09:00:00Z',
        total: 45.00,
        status: 'processing',
        items: [{ productName: 'Cap', quantity: 1, price: 45.00 }],
      },
    ];
    setOrders(mockOrders);
    setFilteredOrders(mockOrders);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let filtered = orders.filter((o) =>
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerEmail.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filterStatus !== 'all') {
      filtered = filtered.filter(o => o.status === filterStatus);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'total': return b.total - a.total;
        case 'status': return a.status.localeCompare(b.status);
        case 'date':
        default: return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });

    setFilteredOrders(filtered);
    setCurrentPage(1);
  }, [searchTerm, filterStatus, sortBy, orders]);

  const handleOpenModal = (order: Order) => {
    setEditingOrder(order);
    setFormData({
      status: order.status,
      trackingNumber: order.trackingNumber || '',
      shipper: 'UPS',
      notes: order.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingOrder) return;
    
    // If marking as shipped, send API call to trigger email
    if (formData.status === 'shipped' && formData.trackingNumber) {
      try {
        const response = await fetch(`/api/orders/${editingOrder.orderNumber}/ship`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trackingNumber: formData.trackingNumber,
            shipper: formData.shipper,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          addToast('Shipping notification sent to customer!', 'success');
        } else {
          addToast('Order updated but email may not have been sent', 'warning');
        }
      } catch (error) {
        console.error('Error sending shipping notification:', error);
        addToast('Order updated (backend may be offline)', 'warning');
      }
    }

    const updated = orders.map(o =>
      o.id === editingOrder.id
        ? { 
            ...o, 
            status: formData.status as Order['status'], 
            trackingNumber: formData.trackingNumber, 
            notes: formData.notes 
          }
        : o
    );
    setOrders(updated);
    setIsModalOpen(false);
    addToast('Order updated successfully', 'success');
  };

  const handleDelete = (orderId: string) => {
    setOrders(orders.filter(o => o.id !== orderId));
    addToast('Order deleted', 'success');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-orange-900 text-orange-200';
      case 'processing': return 'bg-yellow-900 text-yellow-200';
      case 'shipped': return 'bg-blue-900 text-blue-200';
      case 'delivered': return 'bg-green-900 text-green-200';
      case 'cancelled': return 'bg-red-900 text-red-200';
      default: return 'bg-gray-900 text-gray-200';
    }
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading orders...</div>;
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
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Order #</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Customer</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Date</th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">Items</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-300">Total</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedOrders.map((order) => (
              <tr
                key={order.id}
                className="border-t border-slate-700 hover:bg-slate-700/50 cursor-pointer"
                onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
              >
                <td className="px-6 py-4 text-white font-medium">{order.orderNumber}</td>
                <td className="px-6 py-4">
                  <div className="text-white">{order.customerName}</div>
                  <div className="text-gray-400 text-sm">{order.customerEmail}</div>
                </td>
                <td className="px-6 py-4 text-gray-300">{new Date(order.date).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-gray-300 text-center">{order.items.length}</td>
                <td className="px-6 py-4 text-right text-white font-medium">${order.total.toFixed(2)}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded text-xs font-semibold ${getStatusColor(order.status)}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 space-x-2" onClick={(e) => e.stopPropagation()}>
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
          <h3 className="text-lg font-bold text-white mb-4">{selectedOrder.orderNumber} Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-gray-400 text-sm">Customer</p>
              <p className="text-white">{selectedOrder.customerName}</p>
              <p className="text-gray-300 text-sm">{selectedOrder.customerEmail}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Order Date</p>
              <p className="text-white">{new Date(selectedOrder.date).toLocaleString()}</p>
            </div>
          </div>
          <div className="mb-4">
            <p className="text-gray-400 text-sm mb-2">Items</p>
            <div className="space-y-1">
              {selectedOrder.items.map((item, idx) => (
                <p key={idx} className="text-gray-300 text-sm">{item.productName} x {item.quantity} = ${(item.price * item.quantity).toFixed(2)}</p>
              ))}
            </div>
          </div>
          <div className="border-t border-slate-600 pt-4">
            <p className="text-gray-400 text-sm">Total</p>
            <p className="text-2xl font-bold text-white">${selectedOrder.total.toFixed(2)}</p>
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
            <h2 className="text-xl font-bold text-white mb-4">Update Order {editingOrder.orderNumber}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 rounded bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tracking Number</label>
                <input
                  type="text"
                  value={formData.trackingNumber}
                  onChange={(e) => setFormData({ ...formData, trackingNumber: e.target.value })}
                  placeholder="e.g., TRK123456789"
                  className="w-full px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {formData.status === 'shipped' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Shipper</label>
                  <select
                    value={formData.shipper}
                    onChange={(e) => setFormData({ ...formData, shipper: e.target.value })}
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
                <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
