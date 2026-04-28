import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import { pool } from "../db/connection.js";
import { RowDataPacket } from "mysql2";
import crypto from "crypto";
import {
  requireCustomer,
  requireAdmin,
  AuthenticatedRequest,
} from "../middleware/auth.js";
import { sendPasswordResetEmail } from "../services/emailService.js";

const router = Router();

const normalizeOrigin = (value: string): string =>
  value.trim().replace(/\/$/, "");

const getFrontendBaseUrl = (req: Request): string => {
  const configured = String(
    process.env.FRONTEND_URL || process.env.SERVICE_URL_FRONTEND || "",
  ).trim();
  if (configured) {
    return normalizeOrigin(configured);
  }

  const requestOrigin = String(req.get("origin") || "").trim();
  if (requestOrigin) {
    return normalizeOrigin(requestOrigin);
  }

  const referer = String(req.get("referer") || "").trim();
  if (referer) {
    return normalizeOrigin(referer.split("/#")[0]);
  }

  const prodDomain = String(process.env.PROD_FRONTEND_DOMAIN || "").trim();
  if (prodDomain) {
    const withScheme =
      prodDomain.startsWith("http://") || prodDomain.startsWith("https://")
        ? prodDomain
        : `https://${prodDomain}`;
    return normalizeOrigin(withScheme);
  }

  return "http://localhost:5173";
};

