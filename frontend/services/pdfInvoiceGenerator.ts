/**
 * PDF Invoice Generator with Template Support
 * Generates professional invoices from template configuration
 */

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

export interface InvoiceTemplate {
  id: string;
  name: string;
  // Header Configuration
  headerImageUrl?: string;
  logoUrl?: string; // Logo image URL
  logoPosition?: "left" | "center" | "right"; // Logo alignment
  logoSize?: number; // Logo size in pixels (width)
  showCompanyInfo?: boolean; // Show company name, email, phone

  // Company Information
  companyName: string;
  companyEmail?: string;
  companyPhone?: string;
  companyAddress?: string;

  // Invoice Layout
  invoiceTitle: string;
  includeItems: boolean;
  includeTotals: boolean;
  includeCustomization?: boolean; // Include custom text, images, options

  // Sections Visibility
  showTrackingNumber?: boolean;
  showPaymentMethod?: boolean;
  showNotes?: boolean;

  // Footer
  footerText?: string;
  footerAlignment?: "left" | "center" | "right";

  // Styling
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  headerBackgroundColor?: string;
  headerTextColor?: string;
}

export interface InvoiceData {
  orderNumber: string;
  orderDate: string;
  storeName?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    total: number;
    selectedOptions?: string; // Formatted string of selected options
    customText?: string; // Custom engraving text
    customTextCost?: number;
    customization?: {
      type: "gallery" | "upload";
      value: string; // Image URL or data URL
      fileName?: string;
    };
    customImageCost?: number;
    optionsBreakdown?: Array<{
      label: string;
      priceDelta: number;
    }>;
  }>;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  trackingNumber?: string;
  paymentMethod?: string;
  notes?: string;
}

export const DEFAULT_TEMPLATE: InvoiceTemplate = {
  id: "default",
  name: "Professional Invoice",
  companyName: "Your Store",
  invoiceTitle: "INVOICE",
  includeItems: true,
  includeTotals: true,
  includeCustomization: true,
  showTrackingNumber: true,
  showPaymentMethod: true,
  showNotes: true,
  footerText: "Thank you for your business!",
  footerAlignment: "center",
  accentColor: "#0ea5e9",
  backgroundColor: "#ffffff",
  textColor: "#1e293b",
  borderColor: "#cbd5e1",
  logoPosition: "left",
  logoSize: 120,
  showCompanyInfo: true,
};

const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString();

