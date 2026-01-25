
import React from 'react';
import { Link } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import { FacebookIcon, InstagramIcon, TwitterIcon } from './Icons';

const SocialIcon: React.FC<{ name: string }> = ({ name }) => {
    if (name.toLowerCase() === 'facebook') return <FacebookIcon className="w-6 h-6" />;
    if (name.toLowerCase() === 'instagram') return <InstagramIcon className="w-6 h-6" />;
    if (name.toLowerCase() === 'twitter') return <TwitterIcon className="w-6 h-6" />;
    return null;
}

const Footer: React.FC = () => {
  const { siteSettings, menus } = useAdmin();
  const footerMenu = menus.find(m => m.id === 'menu_footer');

  return (
    <footer className="bg-slate-900 border-t border-slate-800 mt-16">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="md:col-span-1">
            <Link to="/" className="text-2xl font-bold text-white tracking-wider">
              {siteSettings.logoText}<span className="text-sky-400">{siteSettings.logoTextAccent}</span>
            </Link>
            <p className="mt-4 text-gray-400 text-sm">
              Your vision, our fabric. High-quality custom apparel and products.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-white tracking-wider">Quick Links</h3>
            <ul className="mt-4 space-y-2">
              {footerMenu?.items.map(link => (
                <li key={link.id}><Link to={link.url} className="text-gray-400 hover:text-sky-400 transition-colors">{link.text}</Link></li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-white tracking-wider">Contact Us</h3>
            <ul className="mt-4 space-y-2 text-gray-400 text-sm">
              <li>Email: {siteSettings.footerContactEmail}</li>
              <li>Phone: {siteSettings.footerContactPhone}</li>
              <li>{siteSettings.footerContactAddress}</li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="font-semibold text-white tracking-wider">Follow Us</h3>
            <div className="flex space-x-4 mt-4">
              {siteSettings.footerSocialLinks.map(link => (
                <a key={link.id} href={link.url} className="text-gray-400 hover:text-sky-400 transition-colors" target="_blank" rel="noopener noreferrer">
                  <SocialIcon name={link.text} />
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-12 border-t border-slate-800 pt-6 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} {siteSettings.logoText} {siteSettings.logoTextAccent}. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
