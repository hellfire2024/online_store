import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Customer, CustomerAddress, CustomerOrder } from '../types';

interface CustomerAuthContextType {
  customer: Customer | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Authentication
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  
  // Account Management
  updateProfile: (name: string, phone?: string) => Promise<{ success: boolean; error?: string }>;
  
  // Addresses
  addAddress: (address: Omit<CustomerAddress, 'id'>) => Promise<{ success: boolean; error?: string }>;
  updateAddress: (address: CustomerAddress) => Promise<{ success: boolean; error?: string }>;
  deleteAddress: (addressId: string) => Promise<{ success: boolean; error?: string }>;
  setDefaultAddress: (addressId: string, type: 'shipping' | 'billing') => Promise<{ success: boolean; error?: string }>;
  
  // Email Preferences
  updateEmailPreferences: (preferences: { marketing: boolean; orderUpdates: boolean; announcements: boolean }) => Promise<{ success: boolean; error?: string }>;
  
  // Password Management
  requestPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  
  // Orders
  fetchOrders: () => Promise<void>;
  getOrder: (orderId: string) => CustomerOrder | undefined;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export const CustomerAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize from localStorage
  useEffect(() => {
    const storedCustomer = localStorage.getItem('customer');
    if (storedCustomer) {
      try {
        setCustomer(JSON.parse(storedCustomer));
      } catch (error) {
        console.error('Failed to restore customer session', error);
      }
    }
  }, []);

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      // In a real app, this would be an API call
      const newCustomer: Customer = {
        id: `cust-${Date.now()}`,
        name,
        email,
        phone: '',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        addresses: [],
        orders: [],
        emailPreferences: {
          marketing: true,
          orderUpdates: true,
          announcements: true,
        },
        isActive: true,
      };

      setCustomer(newCustomer);
      localStorage.setItem('customer', JSON.stringify(newCustomer));
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Registration failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // In a real app, this would be an API call with authentication
      // For now, mock implementation
      const mockCustomer: Customer = {
        id: `cust-${email.replace(/[^a-z0-9]/g, '')}`,
        name: email.split('@')[0],
        email,
        phone: '',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        addresses: [],
        orders: [],
        emailPreferences: {
          marketing: true,
          orderUpdates: true,
          announcements: true,
        },
        isActive: true,
      };

      setCustomer(mockCustomer);
      localStorage.setItem('customer', JSON.stringify(mockCustomer));
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Login failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setCustomer(null);
    localStorage.removeItem('customer');
  };

  const updateProfile = async (name: string, phone?: string) => {
    if (!customer) return { success: false, error: 'Not authenticated' };

    try {
      const updated = { ...customer, name, phone: phone || customer.phone };
      setCustomer(updated);
      localStorage.setItem('customer', JSON.stringify(updated));
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Profile update failed' };
    }
  };

  const addAddress = async (address: Omit<CustomerAddress, 'id'>) => {
    if (!customer) return { success: false, error: 'Not authenticated' };

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
      localStorage.setItem('customer', JSON.stringify(updated));
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to add address' };
    }
  };

  const updateAddress = async (address: CustomerAddress) => {
    if (!customer) return { success: false, error: 'Not authenticated' };

    try {
      const updated = {
        ...customer,
        addresses: customer.addresses.map((a) => (a.id === address.id ? address : a)),
      };

      setCustomer(updated);
      localStorage.setItem('customer', JSON.stringify(updated));
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to update address' };
    }
  };

  const deleteAddress = async (addressId: string) => {
    if (!customer) return { success: false, error: 'Not authenticated' };

    try {
      const updated = {
        ...customer,
        addresses: customer.addresses.filter((a) => a.id !== addressId),
      };

      setCustomer(updated);
      localStorage.setItem('customer', JSON.stringify(updated));
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to delete address' };
    }
  };

  const setDefaultAddress = async (addressId: string, type: 'shipping' | 'billing') => {
    if (!customer) return { success: false, error: 'Not authenticated' };

    try {
      const updated = {
        ...customer,
        addresses: customer.addresses.map((a) => ({
          ...a,
          isDefault: a.id === addressId && a.type === type ? true : a.type !== type ? a.isDefault : false,
        })),
      };

      setCustomer(updated);
      localStorage.setItem('customer', JSON.stringify(updated));
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to set default address' };
    }
  };

  const updateEmailPreferences = async (preferences: { marketing: boolean; orderUpdates: boolean; announcements: boolean }) => {
    if (!customer) return { success: false, error: 'Not authenticated' };

    try {
      const updated = {
        ...customer,
        emailPreferences: preferences,
      };

      setCustomer(updated);
      localStorage.setItem('customer', JSON.stringify(updated));
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to update preferences' };
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      // In a real app, this would send an email with a reset link
      console.log(`Password reset email sent to ${email}`);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to request password reset' };
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    try {
      // In a real app, this would validate the token and update the password
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to reset password' };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!customer) return { success: false, error: 'Not authenticated' };

    try {
      // In a real app, this would validate the current password
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to change password' };
    }
  };

  const fetchOrders = async () => {
    if (!customer) return;

    try {
      // In a real app, this would fetch from API
      // For now, use cached orders from customer
    } catch (error) {
      console.error('Failed to fetch orders', error);
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
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
};
