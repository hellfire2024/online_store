import { Router } from 'express';

// Lightweight demo data so the API responds even without a DB.
const products = [
  { id: 'p-1', name: 'Classic Cotton T-Shirt', price: 25, description: 'Premium cotton tee', imageUrl: 'https://picsum.photos/seed/tshirt/400/400', inventory: 42 },
  { id: 'p-2', name: 'Cozy Ceramic Mug', price: 15.5, description: '11oz ceramic mug', imageUrl: 'https://picsum.photos/seed/mug/400/400', inventory: 120 },
  { id: 'p-3', name: 'Premium Hoodie', price: 55, description: 'Fleece-lined hoodie', imageUrl: 'https://picsum.photos/seed/hoodie/400/400', inventory: 30 },
];

const services = [
  { id: 'svc-1', title: 'Custom Embroidery', description: 'Logos and monograms', icon: 'needle' },
  { id: 'svc-2', title: 'Screen Printing', description: 'Vibrant multi-color prints', icon: 'shirt' },
  { id: 'svc-3', title: 'Design Assist', description: 'We help finalize your art', icon: 'sparkles' },
];

const galleries = [
  { id: 'g-patterns', name: 'Abstract Patterns' },
  { id: 'g-art', name: 'Artistic Designs' },
];

const galleryImages: Record<string, Array<{ id: string; name: string; imageUrl: string }>> = {
  'g-patterns': [
    { id: 'gi-1', name: 'Geometric Fade', imageUrl: 'https://picsum.photos/seed/pattern1/600/600' },
    { id: 'gi-2', name: 'Pastel Waves', imageUrl: 'https://picsum.photos/seed/pattern2/600/600' },
  ],
  'g-art': [
    { id: 'gi-3', name: 'Brush Strokes', imageUrl: 'https://picsum.photos/seed/art1/600/600' },
    { id: 'gi-4', name: 'Ink Bloom', imageUrl: 'https://picsum.photos/seed/art2/600/600' },
  ],
};

const pages = [
  { id: 'home', title: 'Home', path: '/', page_type: 'home', content_data: {}, content: '<h1>Welcome to Custom Threads</h1>' },
  { id: 'about', title: 'About', path: '/about', page_type: 'about', content_data: {}, content: '<p>About our shop</p>' },
  { id: 'contact', title: 'Contact', path: '/contact', page_type: 'contact', content_data: {}, content: '<p>Contact us at hello@example.com</p>' },
];

const siteSettings = {
  heroTitle: 'Custom apparel, fast.',
  heroSubtitle: 'Design, print, and ship with ease.',
  footerColumns: [],
  footerSocialLinks: [],
  menus: [],
};

const customers = [
  { id: 'c-1', name: 'Demo Customer', email: 'customer@example.com', phone: '555-000-0000', isActive: true },
];

const adminUsers = [
  { id: 'a-1', username: 'admin', email: 'admin@example.com', role: 'super_admin', isActive: true },
];

const router = Router();

// Health
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', demo: true, timestamp: new Date().toISOString() });
});

router.get('/products', (_req, res) => res.json(products));
router.get('/customers', (_req, res) => res.json(customers));
router.get('/admin-users', (_req, res) => res.json(adminUsers));
router.get('/orders', (_req, res) => res.json([]));
router.get('/galleries', (_req, res) => res.json(galleries));
router.get('/galleries/:id/images', (req, res) => res.json(galleryImages[req.params.id] || []));
router.get('/pages', (_req, res) => res.json(pages));
router.get('/reviews', (_req, res) => res.json([]));
router.get('/staff', (_req, res) => res.json([]));
router.get('/services', (_req, res) => res.json(services));
router.get('/settings', (_req, res) => res.json(siteSettings));

// Auth demo endpoints
router.post('/auth/admin/login', (_req, res) => {
  const admin = adminUsers[0];
  return res.json({ token: 'demo-admin-token', admin });
});

router.post('/auth/customer/login', (_req, res) => {
  const customer = customers[0];
  return res.json({ token: 'demo-customer-token', customer });
});

router.post('/auth/customer/register', (req, res) => {
  const { name, email } = req.body || {};
  const id = `c-${customers.length + 1}`;
  const customer = { id, name: name || 'New Customer', email: email || 'user@example.com', phone: '555-000-0000', isActive: true };
  customers.push(customer);
  return res.status(201).json({ token: 'demo-customer-token', customer });
});

export default router;