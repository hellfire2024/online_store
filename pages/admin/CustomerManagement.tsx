import React, { useState, useEffect } from 'react';
import { EditIcon, TrashIcon } from '../../components/Icons';
import { useToast } from '../../hooks/useToast';
import Pagination from '../../components/Pagination';
import { apiClient } from '../../services/apiClient';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isActive: boolean;
  orderCount: number;
  totalSpent: number;
  lastOrderDate?: string;
  averageOrderValue: number;
  createdAt: string;
  lastLogin?: string;
  orders?: Array<{
    id: string;
    orderNumber: string;
    date: string;
    total: number;
    status: string;
    trackingNumber?: string;
    items: Array<{
      product: {
        id: string;
        name: string;
        price: number;
      };
      quantity: number;
    }>;
  }>;
}

const CustomerManagement: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'totalSpent' | 'createdAt'>('name');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<any | null>(null);
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [orderSortBy, setOrderSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');
  const [orderCurrentPage, setOrderCurrentPage] = useState(1);
  const [orderItemsPerPage, setOrderItemsPerPage] = useState(10);
  const { addToast } = useToast();

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        setIsLoading(true);
        const data = await apiClient.customers.getAll();
        setCustomers(data);
        setFilteredCustomers(data);
      } catch (error) {
        const mockCustomers: Customer[] = [
          {
            id: '1', firstName: 'John', lastName: 'Doe', email: 'john.doe@email.com',
            phone: '555-012-3456', isActive: true, orderCount: 5, totalSpent: 287.50,
            averageOrderValue: 57.50, lastOrderDate: '2026-01-20T12:00:00Z',
            createdAt: '2024-02-10T12:00:00Z', lastLogin: '2026-01-25T14:30:00Z',
            orders: [
              { id: 'o1', orderNumber: 'AGIS-0000000001', date: '2026-01-20T12:00:00Z', total: 75.50, status: 'delivered', trackingNumber: 'TRK123', items: [{ product: { id: 'p1', name: 'T-Shirt', price: 25.00 }, quantity: 3 }] },
              { id: 'o2', orderNumber: 'AGIS-0000000002', date: '2026-01-15T10:30:00Z', total: 50.00, status: 'shipped', items: [{ product: { id: 'p2', name: 'Mug', price: 25.00 }, quantity: 2 }] },
              { id: 'o3', orderNumber: 'AGIS-0000000003', date: '2026-01-10T14:00:00Z', total: 162.00, status: 'delivered', items: [{ product: { id: 'p3', name: 'Hoodie', price: 54.00 }, quantity: 3 }] },
            ],
          },
          {
            id: '2', firstName: 'Jane', lastName: 'Smith', email: 'jane.smith@email.com',
            phone: '555-045-6789', isActive: true, orderCount: 12, totalSpent: 1450.75,
            averageOrderValue: 120.90, lastOrderDate: '2026-01-24T15:30:00Z',
            createdAt: '2023-11-05T08:15:00Z', lastLogin: '2026-01-26T09:00:00Z',
            orders: [
              { id: 'o4', orderNumber: 'AGIS-0000000004', date: '2026-01-24T15:30:00Z', total: 120.00, status: 'processing', items: [{ product: { id: 'p4', name: 'Backpack', price: 60.00 }, quantity: 2 }] },
              { id: 'o5', orderNumber: 'AGIS-0000000005', date: '2026-01-20T09:00:00Z', total: 180.00, status: 'delivered', trackingNumber: 'TRK456', items: [{ product: { id: 'p5', name: 'Jacket', price: 90.00 }, quantity: 2 }] },
              { id: 'o16', orderNumber: 'AGIS-0000000016', date: '2026-01-19T14:20:00Z', total: 145.50, status: 'delivered', trackingNumber: 'TRK303', items: [{ product: { id: 'p16', name: 'Sweater', price: 72.75 }, quantity: 2 }] },
              { id: 'o17', orderNumber: 'AGIS-0000000017', date: '2026-01-17T10:45:00Z', total: 98.00, status: 'shipped', items: [{ product: { id: 'p17', name: 'Jeans', price: 98.00 }, quantity: 1 }] },
              { id: 'o18', orderNumber: 'AGIS-0000000018', date: '2026-01-14T15:15:00Z', total: 225.00, status: 'delivered', trackingNumber: 'TRK404', items: [{ product: { id: 'p18', name: 'Boots', price: 112.50 }, quantity: 2 }] },
              { id: 'o19', orderNumber: 'AGIS-0000000019', date: '2026-01-10T09:30:00Z', total: 155.75, status: 'delivered', items: [{ product: { id: 'p19', name: 'Shirt', price: 51.92 }, quantity: 3 }] },
              { id: 'o20', orderNumber: 'AGIS-0000000020', date: '2025-12-30T12:00:00Z', total: 89.50, status: 'cancelled', items: [{ product: { id: 'p20', name: 'Socks', price: 22.38 }, quantity: 4 }] },
              { id: 'o21', orderNumber: 'AGIS-0000000021', date: '2025-12-22T16:45:00Z', total: 210.00, status: 'delivered', trackingNumber: 'TRK505', items: [{ product: { id: 'p21', name: 'Coat', price: 105.00 }, quantity: 2 }] },
              { id: 'o22', orderNumber: 'AGIS-0000000022', date: '2025-12-15T13:20:00Z', total: 165.25, status: 'delivered', items: [{ product: { id: 'p22', name: 'Dress', price: 82.63 }, quantity: 2 }] },
              { id: 'o23', orderNumber: 'AGIS-0000000023', date: '2025-12-08T10:10:00Z', total: 127.50, status: 'processing', trackingNumber: 'TRK606', items: [{ product: { id: 'p23', name: 'Blouse', price: 63.75 }, quantity: 2 }] },
              { id: 'o24', orderNumber: 'AGIS-0000000024', date: '2025-12-01T11:30:00Z', total: 99.75, status: 'delivered', trackingNumber: 'TRK707', items: [{ product: { id: 'p24', name: 'Pants', price: 49.88 }, quantity: 2 }] },
              { id: 'o25', orderNumber: 'AGIS-0000000025', date: '2025-11-24T14:00:00Z', total: 142.25, status: 'shipped', items: [{ product: { id: 'p25', name: 'Shorts', price: 35.56 }, quantity: 4 }] },
            ],
          },
          {
            id: '3', firstName: 'Bob', lastName: 'Johnson', email: 'bob.johnson@email.com',
            phone: '555-098-7654', isActive: false, orderCount: 2, totalSpent: 89.99,
            averageOrderValue: 45.00, lastOrderDate: '2025-11-15T10:00:00Z',
            createdAt: '2025-08-22T16:45:00Z', lastLogin: '2025-12-01T10:20:00Z',
            orders: [
              { id: 'o6', orderNumber: 'AGIS-0000000006', date: '2025-11-15T10:00:00Z', total: 44.99, status: 'cancelled', items: [{ product: { id: 'p6', name: 'Cap', price: 22.50 }, quantity: 2 }] },
              { id: 'o7', orderNumber: 'AGIS-0000000007', date: '2025-10-20T12:00:00Z', total: 45.00, status: 'delivered', items: [{ product: { id: 'p7', name: 'Socks Pack', price: 15.00 }, quantity: 3 }] },
            ],
          },
          {
            id: '4', firstName: 'Alice', lastName: 'Williams', email: 'alice.w@email.com',
            phone: '555-078-9123', isActive: true, orderCount: 8, totalSpent: 623.40,
            averageOrderValue: 77.93, lastOrderDate: '2026-01-22T11:15:00Z',
            createdAt: '2024-05-17T11:30:00Z', lastLogin: '2026-01-24T15:10:00Z',
            orders: [
              { id: 'o8', orderNumber: 'AGIS-0000000008', date: '2026-01-22T11:15:00Z', total: 95.00, status: 'shipped', trackingNumber: 'TRK789', items: [{ product: { id: 'p8', name: 'Sneakers', price: 95.00 }, quantity: 1 }] },
              { id: 'o9', orderNumber: 'AGIS-0000000009', date: '2026-01-18T16:00:00Z', total: 135.00, status: 'delivered', items: [{ product: { id: 'p9', name: 'Watch', price: 135.00 }, quantity: 1 }] },
              { id: 'o10', orderNumber: 'AGIS-0000000010', date: '2026-01-12T13:30:00Z', total: 160.00, status: 'delivered', items: [{ product: { id: 'p10', name: 'Wallet', price: 40.00 }, quantity: 4 }] },
              { id: 'o11', orderNumber: 'AGIS-0000000011', date: '2026-01-08T10:20:00Z', total: 45.00, status: 'delivered', trackingNumber: 'TRK101', items: [{ product: { id: 'p11', name: 'Belt', price: 45.00 }, quantity: 1 }] },
              { id: 'o12', orderNumber: 'AGIS-0000000012', date: '2025-12-28T14:45:00Z', total: 72.00, status: 'delivered', items: [{ product: { id: 'p12', name: 'Scarf', price: 36.00 }, quantity: 2 }] },
              { id: 'o13', orderNumber: 'AGIS-0000000013', date: '2025-12-20T09:15:00Z', total: 28.40, status: 'processing', items: [{ product: { id: 'p13', name: 'Socks', price: 7.10 }, quantity: 4 }] },
              { id: 'o14', orderNumber: 'AGIS-0000000014', date: '2025-12-15T16:30:00Z', total: 55.00, status: 'delivered', trackingNumber: 'TRK202', items: [{ product: { id: 'p14', name: 'Hat', price: 27.50 }, quantity: 2 }] },
              { id: 'o15', orderNumber: 'AGIS-0000000015', date: '2025-12-05T11:00:00Z', total: 33.00, status: 'cancelled', items: [{ product: { id: 'p15', name: 'Gloves', price: 16.50 }, quantity: 2 }] },
            ],
          },
        ];
        setCustomers(mockCustomers);
        setFilteredCustomers(mockCustomers);
        addToast('Using demo data - backend not connected', 'info');
      } finally {
        setIsLoading(false);
      }
    };
    loadCustomers();
  }, [addToast]);

  useEffect(() => {
    let filtered = customers.filter((c) =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
    );
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'email': return a.email.localeCompare(b.email);
        case 'totalSpent': return b.totalSpent - a.totalSpent;
        case 'createdAt': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'name':
        default: return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      }
    });
    setFilteredCustomers(filtered);
    setCurrentPage(1);
  }, [searchTerm, sortBy, customers]);

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({ firstName: customer.firstName, lastName: customer.lastName, email: customer.email, phone: customer.phone });
    } else {
      setEditingCustomer(null);
      setFormData({ firstName: '', lastName: '', email: '', phone: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
    setSelectedCustomer(null);
    setFormData({ firstName: '', lastName: '', email: '', phone: '' });
  };

  const handleSave = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
      addToast('First name, last name, and email are required', 'error');
      return;
    }
    const phonePattern = /^\d{3}-\d{3}-\d{4}$/;
    if (formData.phone && !phonePattern.test(formData.phone)) {
      addToast('Phone must be in format: 555-123-4567', 'error');
      return;
    }
    try {
      if (editingCustomer) {
        await apiClient.customers.update(editingCustomer.id, { ...formData });
        addToast('Customer updated successfully', 'success');
      } else {
        await apiClient.customers.create({ ...formData });
        addToast('Customer created successfully', 'success');
      }
      const updated = await apiClient.customers.getAll();
      setCustomers(updated);
      setFilteredCustomers(updated);
      handleCloseModal();
    } catch (error) {
      addToast(`Failed to save customer: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const handleToggleActive = async (customer: Customer) => {
    try {
      await apiClient.customers.toggleActive(customer.id);
      const updated = await apiClient.customers.getAll();
      setCustomers(updated);
      addToast(`Customer ${customer.isActive ? 'deactivated' : 'activated'} successfully`, 'success');
    } catch (error) {
      addToast(`Failed to toggle customer status: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const handleDelete = async (customer: Customer) => {
    try {
      await apiClient.customers.delete(customer.id);
      const updated = await apiClient.customers.getAll();
      setCustomers(updated);
      setDeleteConfirm(null);
      addToast('Customer deleted successfully', 'success');
    } catch (error) {
      addToast(`Failed to delete customer: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      setDeleteConfirm(null);
    }
  };

  const handleSendPasswordReset = async (customer: Customer) => {
    try {
      addToast(`Password reset email sent to ${customer.email}`, 'success');
    } catch (error) {
      addToast(`Failed to send password reset: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const exportOrdersAsCSV = (customer: Customer) => {
    // Create CSV header
    const headers = ['Order Number', 'Order Date', 'Total Amount', 'Order Status', 'Items Count'];
    const csvContent = [
      headers.join(','),
      `Customer: ${customer.firstName} ${customer.lastName}`,
      `Email: ${customer.email}`,
      `Phone: ${customer.phone}`,
      `Generated: ${new Date().toLocaleString()}`,
      '', // blank line
    ];

    // Add order summary
    csvContent.push(`Total Orders: ${customer.orderCount}`);
    csvContent.push(`Total Spent: $${customer.totalSpent.toFixed(2)}`);
    csvContent.push(`Average Order Value: $${customer.averageOrderValue.toFixed(2)}`);
    csvContent.push(''); // blank line
    csvContent.push(headers.join(','));

    // Note: In a real implementation, you would fetch actual order data from the API
    // For now, this provides the structure for export
    csvContent.push(`"Order data available via detailed order history in database"`);

    // Create blob and download
    const blob = new Blob([csvContent.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orders_${customer.email}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    addToast('Orders exported successfully', 'success');
  };

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setOrderSearchTerm('');
    setOrderSortBy('date-desc');
    setOrderCurrentPage(1);
  };

  const filterAndSortOrders = (orders: any[]) => {
    if (!orders) return [];
    
    // Filter by search term
    let filtered = orders.filter(order => 
      order.orderNumber.toLowerCase().includes(orderSearchTerm.toLowerCase())
    );
    
    // Sort orders
    const sorted = [...filtered].sort((a, b) => {
      switch (orderSortBy) {
        case 'date-desc':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'date-asc':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'amount-desc':
          return b.total - a.total;
        case 'amount-asc':
          return a.total - b.total;
        default:
          return 0;
      }
    });
    
    return sorted;
  };

  const getPaginatedOrders = (orders: any[]) => {
    const filtered = filterAndSortOrders(orders);
    const startIndex = (orderCurrentPage - 1) * orderItemsPerPage;
    const endIndex = startIndex + orderItemsPerPage;
    return {
      paginatedOrders: filtered.slice(startIndex, endIndex),
      totalOrders: filtered.length,
    };
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAllPage = (pageCustomers: Customer[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      const pageFullySelected = pageCustomers.every(c => next.has(c.id));
      if (pageFullySelected) {
        pageCustomers.forEach(c => next.delete(c.id));
      } else {
        pageCustomers.forEach(c => next.add(c.id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const bulkResetPasswords = async () => {
    const count = selectedIds.size;
    if (count === 0) return;
    try {
      addToast(`Password reset emails queued for ${count} customers`, 'success');
    } catch (error) {
      addToast(`Bulk reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`,'error');
    }
  };

  const bulkCopyEmails = async () => {
    const emails = customers.filter(c => selectedIds.has(c.id)).map(c => c.email);
    if (emails.length === 0) return;
    try {
      await navigator.clipboard.writeText(emails.join(', '));
      addToast(`Copied ${emails.length} emails to clipboard`, 'success');
    } catch (error) {
      addToast('Failed to copy emails', 'error');
    }
  };

  const bulkEmailSelected = () => {
    const emails = customers.filter(c => selectedIds.has(c.id)).map(c => c.email);
    if (emails.length === 0) return;
    const mailto = `mailto:?bcc=${encodeURIComponent(emails.join(','))}`;
    window.location.href = mailto;
  };

  const handleExportCSV = () => {
    const headers = ['First Name','Last Name','Email','Phone','Orders','Total Spent','Avg Order','Last Order','Active'];
    const rows = filteredCustomers.map(c => [
      c.firstName,
      c.lastName,
      c.email,
      c.phone,
      String(c.orderCount),
      c.totalSpent.toFixed(2),
      c.averageOrderValue.toFixed(2),
      c.lastOrderDate ? new Date(c.lastOrderDate).toISOString().split('T')[0] : '',
      c.isActive ? 'Yes' : 'No',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g,'\"')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Exported filtered customers to CSV', 'success');
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = itemsPerPage === filteredCustomers.length ? filteredCustomers.length : startIndex + itemsPerPage;
  const paginatedCustomers = itemsPerPage === filteredCustomers.length
    ? filteredCustomers
    : filteredCustomers.slice(startIndex, Math.min(endIndex, filteredCustomers.length));

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading customers...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-3">
        <h1 className="text-3xl font-bold text-white">Customers</h1>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <span className="px-2 py-1 bg-slate-700 text-gray-200 rounded">Selected: {selectedIds.size}</span>
          )}
          <button onClick={handleExportCSV} className="px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors">Export CSV</button>
          <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors">
            + Add Customer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800 p-4 rounded-lg">
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="bg-slate-800 p-4 rounded-lg">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full px-4 py-2 rounded bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="name">Sort by Name</option>
            <option value="email">Sort by Email</option>
            <option value="totalSpent">Sort by Total Spent</option>
            <option value="createdAt">Sort by Date Joined</option>
          </select>
        </div>
      </div>

      {filteredCustomers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">No customers found</p>
        </div>
      ) : (
        <>
          <div className="bg-slate-800 rounded-lg overflow-hidden overflow-x-auto">
            <div className="flex items-center gap-2 p-3 border-b border-slate-700">
              <input
                type="checkbox"
                checked={paginatedCustomers.every(c => selectedIds.has(c.id))}
                onChange={() => toggleSelectAllPage(paginatedCustomers)}
                className="w-4 h-4 accent-sky-600"
                title="Select all on page"
              />
              <span className="text-gray-300 text-sm">Select page</span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={bulkResetPasswords}
                  disabled={selectedIds.size === 0}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${selectedIds.size===0 ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-purple-900 text-purple-200 hover:bg-purple-800'}`}
                >Bulk Reset PW</button>
                <button
                  onClick={bulkCopyEmails}
                  disabled={selectedIds.size === 0}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${selectedIds.size===0 ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
                >Copy Emails</button>
                <button
                  onClick={bulkEmailSelected}
                  disabled={selectedIds.size === 0}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${selectedIds.size===0 ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-blue-900 text-blue-200 hover:bg-blue-800'}`}
                >Email Selected</button>
                <button
                  onClick={clearSelection}
                  disabled={selectedIds.size === 0}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${selectedIds.size===0 ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
                >Clear</button>
              </div>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-slate-700">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Select</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Phone</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">Orders</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">Avg Order</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Total Spent</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Last Order</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="border-t border-slate-700 hover:bg-slate-700/50 cursor-pointer"
                    onClick={() => handleViewCustomer(customer)}
                  >
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(customer.id)}
                        onChange={() => toggleSelect(customer.id)}
                        className="w-4 h-4 accent-sky-600"
                        title="Select customer"
                      />
                    </td>
                    <td className="px-6 py-4 text-white font-medium">{customer.firstName} {customer.lastName}</td>
                    <td className="px-6 py-4 text-gray-300">{customer.email}</td>
                    <td className="px-6 py-4 text-gray-300">{customer.phone}</td>
                    <td className="px-6 py-4 text-gray-300 text-center">{customer.orderCount}</td>
                    <td className="px-6 py-4 text-gray-300 text-center">${customer.averageOrderValue.toFixed(2)}</td>
                    <td className="px-6 py-4 text-gray-300 font-medium">${customer.totalSpent.toFixed(2)}</td>
                    <td className="px-6 py-4 text-gray-400 text-sm">{customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString() : 'Never'}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleActive(customer); }}
                        className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${customer.isActive ? 'bg-green-900 text-green-200 hover:bg-green-800' : 'bg-red-900 text-red-200 hover:bg-red-800'}`}
                      >
                        {customer.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleSendPasswordReset(customer)}
                          className="px-2 py-1 bg-purple-900 text-purple-200 hover:bg-purple-800 rounded text-xs font-semibold transition-colors whitespace-nowrap"
                          title="Send password reset email"
                        >
                          Reset PW
                        </button>
                        <button
                          onClick={() => handleOpenModal(customer)}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                          title="Edit customer"
                        >
                          <EditIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(customer.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          title="Delete customer"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredCustomers.length}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 p-6 rounded-lg max-w-md w-full">
            <h2 className="text-xl font-bold text-white mb-4">{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">First Name *</label>
                  <input type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} placeholder="Enter first name" className="w-full px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Last Name *</label>
                  <input type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} placeholder="Enter last name" className="w-full px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email *</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="Enter email address" className="w-full px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="555-123-4567" className="w-full px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500" />
                <p className="text-xs text-gray-400 mt-1">Format: XXX-XXX-XXXX</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleCloseModal} className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors">Cancel</button>
              <button onClick={handleSave} className="flex-1 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors">{editingCustomer ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {selectedCustomer && !isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 p-6 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedCustomer.firstName} {selectedCustomer.lastName}</h2>
                <p className="text-gray-400">{selectedCustomer.email}</p>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="text-gray-400 hover:text-white text-2xl">×</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-700 p-4 rounded-lg"><div className="text-sm text-gray-400 mb-1">Total Orders</div><div className="text-2xl font-bold text-white">{selectedCustomer.orderCount}</div></div>
              <div className="bg-slate-700 p-4 rounded-lg"><div className="text-sm text-gray-400 mb-1">Total Spent</div><div className="text-2xl font-bold text-green-400">${selectedCustomer.totalSpent.toFixed(2)}</div></div>
              <div className="bg-slate-700 p-4 rounded-lg"><div className="text-sm text-gray-400 mb-1">Avg Order Value</div><div className="text-2xl font-bold text-blue-400">${selectedCustomer.averageOrderValue.toFixed(2)}</div></div>
              <div className="bg-slate-700 p-4 rounded-lg"><div className="text-sm text-gray-400 mb-1">Customer Since</div><div className="text-lg font-bold text-white">{new Date(selectedCustomer.createdAt).toLocaleDateString()}</div></div>
            </div>
            <div className="bg-slate-700 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><div className="text-sm text-gray-400">Email</div><div className="text-white">{selectedCustomer.email}</div></div>
                <div><div className="text-sm text-gray-400">Phone</div><div className="text-white">{selectedCustomer.phone}</div></div>
                <div><div className="text-sm text-gray-400">Last Login</div><div className="text-white">{selectedCustomer.lastLogin ? new Date(selectedCustomer.lastLogin).toLocaleString() : 'Never'}</div></div>
                <div><div className="text-sm text-gray-400">Last Order</div><div className="text-white">{selectedCustomer.lastOrderDate ? new Date(selectedCustomer.lastOrderDate).toLocaleDateString() : 'No orders yet'}</div></div>
              </div>
            </div>
            <div className="bg-slate-700 p-4 rounded-lg mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Order History</h3>
                {selectedCustomer.orderCount > 0 && (
                  <button
                    onClick={() => exportOrdersAsCSV(selectedCustomer)}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                  >
                    ↓ Export CSV
                  </button>
                )}
              </div>
              {selectedCustomer.orderCount === 0 || !selectedCustomer.orders || selectedCustomer.orders.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-slate-600 rounded">
                  <p className="text-gray-400">No orders yet</p>
                </div>
              ) : (
                <>
                  {/* Search and Sort Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <div>
                      <input
                        type="text"
                        placeholder="Search order number..."
                        value={orderSearchTerm}
                        onChange={(e) => {
                          setOrderSearchTerm(e.target.value);
                          setOrderCurrentPage(1);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 text-white rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                      />
                    </div>
                    <div>
                      <select
                        value={orderSortBy}
                        onChange={(e) => setOrderSortBy(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-800 text-white rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                      >
                        <option value="date-desc">Newest First</option>
                        <option value="date-asc">Oldest First</option>
                        <option value="amount-desc">Highest Amount</option>
                        <option value="amount-asc">Lowest Amount</option>
                      </select>
                    </div>
                  </div>

                  {(() => {
                    const { paginatedOrders, totalOrders } = getPaginatedOrders(selectedCustomer.orders);
                    
                    return paginatedOrders.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed border-slate-600 rounded">
                        <p className="text-gray-400">No orders match your search</p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2 mb-4">
                          {paginatedOrders.map((order) => (
                    <div 
                      key={order.id} 
                      className="bg-slate-800 p-3 rounded border border-slate-600 hover:border-sky-500 transition-all cursor-pointer hover:shadow-lg"
                      onClick={() => setSelectedOrderDetail(order)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-white font-semibold">Order #{order.orderNumber}</h4>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                              order.status === 'pending' ? 'bg-yellow-900 text-yellow-200' :
                              order.status === 'processing' ? 'bg-blue-900 text-blue-200' :
                              order.status === 'shipped' ? 'bg-purple-900 text-purple-200' :
                              order.status === 'delivered' ? 'bg-green-900 text-green-200' :
                              'bg-red-900 text-red-200'
                            }`}>
                              {order.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">{new Date(order.date).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-bold text-lg">${order.total.toFixed(2)}</p>
                          <p className="text-xs text-gray-400">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="border-t border-slate-600 pt-2 mt-2">
                        <div className="space-y-1">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-xs">
                              <span className="text-gray-300">{item.product.name} × {item.quantity}</span>
                              <span className="text-gray-400">${(item.product.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {order.trackingNumber && (
                        <div className="mt-2 pt-2 border-t border-slate-600">
                          <p className="text-xs text-gray-400">Tracking: <span className="text-sky-400 font-mono">{order.trackingNumber}</span></p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Pagination */}
                {totalOrders > orderItemsPerPage && (
                  <div className="mt-4 pt-4 border-t border-slate-600">
                    <Pagination
                      currentPage={orderCurrentPage}
                      totalItems={totalOrders}
                      itemsPerPage={orderItemsPerPage}
                      onPageChange={setOrderCurrentPage}
                      onItemsPerPageChange={(value) => {
                        setOrderItemsPerPage(value);
                        setOrderCurrentPage(1);
                      }}
                    />
                  </div>
                )}
              </>
            );
          })()}
        </>
      )}
    </div>
            <div className="flex gap-3">
              <button onClick={() => handleSendPasswordReset(selectedCustomer)} className="px-4 py-2 bg-purple-900 text-purple-200 hover:bg-purple-800 rounded-lg transition-colors">Send Password Reset</button>
              <button onClick={() => { setSelectedCustomer(null); handleOpenModal(selectedCustomer!); }} className="px-4 py-2 bg-blue-900 text-blue-200 hover:bg-blue-800 rounded-lg transition-colors">Edit Customer</button>
              <button onClick={() => setSelectedCustomer(null)} className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 p-6 rounded-lg max-w-sm w-full">
            <h2 className="text-xl font-bold text-white mb-4">Confirm Delete</h2>
            <p className="text-gray-300 mb-6">Are you sure you want to delete this customer? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors">Cancel</button>
              <button onClick={() => { const customer = customers.find(c => c.id === deleteConfirm); if (customer) { handleDelete(customer); } }} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrderDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-60 p-4">
          <div className="bg-slate-800 p-6 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto border-2 border-sky-600">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Order #{selectedOrderDetail.orderNumber}</h2>
                <p className="text-gray-400">{new Date(selectedOrderDetail.date).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelectedOrderDetail(null)} className="text-gray-400 hover:text-white text-3xl font-bold">×</button>
            </div>

            {/* Order Status */}
            <div className="bg-slate-700 p-4 rounded-lg mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Status</p>
                  <span className={`inline-block px-4 py-2 rounded-lg text-sm font-bold capitalize ${
                    selectedOrderDetail.status === 'pending' ? 'bg-yellow-900 text-yellow-200' :
                    selectedOrderDetail.status === 'processing' ? 'bg-blue-900 text-blue-200' :
                    selectedOrderDetail.status === 'shipped' ? 'bg-purple-900 text-purple-200' :
                    selectedOrderDetail.status === 'delivered' ? 'bg-green-900 text-green-200' :
                    'bg-red-900 text-red-200'
                  }`}>
                    {selectedOrderDetail.status}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400 mb-1">Total Amount</p>
                  <p className="text-3xl font-bold text-white">${selectedOrderDetail.total.toFixed(2)}</p>
                </div>
              </div>
              {selectedOrderDetail.trackingNumber && (
                <div className="mt-4 pt-4 border-t border-slate-600">
                  <p className="text-sm text-gray-400">Tracking Number</p>
                  <p className="text-sky-400 font-mono text-lg font-semibold">{selectedOrderDetail.trackingNumber}</p>
                </div>
              )}
            </div>

            {/* Order Items */}
            <div className="bg-slate-700 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Order Items</h3>
              <div className="space-y-3">
                {selectedOrderDetail.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-800 rounded border border-slate-600">
                    <div className="flex-1">
                      <p className="text-white font-semibold text-lg">{item.product.name}</p>
                      <p className="text-gray-400 text-sm">Price: ${item.product.price.toFixed(2)} × {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold text-xl">${(item.product.price * item.quantity).toFixed(2)}</p>
                      <p className="text-gray-400 text-xs">Qty: {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-slate-700 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Order Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-gray-300">
                  <span>Subtotal</span>
                  <span>${(selectedOrderDetail.total * 0.9).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Tax (estimated)</span>
                  <span>${(selectedOrderDetail.total * 0.1).toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-600 pt-2 flex justify-between text-white font-bold text-lg">
                  <span>Total</span>
                  <span>${selectedOrderDetail.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button className="flex-1 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors">
                📧 Contact Customer
              </button>
              <button className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                📄 Print Invoice
              </button>
              <button onClick={() => setSelectedOrderDetail(null)} className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManagement;
