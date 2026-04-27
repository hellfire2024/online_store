import { pool } from "./connection.js";
import bcrypt from "bcryptjs";
import { RowDataPacket } from "mysql2";

const isProduction = process.env.NODE_ENV === "production";

const hasStrongPassword = (value: string): boolean => {
  // Minimum 12 chars with upper/lower/digit/special.
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{12,}$/.test(value);
};

const normalizeApiBaseUrl = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return "/api";
  return trimmed.endsWith("/api")
    ? trimmed.replace(/\/$/, "")
    : `${trimmed.replace(/\/$/, "")}/api`;
};

export async function seedDatabase(): Promise<void> {
  console.log("[seed] Seeding database...");

  try {
    const configuredApiBaseUrl = isProduction
      ? "/api"
      : normalizeApiBaseUrl(
          (process.env.SERVICE_URL_BACKEND || "").trim() || "/api",
        );
    const shouldSeedSampleData =
      process.env.SEED_SAMPLE_DATA === "1" || !isProduction;

    // Always use snake_case: migrations guarantee these columns exist (they match CREATE TABLE definitions).
    // resolveColumnName can pick camelCase alias columns added by ensureAliasColumn, which causes
    // NOT NULL violations on original snake_case columns excluded from INSERT statements.
    const adminPasswordColumn = "password_hash";
    const imageColumn = "image_url";
    const galleryColumn = "gallery_id";
    const customImageUploadColumn = "allow_custom_image_upload";
    const customImagePriceColumn = "custom_image_upload_price";

    const [adminCountRows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as count FROM admins",
    );
    const adminCount = Number(adminCountRows?.[0]?.count || 0);

    if (adminCount === 0) {
      const initialAdminUsername =
        (process.env.INITIAL_ADMIN_USERNAME || "").trim() ||
        (isProduction ? "" : "admin");
      const initialAdminPassword =
        (process.env.INITIAL_ADMIN_PASSWORD || "").trim() ||
        (isProduction ? "" : "admin123");
      const initialAdminEmail =
        (process.env.INITIAL_ADMIN_EMAIL || "").trim() ||
        (initialAdminUsername
          ? `${initialAdminUsername}@customthreads.local`
          : "admin@customthreads.local");

      if (isProduction) {
        const missing: string[] = [];
        if (!initialAdminUsername) missing.push("INITIAL_ADMIN_USERNAME");
        if (!initialAdminPassword) missing.push("INITIAL_ADMIN_PASSWORD");

        if (missing.length > 0) {
          throw new Error(
            `Initial admin setup required on first deployment. Missing: ${missing.join(", ")}. Configure these in your deployment environment and redeploy.`,
          );
        }

        if (!hasStrongPassword(initialAdminPassword)) {
          throw new Error(
            "INITIAL_ADMIN_PASSWORD must be at least 12 characters and include uppercase, lowercase, number, and special character.",
          );
        }
      }

      const adminId = crypto.randomUUID();
      const adminPasswordHash = await bcrypt.hash(initialAdminPassword, 12);

      await pool.query(
        `INSERT INTO admins (id, username, email, ${adminPasswordColumn}, role, permissions)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE username = username`,
        [
          adminId,
          initialAdminUsername,
          initialAdminEmail,
          adminPasswordHash,
          "super_admin",
          JSON.stringify(["all"]),
        ],
      );

      console.log(
        `[seed] Initial admin account created: ${initialAdminUsername} (${initialAdminEmail})`,
      );
      if (!isProduction) {
        console.log("[seed] Default local admin password: admin123");
      }
    } else {
      console.log(
        "[seed] Admin users already exist; skipping initial admin seed",
      );
    }

    if (shouldSeedSampleData) {
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
        `INSERT INTO products (id, name, description, price, ${imageColumn}, inventory, customizable, ${galleryColumn}, ${customImageUploadColumn}, ${customImagePriceColumn})
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
      console.log("[seed] Sample catalog data seeded");
    } else {
      console.log("[seed] Skipping sample catalog seed in production");
    }

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
      apiBaseUrl: configuredApiBaseUrl,
    };

    await pool.query(
      `INSERT INTO site_settings (id, settings) VALUES (1, ?)
       ON DUPLICATE KEY UPDATE settings = ?`,
      [JSON.stringify(defaultSettings), JSON.stringify(defaultSettings)],
    );

    console.log("[seed] Database seeded successfully");
  } catch (error) {
    console.error("[seed] Seeding failed:", error);
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
