import { pool } from "./connection.js";
export async function runMigrations() {
    console.log("🔄 Running database migrations...");
    const schema = `
-- ============================================
-- USERS & AUTHENTICATION
-- ============================================

CREATE TABLE IF NOT EXISTS admins (
  id VARCHAR(36) PRIMARY KEY,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(50),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('super_admin', 'admin', 'manager') NOT NULL DEFAULT 'admin',
  permissions JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  INDEX idx_email (email),
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE admins
  ADD COLUMN first_name VARCHAR(100),
  ADD COLUMN last_name VARCHAR(100),
  ADD COLUMN phone VARCHAR(50);

UPDATE admins
  SET first_name = CONCAT(UPPER(SUBSTRING(username, 1, 1)), LOWER(SUBSTRING(username, 2)))
  WHERE first_name IS NULL OR first_name = '';

CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(36) PRIMARY KEY,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email_preferences JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE customers
  ADD COLUMN first_name VARCHAR(255),
  ADD COLUMN last_name VARCHAR(255);

CREATE TABLE IF NOT EXISTS customer_addresses (
  id VARCHAR(36) PRIMARY KEY,
  customer_id VARCHAR(36) NOT NULL,
  type ENUM('shipping', 'billing') NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  full_name VARCHAR(255) NOT NULL,
  street_address VARCHAR(500) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  zip_code VARCHAR(20) NOT NULL,
  country VARCHAR(100) NOT NULL DEFAULT 'USA',
  phone VARCHAR(50),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  INDEX idx_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add first_name and last_name to existing customer_addresses table
ALTER TABLE customer_addresses 
  ADD COLUMN first_name VARCHAR(255),
  ADD COLUMN last_name VARCHAR(255);

-- ============================================
-- PRODUCTS & INVENTORY
-- ============================================

CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url LONGTEXT,
  inventory INT NOT NULL DEFAULT 0,
  low_stock_threshold INT DEFAULT 20,
  customizable BOOLEAN DEFAULT FALSE,
  enable_ai_ideas BOOLEAN DEFAULT FALSE,
  gallery_id VARCHAR(36),
  allow_custom_image_upload BOOLEAN DEFAULT FALSE,
  custom_image_upload_price DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_price (price)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Alter existing products table to use LONGTEXT for image_url
ALTER TABLE products
  MODIFY COLUMN image_url LONGTEXT;


ALTER TABLE products
  ADD COLUMN allow_custom_image_upload BOOLEAN DEFAULT FALSE,
  ADD COLUMN custom_image_upload_price DECIMAL(10,2) DEFAULT 0.00,
  ADD COLUMN package_weight DECIMAL(10,2) DEFAULT NULL,
  ADD COLUMN package_length DECIMAL(10,2) DEFAULT NULL,
  ADD COLUMN package_width DECIMAL(10,2) DEFAULT NULL,
  ADD COLUMN package_height DECIMAL(10,2) DEFAULT NULL,
  ADD COLUMN package_volume DECIMAL(10,2) DEFAULT NULL;

-- Clean up: Set custom_image_upload_price to NULL for products where feature is disabled
UPDATE products
  SET custom_image_upload_price = NULL
  WHERE allow_custom_image_upload = FALSE AND custom_image_upload_price = 0.00;

CREATE TABLE IF NOT EXISTS product_option_lists (
  id VARCHAR(36) PRIMARY KEY,
  product_id VARCHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  required BOOLEAN DEFAULT FALSE,
  max_selections INT NULL,
  list_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_options (
  id VARCHAR(36) PRIMARY KEY,
  list_id VARCHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  price_delta DECIMAL(10,2) DEFAULT 0.00,
  option_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (list_id) REFERENCES product_option_lists(id) ON DELETE CASCADE,
  INDEX idx_list (list_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ORDERS & SHOPPING
-- ============================================

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(36) PRIMARY KEY,
  customer_id VARCHAR(36),
  customer_email VARCHAR(255),
  customer_name VARCHAR(255),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  order_data LONGTEXT,
  total DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
  shipping_address_id VARCHAR(36),
  subtotal DECIMAL(10,2),
  tax_amount DECIMAL(10,2),
  shipping_cost DECIMAL(10,2),
  tracking_number VARCHAR(100),
  shipper VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (shipping_address_id) REFERENCES customer_addresses(id) ON DELETE SET NULL,
  INDEX idx_customer (customer_id),
  INDEX idx_shipping_address (shipping_address_id),
  INDEX idx_order_number (order_number),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE orders
  MODIFY COLUMN customer_id VARCHAR(36) NULL,
  ADD COLUMN customer_email VARCHAR(255),
  ADD COLUMN customer_name VARCHAR(255),
  ADD COLUMN order_data LONGTEXT,
  ADD COLUMN shipper VARCHAR(100);

CREATE TABLE IF NOT EXISTS order_items (
  id VARCHAR(36) PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL,
  product_id VARCHAR(36) NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  customization JSON,
  selected_options JSON,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  INDEX idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- GALLERIES & MEDIA
-- ============================================

CREATE TABLE IF NOT EXISTS galleries (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gallery_images (
  id VARCHAR(36) PRIMARY KEY,
  gallery_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  image_url LONGTEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE,
  INDEX idx_gallery (gallery_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Alter existing gallery_images table to use LONGTEXT for image_url
ALTER TABLE gallery_images
  MODIFY COLUMN image_url LONGTEXT;

-- ============================================
-- CONTENT MANAGEMENT
-- ============================================

CREATE TABLE IF NOT EXISTS pages (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  path VARCHAR(255) UNIQUE NOT NULL,
  page_type ENUM('home', 'about', 'contact', 'custom'),
  content_data JSON,
  content LONGTEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_path (path),
  INDEX idx_type (page_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS menus (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS menu_items (
  id VARCHAR(36) PRIMARY KEY,
  menu_id VARCHAR(36) NOT NULL,
  text VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  item_order INT DEFAULT 0,
  FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE,
  INDEX idx_menu (menu_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- REVIEWS & TESTIMONIALS
-- ============================================

CREATE TABLE IF NOT EXISTS reviews (
  id VARCHAR(36) PRIMARY KEY,
  author VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  text TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  status ENUM('pending', 'approved', 'rejected', 'archived') DEFAULT 'pending',
  rejection_reason TEXT,
  images JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP NULL,
  INDEX idx_status (status),
  INDEX idx_rating (rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE reviews
  ADD COLUMN images JSON;

-- ============================================
-- STAFF & SERVICES
-- ============================================

CREATE TABLE IF NOT EXISTS staff (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(255) NOT NULL,
  image_url LONGTEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Alter existing staff table to use LONGTEXT for image_url
ALTER TABLE staff
  MODIFY COLUMN image_url LONGTEXT;

CREATE TABLE IF NOT EXISTS services (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SITE SETTINGS
-- ============================================

CREATE TABLE IF NOT EXISTS site_settings (
  id INT PRIMARY KEY DEFAULT 1,
  settings JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- EMAIL CONFIGURATION (Encrypted Storage)
-- ============================================

CREATE TABLE IF NOT EXISTS email_config (
  id INT PRIMARY KEY DEFAULT 1,
  provider VARCHAR(50) NOT NULL DEFAULT 'none',
  from_email VARCHAR(255) NOT NULL,
  from_name VARCHAR(255) NOT NULL,
  smtp_host VARCHAR(255),
  smtp_port INT,
  smtp_secure BOOLEAN DEFAULT FALSE,
  smtp_username VARCHAR(255),
  smtp_password VARCHAR(500),
  sendgrid_api_key VARCHAR(500),
  mailgun_domain VARCHAR(255),
  mailgun_api_key VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SUPPORT TICKETS
-- ============================================

CREATE TABLE IF NOT EXISTS support_tickets (
  id VARCHAR(36) PRIMARY KEY,
  ticket_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id VARCHAR(36),
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  message TEXT NOT NULL,
  order_id VARCHAR(36),
  status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  INDEX idx_ticket_number (ticket_number),
  INDEX idx_customer (customer_id),
  INDEX idx_status (status),
  INDEX idx_priority (priority),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ticket_replies (
  id VARCHAR(36) PRIMARY KEY,
  ticket_id VARCHAR(36) NOT NULL,
  author ENUM('customer', 'support') NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
  INDEX idx_ticket (ticket_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;
    try {
      // Split schema by semicolons and execute each statement
      const statements = schema
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      for (const statement of statements) {
        await pool.query(statement);
      }
      // Run camelCase migration script
      const fs = await import('fs/promises');
      const path = await import('path');
      const camelCasePath = path.resolve(__dirname || path.dirname(new URL(import.meta.url).pathname), 'migrate_camelCase.sql');
      const camelCaseSql = await fs.readFile(camelCasePath, 'utf8');
      const camelCaseStatements = camelCaseSql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith('--'));
      for (const statement of camelCaseStatements) {
        await pool.query(statement);
      }
      console.log("✅ Database migrations (including camelCase) completed successfully");
    }
    catch (error) {
      console.error("❌ Migration failed:", error);
      throw error;
    }
}
if (import.meta.url === `file://${process.argv[1]}`) {
    runMigrations()
        .then(() => {
        console.log("Migration complete");
        process.exit(0);
    })
        .catch((error) => {
        console.error("Migration failed:", error);
        process.exit(1);
    });
}
//# sourceMappingURL=migrate.js.map