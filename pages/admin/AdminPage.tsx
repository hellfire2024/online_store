import React, { useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useAdmin } from "../../context/AdminContext";
import AdminSidebar from "../../components/admin/AdminSidebar";
import Dashboard from "./Dashboard";
import ProductManagement from "./ProductManagement";
import GalleriesManagement from "./GalleriesManagement";
import HomepageContentManagement from "./HomepageContentManagement";
import StaffManagement from "./StaffManagement";
import ReviewsManagement from "./ReviewsManagement";
import SettingsManagement from "./SettingsManagement";
import ServicesManagement from "./ServicesManagement";
import PagesManagement from "./PagesManagement";
import PageEditor from "./PageEditor";
import NavigationManagement from "./NavigationManagement";

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
      <main className="flex-grow p-8 overflow-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<ProductManagement />} />
          <Route path="/galleries" element={<GalleriesManagement />} />
          <Route path="/homepage" element={<HomepageContentManagement />} />
          <Route path="/staff" element={<StaffManagement />} />
          <Route path="/reviews" element={<ReviewsManagement />} />
          <Route path="/services" element={<ServicesManagement />} />
          <Route path="/settings" element={<SettingsManagement />} />
          <Route path="/pages" element={<PagesManagement />} />
          <Route path="/pages/edit/:pageId" element={<PageEditor />} />
          <Route path="/pages/new" element={<PageEditor />} />
          <Route path="/navigation" element={<NavigationManagement />} />
        </Routes>
      </main>
    </div>
  );
};

export default AdminPage;
