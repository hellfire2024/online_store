import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import path from "path";
import { testConnection } from "./db/connection.js";

// Import routes
import productRoutes from "./routes/products.js";
import customerRoutes from "./routes/customers.js";
import adminUserRoutes from "./routes/admin-users.js";
import orderRoutes from "./routes/orders.js";
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
import shippingRoutes from "./routes/shippingApi.js";
import uploadRoutes from "./routes/upload.js";
import demoRoutes from "./demoRoutes.js";

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3001;
const DEMO_MODE =
  process.env.DEMO_MODE === "1" ||
  process.env.DEMO_MODE === "true" ||
  !!process.env.SKIP_DB_CHECK;

// ============================================
// MIDDLEWARE
// ============================================

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

// ============================================
// ROUTES
// ============================================

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
if (DEMO_MODE) {
  app.use("/api", demoRoutes);
} else {
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
  app.use("/api/shipping", shippingRoutes);
}

// 404 handler
app.use((_req: Request, res: Response) => {
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

async function startServer() {
  try {
    // Test database connection unless explicitly skipped (useful for demos)
    if (!DEMO_MODE) {
      await testConnection();
    }

    // Start listening
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🔗 API URL: http://localhost:${PORT}/api`);
      if (DEMO_MODE) {
        console.log(
          "⚠️  DEMO_MODE enabled: serving mock data, database checks skipped.",
        );
      }
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

export default app;