// Admin login
router.post(
  "/admin/login",
  [body("username").trim().notEmpty(), body("password").notEmpty()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { username, password } = req.body;

      const [rows] = await pool.query<RowDataPacket[]>(
        "SELECT * FROM admins WHERE (username = ? OR email = ?) LIMIT 1",
        [username, username],
      );

      if (rows.length === 0) {
        console.error(
          `[Auth] Admin login FAILED: no active admin found for username/email "${username}"`,
        );
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const admin = rows[0];
      const adminIsActive =
        typeof admin.is_active === "boolean"
          ? admin.is_active
          : typeof admin.isActive === "boolean"
            ? admin.isActive
            : true;
      if (!adminIsActive) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const adminPasswordHash =
        (typeof admin.password_hash === "string" && admin.password_hash) ||
        (typeof admin.passwordHash === "string" && admin.passwordHash) ||
        "";

      if (!adminPasswordHash) {
        console.error(
          `[Auth] Admin login FAILED: no password hash for "${username}" (id=${admin.id})`,
        );
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(password, adminPasswordHash);
      console.log(
        `[Auth] Admin "${username}" found (id=${admin.id}, is_active=${adminIsActive}), hash present=${!!adminPasswordHash}`,
      );

      if (!validPassword) {
        console.error(
          `[Auth] Admin login FAILED: password mismatch for "${username}" (id=${admin.id})`,
        );
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Update last login
      await pool.query("UPDATE admins SET last_login = NOW() WHERE id = ?", [
        admin.id,
      ]);

      // Generate JWT
      const secret: Secret = process.env.JWT_SECRET || "dev-secret";
      const expiresIn = (process.env.JWT_EXPIRES_IN ||
        "7d") as SignOptions["expiresIn"];
      const options: SignOptions = { expiresIn };
      const token = jwt.sign(
        {
          id: admin.id,
          username: admin.username,
          role: admin.role,
          type: "admin",
        },
        secret,
        options,
      );

      return res.json({
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          role: admin.role,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ error: "Login failed" });
    }
  },
);

// Customer register
router.post(
  "/customer/register",
  [
    body("firstName").trim().notEmpty().withMessage("First name is required"),
    body("lastName").trim().notEmpty().withMessage("Last name is required"),
    body("email").isEmail().normalizeEmail(),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
    body("phone").optional().trim(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { firstName, lastName, email, password, phone } = req.body;

      // Check if email exists
      const [existing] = await pool.query<RowDataPacket[]>(
        "SELECT id FROM customers WHERE email = ?",
        [email],
      );

      if (existing.length > 0) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(
        password,
        parseInt(process.env.BCRYPT_ROUNDS || "10"),
      );
      const fullName = `${firstName} ${lastName}`;

      // Create customer
      const id = crypto.randomUUID();
      await pool.query(
        `INSERT INTO customers (id, first_name, last_name, name, email, phone, password_hash, email_preferences, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          firstName,
          lastName,
          fullName,
          email,
          phone || null,
          passwordHash,
          JSON.stringify({
            marketing: true,
            orderUpdates: true,
            announcements: true,
          }),
          true,
        ],
      );

      // Generate JWT
      const secret: Secret = process.env.JWT_SECRET || "dev-secret";
      const expiresIn = (process.env.JWT_EXPIRES_IN ||
        "7d") as SignOptions["expiresIn"];
      const options: SignOptions = { expiresIn };
      const token = jwt.sign({ id, email, type: "customer" }, secret, options);

      return res.status(201).json({
        token,
        customer: {
          id,
          firstName,
          lastName,
          name: fullName,
          email,
          phone: phone || null,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      return res.status(500).json({ error: "Registration failed" });
    }
  },
);

// Customer login
router.post(
  "/customer/login",
  [body("email").isEmail().normalizeEmail(), body("password").notEmpty()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email, password } = req.body;

      const [rows] = await pool.query<RowDataPacket[]>(
        "SELECT * FROM customers WHERE email = ? LIMIT 1",
        [email],
      );

      if (rows.length === 0) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const customer = rows[0];
      const customerIsActive =
        typeof customer.is_active === "boolean"
          ? customer.is_active
          : typeof customer.isActive === "boolean"
            ? customer.isActive
            : true;
      if (!customerIsActive) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const customerPasswordHash =
        (typeof customer.password_hash === "string" &&
          customer.password_hash) ||
        (typeof customer.passwordHash === "string" && customer.passwordHash) ||
        "";

      if (!customerPasswordHash) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(
        password,
        customerPasswordHash,
      );

      if (!validPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Update last login
      await pool.query("UPDATE customers SET last_login = NOW() WHERE id = ?", [
        customer.id,
      ]);

      // Generate JWT
      const secret: Secret = process.env.JWT_SECRET || "dev-secret";
      const expiresIn = (process.env.JWT_EXPIRES_IN ||
        "7d") as SignOptions["expiresIn"];
      const options: SignOptions = { expiresIn };
      const token = jwt.sign(
        { id: customer.id, email: customer.email, type: "customer" },
        secret,
        options,
      );

      return res.json({
        token,
        customer: {
          id: customer.id,
          firstName: customer.first_name,
          lastName: customer.last_name,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ error: "Login failed" });
    }
  },
);

// Customer change password
router.post(
  "/customer/change-password",
  [
    body("currentPassword").notEmpty(),
    body("newPassword").isLength({ min: 8 }),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Get customer ID from JWT token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "No authorization token" });
      }

      const token = authHeader.substring(7);
      const secret: Secret = process.env.JWT_SECRET || "dev-secret";

      let customerId: string;
      try {
        const decoded = jwt.verify(token, secret) as any;
        if (decoded.type !== "customer") {
          return res.status(403).json({ error: "Invalid token type" });
        }
        customerId = decoded.id;
      } catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      const { currentPassword, newPassword } = req.body;

      // Fetch the customer
      const [rows] = await pool.query<RowDataPacket[]>(
        "SELECT * FROM customers WHERE id = ? AND is_active = TRUE",
        [customerId],
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: "Customer not found" });
      }

      const customer = rows[0];

      // Verify current password
      const validPassword = await bcrypt.compare(
        currentPassword,
        customer.password_hash,
      );
      if (!validPassword) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(
        newPassword,
        parseInt(process.env.BCRYPT_ROUNDS || "10"),
      );

      // Update password
      await pool.query(
        "UPDATE customers SET password_hash = ?, updated_at = NOW() WHERE id = ?",
        [newPasswordHash, customerId],
      );

      return res.json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      console.error("Change password error:", error);
      return res.status(500).json({ error: "Failed to change password" });
    }
  },
);

// Customer request password reset
router.post(
  "/customer/request-password-reset",
  [body("email").isEmail().normalizeEmail()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email } = req.body;

      // Check if customer exists
      const [rows] = await pool.query<RowDataPacket[]>(
        "SELECT id, first_name, last_name, name, email FROM customers WHERE email = ? AND is_active = TRUE",
        [email],
      );

      if (rows.length === 0) {
        // Don't reveal if email exists (security best practice)
        return res.json({
          success: true,
          message:
            "If an account with that email exists, a password reset link has been sent",
        });
      }

      const customer = rows[0];
      const tokenId = crypto.randomUUID();
      // Generate URL-safe base64 token (shorter than hex)
      const resetToken = crypto
        .randomBytes(24)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Store the reset token
      await pool.query(
        `INSERT INTO password_reset_tokens (id, customer_id, token, expires_at, used) 
         VALUES (?, ?, ?, ?, FALSE)`,
        [tokenId, customer.id, resetToken, expiresAt],
      );

      // Build reset URL - use production domain from request if FRONTEND_URL not set
      const baseUrl = getFrontendBaseUrl(req);
      const resetUrl = `${baseUrl}/#/reset-password?token=${resetToken}`;

      // Send password reset email
      const emailResult = await sendPasswordResetEmail(
        customer.email,
        customer.first_name || customer.name || "Customer",
        resetUrl,
      );

      if (!emailResult.success) {
        console.error("Failed to send password reset email:", emailResult);

        // Best-effort cleanup so failed sends don't accumulate unused valid tokens
        try {
          await pool.query("DELETE FROM password_reset_tokens WHERE id = ?", [
            tokenId,
          ]);
        } catch (cleanupError) {
          console.error(
            "Failed to clean up password reset token after send failure:",
            cleanupError,
          );
        }

        return res.status(503).json({
          success: false,
          message:
            "We couldn't send a password reset email right now. Please contact customer service for help.",
        });
      }

      return res.json({
        success: true,
        message:
          "If an account with that email exists, a password reset link has been sent",
      });
    } catch (error) {
      console.error("Password reset request error:", error);
      return res
        .status(500)
        .json({ error: "Failed to process password reset request" });
    }
  },
);

// Admin: Send password reset email to a customer
router.post(
  "/admin/send-password-reset/:customerId",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;

      // Get customer details
      const [rows] = await pool.query<RowDataPacket[]>(
        "SELECT id, first_name, last_name, name, email, is_active FROM customers WHERE id = ?",
        [customerId],
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: "Customer not found" });
      }

      const customer = rows[0];

      if (!customer.is_active) {
        return res.status(400).json({ error: "Customer account is inactive" });
      }

      const tokenId = crypto.randomUUID();
      // Generate URL-safe base64 token (shorter than hex)
      const resetToken = crypto
        .randomBytes(24)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store the reset token
      await pool.query(
        `INSERT INTO password_reset_tokens (id, customer_id, token, expires_at, used) 
         VALUES (?, ?, ?, ?, FALSE)`,
        [tokenId, customer.id, resetToken, expiresAt],
      );

      // Build reset URL - use production domain from request if FRONTEND_URL not set
      const baseUrl = getFrontendBaseUrl(req);
      const resetUrl = `${baseUrl}/#/reset-password?token=${resetToken}`;

      // Send password reset email
      const emailResult = await sendPasswordResetEmail(
        customer.email,
        customer.first_name || customer.name || "Customer",
        resetUrl,
      );

      if (!emailResult.success) {
        console.error("Failed to send password reset email:", emailResult);
        return res.status(500).json({
          error: "Failed to send password reset email",
        });
      }

      return res.json({
        success: true,
        message: `Password reset email sent to ${customer.email}`,
      });
    } catch (error) {
      console.error("Admin password reset error:", error);
      return res
        .status(500)
        .json({ error: "Failed to send password reset email" });
    }
  },
);

