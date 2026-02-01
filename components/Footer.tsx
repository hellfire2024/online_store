import React from "react";
import { Link } from "react-router-dom";
import { useSiteSettings } from "../context/SiteSettingsContext";

const Footer: React.FC = () => {
  const { siteSettings } = useSiteSettings();

  return (
    <footer className="bg-gray-900 text-white py-12 mt-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Company Info */}
          <div>
            <h3 className="font-bold text-lg mb-4">
              {siteSettings?.siteTitle || "Online Store"}
            </h3>
            <p className="text-gray-400 text-sm">
              Your trusted online shopping destination.
            </p>
          </div>

          {/* Shop Links */}
          <div>
            <h4 className="font-semibold mb-4">Shop</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link to="/store" className="hover:text-white transition">
                  Products
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Account Links */}
          <div>
            <h4 className="font-semibold mb-4">Account</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link to="/login" className="hover:text-white transition">
                  Login
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-white transition">
                  Register
                </Link>
              </li>
              <li>
                <Link to="/account" className="hover:text-white transition">
                  My Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              {siteSettings?.footerConfig?.contactEmail && (
                <li>
                  <a
                    href={`mailto:${siteSettings.footerConfig.contactEmail}`}
                    className="hover:text-white transition"
                  >
                    {siteSettings.footerConfig.contactEmail}
                  </a>
                </li>
              )}
              {siteSettings?.footerConfig?.contactPhone && (
                <li>
                  <a
                    href={`tel:${siteSettings.footerConfig.contactPhone}`}
                    className="hover:text-white transition"
                  >
                    {siteSettings.footerConfig.contactPhone}
                  </a>
                </li>
              )}
              {siteSettings?.footerConfig?.contactAddress && (
                <li className="text-gray-400">
                  {siteSettings.footerConfig.contactAddress}
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-400">
            <p>
              &copy; {new Date().getFullYear()} {siteSettings?.siteTitle || "Online Store"}. All rights
              reserved.
            </p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <Link to="/terms" className="hover:text-white transition">
                Privacy Policy
              </Link>
              <Link to="/terms" className="hover:text-white transition">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
