import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// Import main pages
import HomePage from "../pages/HomePage";
import StorePage from "../pages/StorePage";
import AdminPage from "../pages/admin/AdminPage";

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

function App() {
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
                              <KeyboardShortcutHandler />
                              <Routes>
                                <Route path="/" element={<HomePage />} />
                                <Route path="/store" element={<StorePage />} />
                                <Route
                                  path="/admin/*"
                                  element={<AdminPage />}
                                />
                              </Routes>
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

export default App;
