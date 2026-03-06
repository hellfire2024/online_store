import express, { Request, Response } from "express";
import { sendContactFormEmail } from "../services/emailService.js";

const router = express.Router();

interface ContactFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  targetEmail: string;
}

router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      subject,
      message,
      targetEmail,
    }: ContactFormData = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !subject || !message) {
      res.status(400).json({
        error: "Missing required fields",
        required: ["firstName", "lastName", "email", "subject", "message"],
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: "Invalid email format" });
      return;
    }

    // Determine target email - use provided targetEmail or default to admin
    const contactEmail = targetEmail || process.env.CONTACT_EMAIL || "noreply@adaptivegis.com";

    // Send email to the target address
    const emailResult = await sendContactFormEmail(
      contactEmail,
      email,
      firstName,
      lastName,
      subject,
      message,
      phone,
    );

    if (!emailResult.success) {
      res.status(500).json({
        error: "Failed to send contact form",
        message: emailResult.message,
      });
      return;
    }

    res.json({
      success: true,
      message: "Contact form submitted successfully",
    });
    return;
  } catch (error) {
    console.error("Error handling contact form submission:", error);
    res.status(500).json({
      error: "Failed to process contact form",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return;
  }
});

export default router;
