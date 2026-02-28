import { Router } from "express";

// Lightweight demo data so the API responds even without a DB.
const products = [
  {
    id: "p-1",
    name: "Classic Cotton T-Shirt",
    price: 25,
    description: "Premium cotton tee",
    imageUrl: "https://picsum.photos/seed/tshirt/400/400",
    inventory: 42,
  },
  {
    id: "p-2",
    name: "Cozy Ceramic Mug",
    price: 15.5,
    description: "11oz ceramic mug",
    imageUrl: "https://picsum.photos/seed/mug/400/400",
    inventory: 120,
  },
  {
    id: "p-3",
    name: "Premium Hoodie",
    price: 55,
    description: "Fleece-lined hoodie",
    imageUrl: "https://picsum.photos/seed/hoodie/400/400",
    inventory: 30,
  },
];

const services = [
  {
    id: "svc-1",
    title: "Custom Embroidery",
    description: "Logos and monograms",
    icon: "needle",
  },
  {
    id: "svc-2",
    title: "Screen Printing",
    description: "Vibrant multi-color prints",
    icon: "shirt",
  },
  {
    id: "svc-3",
    title: "Design Assist",
    description: "We help finalize your art",
    icon: "sparkles",
  },
];

const galleries = [
  { id: "g-patterns", name: "Abstract Patterns" },
  { id: "g-art", name: "Artistic Designs" },
];

const galleryImages: Record<
  string,
  Array<{ id: string; name: string; imageUrl: string }>
> = {
  "g-patterns": [
    {
      id: "gi-1",
      name: "Geometric Fade",
      imageUrl: "https://picsum.photos/seed/pattern1/600/600",
    },
    {
      id: "gi-2",
      name: "Pastel Waves",
      imageUrl: "https://picsum.photos/seed/pattern2/600/600",
    },
  ],
  "g-art": [
    {
      id: "gi-3",
      name: "Brush Strokes",
      imageUrl: "https://picsum.photos/seed/art1/600/600",
    },
    {
      id: "gi-4",
      name: "Ink Bloom",
      imageUrl: "https://picsum.photos/seed/art2/600/600",
    },
  ],
};

const pages = [
  {
    id: "home",
    title: "Home",
    path: "/",
    page_type: "home",
    content_data: {},
    content: "<h1>Welcome to Custom Threads</h1>",
  },
  {
    id: "about",
    title: "About",
    path: "/about",
    page_type: "about",
    content_data: {},
    content: "<p>About our shop</p>",
  },
  {
    id: "contact",
    title: "Contact",
    path: "/contact",
    page_type: "contact",
    content_data: {},
    content: "<p>Contact us at hello@example.com</p>",
  },
];

// Demo orders storage for checkout flow
const orders: any[] = [];

// Demo tax configuration - realistic US state tax rates
const taxRules = [
  {
    id: "tax-ca",
    name: "California Sales Tax",
    states: ["CA"],
    taxRate: 8.625,
    exemptedProductIds: [],
    enabled: true,
    priority: 100,
  },
  {
    id: "tax-ny",
    name: "New York Sales Tax",
    states: ["NY"],
    taxRate: 8.875,
    exemptedProductIds: [],
    enabled: true,
    priority: 100,
  },
  {
    id: "tax-tx",
    name: "Texas Sales Tax",
    states: ["TX"],
    taxRate: 8.25,
    exemptedProductIds: [],
    enabled: true,
    priority: 100,
  },
  {
    id: "tax-fl",
    name: "Florida Sales Tax",
    states: ["FL"],
    taxRate: 7.0,
    exemptedProductIds: [],
    enabled: true,
    priority: 100,
  },
  {
    id: "tax-wa",
    name: "Washington Sales Tax",
    states: ["WA"],
    taxRate: 10.25,
    exemptedProductIds: [],
    enabled: true,
    priority: 100,
  },
  {
    id: "tax-or",
    name: "Oregon (No Sales Tax)",
    states: ["OR"],
    taxRate: 0,
    exemptedProductIds: [],
    enabled: true,
    priority: 100,
  },
];

