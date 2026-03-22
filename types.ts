export interface Product {
  id: string;
  name: string;
  price: number;
  effectivePrice?: number;
  salePrice?: number;
  isOnSale?: boolean;
  description: string;
  imageUrl: string;
  inventory: number;
  isArchived?: boolean;
  saleType?: "none" | "percent" | "fixed";
  saleValue?: number;
  saleStartAt?: string;
  saleEndAt?: string;
  reorderPricingMode?: "current" | "historical";
  customizable: boolean;
  galleryId?: string; // Link to a specific gallery
  enableAIIdeas?: boolean; // Enable AI design ideas for this product
  lowStockThreshold?: number; // Trigger alerts when inventory <= threshold
  optionLists?: ProductOptionList[]; // Multiple option lists (e.g., Size, Color, Material)
  allowCustomText?: boolean; // Allow customers to add custom engraving text
  customTextPricePerChar?: number; // Price per character for custom text
  customTextMaxLength?: number; // Maximum characters allowed
  allowCustomImageUpload?: boolean; // Allow customers to upload a custom image
  customImageUploadPrice?: number; // Flat price for uploaded custom image
}

export interface ProductOptionList {
  id: string;
  name: string; // e.g., "Size", "Color", "Material"
  required: boolean; // Whether customer must select an option from this list
  maxSelections?: number; // Maximum number of options that can be selected from this list (unlimited if not set)
  order: number; // Sort order for UI
  options: ProductOption[]; // The actual options in this list
}

export interface ProductOption {
  id: string;
  name: string; // e.g., "Small", "Red", "Cotton"
  priceDelta: number; // Additional price over base product
  order: number; // Sort order for UI
}

export interface CartItem {
  product: Product;
  quantity: number;
  customization?: {
    type: "gallery" | "upload";
    value: string; // URL for gallery, data URL for upload
    fileName?: string;
  };
  selectedOptions?: { [listId: string]: string[] }; // Map of option list ID to selected option IDs (array for multi-select)
  customText?: string; // Custom engraving text
}

// ===== SHIPPING TYPES =====
export interface ShippingAddress {
  firstName: string;
  lastName: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  email: string;
  phone: string;
}

export interface ShippingPackage {
  weight: number; // in pounds
  length: number; // in inches
  width: number; // in inches
  height: number; // in inches
}

export interface ShippingRate {
  id: string;
  carrier: "easypost" | "shippo" | "shipstation";
  service: string;
  serviceName: string;
  rate: number; // in cents
  estimatedDays: number;
  estimatedDelivery?: string;
}

export interface ShippingRateRequest {
  toAddress: ShippingAddress;
  fromAddress: ShippingAddress;
  parcel: ShippingPackage;
  carriers?: ("easypost" | "shippo" | "shipstation")[];
}

// ===== CUSTOMER TYPES =====
export interface CustomerAddress {
  id: string;
  type: "shipping" | "billing";
  firstName: string;
  lastName: string;
  fullName: string; // Computed from firstName + lastName for backward compatibility
  street1: string; // Address Line 1 (street address)
  street2?: string; // Address Line 2 (apt, suite, etc.)
  city: string;
  state: string; // 2-letter state code (e.g., "CA")
  zip: string; // ZIP code (5 or 9 digits)
  country: string; // 2-letter ISO code (e.g., "US")
  phone: string;
  isDefault: boolean;
}

// ===== CUSTOMER SEGMENTATION TYPES =====
export interface CustomerSegmentRule {
  id: string;
  name: string; // e.g., "VIP", "At-Risk", "Standard"
  minTotalSpent?: number; // Minimum total spending to qualify (e.g., 1000)
  minOrderCount?: number; // Minimum number of orders (e.g., 5)
  maxDaysSinceOrder?: number; // Max days without an order to qualify (e.g., 180)
  priority: number; // Lower number = higher priority; first match wins
  enabled: boolean;
}

export interface TaxRule {
  id: string;
  name: string;
  states: string[]; // US state codes (e.g., ['CA', 'NY', 'TX'])
  taxRate: number; // Percentage (e.g., 8.5 for 8.5%)
  productCategories?: string[]; // Optional: if empty, applies to all products
  exemptedProductIds?: string[]; // Specific products exempt from this rule
  enabled: boolean;
  priority: number; // Higher priority rules override lower ones
}

export type TaxProvider =
  | "manual"
  | "stripe"
  | "taxjar"
  | "avalara"
  | "taxcloud"
  | "zamp"
  | "anrok";

export interface TaxProviderCredentials {
  // Stripe Tax
  stripeApiKey?: string;

  // TaxJar
  taxjarApiKey?: string;

  // Avalara AvaTax
  avalaraAccountId?: string;
  avalaraLicenseKey?: string;
  avalaraEnvironment?: "sandbox" | "production";

  // TaxCloud
  taxcloudApiKey?: string;
  taxcloudUserId?: string;

