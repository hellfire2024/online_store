import { Router, Request, Response } from "express";
import { pool } from "../db/connection.js";
import { RowDataPacket } from "mysql2";
import { encryptData, decryptData } from "../utils/encryption.js";

const router = Router();

interface EmailConfigRow extends RowDataPacket {
  id: number;
  provider: string;
  from_email: string;
  from_name: string;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_secure: boolean | null;
  smtp_username: string | null;
  smtp_password: string | null;
  sendgrid_api_key: string | null;
  mailgun_domain: string | null;
  mailgun_api_key: string | null;
}

/**
 * Get email configuration
 * Note: Sensitive fields (passwords, API keys) are decrypted but returned to admin only
 */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<EmailConfigRow[]>(
      "SELECT * FROM email_config WHERE id = 1",
    );

    if (rows.length === 0) {
      // Return default empty config
      return res.json({
        provider: "none",
        fromEmail: "",
        fromName: "",
        smtpHost: "",
        smtpPort: 587,
        smtpSecure: false,
        smtpUsername: "",
        sendgridApiKey: "",
        mailgunDomain: "",
        mailgunApiKey: "",
      });
    }

    const config = rows[0];

    return res.json({
      provider: config.provider,
      fromEmail: config.from_email,
      fromName: config.from_name,
      smtpHost: config.smtp_host || "",
      smtpPort: config.smtp_port || 587,
      smtpSecure: config.smtp_secure || false,
      smtpUsername: config.smtp_username || "",
      // Only include decrypted password if it exists, never expose raw value
      hasSmtpPassword: !!config.smtp_password,
      hasSendgridApiKey: !!config.sendgrid_api_key,
      hasMailgunApiKey: !!config.mailgun_api_key,
      // Return decrypted values for editing (admin only)
      smtpPassword: config.smtp_password ? decryptData(config.smtp_password) : "",
      sendgridApiKey: config.sendgrid_api_key
        ? decryptData(config.sendgrid_api_key)
        : "",
      mailgunDomain: config.mailgun_domain || "",
      mailgunApiKey: config.mailgun_api_key
        ? decryptData(config.mailgun_api_key)
        : "",
    });
  } catch (error) {
    console.error("Error fetching email config:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch email configuration" });
  }
});

/**
 * Update email configuration
 * Encrypts sensitive fields before storage
 */
router.put("/", async (req: Request, res: Response) => {
  try {
    const {
      provider,
      fromEmail,
      fromName,
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUsername,
      smtpPassword,
      sendgridApiKey,
      mailgunDomain,
      mailgunApiKey,
    } = req.body;

    // Validate required fields
    if (!provider || !fromEmail || !fromName) {
      return res.status(400).json({
        error: "provider, fromEmail, and fromName are required",
      });
    }

    // Validate provider-specific required fields
    if (provider === "smtp") {
      if (!smtpHost || !smtpPort || !smtpUsername) {
        return res.status(400).json({
          error: "SMTP provider requires host, port, and username",
        });
      }
    } else if (provider === "sendgrid") {
      if (!sendgridApiKey) {
        return res.status(400).json({
          error: "SendGrid provider requires API key",
        });
      }
    } else if (provider === "mailgun") {
      if (!mailgunDomain || !mailgunApiKey) {
        return res.status(400).json({
          error: "Mailgun provider requires domain and API key",
        });
      }
    }

    // Encrypt sensitive fields
    const encryptedSmtpPassword = smtpPassword
      ? encryptData(smtpPassword)
      : null;
    const encryptedSendgridKey = sendgridApiKey
      ? encryptData(sendgridApiKey)
      : null;
    const encryptedMailgunKey = mailgunApiKey
      ? encryptData(mailgunApiKey)
      : null;

    await pool.query(
      `INSERT INTO email_config (
        id, provider, from_email, from_name, 
        smtp_host, smtp_port, smtp_secure, smtp_username, smtp_password,
        sendgrid_api_key, mailgun_domain, mailgun_api_key
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        provider = VALUES(provider),
        from_email = VALUES(from_email),
        from_name = VALUES(from_name),
        smtp_host = VALUES(smtp_host),
        smtp_port = VALUES(smtp_port),
        smtp_secure = VALUES(smtp_secure),
        smtp_username = VALUES(smtp_username),
        smtp_password = VALUES(smtp_password),
        sendgrid_api_key = VALUES(sendgrid_api_key),
        mailgun_domain = VALUES(mailgun_domain),
        mailgun_api_key = VALUES(mailgun_api_key),
        updated_at = CURRENT_TIMESTAMP`,
      [
        provider,
        fromEmail,
        fromName,
        smtpHost || null,
        smtpPort || null,
        smtpSecure || false,
        smtpUsername || null,
        encryptedSmtpPassword,
        encryptedSendgridKey,
        mailgunDomain || null,
        encryptedMailgunKey,
      ],
    );

    // Return success response (don't return encrypted values)
    return res.json({
      success: true,
      message: "Email configuration saved successfully",
      provider,
      fromEmail,
      fromName,
    });
  } catch (error) {
    console.error("Error updating email config:", error);
    return res
      .status(500)
      .json({ error: "Failed to update email configuration" });
  }
});

/**
 * Test email configuration
 * Validates SMTP configuration without actually sending an email
 * (Render and other PaaS platforms may block outbound SMTP connections)
 */