const siteSettings = {
  logoText: "Custom",
  logoTextAccent: "Threads",
  siteTitle: "Custom Threads Online Store",
  faviconUrl: "/favicon.svg",
  footerSocialLinks: [],
  footerContactEmail: "hello@customthreads.com",
  footerContactPhone: "1-800-THREADS",
  footerContactAddress: "123 Main St, Anytown, USA",
  paymentProvider: "none",
  paymentApiKeys: { stripe: "", paypal: "", square: "", authorizeNet: "" },
  shippingProvider: "flatRate",
  shippingFlatRate: 5.0,
  shippingApiKeys: { fedex: "", ups: "", usps: "" },
  taxConfig: {
    enableTaxCollection: true,
    provider: "stripe",
    defaultTaxRate: 8.0,
    credentials: {
      stripeApiKey: "",
    },
    taxIncludedInPrice: false,
    rules: taxRules,
  },
  siteBackgroundColor: "",
  siteTextColor: "",
  siteAccentColor: "",
  siteBackgroundImageUrl: "https://picsum.photos/seed/hero/1200/800",
  siteBackgroundOpacity: 100,
  maxReviewsDisplayed: 10,
  apiBaseUrl: "/api",
  demo_mode: true,
};

const customers = [
  {
    id: "c-1",
    name: "Sarah Johnson",
    firstName: "Sarah",
    lastName: "Johnson",
    email: "customer@example.com",
    phone: "555-123-4567",
    isActive: true,
    createdAt: "2024-01-15T10:00:00Z",
    lastLogin: "2026-01-25T14:30:00Z",
    orderCount: 8,
    totalSpent: 2847.92,
    averageOrderValue: 355.99,
    lastOrderDate: "2026-01-20T09:15:00Z",
    emailPreferences: {
      marketing: true,
      orderUpdates: true,
      announcements: false,
    },
    addresses: [
      {
        id: "addr-1",
        fullName: "Sarah Johnson",
        streetAddress: "123 Main Street",
        city: "San Francisco",
        state: "CA",
        zipCode: "94102",
        phone: "555-123-4567",
        isDefault: true,
      },
    ],
    orders: [
      {
        id: "order-1",
        orderNumber: "AGIS-0000001234",
        date: "2026-01-20T09:15:00Z",
        subtotal: 270.0,
        shippingCost: 10.0,
        taxAmount: 24.3,
        total: 304.3,
        status: "delivered",
        trackingNumber: "TRK1234567890",
        shippingAddress: {
          id: "addr-1",
          fullName: "Sarah Johnson",
          streetAddress: "123 Main Street",
          city: "San Francisco",
          state: "CA",
          zipCode: "94102",
          phone: "555-123-4567",
          isDefault: true,
        },
        items: [
          {
            product: {
              id: "p-1",
              name: "Premium Cotton T-Shirt",
              price: 45.0,
              imageUrl: "/images/tshirt.jpg",
              category: "Apparel",
              stock: 100,
            },
            quantity: 3,
          },
          {
            product: {
              id: "p-2",
              name: "Classic Denim Jeans",
              price: 85.0,
              imageUrl: "/images/jeans.jpg",
              category: "Apparel",
              stock: 50,
            },
            quantity: 1,
          },
          {
            product: {
              id: "p-3",
              name: "Leather Wallet",
              price: 40.0,
              imageUrl: "/images/wallet.jpg",
              category: "Accessories",
              stock: 75,
            },
            quantity: 1,
          },
        ],
      },
      {
        id: "order-2",
        orderNumber: "AGIS-0000001198",
        date: "2026-01-15T14:22:00Z",
        subtotal: 125.0,
        shippingCost: 8.0,
        taxAmount: 11.25,
        total: 144.25,
        status: "shipped",
        trackingNumber: "TRK9876543210",
        shippingAddress: {
          id: "addr-1",
          fullName: "Sarah Johnson",
          streetAddress: "123 Main Street",
          city: "San Francisco",
          state: "CA",
          zipCode: "94102",
          phone: "555-123-4567",
          isDefault: true,
        },
        items: [
          {
            product: {
              id: "p-4",
              name: "Canvas Sneakers",
              price: 65.0,
              imageUrl: "/images/sneakers.jpg",
              category: "Footwear",
              stock: 40,
            },
            quantity: 1,
          },
          {
            product: {
              id: "p-5",
              name: "Baseball Cap",
              price: 30.0,
              imageUrl: "/images/cap.jpg",
              category: "Accessories",
              stock: 120,
            },
            quantity: 2,
          },
        ],
      },
      {
        id: "order-3",
        orderNumber: "AGIS-0000001167",
        date: "2026-01-10T11:05:00Z",
        subtotal: 450.0,
        shippingCost: 15.0,
        taxAmount: 40.5,
        total: 505.5,
        status: "delivered",
        shippingAddress: {
          id: "addr-1",
          fullName: "Sarah Johnson",
          streetAddress: "123 Main Street",
          city: "San Francisco",
          state: "CA",
          zipCode: "94102",
          phone: "555-123-4567",
          isDefault: true,
        },
        items: [
          {
            product: {
              id: "p-6",
              name: "Winter Jacket",
              price: 150.0,
              imageUrl: "/images/jacket.jpg",
              category: "Outerwear",
              stock: 25,
            },
            quantity: 1,
          },
          {
            product: {
              id: "p-7",
              name: "Wool Scarf",
              price: 35.0,
              imageUrl: "/images/scarf.jpg",
              category: "Accessories",
              stock: 60,
            },
            quantity: 2,
          },
          {
            product: {
              id: "p-8",
              name: "Leather Gloves",
              price: 55.0,
              imageUrl: "/images/gloves.jpg",
              category: "Accessories",
              stock: 45,
            },
            quantity: 2,
          },
          {
            product: {
              id: "p-9",
              name: "Beanie Hat",
              price: 25.0,
              imageUrl: "/images/beanie.jpg",
              category: "Accessories",
              stock: 80,
            },
            quantity: 3,
          },
        ],
      },
      {
        id: "order-4",
        orderNumber: "AGIS-0000001142",
        date: "2026-01-05T16:30:00Z",
        subtotal: 199.99,
        shippingCost: 12.0,
        taxAmount: 18.0,
        total: 229.99,
        status: "delivered",
        shippingAddress: {
          id: "addr-1",
          fullName: "Sarah Johnson",
          streetAddress: "123 Main Street",
          city: "San Francisco",
          state: "CA",
          zipCode: "94102",
          phone: "555-123-4567",
          isDefault: true,
        },
        items: [
          {
            product: {
              id: "p-10",
              name: "Yoga Mat",
              price: 49.99,
              imageUrl: "/images/yoga-mat.jpg",
              category: "Fitness",
              stock: 90,
            },
            quantity: 1,
          },
          {
            product: {
              id: "p-11",
              name: "Water Bottle",
              price: 25.0,
              imageUrl: "/images/bottle.jpg",
              category: "Accessories",
              stock: 150,
            },
            quantity: 3,
          },
          {
            product: {
              id: "p-12",
              name: "Gym Bag",
              price: 75.0,
              imageUrl: "/images/gym-bag.jpg",
              category: "Bags",
              stock: 35,
            },
            quantity: 1,
          },
        ],
      },
      {
        id: "order-5",
        orderNumber: "AGIS-0000001089",
        date: "2025-12-28T10:45:00Z",
        subtotal: 320.0,
        shippingCost: 10.0,
        taxAmount: 28.8,
        total: 358.8,
        status: "processing",
        shippingAddress: {
          id: "addr-1",
          fullName: "Sarah Johnson",
          streetAddress: "123 Main Street",
          city: "San Francisco",
          state: "CA",
          zipCode: "94102",
          phone: "555-123-4567",
          isDefault: true,
        },
        items: [
          {
            product: {
              id: "p-13",
              name: "Running Shoes",
              price: 120.0,
              imageUrl: "/images/running-shoes.jpg",
              category: "Footwear",
              stock: 30,
            },
            quantity: 1,
          },
          {
            product: {
              id: "p-14",
              name: "Athletic Socks (3-pack)",
              price: 20.0,
              imageUrl: "/images/socks.jpg",
              category: "Apparel",
              stock: 200,
            },
            quantity: 5,
          },
          {
            product: {
              id: "p-15",
              name: "Sports Watch",
              price: 100.0,
              imageUrl: "/images/watch.jpg",
              category: "Accessories",
              stock: 20,
            },
            quantity: 1,
          },
        ],
      },
      {
        id: "order-6",
        orderNumber: "AGIS-0000001056",
        date: "2025-12-20T13:20:00Z",
        subtotal: 175.5,
        shippingCost: 8.0,
        taxAmount: 15.8,
        total: 199.3,
        status: "delivered",
        shippingAddress: {
          id: "addr-1",
          fullName: "Sarah Johnson",
          streetAddress: "123 Main Street",
          city: "San Francisco",
          state: "CA",
          zipCode: "94102",
          phone: "555-123-4567",
          isDefault: true,
        },
        items: [
          {
            product: {
              id: "p-16",
              name: "Sunglasses",
              price: 89.99,
              imageUrl: "/images/sunglasses.jpg",
              category: "Accessories",
              stock: 55,
            },
            quantity: 1,
          },
          {
            product: {
              id: "p-17",
              name: "Phone Case",
              price: 28.5,
              imageUrl: "/images/phone-case.jpg",
              category: "Tech",
              stock: 100,
            },
            quantity: 3,
          },
        ],
      },
      {
        id: "order-7",
        orderNumber: "AGIS-0000001023",
        date: "2025-12-12T09:10:00Z",
        subtotal: 540.0,
        shippingCost: 20.0,
        taxAmount: 48.6,
        total: 608.6,
        status: "delivered",
        shippingAddress: {
          id: "addr-1",
          fullName: "Sarah Johnson",
          streetAddress: "123 Main Street",
          city: "San Francisco",
          state: "CA",
          zipCode: "94102",
          phone: "555-123-4567",
          isDefault: true,
        },
        items: [
          {
            product: {
              id: "p-18",
              name: "Backpack",
              price: 95.0,
              imageUrl: "/images/backpack.jpg",
              category: "Bags",
              stock: 40,
            },
            quantity: 2,
          },
          {
            product: {
              id: "p-19",
              name: "Laptop Sleeve",
              price: 45.0,
              imageUrl: "/images/laptop-sleeve.jpg",
              category: "Tech",
              stock: 70,
            },
            quantity: 2,
          },
          {
            product: {
              id: "p-20",
              name: "Desk Organizer",
              price: 35.0,
              imageUrl: "/images/organizer.jpg",
              category: "Office",
              stock: 85,
            },
            quantity: 3,
          },
          {
            product: {
              id: "p-21",
              name: "Notebook Set",
              price: 22.5,
              imageUrl: "/images/notebooks.jpg",
              category: "Office",
              stock: 120,
            },
            quantity: 5,
          },
        ],
      },
      {
        id: "order-8",
        orderNumber: "AGIS-0000000998",
        date: "2025-12-05T15:55:00Z",
        subtotal: 88.0,
        shippingCost: 5.0,
        taxAmount: 7.92,
        total: 100.92,
        status: "cancelled",
        shippingAddress: {
          id: "addr-1",
          fullName: "Sarah Johnson",
          streetAddress: "123 Main Street",
          city: "San Francisco",
          state: "CA",
          zipCode: "94102",
          phone: "555-123-4567",
          isDefault: true,
        },
        items: [
          {
            product: {
              id: "p-22",
              name: "Coffee Mug",
              price: 18.0,
              imageUrl: "/images/mug.jpg",
              category: "Home",
              stock: 95,
            },
            quantity: 2,
          },
          {
            product: {
              id: "p-23",
              name: "Coasters Set",
              price: 12.0,
              imageUrl: "/images/coasters.jpg",
              category: "Home",
              stock: 110,
            },
            quantity: 1,
          },
          {
            product: {
              id: "p-24",
              name: "Keychain",
              price: 8.0,
              imageUrl: "/images/keychain.jpg",
              category: "Accessories",
              stock: 200,
            },
            quantity: 5,
          },
        ],
      },
    ],
  },
];

