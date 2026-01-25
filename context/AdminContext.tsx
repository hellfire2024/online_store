
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Product, Gallery, GalleryImage, StaffMember, Review, Service, SiteSettings, Page, Menu } from '../types';
import * as mockApi from '../services/mockApi';
import Spinner from '../components/Spinner';

interface AdminContextType {
  isAdminAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
  
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;

  galleries: Gallery[];
  addGallery: (gallery: Omit<Gallery, 'id'>) => Promise<void>;
  deleteGallery: (galleryId: string) => Promise<void>;
  
  galleryImages: Record<string, GalleryImage[]>;
  fetchGalleryImages: (galleryId: string) => Promise<void>;
  addGalleryImage: (galleryId: string, image: Omit<GalleryImage, 'id'>) => Promise<void>;
  deleteGalleryImage: (galleryId: string, imageId: string) => Promise<void>;

  staff: StaffMember[];
  addStaff: (staffMember: Omit<StaffMember, 'id'>) => Promise<void>;
  updateStaff: (staffMember: StaffMember) => Promise<void>;
  deleteStaff: (staffId: string) => Promise<void>;

  reviews: Review[];
  addReview: (review: Omit<Review, 'id'>) => Promise<void>;
  updateReview: (review: Review) => Promise<void>;
  deleteReview: (reviewId: string) => Promise<void>;

  services: Service[];
  addService: (service: Omit<Service, 'id'>) => Promise<void>;
  updateService: (service: Service) => Promise<void>;
  deleteService: (serviceId: string) => Promise<void>;

  pages: Page[];
  addPage: (page: Omit<Page, 'id'>) => Promise<Page>;
  updatePage: (page: Page) => Promise<void>;
  deletePage: (pageId: string) => Promise<void>;

  menus: Menu[];
  updateMenu: (menu: Menu) => Promise<void>;
  
  siteSettings: SiteSettings;
  updateSiteSettings: (newSettings: Partial<SiteSettings>) => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

const ADMIN_PASSWORD = "admin"; // Hardcoded for demo purposes

const initialSiteSettings: SiteSettings = {
    logoText: 'Custom',
    logoTextAccent: 'Threads',
    headerLogoUrl: '',
    heroTitle: 'Your Vision, Our Fabric',
    heroSubtitle: 'Create one-of-a-kind products with your own designs. High-quality printing on premium materials.',
    heroBackgroundImageUrl: 'https://picsum.photos/seed/hero/1200/800',
    footerSocialLinks: [],
    aboutPageContent: 'Loading content...',
    footerContactEmail: '',
    footerContactPhone: '',
    footerContactAddress: '',
    paymentProvider: 'none',
    paymentApiKeys: { stripe: '', paypal: '', square: '', authorizeNet: '' },
    shippingProvider: 'none',
    shippingFlatRate: 0,
    shippingApiKeys: { fedex: '', ups: '', usps: '' },
    footerQuickLinks: [],
    siteBackgroundColor: '#0f172a',
    siteTextColor: '#d1d5db',
    siteAccentColor: '#38bdf8',
    siteBackgroundImageUrl: '',
    siteBackgroundOpacity: 100,
};

export const AdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [galleryImages, setGalleryImages] = useState<Record<string, GalleryImage[]>>({});
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(initialSiteSettings);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [productsData, galleriesData, staffData, reviewsData, servicesData, pagesData, menusData, settingsData] = await Promise.all([
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
      } catch (error) {
        console.error("Failed to load initial site data", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const login = (password: string): boolean => {
    if (password === ADMIN_PASSWORD) {
      setIsAdminAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAdminAuthenticated(false);
  };

  // Generic CRUD handlers
  const createCrudHandlers = <T extends { id: string }>(
    stateSetter: React.Dispatch<React.SetStateAction<T[]>>,
    api: { add: (d: Omit<T, 'id'>) => Promise<T>, update: (d: T) => Promise<T>, delete: (id: string) => Promise<void> }
  ) => ({
    add: async (data: Omit<T, 'id'>) => {
      const newItem = await api.add(data);
      stateSetter(prev => [...prev, newItem]);
      return newItem;
    },
    update: async (data: T) => {
      await api.update(data);
      stateSetter(prev => prev.map(item => item.id === data.id ? data : item));
    },
    delete: async (id: string) => {
      await api.delete(id);
      stateSetter(prev => prev.filter(item => item.id !== id));
    },
  });

  const { add: addProduct, update: updateProduct, delete: deleteProduct } = createCrudHandlers(setProducts, mockApi);
  const { add: addStaff, update: updateStaff, delete: deleteStaff } = createCrudHandlers(setStaff, mockApi);
  const { add: addReview, update: updateReview, delete: deleteReview } = createCrudHandlers(setReviews, mockApi);
  const { add: addService, update: updateService, delete: deleteService } = createCrudHandlers(setServices, mockApi);
  const { add: addPage, update: updatePage, delete: deletePage } = createCrudHandlers(setPages, mockApi);
  const { update: updateMenu } = createCrudHandlers(setMenus, mockApi);

  // Gallery
  const addGallery = async (galleryData: Omit<Gallery, 'id'>) => {
    const newGallery = await mockApi.addGallery(galleryData);
    setGalleries(prev => [...prev, newGallery]);
  };
  const deleteGallery = async (galleryId: string) => {
    await mockApi.deleteGallery(galleryId);
    setGalleries(prev => prev.filter(g => g.id !== galleryId));
    setProducts(await mockApi.fetchProducts()); // Refresh products to unset galleryId
  };

  // Gallery Images
  const fetchGalleryImages = async (galleryId: string) => {
    const images = await mockApi.fetchGalleryImages(galleryId);
    setGalleryImages(prev => ({ ...prev, [galleryId]: images }));
  };
  const addGalleryImage = async (galleryId: string, imageData: Omit<GalleryImage, 'id'>) => {
    const newImage = await mockApi.addGalleryImage(galleryId, imageData);
    setGalleryImages(prev => ({ ...prev, [galleryId]: [...(prev[galleryId] || []), newImage] }));
  };
  const deleteGalleryImage = async (galleryId: string, imageId: string) => {
    await mockApi.deleteGalleryImage(galleryId, imageId);
    setGalleryImages(prev => ({ ...prev, [galleryId]: prev[galleryId].filter(img => img.id !== imageId) }));
  };
  
  // Site Settings
  const updateSiteSettings = async (newSettings: Partial<SiteSettings>) => {
      const updatedSettings = await mockApi.updateSiteSettings(newSettings);
      setSiteSettings(updatedSettings);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-slate-900">
        <Spinner />
      </div>
    );
  }

  return (
    <AdminContext.Provider value={{ 
        isAdminAuthenticated, login, logout,
        products, addProduct, updateProduct, deleteProduct,
        galleries, addGallery, deleteGallery,
        galleryImages, fetchGalleryImages, addGalleryImage, deleteGalleryImage,
        staff, addStaff, updateStaff, deleteStaff,
        reviews, addReview, updateReview, deleteReview,
        services, addService, updateService, deleteService,
        pages, addPage, updatePage, deletePage,
        menus, updateMenu,
        siteSettings,
        updateSiteSettings
    }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
