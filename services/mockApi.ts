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
} from "../types";

let mockProducts: Product[] = [
  {
    id: "1",
    name: "Classic Cotton T-Shirt",
    price: 25.0,
    description:
      "A timeless, comfortable t-shirt made from 100% premium cotton.",
    imageUrl: "https://picsum.photos/seed/tshirt/400/400",
    inventory: 100,
    customizable: true,
    galleryId: "g-patterns",
  },
  {
    id: "2",
    name: "Cozy Ceramic Mug",
    price: 15.5,
    description: "Start your day right with a personalized 11oz ceramic mug.",
    imageUrl: "https://picsum.photos/seed/mug/400/400",
    inventory: 200,
    customizable: true,
    galleryId: "g-art",
  },
  {
    id: "3",
    name: "Durable Canvas Tote Bag",
    price: 32.0,
    description:
      "An eco-friendly and stylish tote bag, ready for your custom artwork.",
    imageUrl: "https://picsum.photos/seed/tote/400/400",
    inventory: 50,
    customizable: true,
    galleryId: "g-patterns",
  },
  {
    id: "4",
    name: "Snapback Baseball Cap",
    price: 28.75,
    description: "A modern snapback cap with a flat brim.",
    imageUrl: "https://picsum.photos/seed/cap/400/400",
    inventory: 80,
    customizable: true,
    galleryId: "g-art",
  },
  {
    id: "5",
    name: "Premium Hoodie",
    price: 55.0,
    description: "Stay warm and stylish with our premium fleece hoodie.",
    imageUrl: "https://picsum.photos/seed/hoodie/400/400",
    inventory: 60,
    customizable: true,
    galleryId: "g-patterns",
  },
  {
    id: "6",
    name: "Stainless Steel Water Bottle",
    price: 29.99,
    description: "A 20oz insulated water bottle that keeps drinks cold.",
    imageUrl: "https://picsum.photos/seed/bottle/400/400",
    inventory: 120,
    customizable: true,
    galleryId: "g-art",
  },
];

let mockGalleries: Gallery[] = [
  { id: "g-patterns", name: "Abstract Patterns" },
  { id: "g-art", name: "Artistic Designs" },
];

let mockGalleryImages: Record<string, GalleryImage[]> = {
  "g-patterns": [
    {
      id: "g1",
      name: "Abstract Waves",
      imageUrl: "https://picsum.photos/seed/wave/500/500",
    },
    {
      id: "g2",
      name: "Geometric Sun",
      imageUrl: "https://picsum.photos/seed/sun/500/500",
    },
    {
      id: "g4",
      name: "Vintage Floral",
      imageUrl: "https://picsum.photos/seed/floral/500/500",
    },
  ],
  "g-art": [
    {
      id: "g3",
      name: "Cyberpunk City",
      imageUrl: "https://picsum.photos/seed/city/500/500",
    },
    {
      id: "g5",
      name: "Minimalist Mountain",
      imageUrl: "https://picsum.photos/seed/mountain/500/500",
    },
    {
      id: "g6",
      name: "Cosmic Cat",
      imageUrl: "https://picsum.photos/seed/cat/500/500",
    },
  ],
};

let mockStaff: StaffMember[] = [
  {
    id: "s1",
    name: "Jane Doe",
    role: "Lead Designer",
    imageUrl: "https://picsum.photos/seed/jane/300/300",
  },
  {
    id: "s2",
    name: "John Smith",
    role: "Production Manager",
    imageUrl: "https://picsum.photos/seed/john/300/300",
  },
  {
    id: "s3",
    name: "Alex Ray",
    role: "Customer Support",
    imageUrl: "https://picsum.photos/seed/alex/300/300",
  },
];

let mockReviews: Review[] = [
  {
    id: "r1",
    author: "Chris P.",
    text: "The quality of the t-shirt I ordered was amazing! The print was crisp and has held up after multiple washes.",
    rating: 5,
  },
  {
    id: "r2",
    author: "Samantha B.",
    text: "My custom mug is my new favorite. The design process was so easy and it arrived quickly.",
    rating: 5,
  },
  {
    id: "r3",
    author: "Mike T.",
    text: "Great service and a fantastic product. The hoodie is super comfortable.",
    rating: 4,
  },
];

