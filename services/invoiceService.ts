/**
 * Invoice generation service
 * Provides utilities for generating and formatting invoice data
 */

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

export interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
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
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  trackingNumber?: string;
  paymentMethod?: string;
  notes?: string;
}

export const DEFAULT_INVOICE_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice {{orderNumber}}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .invoice { background: white; max-width: 900px; margin: 0 auto; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; border-bottom: 2px solid #0ea5e9; padding-bottom: 20px; }
    .company-name { font-size: 28px; font-weight: bold; color: #1e293b; }
    .invoice-title { font-size: 24px; font-weight: bold; color: #0ea5e9; }
    .invoice-details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
    .detail-label { font-weight: bold; color: #1e293b; margin-top: 10px; margin-bottom: 5px; }
    .detail-value { color: #475569; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #e2e8f0; padding: 12px; text-align: left; font-weight: bold; color: #1e293b; border: 1px solid #cbd5e1; }
    td { padding: 12px; border: 1px solid #cbd5e1; color: #475569; }
    tr:nth-child(even) { background: #f8fafc; }
    .text-right { text-align: right; }
    .totals-section { display: flex; justify-content: flex-end; margin-bottom: 40px; }
    .totals-table { width: 300px; }
    .total-row { border: none; }
    .total-row td { border: none; padding: 8px 12px; }
    .total-row .label { font-weight: bold; color: #1e293b; }
    .total-row.final { border-top: 2px solid #0ea5e9; font-weight: bold; font-size: 16px; color: #0ea5e9; }
    .notes { background: #f0f9ff; padding: 15px; border-left: 4px solid #0ea5e9; margin-bottom: 20px; color: #475569; }
    .footer { text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div class="company-name">{{storeName}}</div>
      <div class="invoice-title">INVOICE</div>
    </div>

    <div class="invoice-details">
      <div>
        <div class="detail-label">Invoice Number</div>
        <div class="detail-value">{{orderNumber}}</div>
        <div class="detail-label" style="margin-top: 15px;">Invoice Date</div>
        <div class="detail-value">{{orderDate}}</div>
      </div>
      <div>
        <div class="detail-label">Bill To</div>
        <div class="detail-value">
          <strong>{{customerName}}</strong><br/>
          {{customerEmail}}<br/>
          {{customerPhone}}
          {{shippingStreet}}<br/>
          {{shippingCity}}, {{shippingState}} {{shippingZip}}<br/>
          {{shippingCountry}}
        </div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="text-right">Quantity</th>
          <th class="text-right">Unit Price</th>
          <th class="text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        {{items}}
      </tbody>
    </table>

    <div class="totals-section">
      <table class="totals-table">
        <tr class="total-row">
          <td class="label">Subtotal:</td>
          <td class="text-right">{{subtotal}}</td>
        </tr>
        <tr class="total-row">
          <td class="label">Tax:</td>
          <td class="text-right">{{tax}}</td>
        </tr>
        <tr class="total-row">
          <td class="label">Shipping:</td>
          <td class="text-right">{{shipping}}</td>
        </tr>
        <tr class="total-row final">
          <td class="label">Total:</td>
          <td class="text-right">{{total}}</td>
        </tr>
      </table>
    </div>

    {{trackingBlock}}
    {{paymentBlock}}
    {{notesBlock}}

    <div class="footer">
      <p>Thank you for your business!</p>
      <p>If you have any questions about this invoice, please contact us.</p>
    </div>
  </div>
</body>
</html>
`;

const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

const renderInvoiceTemplate = (template: string, invoice: InvoiceData): string => {
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

  const itemsHtml = invoice.items
    .map(
      (item) => `
        <tr>
          <td>${item.name}</td>
          <td class="text-right">${item.quantity}</td>
          <td class="text-right">${formatCurrency(item.price)}</td>
          <td class="text-right">${formatCurrency(item.total)}</td>
        </tr>
      `,
    )
    .join("");

  const trackingBlock = invoice.trackingNumber
    ? `
      <div>
        <div class="detail-label">Tracking Number</div>
        <div class="detail-value">${invoice.trackingNumber}</div>
      </div>
    `
    : "";

  const paymentBlock = invoice.paymentMethod
    ? `
      <div>
        <div class="detail-label">Payment Method</div>
        <div class="detail-value">${invoice.paymentMethod}</div>
      </div>
    `
    : "";

  const notesBlock = invoice.notes
    ? `
      <div class="notes">
        <strong>Notes:</strong><br/>
        ${invoice.notes}
      </div>
    `
    : "";

  return template
    .replace(/{{storeName}}/g, invoice.storeName || "Your Store")
    .replace(/{{orderNumber}}/g, invoice.orderNumber)
    .replace(/{{orderDate}}/g, formatDate(invoice.orderDate))
    .replace(/{{customerName}}/g, invoice.customerName)
    .replace(/{{customerEmail}}/g, invoice.customerEmail)
    .replace(/{{customerPhone}}/g, invoice.customerPhone ? `${invoice.customerPhone}<br/>` : "")
    .replace(/{{shippingStreet}}/g, invoice.shippingAddress.street)
    .replace(/{{shippingCity}}/g, invoice.shippingAddress.city)
    .replace(/{{shippingState}}/g, invoice.shippingAddress.state)
    .replace(/{{shippingZip}}/g, invoice.shippingAddress.zip)
    .replace(/{{shippingCountry}}/g, invoice.shippingAddress.country)
    .replace(/{{items}}/g, itemsHtml)
    .replace(/{{subtotal}}/g, formatCurrency(invoice.subtotal))
    .replace(/{{tax}}/g, formatCurrency(invoice.tax))
    .replace(/{{shipping}}/g, formatCurrency(invoice.shipping))
    .replace(/{{total}}/g, formatCurrency(invoice.total))
    .replace(/{{trackingBlock}}/g, trackingBlock)
    .replace(/{{paymentBlock}}/g, paymentBlock)
    .replace(/{{notesBlock}}/g, notesBlock);
};

export const generateInvoiceHTML = (invoice: InvoiceData): string => {
  return renderInvoiceTemplate(DEFAULT_INVOICE_TEMPLATE, invoice);
};

export const downloadInvoicePDF = async (
  invoice: InvoiceData,
  templateHtml?: string,
): Promise<void> => {
  const html = renderInvoiceTemplate(
    templateHtml || DEFAULT_INVOICE_TEMPLATE,
    invoice,
  );

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.width = "900px";
  container.innerHTML = html;
  document.body.appendChild(container);

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
  document.body.removeChild(container);
};
