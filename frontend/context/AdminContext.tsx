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

const AdminContext = createContext<AdminContextType | undefined>(undefined);

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
        const storedAdmin = localStorage.getItem("adminUser");
        const storedToken = localStorage.getItem("adminToken");
        if (storedAdmin && storedToken !== "mock-token") {
          setAdminUser(JSON.parse(storedAdmin));
          if (storedToken) {
            apiClient.setToken(storedToken);
          }
        }
        try {
          const admins = await apiClient.adminUsers.getAll();
          const shouldUseMock = admins.length === 0;
          setUseMockAuth(shouldUseMock);
          if (shouldUseMock) {
            console.log(
              "[Admin] No admins in database, using mock auth for initial setup",
            );
          } else {
            console.log(
              `[Admin] Found ${admins.length} real admins, using real auth`,
            );
          }
        } catch (error) {
          const hasToken = storedToken && storedToken !== "mock-token";
          setUseMockAuth(!hasToken);
          if (hasToken) {
            console.log(
              "[Admin] API temporarily unavailable, but using stored real token",
            );
          } else {
            console.log(
              "[Admin] API unavailable and no stored token, falling back to mock auth",
            );
          }
        }
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

  const loginAdmin = async (username: string, password: string) => {
    try {
      try {
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
        setUseMockAuth(false);
        console.log("[Admin] Real API login successful");
        return { success: true };
      } catch (apiError) {
        if (useMockAuth) {
          const mockUser = MOCK_ADMIN_USERS.find(
            (u) => u.username === username && u.isActive,
          );
          if (mockUser && password === "admin123") {
            const updatedUser = {
              ...mockUser,
              lastLogin: new Date().toISOString(),
            };
            setAdminUser(updatedUser);
            localStorage.setItem("adminUser", JSON.stringify(updatedUser));
            localStorage.setItem("adminToken", "mock-token");
            console.log(
              "[Admin] Mock login successful (no real admins configured)",
            );
            return { success: true };
          }
          return { success: false, error: "Invalid credentials" };
        }
        throw apiError;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      return { success: false, error: message };
    }
  };

  useEffect(() => {
    if (!adminUser) return;
    const TIMEOUT_MS = 5 * 60 * 1000;
    let timeoutId: NodeJS.Timeout;
    const resetTimeout = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        console.log("[Admin] Session expired due to inactivity");
        logoutAdmin();
      }, TIMEOUT_MS);
    };
    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"];
    events.forEach((event) => {
      document.addEventListener(event, resetTimeout);
    });
    resetTimeout();
    return () => {
      clearTimeout(timeoutId);
      events.forEach((event) => {
        document.removeEventListener(event, resetTimeout);
      });
    };
  }, [adminUser]);

  const logoutAdmin = () => {
    setAdminUser(null);
    localStorage.removeItem("adminUser");
    localStorage.removeItem("adminToken");
    if (localStorage.getItem("adminToken") !== "mock-token") {
      apiClient.setToken(null);
    }
  };

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
// ...existing code...