let mockServices: Service[] = [
  {
    id: "serv1",
    title: "Direct to Garment (DTG)",
    description:
      "High-resolution, full-color prints perfect for detailed designs and photos on t-shirts and hoodies.",
    icon: "shirt",
  },
  {
    id: "serv2",
    title: "Embroidery",
    description:
      "Durable and professional stitching for logos and text on hats, polos, and jackets.",
    icon: "award",
  },
  {
    id: "serv3",
    title: "Mug & Drinkware Printing",
    description:
      "Vibrant, long-lasting prints on a variety of ceramic and metal drinkware.",
    icon: "coffee",
  },
];

let mockPages: Page[] = [
  {
    id: "page_1",
    path: "/shipping-policy",
    title: "Shipping Policy",
    content:
      "<h1>Our Shipping Policy</h1><p>We ship worldwide! Please allow 3-5 business days for production before your order is shipped.</p>",
  },
  {
    id: "page_2",
    path: "/returns",
    title: "Returns & Exchanges",
    content:
      "<h1>Returns & Exchanges</h1><p>We accept returns within 30 days of purchase. Please contact our support team to initiate a return.</p>",
  },
];

let mockMenus: Menu[] = [
  {
    id: "menu_header",
    name: "Header",
    items: [
      { id: "h1", text: "Home", url: "/" },
      { id: "h2", text: "Store", url: "/store" },
      { id: "h3", text: "About", url: "/about" },
      { id: "h4", text: "Contact", url: "/contact" },
    ],
  },
  {
    id: "menu_footer",
    name: "Footer Quick Links",
    items: [
      { id: "f1", text: "Store", url: "/store" },
      { id: "f2", text: "About Us", url: "/about" },
      { id: "f3", text: "Contact", url: "/contact" },
      { id: "f4", text: "My Account", url: "/login" },
    ],
  },
];

let mockSiteSettings: SiteSettings = {
  logoText: "Custom",
  logoTextAccent: "Threads",
  headerLogoUrl: "",
  heroTitle: "Your Vision, Our Fabric",
  heroSubtitle:
    "Create one-of-a-kind products with your own designs. High-quality printing on premium materials.",
  heroBackgroundImageUrl: "https://picsum.photos/seed/hero/1200/800",
  footerSocialLinks: [
    { id: "fsl1", text: "Facebook", url: "#" },
    { id: "fsl2", text: "Instagram", url: "#" },
    { id: "fsl3", text: "Twitter", url: "#" },
  ],
  footerContactEmail: "support@customthreads.com",
  footerContactPhone: "(123) 456-7890",
  footerContactAddress: "123 Design Lane, Creativity City",
  aboutPageContent: `<h1>About Us</h1><p>Welcome to Custom Threads, where creativity meets quality. We were founded on a simple idea: everyone should be able to wear their imagination. Whether you're an artist, a small business owner, or just someone with a brilliant idea, our platform is designed to bring your vision to life.</p><p>Our mission is to provide high-quality, customizable products that you can be proud of. We use state-of-the-art printing technology and source only the best materials to ensure your designs look fantastic and last long. From t-shirts and hoodies to mugs and tote bags, we offer a wide range of canvases for your creativity.</p><p>We believe in the power of self-expression and are committed to making the custom design process as easy and enjoyable as possible. Thank you for choosing Custom Threads to be a part of your creative journey.</p>`,
  paymentProvider: "none",
  paymentApiKeys: {
    stripe: "",
    paypal: "",
    square: "",
    authorizeNet: "",
  },
  shippingProvider: "flatRate",
  shippingFlatRate: 5.0,
  shippingApiKeys: {
    fedex: "",
    ups: "",
    usps: "",
  },
  footerQuickLinks: [], // This will be populated from menus
  siteBackgroundColor: "#0f172a", // slate-900
  siteTextColor: "#d1d5db", // gray-300
  siteAccentColor: "#38bdf8", // sky-400
  siteBackgroundImageUrl: "",
  siteBackgroundOpacity: 100,
};

const apiDelay = 200;

