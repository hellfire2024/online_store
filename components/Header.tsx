import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useAdmin } from '../context/AdminContext';

const CartIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1"></circle>
    <circle cx="20" cy="21"r="1"></circle>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
  </svg>
);

const UserIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
    </svg>
);


const Header: React.FC = () => {
  const { itemCount } = useCart();
  const { customer, logout } = useCustomerAuth();
  const { siteSettings, menus } = useAdmin();
  
  const headerMenu = menus.find(m => m.id === 'menu_header');

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `transition-colors ${isActive ? 'text-white font-semibold' : 'text-gray-400 hover:text-white'}`;

  return (
    <header className="bg-slate-900/80 backdrop-blur-md shadow-lg sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link to="/" className="text-2xl font-bold text-white tracking-wider">
            {siteSettings?.logoText}<span className="text-sky-400">{siteSettings?.logoTextAccent}</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-8">
            {headerMenu?.items.map(item => (
              <NavLink key={item.id} to={item.url} className={navLinkClass}>{item.text}</NavLink>
            ))}
          </nav>
          <div className="flex items-center space-x-5">
            {customer ? (
                <div className="relative group">
                    <Link to="/account" className="flex items-center cursor-pointer text-gray-300 hover:text-white">
                        <UserIcon />
                    </Link>
                    <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-md shadow-lg py-1 z-50 hidden group-hover:block">
                        <div className="px-4 py-2 text-sm text-gray-200 border-b border-slate-700">{customer?.name}</div>
                        <Link to="/account" className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white">My Account</Link>
                        <button onClick={logout} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white">
                            Logout
                        </button>
                    </div>
                </div>
            ) : (
                <Link to="/login" className="text-gray-300 hover:text-white flex items-center">
                    <UserIcon />
                </Link>
            )}
            <Link to="/cart" className="relative text-gray-300 hover:text-white">
              <CartIcon />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-3 bg-sky-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
