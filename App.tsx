
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './hooks/useToast';
import { AdminProvider } from './context/AdminContext';

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
import AdminLoginModal from './components/admin/AdminLoginModal';
import CustomPage from './pages/CustomPage';

const useAdminKeyListener = (callback: () => void) => {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'A' && e.ctrlKey && e.shiftKey) {
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

const App: React.FC = () => {
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  
  useAdminKeyListener(() => setIsAdminLoginOpen(true));

  return (
    <AdminProvider>
      <AuthProvider>
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
                    <Route path="/admin/*" element={<AdminPage />} />
                    <Route path="*" element={<CustomPage />} />
                  </Routes>
                </main>
                <Footer />
              </div>
            </HashRouter>
          </CartProvider>
        </ToastProvider>
      </AuthProvider>
    </AdminProvider>
  );
};

export default App;
