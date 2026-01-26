import React, { useEffect } from "react";
import { useSiteSettings } from "../context/SiteSettingsContext";

const SiteEffectHandler: React.FC = () => {
  const { siteSettings } = useSiteSettings();

  useEffect(() => {
    if (siteSettings?.siteTitle) {
      document.title = siteSettings.siteTitle;
    }
    if (siteSettings?.faviconUrl) {
      const link: HTMLLinkElement = document.querySelector("link[rel*='icon']") || document.createElement('link');
      link.type = 'image/x-icon';
      link.rel = 'shortcut icon';
      link.href = siteSettings.faviconUrl;
      document.getElementsByTagName('head')[0].appendChild(link);
    }
  }, [siteSettings?.siteTitle, siteSettings?.faviconUrl]);

  return null; // This component doesn't render anything visible
};

export default SiteEffectHandler;
