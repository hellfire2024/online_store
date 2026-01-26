import React, { useState, useEffect, ReactNode, useCallback } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { CustomerAuthProvider } from "./context/CustomerAuthContext";
import { CartProvider } from "./context/CartContext";
import { ToastProvider } from "./hooks/useToast";
import { AdminProvider, useAdmin } from "./context/AdminContext";
import { UnsavedChangesProvider } from "./context/UnsavedChangesContext";
import { ProductProvider } from "./context/ProductContext";
import { GalleryProvider } from "./context/GalleryContext";
import { StaffProvider } from "./context/StaffContext";
import { ReviewsProvider } from "./context/ReviewsContext";
import { ServicesProvider } from "./context/ServicesContext";
import { PagesProvider } from "./context/PagesContext";
import { SiteSettingsProvider } from "./context/SiteSettingsContext";

import Header from "./components/Header";
import Footer from "./components/Footer";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import StorePage from "./pages/StorePage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AdminPage from "./pages/admin/AdminPage";
import PagePreview from "./pages/admin/PagePreview";
import CustomPage from "./pages/CustomPage";
import CustomerAccountPage from "./pages/CustomerAccountPage";
import CustomerAddressesPage from "./pages/CustomerAddressesPage";
import CustomerOrdersPage from "./pages/CustomerOrdersPage";
import AdminLoginModal from "./components/admin/AdminLoginModal";

const AdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAdminAuthenticated, isLoading } = useAdmin();

  if (isLoading) {
    return null; // Or a loading spinner
  }

  if (!isAdminAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const useAdminKeyListener = (callback: () => void) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "a" && e.altKey && e.shiftKey) {
        e.preventDefault();
        callback();
      }
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, [callback]);
};

const App: React.FC = () => {
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);

  useAdminKeyListener(() => setIsAdminLoginOpen(true));

  return (
    <AdminProvider>
      <CustomerAuthProvider>
        <UnsavedChangesProvider>
          <SiteSettingsProvider>
            <ProductProvider>
              <GalleryProvider>
                <StaffProvider>
                  <ReviewsProvider>
                    <ServicesProvider>
                      <PagesProvider>
                        <ToastProvider>
                          <CartProvider>
                            <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                              <div className="flex flex-col min-h-screen">
                                <AdminLoginModal
                                  isOpen={isAdminLoginOpen}
                                  onClose={() => setIsAdminLoginOpen(false)}
                                />
                                <Header />
                                <main className="flex-grow container mx-auto px-4 py-8">
                                  <Routes>
                                    <Route path="/" element={<HomePage />} />
                                    <Route
                                      path="/about"
                                      element={<AboutPage />}
                                    />
                                    <Route
                                      path="/contact"
                                      element={<ContactPage />}
                                    />
                                    <Route
                                      path="/store"
                                      element={<StorePage />}
                                    />
                                    <Route
                                      path="/product/:id"
                                      element={<ProductDetailPage />}
                                    />
                                    <Route
                                      path="/cart"
                                      element={<CartPage />}
                                    />
                                    <Route
                                      path="/checkout"
                                      element={<CheckoutPage />}
                                    />
                                    <Route
                                      path="/login"
                                      element={<LoginPage />}
                                    />
                                    <Route
                                      path="/register"
                                      element={<RegisterPage />}
                                    />
                                    <Route
                                      path="/admin/*"
                                      element={
                                        <AdminProtectedRoute>
                                          <AdminPage />
                                        </AdminProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/account"
                                      element={<CustomerAccountPage />}
                                    />
                                    <Route
                                      path="/account/addresses"
                                      element={<CustomerAddressesPage />}
                                    />
                                    <Route
                                      path="/account/orders"
                                      element={<CustomerOrdersPage />}
                                    />
                                    <Route
                                      path="/admin/pages/preview"
                                      element={<PagePreview />}
                                    />
                                    <Route path="*" element={<CustomPage />} />
                                  </Routes>
                                </main>
                                <Footer />
                              </div>
                            </HashRouter>
                          </CartProvider>
                        </ToastProvider>
                      </PagesProvider>
                    </ServicesProvider>
                  </ReviewsProvider>
                </StaffProvider>
              </GalleryProvider>
            </ProductProvider>
          </SiteSettingsProvider>
        </UnsavedChangesProvider>
      </CustomerAuthProvider>
    </AdminProvider>
  );
};

export default App;
