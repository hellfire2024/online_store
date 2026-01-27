import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import { AdminUser, Customer } from "../types";
import Spinner from "../components/Spinner";

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

// Mock admin users - in production, these would be from a database
const MOCK_ADMIN_USERS: AdminUser[] = [
  {
    id: "admin-1",
    username: "admin",
    email: "admin@customthreads.com",
    role: "super_admin",
    permissions: ["*"],
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    isActive: true,
  },
  {
    id: "admin-2",
    username: "manager",
    email: "manager@customthreads.com",
    role: "admin",
    permissions: ["products", "orders", "customers", "galleries"],
    createdAt: new Date().toISOString(),
    isActive: true,
  },
];

export const AdminProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Check for stored admin user
        const storedAdmin = localStorage.getItem("adminUser");
        if (storedAdmin) {
          setAdminUser(JSON.parse(storedAdmin));
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
      const user = MOCK_ADMIN_USERS.find(
        (u) => u.username === username && u.isActive,
      );

      if (!user || password !== "admin123") {
        return { success: false, error: "Invalid username or password" };
      }

      const updatedUser = { ...user, lastLogin: new Date().toISOString() };
      setAdminUser(updatedUser);
      localStorage.setItem("adminUser", JSON.stringify(updatedUser));
      return { success: true };
    } catch (error) {
      return { success: false, error: "Login failed" };
    }
  };

  const logoutAdmin = () => {
    setAdminUser(null);
    localStorage.removeItem("adminUser");
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
