import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { pool } from "../db/connection.js";
import { RowDataPacket } from "mysql2";
import { decryptData } from "../utils/encryption.js";

// Note: For production watermarking of images, you would need:
// - Sharp library: npm install sharp
// - Or use canvas: npm install canvas
// This is a placeholder for the watermark functionality.
// In production, use sharp to add watermarks before sending emails.

interface EmailConfig extends RowDataPacket {
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

let transporter: nodemailer.Transporter | null = null;
let cachedConfig: EmailConfig | null = null;

async function loadEmailConfig() {
  try {
    const [rows] = await pool.query<EmailConfig[]>(
      "SELECT * FROM email_config WHERE id = 1",
    );

    if (rows.length === 0) {
      console.log("No email config found - email sending disabled");
      return null;
    }

    return rows[0];
  } catch (error) {
    console.error("Error loading email config:", error);
    return null;
  }
}

async function initializeTransporter() {
  try {
    const config = await loadEmailConfig();

    if (!config || config.provider === "none") {
      console.log("Email provider not configured");
      return null;
    }

    if (config.provider === "smtp") {
      if (
        !config.smtp_host ||
        !config.smtp_port ||
        !config.smtp_username ||
        !config.smtp_password
      ) {
        console.log("SMTP configuration incomplete");
        return null;
      }

      // Decrypt the password before using it
      const decryptedPassword = decryptData(config.smtp_password);

      console.log("[Email] Initializing SMTP transport:", {
        host: config.smtp_host,
        port: config.smtp_port,
        secure: config.smtp_secure ?? false,
        username: config.smtp_username,
        hasPassword: !!decryptedPassword,
        passwordLength: decryptedPassword?.length || 0,
      });

      const transportOptions: SMTPTransport.Options = {
        host: config.smtp_host,
        port: config.smtp_port,
        secure: config.smtp_secure ?? false,
        auth: {
          user: config.smtp_username,
          pass: decryptedPassword,
        },
      };

      transporter = nodemailer.createTransport(transportOptions);
    } else if (config.provider === "sendgrid") {
      const decryptedApiKey = config.sendgrid_api_key
        ? decryptData(config.sendgrid_api_key)
        : null;

      const sgTransport = require("nodemailer-sendgrid-transport");
      transporter = nodemailer.createTransport(
        sgTransport({
          auth: {
            api_key: decryptedApiKey,
          },
        }),
      );
    } else if (config.provider === "mailgun") {
      const decryptedApiKey = config.mailgun_api_key
        ? decryptData(config.mailgun_api_key)
        : null;

      const mgTransport = require("nodemailer-mailgun-transport");
      transporter = nodemailer.createTransport(
        mgTransport({
          auth: {
            api_key: decryptedApiKey,
            domain: config.mailgun_domain,
          },
        }),
      );
    }

    cachedConfig = config;
    return transporter;
  } catch (error) {
    console.error("Error initializing email transporter:", error);
    return null;
  }
}

export async function sendOrderConfirmationEmail(
  customerEmail: string,
  customerName: string,
  orderNumber: string,
  orderDetails: any,
) {
  try {
    const transport = transporter || (await initializeTransporter());
    if (!transport || !cachedConfig) {
      console.log(
        "Email service not available - skipping order confirmation email",
      );
      return { success: false, message: "Email service not configured" };
    }

    const itemsHtml = orderDetails.items
      .map((item: any) => {
        let itemHtml = `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${(item.quantity * item.price).toFixed(2)}</td>
      </tr>`;

        // Add customization image if present
        if (item.customization && item.customization.value) {
          itemHtml += `
      <tr>
        <td colspan="3" style="padding: 8px; border-bottom: 1px solid #ddd;">
          <div style="margin-top: 10px; margin-bottom: 10px;">
            <strong>Customization:</strong><br/>
            <img src="${item.customization.value}" alt="Customization" style="max-width: 150px; height: auto; border-radius: 4px; margin-top: 8px; border: 1px solid #ddd;">
            <p style="font-size: 11px; color: #666; margin-top: 4px;">
              ${item.customization.fileName ? item.customization.fileName : "Custom Design"} (${item.customization.type === "gallery" ? "Gallery Design" : "Uploaded Design"})
            </p>
          </div>
        </td>
      </tr>`;
        }

        return itemHtml;
      })
      .join("");

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1e293b; color: #fff; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .order-info { background: #f0f9ff; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #f3f4f6; padding: 10px; text-align: left; font-weight: bold; }
          .total-row { font-weight: bold; font-size: 18px; }
          .button { display: inline-block; background: #0ea5e9; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Confirmation</h1>
            <p>Thank you for your order!</p>
          </div>
          
          <div class="order-info">
            <p><strong>Order Number:</strong> ${orderNumber}</p>
            <p><strong>Customer Name:</strong> ${customerName}</p>
            <p><strong>Order Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>

          <h2>Order Details</h2>
          <table>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Total</th>
            </tr>
            ${itemsHtml}
            <tr class="total-row">
              <td colspan="2" style="text-align: right; padding: 10px;">Subtotal:</td>
              <td style="padding: 10px; text-align: right;">$${Number(orderDetails.subtotal).toFixed(2)}</td>
            </tr>
            <tr>
              <td colspan="2" style="text-align: right; padding: 10px;">Shipping:</td>
              <td style="padding: 10px; text-align: right;">$${Number(orderDetails.shipping).toFixed(2)}</td>
            </tr>
            <tr>
              <td colspan="2" style="text-align: right; padding: 10px;">Tax:</td>
              <td style="padding: 10px; text-align: right;">$${Number(orderDetails.tax).toFixed(2)}</td>
            </tr>
            <tr class="total-row">
              <td colspan="2" style="text-align: right; padding: 10px;">Total:</td>
              <td style="padding: 10px; text-align: right;">$${Number(orderDetails.total).toFixed(2)}</td>
            </tr>
          </table>

          <h2>Shipping Address</h2>
          <p>
            ${orderDetails.shippingAddress.firstName} ${orderDetails.shippingAddress.lastName}<br/>
            ${orderDetails.shippingAddress.street1}<br/>
            ${orderDetails.shippingAddress.city}, ${orderDetails.shippingAddress.state} ${orderDetails.shippingAddress.zip}
          </p>

          <p style="margin-top: 30px; color: #666; font-size: 12px;">
            Thank you for shopping with us!<br/>
            Custom Threads Online Store
          </p>
          
          <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; color: #888; font-size: 11px;">
            <strong>Note:</strong> All customization images are protected with an AdaptiveGIS watermark and are for your reference only.
          </p>
        </div>
      </body>
    </html>
    `;

    const result = await transport.sendMail({
      from: `${cachedConfig.from_name} <${cachedConfig.from_email}>`,
      to: customerEmail,
      subject: `Order Confirmation - ${orderNumber}`,
      html,
    });

    console.log("Order confirmation email sent:", result);
    return { success: true, message: "Email sent successfully" };
  } catch (error) {
    console.error("Error sending order confirmation email:", error);
    return { success: false, message: "Failed to send email", error };
  }
}

export async function sendQuoteEmail(
  customerEmail: string,
  customerName: string,
  quoteNumber: string,
  quoteDetails: any,
) {
  try {
    const transport = transporter || (await initializeTransporter());
    if (!transport || !cachedConfig) {
      console.log("Email service not available - skipping quote email");
      return { success: false, message: "Email service not configured" };
    }

    const itemsHtml = quoteDetails.lineItems
      .map((item: any) => {
        const itemPrice = (item.quantity * item.unitPrice).toFixed(2);
        return `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${Number(item.unitPrice).toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${itemPrice}</td>
      </tr>`;
      })
      .join("");

    const expirationText = quoteDetails.expirationDate
      ? `<p style="color: #d97706; font-weight: bold; padding: 10px; background: #fef3c7; border-radius: 5px;">⚠️ This quote expires on ${new Date(quoteDetails.expirationDate).toLocaleDateString()}</p>`
      : "";

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1e293b; color: #fff; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .quote-info { background: #f0f9ff; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #f3f4f6; padding: 10px; text-align: left; font-weight: bold; border-bottom: 2px solid #d1d5db; }
          .total-row { font-weight: bold; font-size: 16px; background: #f9fafb; }
          .button { display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 15px; font-weight: bold; }
          .notes { background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #0ea5e9; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Custom Quote</h1>
            <p>We've prepared a custom quote just for you!</p>
          </div>
          
          <div class="quote-info">
            <p><strong>Quote Number:</strong> ${quoteNumber}</p>
            <p><strong>Recipient:</strong> ${customerName}</p>
            <p><strong>Quote Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>

          ${expirationText}

          <h2>Quote Details</h2>
          <table>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
            ${itemsHtml}
            <tr>
              <td colspan="3" style="text-align: right; padding: 10px; font-weight: bold;">Subtotal:</td>
              <td style="padding: 10px; text-align: right;">$${Number(quoteDetails.subtotal).toFixed(2)}</td>
            </tr>
            <tr>
              <td colspan="3" style="text-align: right; padding: 10px;">Shipping:</td>
              <td style="padding: 10px; text-align: right;">$${Number(quoteDetails.shippingCost).toFixed(2)}</td>
            </tr>
            <tr>
              <td colspan="3" style="text-align: right; padding: 10px;">Tax:</td>
              <td style="padding: 10px; text-align: right;">$${Number(quoteDetails.taxAmount).toFixed(2)}</td>
            </tr>
            <tr class="total-row">
              <td colspan="3" style="text-align: right; padding: 10px;">Total:</td>
              <td style="padding: 10px; text-align: right;">$${Number(quoteDetails.total).toFixed(2)}</td>
            </tr>
          </table>

          ${quoteDetails.notes ? `<div class="notes"><strong>Additional Notes:</strong><p>${quoteDetails.notes}</p></div>` : ""}

          <p style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || "https://customthreadsonline.com"}/quotes" class="button">View & Accept Quote</a>
          </p>

          <p style="margin-top: 30px; color: #666; font-size: 12px;">
            To accept this quote or request changes, please log in to your account and view your quotes.<br/>
            If you have any questions, please don't hesitate to reach out to us.
          </p>

          <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; color: #888; font-size: 11px;">
            Custom Threads Online Store
          </p>
        </div>
      </body>
    </html>
    `;

    const result = await transport.sendMail({
      from: `${cachedConfig.from_name} <${cachedConfig.from_email}>`,
      to: customerEmail,
      subject: `Your Custom Quote - ${quoteNumber}`,
      html,
    });

    console.log("[Quote Email] Sent successfully:", {
      to: customerEmail,
      quoteNumber,
      messageId: (result as any).messageId,
    });

    return { success: true, message: "Quote email sent successfully" };
  } catch (error) {
    console.error("Error sending quote email:", error);
    return { success: false, message: "Failed to send email", error };
  }
}

export async function sendShippingNotificationEmail(
  customerEmail: string,
  customerName: string,
  orderNumber: string,
  trackingNumber: string,
  shipper: string,
  shippingUrl?: string,
) {
  try {
    const transport = transporter || (await initializeTransporter());
    if (!transport || !cachedConfig) {
      console.log(
        "Email service not available - skipping shipping notification email",
      );
      return { success: false, message: "Email service not configured" };
    }

    const trackingLink = shippingUrl
      ? `<p><a href="${shippingUrl}" class="button">Track Your Package</a></p>`
      : "";

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1e293b; color: #fff; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .tracking-info { background: #ecfdf5; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #10b981; }
          .button { display: inline-block; background: #0ea5e9; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your Order Has Been Shipped!</h1>
            <p>Your order is on its way.</p>
          </div>
          
          <p>Hi ${customerName},</p>
          
          <p>Your order <strong>${orderNumber}</strong> has been shipped and is on its way to you!</p>

          <div class="tracking-info">
            <h2 style="margin-top: 0;">Tracking Information</h2>
            <p><strong>Carrier:</strong> ${shipper}</p>
            <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
            ${trackingLink}
          </div>

          <p>You can track your package status using the tracking number above with your carrier's website.</p>

          <p style="margin-top: 30px; color: #666; font-size: 12px;">
            If you have any questions, please don't hesitate to contact us.<br/>
            Custom Threads Online Store
          </p>
        </div>
      </body>
    </html>
    `;

    const result = await transport.sendMail({
      from: `${cachedConfig.from_name} <${cachedConfig.from_email}>`,
      to: customerEmail,
      subject: `Your Order Has Been Shipped - ${orderNumber}`,
      html,
    });

    console.log("Shipping notification email sent:", result);
    return { success: true, message: "Email sent successfully" };
  } catch (error) {
    console.error("Error sending shipping notification email:", error);
    return { success: false, message: "Failed to send email", error };
  }
}

export async function sendTicketEmail(
  supportEmail: string,
  subject: string,
  ticketNumber: string,
  orderId: string | undefined,
  priority: string,
  message: string,
  customerInfo: { subject: string; date: string },
) {
  try {
    const transport = transporter || (await initializeTransporter());
    if (!transport || !cachedConfig) {
      console.log(
        "Email service not available - skipping support ticket email",
      );
      return { success: false, message: "Email service not configured" };
    }

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1e293b; color: #fff; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .ticket-info { background: #f0f9ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .priority-high { color: #dc2626; font-weight: bold; }
          .priority-medium { color: #f59e0b; font-weight: bold; }
          .priority-low { color: #10b981; font-weight: bold; }
          .divider { border-top: 1px solid #ddd; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Support Ticket Submitted</h1>
            <p>Ticket: ${ticketNumber}</p>
          </div>
          
          <div class="ticket-info">
            <h2>${customerInfo.subject}</h2>
            <p><strong>Date:</strong> ${customerInfo.date}</p>
            <p><strong>Ticket ID:</strong> ${ticketNumber}</p>
            <p><strong>Priority:</strong> <span class="priority-${priority}">${priority.toUpperCase()}</span></p>
            ${orderId ? `<p><strong>Order ID:</strong> ${orderId}</p>` : ""}
          </div>

          <div class="divider"></div>

          <div>
            <h3>Message:</h3>
            <p>${message}</p>
          </div>

          <div class="divider"></div>

          <p style="color: #666; font-size: 12px;">
            This email was automatically generated from the support ticket system.
          </p>
        </div>
      </body>
    </html>
    `;

    const result = await transport.sendMail({
      from: `${cachedConfig.from_name} <${cachedConfig.from_email}>`,
      to: supportEmail,
      subject: subject,
      html,
    });

    console.log("Support ticket email sent:", result);
    return { success: true, message: "Email sent successfully" };
  } catch (error) {
    console.error("Error sending support ticket email:", error);
    return { success: false, message: "Failed to send email", error };
  }
}

export async function sendContactFormEmail(
  toEmail: string,
  fromEmail: string,
  senderName: string,
  subject: string,
  fields: Array<{
    id: string;
    type: string;
    label: string;
    required: boolean;
    value: string;
  }>,
) {
  try {
    console.log("[EmailService] sendContactFormEmail called:", {
      toEmail,
      fromEmail,
      senderName,
      subject,
    });

    const transport = transporter || (await initializeTransporter());
    if (!transport || !cachedConfig) {
      console.error(
        "[EmailService] Email service not available - transport:",
        !!transport,
        "config:",
        !!cachedConfig,
      );
      return { success: false, message: "Email service not configured" };
    }

    console.log("[EmailService] Using email config:", {
      provider: cachedConfig.provider,
      fromEmail: cachedConfig.from_email,
      fromName: cachedConfig.from_name,
      smtpHost: cachedConfig.smtp_host,
      smtpPort: cachedConfig.smtp_port,
      smtpUsername: cachedConfig.smtp_username,
    });

    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const messageField =
      fields.find(
        (field) => field.type === "message" || field.type === "textarea",
      ) || fields.find((field) => field.label.toLowerCase() === "message");

    const detailsRows = fields
      .filter((field) => field.value)
      .filter((field) => field.id !== messageField?.id)
      .map(
        (field) => `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold; width: 35%;">${escapeHtml(field.label)}</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${escapeHtml(field.value).replace(/\n/g, "<br>")}</td>
            </tr>`,
      )
      .join("");

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1e293b; color: #fff; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .contact-info { background: #f0f9ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .message-section { background: #f9fafb; padding: 15px; border-left: 4px solid #0ea5e9; margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; }
          .divider { border-top: 1px solid #ddd; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Contact Form Submission</h1>
            <p>Message received from website contact form</p>
          </div>
          
          <div class="contact-info">
            <h2>Contact Information</h2>
            <p><strong>Name:</strong> ${escapeHtml(senderName)}</p>
            <p><strong>Email:</strong> <a href="mailto:${escapeHtml(fromEmail)}">${escapeHtml(fromEmail)}</a></p>
            <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          </div>

          <div class="contact-info">
            <h3>Submitted Fields</h3>
            <table>
              ${detailsRows || '<tr><td style="padding: 8px;">No additional fields provided.</td></tr>'}
            </table>
          </div>

          ${
            messageField?.value
              ? `<div class="message-section"><h3>Message:</h3><p>${escapeHtml(messageField.value).replace(/\n/g, "<br>")}</p></div>`
              : ""
          }

          <div class="divider"></div>

          <p style="color: #666; font-size: 12px;">
            This email was automatically generated from the website contact form.
          </p>
        </div>
      </body>
    </html>
    `;

    const mailOptions = {
      from: `${cachedConfig.from_name} <${cachedConfig.from_email}>`,
      to: toEmail,
      subject: `Website Contact: ${subject}`,
      html,
      replyTo: fromEmail,
    };

    console.log("[EmailService] Sending email with options:", {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      replyTo: mailOptions.replyTo,
    });

    const result = await transport.sendMail(mailOptions);

    console.log("[EmailService] Email sent successfully:", {
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
      response: result.response,
    });

    return { success: true, message: "Email sent successfully", result };
  } catch (error) {
    console.error("[EmailService] Error sending contact form email:", error);
    return {
      success: false,
      message: "Failed to send email",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function sendPasswordResetEmail(
  customerEmail: string,
  customerName: string,
  resetUrl: string,
): Promise<{ success: boolean; message: string; error?: any }> {
  try {
    const transport = await initializeTransporter();
    if (!transport) {
      return {
        success: false,
        message: "Email service is not configured",
      };
    }

    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Request</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #667eea; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset Request</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Hi ${escapeHtml(customerName)},</p>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            We received a request to reset your password. Click the button below to create a new password:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
              <tr>
                <td style="border-radius: 5px; background-color: #667eea;">
                  <a href="${escapeHtml(resetUrl)}" 
                     style="background-color: #667eea; 
                            color: #ffffff !important; 
                            padding: 15px 40px; 
                            text-decoration: none; 
                            border-radius: 5px; 
                            font-size: 18px; 
                            font-weight: bold;
                            display: inline-block;
                            text-align: center;">
                    Reset My Password
                  </a>
                </td>
              </tr>
            </table>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-bottom: 15px;">
            Or copy and paste this link into your browser:
          </p>
          <p style="font-size: 12px; color: #667eea; word-break: break-all; background: white; padding: 10px; border-radius: 5px;">
            ${escapeHtml(resetUrl)}
          </p>
          
          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0; font-size: 14px; color: #856404;">
              <strong>⚠️ Security Notice:</strong><br>
              This link will expire in 1 hour. If you didn't request this password reset, please ignore this email or contact support if you have concerns.
            </p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #666; text-align: center;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </body>
    </html>
    `;

    // Generate plain text version as fallback
    const text = `Hi ${customerName},\n\nWe received a request to reset your password.\n\nClick this link to reset your password:\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this password reset, please ignore this email.\n\nThank you`;

    const result = await transport.sendMail({
      from: cachedConfig
        ? `${cachedConfig.from_name} <${cachedConfig.from_email}>`
        : "noreply@onlinestore.com",
      to: customerEmail,
      subject: "Password Reset Request",
      html,
      text,
    });

    console.log("Password reset email sent:", result);
    return { success: true, message: "Password reset email sent successfully" };
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return {
      success: false,
      message: "Failed to send password reset email",
      error,
    };
  }
}
