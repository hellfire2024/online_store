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
  logoText: "",
  logoTextAccent: "",
  headerLogoUrl: "",
  heroTitle: "",
  heroSubtitle: "",
  heroBackgroundImageUrl: "",
  footerSocialLinks: [],
  footerContactEmail: "",
  footerContactPhone: "",
  footerContactAddress: "",
  aboutPageContent: "",
  paymentProvider: "none",
  paymentApiKeys: { stripe: "", paypal: "", square: "", authorizeNet: "" },
  shippingProvider: "none",
  shippingFlatRate: 0,
  shippingApiKeys: { fedex: "", ups: "", usps: "" },
  footerQuickLinks: [],
  siteBackgroundColor: "",
  siteTextColor: "",
  siteAccentColor: "",
  siteBackgroundImageUrl: "",
  siteBackgroundOpacity: 100,
};

interface SiteSettingsContextType {
  siteSettings: SiteSettings;
  isLoading: boolean;
  updateSiteSettings: (newSettings: Partial<SiteSettings>) => Promise<void>;
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

  return (
    <SiteSettingsContext.Provider
      value={{ siteSettings, isLoading, updateSiteSettings }}
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
