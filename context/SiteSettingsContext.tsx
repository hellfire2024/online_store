import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import { SiteSettings } from "../types";
import * as mockApi from "../services/mockApi";
import { apiClient } from "../services/apiClient";

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
  // Default tax configuration
  taxConfig: {
    enableTaxCollection: true,
    provider: "manual",
    defaultTaxRate: 8,
    credentials: {
      stripeApiKey: "",
    },
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
    easypost: {
      enabled: false,
      apiKey: "",
    },
    shippo: {
      enabled: false,
      apiKey: "",
    },
    shipstation: {
      enabled: false,
      apiKey: "",
      apiSecret: "",
    },
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
    country: "US",
    email: "",
    phone: "",
  },
  termsAndConditionsContent: `<h2>1. Agreement to Terms</h2><p>By accessing and using this website and purchasing products from Custom Threads Online Store, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.</p><h2>2. Use License</h2><p>Permission is granted to temporarily download one copy of the materials (information or software) on Custom Threads Online Store website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:</p><ul><li>Modifying or copying the materials</li><li>Using the materials for any commercial purpose or for any public display</li><li>Attempting to decompile or reverse engineer any software contained on the website</li><li>Removing any copyright or other proprietary notations from the materials</li><li>Transferring the materials to another person or "mirroring" the materials on any other server</li></ul><h2>3. Disclaimer</h2><p>The materials on Custom Threads Online Store website are provided on an 'as is' basis. Custom Threads makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p><h2>4. Limitations</h2><p>In no event shall Custom Threads or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Custom Threads Online Store website, even if Custom Threads or an authorized representative has been notified orally or in writing of the possibility of such damage.</p><h2>5. Accuracy of Materials</h2><p>The materials appearing on Custom Threads Online Store website could include technical, typographical, or photographic errors. Custom Threads does not warrant that any of the materials on the website are accurate, complete, or current. Custom Threads may make changes to the materials contained on its website at any time without notice.</p><h2>6. Links</h2><p>Custom Threads has not reviewed all of the sites linked to its website and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by Custom Threads of the site. Use of any such linked website is at the user's own risk.</p><h2>7. Modifications</h2><p>Custom Threads may revise these terms of service for its website at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.</p><h2>8. Governing Law</h2><p>These terms and conditions are governed by and construed in accordance with the laws of the United States, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.</p><h2>9. Product Information</h2><p>We strive to provide accurate product descriptions and pricing. However, we do not warrant that product descriptions, pricing, or other content on our website is accurate, complete, reliable, current, or error-free. If a product offered by Custom Threads is not as described, your sole remedy is to return it unused.</p><h2>10. Returns and Refunds</h2><p>All returns must be initiated within 30 days of purchase. Products must be in original condition with all tags attached. Once received and inspected, refunds will be processed within 5-7 business days. Shipping costs are non-refundable unless the return is due to our error.</p><h2>11. Privacy</h2><p>Your use of our website is also governed by our Privacy Policy. Please review our Privacy Policy to understand our practices.</p><h2>12. Contact Information</h2><p>If you have any questions about these Terms and Conditions, please contact us at support@customthreads.com</p>`,
  segmentRules: [
    {
      id: "vip",
      name: "VIP",
      minTotalSpent: 1000,
      minOrderCount: undefined,
      maxDaysSinceOrder: undefined,
      priority: 1,
      enabled: true,
    },
    {
      id: "atrisk",
      name: "At-Risk",
      minTotalSpent: undefined,
      minOrderCount: undefined,
      maxDaysSinceOrder: 180,
      priority: 2,
      enabled: true,
    },
    {
      id: "standard",
      name: "Standard",
      minTotalSpent: undefined,
      minOrderCount: undefined,
      maxDaysSinceOrder: undefined,
      priority: 3,
      enabled: true,
    },
  ],
  globalFont: "Arial",
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
        // Try to load from API first
        const apiSettings = await apiClient.settings.get();

        // Merge API settings with defaults to ensure all fields exist
        setSiteSettings({ ...defaultSettings, ...apiSettings });
      } catch (error) {
        console.error(
          "Failed to load site settings from API, using mock data",
          error,
        );
        // Fallback to mock API if real API fails
        try {
          setSiteSettings(await mockApi.fetchSiteSettings());
        } catch (mockError) {
          console.error("Failed to load mock settings", mockError);
          setSiteSettings(defaultSettings);
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const updateSiteSettings = async (newSettings: Partial<SiteSettings>) => {
    try {
      // Merge new settings with existing settings
      const updatedSettings = { ...siteSettings, ...newSettings };

      console.log("Saving settings to API:", updatedSettings);

      // Try to save to API first
      const savedSettings = await apiClient.settings.update(updatedSettings);

      console.log("Settings saved successfully:", savedSettings);
      setSiteSettings(savedSettings);
    } catch (error) {
      console.error("Failed to save settings to API:", error);
      // Don't fall back to mock - just throw the error so user sees it failed
      throw error;
    }
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
