import React, { useState, useEffect } from 'react';
import { EditIcon, TrashIcon } from '../../components/Icons';
import { useToast } from '../../hooks/useToast';
import Pagination from '../../components/Pagination';
import { apiClient } from '../../services/apiClient';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
  orderCount: number;
  totalSpent: number;
  createdAt: string;
  lastLogin?: string;
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
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { addToast } = useToast();

  // Load customers
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        setIsLoading(true);
        const data = await apiClient.customers.getAll();
        setCustomers(data);
        setFilteredCustomers(data);
      } catch (error) {
        addToast(`Failed to load customers: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        setCustomers([]);
        setFilteredCustomers([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadCustomers();
  }, [addToast]);

  // Filter and sort customers
  useEffect(() => {
    let filtered = customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'email':
          return a.email.localeCompare(b.email);
        case 'totalSpent':
          return b.totalSpent - a.totalSpent;
        case 'createdAt':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    setFilteredCustomers(filtered);
    setCurrentPage(1);
  }, [searchTerm, sortBy, customers]);

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        email: customer.email,
        phone: customer.phone || '',
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      addToast('Name and email are required', 'error');
      return;
    }

    try {
      if (editingCustomer) {
        await apiClient.customers.update(editingCustomer.id, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
        });
        addToast('Customer updated successfully', 'success');
      } else {
        await apiClient.customers.create({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
        });
        addToast('Customer created successfully', 'success');
      }

      // Reload customers
      const updatedCustomers = await apiClient.customers.getAll();
      setCustomers(updatedCustomers);
      setFilteredCustomers(updatedCustomers);
      handleCloseModal();
    } catch (error) {
      addToast(`Failed to save customer: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const handleToggleActive = async (customer: Customer) => {
    try {
      await apiClient.customers.toggleActive(customer.id);
      const updatedCustomers = await apiClient.customers.getAll();
      setCustomers(updatedCustomers);
      addToast(`Customer ${customer.isActive ? 'deactivated' : 'activated'} successfully`, 'success');
    } catch (error) {
      addToast(`Failed to toggle customer status: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const handleDelete = async (customer: Customer) => {
    try {
      await apiClient.customers.delete(customer.id);
      const updatedCustomers = await apiClient.customers.getAll();
      setCustomers(updatedCustomers);
      setDeleteConfirm(null);
      addToast('Customer deleted successfully', 'success');
    } catch (error) {
      addToast(`Failed to delete customer: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      setDeleteConfirm(null);
    }
  };

  // Pagination
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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Customers</h1>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
        >
          + Add Customer
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800 p-4 rounded-lg">
          <input
            type="text"
            placeholder="Search by name or email..."
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
          <div className="bg-slate-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-700">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Phone</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Orders</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Total Spent</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Member Since</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCustomers.map((customer) => (
                  <tr key={customer.id} className="border-t border-slate-700 hover:bg-slate-700/50">
                    <td className="px-6 py-4 text-white font-medium">{customer.name}</td>
                    <td className="px-6 py-4 text-gray-300">{customer.email}</td>
                    <td className="px-6 py-4 text-gray-300">{customer.phone || '-'}</td>
                    <td className="px-6 py-4 text-gray-300 text-center">{customer.orderCount}</td>
                    <td className="px-6 py-4 text-gray-300 font-medium">${customer.totalSpent.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(customer)}
                        className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                          customer.isActive
                            ? 'bg-green-900 text-green-200 hover:bg-green-800'
                            : 'bg-red-900 text-red-200 hover:bg-red-800'
                        }`}
                      >
                        {customer.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
                      {new Date(customer.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 space-x-2">
                      <button
                        onClick={() => handleOpenModal(customer)}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <EditIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(customer.id)}
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

          <Pagination
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredCustomers.length}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-lg max-w-md w-full">
            <h2 className="text-xl font-bold text-white mb-4">
              {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Customer Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter customer name"
                  className="w-full px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email address"
                  className="w-full px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone (Optional)</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter phone number"
                  className="w-full px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
              >
                {editingCustomer ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-lg max-w-sm w-full">
            <h2 className="text-xl font-bold text-white mb-4">Confirm Delete</h2>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete this customer? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const customer = customers.find(c => c.id === deleteConfirm);
                  if (customer) {
                    handleDelete(customer);
                  }
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManagement;