// Reset password with token
router.post(
  "/customer/reset-password",
  [
    body("token").notEmpty().withMessage("Reset token is required"),
    body("newPassword")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { token, newPassword } = req.body;

      // Find valid token
      const [tokenRows] = await pool.query<RowDataPacket[]>(
        `SELECT id, customer_id, expires_at, used 
         FROM password_reset_tokens 
         WHERE token = ? AND used = FALSE AND expires_at > NOW()`,
        [token],
      );

      if (tokenRows.length === 0) {
        return res.status(400).json({
          error: "Invalid or expired reset token",
        });
      }

      const resetToken = tokenRows[0];

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 10);

      // Update customer password
      await pool.query("UPDATE customers SET password_hash = ? WHERE id = ?", [
        passwordHash,
        resetToken.customer_id,
      ]);

      // Mark token as used
      await pool.query(
        "UPDATE password_reset_tokens SET used = TRUE WHERE id = ?",
        [resetToken.id],
      );

      return res.json({
        success: true,
        message: "Password reset successfully",
      });
    } catch (error) {
      console.error("Password reset error:", error);
      return res.status(500).json({ error: "Failed to reset password" });
    }
  },
);

// Get current authenticated customer profile with addresses
router.get(
  "/customer/me",
  requireCustomer,
  async (req: Request, res: Response) => {
    try {
      const authUser = (req as AuthenticatedRequest).authUser;
      console.log("[Auth] GET /customer/me called, authUser:", authUser?.id);

      if (!authUser?.id) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Fetch customer with all details
      try {
        const [customerRows] = await pool.query<RowDataPacket[]>(
          "SELECT id, first_name, last_name, name, email, phone, email_preferences, is_active, created_at, last_login FROM customers WHERE id = ? AND is_active = TRUE",
          [authUser.id],
        );

        if (!customerRows || customerRows.length === 0) {
          console.log("[Auth] Customer not found for ID:", authUser.id);
          return res.status(404).json({ error: "Customer not found" });
        }

        const customer = customerRows[0];

        // Fetch customer's addresses - wrap in try-catch to prevent failure if table doesn't exist
        let addresses: RowDataPacket[] = [];
        try {
          const [addressRows] = await pool.query<RowDataPacket[]>(
            `SELECT id, type, first_name, last_name, full_name, street_address, city, state, zip_code, 
                  country, phone, is_default FROM customer_addresses WHERE customer_id = ? ORDER BY created_at DESC`,
            [customer.id],
          );
          addresses = addressRows || [];
        } catch (addrError) {
          console.warn("[Auth] Failed to fetch customer addresses:", addrError);
          // Don't fail the whole request if addresses fetch fails
          addresses = [];
        }

        // Normalize address fields to camelCase
        const normalizedAddresses = addresses.map((addr: any) => ({
          id: addr.id,
          type: addr.type,
          firstName: addr.first_name,
          lastName: addr.last_name,
          fullName: addr.full_name,
          street1: addr.street_address,
          street2: "", // No street_2 column in database
          city: addr.city,
          state: addr.state,
          zip: addr.zip_code,
          country: addr.country,
          phone: addr.phone || "",
          isDefault: !!addr.is_default,
        }));

        const defaultEmailPreferences = {
          marketing: false,
          orderUpdates: true,
          announcements: false,
        };

        let emailPreferences = defaultEmailPreferences;
        if (customer.email_preferences) {
          try {
            if (typeof customer.email_preferences === "string") {
              emailPreferences = JSON.parse(customer.email_preferences);
            } else if (typeof customer.email_preferences === "object") {
              emailPreferences =
                customer.email_preferences as typeof defaultEmailPreferences;
            }
          } catch (prefError) {
            console.warn(
              "[Auth] Failed to parse customer email preferences, using defaults:",
              prefError,
            );
            emailPreferences = defaultEmailPreferences;
          }
        }

        console.log("[Auth] Successfully fetched customer:", customer.id);
        return res.json({
          id: customer.id,
          firstName: customer.first_name,
          lastName: customer.last_name,
          name: customer.name,
          email: customer.email,
          phone: customer.phone || "",
          addresses: normalizedAddresses,
          emailPreferences,
          isActive: customer.is_active,
          createdAt: customer.created_at,
          lastLogin: customer.last_login,
        });
      } catch (queryError) {
        console.error("[Auth] Database query error:", queryError);
        throw queryError;
      }
    } catch (error) {
      console.error("Get current customer error:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      return res.status(500).json({
        error: "Failed to fetch customer profile",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  },
);

export default router;
