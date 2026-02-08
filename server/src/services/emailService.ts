import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { pool } from '../db/connection.js';
import { RowDataPacket } from 'mysql2';

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
  zoho_account_id: string | null;
  zoho_client_id: string | null;
  zoho_client_secret: string | null;
  zoho_refresh_token: string | null;
}

let transporter: nodemailer.Transporter | null = null;
let cachedConfig: EmailConfig | null = null;

async function loadEmailConfig() {
  try {
    const [rows] = await pool.query<EmailConfig[]>(
      'SELECT * FROM email_config WHERE id = 1'
    );
    
    if (rows.length === 0) {
      console.log('No email config found - email sending disabled');
      return null;
    }
    
    return rows[0];
  } catch (error) {
    console.error('Error loading email config:', error);
    return null;
  }
}

async function initializeTransporter() {
  try {
    const config = await loadEmailConfig();
    
    if (!config || config.provider === 'none') {
      console.log('Email provider not configured');
      return null;
    }

    if (config.provider === 'smtp') {
      if (!config.smtp_host || !config.smtp_port || !config.smtp_username || !config.smtp_password) {
        console.log('SMTP configuration incomplete');
        return null;
      }

      const transportOptions: SMTPTransport.Options = {
        host: config.smtp_host,
        port: config.smtp_port,
        secure: config.smtp_secure ?? false,
        auth: {
          user: config.smtp_username,
          pass: config.smtp_password,
        },
      };

      transporter = nodemailer.createTransport(transportOptions);
    } else if (config.provider === 'sendgrid') {
      const sgTransport = require('nodemailer-sendgrid-transport');
      transporter = nodemailer.createTransport(
        sgTransport({
          auth: {
            api_key: config.sendgrid_api_key,
          },
        })
      );
    } else if (config.provider === 'mailgun') {
      const mgTransport = require('nodemailer-mailgun-transport');
      transporter = nodemailer.createTransport(
        mgTransport({
          auth: {
            api_key: config.mailgun_api_key,
            domain: config.mailgun_domain,
          },
        })
      );
    } else if (config.provider === 'zoho') {
      // For Zoho, we'll use a custom transporter that calls the Zoho Mail API
      // This requires axios or similar for HTTP requests
      const { decryptData } = await import('../utils/encryption.js');
      
      const zohoClientId = config.zoho_client_id;
      const zohoClientSecret = config.zoho_client_secret
        ? decryptData(config.zoho_client_secret)
        : null;
      const zohoRefreshToken = config.zoho_refresh_token
        ? decryptData(config.zoho_refresh_token)
        : null;

      if (!zohoClientId || !zohoClientSecret) {
        console.log('Zoho Mail API configuration incomplete');
        return null;
      }

      // Create a custom nodemailer transport for Zoho Mail API
      transporter = nodemailer.createTransport({
        host: 'zoho-api',
        port: 1025,
        secure: false,
        // Custom fields for Zoho
        auth: {
          user: config.from_email,
          pass: zohoClientId,
        },
        // Store Zoho-specific config for use in sendMail
      } as any);

      // Attach Zoho config to transporter for use in sendMail
      (transporter as any).zohoConfig = {
        clientId: zohoClientId,
        clientSecret: zohoClientSecret,
        refreshToken: zohoRefreshToken,
        accountId: config.zoho_account_id,
      };
    }

    cachedConfig = config;
    return transporter;
  } catch (error) {
    console.error('Error initializing email transporter:', error);
    return null;
  }
}

/**
 * Send email via Zoho Mail API
 * Handles OAuth token refresh and sends email through Zoho API
 */
