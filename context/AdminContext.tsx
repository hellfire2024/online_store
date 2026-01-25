import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import {
  Product,
  Gallery,
  GalleryImage,
  StaffMember,
  Review,
  Service,
  SiteSettings,
  Page,
  Menu,
  AdminUser,
  Customer,
} from "../types";
import * as mockApi from "../services/mockApi";
import Spinner from "../components/Spinner";

interface AdminContextType {
  adminUser: AdminUser | null;
  isAdminAuthenticated: boolean;
  isLoading: boolean;
  loginAdmin: (
    username: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logoutAdmin: () => void;

  customers: Customer[];
  fetchCustomers: () => Promise<void>;
  getCustomer: (customerId: string) => Customer | undefined;
  sendPasswordResetEmail: (
    customerId: string,
  ) => Promise<{ success: boolean; error?: string }>;
  updateCustomerAddress: (
    customerId: string,
    addressId: string,
    updates: any,
  ) => Promise<{ success: boolean; error?: string }>;
  updateCustomerEmailPreferences: (
    customerId: string,
    preferences: any,
  ) => Promise<{ success: boolean; error?: string }>;
  deactivateCustomer: (
    customerId: string,
  ) => Promise<{ success: boolean; error?: string }>;
  reactivateCustomer: (
    customerId: string,
  ) => Promise<{ success: boolean; error?: string }>;

  products: Product[];
  addProduct: (product: Omit<Product, "id">) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;

  galleries: Gallery[];
  addGallery: (gallery: Omit<Gallery, "id">) => Promise<void>;
  deleteGallery: (galleryId: string) => Promise<void>;

  galleryImages: Record<string, GalleryImage[]>;
  fetchGalleryImages: (galleryId: string) => Promise<void>;
  addGalleryImage: (
    galleryId: string,
    image: Omit<GalleryImage, "id">,
  ) => Promise<void>;
  deleteGalleryImage: (galleryId: string, imageId: string) => Promise<void>;

  staff: StaffMember[];
  addStaff: (staffMember: Omit<StaffMember, "id">) => Promise<void>;
  updateStaff: (staffMember: StaffMember) => Promise<void>;
  deleteStaff: (staffId: string) => Promise<void>;

  reviews: Review[];
  addReview: (review: Omit<Review, "id">) => Promise<void>;
  updateReview: (review: Review) => Promise<void>;
  deleteReview: (reviewId: string) => Promise<void>;

  services: Service[];
  addService: (service: Omit<Service, "id">) => Promise<void>;
  updateService: (service: Service) => Promise<void>;
  deleteService: (serviceId: string) => Promise<void>;

  pages: Page[];
  addPage: (page: Omit<Page, "id">) => Promise<Page>;
  updatePage: (page: Page) => Promise<void>;
  deletePage: (pageId: string) => Promise<void>;

  menus: Menu[];
  updateMenu: (menu: Menu) => Promise<void>;

  siteSettings: SiteSettings;
  updateSiteSettings: (newSettings: Partial<SiteSettings>) => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

// Mock admin users - in production, these would be from a database
const MOCK_ADMIN_USERS: AdminUser[] = [
  {
    id: "admin-1",
    username: "admin",
    email: "admin@customthreads.com",
    role: "super_admin",
    permissions: ["*"],
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    isActive: true,
  },
  {
    id: "admin-2",
    username: "manager",
    email: "manager@customthreads.com",
    role: "admin",
    permissions: ["products", "orders", "customers", "galleries"],
    createdAt: new Date().toISOString(),
    isActive: true,
  },
];

const initialSiteSettings: SiteSettings = {
  logoText: "Custom",
  logoTextAccent: "Threads",
  headerLogoUrl: "",
  heroTitle: "Your Vision, Our Fabric",
  heroSubtitle:
    "Create one-of-a-kind products with your own designs. High-quality printing on premium materials.",
  heroBackgroundImageUrl: "https://picsum.photos/seed/hero/1200/800",
  footerSocialLinks: [],
  aboutPageContent: "Loading content...",
  footerContactEmail: "",
  footerContactPhone: "",
  footerContactAddress: "",
  paymentProvider: "none",
  paymentApiKeys: { stripe: "", paypal: "", square: "", authorizeNet: "" },
  shippingProvider: "none",
  shippingFlatRate: 0,
  shippingApiKeys: { fedex: "", ups: "", usps: "" },
  siteBackgroundColor: "#0f172a",
  siteTextColor: "#d1d5db",
  siteAccentColor: "#38bdf8",
  siteBackgroundImageUrl: "",
  siteBackgroundOpacity: 100,
  footerBackgroundOpacity: 100,
};

export const AdminProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [galleryImages, setGalleryImages] = useState<
    Record<string, GalleryImage[]>
  >({});
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [siteSettings, setSiteSettings] =
    useState<SiteSettings>(initialSiteSettings);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Check for stored admin user
        const storedAdmin = localStorage.getItem("adminUser");
        if (storedAdmin) {
          setAdminUser(JSON.parse(storedAdmin));
        }

        const [
          productsData,
          galleriesData,
          staffData,
          reviewsData,
          servicesData,
          pagesData,
          menusData,
          settingsData,
        ] = await Promise.all([
          mockApi.fetchProducts(),
          mockApi.fetchGalleries(),
          mockApi.fetchStaff(),
          mockApi.fetchReviews(),
          mockApi.fetchServices(),
          mockApi.fetchPages(),
          mockApi.fetchMenus(),
          mockApi.fetchSiteSettings(),
        ]);
        setProducts(productsData);
        setGalleries(galleriesData);
        setStaff(staffData);
        setReviews(reviewsData);
        setServices(servicesData);
        setPages(pagesData);
        setMenus(menusData);
        setSiteSettings(settingsData);

        // Load customers
        const storedCustomers = localStorage.getItem("customers");
        if (storedCustomers) {
          setCustomers(JSON.parse(storedCustomers));
        }
      } catch (error) {
        console.error("Failed to load initial site data", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // ===== ADMIN AUTHENTICATION =====
  const loginAdmin = async (username: string, password: string) => {
    try {
      const user = MOCK_ADMIN_USERS.find(
        (u) => u.username === username && u.isActive,
      );

      if (!user || password !== "admin123") {
        return { success: false, error: "Invalid username or password" };
      }

      const updatedUser = { ...user, lastLogin: new Date().toISOString() };
      setAdminUser(updatedUser);
      localStorage.setItem("adminUser", JSON.stringify(updatedUser));
      return { success: true };
    } catch (error) {
      return { success: false, error: "Login failed" };
    }
  };

  const logoutAdmin = () => {
    setAdminUser(null);
    localStorage.removeItem("adminUser");
  };

  // ===== CUSTOMER MANAGEMENT =====
  const fetchCustomers = async () => {
    try {
      const stored = localStorage.getItem("customers");
      if (stored) {
        setCustomers(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to fetch customers", error);
    }
  };

  const getCustomer = (customerId: string) => {
    return customers.find((c) => c.id === customerId);
  };

  const sendPasswordResetEmail = async (customerId: string) => {
    try {
      const customer = getCustomer(customerId);
      if (!customer) return { success: false, error: "Customer not found" };
      console.log(`Password reset email sent to ${customer.email}`);
      return { success: true };
    } catch (error) {
      return { success: false, error: "Failed to send password reset email" };
    }
  };

  const updateCustomerAddress = async (
    customerId: string,
    addressId: string,
    updates: any,
  ) => {
    try {
      const updated = customers.map((c) => {
        if (c.id === customerId) {
          return {
            ...c,
            addresses: c.addresses.map((a) =>
              a.id === addressId ? { ...a, ...updates } : a,
            ),
          };
        }
        return c;
      });
      setCustomers(updated);
      localStorage.setItem("customers", JSON.stringify(updated));
      return { success: true };
    } catch (error) {
      return { success: false, error: "Failed to update address" };
    }
  };

  const updateCustomerEmailPreferences = async (
    customerId: string,
    preferences: any,
  ) => {
    try {
      const updated = customers.map((c) => {
        if (c.id === customerId) {
          return { ...c, emailPreferences: preferences };
        }
        return c;
      });
      setCustomers(updated);
      localStorage.setItem("customers", JSON.stringify(updated));
      return { success: true };
    } catch (error) {
      return { success: false, error: "Failed to update email preferences" };
    }
  };

  const deactivateCustomer = async (customerId: string) => {
    try {
      const updated = customers.map((c) =>
        c.id === customerId ? { ...c, isActive: false } : c,
      );
      setCustomers(updated);
      localStorage.setItem("customers", JSON.stringify(updated));
      return { success: true };
    } catch (error) {
      return { success: false, error: "Failed to deactivate customer" };
    }
  };

  const reactivateCustomer = async (customerId: string) => {
    try {
      const updated = customers.map((c) =>
        c.id === customerId ? { ...c, isActive: true } : c,
      );
      setCustomers(updated);
      localStorage.setItem("customers", JSON.stringify(updated));
      return { success: true };
    } catch (error) {
      return { success: false, error: "Failed to reactivate customer" };
    }
  };

  // ===== PRODUCT MANAGEMENT =====
  const addProduct = async (product: Omit<Product, "id">) => {
    const newProduct = await mockApi.addProduct(product);
    setProducts((prev) => [...prev, newProduct]);
  };

  const updateProduct = async (product: Product) => {
    await mockApi.updateProduct(product);
    setProducts((prev) => prev.map((p) => (p.id === product.id ? product : p)));
  };

  const deleteProduct = async (productId: string) => {
    await mockApi.deleteProduct(productId);
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  // ===== GALLERY MANAGEMENT =====
  const addGallery = async (galleryData: Omit<Gallery, "id">) => {
    const newGallery = await mockApi.addGallery(galleryData);
    setGalleries((prev) => [...prev, newGallery]);
  };

  const deleteGallery = async (galleryId: string) => {
    await mockApi.deleteGallery(galleryId);
    setGalleries((prev) => prev.filter((g) => g.id !== galleryId));
    setProducts(await mockApi.fetchProducts());
  };

  const fetchGalleryImages = async (galleryId: string) => {
    const images = await mockApi.fetchGalleryImages(galleryId);
    setGalleryImages((prev) => ({ ...prev, [galleryId]: images }));
  };

  const addGalleryImage = async (
    galleryId: string,
    imageData: Omit<GalleryImage, "id">,
  ) => {
    const newImage = await mockApi.addGalleryImage(galleryId, imageData);
    setGalleryImages((prev) => ({
      ...prev,
      [galleryId]: [...(prev[galleryId] || []), newImage],
    }));
  };

  const deleteGalleryImage = async (galleryId: string, imageId: string) => {
    await mockApi.deleteGalleryImage(galleryId, imageId);
    setGalleryImages((prev) => ({
      ...prev,
      [galleryId]: prev[galleryId].filter((img) => img.id !== imageId),
    }));
  };

  // ===== STAFF MANAGEMENT =====
  const addStaff = async (staffMember: Omit<StaffMember, "id">) => {
    const newStaff = await mockApi.addStaff(staffMember);
    setStaff((prev) => [...prev, newStaff]);
  };

  const updateStaff = async (staffMember: StaffMember) => {
    await mockApi.updateStaff(staffMember);
    setStaff((prev) =>
      prev.map((s) => (s.id === staffMember.id ? staffMember : s)),
    );
  };

  const deleteStaff = async (staffId: string) => {
    await mockApi.deleteStaff(staffId);
    setStaff((prev) => prev.filter((s) => s.id !== staffId));
  };

  // ===== REVIEW MANAGEMENT =====
  const addReview = async (review: Omit<Review, "id">) => {
    const newReview = await mockApi.addReview(review);
    setReviews((prev) => [...prev, newReview]);
  };

  const updateReview = async (review: Review) => {
    await mockApi.updateReview(review);
    setReviews((prev) => prev.map((r) => (r.id === review.id ? review : r)));
  };

  const deleteReview = async (reviewId: string) => {
    await mockApi.deleteReview(reviewId);
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
  };

  // ===== SERVICE MANAGEMENT =====
  const addService = async (service: Omit<Service, "id">) => {
    const newService = await mockApi.addService(service);
    setServices((prev) => [...prev, newService]);
  };

  const updateService = async (service: Service) => {
    await mockApi.updateService(service);
    setServices((prev) => prev.map((s) => (s.id === service.id ? service : s)));
  };

  const deleteService = async (serviceId: string) => {
    await mockApi.deleteService(serviceId);
    setServices((prev) => prev.filter((s) => s.id !== serviceId));
  };

  // ===== PAGE MANAGEMENT =====
  const addPage = async (page: Omit<Page, "id">) => {
    const newPage = await mockApi.addPage(page);
    setPages((prev) => [...prev, newPage]);
    return newPage;
  };

  const updatePage = async (page: Page) => {
    await mockApi.updatePage(page);
    setPages((prev) => prev.map((p) => (p.id === page.id ? page : p)));
  };

  const deletePage = async (pageId: string) => {
    await mockApi.deletePage(pageId);
    setPages((prev) => prev.filter((p) => p.id !== pageId));
  };

  // ===== MENU MANAGEMENT =====
  const updateMenu = async (menu: Menu) => {
    await mockApi.updateMenu(menu);
    setMenus((prev) => prev.map((m) => (m.id === menu.id ? menu : m)));
  };

  // ===== SITE SETTINGS =====
  const updateSiteSettings = async (newSettings: Partial<SiteSettings>) => {
    const updatedSettings = await mockApi.updateSiteSettings(newSettings);
    setSiteSettings(updatedSettings);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-slate-900">
        <Spinner />
      </div>
    );
  }

  const isAdminAuthenticated = !!adminUser;

  return (
    <AdminContext.Provider
      value={{
        adminUser,
        isAdminAuthenticated,
        isLoading,
        loginAdmin,
        logoutAdmin,
        customers,
        fetchCustomers,
        getCustomer,
        sendPasswordResetEmail,
        updateCustomerAddress,
        updateCustomerEmailPreferences,
        deactivateCustomer,
        reactivateCustomer,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        galleries,
        addGallery,
        deleteGallery,
        galleryImages,
        fetchGalleryImages,
        addGalleryImage,
        deleteGalleryImage,
        staff,
        addStaff,
        updateStaff,
        deleteStaff,
        reviews,
        addReview,
        updateReview,
        deleteReview,
        services,
        addService,
        updateService,
        deleteService,
        pages,
        addPage,
        updatePage,
        deletePage,
        menus,
        updateMenu,
        siteSettings,
        updateSiteSettings,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
};
