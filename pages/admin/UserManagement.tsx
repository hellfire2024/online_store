import React, { useState, useEffect } from 'react';
import { EditIcon, TrashIcon } from '../../components/Icons';
import { useToast } from '../../hooks/useToast';
import Pagination from '../../components/Pagination';
import { apiClient } from '../../services/apiClient';

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: 'super_admin' | 'admin' | 'manager';
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'manager' as 'super_admin' | 'admin' | 'manager',
  });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { addToast } = useToast();

  // Load users
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setIsLoading(true);
        const data = await apiClient.adminUsers.getAll();
        setUsers(data);
        setFilteredUsers(data);
      } catch (error) {
        addToast(`Failed to load admin users: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        setUsers([]);
        setFilteredUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadUsers();
  }, [addToast]);

  // Filter users
  useEffect(() => {
    const filtered = users.filter(
      (user) =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [searchTerm, users]);

  const handleOpenModal = (user?: AdminUser) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        email: user.email,
        password: '',
        role: user.role,
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        email: '',
        password: '',
        role: 'manager',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData({
      username: '',
      email: '',
      password: '',
      role: 'manager' as 'super_admin' | 'admin' | 'manager',
    });
  };

  const handleSave = async () => {
    if (!formData.username.trim() || !formData.email.trim()) {
      addToast('Username and email are required', 'error');
      return;
    }

    if (!editingUser && !formData.password) {
      addToast('Password is required for new users', 'error');
      return;
    }

    try {
      if (editingUser) {
        await apiClient.adminUsers.update(editingUser.id, {
          username: formData.username,
          email: formData.email,
          ...(formData.password && { password: formData.password }),
          role: formData.role,
        });
        addToast('Admin user updated successfully', 'success');
      } else {
        await apiClient.adminUsers.create({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        });
        addToast('Admin user created successfully', 'success');
      }

      // Reload users
      const updatedUsers = await apiClient.adminUsers.getAll();
      setUsers(updatedUsers);
      setFilteredUsers(updatedUsers);
      handleCloseModal();
    } catch (error) {
      addToast(`Failed to save admin user: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    try {
      await apiClient.adminUsers.toggleActive(user.id);
      const updatedUsers = await apiClient.adminUsers.getAll();
      setUsers(updatedUsers);
      setFilteredUsers(updatedUsers.filter(u =>
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
      ));
      addToast(`Admin user ${user.isActive ? 'deactivated' : 'activated'} successfully`, 'success');
    } catch (error) {
      addToast(`Failed to toggle admin user status: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const handleDelete = async (user: AdminUser) => {
    try {
      await apiClient.adminUsers.delete(user.id);
      const updatedUsers = await apiClient.adminUsers.getAll();
      setUsers(updatedUsers);
      setFilteredUsers(updatedUsers.filter(u =>
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
      ));
      setDeleteConfirm(null);
      addToast('Admin user deleted successfully', 'success');
    } catch (error) {
      addToast(`Failed to delete admin user: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      setDeleteConfirm(null);
    }
  };

  // Pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = itemsPerPage === filteredUsers.length ? filteredUsers.length : startIndex + itemsPerPage;
  const paginatedUsers = itemsPerPage === filteredUsers.length 
    ? filteredUsers 
    : filteredUsers.slice(startIndex, Math.min(endIndex, filteredUsers.length));

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-900 text-red-200';
      case 'admin':
        return 'bg-orange-900 text-orange-200';
      case 'manager':
        return 'bg-blue-900 text-blue-200';
      default:
        return 'bg-gray-900 text-gray-200';
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading admin users...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Admin Users</h1>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
        >
          + Add Admin User
        </button>
      </div>

      <div className="bg-slate-800 p-4 rounded-lg">
        <input
          type="text"
          placeholder="Search by username or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>

      {filteredUsers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">No admin users found</p>
        </div>
      ) : (
        <>
          <div className="bg-slate-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-700">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Username</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Role</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Last Login</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => (
                  <tr key={user.id} className="border-t border-slate-700 hover:bg-slate-700/50">
                    <td className="px-6 py-4 text-white">{user.username}</td>
                    <td className="px-6 py-4 text-gray-300">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleColor(user.role)}`}>
                        {user.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(user)}
                        className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                          user.isActive
                            ? 'bg-green-900 text-green-200 hover:bg-green-800'
                            : 'bg-red-900 text-red-200 hover:bg-red-800'
                        }`}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 space-x-2">
                      <button
                        onClick={() => handleOpenModal(user)}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <EditIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(user.id)}
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
            totalItems={filteredUsers.length}
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
              {editingUser ? 'Edit Admin User' : 'Add New Admin User'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Enter username"
                  className="w-full px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email"
                  className="w-full px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter password"
                    className="w-full px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              )}

              {editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">New Password (leave blank to keep current)</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Leave blank to keep current password"
                    className="w-full px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'super_admin' | 'admin' | 'manager' })}
                  className="w-full px-4 py-2 rounded bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
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
                {editingUser ? 'Update' : 'Create'}
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
              Are you sure you want to delete this admin user? This action cannot be undone.
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
                  const user = users.find(u => u.id === deleteConfirm);
                  if (user) {
                    handleDelete(user);
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

export default UserManagement;