  // Zamp
  zampApiKey?: string;

  // Anrok
  anrokApiKey?: string;
}

export interface TaxConfig {
  enableTaxCollection: boolean;
  provider: TaxProvider; // Which tax provider to use
  defaultTaxRate: number; // Fallback if no state rules match (for manual mode)
  credentials?: TaxProviderCredentials; // API credentials for various providers
  rules: TaxRule[]; // Manual fallback rules
  taxIncludedInPrice: boolean; // If true, tax is included in product price; if false, added at checkout
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  date: string;
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  total: number;
  status:
    | "approval_requested"
    | "pending"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled";
  paymentStatus?:
    | "unpaid"
    | "paid"
    | "refund_issued"
    | "declined"
    | "pending_offline"
    | "cash_on_pickup_requested"
    | "cash_on_pickup_paid";
  requestedPaymentMethod?: string;
  invoiceIssuedAt?: string;
  paymentCollectedAt?: string;
  paymentCollectionMethod?: "cash" | "card" | "bank_transfer" | "other";
  shippingAddress: CustomerAddress;
  items: CartItem[];
  trackingNumber?: string;
  appliedTaxRate?: number; // The tax rate applied at time of order
}

export interface Customer {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  password?: string; // Never stored in state, only for API
  phone?: string;
  createdAt: string;
  lastLogin: string;
  addresses: CustomerAddress[];
  orders: CustomerOrder[];
  emailPreferences: {
    marketing: boolean;
    orderUpdates: boolean;
    announcements: boolean;
  };
  isActive: boolean;
  segment?: string; // Segment ID based on customer behavior (VIP, At-Risk, Standard, etc.)
  segmentLastCalculated?: string; // When the segment was last assigned
}

// Keep original User type for backward compatibility
export interface User {
  id: string;
  name: string;
  email: string;
}

// ===== ADMIN TYPES =====
export interface AdminUser {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  username: string;
  email: string;
  role: "super_admin" | "admin" | "manager";
  permissions: string[];
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
}

export interface GalleryImage {
  id: string;
  imageUrl: string;
  name: string;
}

export interface Gallery {
  id: string;
  name: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  imageUrl: string;
}

export interface Review {
  id: string;
  author: string;
  email?: string;
  text: string;
  rating: number;
  status: "pending" | "approved" | "rejected" | "archived";
  createdAt: string;
  approvedAt?: string;
  rejectionReason?: string;
  images?: string[]; // Array of image URLs (max 3)
}

export interface Service {
  id: string;
  title: string;
  description: string;
  icon: string; // For simplicity, we'll use a string for an icon name/SVG
}

export interface MenuItem {
  id: string;
  text: string;
  url: string;
}

export interface Menu {
  id: string;
  name: string;
  items: MenuItem[];
}

export type FooterItemType = "contactInfo" | "socialLinks" | "menu";

export interface FooterItem {
  id: string; // Unique ID for DnD, e.g., 'contactInfo', 'socialLinks', 'menu_123'
  type: FooterItemType;
  menuId?: string; // Only if type is 'menu'
  title: string; // Display name, e.g., "Contact Information", "Follow Us", "Quick Links"
}

export interface FooterColumn {
  id: "left" | "center" | "right";
  items: FooterItem[];
}

// Page content type definitions
export interface HomePageContent {
  heroTitle: string;
  heroSubtitle: string;
  heroBackgroundImageUrl: string;
  pageFont?: string; // Page-specific font override
  pageTitleFont?: string; // Page title font override
  pageTitleColor?: string; // Page title color override
  galleryRotationEnabled?: boolean; // Enable gallery rotation
  galleryRotationId?: string; // Selected gallery ID for rotation
  galleryRotationInterval?: number; // Rotation interval in seconds
  recentCreationsGalleryId?: string; // Selected gallery ID for recent creations section
  recentCreationsAutoScroll?: boolean; // Enable auto-scroll for recent creations
  recentCreationsInterval?: number; // Auto-scroll interval in seconds
}

export interface AboutPageContent {
  aboutPageContent: string;
  pageFont?: string; // Page-specific font override
  pageTitleFont?: string; // Page title font override
  pageTitleColor?: string; // Page title color override
}

export type ContactFieldType =
  | "firstName"
  | "lastName"
  | "fullName"
  | "email"
  | "phone"
  | "address"
  | "subject"
  | "message"
  | "text"
  | "textarea"
  | "select"
  | "checkbox";

export interface ConditionalRule {
  fieldId: string; // ID of field to check
  operator: "equals" | "notEquals" | "contains" | "notEmpty";
  value: string;
}

export interface ContactFormField {
  id: string;
  type: ContactFieldType;
  label: string;
  placeholder: string;
  required: boolean;
  enabled: boolean;
  options?: string[]; // For select fields
  conditionalRules?: ConditionalRule[]; // Show field only if rules match
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
}

