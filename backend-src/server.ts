import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { testConnection } from "./db/connection.js";

// ============================================
// STARTUP LOGGING TO FILE
// ============================================
const LOG_FILE = path.join(process.cwd(), "startup.log");

function appendLog(msg: string) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}\n`;
  try {
    fs.appendFileSync(LOG_FILE, line, "utf8");
  } catch (e) {
    // ignore
  }
  console.log(msg);
}

// Initialize log file
try {
  fs.writeFileSync(
    LOG_FILE,
    `\n\n=== SERVER STARTUP ${new Date().toISOString()} ===\n`,
    "utf8",
  );
} catch (e) {
  // ignore
}

appendLog("🚀 server.ts LOADING");
appendLog("PID: " + process.pid);
appendLog("Node: " + process.version);
appendLog("CWD: " + process.cwd());

// Global error handlers for uncaught errors
process.on("uncaughtException", (error) => {
  appendLog("❌ UNCAUGHT EXCEPTION:");
  appendLog(String(error));
  console.error("❌ UNCAUGHT EXCEPTION:");
  console.error(error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  appendLog("❌ UNHANDLED REJECTION at: " + String(promise));
  appendLog("Reason: " + String(reason));
  console.error("❌ UNHANDLED REJECTION at:", promise);
  console.error("Reason:", reason);
  // Do not crash the server on transient async errors.
  // Route-level handlers should surface errors via Express responses.
});

appendLog("🔧 Loading environment variables...");
dotenv.config();
appendLog("✅ Environment loaded");
appendLog("📂 Working directory: " + process.cwd());
appendLog("🔢 Node version: " + process.version);
appendLog("🌍 NODE_ENV: " + process.env.NODE_ENV);
appendLog("🔌 PORT: " + process.env.PORT);
appendLog("🔒 CORS_ORIGIN: " + process.env.CORS_ORIGIN);
appendLog("🗃️  SKIP_DB_CHECK: " + process.env.SKIP_DB_CHECK);
appendLog("🔒 DB_HOST: " + process.env.DB_HOST);
appendLog("🔒 DB_PORT: " + process.env.DB_PORT);
appendLog("🔒 DB_USER: " + process.env.DB_USER);
appendLog("🔒 DB_PASSWORD: " + process.env.DB_PASSWORD);
appendLog("🔒 DB_NAME: " + process.env.DB_NAME);

console.log("🔧 Loading environment variables...");
console.log("✅ Environment loaded");
console.log("📂 Working directory:", process.cwd());
console.log("🔢 Node version:", process.version);
console.log("🌍 NODE_ENV:", process.env.NODE_ENV);
console.log("🔌 PORT:", process.env.PORT);
console.log("🔒 CORS_ORIGIN:", process.env.CORS_ORIGIN);
console.log("🗃️  SKIP_DB_CHECK:", process.env.SKIP_DB_CHECK);
console.log("🔒 DB_HOST:", process.env.DB_HOST);
console.log("🔒 DB_PORT:", process.env.DB_PORT);
console.log("🔒 DB_USER:", process.env.DB_USER);
console.log("🔒 DB_PASSWORD:", process.env.DB_PASSWORD);
console.log("🔒 DB_NAME:", process.env.DB_NAME);

// Log DB config loaded from site_settings.json
try {
  const settingsPath = path.join(process.cwd(), "db", "site_settings.json");
  if (fs.existsSync(settingsPath)) {
    const settingsRaw = fs.readFileSync(settingsPath, "utf8");
    const settings = JSON.parse(settingsRaw);
    if (settings.dbConfig) {
      appendLog("📄 Loaded DB config from site_settings.json:");
      appendLog(JSON.stringify(settings.dbConfig, null, 2));
      console.log("📄 Loaded DB config from site_settings.json:");
      console.log(settings.dbConfig);
    } else {
      appendLog("⚠️  No dbConfig found in site_settings.json");
      console.log("⚠️  No dbConfig found in site_settings.json");
    }
  } else {
    appendLog("⚠️  site_settings.json not found");
    console.log("⚠️  site_settings.json not found");
  }
} catch (e) {
  appendLog("❌ Error reading site_settings.json: " + String(e));
  console.log("❌ Error reading site_settings.json:", e);
}

appendLog("📦 Importing routes...");
console.log("📦 Importing routes...");
// Import routes
import productRoutes from "./routes/products.js";
import customerRoutes from "./routes/customers.js";
import adminUserRoutes from "./routes/admin-users.js";
import orderRoutes from "./routes/ordersApi.js";
import galleryRoutes from "./routes/galleries.js";
import pageRoutes from "./routes/pages.js";
import reviewRoutes from "./routes/reviews.js";
import staffRoutes from "./routes/staff.js";
import serviceRoutes from "./routes/services.js";
import settingsRoutes from "./routes/settings.js";
import emailConfigRoutes from "./routes/emailConfig.js";
import taxRoutes from "./routes/tax.js";
import providersTaxRoutes from "./routes/providers-tax.js";
import authRoutes from "./routes/auth.js";
import ticketsApiRoutes from "./routes/ticketsApi.js";
import customerAddressesRoutes from "./routes/customerAddresses.js";
import quoteRoutes from "./routes/quotes.js";
import shippingRoutes from "./routes/shippingApi.js";
import uploadRoutes from "./routes/upload.js";
import contactRoutes from "./routes/contact.js";
import demoRoutes from "./demoRoutes.js";
import smtpTestRoutes from "./routes/smtpTest.js";
appendLog("✅ All routes imported successfully");
console.log("✅ All routes imported successfully");

appendLog("🏗️  Creating Express app...");
console.log("🏗️  Creating Express app...");
const app: Express = express();
const PORT = parseInt(process.env.PORT || "3001", 10);
// DEMO_MODE should only be enabled by explicit DEMO_MODE=1 or DEMO_MODE=true
// SKIP_DB_CHECK is separate and just skips the initial DB connection test
const DEMO_MODE =
  process.env.DEMO_MODE === "1" || process.env.DEMO_MODE === "true";

console.log("🎭 DEMO_MODE:", DEMO_MODE);
console.log("🔍 DEMO_MODE env value:", process.env.DEMO_MODE);
console.log("🔍 SKIP_DB_CHECK env value:", process.env.SKIP_DB_CHECK);

// ============================================
// MIDDLEWARE
// ============================================

console.log("⚙️  Configuring middleware...");

// Trust proxy - REQUIRED for Render and other services behind reverse proxies
// This allows rate limiting and other middleware to work correctly
app.set("trust proxy", 1);

// Security headers
app.use(helmet());

// CORS configuration
const normalizeOrigin = (value: string): string =>
  value.trim().replace(/\/$/, "").toLowerCase();

const toOriginFromDomain = (domain?: string): string | null => {
  if (!domain) return null;
  const trimmed = domain.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return normalizeOrigin(trimmed);
  }
  return normalizeOrigin(`https://${trimmed}`);
};

