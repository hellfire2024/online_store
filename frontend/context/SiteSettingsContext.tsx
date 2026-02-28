import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import { SiteSettings } from "../types";
import { apiClient } from "../services/apiClient";

const defaultSettings: SiteSettings = {
  logoText: "Custom",
  logoTextAccent: "Threads",
  headerLogoUrl: "",
  siteTitle: "Custom Threads Online Store",
  faviconUrl: "/favicon.svg",
  footerConfig: {
    columns: [
      { id: "left", items: [] },
      { id: "center", items: [] },
      { id: "right", items: [] },
    ],
    socialLinks: [],
    contactEmail: "",
    contactPhone: "",
    contactAddress: "",
  },
  paymentProvider: "none",
  paymentApiKeys: { stripe: "", paypal: "", square: "", authorizeNet: "" },
  shippingProvider: "none",
  shippingFlatRate: 0,
  shippingApiKeys: { fedex: "", ups: "", usps: "" },
  taxConfig: {
    enableTaxCollection: true,
    provider: "manual",
    defaultTaxRate: 8,
    credentials: { stripeApiKey: "" },
    taxIncludedInPrice: false,
    rules: [],
  },
  emailConfig: {
    provider: "none",
    fromEmail: "",
    fromName: "",
    smtpHost: "",
    smtpPort: 587,
    smtpSecure: false,
    smtpUsername: "",
    sendgridApiKey: "",
    mailgunDomain: "",
    mailgunApiKey: "",
  },
  siteBackgroundColor: "",
  siteTextColor: "",
  siteAccentColor: "",
  siteBackgroundImageUrl: "https://picsum.photos/seed/hero/1200/800",
  siteBackgroundOpacity: 100,
  maxReviewsDisplayed: 10,
  supportEmail: "support@adaptivegis.com",
  supportSubjectPrefix: "Support Request",
  supportTicketSuffix: "SUP-001-001",
  invoiceTemplate: {
    id: "default",
    name: "Professional Invoice",
    companyName: "Your Store",
    invoiceTitle: "INVOICE",
    includeItems: true,
    includeTotals: true,
    footerText: "Thank you for your business!",
    accentColor: "#0ea5e9",
    backgroundColor: "#ffffff",
    textColor: "#1e293b",
    borderColor: "#cbd5e1",
  },
  shippingCarriers: {
    easypost: { enabled: false, apiKey: "" },
    shippo: { enabled: false, apiKey: "" },
    shipstation: { enabled: false, apiKey: "", apiSecret: "" },
  },
  defaultShippingCarrier: "easypost",
  fromAddress: {
    firstName: "",
    lastName: "",
    street1: "",
    street2: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    phone: "",
    email: "",
  },
};

const SiteSettingsContext = createContext<any>(undefined);

export const SiteSettingsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [siteSettings, setSiteSettings] =
    useState<SiteSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(false);

  const updateSiteSettings = async (updates: Partial<SiteSettings>) => {
    setIsLoading(true);
    try {
      // Create the updated settings object
      const updatedSettings = { ...siteSettings, ...updates };
      
      // Update local state
      setSiteSettings(updatedSettings);
      
      // Persist to backend
      await apiClient.settings.update(updatedSettings);
      
      setIsLoading(false);
      return { success: true };
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const uploadFavicon = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
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
// ...existing code...
