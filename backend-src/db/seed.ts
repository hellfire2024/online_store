import { pool } from "./connection.js";
import bcrypt from "bcryptjs";

export async function seedDatabase(): Promise<void> {
  console.log("🌱 Seeding database...");

  try {
    // Create default admin user
    const adminId = crypto.randomUUID();
    const adminPassword = await bcrypt.hash("admin123", 10);

    await pool.query(
      `INSERT INTO admins (id, username, email, password_hash, role, permissions)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE username = username`,
      [
        adminId,
        "admin",
        "admin@customthreads.com",
        adminPassword,
        "super_admin",
        JSON.stringify(["all"]),
      ],
    );

    // Create sample gallery
    const galleryId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO galleries (id, name) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE name = name`,
      [galleryId, "Sample Patterns"],
    );

    // Create sample product
    const productId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO products (id, name, description, price, imageUrl, inventory, customizable, galleryId, allowCustomImageUpload, customImageUploadPrice)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = name`,
      [
        productId,
        "Classic T-Shirt",
        "Premium cotton t-shirt, perfect for custom designs",
        25.0,
        "https://picsum.photos/seed/tshirt/400/400",
        100,
        true,
        galleryId,
        false,
        0.0,
      ],
    );

    // Create default site settings
    const defaultSettings = {
      logoText: "Custom",
      logoTextAccent: "Threads",
      siteTitle: "Custom Threads - Your Design, Our Quality",
      footerContactEmail: "contact@customthreads.com",
      footerContactPhone: "(555) 123-4567",
      footerContactAddress: "123 Main St, City, ST 12345",
      footerSocialLinks: [],
      paymentProvider: "none",
      shippingProvider: "flatRate",
      shippingFlatRate: 5.0,
      siteBackgroundColor: "#0f172a",
      siteTextColor: "#ffffff",
      siteAccentColor: "#0ea5e9",
      siteBackgroundImageUrl: "",
      siteBackgroundOpacity: 0.1,
      maxReviewsDisplayed: 5,
      paymentApiKeys: {},
      shippingApiKeys: {},
      apiBaseUrl: "https://devapi.adaptivegis.com/api",
    };

    await pool.query(
      `INSERT INTO site_settings (id, settings) VALUES (1, ?)
       ON DUPLICATE KEY UPDATE settings = ?`,
      [JSON.stringify(defaultSettings), JSON.stringify(defaultSettings)],
    );

    console.log("✅ Database seeded successfully");
    console.log("📝 Default admin credentials:");
    console.log("   Username: admin");
    console.log("   Password: admin123");
    console.log("   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => {
      console.log("Seeding complete");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}
