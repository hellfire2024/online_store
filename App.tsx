import React, { useState, useEffect, useCallback, Suspense } from "react";
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
import Spinner from "./components/Spinner";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import StorePage from "./pages/StorePage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderConfirmationPage from "./pages/OrderConfirmationPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CustomPage from "./pages/CustomPage";
import CustomerAccountPage from "./pages/CustomerAccountPage";
import CustomerAddressesPage from "./pages/CustomerAddressesPage";
import CustomerOrdersPage from "./pages/CustomerOrdersPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import TermsAndConditionsPage from "./pages/TermsAndConditionsPage";
import SupportTicketsPage from "./pages/SupportTicketsPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import AdminLoginModal from "./components/admin/AdminLoginModal";
import SiteEffectHandler from "./components/SiteEffectHandler";
import TestHeroRenderingPage from "./pages/TestHeroRenderingPage";

// Lazy load admin pages for better code splitting
const AdminPage = React.lazy(() => import("./pages/admin/AdminPage"));
const PagePreview = React.lazy(() => import("./pages/admin/PagePreview"));

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
      if (e.key && e.key.toLowerCase() === "a" && e.altKey && e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        callback();
      }
    };
    window.addEventListener("keydown", handler, { capture: true });
    return () => {
      window.removeEventListener("keydown", handler, { capture: true });
    };
  }, [callback]);
};

const App: React.FC = () => {
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);

  const handleOpenAdminLogin = useCallback(() => {
    setIsAdminLoginOpen(true);
  }, []);

  // Suppress browser extension message channel errors (not application errors)
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message && event.message.includes('listener indicated an asynchronous response')) {
        event.preventDefault();
      }
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  useAdminKeyListener(handleOpenAdminLogin);

  return (
    <AdminProvider>
      <CustomerAuthProvider>
        <UnsavedChangesProvider>
          <SiteSettingsProvider>
            <SiteEffectHandler />
            <ProductProvider>
              <GalleryProvider>
                <StaffProvider>
                  <ReviewsProvider>
                    <ServicesProvider>
                      <ToastProvider>
                        <PagesProvider>
                          <CartProvider>
                            <HashRouter
                              future={{
                                v7_startTransition: true,
                                v7_relativeSplatPath: true,
                              }}
                            >
                              <div className="flex flex-col min-h-screen">
                                <AdminLoginModal
                                  isOpen={isAdminLoginOpen}
                                  onClose={() => setIsAdminLoginOpen(false)}
                                />
                                <Header />
                                <main className="grow container mx-auto px-4 py-8">
                                  <Routes>
                                    <Route
                                      path="/test-hero"
                                      element={<TestHeroRenderingPage />}
                                    />
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
                                      path="/product/:slug"
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
                                      path="/order-confirmation"
                                      element={<OrderConfirmationPage />}
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
                                      path="/forgot-password"
                                      element={<ForgotPasswordPage />}
                                    />
                                    <Route
                                      path="/admin/*"
                                      element={
                                        <AdminProtectedRoute>
                                          <Suspense fallback={<Spinner />}>
                                            <AdminPage />
                                          </Suspense>
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
                                      path="/account/change-password"
                                      element={<ChangePasswordPage />}
                                    />
                                    <Route
                                      path="/terms"
                                      element={<TermsAndConditionsPage />}
                                    />
                                    <Route
                                      path="/support"
                                      element={<SupportTicketsPage />}
                                    />
                                    <Route
                                      path="/admin/pages/preview"
                                      element={
                                        <Suspense fallback={<Spinner />}>
                                          <PagePreview />
                                        </Suspense>
                                      }
                                    />
                                    <Route path="*" element={<CustomPage />} />
                                  </Routes>
                                </main>
                                <Footer />
                              </div>
                            </HashRouter>
                          </CartProvider>
                        </PagesProvider>
                      </ToastProvider>
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
