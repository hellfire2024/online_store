import { Router, Request, Response } from "express";
import nodemailer from "nodemailer";

const router = Router();

/**
 * Test SMTP Connection
 * POST /api/smtp-test
 * Body: { host, port, secure, user, password, from_email }
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { host, port, secure, user, password, from_email } = req.body;

    // Validate required fields
    if (!host || !port || !user || !password || !from_email) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: host, port, secure, user, password, from_email",
      });
    }

    console.log(`Testing SMTP connection to ${host}:${port}...`);

    // Create transport
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port),
      secure: secure === true || secure === "true",
      auth: {
        user,
        pass: password,
      },
      logger: true,
      debug: true,
    });

    // Test connection
    const verified = await transporter.verify();

    if (verified) {
      // Try sending a test email
      const mailOptions = {
        from: from_email,
        to: from_email,
        subject: "SMTP Test - Hostinger",
        text: "If you received this email, your SMTP configuration is working correctly!",
        html: "<p>If you received this email, your <strong>SMTP configuration is working correctly!</strong></p>",
      };

      const info = await transporter.sendMail(mailOptions);

      console.log("✅ SMTP test successful:", {
        connected: true,
        messageId: info.messageId,
        response: info.response,
      });

      return res.status(200).json({
        success: true,
        message: "SMTP connection verified and test email sent",
        details: {
          host,
          port,
          secure,
          connected: true,
          messageId: info.messageId,
          email_to: from_email,
        },
      });
    }

    return res.status(400).json({
      success: false,
      error: "SMTP connection failed - credentials invalid or server unreachable",
    });
  } catch (error: any) {
    console.error("❌ SMTP test error:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "SMTP test failed",
      details: {
        code: error.code,
        command: error.command,
      },
    });
  }
});

export default router;
