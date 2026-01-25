import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CustomerAuthProvider } from './context/CustomerAuthContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './hooks/useToast';
import { AdminProvider, useAdmin } from './context/AdminContext';

import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import StorePage from './pages/StorePage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminPage from './pages/admin/AdminPage';
import CustomPage from './pages/CustomPage';
import CustomerAccountPage from './pages/CustomerAccountPage';
import CustomerAddressesPage from './pages/CustomerAddressesPage';
import CustomerOrdersPage from './pages/CustomerOrdersPage';
import AdminLoginModal from './components/admin/AdminLoginModal';

const useAdminKeyListener = (callback: () => void) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'a' && e.altKey && e.shiftKey) {
        e.preventDefault();
        callback();
      }
    };
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [callback]);
};

const AdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdminAuthenticated, isLoading } = useAdmin();

  if (isLoading) {
    return null; // Or a loading spinner
  }

  if (!isAdminAuthenticated) {
    return <Navigate to="/login?tab=admin" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);

  useAdminKeyListener(() => setIsAdminLoginOpen(true));

  return (
    <AdminProvider>
      <CustomerAuthProvider>
        <ToastProvider>
          <CartProvider>
            <HashRouter>
              <div className="flex flex-col min-h-screen">
                <AdminLoginModal isOpen={isAdminLoginOpen} onClose={() => setIsAdminLoginOpen(false)} />
                <Header />
                <main className="flex-grow container mx-auto px-4 py-8">
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/store" element={<StorePage />} />
                    <Route path="/product/:id" element={<ProductDetailPage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route 
                      path="/admin/*" 
                      element={
                        <AdminProtectedRoute>
                          <AdminPage />
                        </AdminProtectedRoute>
                      } 
                    />
                    <Route path="/account" element={<CustomerAccountPage />} />
                    <Route path="/account/addresses" element={<CustomerAddressesPage />} />
                    <Route path="/account/orders" element={<CustomerOrdersPage />} />
                    <Route path="*" element={<CustomPage />} />
                  </Routes>
                </main>
                <Footer />
              </div>
            </HashRouter>
          </CartProvider>
        </ToastProvider>
      </CustomerAuthProvider>
    </AdminProvider>
  );
};

export default App;
