import React, { useState, useMemo, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import { useCart } from "../context/CartContext";
import { useCustomerAuth } from "../context/CustomerAuthContext";
import { useSiteSettings } from "../context/SiteSettingsContext";
import apiClient from "../services/apiClient";
import { getCurrentProductPrice } from "../utils/productPricing";
import { useToast } from "../hooks/useToast";
import { calculateTax } from "../services/taxService";
import StripePaymentSection, {
  StripePaymentSectionHandle,
} from "../components/StripePaymentSection";
import PayPalPaymentSection from "../components/PayPalPaymentSection";
import SquarePaymentSection, {
  SquarePaymentSectionHandle,
} from "../components/SquarePaymentSection";
import AuthorizeNetPaymentSection, {
  AuthorizeNetPaymentSectionHandle,
} from "../components/AuthorizeNetPaymentSection";

const CheckoutPage: React.FC = () => {
  const { cartItems, clearCart, itemCount } = useCart();
  const { customer, addAddress } = useCustomerAuth();
  const { siteSettings } = useSiteSettings();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [shippingState, setShippingState] = useState("");
  const [shippingZip, setShippingZip] = useState("");
  const [isCalculatingTax, setIsCalculatingTax] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<"guest" | "account" | null>(
    null,
  );
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
  });
  const [newAddressForm, setNewAddressForm] = useState({
    firstName: "",
    lastName: "",
    streetAddress: "",
    city: "",
    state: "",
    zipCode: "",
    phone: "",
  });
  const [taxCalculation, setTaxCalculation] = useState({
    subtotal: 0,
    taxableAmount: 0,
    taxRate: 0,
    taxAmount: 0,
    total: 0,
  });
  const [paymentData, setPaymentData] = useState({
    cardNumber: "",
    expiryMonth: "",
    expiryYear: "",
    cvc: "",
  });
  const [commerceStatus, setCommerceStatus] = useState<any>(null);
  const [requestNotes, setRequestNotes] = useState("");
  const [preferredPaymentMethod, setPreferredPaymentMethod] =
    useState("unspecified");
  const [stripePublishableKey, setStripePublishableKey] = useState<string>("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const stripePaymentRef = useRef<StripePaymentSectionHandle>(null);
  const squarePaymentRef = useRef<SquarePaymentSectionHandle>(null);
  const authorizeNetPaymentRef = useRef<AuthorizeNetPaymentSectionHandle>(null);

  // Config state for non-Stripe providers
  const [paypalConfig, setPaypalConfig] = useState<{
    clientId: string;
    sandbox: boolean;
  } | null>(null);
  const [squareConfig, setSquareConfig] = useState<{
    applicationId: string;
    locationId: string;
    sandbox: boolean;
  } | null>(null);
  const [authorizeNetConfig, setAuthorizeNetConfig] = useState<{
    apiLoginId: string;
    publicClientKey: string;
    sandbox: boolean;
  } | null>(null);

  // Pending PayPal order details — populated when PayPal createOrder fires
  const pendingPaypalOrderRef = useRef<any>(null);

  const usStateMap: Record<string, string> = {
    alabama: "AL",
    alaska: "AK",
    arizona: "AZ",
    arkansas: "AR",
    california: "CA",
    colorado: "CO",
    connecticut: "CT",
    delaware: "DE",
    florida: "FL",
    georgia: "GA",
    hawaii: "HI",
    idaho: "ID",
    illinois: "IL",
    indiana: "IN",
    iowa: "IA",
    kansas: "KS",
    kentucky: "KY",
    louisiana: "LA",
    maine: "ME",
    maryland: "MD",
    massachusetts: "MA",
    michigan: "MI",
    minnesota: "MN",
    mississippi: "MS",
    missouri: "MO",
    montana: "MT",
    nebraska: "NE",
    nevada: "NV",
    "new hampshire": "NH",
    "new jersey": "NJ",
    "new mexico": "NM",
    "new york": "NY",
    "north carolina": "NC",
    "north dakota": "ND",
    ohio: "OH",
    oklahoma: "OK",
    oregon: "OR",
    pennsylvania: "PA",
    "rhode island": "RI",
    "south carolina": "SC",
    "south dakota": "SD",
    tennessee: "TN",
    texas: "TX",
    utah: "UT",
    vermont: "VT",
    virginia: "VA",
    washington: "WA",
    "west virginia": "WV",
    wisconsin: "WI",
    wyoming: "WY",
  };

  const normalizeStateCode = (value: string | undefined): string => {
    const raw = (value || "").trim();
    if (!raw) return "";
    const upper = raw.toUpperCase();
    if (/^[A-Z]{2}$/.test(upper)) return upper;
    return usStateMap[raw.toLowerCase()] || "";
  };

  const formatPhoneNumber = (value: string): string => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    }
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const isValidPhoneNumber = (value: string): boolean => {
    const digits = value.replace(/\D/g, "");
    return digits.length === 10;
  };

  const formatZipCode = (value: string): string => {
    const digits = value.replace(/\D/g, "").slice(0, 9);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };

  const isValidZipCode = (value: string): boolean =>
    /^\d{5}(-\d{4})?$/.test(value.trim());

  const formatCardNumber = (value: string): string => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const isValidCardNumber = (value: string): boolean => {
    const digits = value.replace(/\D/g, "");
    return digits.length === 16;
  };

  const isValidExpiry = (): boolean => {
    if (!paymentData.expiryMonth || !paymentData.expiryYear) return false;
    const mm = parseInt(paymentData.expiryMonth, 10);
    const yyyy = parseInt(paymentData.expiryYear, 10);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    if (yyyy < currentYear) return false;
    if (yyyy === currentYear && mm < currentMonth) return false;
    return true;
  };

  const formatCvc = (value: string): string =>
    value.replace(/\D/g, "").slice(0, 4);

  const isValidCvc = (value: string): boolean => /^\d{3,4}$/.test(value);

  const toNumber = (value: unknown, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  };

  const sanitizeTaxResult = (
    result: any,
    fallbackSubtotal: number,
    shippingCost: number,
  ) => {
    const subtotal = toNumber(result?.subtotal, fallbackSubtotal);
    const taxableAmount = toNumber(result?.taxableAmount, subtotal);
    const taxRate = toNumber(result?.taxRate, 0);
    const taxAmount = toNumber(result?.taxAmount, 0);
    const total = toNumber(result?.total, subtotal + shippingCost + taxAmount);

    return {
      subtotal,
      taxableAmount,
      taxRate,
      taxAmount,
      total,
    };
  };

  const buildLocalCommerceStatus = () => {
    const paymentProvider = String(siteSettings?.paymentProvider || "none");
    const paymentKey = String(
      siteSettings?.paymentApiKeys?.[
        paymentProvider as keyof typeof siteSettings.paymentApiKeys
      ] || "",
    ).trim();
    const paymentAvailable =
      paymentProvider !== "none" && paymentKey.length > 0;

    const carriers = siteSettings?.shippingCarriers || {};
    const sender = siteSettings?.fromAddress || {};
    const senderReady =
      Boolean(sender.street1) &&
      Boolean(sender.city) &&
      Boolean(sender.state) &&
      Boolean(sender.zip);
    const shippingCarrierReady =
      (carriers.easypost?.enabled && Boolean(carriers.easypost?.apiKey)) ||
      (carriers.shippo?.enabled && Boolean(carriers.shippo?.apiKey)) ||
      (carriers.shipstation?.enabled &&
        Boolean(carriers.shipstation?.apiKey) &&
        Boolean(carriers.shipstation?.apiSecret));
    const shippingAvailable = Boolean(shippingCarrierReady && senderReady);

    const taxConfig = siteSettings?.taxConfig;
    const taxProvider = String(taxConfig?.provider || "manual");
    const taxCredentials = taxConfig?.credentials || {};
    let taxAvailable = false;
    if (taxConfig?.enableTaxCollection === false) {
      taxAvailable = false;
    } else if (taxProvider === "manual") {
      taxAvailable = Number.isFinite(Number(taxConfig?.defaultTaxRate));
    } else if (taxProvider === "stripe") {
      taxAvailable = Boolean(taxCredentials.stripeApiKey);
    } else if (taxProvider === "taxjar") {
      taxAvailable = Boolean(taxCredentials.taxjarApiKey);
    } else if (taxProvider === "avalara") {
      taxAvailable = Boolean(
        taxCredentials.avalaraAccountId && taxCredentials.avalaraLicenseKey,
      );
    } else if (taxProvider === "taxcloud") {
      taxAvailable = Boolean(
        taxCredentials.taxcloudApiKey && taxCredentials.taxcloudUserId,
      );
    } else if (taxProvider === "zamp") {
      taxAvailable = Boolean(taxCredentials.zampApiKey);
    } else if (taxProvider === "anrok") {
      taxAvailable = Boolean(taxCredentials.anrokApiKey);
    }

    return {
      payment: {
        available: paymentAvailable,
        reason:
          paymentProvider === "none"
            ? "No payment provider configured"
            : "Payment provider credentials are missing",
      },
      shipping: {
        available: shippingAvailable,
        reason: !shippingCarrierReady
          ? "No shipping carrier is configured"
          : "Sender address is incomplete",
      },
      tax: {
        available: taxAvailable,
        reason: "Tax provider is not fully configured",
      },
      overallReady: paymentAvailable && shippingAvailable && taxAvailable,
    };
  };

  const effectiveCommerceStatus = commerceStatus || buildLocalCommerceStatus();
  const unavailableServices = [
    !effectiveCommerceStatus.payment?.available ? "payment" : null,
    !effectiveCommerceStatus.shipping?.available ? "shipping" : null,
    !effectiveCommerceStatus.tax?.available ? "tax" : null,
  ].filter(Boolean) as string[];
  const isAssistedCheckoutRequired = unavailableServices.length > 0;

  // loadStripe is called lazily only when the publishable key is available
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stripePromise = useMemo(
    () => (stripePublishableKey ? loadStripe(stripePublishableKey) : null),
    [stripePublishableKey],
  );

  React.useEffect(() => {
    const loadCommerceStatus = async () => {
      try {
        const status = await apiClient.settings.getCommerceStatus();
        setCommerceStatus(status);
      } catch (error) {
        setCommerceStatus(null);
      }
    };
    loadCommerceStatus();
  }, [siteSettings]);

  // Load payment-provider config when the selected provider changes
  React.useEffect(() => {
    const provider = String(siteSettings?.paymentProvider || "").toLowerCase();
    if (provider === "stripe") {
      fetch("/api/settings/stripe-config")
        .then((r) => r.json())
        .then((d) => {
          if (d?.publishableKey) setStripePublishableKey(d.publishableKey);
        })
        .catch(() => {});
    } else if (provider === "paypal") {
      fetch("/api/settings/paypal-config")
        .then((r) => r.json())
        .then((d) => {
          if (d?.clientId) setPaypalConfig(d);
        })
        .catch(() => {});
    } else if (provider === "square") {
      fetch("/api/settings/square-config")
        .then((r) => r.json())
        .then((d) => {
          if (d?.applicationId) setSquareConfig(d);
        })
        .catch(() => {});
    } else if (provider === "authorizenet") {
      fetch("/api/settings/authorizedotnet-config")
        .then((r) => r.json())
        .then((d) => {
          if (d?.apiLoginId) setAuthorizeNetConfig(d);
        })
        .catch(() => {});
    }
  }, [siteSettings?.paymentProvider]);

  // Auto-populate customer data when logged in
  React.useEffect(() => {
    if (customer) {
      setFormData({
        firstName: customer.firstName || "",
        lastName: customer.lastName || "",
        email: customer.email || "",
        phone: customer.phone || "",
        address: "",
        city: "",
      });

      // If customer has a default shipping address, select it
      const defaultShippingAddress = customer.addresses?.find(
        (addr) => addr.type === "shipping" && addr.isDefault,
      );

      if (defaultShippingAddress) {
        setSelectedAddressId(defaultShippingAddress.id);
        // Parse full name into first/last
        const nameParts = defaultShippingAddress.fullName.split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        setFormData({
          firstName,
          lastName,
          email: customer.email || "",
          phone: defaultShippingAddress.phone || customer.phone || "",
          address: defaultShippingAddress.street1 || "",
          city: defaultShippingAddress.city || "",
        });
        setShippingState(normalizeStateCode(defaultShippingAddress.state));
        setShippingZip(defaultShippingAddress.zip || "");
      }
    }
  }, [customer]);

  // Handle address selection
  const handleAddressSelect = (addressId: string) => {
    if (addressId === "new" || addressId === "") {
      setShowAddAddressModal(true);
      setSelectedAddressId("");
      setFormData({
        firstName: customer?.firstName || "",
        lastName: customer?.lastName || "",
        email: customer?.email || "",
        phone: customer?.phone || "",
        address: "",
        city: "",
      });
      setShippingState("");
      setShippingZip("");
    } else {
      setSelectedAddressId(addressId);
      const address = customer?.addresses?.find(
        (addr) => addr.id === addressId,
      );
      if (address) {
        // Parse full name into first/last
        const nameParts = address.fullName.split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        setFormData({
          firstName,
          lastName,
          email: customer?.email || "",
          phone: address.phone || customer?.phone || "",
          address: address.street1 || "",
          city: address.city || "",
        });
        setShippingState(normalizeStateCode(address.state));
        setShippingZip(address.zip || "");
      }
    }
  };

  // Handle saving a new address
  const handleSaveNewAddress = async () => {
    if (
      !newAddressForm.firstName ||
      !newAddressForm.lastName ||
      !newAddressForm.streetAddress ||
      !newAddressForm.city ||
      !newAddressForm.state ||
      !newAddressForm.zipCode
    ) {
      addToast("Please fill in all required fields", "error");
      return;
    }

    if (!isValidZipCode(newAddressForm.zipCode)) {
      addToast("Please enter a valid ZIP code", "error");
      return;
    }

    if (newAddressForm.phone && !isValidPhoneNumber(newAddressForm.phone)) {
      addToast("Phone number must be 10 digits", "error");
      return;
    }

    setIsSavingAddress(true);
    try {
      const result = await addAddress({
        type: "shipping",
        firstName: newAddressForm.firstName,
        lastName: newAddressForm.lastName,
        fullName: `${newAddressForm.firstName} ${newAddressForm.lastName}`,
        street1: newAddressForm.streetAddress,
        street2: "",
        city: newAddressForm.city,
        state: newAddressForm.state,
        zip: newAddressForm.zipCode,
        country: "US",
        phone: newAddressForm.phone,
        isDefault: false,
      });

      if (result.success) {
        addToast("Address saved successfully", "success");
        setShowAddAddressModal(false);
        setNewAddressForm({
          firstName: "",
          lastName: "",
          streetAddress: "",
          city: "",
          state: "",
          zipCode: "",
          phone: "",
        });
        // The customer context will be updated automatically, so the dropdown will refresh
      } else {
        addToast(result.error || "Failed to save address", "error");
      }
    } catch (error: any) {
      addToast(error.message || "Failed to save address", "error");
    } finally {
      setIsSavingAddress(false);
    }
  };

  // Redirect to cart if empty (must be in effect to avoid setState during render)
  // But only if we're still on the checkout page
  React.useEffect(() => {
    if (itemCount === 0 && window.location.hash === "#/checkout") {
      navigate("/cart");
    }
  }, [itemCount, navigate]);

  // Calculate tax when state/zip changes
  useMemo(() => {
    const calculateTaxAsync = async () => {
      const shippingCost = toNumber(siteSettings?.shippingFlatRate, 5);

      // Calculate subtotal first
      const subtotal = cartItems.reduce((total, item) => {
        let optionsDelta = 0;
        if (item.selectedOptions && item.product.optionLists) {
          item.product.optionLists.forEach((list) => {
            const selectedOptionIds = item.selectedOptions?.[list.id] || [];
            if (Array.isArray(selectedOptionIds)) {
              selectedOptionIds.forEach((optionId) => {
                const option = list.options.find((o) => o.id === optionId);
                if (option) {
                  optionsDelta += toNumber(option.priceDelta);
                }
              });
            } else {
              // Fallback for old single-select format
              const option = list.options.find(
                (o) => o.id === selectedOptionIds,
              );
              if (option) {
                optionsDelta += toNumber(option.priceDelta);
              }
            }
          });
        }
        const itemPrice = toNumber(getCurrentProductPrice(item.product));
        let customTextCost = 0;
        if (item.customText && item.product.customTextPricePerChar) {
          customTextCost =
            item.customText.length * item.product.customTextPricePerChar;
        }
        const customImageCost =
          item.customization?.type === "upload" &&
          item.product.allowCustomImageUpload &&
          item.product.customImageUploadPrice
            ? toNumber(item.product.customImageUploadPrice)
            : 0;
        const quantity = toNumber(item.quantity);
        return (
          total +
          (itemPrice + optionsDelta + customTextCost + customImageCost) *
            quantity
        );
      }, 0);

      if (!siteSettings || !siteSettings.taxConfig || !shippingState) {
        setTaxCalculation(
          sanitizeTaxResult(
            {
              subtotal,
              taxableAmount: subtotal,
              taxRate: 0,
              taxAmount: 0,
              total: subtotal + shippingCost,
            },
            subtotal,
            shippingCost,
          ),
        );
        return;
      }

      const provider = siteSettings.taxConfig.provider;
      const credentials = siteSettings.taxConfig.credentials;

      // Use API for supported providers (requires credentials)
      if (
        (provider !== "manual" &&
          provider === "stripe" &&
          credentials?.stripeApiKey) ||
        (provider === "taxjar" && credentials?.taxjarApiKey) ||
        (provider === "avalara" &&
          credentials?.avalaraAccountId &&
          credentials?.avalaraLicenseKey) ||
        (provider === "taxcloud" &&
          credentials?.taxcloudApiKey &&
          credentials?.taxcloudUserId) ||
        (provider === "zamp" && credentials?.zampApiKey) ||
        (provider === "anrok" && credentials?.anrokApiKey)
      ) {
        setIsCalculatingTax(true);
        try {
          const response = await fetch(`/api/tax/providers/${provider}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cartItems,
              shippingCost,
              shippingState,
              shippingZip,
              ...(provider === "stripe" && {
                stripeApiKey: credentials?.stripeApiKey,
              }),
              ...(provider === "taxjar" && {
                apiKey: credentials?.taxjarApiKey,
              }),
              ...(provider === "avalara" && {
                accountId: credentials?.avalaraAccountId,
                licenseKey: credentials?.avalaraLicenseKey,
                environment: credentials?.avalaraEnvironment || "sandbox",
              }),
              ...(provider === "taxcloud" && {
                apiKey: credentials?.taxcloudApiKey,
                userId: credentials?.taxcloudUserId,
              }),
              ...(provider === "zamp" && { apiKey: credentials?.zampApiKey }),
              ...(provider === "anrok" && { apiKey: credentials?.anrokApiKey }),
            }),
          });

          if (!response.ok) {
            throw new Error(`Tax API error: ${response.statusText}`);
          }

          const contentType = (
            response.headers.get("content-type") || ""
          ).toLowerCase();
          const raw = await response.text();
          if (!contentType.includes("application/json")) {
            throw new Error(
              `Tax API returned non-JSON response (${contentType || "unknown"})`,
            );
          }
          const result = raw.trim() ? JSON.parse(raw) : {};
          setTaxCalculation(sanitizeTaxResult(result, subtotal, shippingCost));
        } catch (error) {
          console.error(
            `${provider} tax calculation failed, falling back to manual:`,
            error,
          );
          const manualTax = calculateTax(
            cartItems,
            shippingCost,
            shippingState,
            siteSettings.taxConfig,
          );
          setTaxCalculation(
            sanitizeTaxResult(manualTax, subtotal, shippingCost),
          );
          addToast("Using fallback tax calculation", "info");
        } finally {
          setIsCalculatingTax(false);
        }
      } else {
        // Use manual tax rules
        const manualTax = calculateTax(
          cartItems,
          shippingCost,
          shippingState,
          siteSettings.taxConfig,
        );
        setTaxCalculation(sanitizeTaxResult(manualTax, subtotal, shippingCost));
      }
    };

    calculateTaxAsync();
  }, [cartItems, shippingState, shippingZip, siteSettings, addToast]);

  const createPayPalOrder = useCallback(async (): Promise<string> => {
    const res = await fetch("/api/orders/create-paypal-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: taxCalculation.total }),
    });
    const data = await res.json();
    if (!res.ok || !data?.orderId) {
      throw new Error(data?.error || "Failed to create PayPal order");
    }
    return data.orderId;
  }, [taxCalculation.total]);

  const handlePayPalApprove = useCallback(
    (captureId: string) => {
      pendingPaypalOrderRef.current = { captureId };
      addToast(
        "PayPal payment approved. You can now place the order.",
        "success",
      );
    },
    [addToast],
  );

  const handlePayPalError = useCallback(
    (message: string) => {
      addToast(message, "error");
    },
    [addToast],
  );

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.email ||
      !formData.address ||
      !formData.city
    ) {
      addToast("Please fill in all shipping information", "error");
      return;
    }

    if (!shippingState) {
      addToast("Please select a state for tax calculation", "error");
      return;
    }

    if (!shippingZip) {
      addToast("Please enter a ZIP code", "error");
      return;
    }

    if (!isValidZipCode(shippingZip)) {
      addToast("Please enter a valid ZIP code", "error");
      return;
    }

    if (!formData.phone || !isValidPhoneNumber(formData.phone)) {
      addToast("Please enter a valid 10-digit phone number", "error");
      return;
    }

    if (!isAssistedCheckoutRequired) {
      const activeProvider = String(
        siteSettings?.paymentProvider || "",
      ).toLowerCase();
      if (activeProvider === "stripe" && !stripePaymentRef.current) {
        addToast("Stripe payment form is not ready. Please wait.", "error");
        return;
      }
      if (activeProvider === "square" && !squarePaymentRef.current) {
        addToast("Square payment form is not ready. Please wait.", "error");
        return;
      }
      if (
        activeProvider === "authorizenet" &&
        !authorizeNetPaymentRef.current
      ) {
        addToast(
          "Authorize.Net payment form is not ready. Please wait.",
          "error",
        );
        return;
      }
    }

    setIsProcessingPayment(true);
    try {
      // Generate order number in the same format as backend: AGIS-XXXXXXXXXX
      // Use a combination of timestamp and random number to ensure uniqueness
      const randomNum = Math.floor(Math.random() * 1000000000);
      const orderNumber = `AGIS-${String(randomNum).padStart(10, "0")}`;

      // Prepare order details
      const orderDetails = {
        orderNumber,
        subtotal: taxCalculation.subtotal,
        shipping: siteSettings?.shippingFlatRate || 5,
        tax: taxCalculation.taxAmount,
        total: taxCalculation.total,
        items: cartItems.map((item) => {
          let optionsDelta = 0;
          let selectedOptionsText = "";
          const optionsBreakdown: Array<{ label: string; priceDelta: number }> =
            [];

          if (item.selectedOptions && item.product.optionLists) {
            const optionParts: string[] = [];
            item.product.optionLists.forEach((list) => {
              const selectedOptionIds = item.selectedOptions?.[list.id] || [];
              if (Array.isArray(selectedOptionIds)) {
                selectedOptionIds.forEach((optionId) => {
                  const option = list.options.find((o) => o.id === optionId);
                  if (option) {
                    const priceDelta = toNumber(option.priceDelta);
                    optionsDelta += priceDelta;
                    optionParts.push(`${list.name}: ${option.name}`);
                    optionsBreakdown.push({
                      label: `${list.name}: ${option.name}`,
                      priceDelta,
                    });
                  }
                });
              } else {
                // Fallback for old single-select format
                const option = list.options.find(
                  (o) => o.id === selectedOptionIds,
                );
                if (option) {
                  const priceDelta = toNumber(option.priceDelta);
                  optionsDelta += priceDelta;
                  optionParts.push(`${list.name}: ${option.name}`);
                  optionsBreakdown.push({
                    label: `${list.name}: ${option.name}`,
                    priceDelta,
                  });
                }
              }
            });
            selectedOptionsText = optionParts.join(", ");
          }

          // Add custom text cost
          let customTextCost = 0;
          if (item.customText && item.product.customTextPricePerChar) {
            customTextCost =
              item.customText.length * item.product.customTextPricePerChar;
          }

          const customImageCost =
            item.customization?.type === "upload" &&
            item.product.allowCustomImageUpload &&
            item.product.customImageUploadPrice
              ? toNumber(item.product.customImageUploadPrice)
              : 0;

          const basePrice = toNumber(getCurrentProductPrice(item.product));

          return {
            productId: item.product.id,
            name: item.product.name,
            quantity: item.quantity,
            price: basePrice + optionsDelta + customTextCost + customImageCost,
            basePrice,
            optionsCost: optionsDelta,
            optionsBreakdown:
              optionsBreakdown.length > 0 ? optionsBreakdown : undefined,
            productImage: item.product.imageUrl,
            selectedOptionsRaw: item.selectedOptions,
            customization: item.customization
              ? {
                  type: item.customization.type,
                  value: item.customization.value, // Full-size image URL or data URL
                  fileName:
                    item.customization.type === "upload"
                      ? item.customization.fileName ||
                        `${item.product.name}-custom.png`
                      : undefined,
                }
              : undefined,
            selectedOptions: selectedOptionsText || undefined,
            customText: item.customText || undefined,
            customTextCharCount: item.customText
              ? item.customText.length
              : undefined,
            customTextCost: customTextCost > 0 ? customTextCost : undefined,
            customImageCost: customImageCost > 0 ? customImageCost : undefined,
          };
        }),
        shippingAddress: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          street1: formData.address,
          city: formData.city,
          state: shippingState,
          zip: shippingZip,
          country: "US",
          phone: formData.phone || "",
        },
      };

      if (isAssistedCheckoutRequired) {
        const assistedResult = await apiClient.orders.requestApproval({
          customerId: customer?.id || null,
          customerEmail: formData.email,
          customerName: `${formData.firstName} ${formData.lastName}`,
          orderData: orderDetails,
          unavailableServices,
          requestNotes,
          requestedPaymentMethod: preferredPaymentMethod,
        });

        const assistedOrderDetails = {
          ...orderDetails,
          orderNumber:
            assistedResult?.requestNumber || orderDetails.orderNumber,
          requestType: "approval_request",
        };

        sessionStorage.setItem(
          "orderDetails",
          JSON.stringify(assistedOrderDetails),
        );
        localStorage.setItem(
          "orderDetails",
          JSON.stringify(assistedOrderDetails),
        );
        localStorage.setItem("shouldShowOrderConfirmation", "true");

        addToast(
          "Order request sent to sales team for approval and payment options.",
          "success",
        );

        navigate(
          `/order-confirmation?orderNumber=${encodeURIComponent(assistedOrderDetails.orderNumber)}`,
          {
            state: assistedOrderDetails,
            replace: true,
          },
        );

        setTimeout(() => clearCart(), 100);
        return;
      }

      // Direct checkout: collect payment using the configured provider before creating the order
      const activeProvider = String(
        siteSettings?.paymentProvider || "none",
      ).toLowerCase();
      if (activeProvider === "stripe" && stripePaymentRef.current) {
        addToast("Processing Stripe payment...", "info");
        const paymentResult = await stripePaymentRef.current.pay(
          taxCalculation.total,
          orderDetails.orderNumber,
          {
            name: `${formData.firstName} ${formData.lastName}`,
            email: formData.email,
          },
        );

        if (!paymentResult.success) {
          addToast(
            paymentResult.error ||
              "Payment failed. Please check your card details.",
            "error",
          );
          setIsProcessingPayment(false);
          return;
        }

        (orderDetails as any).paymentIntentId = paymentResult.paymentIntentId;
        (orderDetails as any).paymentStatus = "paid";
      }

      if (activeProvider === "square" && squarePaymentRef.current) {
        addToast("Processing Square payment...", "info");
        const paymentResult = await squarePaymentRef.current.pay(
          taxCalculation.total,
          orderDetails.orderNumber,
          {
            name: `${formData.firstName} ${formData.lastName}`,
            email: formData.email,
          },
        );

        if (!paymentResult.success) {
          addToast(paymentResult.error || "Square payment failed.", "error");
          setIsProcessingPayment(false);
          return;
        }

        (orderDetails as any).squarePaymentId = paymentResult.transactionId;
        (orderDetails as any).paymentStatus = "paid";
      }

      if (activeProvider === "authorizenet" && authorizeNetPaymentRef.current) {
        addToast("Processing Authorize.Net payment...", "info");
        const paymentResult = await authorizeNetPaymentRef.current.pay(
          taxCalculation.total,
          orderDetails.orderNumber,
          {
            name: `${formData.firstName} ${formData.lastName}`,
            email: formData.email,
          },
        );

        if (!paymentResult.success) {
          addToast(
            paymentResult.error || "Authorize.Net payment failed.",
            "error",
          );
          setIsProcessingPayment(false);
          return;
        }

        (orderDetails as any).authorizeNetTransactionId =
          paymentResult.transactionId;
        (orderDetails as any).paymentStatus = "paid";
      }

      if (activeProvider === "paypal") {
        const pendingPayPalOrder = pendingPaypalOrderRef.current;
        if (!pendingPayPalOrder?.captureId) {
          addToast(
            "Complete the PayPal checkout using the button before placing the order.",
            "error",
          );
          setIsProcessingPayment(false);
          return;
        }
        (orderDetails as any).paypalCaptureId = pendingPayPalOrder.captureId;
        (orderDetails as any).paymentStatus = "paid";
      }

      // Store in both sessionStorage and localStorage for HashRouter compatibility
      sessionStorage.setItem("orderDetails", JSON.stringify(orderDetails));
      localStorage.setItem("orderDetails", JSON.stringify(orderDetails));
      localStorage.setItem("shouldShowOrderConfirmation", "true");

      console.log(
        "Order placed. Stored in sessionStorage and localStorage:",
        orderDetails.orderNumber,
      );

      // Try to send order to backend API to create order and trigger email
      try {
        const result = await apiClient.orders.create({
          orderNumber: orderDetails.orderNumber,
          customerId: customer?.id || null,
          customerEmail: formData.email,
          customerName: `${formData.firstName} ${formData.lastName}`,
          orderData: orderDetails,
        });

        console.log("Order sent to backend:", result);
        if (result?.emailSent) {
          addToast("Order confirmation email sent!", "success");
        }
      } catch (error) {
        console.warn(
          "Could not send order to backend (expected if server is down):",
          error,
        );
      }

      addToast("Order placed successfully!", "success");

      navigate(
        `/order-confirmation?orderNumber=${encodeURIComponent(orderDetails.orderNumber)}`,
        {
          state: orderDetails,
          replace: true,
        },
      );

      setTimeout(() => clearCart(), 100);
    } catch (error) {
      console.error("Error processing order:", error);
      addToast(
        "An error occurred while processing your order. Please try again.",
        "error",
      );
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const inputClasses =
    "w-full p-3 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500";

  const usStates = [
    "AL",
    "AK",
    "AZ",
    "AR",
    "CA",
    "CO",
    "CT",
    "DE",
    "FL",
    "GA",
    "HI",
    "ID",
    "IL",
    "IN",
    "IA",
    "KS",
    "KY",
    "LA",
    "ME",
    "MD",
    "MA",
    "MI",
    "MN",
    "MS",
    "MO",
    "MT",
    "NE",
    "NV",
    "NH",
    "NJ",
    "NM",
    "NY",
    "NC",
    "ND",
    "OH",
    "OK",
    "OR",
    "PA",
    "RI",
    "SC",
    "SD",
    "TN",
    "TX",
    "UT",
    "VT",
    "VA",
    "WA",
    "WV",
    "WI",
    "WY",
  ];

  // Guard against rendering if cart is empty (redirect will happen via useEffect)
  if (itemCount === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Redirecting to cart...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-4xl font-bold text-white text-center mb-8">
        Checkout
      </h1>

      {/* Show login/guest prompt if not authenticated and mode not selected */}
      {!customer && !checkoutMode && (
        <div className="bg-slate-800 p-8 rounded-lg shadow-2xl border border-slate-700 mb-8">
          <h2 className="text-2xl font-semibold text-white mb-6 text-center">
            How would you like to checkout?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Guest Checkout */}
            <div className="border border-slate-600 rounded-lg p-6 hover:border-sky-500 transition-colors">
              <h3 className="text-xl font-semibold text-white mb-3">
                Guest Checkout
              </h3>
              <p className="text-gray-400 mb-4">
                Checkout quickly without creating an account
              </p>
              <button
                onClick={() => setCheckoutMode("guest")}
                className="w-full bg-slate-700 text-white font-bold py-3 rounded-lg hover:bg-slate-600 transition-colors"
              >
                Continue as Guest
              </button>
            </div>

            {/* Account Checkout */}
            <div className="border border-slate-600 rounded-lg p-6 hover:border-sky-500 transition-colors">
              <h3 className="text-xl font-semibold text-white mb-3">
                Sign In or Register
              </h3>
              <p className="text-gray-400 mb-4">
                Track orders, save addresses, and checkout faster
              </p>
              <div className="flex flex-col gap-3">
                <Link to="/login?redirect=/checkout">
                  <button className="w-full bg-sky-500 text-white font-bold py-3 rounded-lg hover:bg-sky-600 transition-colors">
                    Sign In
                  </button>
                </Link>
                <Link to="/register?redirect=/checkout">
                  <button className="w-full bg-slate-700 text-white font-bold py-3 rounded-lg hover:bg-slate-600 transition-colors">
                    Create Account
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Show logged-in user info with option to switch to guest */}
      {customer && (
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-400 text-sm">Checking out as</p>
              <p className="text-white font-semibold">
                {customer.name} ({customer.email})
              </p>
            </div>
            <button
              onClick={() => {
                if (
                  window.confirm(
                    "Switch to guest checkout? You will need to re-enter shipping information.",
                  )
                ) {
                  // Clear form data when switching to guest
                  setFormData({
                    firstName: "",
                    lastName: "",
                    email: "",
                    phone: "",
                    address: "",
                    city: "",
                  });
                  setCheckoutMode("guest");
                }
              }}
              className="text-sky-400 hover:text-sky-300 text-sm underline"
            >
              Checkout as guest instead
            </button>
          </div>
        </div>
      )}

      {/* Show checkout form if authenticated or guest mode selected */}
      {(customer || checkoutMode === "guest") && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          {/* Shipping & Payment Form */}
          <div className="lg:col-span-3 bg-slate-800 p-8 rounded-lg shadow-2xl border border-slate-700">
            <form onSubmit={handlePlaceOrder}>
              {isAssistedCheckoutRequired && (
                <div className="mb-6 rounded-lg border border-amber-500/60 bg-amber-500/10 p-4 text-amber-100">
                  <p className="font-semibold mb-1">
                    Checkout options are not available at this time.
                  </p>
                  <p className="text-sm">
                    We can submit your order as an email request to the sales
                    team for approval and completion/payment options.
                  </p>
                  <p className="text-xs mt-2 text-amber-200">
                    Unavailable services: {unavailableServices.join(", ")}
                  </p>
                </div>
              )}
              <h2 className="text-2xl font-semibold text-white mb-6">
                Shipping Information
              </h2>

              {/* Address Selection for Logged-in Users */}
              {customer &&
                customer.addresses &&
                customer.addresses.length > 0 && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Select Shipping Address
                    </label>
                    <select
                      value={selectedAddressId}
                      onChange={(e) => handleAddressSelect(e.target.value)}
                      className={inputClasses}
                    >
                      <option value="">Choose an address...</option>
                      {customer.addresses
                        .filter((addr) => addr.type === "shipping")
                        .map((addr) => (
                          <option key={addr.id} value={addr.id}>
                            {addr.fullName} -{" "}
                            {addr.street1 || (addr as any).streetAddress},{" "}
                            {addr.city}, {addr.state}{" "}
                            {addr.zip || (addr as any).zipCode}
                            {addr.isDefault ? " (Default)" : ""}
                          </option>
                        ))}
                      <option value="new">+ Add New Address</option>
                    </select>
                  </div>
                )}

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    className={inputClasses}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    className={inputClasses}
                    required
                  />
                </div>
                <input
                  type="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className={inputClasses}
                  required
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      phone: formatPhoneNumber(e.target.value),
                    })
                  }
                  className={inputClasses}
                  required
                />
                <input
                  type="text"
                  placeholder="Address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className={inputClasses}
                  required
                />
                <div className="grid grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder="City"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    className={inputClasses}
                    required
                  />
                  <select
                    value={shippingState}
                    onChange={(e) => setShippingState(e.target.value)}
                    className={inputClasses}
                    required
                  >
                    <option value="">Select State</option>
                    {usStates.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="ZIP Code"
                    value={shippingZip}
                    onChange={(e) =>
                      setShippingZip(formatZipCode(e.target.value))
                    }
                    className={inputClasses}
                    required
                  />
                </div>
              </div>

              {isAssistedCheckoutRequired ? (
                <div className="mt-8 space-y-4">
                  <h2 className="text-2xl font-semibold text-white">
                    Sales Team Request
                  </h2>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Preferred Payment Method
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          {
                            value: "unspecified",
                            label: "Let sales team advise",
                          },
                          { value: "cash_on_pickup", label: "Cash on Pickup" },
                          { value: "invoice", label: "Invoice / Bill Me" },
                        ] as const
                      ).map(({ value, label }) => (
                        <label
                          key={value}
                          className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                            preferredPaymentMethod === value
                              ? "border-sky-500 bg-sky-500/10 text-white"
                              : "border-slate-600 text-gray-300 hover:border-slate-500"
                          }`}
                        >
                          <input
                            type="radio"
                            name="preferredPaymentMethod"
                            value={value}
                            checked={preferredPaymentMethod === value}
                            onChange={() => setPreferredPaymentMethod(value)}
                            className="accent-sky-500"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <textarea
                    value={requestNotes}
                    onChange={(e) => setRequestNotes(e.target.value)}
                    placeholder="Add any additional details for the sales team (timeline, shipping notes, etc.)"
                    rows={3}
                    className={inputClasses}
                  />
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-semibold text-white mt-8 mb-6">
                    Payment Details
                  </h2>
                  {String(siteSettings?.paymentProvider || "").toLowerCase() ===
                  "stripe" ? (
                    stripePromise ? (
                      <Elements stripe={stripePromise}>
                        <StripePaymentSection ref={stripePaymentRef} />
                      </Elements>
                    ) : (
                      <div className="p-3 bg-amber-900/30 border border-amber-500/50 rounded-md text-amber-200 text-sm">
                        {stripePublishableKey
                          ? "Loading payment form..."
                          : "Stripe publishable key is not configured. Go to Settings → Payment and enter both your Stripe Publishable Key and Secret Key."}
                      </div>
                    )
                  ) : String(
                      siteSettings?.paymentProvider || "",
                    ).toLowerCase() === "paypal" ? (
                    paypalConfig?.clientId ? (
                      <PayPalScriptProvider
                        options={{
                          clientId: paypalConfig.clientId,
                          currency: "USD",
                          intent: "capture",
                        }}
                      >
                        <PayPalPaymentSection
                          onCreateOrder={createPayPalOrder}
                          onApprove={handlePayPalApprove}
                          onError={handlePayPalError}
                          disabled={isProcessingPayment}
                        />
                      </PayPalScriptProvider>
                    ) : (
                      <div className="p-3 bg-amber-900/30 border border-amber-500/50 rounded-md text-amber-200 text-sm">
                        PayPal Client ID is not configured. Go to Settings →
                        Payment and enter your PayPal Client ID and Secret.
                      </div>
                    )
                  ) : String(
                      siteSettings?.paymentProvider || "",
                    ).toLowerCase() === "square" ? (
                    squareConfig?.applicationId && squareConfig?.locationId ? (
                      <SquarePaymentSection
                        ref={squarePaymentRef}
                        config={squareConfig}
                      />
                    ) : (
                      <div className="p-3 bg-amber-900/30 border border-amber-500/50 rounded-md text-amber-200 text-sm">
                        Square Application ID or Location ID is not configured.
                        Go to Settings → Payment and enter your Square Access
                        Token, Application ID, and Location ID.
                      </div>
                    )
                  ) : String(
                      siteSettings?.paymentProvider || "",
                    ).toLowerCase() === "authorizenet" ? (
                    authorizeNetConfig?.apiLoginId &&
                    authorizeNetConfig?.publicClientKey ? (
                      <AuthorizeNetPaymentSection
                        ref={authorizeNetPaymentRef}
                        config={authorizeNetConfig}
                      />
                    ) : (
                      <div className="p-3 bg-amber-900/30 border border-amber-500/50 rounded-md text-amber-200 text-sm">
                        Authorize.Net API Login ID or Public Client Key is not
                        configured. Go to Settings → Payment and enter your API
                        Login ID, Transaction Key, and Public Client Key.
                      </div>
                    )
                  ) : (
                    <div className="p-3 bg-amber-900/30 border border-amber-500/50 rounded-md text-amber-200 text-sm">
                      No supported payment provider is configured.
                    </div>
                  )}
                </>
              )}
              <div className="mt-8">
                <button
                  type="submit"
                  disabled={isProcessingPayment}
                  className="w-full bg-sky-500 text-white font-bold py-3 rounded-lg hover:bg-sky-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-500 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isProcessingPayment
                    ? "Processing Payment..."
                    : isAssistedCheckoutRequired
                      ? "Submit Request to Sales Team"
                      : "Place Order"}
                </button>
              </div>
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-2 bg-slate-800 p-8 rounded-lg shadow-2xl h-fit border border-slate-700">
            <h2 className="text-2xl font-semibold text-white mb-6">
              Order Summary
            </h2>
            <div className="space-y-3 text-gray-300">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${toNumber(taxCalculation.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>
                  ${toNumber(siteSettings?.shippingFlatRate, 5).toFixed(2)}
                </span>
              </div>
              {siteSettings.taxConfig.enableTaxCollection && shippingState && (
                <>
                  <div className="flex justify-between text-gray-400">
                    <span>
                      {isCalculatingTax
                        ? "Calculating tax..."
                        : `Tax (${toNumber(taxCalculation.taxRate)}%)`}
                    </span>
                    <span>
                      {isCalculatingTax
                        ? "..."
                        : `$${toNumber(taxCalculation.taxAmount).toFixed(2)}`}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {siteSettings.taxConfig.provider === "stripe" ? (
                      <span>
                        💳 Stripe Tax • {shippingState} {shippingZip}
                      </span>
                    ) : siteSettings.taxConfig.provider === "taxjar" ? (
                      <span>
                        📊 TaxJar • {shippingState} {shippingZip}
                      </span>
                    ) : siteSettings.taxConfig.provider === "avalara" ? (
                      <span>
                        🏛️ Avalara AvaTax • {shippingState} {shippingZip}
                      </span>
                    ) : siteSettings.taxConfig.provider === "taxcloud" ? (
                      <span>
                        ☁️ TaxCloud • {shippingState} {shippingZip}
                      </span>
                    ) : siteSettings.taxConfig.provider === "zamp" ? (
                      <span>
                        ⚡ Zamp • {shippingState} {shippingZip}
                      </span>
                    ) : siteSettings.taxConfig.provider === "anrok" ? (
                      <span>
                        🌍 Anrok • {shippingState} {shippingZip}
                      </span>
                    ) : (
                      <span>Based on: {shippingState}</span>
                    )}
                  </div>
                </>
              )}
              <div className="border-t border-slate-700 my-3"></div>
              <div className="flex justify-between text-xl font-bold text-white">
                <span>Total</span>
                <span>${toNumber(taxCalculation.total).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add New Address Modal */}
      {showAddAddressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 max-w-md w-full p-6">
            <h3 className="text-2xl font-semibold text-white mb-6">
              Add New Address
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="First Name"
                  value={newAddressForm.firstName}
                  onChange={(e) =>
                    setNewAddressForm({
                      ...newAddressForm,
                      firstName: e.target.value,
                    })
                  }
                  className={inputClasses}
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={newAddressForm.lastName}
                  onChange={(e) =>
                    setNewAddressForm({
                      ...newAddressForm,
                      lastName: e.target.value,
                    })
                  }
                  className={inputClasses}
                />
              </div>

              <input
                type="text"
                placeholder="Street Address"
                value={newAddressForm.streetAddress}
                onChange={(e) =>
                  setNewAddressForm({
                    ...newAddressForm,
                    streetAddress: e.target.value,
                  })
                }
                className={inputClasses}
              />

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="City"
                  value={newAddressForm.city}
                  onChange={(e) =>
                    setNewAddressForm({
                      ...newAddressForm,
                      city: e.target.value,
                    })
                  }
                  className={inputClasses}
                />
                <select
                  value={newAddressForm.state}
                  onChange={(e) =>
                    setNewAddressForm({
                      ...newAddressForm,
                      state: e.target.value,
                    })
                  }
                  className={inputClasses}
                >
                  <option value="">State</option>
                  {usStates.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>

              <input
                type="text"
                placeholder="ZIP Code"
                value={newAddressForm.zipCode}
                onChange={(e) =>
                  setNewAddressForm({
                    ...newAddressForm,
                    zipCode: formatZipCode(e.target.value),
                  })
                }
                className={inputClasses}
              />

              <input
                type="tel"
                placeholder="Phone Number (Optional)"
                value={newAddressForm.phone}
                onChange={(e) =>
                  setNewAddressForm({
                    ...newAddressForm,
                    phone: formatPhoneNumber(e.target.value),
                  })
                }
                className={inputClasses}
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowAddAddressModal(false)}
                disabled={isSavingAddress}
                className="flex-1 bg-slate-700 text-white font-medium py-2 rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNewAddress}
                disabled={isSavingAddress}
                className="flex-1 bg-sky-500 text-white font-medium py-2 rounded-lg hover:bg-sky-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingAddress ? "Saving..." : "Save Address"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;
