
export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  inventory: number;
  customizable: boolean;
  galleryId?: string; // Link to a specific gallery
}

export interface CartItem {
  product: Product;
  quantity: number;
  customization?: {
    type: 'gallery' | 'upload';
    value: string; // URL for gallery, data URL for upload
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface GalleryImage {
  id: string;
  url: string;
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
  text: string;
  rating: number;
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

export interface Page {
  id: string;
  path: string; // e.g., /privacy-policy
  title: string;
  content: string; // Can contain HTML
}

export type PaymentProvider = 'none' | 'stripe' | 'paypal' | 'square' | 'authorizeNet';
export type ShippingProvider = 'none' | 'flatRate' | 'fedex' | 'ups' | 'usps';

export interface SiteSettings {
  logoText: string;
  logoTextAccent: string;
  headerLogoUrl: string;
  heroTitle: string;
  heroSubtitle: string;
  heroBackgroundImageUrl: string;
  aboutPageContent: string;
  
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

  // Theme Management
  siteBackgroundColor: string;
  siteTextColor: string;
  siteAccentColor: string;
  siteBackgroundImageUrl: string;
  siteBackgroundOpacity: number;
}