// Generic CRUD helpers
const createCrud = <T extends { id: string }>(mockData: T[]) => ({
  fetch: (): Promise<T[]> =>
    new Promise((res) => setTimeout(() => res([...mockData]), apiDelay)),
  add: (itemData: Omit<T, "id">): Promise<T> =>
    new Promise((res) => {
      setTimeout(() => {
        const newItem = {
          ...itemData,
          id: `${Math.random().toString(36).substr(2, 9)}`,
        } as T;
        mockData.push(newItem);
        res(newItem);
      }, apiDelay);
    }),
  update: (updatedItem: T): Promise<T> =>
    new Promise((res) => {
      setTimeout(() => {
        mockData = mockData.map((item) =>
          item.id === updatedItem.id ? updatedItem : item,
        );
        res(updatedItem);
      }, apiDelay);
    }),
  delete: (itemId: string): Promise<void> =>
    new Promise((res) => {
      setTimeout(() => {
        mockData = mockData.filter((item) => item.id !== itemId);
        res();
      }, apiDelay);
    }),
});

export const {
  fetch: fetchProducts,
  add: addProduct,
  update: updateProduct,
  delete: deleteProduct,
} = createCrud<Product>(mockProducts);
export const {
  fetch: fetchStaff,
  add: addStaff,
  update: updateStaff,
  delete: deleteStaff,
} = createCrud<StaffMember>(mockStaff);
export const {
  fetch: fetchReviews,
  add: addReview,
  update: updateReview,
  delete: deleteReview,
} = createCrud<Review>(mockReviews);
export const {
  fetch: fetchServices,
  add: addService,
  update: updateService,
  delete: deleteService,
} = createCrud<Service>(mockServices);
export const {
  fetch: fetchPages,
  add: addPage,
  update: updatePage,
  delete: deletePage,
} = createCrud<Page>(mockPages);
export const { fetch: fetchMenus, update: updateMenu } =
  createCrud<Menu>(mockMenus);

// Gallery CRUD
export const fetchGalleries = (): Promise<Gallery[]> =>
  new Promise((res) => setTimeout(() => res([...mockGalleries]), apiDelay));
export const addGallery = (
  galleryData: Omit<Gallery, "id">,
): Promise<Gallery> =>
  new Promise((res) => {
    setTimeout(() => {
      const newGallery = { ...galleryData, id: `g_${Date.now()}` };
      mockGalleries.push(newGallery);
      mockGalleryImages[newGallery.id] = [];
      res(newGallery);
    }, apiDelay);
  });
export const deleteGallery = (galleryId: string): Promise<void> =>
  new Promise((res) => {
    setTimeout(() => {
      mockGalleries = mockGalleries.filter((g) => g.id !== galleryId);
      delete mockGalleryImages[galleryId];
      mockProducts = mockProducts.map((p) =>
        p.galleryId === galleryId ? { ...p, galleryId: undefined } : p,
      );
      res();
    }, apiDelay);
  });

// Gallery Image CRUD
export const fetchGalleryImages = (
  galleryId: string,
): Promise<GalleryImage[]> =>
  new Promise((res) =>
    setTimeout(() => res([...(mockGalleryImages[galleryId] || [])]), apiDelay),
  );
export const addGalleryImage = (
  galleryId: string,
  imageData: Omit<GalleryImage, "id">,
): Promise<GalleryImage> =>
  new Promise((res) => {
    setTimeout(() => {
      const newImage = { ...imageData, id: `gal_img_${Date.now()}` };
      if (!mockGalleryImages[galleryId]) mockGalleryImages[galleryId] = [];
      mockGalleryImages[galleryId].push(newImage);
      res(newImage);
    }, apiDelay);
  });
export const deleteGalleryImage = (
  galleryId: string,
  imageId: string,
): Promise<void> =>
  new Promise((res) => {
    setTimeout(() => {
      if (mockGalleryImages[galleryId]) {
        mockGalleryImages[galleryId] = mockGalleryImages[galleryId].filter(
          (img) => img.id !== imageId,
        );
      }
      res();
    }, apiDelay);
  });

// Site Settings
export const fetchSiteSettings = (): Promise<SiteSettings> =>
  new Promise((res) =>
    setTimeout(() => res({ ...mockSiteSettings }), apiDelay),
  );
export const updateSiteSettings = (
  newSettings: Partial<SiteSettings>,
): Promise<SiteSettings> =>
  new Promise((res) => {
    setTimeout(() => {
      mockSiteSettings = { ...mockSiteSettings, ...newSettings };
      res({ ...mockSiteSettings });
    }, apiDelay);
  });