const adminUsers = [
  {
    id: "a-1",
    username: "admin",
    email: "admin@example.com",
    role: "super_admin",
    isActive: true,
  },
];

const router = Router();

// Health
router.get("/health", (_req, res) => {
  res.json({ status: "ok", demo: true, timestamp: new Date().toISOString() });
});

router.get("/products", (_req, res) => res.json(products));
router.get("/customers", (_req, res) => res.json(customers));
router.get("/customers/:id", (req, res) => {
  const customer = customers.find((c) => c.id === req.params.id);
  if (!customer) {
    return res.status(404).json({ error: "Customer not found" });
  }
  return res.json(customer);
});
router.delete("/customers/:id", (req, res) => {
  const index = customers.findIndex((c) => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Customer not found" });
  }
  customers.splice(index, 1);
  return res.json({ success: true, message: "Customer deleted" });
});
router.get("/admin-users", (_req, res) => res.json(adminUsers));

// Orders endpoints
router.post("/orders", (req, res) => {
  const orderData = req.body;
  // Store the order in the demo orders array
  orders.push(orderData);
  console.log("📝 Demo order created:", orderData.orderNumber);
  return res.status(201).json({
    success: true,
    orderNumber: orderData.orderNumber,
    message: "Order received",
    emailSent: false, // Demo mode doesn't send emails
  });
});

