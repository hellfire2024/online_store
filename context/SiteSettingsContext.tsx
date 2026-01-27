import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import { SiteSettings } from "../types";
import * as mockApi from "../services/mockApi";

// Create a default, empty state that matches the SiteSettings type.
const defaultSettings: SiteSettings = {
  logoText: "Custom",
  logoTextAccent: "Threads",
  headerLogoUrl: "", // Re-adding with a default empty string
  siteTitle: "Custom Threads Online Store",
  faviconUrl: "/favicon.svg", // Default favicon
  footerConfig: {
    columns: [
      { id: "left", items: [] },
      { id: "center", items: [] },
      { id: "right", items: [] },
    ],
  },
  footerSocialLinks: [],
  footerContactEmail: "",
  footerContactPhone: "",
  footerContactAddress: "",
  paymentProvider: "none",
  paymentApiKeys: { stripe: "", paypal: "", square: "", authorizeNet: "" },
  shippingProvider: "none",
  shippingFlatRate: 0,
  shippingApiKeys: { fedex: "", ups: "", usps: "" },
  // Default tax configuration
  taxConfig: {
    enableTaxCollection: true,
    defaultTaxRate: 0,
    taxIncludedInPrice: false,
    rules: [],
  },
  siteBackgroundColor: "",
  siteTextColor: "",
  siteAccentColor: "",
  siteBackgroundImageUrl: "https://picsum.photos/seed/hero/1200/800",
  siteBackgroundOpacity: 100,
  maxReviewsDisplayed: 10,
};

interface SiteSettingsContextType {
  siteSettings: SiteSettings;
  isLoading: boolean;
  updateSiteSettings: (newSettings: Partial<SiteSettings>) => Promise<void>;
  uploadFavicon: (file: File) => Promise<string>;
}

const SiteSettingsContext = createContext<SiteSettingsContextType | undefined>(
  undefined,
);

export const SiteSettingsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [siteSettings, setSiteSettings] =
    useState<SiteSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        setSiteSettings(await mockApi.fetchSiteSettings());
      } catch (error) {
        console.error("Failed to load site settings", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const updateSiteSettings = async (newSettings: Partial<SiteSettings>) => {
    const updatedSettings = await mockApi.updateSiteSettings(newSettings);
    setSiteSettings(updatedSettings);
  };

  const uploadFavicon = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        // In a real app, you would upload this to a server and get a URL
        // For now, we'll use the data URL directly
        resolve(base64data);
      };
      reader.readAsDataURL(file);
    });
  };

  return (
    <SiteSettingsContext.Provider
      value={{ siteSettings, isLoading, updateSiteSettings, uploadFavicon }}
    >
      {children}
    </SiteSettingsContext.Provider>
  );
};

export const useSiteSettings = () => {
  const context = useContext(SiteSettingsContext);
  if (context === undefined) {
    throw new Error(
      "useSiteSettings must be used within a SiteSettingsProvider",
    );
  }
  return context;
};
