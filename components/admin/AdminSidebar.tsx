
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { DashboardIcon, ProductIcon, GalleryIcon, ContentIcon, LogoutIcon, UsersIcon, MessageSquareIcon, SettingsIcon, LayersIcon, FileTextIcon, MenuIcon } from '../Icons';

const AdminSidebar: React.FC = () => {
  const { logout } = useAdmin();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center px-4 py-3 rounded-lg transition-colors ${
      isActive ? 'bg-sky-500 text-white' : 'text-gray-300 hover:bg-slate-700 hover:text-white'
    }`;

  return (
    <div className="fixed top-0 left-0 h-full w-64 bg-slate-900 border-r border-slate-800 flex flex-col p-4">
      <div className="text-2xl font-bold text-white tracking-wider mb-10 px-4">
        Admin<span className="text-sky-400">Panel</span>
      </div>
      <nav className="flex-grow space-y-2">
        <NavLink to="/admin" end className={navLinkClass}>
          <DashboardIcon className="w-5 h-5 mr-3" />
          Dashboard
        </NavLink>
        <NavLink to="/admin/content" className={navLinkClass}>
          <ContentIcon className="w-5 h-5 mr-3" />
          Homepage
        </NavLink>
        <NavLink to="/admin/pages" className={navLinkClass}>
          <FileTextIcon className="w-5 h-5 mr-3" />
          Pages
        </NavLink>
        <NavLink to="/admin/navigation" className={navLinkClass}>
          <MenuIcon className="w-5 h-5 mr-3" />
          Navigation
        </NavLink>
        <NavLink to="/admin/products" className={navLinkClass}>
          <ProductIcon className="w-5 h-5 mr-3" />
          Products
        </NavLink>
        <NavLink to="/admin/gallery" className={navLinkClass}>
          <GalleryIcon className="w-5 h-5 mr-3" />
          Galleries
        </NavLink>
        <NavLink to="/admin/services" className={navLinkClass}>
          <LayersIcon className="w-5 h-5 mr-3" />
          Services
        </NavLink>
        <NavLink to="/admin/staff" className={navLinkClass}>
          <UsersIcon className="w-5 h-5 mr-3" />
          Staff
        </NavLink>
        <NavLink to="/admin/reviews" className={navLinkClass}>
          <MessageSquareIcon className="w-5 h-5 mr-3" />
          Reviews
        </NavLink>
        <NavLink to="/admin/settings" className={navLinkClass}>
          <SettingsIcon className="w-5 h-5 mr-3" />
          Settings
        </NavLink>
      </nav>
      <div>
        <button onClick={handleLogout} className="flex items-center w-full px-4 py-3 rounded-lg text-gray-300 hover:bg-slate-700 hover:text-white transition-colors">
          <LogoutIcon className="w-5 h-5 mr-3" />
          Logout
        </button>
      </div>
    </div>
  );
};

export default AdminSidebar;