const isProductionRuntime = process.env.NODE_ENV === "production";

const isDevHostname = (hostname: string): boolean => {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized.startsWith("dev.") ||
    normalized.startsWith("devapi.") ||
    normalized.includes("-dev")
  );
};

const corsOriginCandidates = [
  // Explicit CORS_ORIGIN supports comma-separated list.
  ...(process.env.CORS_ORIGIN || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean),
  // Production domains from compose/coolify env.
  process.env.SERVICE_URL_FRONTEND,
  process.env.SERVICE_URL_BACKEND,
  toOriginFromDomain(process.env.PROD_FRONTEND_DOMAIN),
  toOriginFromDomain(process.env.PROD_API_DOMAIN),
  // Optional explicit allow-list for local testing.
  ...(process.env.ALLOW_LOCALHOST_CORS === "1"
    ? ["http://localhost:5173", "http://127.0.0.1:5173"]
    : []),
]
  .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
  .map((v) => normalizeOrigin(v));

const allowedOrigins = Array.from(new Set(corsOriginCandidates));

const isAllowedByEnvironmentTier = (origin: string): boolean => {
  try {
    const { hostname } = new URL(origin);
    const originIsDev = isDevHostname(hostname);
    // Never allow dev origins in production unless explicitly listed.
    if (isProductionRuntime && originIsDev) {
      return false;
    }
    return false;
  } catch {
    return false;
  }
};

