import React, { useEffect } from "react";
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
import { usePermissions } from "../../hooks/usePermissions";

const PermissionRoute: React.FC<{ requiredPermission: string; children: React.ReactNode }> = ({
  requiredPermission,
  children,
}) => {
  const { can } = usePermissions();
  return can(requiredPermission) ? <>{children}</> : <Navigate to="/admin" replace />;
};

const AdminPage: React.FC = () => {
  const { isAdminAuthenticated } = useAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdminAuthenticated) {
      navigate("/");
    }
  }, [isAdminAuthenticated, navigate]);

  if (!isAdminAuthenticated) {
    return null; // Or a loading spinner
  }

  return (
    <div className="flex h-screen bg-slate-900 text-gray-300">
      <AdminSidebar />
      <main className="grow p-8 overflow-auto">
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
        </Routes>
      </main>
    </div>
  );
};

export default AdminPage;