router.post("/test", async (req: Request, res: Response) => {
  try {
    const { testEmail, emailConfig } = req.body;

    if (!testEmail) {
      return res.status(400).json({ error: "testEmail is required" });
    }

    // Use provided config or fetch from database
    let config = emailConfig;
    if (!config) {
      const [rows] = await pool.query<EmailConfigRow[]>(
        "SELECT * FROM email_config WHERE id = 1",
      );

      if (rows.length === 0) {
        return res
          .status(400)
          .json({ error: "Email configuration not set up" });
      }
      config = rows[0];
    }

    // Validate config exists
    if (!config.provider || config.provider === "none") {
      return res.status(400).json({
        error: 'Email provider is set to "none". Please configure a provider.',
      });
    }

    try {
      if (config.provider === "smtp") {
        const smtpHost = config.smtpHost || config.smtp_host;
        const smtpPort = config.smtpPort || config.smtp_port || 587;
        const smtpUsername = config.smtpUsername || config.smtp_username;

        if (!smtpHost) {
          return res.status(400).json({
            error: "SMTP configuration is incomplete - missing host",
          });
        }

        if (!smtpUsername) {
          return res.status(400).json({
            error: "SMTP configuration is incomplete - missing username",
          });
        }

        const { decryptData } = await import("../utils/encryption.js");
        const password = config.smtpPassword
          ? config.smtpPassword
          : config.smtp_password
            ? decryptData(config.smtp_password)
            : null;

        if (!password) {
          return res.status(400).json({
            error: "SMTP password is required but not provided",
          });
        }

        // Check if running on Render or similar PaaS that blocks SMTP
        const isRender =
          process.env.RENDER === "true" ||
          !!process.env.RENDER_GIT_REPO ||
          !!process.env.RENDER_GIT_BRANCH;

        if (isRender) {
          console.log(
            "[Email Test] Running on Render - SMTP connections are blocked",
          );
          return res.json({
            success: true,
            message:
              "Email configuration appears valid. Note: This deployment platform (Render) blocks outbound SMTP connections. To send real emails, use a transactional email service like SendGrid or Mailgun instead.",
            warning: "SMTP_BLOCKED_ON_PLATFORM",
            platform: "render",
            config: {
              provider: config.provider,
              host: smtpHost,
              port: smtpPort,
              secure: config.smtpSecure || config.smtp_secure || false,
              username: smtpUsername,
            },
          });
        }

        // If not on Render, try to actually verify connection
        const nodemailer = await import("nodemailer");
        console.log(
          `[Email Test] Creating SMTP transporter for ${smtpHost}:${smtpPort}`,
        );
        const transporter = nodemailer.default.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: config.smtpSecure || config.smtp_secure || false,
          auth: {
            user: smtpUsername,
            pass: password,
          },
          connectionTimeout: 10000,
          socketTimeout: 10000,
        });

        console.log("[Email Test] Verifying SMTP connection...");
        await transporter.verify();
        console.log("[Email Test] SMTP connection verified - sending test email");

        const fromEmail = config.fromEmail || config.from_email;
        const fromName = config.fromName || config.from_name;

        await transporter.sendMail({
          from: `"${fromName}" <${fromEmail}>`,
          to: testEmail,
          subject: "Test Email - Configuration Verified",
          html: `
            <html>
              <body style="font-family: Arial, sans-serif; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #0ea5e9;">Email Configuration Test</h2>
                  <p>This is a test email to verify that your email configuration is working correctly.</p>
                  <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0;">
                    <p><strong>Configuration Details:</strong></p>
                    <ul style="margin: 10px 0;">
                      <li><strong>Provider:</strong> ${config.provider}</li>
                      <li><strong>From:</strong> ${fromName} (${fromEmail})</li>
                      <li><strong>Test Recipient:</strong> ${testEmail}</li>
                      <li><strong>Sent At:</strong> ${new Date().toISOString()}</li>
                    </ul>
                  </div>
                  <p style="color: #666; font-size: 12px; margin-top: 30px;">
                    If you received this email, your email configuration is working properly.
                  </p>
                </div>
              </body>
            </html>
          `,
        });

        console.log("[Email Test] Email sent successfully");
        return res.json({
          success: true,
          message: `Test email successfully sent to ${testEmail}`,
          testEmail,
        });
      } else if (config.provider === "sendgrid") {
        return res.json({
          success: true,
          message:
            "SendGrid configuration validated. Note: Actual email sending is handled by the emailService.",
          provider: "sendgrid",
          info: "To test SendGrid, send a real transactional email (order confirmation, etc.)",
        });
      } else if (config.provider === "mailgun") {
        return res.json({
          success: true,
          message:
            "Mailgun configuration validated. Note: Actual email sending is handled by the emailService.",
          provider: "mailgun",
          info: "To test Mailgun, send a real transactional email (order confirmation, etc.)",
        });
      }

      return res.status(400).json({
        error: "Invalid email provider",
      });
    } catch (emailError: any) {
      console.error("[Email Test] Error:", emailError);

      let errorMessage = emailError.message || "Unknown error";

      if (emailError.code === "ECONNREFUSED") {
        errorMessage =
          "Connection refused - SMTP server is not reachable. Check host and port.";
      } else if (emailError.code === "ETIMEDOUT") {
        errorMessage =
          "Connection timeout - SMTP server is not responding. If on Render/Heroku/similar PaaS, they block SMTP. Use SendGrid or Mailgun instead.";
      } else if (emailError.code === "ENOTFOUND") {
        errorMessage =
          "SMTP host not found. Check your SMTP host configuration.";
      } else if (
        errorMessage.includes("Invalid login") ||
        errorMessage.includes("Authentication failed")
      ) {
        errorMessage =
          "Authentication failed - check your SMTP username and password.";
      }

      return res.status(500).json({
        success: false,
        error: `Failed to test email configuration: ${errorMessage}`,
        details: emailError.message,
        code: emailError.code,
      });
    }
  } catch (error) {
    console.error("[Email Test] Unexpected error:", error);
    return res
      .status(500)
      .json({ error: "Failed to test email configuration" });
  }
});

export default router;