async function sendViaZohoApi(mailOptions: any): Promise<any> {
  try {
    if (!transporter || !(transporter as any).zohoConfig) {
      throw new Error('Zoho transporter not properly initialized');
    }

    const zohoConfig = (transporter as any).zohoConfig;
    const axios = await import('axios');
    const axiosInstance = axios.default;

    console.log('[Zoho Email] Requesting access token...');

    // Get access token
    const tokenResponse = await axiosInstance.post(
      'https://accounts.zoho.com/oauth/v2/token',
      new URLSearchParams({
        client_id: zohoConfig.clientId,
        client_secret: zohoConfig.clientSecret,
        refresh_token: zohoConfig.refreshToken,
        grant_type: 'refresh_token',
      }),
      { timeout: 10000 }
    );

    const accessToken = tokenResponse.data.access_token;
    console.log('[Zoho Email] Access token obtained');

    // Send email via Zoho Mail API
    console.log(
      `[Zoho Email] Sending email to ${mailOptions.to} via Zoho Mail API`
    );

    const emailResponse = await axiosInstance.post(
      `https://mail.zoho.com/api/accounts/${zohoConfig.accountId}/messages/send`,
      {
        fromAddress: mailOptions.from,
        toAddress: [mailOptions.to],
        subject: mailOptions.subject,
        htmlBody: mailOptions.html || mailOptions.text,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    console.log('[Zoho Email] Email sent successfully via Zoho API');
    return {
      messageId: emailResponse.data.data.messageId,
      success: true,
    };
  } catch (error: any) {
    console.error('[Zoho Email] Error sending email:', error);
    throw error;
  }
}

export async function sendOrderConfirmationEmail(
  customerEmail: string,
  customerName: string,
  orderNumber: string,
  orderDetails: any
) {
  try {
    const transport = transporter || (await initializeTransporter());
    if (!transport || !cachedConfig) {
      console.log('Email service not available - skipping order confirmation email');
      return { success: false, message: 'Email service not configured' };
    }

    const itemsHtml = orderDetails.items
      .map(
        (item: any) => {
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
              ${item.customization.fileName ? item.customization.fileName : 'Custom Design'} (${item.customization.type === 'gallery' ? 'Gallery Design' : 'Uploaded Design'})
            </p>
          </div>
        </td>
      </tr>`;
          }
          
          return itemHtml;
        }
      )
      .join('');

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

    let result;
    if (cachedConfig.provider === 'zoho') {
      result = await sendViaZohoApi({
        from: `${cachedConfig.from_name} <${cachedConfig.from_email}>`,
        to: customerEmail,
        subject: `Order Confirmation - ${orderNumber}`,
        html,
      });
    } else {
      result = await transport.sendMail({
        from: `${cachedConfig.from_name} <${cachedConfig.from_email}>`,
        to: customerEmail,
        subject: `Order Confirmation - ${orderNumber}`,
        html,
      });
    }


    console.log('Order confirmation email sent:', result);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    return { success: false, message: 'Failed to send email', error };
  }
}

export async function sendShippingNotificationEmail(
  customerEmail: string,
  customerName: string,
  orderNumber: string,
  trackingNumber: string,
  shipper: string,
  shippingUrl?: string
) {
  try {
    const transport = transporter || (await initializeTransporter());
    if (!transport || !cachedConfig) {
      console.log('Email service not available - skipping shipping notification email');
      return { success: false, message: 'Email service not configured' };
    }

    const trackingLink = shippingUrl ? `<p><a href="${shippingUrl}" class="button">Track Your Package</a></p>` : '';

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

    let result;
    if (cachedConfig.provider === 'zoho') {
      result = await sendViaZohoApi({
        from: `${cachedConfig.from_name} <${cachedConfig.from_email}>`,
        to: customerEmail,
        subject: `Your Order Has Been Shipped - ${orderNumber}`,
        html,
      });
    } else {
      result = await transport.sendMail({
        from: `${cachedConfig.from_name} <${cachedConfig.from_email}>`,
        to: customerEmail,
        subject: `Your Order Has Been Shipped - ${orderNumber}`,
        html,
      });
    }

    console.log('Shipping notification email sent:', result);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('Error sending shipping notification email:', error);
    return { success: false, message: 'Failed to send email', error };
  }
}

export async function sendTicketEmail(
  supportEmail: string,
  subject: string,
  ticketNumber: string,
  orderId: string | undefined,
  priority: string,
  message: string,
  customerInfo: { subject: string; date: string }
) {
  try {
    const transport = transporter || (await initializeTransporter());
    if (!transport || !cachedConfig) {
      console.log('Email service not available - skipping support ticket email');
      return { success: false, message: 'Email service not configured' };
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
            ${orderId ? `<p><strong>Order ID:</strong> ${orderId}</p>` : ''}
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

    let result;
    if (cachedConfig.provider === 'zoho') {
      result = await sendViaZohoApi({
        from: `${cachedConfig.from_name} <${cachedConfig.from_email}>`,
        to: supportEmail,
        subject: subject,
        html,
      });
    } else {
      result = await transport.sendMail({
        from: `${cachedConfig.from_name} <${cachedConfig.from_email}>`,
        to: supportEmail,
        subject: subject,
        html,
      });
    }

    console.log('Support ticket email sent:', result);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('Error sending support ticket email:', error);
    return { success: false, message: 'Failed to send email', error };
  }
}