export const generateInvoiceHTML = (
  invoice: InvoiceData,
  template: InvoiceTemplate = DEFAULT_TEMPLATE,
): string => {
  const watermarkText = invoice.storeName || "AdaptiveGIS";
  const watermarkLine = Array(6).fill(watermarkText).join("   ");

  // Header with logo and company info
  const headerHtml = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid ${template.accentColor}; background-color: ${template.headerBackgroundColor || template.backgroundColor};">
      <div style="flex: 1;">
        ${
          template.logoUrl
            ? `<div style="margin-bottom: 15px;"><img src="${template.logoUrl}" style="height: ${template.logoSize || 120}px; object-fit: contain;" alt="Logo" /></div>`
            : ""
        }
        ${
          template.showCompanyInfo !== false
            ? `
          <div style="color: ${template.textColor};">
            <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">${template.companyName}</div>
            ${template.companyAddress ? `<div style="font-size: 11px; margin-bottom: 3px;">${template.companyAddress}</div>` : ""}\n            ${template.companyEmail ? `<div style="font-size: 11px; margin-bottom: 3px;">${template.companyEmail}</div>` : ""}\n            ${template.companyPhone ? `<div style="font-size: 11px;">${template.companyPhone}</div>` : ""}\n          </div>\n        `
            : ""
        }
      </div>
      <div style="text-align: right; color: ${template.headerTextColor || template.textColor};">
        <div style="font-size: 36px; font-weight: bold; color: ${template.accentColor}; margin-bottom: 10px;">${template.invoiceTitle}</div>
      </div>
    </div>
  `;

  const itemsHtml = template.includeItems
    ? `
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
      <thead>
        <tr style="background-color: ${template.accentColor}; color: white;">
          <th style="padding: 12px; text-align: left; border: 1px solid ${template.borderColor};">Description</th>
          <th style="padding: 12px; text-align: right; border: 1px solid ${template.borderColor};">Quantity</th>
          <th style="padding: 12px; text-align: right; border: 1px solid ${template.borderColor};">Unit Price</th>
          <th style="padding: 12px; text-align: right; border: 1px solid ${template.borderColor};">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.items
          .map(
            (item, idx) => `
          <tr style="background-color: ${idx % 2 === 0 ? "#f8fafc" : "#ffffff"};">
            <td style="padding: 12px; border: 1px solid ${template.borderColor}; color: ${template.textColor};">
              <div style="font-weight: bold; margin-bottom: 4px;">${item.name}</div>
              ${item.selectedOptions ? `<div style="font-size: 11px; color: #64748b; margin-top: 4px;">${item.selectedOptions}</div>` : ""}
              ${item.optionsBreakdown && item.optionsBreakdown.length > 0 ? `<div style="font-size: 10px; color: #64748b; margin-top: 6px;">${item.optionsBreakdown.map((opt) => `${opt.label}: +${formatCurrency(opt.priceDelta)}`).join("<br/>")}</div>` : ""}
              ${item.customText ? `<div style="background: #f0f9ff; padding: 8px; margin-top: 6px; border-left: 3px solid ${template.accentColor}; font-size: 11px;"><strong style="color: #7c3aed;">Custom Text:</strong> "${item.customText}"${item.customTextCost ? ` (+${formatCurrency(item.customTextCost)})` : ""}</div>` : ""}
              ${
                item.customization
                  ? `<div style="background: #f0f9ff; padding: 8px; margin-top: 6px; border-left: 3px solid ${template.accentColor}; font-size: 11px;">
                <div style="margin-bottom: 6px;"><strong style="color: #0ea5e9;">${item.customization.type === "gallery" ? "Gallery Design" : "Uploaded Design"}:</strong> ${item.customization.fileName || "Custom Image"}${item.customImageCost ? ` (+${formatCurrency(item.customImageCost)})` : ""}</div>
                <div style="position: relative; width: 150px; height: 150px; border: 2px solid #cbd5e1; border-radius: 4px; overflow: hidden;">
                  <img src="${item.customization.value}" style="width: 100%; height: 100%; object-fit: cover; display: block;" crossorigin="anonymous" />
                  <div style="position: absolute; inset: 0; overflow: hidden; pointer-events: none;">
                    <div style="position: absolute; left: -35%; top: -20%; width: 170%; transform: rotate(-30deg); opacity: 0.35; color: #ffffff; font-size: 10px; font-weight: 700; text-shadow: 0 0 2px rgba(0,0,0,0.8); line-height: 1.7; white-space: nowrap;">
                      ${watermarkLine}<br/>${watermarkLine}<br/>${watermarkLine}<br/>${watermarkLine}<br/>${watermarkLine}
                    </div>
                  </div>
                </div>
              </div>`
                  : ""
              }
            </td>
            <td style="padding: 12px; text-align: right; border: 1px solid ${template.borderColor}; color: ${template.textColor};">${item.quantity}</td>
            <td style="padding: 12px; text-align: right; border: 1px solid ${template.borderColor}; color: ${template.textColor};">${formatCurrency(item.price)}</td>
            <td style="padding: 12px; text-align: right; border: 1px solid ${template.borderColor}; color: ${template.textColor}; font-weight: bold;">${formatCurrency(item.total)}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  `
    : "";

  const totalsHtml = template.includeTotals
    ? `
    <div style="display: flex; justify-content: flex-end; margin-bottom: 40px;">
      <table style="width: 300px;">
        <tr style="border: none;">
          <td style="padding: 8px 12px; text-align: right; font-weight: bold; color: ${template.textColor};">Subtotal:</td>
          <td style="padding: 8px 12px; text-align: right; color: ${template.textColor};">${formatCurrency(invoice.subtotal)}</td>
        </tr>
        <tr style="border: none;">
          <td style="padding: 8px 12px; text-align: right; font-weight: bold; color: ${template.textColor};">Tax:</td>
          <td style="padding: 8px 12px; text-align: right; color: ${template.textColor};">${formatCurrency(invoice.tax)}</td>
        </tr>
        <tr style="border: none;">
          <td style="padding: 8px 12px; text-align: right; font-weight: bold; color: ${template.textColor};">Shipping:</td>
          <td style="padding: 8px 12px; text-align: right; color: ${template.textColor};">${formatCurrency(invoice.shipping)}</td>
        </tr>
        <tr style="border-top: 2px solid ${template.accentColor}; font-weight: bold; font-size: 16px; color: ${template.accentColor};">
          <td style="padding: 12px; text-align: right;">Total:</td>
          <td style="padding: 12px; text-align: right;">${formatCurrency(invoice.total)}</td>
        </tr>
      </table>
    </div>
  `
    : "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Invoice ${invoice.orderNumber}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background: #f5f5f5;
        }
        .invoice {
          background: ${template.backgroundColor};
          max-width: 900px;
          margin: 0 auto;
          padding: 40px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .detail-label {
          font-weight: bold;
          color: ${template.textColor};
          margin-top: 10px;
          margin-bottom: 5px;
        }
        .detail-value {
          color: #475569;
        }
        .footer {
          text-align: ${template.footerAlignment || "center"};
          color: #94a3b8;
          font-size: 12px;
          border-top: 1px solid ${template.borderColor};
          padding-top: 20px;
          margin-top: 40px;
        }
      </style>
    </head>
    <body>
      <div class="invoice">
        ${headerHtml}

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px;">
          <div>
            <div class="detail-label">Invoice Number</div>
            <div class="detail-value">${invoice.orderNumber}</div>
            <div class="detail-label" style="margin-top: 15px;">Invoice Date</div>
            <div class="detail-value">${formatDate(invoice.orderDate)}</div>
          </div>
          <div>
            <div class="detail-label">Bill To</div>
            <div class="detail-value">
              <strong>${invoice.customerName}</strong><br/>
              ${invoice.customerEmail}<br/>
              ${invoice.customerPhone ? invoice.customerPhone + "<br/>" : ""}
              ${invoice.shippingAddress.street}<br/>
              ${invoice.shippingAddress.city}, ${invoice.shippingAddress.state} ${invoice.shippingAddress.zip}<br/>
              ${invoice.shippingAddress.country}
            </div>
          </div>
        </div>

        ${itemsHtml}
        ${totalsHtml}

        ${
          template.showTrackingNumber !== false && invoice.trackingNumber
            ? `
          <div style="margin-bottom: 20px;">
            <div class="detail-label">Tracking Number</div>
            <div class="detail-value">${invoice.trackingNumber}</div>
          </div>
        `
            : ""
        }

        ${
          template.showPaymentMethod !== false && invoice.paymentMethod
            ? `
          <div style="margin-bottom: 20px;">
            <div class="detail-label">Payment Method</div>
            <div class="detail-value">${invoice.paymentMethod}</div>
          </div>
        `
            : ""
        }

        ${
          template.showNotes !== false && invoice.notes
            ? `
          <div style="background: #f0f9ff; padding: 15px; border-left: 4px solid ${template.accentColor}; margin-bottom: 20px; color: #475569;">
            <strong>Notes:</strong><br/>
            ${invoice.notes}
          </div>
        `
            : ""
        }

        <div class="footer">
          <p>${template.footerText}</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const downloadInvoicePDF = async (
  invoice: InvoiceData,
  template: InvoiceTemplate = DEFAULT_TEMPLATE,
): Promise<void> => {
  const html = generateInvoiceHTML(invoice, template);

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.width = "900px";
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "pt", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgProps = pdf.getImageProperties(imgData);
    const imgWidth = pageWidth;
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

    let position = 0;
    let remainingHeight = imgHeight;
    while (remainingHeight > 0) {
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      remainingHeight -= pageHeight;
      if (remainingHeight > 0) {
        pdf.addPage();
        position -= pageHeight;
      }
    }

    pdf.save(`invoice-${invoice.orderNumber}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
};
