import React from "react";
import { NavLink } from "react-router-dom";
import PromptedNavLink from "./PromptedNavLink";
import {
  DashboardIcon,
  ProductIcon,
  GalleryIcon,
  UsersIcon as StaffIcon,
  MessageSquareIcon as ReviewsIcon,
  LayersIcon as ServicesIcon,
  ContentIcon as HomepageIcon,
  FileTextIcon as PagesIcon,
  MenuIcon as NavigationIcon,
  SettingsIcon,
  LogoutIcon,
} from "../Icons";
import { useAdmin } from "../../context/AdminContext";
import { useNavigate } from "react-router-dom";

const AdminSidebar: React.FC = () => {
  const { logoutAdmin } = useAdmin();
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutAdmin();
    navigate("/");
  };

  const linkClass =
    "flex items-center p-3 rounded-lg transition-colors text-gray-300 hover:bg-slate-700 hover:text-white";
  const activeLinkClass = "bg-sky-600 text-white";

  const getNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `${linkClass} ${isActive ? activeLinkClass : ""}`;

  return (
    <aside className="w-64 flex-shrink-0 bg-slate-800 p-4 flex flex-col border-r border-slate-700">
      <div className="text-2xl font-bold text-white tracking-wider mb-10 px-2">
        Admin<span className="text-sky-400">Panel</span>
      </div>
      <nav className="flex-grow space-y-1">
        <PromptedNavLink to="/admin" end className={getNavLinkClass}>
          <DashboardIcon className="w-6 h-6 mr-3" />
          Dashboard
        </PromptedNavLink>

        <div className="pt-4 mt-2 border-t border-slate-700">
          <h3 className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Store
          </h3>
          <PromptedNavLink to="/admin/products" className={getNavLinkClass}>
            <ProductIcon className="w-6 h-6 mr-3" />
            Products
          </PromptedNavLink>
          <PromptedNavLink to="/admin/galleries" className={getNavLinkClass}>
            <GalleryIcon className="w-6 h-6 mr-3" />
            Galleries
          </PromptedNavLink>
          <PromptedNavLink to="/admin/services" className={getNavLinkClass}>
            <ServicesIcon className="w-6 h-6 mr-3" />
            Services
          </PromptedNavLink>
          <PromptedNavLink to="/admin/reviews" className={getNavLinkClass}>
            <ReviewsIcon className="w-6 h-6 mr-3" />
            Reviews
          </PromptedNavLink>
        </div>

        <div className="pt-4 mt-2 border-t border-slate-700">
          <h3 className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Site Content
          </h3>
          <PromptedNavLink to="/admin/pages" className={getNavLinkClass}>
            <PagesIcon className="w-6 h-6 mr-3" />
            Pages
          </PromptedNavLink>
        </div>

        <div className="pt-4 mt-2 border-t border-slate-700">
          <h3 className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Management
          </h3>
          <PromptedNavLink to="/admin/users" className={getNavLinkClass}>
            <StaffIcon className="w-6 h-6 mr-3" />
            Admin Users
          </PromptedNavLink>
          <PromptedNavLink to="/admin/customers" className={getNavLinkClass}>
            <StaffIcon className="w-6 h-6 mr-3" />
            Customers
          </PromptedNavLink>
          <PromptedNavLink to="/admin/staff" className={getNavLinkClass}>
            <StaffIcon className="w-6 h-6 mr-3" />
            Staff
          </PromptedNavLink>
        </div>
      </nav>

      <div className="pt-4 mt-auto border-t border-slate-700">
        <PromptedNavLink to="/admin/settings" className={getNavLinkClass}>
          <SettingsIcon className="w-6 h-6 mr-3" />
          Settings
        </PromptedNavLink>
        <button onClick={handleLogout} className={`${linkClass} w-full mt-1`}>
          <LogoutIcon className="w-6 h-6 mr-3" />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
