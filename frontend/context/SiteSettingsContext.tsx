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
  loadingDefaults: {
    siteTitle: "Custom Threads Online Store",
    logoText: "Custom",
    logoTextAccent: "Threads",
    supportEmail: "support@adaptivegis.com",
  },
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
  defaultParcel: {
    weight: 1,
    length: 12,
    width: 9,
    height: 3,
  },
};

const LOADING_DEFAULTS_STORAGE_KEY = "site_loading_defaults";

const normalizeLoadingDefaults = (raw: any) => ({
  siteTitle: String(raw?.siteTitle || defaultSettings.siteTitle),
  logoText: String(raw?.logoText || defaultSettings.logoText),
  logoTextAccent: String(raw?.logoTextAccent || defaultSettings.logoTextAccent),
  supportEmail: String(raw?.supportEmail || defaultSettings.supportEmail),
});

const applyLoadingDefaults = (
  base: SiteSettings,
  loadingDefaults: any,
): SiteSettings => {
  const normalized = normalizeLoadingDefaults(loadingDefaults);
  return {
    ...base,
    siteTitle: normalized.siteTitle,
    logoText: normalized.logoText,
    logoTextAccent: normalized.logoTextAccent,
    supportEmail: normalized.supportEmail,
    loadingDefaults: normalized,
  };
};

const loadCachedLoadingDefaults = () => {
  try {
    const raw = localStorage.getItem(LOADING_DEFAULTS_STORAGE_KEY);
    if (!raw) {
      return defaultSettings.loadingDefaults;
    }
    return JSON.parse(raw);
  } catch {
    return defaultSettings.loadingDefaults;
  }
};

const saveCachedLoadingDefaults = (loadingDefaults: any) => {
  try {
    localStorage.setItem(
      LOADING_DEFAULTS_STORAGE_KEY,
      JSON.stringify(normalizeLoadingDefaults(loadingDefaults)),
    );
  } catch {
    // Ignore storage write failures (private mode/storage quota)
  }
};

const SiteSettingsContext = createContext<any>(undefined);

export const SiteSettingsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() =>
    applyLoadingDefaults(defaultSettings, loadCachedLoadingDefaults()),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      setSettingsError(null);

      const MAX_RETRIES = 3;
      let lastError: unknown = null;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const loadedSettings = await apiClient.settings.get();
          if (loadedSettings && typeof loadedSettings === "object") {
            const loadingDefaults = normalizeLoadingDefaults({
              siteTitle:
                loadedSettings.loadingDefaults?.siteTitle ||
                loadedSettings.siteTitle,
              logoText:
                loadedSettings.loadingDefaults?.logoText ||
                loadedSettings.logoText,
              logoTextAccent:
                loadedSettings.loadingDefaults?.logoTextAccent ||
                loadedSettings.logoTextAccent,
              supportEmail:
                loadedSettings.loadingDefaults?.supportEmail ||
                loadedSettings.supportEmail,
            });
            saveCachedLoadingDefaults(loadingDefaults);

            // Check payment provider and keys
            const paymentProvider = loadedSettings.paymentProvider || "none";
            const paymentApiKeys = loadedSettings.paymentApiKeys || {};
            let paymentKey = "";
            if (paymentProvider !== "none") {
              paymentKey = String(paymentApiKeys[paymentProvider] || "").trim();
            }
            if (
              paymentProvider !== "none" &&
              (!paymentKey || paymentKey.length === 0)
            ) {
              setSettingsError(
                `Payment provider '${paymentProvider}' is selected but credentials are missing. Check backend settings.`,
              );
              console.warn(
                `[SiteSettings] Payment provider '${paymentProvider}' selected but credentials missing.`,
                loadedSettings,
              );
            }
            setSiteSettings((prev) =>
              applyLoadingDefaults(
                {
                  ...prev,
                  ...loadedSettings,
                } as SiteSettings,
                loadingDefaults,
              ),
            );
          } else {
            setSettingsError("No site settings returned from backend.");
          }
          setIsLoading(false);
          return; // success — stop retrying
        } catch (error) {
          lastError = error;
          console.warn(
            `[SiteSettings] fetchSettings attempt ${attempt}/${MAX_RETRIES} failed:`,
            error,
          );
          if (attempt < MAX_RETRIES) {
            // exponential backoff: 1s, 2s
            await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          }
        }
      }

      // All retries exhausted — surface the error but keep cached state
      setSettingsError(
        `Failed to load site settings: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
      );
      setIsLoading(false);
    };
    fetchSettings();
  }, []);

  const updateSiteSettings = async (updates: Partial<SiteSettings>) => {
    setIsLoading(true);
    // Capture previous state so we can roll back on failure
    const previousSettings = siteSettings;
    const previousCachedDefaults = loadCachedLoadingDefaults();
    try {
      const normalizedLoadingDefaults = normalizeLoadingDefaults(
        updates.loadingDefaults || siteSettings.loadingDefaults,
      );

      // Create the updated settings object
      const updatedSettings = applyLoadingDefaults(
        {
          ...siteSettings,
          ...updates,
        } as SiteSettings,
        normalizedLoadingDefaults,
      );

      saveCachedLoadingDefaults(updatedSettings.loadingDefaults);

      // Optimistic update — visible immediately
      setSiteSettings(updatedSettings);

      // Persist to backend
      await apiClient.settings.update(updatedSettings);

      setIsLoading(false);
      return { success: true };
    } catch (error) {
      // Roll back optimistic update so context stays in sync with DB
      saveCachedLoadingDefaults(previousCachedDefaults);
      setSiteSettings(previousSettings);
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
      value={{
        siteSettings,
        isLoading,
        updateSiteSettings,
        uploadFavicon,
        settingsError,
      }}
    >
      {settingsError && (
        <div
          style={{
            color: "red",
            background: "#fff3f3",
            padding: 8,
            margin: 8,
            border: "1px solid #f99",
          }}
        >
          <strong>Site Settings Error:</strong> {settingsError}
        </div>
      )}
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
