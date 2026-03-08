import express, { Request, Response } from "express";
import { sendContactFormEmail } from "../services/emailService.js";

const router = express.Router();

interface ContactFormData {
  subject: string;
  fields: Array<{
    id: string;
    type: string;
    label: string;
    required: boolean;
    value: string;
  }>;
  targetEmail?: string;
}

interface NormalizedContactField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  value: string;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeField = (
  field: ContactFormData["fields"][number],
): NormalizedContactField => ({
  id: String(field.id || ""),
  type: String(field.type || "text"),
  label: String(field.label || field.id || "Field"),
  required: Boolean(field.required),
  value: String(field.value ?? "").trim(),
});

const findPrimaryEmail = (
  fields: NormalizedContactField[],
): string | undefined => {
  const emailByType = fields.find(
    (field) => field.type === "email" && emailRegex.test(field.value),
  )?.value;
  if (emailByType) {
    return emailByType;
  }

  const emailByLabel = fields.find(
    (field) =>
      field.label.toLowerCase().includes("email") &&
      emailRegex.test(field.value),
  )?.value;

  return emailByLabel;
};

const buildSenderName = (fields: NormalizedContactField[]): string => {
  const fullName = fields.find((field) => field.type === "fullName")?.value;
  if (fullName) {
    return fullName;
  }

  const firstName = fields.find((field) => field.type === "firstName")?.value;
  const lastName = fields.find((field) => field.type === "lastName")?.value;
  const joinedName = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (joinedName) {
    return joinedName;
  }

  const genericName = fields.find(
    (field) => field.label.toLowerCase().includes("name") && field.value,
  )?.value;

  return genericName || "Website Visitor";
};

router.post("/", async (req: Request, res: Response) => {
  try {
    const { subject, fields, targetEmail }: ContactFormData = req.body;

    if (!subject || !String(subject).trim()) {
      res.status(400).json({
        error: "Invalid form submission",
        message: "Subject is required",
      });
      return;
    }

    if (!Array.isArray(fields) || fields.length === 0) {
      res.status(400).json({
        error: "Invalid form submission",
        message: "No form fields were provided",
      });
      return;
    }

    const normalizedFields = fields.map(normalizeField);

    const missingRequired = normalizedFields
      .filter((field) => field.required && !field.value)
      .map((field) => field.label);

    if (missingRequired.length > 0) {
      res.status(400).json({
        error: "Missing required fields",
        required: missingRequired,
      });
      return;
    }

    const senderEmail = findPrimaryEmail(normalizedFields);
    if (!senderEmail) {
      res.status(400).json({
        error: "Invalid email format",
        message: "A valid email field is required in the configured form",
      });
      return;
    }

    const senderName = buildSenderName(normalizedFields);
    const contactEmail =
      targetEmail || process.env.CONTACT_EMAIL || "tgaunt@adaptivegis.com";

    console.log("[Contact Form] Processing submission:", {
      toEmail: contactEmail,
      fromEmail: senderEmail,
      fromName: senderName,
      subject: subject,
      targetEmailParam: targetEmail,
      envContactEmail: process.env.CONTACT_EMAIL,
      fieldCount: normalizedFields.length,
    });

    const emailResult = await sendContactFormEmail(
      contactEmail,
      senderEmail,
      senderName,
      subject,
      normalizedFields,
    );

    console.log("[Contact Form] Email send result:", {
      success: emailResult.success,
      message: emailResult.message,
      error: emailResult.error,
    });

    if (!emailResult.success) {
      console.error("[Contact Form] Failed to send email:", emailResult);
      res.status(500).json({
        error: "Failed to send contact form",
        message: emailResult.message,
        details: emailResult.error?.toString() || "No additional details",
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
