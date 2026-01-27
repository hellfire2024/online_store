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
    lowStockThreshold: 20,
    optionLists: [
      {
        id: "list-size",
        name: "Size",
        required: true,
        order: 1,
        options: [
          { id: "opt-xs", name: "XS", priceDelta: 0, order: 1 },
          { id: "opt-s", name: "S", priceDelta: 0, order: 2 },
          { id: "opt-m", name: "M", priceDelta: 0, order: 3 },
          { id: "opt-l", name: "L", priceDelta: 0, order: 4 },
          { id: "opt-xl", name: "XL", priceDelta: 2, order: 5 },
          { id: "opt-xxl", name: "XXL", priceDelta: 3, order: 6 },
        ],
      },
      {
        id: "list-quality",
        name: "Quality",
        required: false,
        order: 2,
        options: [
          { id: "opt-tee-standard", name: "Standard", priceDelta: 0, order: 1 },
          { id: "opt-tee-premium", name: "Premium", priceDelta: 5, order: 2 },
        ],
      },
    ],
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
    lowStockThreshold: 30,
    optionLists: [
      {
        id: "list-size-mug",
        name: "Size",
        required: true,
        order: 1,
        options: [
          { id: "opt-mug-11oz", name: "11oz", priceDelta: 0, order: 1 },
          { id: "opt-mug-15oz", name: "15oz", priceDelta: 3, order: 2 },
        ],
      },
    ],
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
    lowStockThreshold: 10,
    optionLists: [
      {
        id: "list-style-tote",
        name: "Style",
        required: true,
        order: 1,
        options: [
          { id: "opt-tote-standard", name: "Standard", priceDelta: 0, order: 1 },
          { id: "opt-tote-zip", name: "With Zipper", priceDelta: 4, order: 2 },
        ],
      },
    ],
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
    lowStockThreshold: 15,
    optionLists: [
      {
        id: "list-style-cap",
        name: "Brim Style",
        required: true,
        order: 1,
        options: [
          { id: "opt-cap-flat", name: "Flat Brim", priceDelta: 0, order: 1 },
          { id: "opt-cap-curve", name: "Curved Brim", priceDelta: 2, order: 2 },
        ],
      },
    ],
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
    lowStockThreshold: 12,
    optionLists: [
      {
        id: "list-size-hoodie",
        name: "Size",
        required: true,
        order: 1,
        options: [
          { id: "opt-s", name: "S", priceDelta: 0, order: 1 },
          { id: "opt-m", name: "M", priceDelta: 0, order: 2 },
          { id: "opt-l", name: "L", priceDelta: 0, order: 3 },
          { id: "opt-xl", name: "XL", priceDelta: 3, order: 4 },
          { id: "opt-xxl", name: "XXL", priceDelta: 5, order: 5 },
        ],
      },
      {
        id: "list-style-hoodie",
        name: "Style",
        required: true,
        order: 2,
        options: [
          { id: "opt-hoodie-pullover", name: "Pullover", priceDelta: 0, order: 1 },
          { id: "opt-hoodie-zip", name: "Zip-Up", priceDelta: 6, order: 2 },
        ],
      },
      {
        id: "list-weight-hoodie",
        name: "Weight",
        required: false,
        order: 3,
        options: [
          { id: "opt-hoodie-standard", name: "Standard", priceDelta: 0, order: 1 },
          { id: "opt-hoodie-heavy", name: "Heavyweight", priceDelta: 10, order: 2 },
        ],
      },
    ],
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
    lowStockThreshold: 25,
    optionLists: [
      {
        id: "list-size-bottle",
        name: "Size",
        required: true,
        order: 1,
        options: [
          { id: "opt-bottle-20oz", name: "20oz", priceDelta: 0, order: 1 },
          { id: "opt-bottle-32oz", name: "32oz", priceDelta: 5, order: 2 },
        ],
      },
    ],
  }
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
    email: "chris@example.com",
    text: "The quality of the t-shirt I ordered was amazing! The print was crisp and has held up after multiple washes.",
    rating: 5,
    status: "approved",
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    approvedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "r2",
    author: "Samantha B.",
    email: "samantha@example.com",
    text: "My custom mug is my new favorite. The design process was so easy and it arrived quickly.",
    rating: 5,
    status: "approved",
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    approvedAt: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "r3",
    author: "Mike T.",
    email: "mike@example.com",
    text: "Great service and a fantastic product. The hoodie is super comfortable.",
    rating: 4,
    status: "approved",
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    approvedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "r4",
    author: "Sarah L.",
    email: "sarah@example.com",
    text: "Excellent quality and fast shipping!",
    rating: 5,
    status: "pending",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
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
  siteTitle: "Custom Threads Online Store",
  faviconUrl: "/favicon.svg",
  footerConfig: {
    columns: [
      { id: "left", items: [] },
      { id: "center", items: [] },
      { id: "right", items: [] },
    ],
  },
  footerSocialLinks: [
    { id: "fsl1", text: "Facebook", url: "#" },
    { id: "fsl2", text: "Instagram", url: "#" },
    { id: "fsl3", text: "Twitter", url: "#" },
  ],
  footerContactEmail: "support@customthreads.com",
  footerContactPhone: "(123) 456-7890",
  footerContactAddress: "123 Design Lane, Creativity City",
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
  siteBackgroundColor: "#0f172a", // slate-900
  siteTextColor: "#d1d5db", // gray-300
  siteAccentColor: "#38bdf8", // sky-400
  siteBackgroundImageUrl: "https://picsum.photos/seed/hero/1200/800",
  siteBackgroundOpacity: 100,
  maxReviewsDisplayed: 5,
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
