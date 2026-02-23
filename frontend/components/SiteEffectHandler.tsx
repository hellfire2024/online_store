import React, { useEffect } from "react";
import { useSiteSettings } from "../context/SiteSettingsContext";

const SiteEffectHandler: React.FC = () => {
	const { siteSettings } = useSiteSettings();

	useEffect(() => {
		document.title = siteSettings?.siteTitle || "Initializing...";
		if (siteSettings?.faviconUrl) {
			const link: HTMLLinkElement = document.querySelector("link[rel*='icon']") || document.createElement('link');
			link.type = 'image/x-icon';
			link.rel = 'shortcut icon';
			link.href = siteSettings.faviconUrl;
			document.getElementsByTagName('head')[0].appendChild(link);
		}

		const font = siteSettings?.globalFont || 'Arial';
		document.documentElement.style.setProperty('--site-font', `${font}, Arial, sans-serif`);
	}, [siteSettings?.siteTitle, siteSettings?.faviconUrl, siteSettings?.globalFont]);

	return null; // This component doesn't render anything visible
};

export default SiteEffectHandler;
// ...existing code...