router.get("/orders", (_req, res) => res.json(orders));

router.get("/orders/:id", (req, res) => {
  // Support both numeric ID and orderNumber (AGIS-XXXXXXXXXX)
  const orderId = req.params.id;
  const order = orders.find(
    (o) => o.id === orderId || o.orderNumber === orderId,
  );
  
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  return res.json(order);
});

router.get("/galleries", (_req, res) => res.json(galleries));
router.get("/galleries/:id/images", (req, res) =>
  res.json(galleryImages[req.params.id] || []),
);
router.get("/pages", (_req, res) => res.json(pages));
router.get("/reviews", (_req, res) => res.json([]));
router.get("/staff", (_req, res) => res.json([]));
router.get("/services", (_req, res) => res.json(services));
router.get("/settings", (_req, res) => res.json(siteSettings));
router.put("/settings", (req, res) => {
  Object.assign(siteSettings, req.body);
  res.json(siteSettings);
});

// Auth demo endpoints
router.post("/auth/admin/login", (_req, res) => {
  const admin = adminUsers[0];
  return res.json({ token: "demo-admin-token", admin });
});

router.post("/auth/customer/login", (_req, res) => {
  const customer = customers[0];
  return res.json({ token: "demo-customer-token", customer });
});

router.post("/auth/customer/register", (req, res) => {
  const { name, email, firstName, lastName } = req.body || {};
  const id = `c-${customers.length + 1}`;
  const [fName, lName] = (name || "").split(" ");
  const customer = {
    id,
    name: name || "New Customer",
    firstName: firstName || fName || "New",
    lastName: lastName || lName || "Customer",
    email: email || "user@example.com",
    phone: "555-000-0000",
    isActive: true,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    orderCount: 0,
    totalSpent: 0,
    averageOrderValue: 0,
    lastOrderDate: "",
    emailPreferences: {
      marketing: true,
      orderUpdates: true,
      announcements: false,
    },
    addresses: [],
    orders: [],
  };
  customers.push(customer);
  return res.status(201).json({ token: "demo-customer-token", customer });
});

