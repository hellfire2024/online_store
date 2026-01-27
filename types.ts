export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  inventory: number;
  customizable: boolean;
  galleryId?: string; // Link to a specific gallery
  enableAIIdeas?: boolean; // Enable AI design ideas for this product
  lowStockThreshold?: number; // Trigger alerts when inventory <= threshold
  optionLists?: ProductOptionList[]; // Multiple option lists (e.g., Size, Color, Material)
}

export interface ProductOptionList {
  id: string;
  name: string; // e.g., "Size", "Color", "Material"
  required: boolean; // Whether customer must select an option from this list
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
  };
  selectedOptions?: { [listId: string]: string }; // Map of option list ID to selected option ID
}

// ===== CUSTOMER TYPES =====
export interface CustomerAddress {
  id: string;
  type: "shipping" | "billing";
  fullName: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  isDefault: boolean;
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

export interface TaxConfig {
  enableTaxCollection: boolean;
  defaultTaxRate: number; // Fallback if no state rules match
  rules: TaxRule[];
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
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  shippingAddress: CustomerAddress;
  items: CartItem[];
  trackingNumber?: string;
  appliedTaxRate?: number; // The tax rate applied at time of order
}

export interface Customer {
  id: string;
  name: string;
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

export type FooterItemType = 'contactInfo' | 'socialLinks' | 'menu';

export interface FooterItem {
  id: string; // Unique ID for DnD, e.g., 'contactInfo', 'socialLinks', 'menu_123'
  type: FooterItemType;
  menuId?: string; // Only if type is 'menu'
  title: string; // Display name, e.g., "Contact Information", "Follow Us", "Quick Links"
}

export interface FooterColumn {
  id: 'left' | 'center' | 'right';
  items: FooterItem[];
}

// Page content type definitions
export interface HomePageContent {
  heroTitle: string;
  heroSubtitle: string;
  heroBackgroundImageUrl: string;
}

export interface AboutPageContent {
  aboutPageContent: string;
}

  export type ContactFieldType = 'firstName' | 'lastName' | 'fullName' | 'email' | 'phone' | 'address' | 'subject' | 'message' | 'text' | 'textarea' | 'select' | 'checkbox';

  export interface ConditionalRule {
    fieldId: string; // ID of field to check
    operator: 'equals' | 'notEquals' | 'contains' | 'notEmpty';
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
}

export interface CustomPageContent {
  content: string;
}

export interface Page {
  id: string;
  title: string;
  path: string;
  pageType?: "home" | "about" | "contact" | "custom";
  contentData?: HomePageContent | AboutPageContent | ContactPageContent | CustomPageContent; // Structured content
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
  };

  footerSocialLinks: MenuItem[];
  footerContactEmail: string;
  footerContactPhone: string;
  footerContactAddress: string;

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

  // Theme Management
  siteBackgroundColor: string;
  siteTextColor: string;
  siteAccentColor: string;
  siteBackgroundImageUrl: string;
  siteBackgroundOpacity: number;
  maxReviewsDisplayed: number; // How many approved reviews to show on site
}
