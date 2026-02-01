import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import { AdminUser, Customer } from "../types";
import Spinner from "../components/Spinner";
import { apiClient } from "../services/apiClient";

interface AdminContextType {
  adminUser: AdminUser | null;
  isAdminAuthenticated: boolean;
  isLoading: boolean;
  loginAdmin: (
    username: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logoutAdmin: () => void;

  customers: Customer[];
  fetchCustomers: () => Promise<void>;
  getCustomer: (customerId: string) => Customer | undefined;
  sendPasswordResetEmail: (
    customerId: string,
  ) => Promise<{ success: boolean; error?: string }>;
  updateCustomerAddress: (
    customerId: string,
    addressId: string,
    updates: any,
  ) => Promise<{ success: boolean; error?: string }>;
  updateCustomerEmailPreferences: (
    customerId: string,
    preferences: any,
  ) => Promise<{ success: boolean; error?: string }>;
  deactivateCustomer: (
    customerId: string,
  ) => Promise<{ success: boolean; error?: string }>;
  reactivateCustomer: (
    customerId: string,
  ) => Promise<{ success: boolean; error?: string }>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

// Note: Admin users are now authenticated via the backend API
// Mock admin users for fallback/initial setup
const MOCK_ADMIN_USERS: AdminUser[] = [
  {
    id: "mock-admin-1",
    firstName: "Mock",
    lastName: "Admin",
    phone: "555-000-0000",
    username: "admin",
    email: "admin@local",
    role: "super_admin",
    permissions: ["*"],
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    isActive: true,
  },
];

export const AdminProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [useMockAuth, setUseMockAuth] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Check for stored admin user
        const storedAdmin = localStorage.getItem("adminUser");
        const storedToken = localStorage.getItem("adminToken");
        if (storedAdmin) {
          setAdminUser(JSON.parse(storedAdmin));
          if (storedToken) {
            apiClient.setToken(storedToken);
          }
        }

        // Try to check if any admins exist in the API
        try {
          const admins = await apiClient.adminUsers.getAll();
          setUseMockAuth(admins.length === 0);
          console.log(`[Admin] Found ${admins.length} admins in database, using real auth`);
        } catch (error) {
          // API unavailable, use mock auth
          setUseMockAuth(true);
          console.log("[Admin] API unavailable, falling back to mock auth");
        }

        // Load customers
        const storedCustomers = localStorage.getItem("customers");
        if (storedCustomers) {
          setCustomers(JSON.parse(storedCustomers));
        }
      } catch (error) {
        console.error("Failed to load initial admin data", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // ===== ADMIN AUTHENTICATION =====
  const loginAdmin = async (username: string, password: string) => {
    try {
      // If using mock auth or API unavailable, try mock first
      if (useMockAuth) {
        const mockUser = MOCK_ADMIN_USERS.find(
          (u) => u.username === username && u.isActive
        );
        if (mockUser && password === "admin123") {
          const updatedUser = { ...mockUser, lastLogin: new Date().toISOString() };
          setAdminUser(updatedUser);
          localStorage.setItem("adminUser", JSON.stringify(updatedUser));
          localStorage.setItem("adminToken", "mock-token");
          console.log("[Admin] Logged in with mock credentials");
          return { success: true };
        }
        return { success: false, error: "Invalid mock credentials (use admin/admin123)" };
      }

      // Try real API
      const response = await apiClient.auth.adminLogin(username, password);
      const updatedUser: AdminUser = {
        id: response.admin.id,
        firstName: response.admin.firstName,
        lastName: response.admin.lastName,
        phone: response.admin.phone,
        username: response.admin.username,
        email: response.admin.email,
        role: response.admin.role,
        permissions: response.admin.permissions || [],
        createdAt: response.admin.createdAt,
        lastLogin: new Date().toISOString(),
        isActive: response.admin.isActive,
      };

      setAdminUser(updatedUser);
      localStorage.setItem("adminToken", response.token);
      localStorage.setItem("adminUser", JSON.stringify(updatedUser));
      apiClient.setToken(response.token);
      return { success: true };
    } catch (error) {
      // If API fails and we haven't tried mock, try it now
      if (!useMockAuth) {
        const mockUser = MOCK_ADMIN_USERS.find(
          (u) => u.username === username && u.isActive
        );
        if (mockUser && password === "admin123") {
          const updatedUser = { ...mockUser, lastLogin: new Date().toISOString() };
          setAdminUser(updatedUser);
          localStorage.setItem("adminUser", JSON.stringify(updatedUser));
          localStorage.setItem("adminToken", "mock-token");
          setUseMockAuth(true);
          console.log("[Admin] API failed, fell back to mock credentials");
          return { success: true };
        }
      }
      const message = error instanceof Error ? error.message : "Login failed";
      return { success: false, error: message };
    }
  };

  const logoutAdmin = () => {
    setAdminUser(null);
    localStorage.removeItem("adminUser");
    localStorage.removeItem("adminToken");
    if (localStorage.getItem("adminToken") !== "mock-token") {
      apiClient.setToken(null);
    }
  };

  // ===== CUSTOMER MANAGEMENT =====
  const fetchCustomers = async () => {
    try {
      const stored = localStorage.getItem("customers");
      if (stored) {
        setCustomers(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to fetch customers", error);
    }
  };

  const getCustomer = (customerId: string) => {
    return customers.find((c) => c.id === customerId);
  };

  const sendPasswordResetEmail = async (customerId: string) => {
    try {
      const customer = getCustomer(customerId);
      if (!customer) return { success: false, error: "Customer not found" };
      console.log(`Password reset email sent to ${customer.email}`);
      return { success: true };
    } catch (error) {
      return { success: false, error: "Failed to send password reset email" };
    }
  };

  const updateCustomerAddress = async (
    customerId: string,
    addressId: string,
    updates: any,
  ) => {
    try {
      const updated = customers.map((c) => {
        if (c.id === customerId) {
          return {
            ...c,
            addresses: c.addresses.map((a) =>
              a.id === addressId ? { ...a, ...updates } : a,
            ),
          };
        }
        return c;
      });
      setCustomers(updated);
      localStorage.setItem("customers", JSON.stringify(updated));
      return { success: true };
    } catch (error) {
      return { success: false, error: "Failed to update address" };
    }
  };

  const updateCustomerEmailPreferences = async (
    customerId: string,
    preferences: any,
  ) => {
    try {
      const updated = customers.map((c) => {
        if (c.id === customerId) {
          return { ...c, emailPreferences: preferences };
        }
        return c;
      });
      setCustomers(updated);
      localStorage.setItem("customers", JSON.stringify(updated));
      return { success: true };
    } catch (error) {
      return { success: false, error: "Failed to update email preferences" };
    }
  };

  const deactivateCustomer = async (customerId: string) => {
    try {
      const updated = customers.map((c) =>
        c.id === customerId ? { ...c, isActive: false } : c,
      );
      setCustomers(updated);
      localStorage.setItem("customers", JSON.stringify(updated));
      return { success: true };
    } catch (error) {
      return { success: false, error: "Failed to deactivate customer" };
    }
  };

  const reactivateCustomer = async (customerId: string) => {
    try {
      const updated = customers.map((c) =>
        c.id === customerId ? { ...c, isActive: true } : c,
      );
      setCustomers(updated);
      localStorage.setItem("customers", JSON.stringify(updated));
      return { success: true };
    } catch (error) {
      return { success: false, error: "Failed to reactivate customer" };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-slate-900">
        <Spinner />
      </div>
    );
  }

  const isAdminAuthenticated = !!adminUser;

  return (
    <AdminContext.Provider
      value={{
        adminUser,
        isAdminAuthenticated,
        isLoading,
        loginAdmin,
        logoutAdmin,
        customers,
        fetchCustomers,
        getCustomer,
        sendPasswordResetEmail,
        updateCustomerAddress,
        updateCustomerEmailPreferences,
        deactivateCustomer,
        reactivateCustomer,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
};
