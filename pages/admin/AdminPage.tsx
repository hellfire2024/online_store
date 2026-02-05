import React, { useEffect, useState } from "react";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { useAdmin } from "../../context/AdminContext";
import AdminSidebar from "../../components/admin/AdminSidebar";
import Dashboard from "./Dashboard";
import ProductManagement from "./ProductManagement";
import GalleriesManagement from "./GalleriesManagement";
import StaffManagement from "./StaffManagement";
import ReviewsManagement from "./ReviewsManagement";
import SettingsManagement from "./SettingsManagement";
import ServicesManagement from "./ServicesManagement";
import PagesManagement from "./PagesManagement";
import PageEditor from "./PageEditor";
import UserManagement from "./UserManagement";
import CustomerManagement from "./CustomerManagement";
import CustomerAnalytics from "./CustomerAnalytics";
import AdminSecurity from "./AdminSecurity";
import OrderManagement from "./OrderManagement";
import TicketsManagement from "./TicketsManagement";
import { usePermissions } from "../../hooks/usePermissions";

const PermissionRoute: React.FC<{
  requiredPermission: string;
  children: React.ReactNode;
}> = ({ requiredPermission, children }) => {
  const { can } = usePermissions();
  return can(requiredPermission) ? (
    <>{children}</>
  ) : (
    <Navigate to="/admin" replace />
  );
};

const AdminPage: React.FC = () => {
  const { isAdminAuthenticated } = useAdmin();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isAdminAuthenticated) {
      navigate("/");
    }
  }, [isAdminAuthenticated, navigate]);

  if (!isAdminAuthenticated) {
    return null; // Or a loading spinner
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-900 text-gray-300">
      <AdminSidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <main className="grow w-full overflow-auto">
        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-30 p-3 bg-slate-800 rounded-lg text-white hover:bg-slate-700 shadow-lg border border-slate-600"
          aria-label="Open menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="w-full max-w-7xl mx-auto p-4 pt-20 sm:p-6 lg:p-8">
          <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route
            path="/products"
            element={
              <PermissionRoute requiredPermission="products">
                <ProductManagement />
              </PermissionRoute>
            }
          />
          <Route
            path="/galleries"
            element={
              <PermissionRoute requiredPermission="galleries">
                <GalleriesManagement />
              </PermissionRoute>
            }
          />
          <Route
            path="/staff"
            element={
              <PermissionRoute requiredPermission="staff">
                <StaffManagement />
              </PermissionRoute>
            }
          />
          <Route
            path="/reviews"
            element={
              <PermissionRoute requiredPermission="reviews">
                <ReviewsManagement />
              </PermissionRoute>
            }
          />
          <Route
            path="/services"
            element={
              <PermissionRoute requiredPermission="services">
                <ServicesManagement />
              </PermissionRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <PermissionRoute requiredPermission="settings">
                <SettingsManagement />
              </PermissionRoute>
            }
          />
          <Route
            path="/pages"
            element={
              <PermissionRoute requiredPermission="pages">
                <PagesManagement />
              </PermissionRoute>
            }
          />
          <Route
            path="/pages/edit/:pageId"
            element={
              <PermissionRoute requiredPermission="pages">
                <PageEditor />
              </PermissionRoute>
            }
          />
          <Route
            path="/pages/new"
            element={
              <PermissionRoute requiredPermission="pages">
                <PageEditor />
              </PermissionRoute>
            }
          />
          <Route
            path="/users"
            element={
              <PermissionRoute requiredPermission="users">
                <UserManagement />
              </PermissionRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <PermissionRoute requiredPermission="customers">
                <CustomerManagement />
              </PermissionRoute>
            }
          />
          <Route
            path="/customers/analytics"
            element={
              <PermissionRoute requiredPermission="customers">
                <CustomerAnalytics />
              </PermissionRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <PermissionRoute requiredPermission="orders">
                <OrderManagement />
              </PermissionRoute>
            }
          />
          <Route
            path="/security"
            element={
              <PermissionRoute requiredPermission="security">
                <AdminSecurity />
              </PermissionRoute>
            }
          />
          <Route
            path="/tickets"
            element={
              <PermissionRoute requiredPermission="support">
                <TicketsManagement />
              </PermissionRoute>
            }
          />
        </Routes>
        </div>
      </main>
    </div>
  );
};

export default AdminPage;