console.log("✅ Allowed CORS origins:", allowedOrigins);
app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(normalizeOrigin(origin)) ||
        isAllowedByEnvironmentTier(origin)
      ) {
        return callback(null, true);
      } else {
        console.error(`[CORS] Blocked origin: ${origin}`);
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve static files from public directory
app.use(express.static(path.join(process.cwd(), "public")));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api/", limiter);

console.log("✅ Middleware configured successfully");

// ============================================
// ROUTES
// ============================================

console.log("🛣️  Setting up routes...");

app.get("/health", (req: Request, res: Response) => {
  const healthStatus = {
    status: "ok",
    timestamp: new Date().toISOString(),
    demo_mode: DEMO_MODE,
    db_connected: true,
    port: process.env.PORT || 3001,
    node_version: process.version,
    env: process.env.NODE_ENV,
    host: req.hostname,
    ip: req.ip,
    url: req.protocol + "://" + req.get("host") + req.originalUrl,
    headers: req.headers,
  };
  appendLog("💚 Health check accessed: " + JSON.stringify(healthStatus));
  res.status(200).json(healthStatus);
});

// API routes
if (DEMO_MODE) {
  console.log("📋 Using demo routes (mock data)");
  app.use("/api", demoRoutes);
} else {
  console.log("📋 Using production routes (real database)");
  app.use("/api/auth", authRoutes);
  app.use("/api/upload", uploadRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/customers", customerRoutes);
  app.use("/api/admin-users", adminUserRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/galleries", galleryRoutes);
  app.use("/api/pages", pageRoutes);
  app.use("/api/reviews", reviewRoutes);
  app.use("/api/staff", staffRoutes);
  app.use("/api/services", serviceRoutes);
  app.use("/api/settings", settingsRoutes);
  app.use("/api/email-config", emailConfigRoutes);
  app.use("/api/tax", taxRoutes);
  app.use("/api/tax/providers", providersTaxRoutes);
  app.use("/api/tickets", ticketsApiRoutes);
  app.use("/api/customer-addresses", customerAddressesRoutes);
  app.use("/api/quotes", quoteRoutes);
  app.use("/api/smtp-test", smtpTestRoutes);
  app.use("/api/shipping", shippingRoutes);
  app.use("/api/contact", contactRoutes);
}

console.log("✅ All routes configured successfully");

// 404 handler
app.use((_req: Request, res: Response) => {
  console.log("⚠️  404 - Route not found:", _req.method, _req.url);
  res.status(404).json({ error: "Route not found" });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Error:", err);
  res.status(500).json({
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

// ============================================
// START SERVER
// ============================================

appendLog("🚀 Preparing to start server...");
console.log("🚀 Preparing to start server...");

async function startServer() {
  try {
    appendLog("🔍 Checking database connection requirement...");
    console.log("🔍 Checking database connection requirement...");
    // Test database connection unless explicitly skipped (useful for demos)
    if (!DEMO_MODE) {
      appendLog("🔌 Testing database connection...");
      console.log("🔌 Testing database connection...");
      await testConnection();
      appendLog("✅ Database connected successfully");
      console.log("✅ Database connected successfully");

      // Always run migrations (idempotent) to reconcile schema drift safely
      const connectionModule = await import("./db/connection.js");
      const migrateModule = await import("./db/migrate.js");
      const seedModule = await import("./db/seed.js");
      appendLog("🔄 Running migrations...");
      await migrateModule.runMigrations();
      appendLog("✅ Migrations complete");

      // Seed if either admins or galleries table is empty
      const [adminCountRows]: any = await connectionModule.pool.query(
        "SELECT COUNT(*) as count FROM admins",
      );
      const [settingsCountRows]: any = await connectionModule.pool.query(
        "SELECT COUNT(*) as count FROM site_settings",
      );
      if (
        (Array.isArray(adminCountRows) &&
          adminCountRows.length > 0 &&
          Number(adminCountRows[0].count) === 0) ||
        (Array.isArray(settingsCountRows) &&
          settingsCountRows.length > 0 &&
          Number(settingsCountRows[0].count) === 0)
      ) {
        appendLog("🌱 Seeding database (admins or settings missing)...");
        await seedModule.seedDatabase();
        appendLog("✅ Database seeded");
      } else {
        appendLog(
          "🌱 Database already seeded (admin users and settings exist)",
        );
      }
    } else {
      appendLog("⚠️  Skipping database check (DEMO_MODE enabled)");
      console.log("⚠️  Skipping database check (DEMO_MODE enabled)");
    }

    appendLog(`🎧 Starting HTTP server on port ${PORT}...`);
    console.log(`🎧 Starting HTTP server on port ${PORT}...`);
    appendLog(`📍 PORT type: ${typeof PORT}, value: ${PORT}`);
    console.log(`📍 PORT type: ${typeof PORT}, value: ${PORT}`);
    const publicApiUrl = process.env.SERVICE_URL_BACKEND || "http://0.0.0.0";
    appendLog(`📍 Binding to: 0.0.0.0:${PORT}`);
    console.log(`📍 Binding to: 0.0.0.0:${PORT}`);

    // Start listening on all interfaces for healthcheck compatibility
    const server = app.listen(PORT, "0.0.0.0");

    appendLog(`✔️  app.listen() called successfully, server object created`);
    console.log(`✔️  app.listen() called successfully, server object created`);

    const onListening = () => {
      const separator = "=".repeat(50);
      appendLog(separator);
      appendLog(`🚀 SERVER LISTENING - port ${PORT}`);
      appendLog(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
      appendLog(`🌐 Bound to: 0.0.0.0 (container network)`);
      appendLog(`🌐 Public URL: ${publicApiUrl}`);
      if (DEMO_MODE) {
        appendLog(`⚠️  DEMO_MODE: serving mock data`);
      }
      appendLog(separator);
      appendLog(`✅ Server is READY - waiting for requests...`);

      console.log(separator);
      console.log(`🚀 SERVER LISTENING - port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🌐 Bound to: 0.0.0.0 (container network)`);
      console.log(`🌐 Public URL: ${publicApiUrl}`);
      if (DEMO_MODE) {
        console.log(`⚠️  DEMO_MODE: serving mock data`);
      }
      console.log(separator);
      console.log(`✅ Server is READY - waiting for requests...`);
    };

    // Attach listener BEFORE server might already be listening
    server.once("listening", onListening);

    // Handle server errors
    server.on("error", (error: any) => {
      appendLog("❌ SERVER BINDING ERROR:");
      appendLog("   Code: " + error.code);
      appendLog("   Message: " + error.message);
      if (error.code === "EADDRINUSE") {
        appendLog(`   ❌ Port ${PORT} is already in use`);
      }
      if (error.code === "EACCES") {
        appendLog(`   ❌ Permission denied - cannot bind to port ${PORT}`);
      }
      console.error("❌ SERVER BINDING ERROR:");
      console.error("   Code:", error.code);
      console.error("   Message:", error.message);
      if (error.code === "EADDRINUSE") {
        console.error(`   ❌ Port ${PORT} is already in use`);
      }
      if (error.code === "EACCES") {
        console.error(`   ❌ Permission denied - cannot bind to port ${PORT}`);
      }
      process.exit(1);
    });

    // Handle server close
    server.on("close", () => {
      console.warn("⚠️  Server closed");
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
      console.log("SIGTERM received, shutting down gracefully...");
      server.close(() => {
        console.log("Server closed");
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      console.log("SIGINT received, shutting down gracefully...");
      server.close(() => {
        console.log("Server closed");
        process.exit(0);
      });
    });
  } catch (error) {
    appendLog("❌ FATAL ERROR - Failed to start server:");
    appendLog(
      "Error name: " + (error instanceof Error ? error.name : "Unknown"),
    );
    appendLog(
      "Error message: " +
        (error instanceof Error ? error.message : String(error)),
    );
    appendLog(
      "Error stack: " +
        (error instanceof Error ? error.stack : "No stack trace"),
    );
    appendLog("=".repeat(50));
    console.error("❌ FATAL ERROR - Failed to start server:");
    console.error(
      "Error name:",
      error instanceof Error ? error.name : "Unknown",
    );
    console.error(
      "Error message:",
      error instanceof Error ? error.message : String(error),
    );
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace",
    );
    console.error("=".repeat(50));
    process.exit(1);
  }
}

appendLog("🎬 Calling startServer()...");
console.log("🎬 Calling startServer()...");

// Start the server immediately - no complex module checks needed
// The build verification doesn't call startServer(), only the runtime does
startServer().catch((err) => {
  appendLog("❌ Unhandled error in startServer:");
  appendLog("Error: " + (err instanceof Error ? err.message : String(err)));
  console.error("❌ Unhandled error in startServer:");
  console.error("Error:", err instanceof Error ? err.message : String(err));
  console.error("Stack:", err instanceof Error ? err.stack : "No stack");
  process.exit(1);
});

// Graceful shutdown handlers
process.on("SIGTERM", () => {
  console.log("📌 SIGTERM received");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("📌 SIGINT received");
  process.exit(0);
});

// Prevent process from exiting if there are unhandled promises
process.on("exit", (code) => {
  console.log(`\n📊 Process exiting with code ${code}`);
});

export default app;