// Tax calculation demo endpoint
router.post("/tax/calculate", (req, res) => {
  const { cartItems, shippingCost, shippingState } = req.body || {};

  // Demo tax calculation (simplified)
  // In production, this would call Stripe Tax API
  const subtotal = (cartItems || []).reduce((sum: number, item: any) => {
    return sum + item.product.price * item.quantity;
  }, 0);

  // Simulate Stripe Tax calculation with demo rates
  const stateTaxRates: { [key: string]: number } = {
    CA: 8.625,
    NY: 8.875,
    TX: 8.25,
    FL: 7.0,
    WA: 10.25,
    OR: 0,
  };

  const taxRate = stateTaxRates[shippingState] || 8.0;
  const taxAmount = Math.round(((subtotal * taxRate) / 100) * 100) / 100;

  return res.json({
    subtotal,
    taxableAmount: subtotal,
    taxRate,
    taxAmount,
    total: subtotal + (shippingCost || 0) + taxAmount,
    stripeTaxTransactionId: `demo_calc_${Date.now()}`,
    usesFallback: false,
  });
});

// Tax provider demo endpoints
const calculateDemoTax = (
  cartItems: any[],
  shippingCost: number,
  shippingState: string,
) => {
  const subtotal = (cartItems || []).reduce((sum: number, item: any) => {
    return sum + item.product.price * item.quantity;
  }, 0);

  const stateTaxRates: { [key: string]: number } = {
    CA: 8.625,
    NY: 8.875,
    TX: 8.25,
    FL: 7.0,
    WA: 10.25,
    OR: 0,
  };

  const taxRate = stateTaxRates[shippingState] || 8.0;
  const taxAmount = Math.round(((subtotal * taxRate) / 100) * 100) / 100;

  return {
    subtotal,
    taxableAmount: subtotal,
    taxRate,
    taxAmount,
    total: subtotal + shippingCost + taxAmount,
  };
};

