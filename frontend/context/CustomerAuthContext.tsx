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
  updateProfile: (
    firstName: string,
    lastName: string,
    phone?: string,
  ) => Promise<{ success: boolean; error?: string }>;
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
  updateEmailPreferences: (preferences: {
    marketing: boolean;
    orderUpdates: boolean;
    announcements: boolean;
  }) => Promise<{ success: boolean; error?: string }>;
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
        apiClient.setToken(storedToken);
        const parsed = JSON.parse(storedCustomer);
        setCustomer(parsed);
        if (parsed?.id) {
          // Optionally refresh customer profile
        }
      } catch (error) {
        setCustomer(null);
      }
    }
  }, []);

  // ...implementation for all methods (register, login, logout, etc.)...

  const isAuthenticated = !!customer;

  // Dummy implementations for now
  const register = async () => ({ success: true });
  const login = async () => ({ success: true });
  const logout = () => {};
  const updateProfile = async () => ({ success: true });
  const addAddress = async () => ({ success: true });
  const updateAddress = async () => ({ success: true });
  const deleteAddress = async () => ({ success: true });
  const setDefaultAddress = async () => ({ success: true });
  const updateEmailPreferences = async () => ({ success: true });
  const requestPasswordReset = async () => ({ success: true });
  const resetPassword = async () => ({ success: true });
  const changePassword = async () => ({ success: true });
  const fetchOrders = async () => {};
  const getOrder = () => undefined;

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
// ...existing code...
