import React, { useState, useEffect } from "react";
import { EditIcon, TrashIcon } from "../../components/Icons";
import { useToast } from "../../hooks/useToast";
import Pagination from "../../components/Pagination";
import { apiClient } from "../../services/apiClient";
import {
  loadRoles,
  findRoleLabel,
  permissionsList,
} from "../../services/rolesConfig";

interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

// Format phone number as ###-###-####
const formatPhoneNumber = (value: string): string => {
  const cleaned = value.replace(/\D/g, "");
  const limited = cleaned.slice(0, 10);

  if (limited.length <= 3) {
    return limited;
  } else if (limited.length <= 6) {
    return `${limited.slice(0, 3)}-${limited.slice(3)}`;
  } else {
    return `${limited.slice(0, 3)}-${limited.slice(3, 6)}-${limited.slice(6)}`;
  }
};

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    role: "manager" as string,
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
        // Fallback to mock data if backend not available
        const mockUsers: AdminUser[] = [
          {
            id: "1",
            firstName: "John",
            lastName: "Admin",
            username: "admin",
            email: "admin@customthreads.com",
            phone: "555-123-4567",
            role: "super_admin",
            permissions: ["all"],
            isActive: true,
            createdAt: "2024-01-15T10:30:00Z",
            lastLogin: "2026-01-26T08:00:00Z",
          },
          {
            id: "2",
            firstName: "Sarah",
            lastName: "Manager",
            username: "manager1",
            email: "manager@customthreads.com",
            phone: "555-234-5678",
            role: "manager",
            permissions: ["products", "orders", "customers"],
            isActive: true,
            createdAt: "2024-03-20T14:15:00Z",
            lastLogin: "2026-01-25T16:45:00Z",
          },
          {
            id: "3",
            firstName: "Michael",
            lastName: "Staff",
            username: "staff_admin",
            email: "staff@customthreads.com",
            phone: "555-345-6789",
            role: "admin",
            permissions: ["products", "gallery", "pages"],
            isActive: false,
            createdAt: "2024-06-10T09:00:00Z",
            lastLogin: "2025-12-20T11:30:00Z",
          },
        ];
        setUsers(mockUsers);
        setFilteredUsers(mockUsers);
        addToast("Using demo data - backend not connected", "info");
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
        user.email.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [searchTerm, users]);

  const handleOpenModal = (user?: AdminUser) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        username: user.username ?? "",
        email: user.email ?? "",
        phone: user.phone ?? "",
        password: "",
        role: user.role ?? "manager",
      });
    } else {
      setEditingUser(null);
      setFormData({
        firstName: "",
        lastName: "",
        username: "",
        email: "",
        phone: "",
        password: "",
        role: "manager" as string,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData({
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      phone: "",
      password: "",
      role: "manager" as string,
    });
  };

  const handleSave = async () => {
    if (
      !formData.firstName?.trim() ||
      !formData.lastName?.trim() ||
      !formData.username?.trim() ||
      !formData.email?.trim()
    ) {
      addToast(
        "First name, last name, username and email are required",
        "error",
      );
      return;
    }

    if (!editingUser && !formData.password) {
      addToast("Password is required for new users", "error");
      return;
    }

    // Validate phone format
    const phonePattern = /^\d{3}-\d{3}-\d{4}$/;
    if (formData.phone && !phonePattern.test(formData.phone)) {
      addToast("Phone must be in format: 555-123-4567", "error");
      return;
    }

    try {
      if (editingUser) {
        await apiClient.adminUsers.update(editingUser.id, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          username: formData.username,
          email: formData.email,
          ...(formData.password && { password: formData.password }),
          role: formData.role,
        });
        addToast("Admin user updated successfully", "success");
      } else {
        await apiClient.adminUsers.create({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          username: formData.username,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        });
        addToast("Admin user created successfully", "success");
      }

      // Reload users
      const updatedUsers = await apiClient.adminUsers.getAll();
      setUsers(updatedUsers);
      setFilteredUsers(updatedUsers);
      handleCloseModal();
    } catch (error) {
      addToast(
        `Failed to save admin user: ${error instanceof Error ? error.message : "Unknown error"}`,
        "error",
      );
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    try {
      await apiClient.adminUsers.toggleActive(user.id);
      const updatedUsers = await apiClient.adminUsers.getAll();
      setUsers(updatedUsers);
      setFilteredUsers(
        updatedUsers.filter(
          (u) =>
            u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(searchTerm.toLowerCase()),
        ),
      );
      addToast(
        `Admin user ${user.isActive ? "deactivated" : "activated"} successfully`,
        "success",
      );
    } catch (error) {
      addToast(
        `Failed to toggle admin user status: ${error instanceof Error ? error.message : "Unknown error"}`,
        "error",
      );
    }
  };

  const handleDelete = async (user: AdminUser) => {
    try {
      await apiClient.adminUsers.delete(user.id);
      const updatedUsers = await apiClient.adminUsers.getAll();
      setUsers(updatedUsers);
      setFilteredUsers(
        updatedUsers.filter(
          (u) =>
            u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(searchTerm.toLowerCase()),
        ),
      );
      setDeleteConfirm(null);
      addToast("Admin user deleted successfully", "success");
    } catch (error) {
      addToast(
        `Failed to delete admin user: ${error instanceof Error ? error.message : "Unknown error"}`,
        "error",
      );
      setDeleteConfirm(null);
    }
  };

  // Pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex =
    itemsPerPage === filteredUsers.length
      ? filteredUsers.length
      : startIndex + itemsPerPage;
  const paginatedUsers =
    itemsPerPage === filteredUsers.length
      ? filteredUsers
      : filteredUsers.slice(
          startIndex,
          Math.min(endIndex, filteredUsers.length),
        );

  const getRoleColor = (role: string) => {
    switch (role) {
      case "super_admin":
        return "bg-red-900 text-red-200";
      case "admin":
        return "bg-orange-900 text-orange-200";
      case "manager":
        return "bg-blue-900 text-blue-200";
      default:
        return "bg-gray-900 text-gray-200";
    }
  };

  const roleOptions = loadRoles();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        Loading admin users...
      </div>
    );
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
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-t border-slate-700 hover:bg-slate-700/50"
                  >
                    <td className="px-6 py-4 text-white font-medium">
                      {user.firstName} {user.lastName}
                    </td>
                    <td className="px-6 py-4 text-gray-300">{user.username}</td>
                    <td className="px-6 py-4 text-gray-300">{user.email}</td>
                    <td className="px-6 py-4 text-gray-300">{user.phone}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleColor(user.role)}`}
                      >
                        {findRoleLabel(roleOptions, user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(user)}
                        className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                          user.isActive
                            ? "bg-green-900 text-green-200 hover:bg-green-800"
                            : "bg-red-900 text-red-200 hover:bg-red-800"
                        }`}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
                      {user.lastLogin
                        ? new Date(user.lastLogin).toLocaleDateString()
                        : "Never"}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-800 p-6 rounded-lg max-w-2xl w-full my-8">
            <h2 className="text-xl font-bold text-white mb-4">
              {editingUser ? "Edit Admin User" : "Add New Admin User"}
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    placeholder="Enter first name"
                    className="w-full px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    placeholder="Enter last name"
                    className="w-full px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Username *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  placeholder="Enter username"
                  className="w-full px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="Enter email"
                  className="w-full px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      phone: formatPhoneNumber(e.target.value),
                    })
                  }
                  placeholder="555-123-4567"
                  className="w-full px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Format: XXX-XXX-XXXX
                </p>
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="Enter password"
                    className="w-full px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              )}

              {editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    New Password (leave blank to keep current)
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="Leave blank to keep current password"
                    className="w-full px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {roleOptions.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Role Permissions
                </label>
                <div className="p-4 bg-slate-700/50 rounded">
                  {(() => {
                    const currentRole = roleOptions.find(
                      (r) => r.key === formData.role,
                    );
                    const perms = currentRole
                      ? currentRole.permissions.includes("*")
                        ? permissionsList
                        : currentRole.permissions
                      : [];
                    return perms.length === 0 ? (
                      <p className="text-gray-400 text-sm">
                        No permissions assigned to this role.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {perms.map((p) => (
                          <span
                            key={p}
                            className="px-2 py-1 bg-slate-600 text-white rounded text-xs capitalize"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Permissions are set by role. Edit roles in Admin → Security.
                </p>
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
                {editingUser ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-lg max-w-sm w-full">
            <h2 className="text-xl font-bold text-white mb-4">
              Confirm Delete
            </h2>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete this admin user? This action
              cannot be undone.
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
                  const user = users.find((u) => u.id === deleteConfirm);
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
