import { pool } from "./connection.js";

export async function runMigrations(): Promise<void> {
  // All referenced tables are now included in the migration script.

  const createTables = [
    `CREATE TABLE IF NOT EXISTS admins (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
    `CREATE TABLE IF NOT EXISTS customers (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
    `CREATE TABLE IF NOT EXISTS galleries (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
    `CREATE TABLE IF NOT EXISTS gallery_images (
      id VARCHAR(36) PRIMARY KEY,
      gallery_id VARCHAR(36) NOT NULL,
      name VARCHAR(255) NOT NULL,
      image_url LONGTEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE,
      INDEX idx_gallery (gallery_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
    `CREATE TABLE IF NOT EXISTS customer_addresses (
      id VARCHAR(36) PRIMARY KEY,
      customer_id VARCHAR(36) NOT NULL,
      first_name VARCHAR(255),
      last_name VARCHAR(255),
      address_line1 VARCHAR(255) NOT NULL,
      address_line2 VARCHAR(255),
      city VARCHAR(100) NOT NULL,
      state VARCHAR(100),
      postal_code VARCHAR(20) NOT NULL,
      country VARCHAR(100) NOT NULL,
      phone VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      INDEX idx_customer (customer_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
    `CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      image_url LONGTEXT,
      inventory INT DEFAULT 0,
      customizable BOOLEAN DEFAULT FALSE,
      gallery_id VARCHAR(36),
      allow_custom_image_upload BOOLEAN DEFAULT FALSE,
      custom_image_upload_price DECIMAL(10,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE SET NULL,
      INDEX idx_gallery (gallery_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
    `CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(36) PRIMARY KEY,
      customer_id VARCHAR(36),
      customer_email VARCHAR(255),
      customer_name VARCHAR(255),
      order_data LONGTEXT,
      shipper VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
      INDEX idx_customer (customer_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
    `CREATE TABLE IF NOT EXISTS site_settings (
      id INT PRIMARY KEY DEFAULT 1,
      settings JSON NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CHECK (id = 1)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
    `CREATE TABLE IF NOT EXISTS pages (
      id VARCHAR(36) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) UNIQUE NOT NULL,
      content LONGTEXT,
      meta JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  ];

  // --- ALTER TABLES: Add columns only if not exist ---
  const alterTableAddColumn = async (
    table: string,
    column: string,
    type: string,
  ) => {
    const [rows] = await pool.query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [
      column,
    ]);
    if (Array.isArray(rows) && rows.length === 0) {
      await pool.query(
        `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${type}`,
      );
      console.log(`Added column '${column}' to table '${table}'`);
    }
  };

  try {
    // 1. Create all tables
    for (const stmt of createTables) {
      await pool.query(stmt);
    }

    // 2. Conditionally add columns (admins)
    await alterTableAddColumn("admins", "first_name", "VARCHAR(100)");
    await alterTableAddColumn("admins", "last_name", "VARCHAR(100)");
    await alterTableAddColumn("admins", "phone", "VARCHAR(50)");

    // 3. Conditionally add columns (customers)
    await alterTableAddColumn("customers", "first_name", "VARCHAR(255)");
    await alterTableAddColumn("customers", "last_name", "VARCHAR(255)");

    // 4. Conditionally add columns (customer_addresses)
    await alterTableAddColumn(
      "customer_addresses",
      "first_name",
      "VARCHAR(255)",
    );
    await alterTableAddColumn(
      "customer_addresses",
      "last_name",
      "VARCHAR(255)",
    );

    // Add columns for orders
    await alterTableAddColumn("orders", "customer_email", "VARCHAR(255)");
    await alterTableAddColumn("orders", "customer_name", "VARCHAR(255)");
    await alterTableAddColumn("orders", "order_data", "LONGTEXT");
    await alterTableAddColumn("orders", "shipper", "VARCHAR(100)");

    // Add columns for reviews
    await alterTableAddColumn("reviews", "images", "JSON");

    console.log("✅ Database migrations completed successfully");
  } catch (error) {
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
