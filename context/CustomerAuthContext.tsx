import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import { Customer, CustomerAddress, CustomerOrder } from "../types";
import { apiClient } from "../services/apiClient";

interface CustomerAuthContextType {
  customer: Customer | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Authentication
  register: (
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    phone?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;

  // Account Management
  updateProfile: (
    firstName: string,
    lastName: string,
    phone?: string,
  ) => Promise<{ success: boolean; error?: string }>;

  // Addresses
  addAddress: (
    address: Omit<CustomerAddress, "id">,
  ) => Promise<{ success: boolean; error?: string }>;
  updateAddress: (
    address: CustomerAddress,
  ) => Promise<{ success: boolean; error?: string }>;
  deleteAddress: (
    addressId: string,
  ) => Promise<{ success: boolean; error?: string }>;
  setDefaultAddress: (
    addressId: string,
    type: "shipping" | "billing",
  ) => Promise<{ success: boolean; error?: string }>;

  // Email Preferences
  updateEmailPreferences: (preferences: {
    marketing: boolean;
    orderUpdates: boolean;
    announcements: boolean;
  }) => Promise<{ success: boolean; error?: string }>;

  // Password Management
  requestPasswordReset: (
    email: string,
  ) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (
    token: string,
    newPassword: string,
  ) => Promise<{ success: boolean; error?: string }>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<{ success: boolean; error?: string }>;

  // Orders
  fetchOrders: () => Promise<void>;
  getOrder: (orderId: string) => CustomerOrder | undefined;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(
  undefined,
);

export const CustomerAuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize from localStorage
  useEffect(() => {
    const storedCustomer = localStorage.getItem("customer");
    const storedToken = localStorage.getItem("auth_token");
    
    if (storedCustomer && storedToken) {
      try {
        // Restore JWT token first
        apiClient.setToken(storedToken);
        const parsed = JSON.parse(storedCustomer);
        setCustomer(parsed);

        // Refresh customer profile to pull addresses
        if (parsed?.id) {
          apiClient.customers
            .getById(parsed.id)
            .then((profile) => {
              const normalized = mapCustomer(profile);
              setCustomer(normalized);
              localStorage.setItem("customer", JSON.stringify(normalized));
            })
            .catch((error) => {
              console.warn("Failed to refresh customer profile", error);
            });
        }
      } catch (error) {
        console.error("Failed to restore customer session", error);
        // Clear invalid session
        localStorage.removeItem("customer");
        localStorage.removeItem("auth_token");
      }
    }
  }, []);

    const mapAddress = (address: any): CustomerAddress => {
      const firstName = address.firstName ?? address.first_name ?? '';
      const lastName = address.lastName ?? address.last_name ?? '';
      const fullName =
        address.fullName ??
        address.full_name ??
        `${firstName} ${lastName}`.trim();

      return {
        id: address.id,
        type: address.type,
        firstName,
        lastName,
        fullName,
        streetAddress: address.streetAddress ?? address.street_address ?? '',
        city: address.city ?? '',
        state: address.state ?? '',
        zipCode: address.zipCode ?? address.zip_code ?? '',
        country: address.country ?? 'US',
        phone: address.phone ?? '',
        isDefault: Boolean(address.isDefault ?? address.is_default),
      };
    };

    const mapCustomer = (data: any): Customer => {
      const firstName = data.firstName ?? data.first_name ?? '';
      const lastName = data.lastName ?? data.last_name ?? '';
      const name = data.name ?? `${firstName} ${lastName}`.trim();

      return {
        id: data.id,
        name,
        firstName,
        lastName,
        email: data.email ?? '',
        phone: data.phone ?? '',
        createdAt: data.createdAt ?? data.created_at ?? new Date().toISOString(),
        lastLogin: data.lastLogin ?? data.last_login ?? new Date().toISOString(),
        addresses: Array.isArray(data.addresses) ? data.addresses.map(mapAddress) : [],
        orders: data.orders ?? [],
        emailPreferences: data.emailPreferences ?? data.email_preferences ?? {
          marketing: true,
          orderUpdates: true,
          announcements: true,
        },
        isActive: data.isActive ?? data.is_active ?? true,
      };
    };

  const register = async (firstName: string, lastName: string, email: string, password: string, phone?: string) => {
    setIsLoading(true);
    try {
      const result = await apiClient.auth.customerRegister(firstName, lastName, email, password, phone);

      if (result && result.customer && result.token) {
        // Store JWT token
        apiClient.setToken(result.token);

        let newCustomer: Customer = mapCustomer(result.customer);

        // Fetch full profile to include addresses
        try {
          const profile = await apiClient.customers.getById(result.customer.id);
          newCustomer = mapCustomer(profile);
        } catch (error) {
          console.warn("Failed to load customer profile after registration", error);
        }

        setCustomer(newCustomer);
        localStorage.setItem("customer", JSON.stringify(newCustomer));
        return { success: true };
      }
      return { success: false, error: "Registration failed" };
    } catch (error: any) {
      console.error("Registration error:", error);
      return { success: false, error: error.message || "Registration failed" };
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await apiClient.auth.customerLogin(email, password);

      if (result && result.customer && result.token) {
        // Store JWT token
        apiClient.setToken(result.token);

        let loggedInCustomer: Customer = mapCustomer(result.customer);

        // Fetch full profile to include addresses
        try {
          const profile = await apiClient.customers.getById(result.customer.id);
          loggedInCustomer = mapCustomer(profile);
        } catch (error) {
          console.warn("Failed to load customer profile after login", error);
        }

        setCustomer(loggedInCustomer);
        localStorage.setItem("customer", JSON.stringify(loggedInCustomer));
        return { success: true };
      }
      return { success: false, error: "Login failed" };
    } catch (error: any) {
      console.error("Login error:", error);
      return { success: false, error: error.message || "Invalid email or password" };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setCustomer(null);
    localStorage.removeItem("customer");
    apiClient.setToken(null); // Clear JWT token
  };

  const updateProfile = async (firstName: string, lastName: string, phone?: string) => {
    if (!customer) return { success: false, error: "Not authenticated" };

    try {
      const result = await apiClient.customers.update(customer.id, {
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        phone: phone || undefined,
      });

      if (result && result.id) {
        const updated = { 
          ...customer, 
          firstName,
          lastName,
          name: `${firstName} ${lastName}`,
          phone: phone || customer.phone 
        };
        setCustomer(updated);
        localStorage.setItem("customer", JSON.stringify(updated));
        return { success: true };
      }
      return { success: false, error: "Profile update failed" };
    } catch (error: any) {
      console.error("Profile update error:", error);
      return { success: false, error: error.message || "Profile update failed" };
    }
  };

  const addAddress = async (address: Omit<CustomerAddress, "id">) => {
    if (!customer) return { success: false, error: "Not authenticated" };

    try {
      const newAddress: CustomerAddress = {
        ...address,
        id: `addr-${Date.now()}`,
      };

      const updated = {
        ...customer,
        addresses: [...customer.addresses, newAddress],
      };

      setCustomer(updated);
      localStorage.setItem("customer", JSON.stringify(updated));
      return { success: true };
    } catch (error) {
      return { success: false, error: "Failed to add address" };
    }
  };

  const updateAddress = async (address: CustomerAddress) => {
    if (!customer) return { success: false, error: "Not authenticated" };

    try {
      const updated = {
        ...customer,
        addresses: customer.addresses.map((a) =>
          a.id === address.id ? address : a,
        ),
      };

      setCustomer(updated);
      localStorage.setItem("customer", JSON.stringify(updated));
      return { success: true };
    } catch (error) {
      return { success: false, error: "Failed to update address" };
    }
  };

  const deleteAddress = async (addressId: string) => {
    if (!customer) return { success: false, error: "Not authenticated" };

    try {
      const updated = {
        ...customer,
        addresses: customer.addresses.filter((a) => a.id !== addressId),
      };

      setCustomer(updated);
      localStorage.setItem("customer", JSON.stringify(updated));
      return { success: true };
    } catch (error) {
      return { success: false, error: "Failed to delete address" };
    }
  };

  const setDefaultAddress = async (
    addressId: string,
    type: "shipping" | "billing",
  ) => {
    if (!customer) return { success: false, error: "Not authenticated" };

    try {
      const updated = {
        ...customer,
        addresses: customer.addresses.map((a) => ({
          ...a,
          isDefault:
            a.id === addressId && a.type === type
              ? true
              : a.type !== type
                ? a.isDefault
                : false,
        })),
      };

      setCustomer(updated);
      localStorage.setItem("customer", JSON.stringify(updated));
      return { success: true };
    } catch (error) {
      return { success: false, error: "Failed to set default address" };
    }
  };

  const updateEmailPreferences = async (preferences: {
    marketing: boolean;
    orderUpdates: boolean;
    announcements: boolean;
  }) => {
    if (!customer) return { success: false, error: "Not authenticated" };

    try {
      const updated = {
        ...customer,
        emailPreferences: preferences,
      };

      setCustomer(updated);
      localStorage.setItem("customer", JSON.stringify(updated));
      return { success: true };
    } catch (error) {
      return { success: false, error: "Failed to update preferences" };
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      // In a real app, this would send an email with a reset link
      console.log(`Password reset email sent to ${email}`);
      return { success: true };
    } catch (error) {
      return { success: false, error: "Failed to request password reset" };
    }
  };

  const resetPassword = async (_token: string, _newPassword: string) => {
    try {
      // In a real app, this would validate the token and update the password
      return { success: true };
    } catch (error) {
      return { success: false, error: "Failed to reset password" };
    }
  };

  const changePassword = async (
    _currentPassword: string,
    _newPassword: string,
  ) => {
    if (!customer) return { success: false, error: "Not authenticated" };

    try {
      // In a real app, this would validate the current password
      return { success: true };
    } catch (error) {
      return { success: false, error: "Failed to change password" };
    }
  };

  const fetchOrders = async () => {
    if (!customer) return;

    try {
      const apiOrders = await apiClient.orders.getForCustomer(customer.id);
      const ordersArray = Array.isArray(apiOrders) ? apiOrders : [];

      const mappedOrders = ordersArray.map((order: any) => {
        let orderData: any = order.order_data;
        if (typeof orderData === "string") {
          try {
            orderData = JSON.parse(orderData);
          } catch {
            orderData = {};
          }
        }

        const shipping = orderData?.shippingAddress || {};
        const shippingAddress = {
          id: `order-${order.order_number}-shipping`,
          type: "shipping" as const,
          firstName: shipping.firstName || "",
          lastName: shipping.lastName || "",
          fullName: `${shipping.firstName || ""} ${shipping.lastName || ""}`.trim(),
          streetAddress: shipping.street1 || "",
          city: shipping.city || "",
          state: shipping.state || "",
          zipCode: shipping.zip || "",
          country: shipping.country || "US",
          phone: shipping.phone || "",
          isDefault: false,
        };

        return {
          id: order.id?.toString() || order.order_number,
          orderNumber: order.order_number || orderData.orderNumber || "",
          date: order.created_at || new Date().toISOString(),
          subtotal: Number(order.subtotal ?? orderData.subtotal ?? 0),
          shippingCost: Number(order.shipping_cost ?? orderData.shipping ?? 0),
          taxAmount: Number(order.tax_amount ?? orderData.tax ?? 0),
          total: Number(order.total ?? orderData.total ?? 0),
          status: order.status || "pending",
          shippingAddress,
          items: Array.isArray(orderData.items) ? orderData.items : [],
          trackingNumber: order.tracking_number || undefined,
          appliedTaxRate: orderData.appliedTaxRate ?? undefined,
        };
      });

      const updatedCustomer = {
        ...customer,
        orders: mappedOrders,
      };

      setCustomer(updatedCustomer);
      localStorage.setItem("customer", JSON.stringify(updatedCustomer));
    } catch (error) {
      console.error("Failed to fetch orders", error);
    }
  };

  const getOrder = (orderId: string) => {
    return customer?.orders.find((o) => o.id === orderId);
  };

  const isAuthenticated = !!customer;

  return (
    <CustomerAuthContext.Provider
      value={{
        customer,
        isAuthenticated,
        isLoading,
        register,
        login,
        logout,
        updateProfile,
        addAddress,
        updateAddress,
        deleteAddress,
        setDefaultAddress,
        updateEmailPreferences,
        requestPasswordReset,
        resetPassword,
        changePassword,
        fetchOrders,
        getOrder,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
};

export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (context === undefined) {
    throw new Error(
      "useCustomerAuth must be used within a CustomerAuthProvider",
    );
  }
  return context;
};