// Stripe Tax demo
router.post("/tax/providers/stripe", (req, res) => {
  const { cartItems, shippingCost, shippingState } = req.body || {};
  const result = calculateDemoTax(cartItems, shippingCost, shippingState);
  return res.json({ ...result, provider: "Stripe Tax" });
});

// TaxJar demo
router.post("/tax/providers/taxjar", (req, res) => {
  const { cartItems, shippingCost, shippingState } = req.body || {};
  const result = calculateDemoTax(cartItems, shippingCost, shippingState);
  return res.json({ ...result, provider: "TaxJar" });
});

// Avalara demo
router.post("/tax/providers/avalara", (req, res) => {
  const { cartItems, shippingCost, shippingState } = req.body || {};
  const result = calculateDemoTax(cartItems, shippingCost, shippingState);
  return res.json({ ...result, provider: "Avalara AvaTax" });
});

// TaxCloud demo
router.post("/tax/providers/taxcloud", (req, res) => {
  const { cartItems, shippingCost, shippingState } = req.body || {};
  const result = calculateDemoTax(cartItems, shippingCost, shippingState);
  return res.json({ ...result, provider: "TaxCloud" });
});

// Zamp demo
router.post("/tax/providers/zamp", (req, res) => {
  const { cartItems, shippingCost, shippingState } = req.body || {};
  const result = calculateDemoTax(cartItems, shippingCost, shippingState);
  return res.json({ ...result, provider: "Zamp" });
});

// Anrok demo
router.post("/tax/providers/anrok", (req, res) => {
  const { cartItems, shippingCost, shippingState } = req.body || {};
  const result = calculateDemoTax(cartItems, shippingCost, shippingState);
  return res.json({ ...result, provider: "Anrok" });
});

