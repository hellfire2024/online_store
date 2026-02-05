import React, { useState, useEffect } from "react";
import PromptedNavLink from "./PromptedNavLink";
import {
  DashboardIcon,
  ProductIcon,
  GalleryIcon,
  UsersIcon as StaffIcon,
  MessageSquareIcon as ReviewsIcon,
  LayersIcon as ServicesIcon,
  FileTextIcon as PagesIcon,
  SettingsIcon,
  LogoutIcon,
  ShoppingBagIcon,
  LockIcon,
  BarChartIcon,
  TicketIcon,
} from "../Icons";
import { useAdmin } from "../../context/AdminContext";
import { useNavigate } from "react-router-dom";
import { usePermissions } from "../../hooks/usePermissions";

const ChevronIcon: React.FC<{ isOpen: boolean }> = ({ isOpen }) => (
  <svg
    className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 9l6 6 6-6"
    />
  </svg>
);

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen = true, onClose }) => {
  const { logoutAdmin } = useAdmin();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({});

  // Close mobile menu on navigation
  const handleNavClick = () => {
    if (onClose && window.innerWidth < 1024) {
      onClose();
    }
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when mobile menu is open
      if (window.innerWidth < 1024) {
        document.body.style.overflow = 'hidden';
      }
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleLogout = () => {
    logoutAdmin();
    navigate("/");
    if (onClose) onClose();
  };

  const linkClass =
    "flex items-center p-3 rounded-lg transition-colors text-gray-300 hover:bg-slate-700 hover:text-white";
  const activeLinkClass = "bg-sky-600 text-white";

  const getNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `${linkClass} ${isActive ? activeLinkClass : ""}`;

  const sectionHeaderClass =
    "flex items-center justify-between px-3 py-2 cursor-pointer text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-300 transition-colors";

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && onClose && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      
      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-72 lg:w-64 shrink-0 bg-slate-800 p-4 flex flex-col 
          border-r border-slate-700 overflow-y-auto
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-700 hover:scrollbar-thumb-slate-600
        `}
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#475569 #1e293b",
        }}
      >
        {/* Mobile Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors"
            aria-label="Close menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        
        <div className="text-2xl font-bold text-white tracking-wider mb-10 px-2">
          Admin<span className="text-sky-400">Panel</span>
        </div>
        <nav className="grow space-y-1" onClick={handleNavClick}>
          <PromptedNavLink to="/admin" end className={getNavLinkClass}>
          <DashboardIcon className="w-6 h-6 mr-3" />
          Dashboard
        </PromptedNavLink>

        <div className="pt-4 mt-2 border-t border-slate-700">
          <div
            onClick={() => toggleSection("store")}
            className={sectionHeaderClass}
          >
            <span>Store</span>
            <ChevronIcon isOpen={expandedSections["store"] || false} />
          </div>
          {expandedSections["store"] && (
            <>
              {can("products") && (
                <PromptedNavLink
                  to="/admin/products"
                  className={getNavLinkClass}
                >
                  <ProductIcon className="w-6 h-6 mr-3" />
                  Products
                </PromptedNavLink>
              )}
              {can("galleries") && (
                <PromptedNavLink
                  to="/admin/galleries"
                  className={getNavLinkClass}
                >
                  <GalleryIcon className="w-6 h-6 mr-3" />
                  Galleries
                </PromptedNavLink>
              )}
              {can("services") && (
                <PromptedNavLink
                  to="/admin/services"
                  className={getNavLinkClass}
                >
                  <ServicesIcon className="w-6 h-6 mr-3" />
                  Services
                </PromptedNavLink>
              )}
              {can("reviews") && (
                <PromptedNavLink
                  to="/admin/reviews"
                  className={getNavLinkClass}
                >
                  <ReviewsIcon className="w-6 h-6 mr-3" />
                  Reviews
                </PromptedNavLink>
              )}
            </>
          )}
        </div>

        <div className="pt-4 mt-2 border-t border-slate-700">
          <div
            onClick={() => toggleSection("content")}
            className={sectionHeaderClass}
          >
            <span>Site Content</span>
            <ChevronIcon isOpen={expandedSections["content"] || false} />
          </div>
          {expandedSections["content"] && can("pages") && (
            <PromptedNavLink to="/admin/pages" className={getNavLinkClass}>
              <PagesIcon className="w-6 h-6 mr-3" />
              Pages
            </PromptedNavLink>
          )}
        </div>

        <div className="pt-4 mt-2 border-t border-slate-700">
          <div
            onClick={() => toggleSection("management")}
            className={sectionHeaderClass}
          >
            <span>Management</span>
            <ChevronIcon isOpen={expandedSections["management"] || false} />
          </div>
          {expandedSections["management"] && (
            <>
              {can("security") && (
                <PromptedNavLink to="/admin/users" className={getNavLinkClass}>
                  <StaffIcon className="w-6 h-6 mr-3" />
                  Admin Users
                </PromptedNavLink>
              )}
              {can("customers") && (
                <PromptedNavLink
                  to="/admin/customers"
                  end
                  className={getNavLinkClass}
                >
                  <StaffIcon className="w-6 h-6 mr-3" />
                  Customers
                </PromptedNavLink>
              )}
              {can("reports") && (
                <PromptedNavLink
                  to="/admin/customers/analytics"
                  className={getNavLinkClass}
                >
                  <BarChartIcon className="w-6 h-6 mr-3" />
                  Customer Analytics
                </PromptedNavLink>
              )}
              {can("staff") && (
                <PromptedNavLink to="/admin/staff" className={getNavLinkClass}>
                  <StaffIcon className="w-6 h-6 mr-3" />
                  Staff
                </PromptedNavLink>
              )}
              {can("orders") && (
                <PromptedNavLink to="/admin/orders" className={getNavLinkClass}>
                  <ShoppingBagIcon className="w-6 h-6 mr-3" />
                  Orders
                </PromptedNavLink>
              )}
              <PromptedNavLink to="/admin/tickets" className={getNavLinkClass}>
                <TicketIcon className="w-6 h-6 mr-3" />
                Support Tickets
              </PromptedNavLink>
            </>
          )}
        </div>
      </nav>

      <div className="pt-4 mt-auto border-t border-slate-700 -mx-4 px-4">
        {can("settings") && (
          <PromptedNavLink to="/admin/settings" className={getNavLinkClass}>
            <SettingsIcon className="w-6 h-6 mr-3 shrink-0" />
            <span className="truncate">Settings</span>
          </PromptedNavLink>
        )}
        {can("security") && (
          <PromptedNavLink to="/admin/security" className={getNavLinkClass}>
            <LockIcon className="w-6 h-6 mr-3 shrink-0" />
            <span className="truncate">Security</span>
          </PromptedNavLink>
        )}
        <button
          onClick={handleLogout}
          className={`${linkClass} justify-start overflow-hidden`}
        >
          <LogoutIcon className="w-6 h-6 mr-3 shrink-0" />
          <span className="truncate">Logout</span>
        </button>
      </div>
    </aside>
    </>
  );
};

export default AdminSidebar;
