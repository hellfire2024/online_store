import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import path from "path";
import { testConnection } from "./db/connection.js";

// Global error handlers for uncaught errors
process.on("uncaughtException", (error) => {
  console.error("❌ UNCAUGHT EXCEPTION:");
  console.error(error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ UNHANDLED REJECTION at:", promise);
  console.error("Reason:", reason);
  process.exit(1);
});

console.log("🔧 Loading environment variables...");
dotenv.config();
console.log("✅ Environment loaded");
console.log("📂 Working directory:", process.cwd());
console.log("🔢 Node version:", process.version);
console.log("🌍 NODE_ENV:", process.env.NODE_ENV);
console.log("🔌 PORT:", process.env.PORT);
console.log("🔒 CORS_ORIGIN:", process.env.CORS_ORIGIN);
console.log("🗃️  SKIP_DB_CHECK:", process.env.SKIP_DB_CHECK);

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
import shippingRoutes from "./routes/shippingApi.js";
import uploadRoutes from "./routes/upload.js";
import demoRoutes from "./demoRoutes.js";
import smtpTestRoutes from "./routes/smtpTest.js";
console.log("✅ All routes imported successfully");

console.log("🏗️  Creating Express app...");
const app: Express = express();
const PORT = parseInt(process.env.PORT || "3001", 10);
const DEMO_MODE =
  process.env.DEMO_MODE === "1" ||
  process.env.DEMO_MODE === "true" ||
  !!process.env.SKIP_DB_CHECK;

console.log("🎭 DEMO_MODE:", DEMO_MODE);

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
const corsOrigin = (process.env.CORS_ORIGIN || "http://localhost:5173").replace(
  /\/$/,
  "",
);
app.use(
  cors({
    origin: corsOrigin,
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

app.get("/health", (_req: Request, res: Response) => {
  console.log("💚 Health check accessed");
  res.json({ status: "ok", timestamp: new Date().toISOString(), demo_mode: DEMO_MODE });
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
  app.use("/api/smtp-test", smtpTestRoutes);
  app.use("/api/shipping", shippingRoutes);
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

console.log("🚀 Preparing to start server...");

async function startServer() {
  try {
    console.log("🔍 Checking database connection requirement...");
    // Test database connection unless explicitly skipped (useful for demos)
    if (!DEMO_MODE) {
      console.log("🔌 Testing database connection...");
      await testConnection();
      console.log("✅ Database connected successfully");
    } else {
      console.log("⚠️  Skipping database check (DEMO_MODE enabled)");
    }

    console.log(`🎧 Starting HTTP server on port ${PORT}...`);
    console.log(`📍 PORT type: ${typeof PORT}, value: ${PORT}`);
    console.log(`📍 Binding to: 0.0.0.0:${PORT}`);
    
    // Start listening on all network interfaces (0.0.0.0)
    // This is required for hosting providers like Hostinger, Render, etc.
    const server = app.listen(PORT, "0.0.0.0");
    
    console.log(`✔️  app.listen() called successfully, server object created`);
    
    const onListening = () => {
      console.log("=".repeat(50));
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🔗 API URL: http://localhost:${PORT}/api`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      console.log(`🌐 Bound to: 0.0.0.0 (all network interfaces)`);
      if (DEMO_MODE) {
        console.log(
          "⚠️  DEMO_MODE enabled: serving mock data, database checks skipped.",
        );
      }
      console.log("=".repeat(50));
    };
    
    server.on("listening", onListening);

    // Handle server errors
    server.on("error", (error: any) => {
      console.error("❌ SERVER ERROR:", error);
      if (error.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use`);
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
    console.error("❌ FATAL ERROR - Failed to start server:");
    console.error("Error name:", error instanceof Error ? error.name : "Unknown");
    console.error("Error message:", error instanceof Error ? error.message : String(error));
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    console.error("=".repeat(50));
    process.exit(1);
  }
}

console.log("🎬 Calling startServer()...");

if (require.main === module || import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch((err) => {
    console.error("❌ Unhandled error in startServer:");
    console.error("Error:", err instanceof Error ? err.message : String(err));
    console.error("Stack:", err instanceof Error ? err.stack : "No stack");
    process.exit(1);
  });
} else {
  console.log("⚠️  Server module imported (not running)");
}

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