export interface ContactPageContent {
  pageTitle: string;
  pageSubtitle: string;
  formFields: ContactFormField[];
  targetEmail: string; // Where form submissions go
  subjectTemplate: string; // Email subject template, e.g., "Contact Form: {subject}"
  successMessage: string;
  pageFont?: string; // Page-specific font override
  pageTitleFont?: string; // Page title font override
  pageTitleColor?: string; // Page title color override
}

export interface CustomPageContent {
  content: string;
  pageFont?: string; // Page-specific font override
  pageTitleFont?: string; // Page title font override
  pageTitleColor?: string; // Page title color override
}

export interface Page {
  id: string;
  title: string;
  path: string;
  pageType?: "home" | "about" | "contact" | "custom";
  contentData?:
    | HomePageContent
    | AboutPageContent
    | ContactPageContent
    | CustomPageContent; // Structured content
  content?: string; // Fallback for simple rich text (e.g., custom pages)
}

export type PaymentProvider =
  | "none"
  | "stripe"
  | "paypal"
  | "square"
  | "authorizeNet";
export type ShippingProvider = "none" | "flatRate" | "fedex" | "ups" | "usps";

export interface SiteSettings {
  logoText: string;
  logoTextAccent: string;
  headerLogoUrl?: string; // Re-adding the optional logo URL
  siteTitle: string;
  faviconUrl?: string;
  footerConfig?: {
    columns: FooterColumn[];
    socialLinks?: MenuItem[];
    contactEmail?: string;
    contactPhone?: string;
    contactAddress?: string;
  };

  paymentProvider: PaymentProvider;
  paymentApiKeys: {
    stripe: string;
    paypal: string;
    square: string;
    authorizeNet: string;
  };

  shippingProvider: ShippingProvider;
  shippingFlatRate: number;
  shippingApiKeys: {
    fedex: string;
    ups: string;
    usps: string;
  };

  // Tax Management
  taxConfig: TaxConfig;

  // Email Configuration
  emailConfig: {
    provider: "smtp" | "sendgrid" | "mailgun" | "none";
    fromEmail: string;
    fromName: string;
    // SMTP specific
    smtpHost?: string;
    smtpPort?: number;
    smtpSecure?: boolean; // TLS/SSL
    smtpUsername?: string;
    smtpPassword?: string; // Encrypted in database, only in form state
    // SendGrid specific
    sendgridApiKey?: string; // Encrypted in database
    // Mailgun specific
    mailgunDomain?: string;
    mailgunApiKey?: string; // Encrypted in database
  };

  // Order Configuration
  orderPrefix?: string; // e.g., "AGIS"
  orderNumberLength?: number; // e.g., 10 for AGIS-0000000001
  invoiceTemplateHtml?: string; // HTML template for PDF receipts/invoices (deprecated)
  invoiceTemplate?: {
    id: string;
    name: string;
    headerImageUrl?: string;
    logoUrl?: string;
    logoPosition?: "left" | "center" | "right";
    logoSize?: number;
    showCompanyInfo?: boolean;
    companyName: string;
    companyEmail?: string;
    companyPhone?: string;
    companyAddress?: string;
    invoiceTitle: string;
    includeItems: boolean;
    includeTotals: boolean;
    includeCustomization?: boolean;
    showTrackingNumber?: boolean;
    showPaymentMethod?: boolean;
    showNotes?: boolean;
    footerText?: string;
    footerAlignment?: "left" | "center" | "right";
    accentColor: string;
    backgroundColor: string;
    textColor: string;
    borderColor: string;
    headerBackgroundColor?: string;
    headerTextColor?: string;
  };

  // Support & Ticketing Configuration
  supportEmail?: string; // e.g., "support@adaptivegis.com"
  supportSubjectPrefix?: string; // e.g., "Support Request"
  supportTicketSuffix?: string; // e.g., "SUP-001-001"

  // Theme Management
  siteBackgroundColor: string;
  siteTextColor: string;
  siteAccentColor: string;
  siteBackgroundImageUrl: string;
  siteBackgroundOpacity: number;
  maxReviewsDisplayed: number; // How many approved reviews to show on site
  globalFont?: string; // Site-wide default font

  // Terms and Conditions
  termsAndConditionsContent: string;

  // Customer Segmentation
  segmentRules: CustomerSegmentRule[];

  // Contact Form Default Fields
  defaultFormFields?: ContactFormField[];

  // Shipping Integration
  shippingCarriers: {
    easypost: {
      enabled: boolean;
      apiKey: string;
    };
    shippo: {
      enabled: boolean;
      apiKey: string;
    };
    shipstation: {
      enabled: boolean;
      apiKey: string;
      apiSecret: string;
    };
  };
  defaultShippingCarrier: "easypost" | "shippo" | "shipstation";
  fromAddress: ShippingAddress;

  // API Configuration
  apiBaseUrl?: string;
  demo_mode?: boolean;
}
