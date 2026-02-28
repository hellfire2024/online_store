import React, { useState, useCallback } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
// Import main pages
import HomePage from "../pages/HomePage";
import StorePage from "../pages/StorePage";
import AdminPage from "../pages/admin/AdminPage";
import Header from "../components/Header";
import Footer from "../components/Footer";

import { CustomerAuthProvider } from "../context/CustomerAuthContext";
import { CartProvider } from "../context/CartContext";
import { ToastProvider } from "../hooks/useToast";
import { AdminProvider, useAdmin } from "../context/AdminContext";
import { UnsavedChangesProvider } from "../context/UnsavedChangesContext";
import { ProductProvider } from "../context/ProductContext";
import { GalleryProvider } from "../context/GalleryContext";
import { StaffProvider } from "../context/StaffContext";
import { ReviewsProvider } from "../context/ReviewsContext";
import { ServicesProvider } from "../context/ServicesContext";
import { PagesProvider } from "../context/PagesContext";
import { SiteSettingsProvider } from "../context/SiteSettingsContext";
import SiteEffectHandler from "../components/SiteEffectHandler";
import KeyboardShortcutHandler from "../components/KeyboardShortcutHandler";
import AdminLoginModal from "../components/admin/AdminLoginModal";

function App() {
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);

  const handleOpenAdminLogin = useCallback(() => {
    setIsAdminLoginOpen(true);
  }, []);
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
                            <Router>
                              <AdminLoginModal
                                isOpen={isAdminLoginOpen}
                                onClose={() => setIsAdminLoginOpen(false)}
                              />
                              <KeyboardShortcutHandler
                                onAdminKeyPress={handleOpenAdminLogin}
                              />
                              <AppContent />
                            </Router>
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
}

const AppContent: React.FC = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <div className="flex flex-col min-h-screen">
      {!isAdminRoute && <Header />}
      <main className={isAdminRoute ? "" : "grow container mx-auto px-4 py-8"}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/store" element={<StorePage />} />
          <Route path="/admin/*" element={<AdminPage />} />
        </Routes>
      </main>
      {!isAdminRoute && <Footer />}
    </div>
  );
};

export default App;
