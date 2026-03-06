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
  const [isLoading, setIsLoading] = useState(true);

  // Initialize on app startup - restore session if token exists
  useEffect(() => {
    const restoreSession = async () => {
      console.log("[Auth] Starting session restoration...");
      setIsLoading(true);
      try {
        const storedToken = localStorage.getItem("auth_token");
        const storedCustomer = localStorage.getItem("customer");
        let hasHydratedStoredCustomer = false;

        console.log("[Auth] Stored token exists:", !!storedToken);
        console.log("[Auth] Token length:", storedToken?.length || 0);
        console.log("[Auth] Stored customer exists:", !!storedCustomer);

        // Check if admin is logged in - if so, skip customer restoration
        const adminToken = localStorage.getItem("adminToken");
        if (adminToken) {
          console.log(
            "[Auth] Admin is logged in, skipping customer session restoration",
          );
          setCustomer(null);
          setIsLoading(false);
          return;
        }

        if (storedToken) {
          // Optimistically hydrate from localStorage first to preserve session UX on refresh
          if (storedCustomer) {
            try {
              const parsedCustomer = JSON.parse(storedCustomer);
              const mappedStoredCustomer = mapCustomer(parsedCustomer);
              setCustomer(mappedStoredCustomer);
              hasHydratedStoredCustomer = true;
              console.log("[Auth] Hydrated customer from localStorage");
            } catch (parseError) {
              console.warn(
                "[Auth] Failed to parse stored customer:",
                parseError,
              );
            }
          }

          // Set token in API client for authenticated requests
          console.log("[Auth] Setting token in API client...");
          apiClient.setToken(storedToken);
          console.log(
            "[Auth] API client token after set:",
            !!apiClient.getToken(),
          );

          // Try to validate token by fetching current customer data
          try {
            console.log("[Auth] Calling getCurrentCustomer...");
            const currentCustomer = await apiClient.auth.getCurrentCustomer();
            console.log(
              "[Auth] getCurrentCustomer response:",
              !!currentCustomer,
            );

            if (currentCustomer) {
              console.log("[Auth] Mapping customer data...");
              const mappedCustomer = mapCustomer(currentCustomer);
              console.log("[Auth] Customer mapped, setting state...");
              setCustomer(mappedCustomer);
              storeCustomerToLocalStorage(mappedCustomer);
              console.log("[Auth] Session restored successfully!");
              return;
            } else {
              console.warn("[Auth] getCurrentCustomer returned no data");
            }
          } catch (validateError: any) {
            console.error(
              "[Auth] Token validation failed:",
              validateError?.message || validateError,
            );
            // Clear token on 401 (unauthorized) or 403 (forbidden - invalid/malformed token)
            const status =
              validateError?.status || validateError?.response?.status;
            if (status === 401 || status === 403) {
              console.log(
                `[Auth] Token is invalid (${status}), clearing session`,
              );
              localStorage.removeItem("auth_token");
              localStorage.removeItem("customer");
              apiClient.setToken(null);
              setCustomer(null);
            } else {
              console.log(
                "[Auth] Keeping token - error might be temporary:",
                validateError?.message,
              );
              // Keep token and any hydrated customer state for transient errors
              if (!hasHydratedStoredCustomer) {
                console.log(
                  "[Auth] No stored customer to hydrate; leaving current auth state unchanged",
                );
              }
              return;
            }
          }
        } else {
          console.log("[Auth] No stored token found");
        }

        // No valid session found
        console.log("[Auth] No valid session, user logged out");
        setCustomer(null);
      } finally {
        setIsLoading(false);
        console.log("[Auth] Session restoration complete");
      }
    };

    restoreSession();
  }, []);

  const mapAddress = (address: any): CustomerAddress => {
    const firstName = address.firstName ?? address.first_name ?? "";
    const lastName = address.lastName ?? address.last_name ?? "";
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
      street1:
        address.street1 ??
        address.streetAddress ??
        address.street_address ??
        "",
      street2: address.street2 ?? "",
      city: address.city ?? "",
      state: address.state ?? "",
      zip: address.zip ?? address.zipCode ?? address.zip_code ?? "",
      country: address.country ?? "US",
      phone: address.phone ?? "",
      isDefault: Boolean(address.isDefault ?? address.is_default),
    };
  };

  const mapCustomer = (data: any): Customer => {
    const firstName = data.firstName ?? data.first_name ?? "";
    const lastName = data.lastName ?? data.last_name ?? "";
    const name = data.name ?? `${firstName} ${lastName}`.trim();

    return {
      id: data.id,
      name,
      firstName,
      lastName,
      email: data.email ?? "",
      phone: data.phone ?? "",
      createdAt: data.createdAt ?? data.created_at ?? new Date().toISOString(),
      lastLogin: data.lastLogin ?? data.last_login ?? new Date().toISOString(),
      addresses: Array.isArray(data.addresses)
        ? data.addresses.map(mapAddress)
        : [],
      orders: [], // Don't store orders in state - fetch on demand
      emailPreferences: data.emailPreferences ??
        data.email_preferences ?? {
          marketing: true,
          orderUpdates: true,
          announcements: true,
        },
      isActive: data.isActive ?? data.is_active ?? true,
    };
  };

  const storeCustomerToLocalStorage = (customer: Customer) => {
    // Store minimal customer data to avoid localStorage quota issues
    // DO NOT clear localStorage - that would delete the auth_token!
    const minimalCustomer = {
      id: customer.id,
      name: customer.name,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone || "",
      // Store only address IDs and essential info - NOT full address details
      addressCount: customer.addresses?.length || 0,
      emailPreferences: customer.emailPreferences,
      isActive: customer.isActive,
      createdAt: customer.createdAt,
      lastLogin: customer.lastLogin,
    };
    try {
      localStorage.setItem("customer", JSON.stringify(minimalCustomer));
      // Auth token is managed by apiClient.setToken(), don't overwrite it here
    } catch (error) {
      console.error("Failed to store customer data to localStorage:", error);
    }
  };

  const register = async (
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    phone?: string,
  ) => {
    setIsLoading(true);
    try {
      const result = await apiClient.auth.customerRegister(
        firstName,
        lastName,
        email,
        password,
        phone,
      );

      if (result && result.customer && result.token) {
        // Store JWT token
        apiClient.setToken(result.token);

        // Use the customer object returned from registration endpoint
        // No need for extra API call - registration endpoint returns full customer data
        const newCustomer: Customer = mapCustomer(result.customer);
        setCustomer(newCustomer);
        storeCustomerToLocalStorage(newCustomer);
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
    console.log("[Auth] Login attempt for:", email);
    setIsLoading(true);
    try {
      const result = await apiClient.auth.customerLogin(email, password);
      console.log("[Auth] Login API response received:", !!result);
      console.log("[Auth] Has token:", !!result?.token);
      console.log("[Auth] Token length:", result?.token?.length || 0);

      if (result && result.customer && result.token) {
        // Clear admin session when customer logs in
        console.log("[Auth] Clearing admin session for customer login");
        localStorage.removeItem("adminToken");
        localStorage.removeItem("adminUser");

        // Store JWT token
        console.log("[Auth] Setting token in apiClient...");
        apiClient.setToken(result.token);
        localStorage.setItem("auth_token", result.token);
        console.log(
          "[Auth] Token stored in localStorage:",
          !!localStorage.getItem("auth_token"),
        );

        // Fetch fresh customer data with addresses from /customer/me endpoint
        try {
          console.log("[Auth] Fetching customer details with addresses...");
          const currentCustomer = await apiClient.auth.getCurrentCustomer();
          console.log("[Auth] Customer details received:", !!currentCustomer);

          if (currentCustomer) {
            const loggedInCustomer: Customer = mapCustomer(currentCustomer);
            console.log(
              "[Auth] Customer mapped, addresses count:",
              loggedInCustomer.addresses?.length || 0,
            );
            setCustomer(loggedInCustomer);
            storeCustomerToLocalStorage(loggedInCustomer);
            console.log("[Auth] Login successful!");
            return { success: true };
          }
        } catch (fetchError) {
          console.warn(
            "Could not fetch customer details after login:",
            fetchError,
          );
          // Fallback to login response data (without addresses)
          const loggedInCustomer: Customer = mapCustomer(result.customer);
          setCustomer(loggedInCustomer);
          storeCustomerToLocalStorage(loggedInCustomer);
          return { success: true };
        }
      }
      console.error("[Auth] Login failed - invalid response format");
      return { success: false, error: "Login failed" };
    } catch (error: any) {
      console.error("Login error:", error);
      return {
        success: false,
        error: error.message || "Invalid email or password",
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setCustomer(null);
    localStorage.removeItem("customer");
    apiClient.setToken(null); // Clear JWT token
  };

  const updateProfile = async (
    firstName: string,
    lastName: string,
    phone?: string,
  ) => {
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
          phone: phone || customer.phone,
        };
        setCustomer(updated);
        storeCustomerToLocalStorage(updated);
        return { success: true };
      }
      return { success: false, error: "Profile update failed" };
    } catch (error: any) {
      console.error("Profile update error:", error);
      return {
        success: false,
        error: error.message || "Profile update failed",
      };
    }
  };

  const addAddress = async (address: Omit<CustomerAddress, "id">) => {
    if (!customer) return { success: false, error: "Not authenticated" };

    try {
      const result = await apiClient.customerAddresses.add(
        customer.id,
        address,
      );

      if (result && result.id) {
        const newCustomer = {
          ...customer,
          addresses: [...customer.addresses, result],
        };

        setCustomer(newCustomer);
        storeCustomerToLocalStorage(newCustomer);
        return { success: true };
      }
      return { success: false, error: "Failed to add address" };
    } catch (error: any) {
      console.error("Add address error:", error);
      return {
        success: false,
        error: error.message || "Failed to add address",
      };
    }
  };

  const updateAddress = async (address: CustomerAddress) => {
    if (!customer) return { success: false, error: "Not authenticated" };

    try {
      const result = await apiClient.customerAddresses.update(
        customer.id,
        address.id,
        address,
      );

      if (result) {
        const updated = {
          ...customer,
          addresses: customer.addresses.map((a) =>
            a.id === address.id ? result : a,
          ),
        };

        setCustomer(updated);
        storeCustomerToLocalStorage(updated);
        return { success: true };
      }
      return { success: false, error: "Failed to update address" };
    } catch (error: any) {
      console.error("Update address error:", error);
      return {
        success: false,
        error: error.message || "Failed to update address",
      };
    }
  };

  const deleteAddress = async (addressId: string) => {
    if (!customer) return { success: false, error: "Not authenticated" };

    try {
      await apiClient.customerAddresses.delete(customer.id, addressId);

      const updated = {
        ...customer,
        addresses: customer.addresses.filter((a) => a.id !== addressId),
      };

      setCustomer(updated);
      storeCustomerToLocalStorage(updated);
      return { success: true };
    } catch (error: any) {
      console.error("Delete address error:", error);
      return {
        success: false,
        error: error.message || "Failed to delete address",
      };
    }
  };

  const setDefaultAddress = async (
    addressId: string,
    type: "shipping" | "billing",
  ) => {
    if (!customer) return { success: false, error: "Not authenticated" };

    try {
      // Update the address with isDefault flag via backend
      const addressToUpdate = customer.addresses.find(
        (a) => a.id === addressId,
      );
      if (!addressToUpdate) {
        return { success: false, error: "Address not found" };
      }

      const result = await apiClient.customerAddresses.update(
        customer.id,
        addressId,
        {
          ...addressToUpdate,
          isDefault: true,
        },
      );

      if (result) {
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
        storeCustomerToLocalStorage(updated);
        return { success: true };
      }
      return { success: false, error: "Failed to set default address" };
    } catch (error: any) {
      console.error("Set default address error:", error);
      return {
        success: false,
        error: error.message || "Failed to set default address",
      };
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
      storeCustomerToLocalStorage(updated);
      return { success: true };
    } catch (error) {
      return { success: false, error: "Failed to update preferences" };
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      const result = await apiClient.auth.customerRequestPasswordReset(email);
      if (result?.success) {
        return { success: true };
      }
      return {
        success: false,
        error: result?.message || "Failed to request password reset",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || "Failed to request password reset",
      };
    }
  };

  const resetPassword = async (_token: string, _newPassword: string) => {
    return {
      success: false,
      error: "Password reset by token is not implemented yet",
    };
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string,
  ) => {
    if (!customer) return { success: false, error: "Not authenticated" };

    try {
      const result = await apiClient.auth.customerChangePassword(
        currentPassword,
        newPassword,
      );
      if (result?.success) {
        return { success: true };
      }
      return {
        success: false,
        error: result?.message || "Failed to change password",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || "Failed to change password",
      };
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
          fullName:
            `${shipping.firstName || ""} ${shipping.lastName || ""}`.trim(),
          street1: shipping.street1 || "",
          street2: shipping.street2 || "",
          city: shipping.city || "",
          state: shipping.state || "",
          zip: shipping.zip || "",
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
      storeCustomerToLocalStorage(updatedCustomer);
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