// Update handlers for demo mode persistence
router.post("/products", (req, res) => {
  const newProduct = { ...req.body, id: "p-" + Date.now() };
  products.push(newProduct);
  res.json(newProduct);
});

router.put("/products/:id", (req, res) => {
  const index = products.findIndex((p) => p.id === req.params.id);
  if (index !== -1) {
    products[index] = { ...products[index], ...req.body };
    res.json(products[index]);
  } else {
    res.status(404).json({ error: "Product not found" });
  }
});

router.delete("/products/:id", (req, res) => {
  const index = products.findIndex((p) => p.id === req.params.id);
  if (index !== -1) {
    products.splice(index, 1);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Product not found" });
  }
});

router.post("/pages", (req, res) => {
  const newPage = { ...req.body, id: "page-" + Date.now() };
  pages.push(newPage);
  res.json(newPage);
});

router.put("/pages/:id", (req, res) => {
  const index = pages.findIndex((p) => p.id === req.params.id);
  if (index !== -1) {
    pages[index] = { ...pages[index], ...req.body };
    res.json(pages[index]);
  } else {
    res.status(404).json({ error: "Page not found" });
  }
});

router.delete("/pages/:id", (req, res) => {
  const index = pages.findIndex((p) => p.id === req.params.id);
  if (index !== -1) {
    pages.splice(index, 1);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Page not found" });
  }
});

router.post("/galleries", (req, res) => {
  const newGallery = { ...req.body, id: "g-" + Date.now() };
  galleries.push(newGallery);
  res.json(newGallery);
});

router.put("/galleries/:id", (req, res) => {
  const index = galleries.findIndex((g) => g.id === req.params.id);
  if (index !== -1) {
    galleries[index] = { ...galleries[index], ...req.body };
    res.json(galleries[index]);
  } else {
    res.status(404).json({ error: "Gallery not found" });
  }
});

router.delete("/galleries/:id", (req, res) => {
  const index = galleries.findIndex((g) => g.id === req.params.id);
  if (index !== -1) {
    galleries.splice(index, 1);
    delete galleryImages[req.params.id];
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Gallery not found" });
  }
});

router.post("/galleries/:id/images", (req, res) => {
  if (!galleryImages[req.params.id]) {
    galleryImages[req.params.id] = [];
  }
  const newImage = { ...req.body, id: "gi-" + Date.now() };
  galleryImages[req.params.id].push(newImage);
  res.json(newImage);
});

router.put("/galleries/:id/images/:imageId", (req, res) => {
  const images = galleryImages[req.params.id];
  if (images) {
    const index = images.findIndex((img) => img.id === req.params.imageId);
    if (index !== -1) {
      images[index] = { ...images[index], ...req.body };
      res.json(images[index]);
    } else {
      res.status(404).json({ error: "Image not found" });
    }
  } else {
    res.status(404).json({ error: "Gallery not found" });
  }
});

router.delete("/galleries/:id/images/:imageId", (req, res) => {
  const images = galleryImages[req.params.id];
  if (images) {
    const index = images.findIndex((img) => img.id === req.params.imageId);
    if (index !== -1) {
      images.splice(index, 1);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Image not found" });
    }
  } else {
    res.status(404).json({ error: "Gallery not found" });
  }
});

router.post("/services", (req, res) => {
  const newService = { ...req.body, id: "svc-" + Date.now() };
  services.push(newService);
  res.json(newService);
});

router.put("/services/:id", (req, res) => {
  const index = services.findIndex((s) => s.id === req.params.id);
  if (index !== -1) {
    services[index] = { ...services[index], ...req.body };
    res.json(services[index]);
  } else {
    res.status(404).json({ error: "Service not found" });
  }
});

router.delete("/services/:id", (req, res) => {
  const index = services.findIndex((s) => s.id === req.params.id);
  if (index !== -1) {
    services.splice(index, 1);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Service not found" });
  }
});

export default router;
